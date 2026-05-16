import { isAbsolute, resolve } from "node:path";

import { isRecord, normalizeText, truncatePreview } from "./common.ts";
import type {
  DocumentSpanSummary,
  OperationControlRequest,
  QueryLocation,
  QueryRange,
  SpanSummary,
} from "./contracts/index.ts";

interface LocationRecord {
  line: number;
  offset: number;
}

interface TextSpanRecord {
  start: LocationRecord;
  end: LocationRecord;
}

export function formatLineOffset(line: number, offset: number): string {
  return `${line}:${offset}`;
}

export function formatSpan(start: LocationRecord, end: LocationRecord): SpanSummary {
  return {
    start: formatLineOffset(start.line, start.offset),
    end: formatLineOffset(end.line, end.offset),
  };
}

export function resolveQueryFilePath(repoRoot: string, file: string): string {
  return isAbsolute(file) ? resolve(file) : resolve(repoRoot, file);
}

export function getRequestPrimaryFile(request: OperationControlRequest): string {
  return "location" in request ? request.location.file : request.range.file;
}

export function getRequestLocation(request: OperationControlRequest): QueryLocation {
  return "location" in request ? request.location : request.range;
}

export function buildRangeArgs(
  filePath: string,
  range: QueryRange,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  if (range.endLine == null || range.endOffset == null) {
    return {
      file: filePath,
      line: range.line,
      offset: range.offset,
      ...extra,
    };
  }

  return {
    file: filePath,
    startLine: range.line,
    startOffset: range.offset,
    endLine: range.endLine,
    endOffset: range.endOffset,
    ...extra,
  };
}

export function summarizeRange(range: QueryRange): { start: string; end: string } | undefined {
  if (range.endLine == null || range.endOffset == null) {
    return undefined;
  }
  return {
    start: formatLineOffset(range.line, range.offset),
    end: formatLineOffset(range.endLine, range.endOffset),
  };
}

export function flattenDisplayText(value: unknown): string {
  if (typeof value === "string") {
    return normalizeText(value);
  }
  if (!Array.isArray(value)) {
    return "";
  }
  const parts = value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.text !== "string") {
      return [];
    }
    return [entry.text];
  });
  return normalizeText(parts.join(""));
}

export function formatTagText(name: string, text: unknown): string {
  const suffix = flattenDisplayText(text);
  return suffix ? `@${name} ${suffix}` : `@${name}`;
}

export function isLocationRecord(value: unknown): value is LocationRecord {
  return isRecord(value) && typeof value.line === "number" && typeof value.offset === "number";
}

export function isTextSpanRecord(value: unknown): value is TextSpanRecord {
  return isRecord(value) && isLocationRecord(value.start) && isLocationRecord(value.end);
}

export function summarizeDocumentSpan(rawSpan: unknown): DocumentSpanSummary | null {
  if (!isRecord(rawSpan) || typeof rawSpan.file !== "string" || !isTextSpanRecord(rawSpan)) {
    return null;
  }

  return {
    file: rawSpan.file,
    ...formatSpan(rawSpan.start, rawSpan.end),
    ...(typeof rawSpan.context === "string" ? { context: normalizeText(rawSpan.context) } : {}),
    ...(typeof rawSpan.kind === "string" ? { kind: rawSpan.kind } : {}),
    ...(typeof rawSpan.name === "string" ? { name: rawSpan.name } : {}),
    ...(typeof rawSpan.containerKind === "string" ? { containerKind: rawSpan.containerKind } : {}),
    ...(typeof rawSpan.containerName === "string" ? { containerName: rawSpan.containerName } : {}),
    ...(typeof rawSpan.lineText === "string" ? { lineText: normalizeText(rawSpan.lineText) } : {}),
    ...(typeof rawSpan.isDefinition === "boolean" ? { isDefinition: rawSpan.isDefinition } : {}),
    ...(typeof rawSpan.isWriteAccess === "boolean" ? { isWriteAccess: rawSpan.isWriteAccess } : {}),
  };
}

export function summarizeCodeEdit(
  rawChange: unknown,
): (SpanSummary & { newTextPreview: string }) | null {
  if (
    !isRecord(rawChange) ||
    !isTextSpanRecord(rawChange) ||
    typeof rawChange.newText !== "string"
  ) {
    return null;
  }

  return {
    ...formatSpan(rawChange.start, rawChange.end),
    newTextPreview: truncatePreview(rawChange.newText),
  };
}
