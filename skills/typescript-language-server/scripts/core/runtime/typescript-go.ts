import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { sleep, toErrorMessage } from "../common.ts";
import type { BridgeLogger } from "../logger.ts";

import { resolveTypeScriptInstall } from "./typescript.ts";

const INSTALL_WAIT_INTERVAL_MS = 250;
const INSTALL_WAIT_TIMEOUT_MS = 120_000;

/**
 * The managed runtime is the stable `typescript` package (7.x), whose bundled
 * `tsc` binary *is* tsgo — it doubles as the compiler and the LSP server
 * (`--lsp --stdio`). We pin the latest stable release resolved at the time this
 * was set, rather than the `@typescript/native-preview` dev channel.
 */
export const TYPESCRIPT_GO_PACKAGE_NAME = "typescript";
export const TYPESCRIPT_GO_PACKAGE_VERSION = "7.0.2";

export interface ResolvedTypeScriptGoInstall {
  workspaceRoot: string;
  managedRoot: string;
  installRoot: string;
  executablePath: string;
  version: string;
}

interface GetExePathModule {
  default?: () => string;
}

/**
 * Resolves the tsgo/tsc native executable inside an installed `typescript`
 * package by reusing the package's own `lib/getExePath.js`, which knows how to
 * locate the platform-specific optional dependency (`@typescript/typescript-*`).
 */
function resolveTypeScriptNativeExe(typescriptPackageRoot: string): string {
  const require = createRequire(join(typescriptPackageRoot, "noop.js"));
  const getExePathModule = require(join(typescriptPackageRoot, "lib", "getExePath.js")) as
    GetExePathModule | (() => string);
  const getExePath =
    typeof getExePathModule === "function" ? getExePathModule : getExePathModule.default;
  if (typeof getExePath !== "function") {
    throw new Error(`typescript getExePath.js at ${typescriptPackageRoot} has no callable export`);
  }
  return getExePath();
}

export async function ensureManagedTypeScriptGoInstall(
  repoRoot: string,
  logger: BridgeLogger,
): Promise<ResolvedTypeScriptGoInstall> {
  const initial = resolveManagedTypeScriptGoInstall(repoRoot);
  if (initial.executablePath && existsSync(initial.executablePath)) {
    return initial;
  }

  const lockFd = await acquireInstallLock(initial.managedRoot, initial.version);
  if (lockFd == null) {
    return waitForManagedTypeScriptGoInstall(repoRoot);
  }

  try {
    const current = resolveManagedTypeScriptGoInstall(repoRoot);
    if (current.executablePath && existsSync(current.executablePath)) {
      return current;
    }

    rmSync(current.installRoot, { recursive: true, force: true });
    mkdirSync(current.installRoot, { recursive: true });

    const packageJsonPath = join(current.installRoot, "package.json");
    if (!existsSync(packageJsonPath)) {
      writeFileSync(
        packageJsonPath,
        `${JSON.stringify(
          {
            name: "aerio-typescript-go-runtime",
            private: true,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    logger.info("installing managed typescript-go runtime", {
      installRoot: current.installRoot,
      version: current.version,
    });

    await runNpmInstall(current.installRoot);

    const installed = resolveManagedTypeScriptGoInstall(repoRoot);
    if (!installed.executablePath || !existsSync(installed.executablePath)) {
      throw new Error(
        `typescript-go executable was not installed under ${installed.installRoot} (resolved: ${installed.executablePath || "<none>"})`,
      );
    }

    logger.info("managed typescript-go runtime is ready", {
      executablePath: installed.executablePath,
      version: installed.version,
    });

    return installed;
  } catch (error: unknown) {
    rmSync(initial.installRoot, { recursive: true, force: true });
    throw error;
  } finally {
    releaseInstallLock(lockFd, initial.managedRoot, initial.version);
  }
}

export function resolveManagedTypeScriptGoInstall(repoRoot: string): ResolvedTypeScriptGoInstall {
  const typescriptInstall = resolveTypeScriptInstall(repoRoot);
  const managedRoot = join(
    typescriptInstall.workspaceRoot,
    ".tmp",
    "typescript-language-server",
    "managed",
    "typescript-go",
  );
  const installRoot = join(managedRoot, sanitizeVersion(TYPESCRIPT_GO_PACKAGE_VERSION));
  const typescriptPackageRoot = join(installRoot, "node_modules", "typescript");

  let executablePath = "";
  if (existsSync(join(typescriptPackageRoot, "lib", "getExePath.js"))) {
    try {
      executablePath = resolveTypeScriptNativeExe(typescriptPackageRoot);
    } catch {
      // Fall through to the empty path below; the installer will (re)install.
    }
  }

  return {
    workspaceRoot: typescriptInstall.workspaceRoot,
    managedRoot,
    installRoot,
    executablePath,
    version: TYPESCRIPT_GO_PACKAGE_VERSION,
  };
}

async function runNpmInstall(installRoot: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const npmArgs = [
      "install",
      "--no-save",
      "--loglevel",
      "error",
      "--no-fund",
      "--no-audit",
      "--include=optional",
      `${TYPESCRIPT_GO_PACKAGE_NAME}@${TYPESCRIPT_GO_PACKAGE_VERSION}`,
    ];
    // On Windows npm is a .cmd shim; modern Node refuses to spawn .cmd/.bat
    // directly (CVE-2024-27980). Route through cmd.exe with a single quoted
    // command string (no shell-option arg concatenation) to stay safe.
    const isWindows = process.platform === "win32";
    const command = isWindows ? process.env.ComSpec || "cmd.exe" : "npm";
    const args = isWindows ? ["/d", "/s", "/c", ["npm.cmd", ...npmArgs].join(" ")] : npmArgs;
    const child = spawn(command, args, {
      cwd: installRoot,
      env: {
        ...process.env,
        NO_COLOR: "1",
        npm_config_update_notifier: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutChunks.push(String(chunk));
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(String(chunk));
    });
    child.once("error", (error) => {
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      const stdout = stdoutChunks.join("").trim();
      const stderr = stderrChunks.join("").trim();
      rejectPromise(
        new Error(
          [
            `npm install failed with code=${code ?? "null"} signal=${signal ?? "null"}`,
            stdout ? `stdout: ${stdout}` : "",
            stderr ? `stderr: ${stderr}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}

function sanitizeVersion(version: string): string {
  return version.replace(/[^A-Za-z0-9._-]+/g, "_");
}

async function acquireInstallLock(managedRoot: string, version: string): Promise<number | null> {
  mkdirSync(managedRoot, { recursive: true });
  const lockPath = join(managedRoot, `${sanitizeVersion(version)}.install.lock`);
  const deadline = Date.now() + INSTALL_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const lockFd = openSync(lockPath, "wx");
      writeFileSync(
        lockFd,
        `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
        "utf8",
      );
      return lockFd;
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw error;
      }
      await sleep(INSTALL_WAIT_INTERVAL_MS);
    }
  }

  throw new Error(`timed out waiting for the typescript-go install lock: ${lockPath}`);
}

function releaseInstallLock(lockFd: number, managedRoot: string, version: string): void {
  closeSync(lockFd);
  const lockPath = join(managedRoot, `${sanitizeVersion(version)}.install.lock`);
  rmSync(lockPath, { force: true });
}

async function waitForManagedTypeScriptGoInstall(
  repoRoot: string,
): Promise<ResolvedTypeScriptGoInstall> {
  const initial = resolveManagedTypeScriptGoInstall(repoRoot);
  const lockPath = join(initial.managedRoot, `${sanitizeVersion(initial.version)}.install.lock`);
  const deadline = Date.now() + INSTALL_WAIT_TIMEOUT_MS;

  const tryResolve = (): ResolvedTypeScriptGoInstall | null => {
    const resolved = resolveManagedTypeScriptGoInstall(repoRoot);
    return resolved.executablePath && existsSync(resolved.executablePath) ? resolved : null;
  };

  while (Date.now() < deadline) {
    const ready = tryResolve();
    if (ready) {
      return ready;
    }
    if (!existsSync(lockPath)) {
      break;
    }
    await sleep(INSTALL_WAIT_INTERVAL_MS);
  }

  const ready = tryResolve();
  if (ready) {
    return ready;
  }

  let lockPreview = "";
  if (existsSync(lockPath)) {
    try {
      lockPreview = readFileSync(lockPath, "utf8").trim();
    } catch (error: unknown) {
      lockPreview = toErrorMessage(error);
    }
  }

  throw new Error(
    [
      `timed out waiting for managed typescript-go install under ${initial.installRoot}`,
      lockPreview ? `lock: ${lockPreview}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
