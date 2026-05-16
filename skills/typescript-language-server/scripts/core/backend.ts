import type { BackendKind, CheckResult } from "./contracts/index.ts";

export interface BackendObservability {
  fallbackCount: number;
  lastFallbackAt: string;
  lastFallbackCommand: string;
  lastFallbackReason: string;
  tsServerRouteCount: number;
  lastTsServerRouteAt: string;
  lastTsServerRouteCommand: string;
  lastTsServerRouteReason: string;
}

export interface TypeScriptLanguageServerBackend {
  readonly kind: BackendKind;
  readonly serverPid: number;
  readonly openedFileCount: number;

  getObservability(): BackendObservability;
  start(): Promise<void>;
  stop(): Promise<void>;
  runCheck(projectFiles: readonly string[], timeoutMs: number): Promise<CheckResult>;
  runFocusedCheck(files: readonly string[], timeoutMs: number): Promise<CheckResult>;
  execute(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown>;
}

export class UnsupportedBackendCommandError extends Error {
  readonly backend: BackendKind;
  readonly command: string;

  constructor(backend: BackendKind, command: string, reason?: string) {
    super(reason || `${backend} does not support ${command}`);
    this.name = "UnsupportedBackendCommandError";
    this.backend = backend;
    this.command = command;
  }
}

export function isUnsupportedBackendCommandError(
  error: unknown,
): error is UnsupportedBackendCommandError {
  return error instanceof UnsupportedBackendCommandError;
}

export function createEmptyBackendObservability(): BackendObservability {
  return {
    fallbackCount: 0,
    lastFallbackAt: "",
    lastFallbackCommand: "",
    lastFallbackReason: "",
    tsServerRouteCount: 0,
    lastTsServerRouteAt: "",
    lastTsServerRouteCommand: "",
    lastTsServerRouteReason: "",
  };
}
