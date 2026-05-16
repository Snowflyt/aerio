import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, unlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { createEmptyBackendObservability } from "../backend.ts";
import type { BackendKind, DaemonStatus } from "../contracts/index.ts";

import type { ProjectRootResolutionOptions } from "./typescript.ts";
import { getProjectRoot, resolveProjectRoot, resolveTypeScriptInstall } from "./typescript.ts";

function createProjectKey(projectRoot: string): string {
  const hash = createHash("sha256").update(projectRoot).digest("hex").slice(0, 12);
  return `${basename(projectRoot) || "workspace"}-${hash}`;
}

function makeSocketPath(projectKey: string, platform = process.platform): string {
  if (platform === "win32") {
    return `\\\\.\\pipe\\aerio-typescript-language-server-${projectKey}`;
  }
  return join("/tmp", `aerio-tls-${projectKey}.sock`);
}

export class TypeScriptLanguageServerPaths {
  readonly repoRoot: string;
  readonly workspaceRoot: string;
  readonly baseDir: string;
  readonly stateDir: string;
  readonly logsDir: string;
  readonly socketPath: string;
  readonly stateFilePath: string;
  readonly logPath: string;
  readonly startLockPath: string;
  readonly projectKey: string;
  readonly typescriptVersion: string;

  constructor(repoRoot: string, platform = process.platform) {
    this.repoRoot = resolve(repoRoot);
    const typescriptInstall = resolveTypeScriptInstall(this.repoRoot);
    this.workspaceRoot = typescriptInstall.workspaceRoot;
    this.typescriptVersion = typescriptInstall.version;
    this.projectKey = createProjectKey(this.repoRoot);
    this.baseDir = join(this.workspaceRoot, ".tmp", "typescript-language-server");
    this.stateDir = join(this.baseDir, "projects", this.projectKey);
    this.logsDir = join(this.baseDir, "logs");
    this.socketPath = makeSocketPath(this.projectKey, platform);
    this.stateFilePath = join(this.stateDir, "daemon-state.json");
    this.logPath = join(this.logsDir, `${this.projectKey}.log`);
    this.startLockPath = join(this.stateDir, "start.lock");
  }

  ensureDirectories(): void {
    mkdirSync(this.stateDir, { recursive: true });
    mkdirSync(this.logsDir, { recursive: true });
  }

  removeSocketIfPresent(): void {
    if (process.platform === "win32") {
      return;
    }
    if (existsSync(this.socketPath)) {
      unlinkSync(this.socketPath);
    }
  }

  removeStateIfPresent(): void {
    if (existsSync(this.stateFilePath)) {
      rmSync(this.stateFilePath, { force: true });
    }
  }
}

export function createEmptyStatus(
  paths: TypeScriptLanguageServerPaths,
  backend: BackendKind = "unknown",
): DaemonStatus {
  return {
    running: false,
    backend,
    repoRoot: paths.repoRoot,
    workspaceRoot: paths.workspaceRoot,
    stateDir: paths.stateDir,
    logPath: paths.logPath,
    socketPath: paths.socketPath,
    pid: 0,
    serverPid: 0,
    projectFileCount: 0,
    openedFileCount: 0,
    startedAt: "",
    updatedAt: "",
    lastCheckAt: "",
    lastErrorCount: 0,
    lastWarningCount: 0,
    lastSuggestionCount: 0,
    ...createEmptyBackendObservability(),
  };
}

export function getRepoRoot(): string {
  return getProjectRoot();
}

export function resolveRepoRoot(options: ProjectRootResolutionOptions = {}): string {
  return resolveProjectRoot(options);
}
