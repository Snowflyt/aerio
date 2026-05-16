import { writeFileSync } from "node:fs";
import type { Server, Socket } from "node:net";
import { createServer } from "node:net";

import { executeApplyCommand } from "../../commands/apply.ts";
import { executeQueryCommand } from "../../commands/index.ts";
import type { TypeScriptLanguageServerBackend } from "../backend.ts";
import { formatNow, parseJsonValue, toErrorMessage } from "../common.ts";
import type {
  ApplyControlRequest,
  ApplyResult,
  CheckResult,
  ControlRequest,
  ControlResponse,
  PersistedDaemonState,
  QueryControlRequest,
  QueryResult,
} from "../contracts/index.ts";
import {
  STATE_VERSION,
  isApplyRequest,
  isControlRequest,
  isQueryRequest,
} from "../contracts/index.ts";
import type { BridgeLogger } from "../logger.ts";
import { createTypeScriptLanguageServerBackend } from "../managed-backend.ts";
import { getRequestPrimaryFile, resolveQueryFilePath } from "../query-shared.ts";

import { DEFAULT_TIMEOUT_MS } from "./constants.ts";
import { TypeScriptLanguageServerPaths, createEmptyStatus } from "./paths.ts";
import { TypeScriptProjectFiles } from "./project-files.ts";

export class TypeScriptLanguageServerDaemon {
  readonly #paths: TypeScriptLanguageServerPaths;
  readonly #logger: BridgeLogger;
  readonly #projectFiles: TypeScriptProjectFiles;
  readonly #backend: TypeScriptLanguageServerBackend;

  #server: Server | null = null;
  #status: PersistedDaemonState;

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#paths = new TypeScriptLanguageServerPaths(repoRoot);
    this.#logger = logger;
    this.#projectFiles = new TypeScriptProjectFiles(repoRoot, logger.child("project"));
    this.#backend = createTypeScriptLanguageServerBackend(repoRoot, logger.child("backend"));
    this.#status = {
      version: STATE_VERSION,
      ...createEmptyStatus(this.#paths),
    };
  }

  async run(): Promise<void> {
    this.#paths.ensureDirectories();
    this.#paths.removeSocketIfPresent();
    await this.#backend.start();
    await this.#refreshStatus();

    const server = createServer((socket) => {
      void this.#handleConnection(socket);
    });

    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.once("error", (error) => {
        rejectPromise(error);
      });
      server.listen(this.#paths.socketPath, () => {
        resolvePromise();
      });
    });

    this.#server = server;
    this.#logger.info("typescript-language-server daemon listening", {
      socketPath: this.#paths.socketPath,
      pid: process.pid,
      backend: this.#backend.kind,
      serverPid: this.#backend.serverPid,
    });
  }

  async shutdown(): Promise<void> {
    this.#logger.info("shutting down typescript-language-server daemon");
    await this.#backend.stop();
    if (this.#server) {
      await new Promise<void>((resolvePromise) => {
        this.#server?.close(() => {
          resolvePromise();
        });
      });
      this.#server = null;
    }
    this.#paths.removeSocketIfPresent();
    this.#paths.removeStateIfPresent();
  }

  async #handleConnection(socket: Socket): Promise<void> {
    const raw = await this.#readSocketInput(socket);
    let request: ControlRequest;

    try {
      const parsed = parseJsonValue(raw);
      if (!isControlRequest(parsed)) {
        throw new Error("invalid control request shape");
      }
      request = parsed;
    } catch (error: unknown) {
      this.#writeSocketResponse(socket, {
        ok: false,
        error: `invalid control request: ${toErrorMessage(error)}`,
        status: this.#status,
      });
      return;
    }

    try {
      if (request.command === "status") {
        await this.#refreshStatus();
        this.#writeSocketResponse(socket, { ok: true, status: this.#status });
        return;
      }

      if (request.command === "check") {
        const timeoutMs = Math.max(1_000, request.timeoutMs || DEFAULT_TIMEOUT_MS);
        const check = await this.#runCheck(timeoutMs, request.files);
        this.#writeSocketResponse(socket, {
          ok: true,
          status: this.#status,
          check,
        });
        return;
      }

      if (request.command === "stop") {
        await this.#refreshStatus();
        this.#writeSocketResponse(socket, { ok: true, status: this.#status });
        setImmediate(() => {
          void this.shutdown().finally(() => {
            process.exit(0);
          });
        });
        return;
      }

      if (isQueryRequest(request)) {
        const timeoutMs = Math.max(1_000, request.timeoutMs || DEFAULT_TIMEOUT_MS);
        const result = await this.#runQuery(request, timeoutMs);
        this.#writeSocketResponse(socket, {
          ok: true,
          status: this.#status,
          result,
        });
        return;
      }

      if (isApplyRequest(request)) {
        const timeoutMs = Math.max(1_000, request.timeoutMs || DEFAULT_TIMEOUT_MS);
        const result = await this.#runApply(request, timeoutMs);
        this.#writeSocketResponse(socket, {
          ok: true,
          status: this.#status,
          result,
        });
        return;
      }

      this.#writeSocketResponse(socket, {
        ok: false,
        error: "unknown control command",
        status: this.#status,
      });
    } catch (error: unknown) {
      this.#logger.error("typescript-language-server daemon request failed", { error });
      this.#writeSocketResponse(socket, {
        ok: false,
        error: toErrorMessage(error),
        status: this.#status,
      });
    }
  }

  async #runCheck(timeoutMs: number, files?: readonly string[]): Promise<CheckResult> {
    const projectFiles = this.#projectFiles.discover();
    const targetFiles =
      files && files.length > 0 ?
        [...new Set(files.map((file) => resolveQueryFilePath(this.#paths.repoRoot, file)))]
      : undefined;
    const check =
      targetFiles ?
        await this.#backend.runFocusedCheck(targetFiles, timeoutMs)
      : await this.#backend.runCheck(projectFiles, timeoutMs);
    this.#status.projectFileCount = projectFiles.length;
    this.#status.openedFileCount = this.#backend.openedFileCount;
    this.#status.backend = this.#backend.kind;
    this.#status.serverPid = this.#backend.serverPid;
    this.#status.lastCheckAt = formatNow();
    this.#status.lastErrorCount = check.errorCount;
    this.#status.lastWarningCount = check.warningCount;
    this.#status.lastSuggestionCount = check.suggestionCount;
    Object.assign(this.#status, this.#backend.getObservability());
    this.#status.updatedAt = formatNow();
    this.#writeState();
    return check;
  }

  async #runQuery(request: QueryControlRequest, timeoutMs: number): Promise<QueryResult> {
    const filePath = resolveQueryFilePath(this.#paths.repoRoot, getRequestPrimaryFile(request));
    const result = await executeQueryCommand(
      this.#backend,
      this.#paths.repoRoot,
      "location" in request ?
        { ...request, location: { ...request.location, file: filePath } }
      : { ...request, range: { ...request.range, file: filePath } },
      timeoutMs,
    );
    this.#status.openedFileCount = this.#backend.openedFileCount;
    Object.assign(this.#status, this.#backend.getObservability());
    this.#status.updatedAt = formatNow();
    this.#writeState();
    return result;
  }

  async #runApply(request: ApplyControlRequest, timeoutMs: number): Promise<ApplyResult> {
    const result = await executeApplyCommand(
      this.#backend,
      this.#paths.repoRoot,
      request,
      timeoutMs,
    );
    this.#status.openedFileCount = this.#backend.openedFileCount;
    Object.assign(this.#status, this.#backend.getObservability());
    this.#status.updatedAt = formatNow();
    this.#writeState();
    return result;
  }

  #refreshStatus(): Promise<void> {
    const projectFiles = this.#projectFiles.discover();
    this.#status = {
      version: STATE_VERSION,
      running: true,
      backend: this.#backend.kind,
      repoRoot: this.#paths.repoRoot,
      workspaceRoot: this.#paths.workspaceRoot,
      stateDir: this.#paths.stateDir,
      logPath: this.#paths.logPath,
      socketPath: this.#paths.socketPath,
      pid: process.pid,
      serverPid: this.#backend.serverPid,
      projectFileCount: projectFiles.length,
      openedFileCount: this.#backend.openedFileCount,
      startedAt: this.#status.startedAt || formatNow(),
      updatedAt: formatNow(),
      lastCheckAt: this.#status.lastCheckAt,
      lastErrorCount: this.#status.lastErrorCount,
      lastWarningCount: this.#status.lastWarningCount,
      lastSuggestionCount: this.#status.lastSuggestionCount,
      ...this.#backend.getObservability(),
    };
    this.#writeState();

    return Promise.resolve();
  }

  #writeState(): void {
    writeFileSync(this.#paths.stateFilePath, `${JSON.stringify(this.#status, null, 2)}\n`, "utf8");
  }

  #writeSocketResponse(socket: Socket, response: ControlResponse): void {
    socket.end(`${JSON.stringify(response)}\n`);
  }

  #readSocketInput(socket: Socket): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
      let buffer = "";
      let settled = false;

      const finish = (value: string): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolvePromise(value);
      };

      socket.setEncoding("utf8");
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex !== -1) {
          finish(buffer.slice(0, newlineIndex).trim());
        }
      });
      socket.once("end", () => {
        finish(buffer.trim());
      });
      socket.once("error", (error) => {
        rejectPromise(error);
      });
    });
  }
}
