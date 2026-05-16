import { isRecord } from "../common.ts";

import type { ApplyControlRequest, OperationControlRequest, QueryControlRequest } from "./query.ts";
import { isApplyRequest, isQueryRequest } from "./query.ts";
import type { ApplyResult, CheckResult, OperationResult } from "./results.ts";
import { isCheckResult, isOperationResult } from "./results.ts";

export const STATE_VERSION = 2;
export type BackendKind = "typescript-go" | "tsserver" | "unknown";

interface StatusRequest {
  command: "status";
  timeoutMs?: number;
}

interface CheckRequest {
  command: "check";
  timeoutMs?: number;
  files?: readonly string[];
}

interface StopRequest {
  command: "stop";
  timeoutMs?: number;
}

export type ControlRequest = StatusRequest | CheckRequest | StopRequest | OperationControlRequest;

export interface DaemonStatus {
  running: boolean;
  backend: BackendKind;
  repoRoot: string;
  workspaceRoot: string;
  stateDir: string;
  logPath: string;
  socketPath: string;
  pid: number;
  serverPid: number;
  projectFileCount: number;
  openedFileCount: number;
  startedAt: string;
  updatedAt: string;
  lastCheckAt: string;
  lastErrorCount: number;
  lastWarningCount: number;
  lastSuggestionCount: number;
  fallbackCount: number;
  lastFallbackAt: string;
  lastFallbackCommand: string;
  lastFallbackReason: string;
  tsServerRouteCount: number;
  lastTsServerRouteAt: string;
  lastTsServerRouteCommand: string;
  lastTsServerRouteReason: string;
}

export interface PersistedDaemonState extends DaemonStatus {
  version: number;
}

export interface ControlResponse {
  ok: boolean;
  error?: string;
  status: DaemonStatus;
  check?: CheckResult;
  result?: OperationResult;
}

export function isDaemonStatus(value: unknown): value is DaemonStatus {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.running === "boolean" &&
    (value.backend === "typescript-go" ||
      value.backend === "tsserver" ||
      value.backend === "unknown") &&
    typeof value.repoRoot === "string" &&
    typeof value.workspaceRoot === "string" &&
    typeof value.stateDir === "string" &&
    typeof value.logPath === "string" &&
    typeof value.socketPath === "string" &&
    typeof value.pid === "number" &&
    typeof value.serverPid === "number" &&
    typeof value.projectFileCount === "number" &&
    typeof value.openedFileCount === "number" &&
    typeof value.startedAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.lastCheckAt === "string" &&
    typeof value.lastErrorCount === "number" &&
    typeof value.lastWarningCount === "number" &&
    typeof value.lastSuggestionCount === "number" &&
    typeof value.fallbackCount === "number" &&
    typeof value.lastFallbackAt === "string" &&
    typeof value.lastFallbackCommand === "string" &&
    typeof value.lastFallbackReason === "string" &&
    typeof value.tsServerRouteCount === "number" &&
    typeof value.lastTsServerRouteAt === "string" &&
    typeof value.lastTsServerRouteCommand === "string" &&
    typeof value.lastTsServerRouteReason === "string"
  );
}

export function isPersistedDaemonState(value: unknown): value is PersistedDaemonState {
  if (!isDaemonStatus(value) || !isRecord(value)) {
    return false;
  }
  return value.version === STATE_VERSION;
}

export function isControlRequest(value: unknown): value is ControlRequest {
  if (!isRecord(value)) {
    return false;
  }
  if (value.command === "status" || value.command === "check" || value.command === "stop") {
    const hasValidTimeout = value.timeoutMs == null || typeof value.timeoutMs === "number";
    const hasValidFiles =
      value.command !== "check" ||
      value.files == null ||
      (Array.isArray(value.files) &&
        value.files.every((entry) => typeof entry === "string" && entry.trim().length > 0));
    return hasValidTimeout && hasValidFiles;
  }
  return isQueryRequest(value) || isApplyRequest(value);
}

export function isControlResponse(value: unknown): value is ControlResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.ok !== "boolean" || !isDaemonStatus(value.status)) {
    return false;
  }
  if (value.error != null && typeof value.error !== "string") {
    return false;
  }
  if (value.check != null && !isCheckResult(value.check)) {
    return false;
  }
  if (value.result != null && !isOperationResult(value.result)) {
    return false;
  }
  return true;
}

export type {
  ApplyControlRequest,
  ApplyResult,
  CheckResult,
  OperationControlRequest,
  QueryControlRequest,
};
