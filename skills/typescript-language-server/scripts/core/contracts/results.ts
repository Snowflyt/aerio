import { isRecord } from "../common.ts";

export interface DiagnosticSummary {
  category: string;
  code: number;
  file: string;
  location: string;
  source: string;
  text: string;
}

export interface CheckResult {
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  diagnostics: readonly DiagnosticSummary[];
}

export interface SpanSummary {
  start: string;
  end: string;
}

export interface DocumentSpanSummary extends SpanSummary {
  file: string;
  context?: string;
  kind?: string;
  name?: string;
  containerKind?: string;
  containerName?: string;
  lineText?: string;
  isDefinition?: boolean;
  isWriteAccess?: boolean;
}

export interface QuickInfoResult {
  kind: "info";
  file: string;
  queryLocation: string;
  span: SpanSummary;
  symbolKind: string;
  kindModifiers: string;
  displayString: string;
  documentation: string;
  tags: readonly string[];
  canIncreaseVerbosityLevel: boolean;
}

export interface NavigationResult {
  kind: "definition" | "type-definition" | "implementation";
  file: string;
  queryLocation: string;
  boundSpan?: SpanSummary;
  locations: readonly DocumentSpanSummary[];
}

export interface ReferencesResult {
  kind: "references";
  file: string;
  queryLocation: string;
  symbolName: string;
  symbolDisplayString: string;
  references: readonly DocumentSpanSummary[];
}

export interface RenameGroupSummary {
  file: string;
  spans: readonly (DocumentSpanSummary & {
    prefixText?: string;
    suffixText?: string;
  })[];
}

export interface RenamePreviewResult {
  kind: "rename-preview";
  file: string;
  queryLocation: string;
  canRename: boolean;
  displayName?: string;
  fullDisplayName?: string;
  errorMessage?: string;
  fileToRename?: string;
  triggerSpan?: SpanSummary;
  groups: readonly RenameGroupSummary[];
}

export interface RefactorActionSummary {
  name: string;
  description: string;
  kind?: string;
  notApplicableReason?: string;
  isInteractive: boolean;
}

export interface RefactorGroupSummary {
  name: string;
  description: string;
  actions: readonly RefactorActionSummary[];
}

export interface RefactorListResult {
  kind: "refactor-list";
  file: string;
  queryLocation: string;
  range?: SpanSummary;
  refactors: readonly RefactorGroupSummary[];
}

export interface FileEditSummary {
  file: string;
  isNewFile: boolean;
  changes: readonly (SpanSummary & {
    newTextPreview: string;
  })[];
}

export interface RefactorPreviewResult {
  kind: "refactor-preview";
  file: string;
  queryLocation: string;
  range?: SpanSummary;
  refactor: string;
  action: string;
  notApplicableReason?: string;
  renameFilename?: string;
  renameLocation?: string;
  edits: readonly FileEditSummary[];
}

export interface RenameApplyResult {
  kind: "rename-apply";
  file: string;
  queryLocation: string;
  newName: string;
  dryRun: boolean;
  backupDir?: string;
  displayName?: string;
  fullDisplayName?: string;
  fileCount: number;
  editCount: number;
  edits: readonly FileEditSummary[];
}

export interface RefactorApplyResult {
  kind: "refactor-apply";
  file: string;
  queryLocation: string;
  range?: SpanSummary;
  refactor: string;
  action: string;
  dryRun: boolean;
  backupDir?: string;
  renameFilename?: string;
  renameLocation?: string;
  fileCount: number;
  editCount: number;
  edits: readonly FileEditSummary[];
}

export type QueryResult =
  | QuickInfoResult
  | NavigationResult
  | ReferencesResult
  | RenamePreviewResult
  | RefactorListResult
  | RefactorPreviewResult;

export type ApplyResult = RenameApplyResult | RefactorApplyResult;

export type OperationResult = QueryResult | ApplyResult;

export function isDiagnosticSummary(value: unknown): value is DiagnosticSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.category === "string" &&
    typeof value.code === "number" &&
    typeof value.file === "string" &&
    typeof value.location === "string" &&
    typeof value.source === "string" &&
    typeof value.text === "string"
  );
}

export function isCheckResult(value: unknown): value is CheckResult {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.errorCount === "number" &&
    typeof value.warningCount === "number" &&
    typeof value.suggestionCount === "number" &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every((diagnostic) => isDiagnosticSummary(diagnostic))
  );
}

export function isQueryResult(value: unknown): value is QueryResult {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  return (
    value.kind === "info" ||
    value.kind === "definition" ||
    value.kind === "type-definition" ||
    value.kind === "implementation" ||
    value.kind === "references" ||
    value.kind === "rename-preview" ||
    value.kind === "refactor-list" ||
    value.kind === "refactor-preview"
  );
}

export function isApplyResult(value: unknown): value is ApplyResult {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  return value.kind === "rename-apply" || value.kind === "refactor-apply";
}

export function isOperationResult(value: unknown): value is OperationResult {
  return isQueryResult(value) || isApplyResult(value);
}
