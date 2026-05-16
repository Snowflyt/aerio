import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { resolve } from "node:path";

import { parseJsonValue, sleep } from "../common.ts";
import type {
  ApplyControlRequest,
  ControlRequest,
  ControlResponse,
  DaemonStatus,
  QueryControlRequest,
} from "../contracts/index.ts";
import { isControlResponse, isPersistedDaemonState } from "../contracts/index.ts";
import type { BridgeLogger } from "../logger.ts";

import { DEFAULT_TIMEOUT_MS, SOCKET_WAIT_INTERVAL_MS } from "./constants.ts";
import { TypeScriptLanguageServerPaths, createEmptyStatus } from "./paths.ts";

export class TypeScriptLanguageServerController {
  readonly #paths: TypeScriptLanguageServerPaths;
  readonly #logger: BridgeLogger;

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#paths = new TypeScriptLanguageServerPaths(repoRoot);
    this.#logger = logger;
  }

  async start(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<DaemonStatus> {
    const existingStatus = await this.status();
    if (existingStatus.running) {
      return existingStatus;
    }

    const readyTimeoutMs = normalizeStartTimeout(timeoutMs);
    const startLockFd = await this.#acquireStartLock(readyTimeoutMs);
    if (startLockFd == null) {
      return this.status();
    }

    try {
      const statusAfterLock = await this.status();
      if (statusAfterLock.running) {
        return statusAfterLock;
      }

      this.#paths.ensureDirectories();
      this.#paths.removeSocketIfPresent();
      this.#paths.removeStateIfPresent();

      const daemonCommand = createTypeScriptEntrypointCommand(
        resolve(import.meta.dirname, "../../cli/daemon.ts"),
        ["serve", "--project", this.#paths.repoRoot],
      );
      const logFd = openSync(this.#paths.logPath, "a");
      const child = spawn(daemonCommand.command, daemonCommand.args, {
        cwd: this.#paths.repoRoot,
        env: { ...process.env },
        // Detached so the daemon outlives the CLI caller, but hide the console
        // window that Windows would otherwise pop up for a detached process.
        detached: true,
        windowsHide: true,
        stdio: ["ignore", logFd, logFd],
      });
      closeSync(logFd);
      child.unref();

      this.#logger.info("starting typescript-language-server daemon process", {
        command: daemonCommand.command,
        args: daemonCommand.args,
        runtime: daemonCommand.runtime,
        repoRoot: this.#paths.repoRoot,
      });

      await this.#waitForReady(readyTimeoutMs);
      return await this.status();
    } finally {
      this.#releaseStartLock(startLockFd);
    }
  }

  async status(): Promise<DaemonStatus> {
    const response = await this.#sendRequest({ command: "status" });
    if (response) {
      return response.status;
    }

    if (existsSync(this.#paths.stateFilePath)) {
      try {
        const parsed = parseJsonValue(readFileSync(this.#paths.stateFilePath, "utf8"));
        if (!isPersistedDaemonState(parsed)) {
          throw new Error("invalid persisted typescript-language-server state");
        }
        return {
          ...parsed,
          running: false,
          socketPath: this.#paths.socketPath,
          logPath: this.#paths.logPath,
        };
      } catch (error: unknown) {
        this.#logger.warn("failed to parse stale typescript-language-server state file", { error });
      }
    }

    return createEmptyStatus(this.#paths);
  }

  async check(timeoutMs: number, files?: readonly string[]): Promise<ControlResponse> {
    await this.start(timeoutMs);
    const response = await this.#sendRequest({
      command: "check",
      timeoutMs,
      ...(files && files.length > 0 ? { files } : {}),
    });
    if (!response) {
      throw new Error("typescript-language-server daemon did not answer the check request");
    }
    if (!response.ok) {
      throw new Error(response.error || "typescript-language-server daemon check failed");
    }
    return response;
  }

  async stop(): Promise<DaemonStatus> {
    const response = await this.#sendRequest({ command: "stop" });
    if (response) {
      return response.status;
    }

    this.#paths.removeSocketIfPresent();
    this.#paths.removeStateIfPresent();
    return createEmptyStatus(this.#paths);
  }

  async query(request: QueryControlRequest): Promise<ControlResponse> {
    await this.start(request.timeoutMs);
    return this.#sendCheckedRequest(request);
  }

  async apply(request: ApplyControlRequest): Promise<ControlResponse> {
    await this.start(request.timeoutMs);
    return this.#sendCheckedRequest(request);
  }

  async #sendCheckedRequest(
    request: QueryControlRequest | ApplyControlRequest,
  ): Promise<ControlResponse> {
    const response = await this.#sendRequest(request);
    if (!response) {
      throw new Error(
        `typescript-language-server daemon did not answer the ${request.command} request`,
      );
    }
    if (!response.ok) {
      throw new Error(
        response.error || `typescript-language-server daemon ${request.command} failed`,
      );
    }
    return response;
  }

  async #waitForReady(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.#sendRequest({ command: "status" });
      if (response?.status.running) {
        return;
      }
      await sleep(SOCKET_WAIT_INTERVAL_MS);
    }
    throw new Error("typescript-language-server daemon did not become ready in time");
  }

  async #acquireStartLock(timeoutMs: number): Promise<number | null> {
    this.#paths.ensureDirectories();
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.status();
      if (status.running) {
        return null;
      }

      try {
        const lockFd = openSync(this.#paths.startLockPath, "wx");
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
        await sleep(SOCKET_WAIT_INTERVAL_MS);
      }
    }

    throw new Error(
      `timed out waiting for the typescript-language-server start lock: ${this.#paths.startLockPath}`,
    );
  }

  #releaseStartLock(lockFd: number): void {
    closeSync(lockFd);
    if (existsSync(this.#paths.startLockPath)) {
      rmSync(this.#paths.startLockPath, { force: true });
    }
  }

  async #sendRequest(request: ControlRequest): Promise<ControlResponse | null> {
    return new Promise((resolvePromise, rejectPromise) => {
      let settled = false;
      let buffer = "";
      const socket = createConnection(this.#paths.socketPath);

      const finish = (result: ControlResponse | null): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolvePromise(result);
      };

      socket.setEncoding("utf8");
      socket.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT" || error.code === "ECONNREFUSED" || error.code === "EPIPE") {
          finish(null);
          return;
        }
        rejectPromise(error);
      });
      socket.on("data", (chunk: string) => {
        buffer += chunk;
      });
      socket.once("end", () => {
        if (!buffer.trim()) {
          finish(null);
          return;
        }
        const parsed = parseJsonValue(buffer);
        if (!isControlResponse(parsed)) {
          rejectPromise(new Error("invalid control response"));
          return;
        }
        finish(parsed);
      });
      socket.once("connect", () => {
        socket.write(`${JSON.stringify(request)}\n`);
      });
    });
  }
}

export { DEFAULT_TIMEOUT_MS };

function normalizeStartTimeout(timeoutMs: number | undefined): number {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.max(1_000, timeoutMs);
}

function createTypeScriptEntrypointCommand(entrypointPath: string, args: readonly string[]) {
  return {
    command: process.execPath,
    args: [entrypointPath, ...args],
    runtime: "node",
  } as const;
}
