import { isNonEmptyString, isPositiveInteger, isRecord } from "../common.ts";

export type QueryCommand =
  | "info"
  | "definition"
  | "type-definition"
  | "implementation"
  | "references"
  | "rename-preview"
  | "refactor-list"
  | "refactor-preview";

export type ApplyCommand = "rename-apply" | "refactor-apply";

export interface QueryLocation {
  file: string;
  line: number;
  offset: number;
}

export interface QueryRange extends QueryLocation {
  endLine?: number;
  endOffset?: number;
}

interface TimedRequest {
  timeoutMs?: number;
}

interface MutableRequest extends TimedRequest {
  dryRun?: boolean;
  createBackup?: boolean;
}

export interface InfoQueryRequest extends TimedRequest {
  command: "info";
  location: QueryLocation;
  verbosityLevel?: number;
}

export interface DefinitionQueryRequest extends TimedRequest {
  command: "definition";
  location: QueryLocation;
}

export interface TypeDefinitionQueryRequest extends TimedRequest {
  command: "type-definition";
  location: QueryLocation;
}

export interface ImplementationQueryRequest extends TimedRequest {
  command: "implementation";
  location: QueryLocation;
}

export interface ReferencesQueryRequest extends TimedRequest {
  command: "references";
  location: QueryLocation;
}

export interface RenamePreviewQueryRequest extends TimedRequest {
  command: "rename-preview";
  location: QueryLocation;
  findInComments?: boolean;
  findInStrings?: boolean;
}

export interface RefactorListQueryRequest extends TimedRequest {
  command: "refactor-list";
  range: QueryRange;
}

export interface RefactorPreviewQueryRequest extends TimedRequest {
  command: "refactor-preview";
  range: QueryRange;
  refactor: string;
  action: string;
}

export interface RenameApplyRequest extends MutableRequest {
  command: "rename-apply";
  location: QueryLocation;
  newName: string;
  findInComments?: boolean;
  findInStrings?: boolean;
}

export interface RefactorApplyRequest extends MutableRequest {
  command: "refactor-apply";
  range: QueryRange;
  refactor: string;
  action: string;
}

export type QueryControlRequest =
  | InfoQueryRequest
  | DefinitionQueryRequest
  | TypeDefinitionQueryRequest
  | ImplementationQueryRequest
  | ReferencesQueryRequest
  | RenamePreviewQueryRequest
  | RefactorListQueryRequest
  | RefactorPreviewQueryRequest;

export type ApplyControlRequest = RenameApplyRequest | RefactorApplyRequest;

export type OperationControlRequest = QueryControlRequest | ApplyControlRequest;

export function isQueryCommand(value: string): value is QueryCommand {
  return (
    value === "info" ||
    value === "definition" ||
    value === "type-definition" ||
    value === "implementation" ||
    value === "references" ||
    value === "rename-preview" ||
    value === "refactor-list" ||
    value === "refactor-preview"
  );
}

export function isApplyCommand(value: string): value is ApplyCommand {
  return value === "rename-apply" || value === "refactor-apply";
}

export function isQueryLocation(value: unknown): value is QueryLocation {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonEmptyString(value.file) && isPositiveInteger(value.line) && isPositiveInteger(value.offset)
  );
}

export function isQueryRange(value: unknown): value is QueryRange {
  if (!isRecord(value)) {
    return false;
  }
  if (
    !isNonEmptyString(value.file) ||
    !isPositiveInteger(value.line) ||
    !isPositiveInteger(value.offset)
  ) {
    return false;
  }
  if (value.endLine == null && value.endOffset == null) {
    return true;
  }
  return isPositiveInteger(value.endLine) && isPositiveInteger(value.endOffset);
}

function hasOptionalTimeout(value: Record<string, unknown>): boolean {
  return value.timeoutMs == null || typeof value.timeoutMs === "number";
}

function hasOptionalBoolean(value: Record<string, unknown>, key: string): boolean {
  const candidate = value[key];
  return candidate == null || typeof candidate === "boolean";
}

function hasOptionalMutatingFlags(value: Record<string, unknown>): boolean {
  return (
    hasOptionalTimeout(value) &&
    hasOptionalBoolean(value, "dryRun") &&
    hasOptionalBoolean(value, "createBackup")
  );
}

export function isQueryRequest(value: unknown): value is QueryControlRequest {
  if (!isRecord(value) || !isQueryCommand(String(value.command)) || !hasOptionalTimeout(value)) {
    return false;
  }

  if (value.command === "info") {
    return (
      isQueryLocation(value.location) &&
      (value.verbosityLevel == null || isPositiveInteger(value.verbosityLevel))
    );
  }

  if (
    value.command === "definition" ||
    value.command === "type-definition" ||
    value.command === "implementation" ||
    value.command === "references"
  ) {
    return isQueryLocation(value.location);
  }

  if (value.command === "rename-preview") {
    return (
      isQueryLocation(value.location) &&
      hasOptionalBoolean(value, "findInComments") &&
      hasOptionalBoolean(value, "findInStrings")
    );
  }

  if (value.command === "refactor-list") {
    return isQueryRange(value.range);
  }

  return (
    isQueryRange(value.range) && isNonEmptyString(value.refactor) && isNonEmptyString(value.action)
  );
}

export function isApplyRequest(value: unknown): value is ApplyControlRequest {
  if (
    !isRecord(value) ||
    !isApplyCommand(String(value.command)) ||
    !hasOptionalMutatingFlags(value)
  ) {
    return false;
  }

  if (value.command === "rename-apply") {
    return (
      isQueryLocation(value.location) &&
      isNonEmptyString(value.newName) &&
      hasOptionalBoolean(value, "findInComments") &&
      hasOptionalBoolean(value, "findInStrings")
    );
  }

  return (
    isQueryRange(value.range) && isNonEmptyString(value.refactor) && isNonEmptyString(value.action)
  );
}
