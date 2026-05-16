import type { BackendObservability, TypeScriptLanguageServerBackend } from "./backend.ts";
import { createEmptyBackendObservability } from "./backend.ts";
import type { CheckResult } from "./contracts/index.ts";
import type { BridgeLogger } from "./logger.ts";
import { TsServerProtocolClient } from "./protocol.ts";
import { TYPESCRIPT_GO_SOURCE_REFACTOR_NAME, TypeScriptGoProtocolClient } from "./typescript-go.ts";

const TYPESCRIPT_GO_SUPPORTED_COMMANDS = new Set([
  "quickinfo",
  "definitionAndBoundSpan",
  "typeDefinition",
  "implementation",
  "references",
  "rename",
]);

export class ManagedTypeScriptLanguageServerBackend implements TypeScriptLanguageServerBackend {
  readonly #logger: BridgeLogger;
  readonly #typescriptGo: TypeScriptGoProtocolClient;
  readonly #tsserver: TsServerProtocolClient;

  #typescriptGoUnavailable = false;
  #observability: BackendObservability = createEmptyBackendObservability();

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#logger = logger;
    this.#typescriptGo = new TypeScriptGoProtocolClient(repoRoot, logger.child("typescript-go"));
    this.#tsserver = new TsServerProtocolClient(repoRoot, logger.child("tsserver"));
  }

  get kind() {
    if (this.#typescriptGo.serverPid > 0) {
      return "typescript-go" as const;
    }
    if (this.#tsserver.serverPid > 0) {
      return "tsserver" as const;
    }
    return "unknown" as const;
  }

  get serverPid(): number {
    if (this.#typescriptGo.serverPid > 0) {
      return this.#typescriptGo.serverPid;
    }
    return this.#tsserver.serverPid;
  }

  get openedFileCount(): number {
    if (this.#typescriptGo.serverPid > 0) {
      return this.#typescriptGo.openedFileCount;
    }
    return this.#tsserver.openedFileCount;
  }

  getObservability(): BackendObservability {
    return { ...this.#observability };
  }

  async start(): Promise<void> {
    if (await this.#ensureTypeScriptGoStarted()) {
      return;
    }
    await this.#ensureTsServerStarted();
  }

  async stop(): Promise<void> {
    await Promise.allSettled([this.#typescriptGo.stop(), this.#tsserver.stop()]);
  }

  async runCheck(projectFiles: readonly string[], timeoutMs: number): Promise<CheckResult> {
    return this.#runWithFallback(
      "check",
      async () => {
        await this.#typescriptGo.start();
        return this.#typescriptGo.runCheck(projectFiles, timeoutMs);
      },
      async () => {
        await this.#ensureTsServerStarted();
        return this.#tsserver.runCheck(projectFiles, timeoutMs);
      },
    );
  }

  async runFocusedCheck(files: readonly string[], timeoutMs: number): Promise<CheckResult> {
    return this.#runWithFallback(
      "focused-check",
      async () => {
        await this.#typescriptGo.start();
        return this.#typescriptGo.runFocusedCheck(files, timeoutMs);
      },
      async () => {
        await this.#ensureTsServerStarted();
        return this.#tsserver.runFocusedCheck(files, timeoutMs);
      },
    );
  }

  async execute(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown> {
    if (command === "getApplicableRefactors") {
      return this.#executeMergedRefactorList(args, timeoutMs, openFiles);
    }
    if (command === "getEditsForRefactor") {
      return this.#executeRefactorEdits(args, timeoutMs, openFiles);
    }

    if (!this.#shouldUseTypeScriptGo(command, args)) {
      this.#recordTsServerRoute(command, this.#tsServerRouteReason(command, args));
      await this.#ensureTsServerStarted();
      return this.#tsserver.execute(command, args, timeoutMs, openFiles);
    }

    return this.#runWithFallback(
      command,
      async () => {
        await this.#typescriptGo.start();
        const result = await this.#typescriptGo.execute(command, args, timeoutMs, openFiles);
        if (this.#shouldFallbackFromTypeScriptGoResult(command, result)) {
          throw new Error(`typescript-go returned an incomplete result for ${command}`);
        }
        return result;
      },
      async () => {
        await this.#ensureTsServerStarted();
        return this.#tsserver.execute(command, args, timeoutMs, openFiles);
      },
    );
  }

  async #ensureTypeScriptGoStarted(): Promise<boolean> {
    if (this.#typescriptGo.serverPid > 0) {
      return true;
    }
    if (this.#typescriptGoUnavailable) {
      return false;
    }

    try {
      await this.#typescriptGo.start();
      return true;
    } catch (error: unknown) {
      this.#typescriptGoUnavailable = true;
      this.#logger.warn("typescript-go backend failed to initialize; falling back to tsserver", {
        error,
      });
      return false;
    }
  }

  async #ensureTsServerStarted(): Promise<void> {
    await this.#tsserver.start();
  }

  async #runWithFallback<Result>(
    operation: string,
    runTypeScriptGo: () => Promise<Result>,
    runTsServer: () => Promise<Result>,
  ): Promise<Result> {
    if (await this.#ensureTypeScriptGoStarted()) {
      try {
        return await runTypeScriptGo();
      } catch (error: unknown) {
        this.#recordFallback(operation, error instanceof Error ? error.message : String(error));
        this.#logger.warn("typescript-go operation failed; retrying with tsserver", {
          operation,
          error,
        });
      }
    }
    if (this.#typescriptGoUnavailable) {
      this.#recordFallback(operation, "typescript-go unavailable");
    }
    return runTsServer();
  }

  #shouldUseTypeScriptGo(command: string, args: Record<string, unknown>): boolean {
    if (!TYPESCRIPT_GO_SUPPORTED_COMMANDS.has(command)) {
      return false;
    }
    if (command === "rename" && (args.findInComments === true || args.findInStrings === true)) {
      return false;
    }
    return true;
  }

  #shouldFallbackFromTypeScriptGoResult(command: string, result: unknown): boolean {
    if (command === "typeDefinition") {
      return Array.isArray(result) && result.length === 0;
    }
    return false;
  }

  async #executeMergedRefactorList(
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown> {
    const typescriptGoGroups = await this.#runTypeScriptGoRefactorList(
      args,
      timeoutMs,
      openFiles,
    ).catch((error: unknown) => {
      this.#recordFallback(
        "getApplicableRefactors",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    });

    await this.#ensureTsServerStarted();
    const tsserverGroups = await this.#tsserver.execute(
      "getApplicableRefactors",
      args,
      timeoutMs,
      openFiles,
    );

    return [...typescriptGoGroups, ...(Array.isArray(tsserverGroups) ? tsserverGroups : [])];
  }

  async #executeRefactorEdits(
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown> {
    const refactor = typeof args.refactor === "string" ? args.refactor : "";
    if (refactor === TYPESCRIPT_GO_SOURCE_REFACTOR_NAME) {
      return this.#runWithFallback(
        "getEditsForRefactor",
        async () => {
          await this.#typescriptGo.start();
          return this.#typescriptGo.execute("getEditsForRefactor", args, timeoutMs, openFiles);
        },
        () =>
          Promise.reject(new Error("typescript-go source refactor cannot fall back to tsserver")),
      );
    }

    this.#recordTsServerRoute(
      "getEditsForRefactor",
      `classic refactor ${refactor || "<empty>"} uses tsserver`,
    );
    await this.#ensureTsServerStarted();
    return this.#tsserver.execute("getEditsForRefactor", args, timeoutMs, openFiles);
  }

  async #runTypeScriptGoRefactorList(
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<readonly unknown[]> {
    if (!(await this.#ensureTypeScriptGoStarted())) {
      return [];
    }
    const result = await this.#typescriptGo.execute(
      "getApplicableRefactors",
      args,
      timeoutMs,
      openFiles,
    );
    return Array.isArray(result) ? result : [];
  }

  #recordFallback(command: string, reason: string): void {
    this.#observability = {
      ...this.#observability,
      fallbackCount: this.#observability.fallbackCount + 1,
      lastFallbackAt: new Date().toISOString(),
      lastFallbackCommand: command,
      lastFallbackReason: reason,
    };
  }

  #recordTsServerRoute(command: string, reason: string): void {
    this.#observability = {
      ...this.#observability,
      tsServerRouteCount: this.#observability.tsServerRouteCount + 1,
      lastTsServerRouteAt: new Date().toISOString(),
      lastTsServerRouteCommand: command,
      lastTsServerRouteReason: reason,
    };
  }

  #tsServerRouteReason(command: string, args: Record<string, unknown>): string {
    if (command === "rename" && (args.findInComments === true || args.findInStrings === true)) {
      return "rename with comments/strings uses tsserver";
    }
    return `typescript-go does not support ${command}`;
  }
}

export function createTypeScriptLanguageServerBackend(
  repoRoot: string,
  logger: BridgeLogger,
): TypeScriptLanguageServerBackend {
  return new ManagedTypeScriptLanguageServerBackend(repoRoot, logger);
}
