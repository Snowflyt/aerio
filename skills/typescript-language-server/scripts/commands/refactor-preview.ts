import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type {
  RefactorPreviewQueryRequest,
  RefactorPreviewResult,
} from "../core/contracts/index.ts";
import {
  buildRangeArgs,
  formatLineOffset,
  isLocationRecord,
  resolveQueryFilePath,
  summarizeCodeEdit,
  summarizeRange,
} from "../core/query-shared.ts";

export async function executeRefactorPreviewQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: RefactorPreviewQueryRequest,
  timeoutMs: number,
): Promise<RefactorPreviewResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.range.file);
  const body = await backend.execute(
    "getEditsForRefactor",
    {
      ...buildRangeArgs(filePath, request.range),
      refactor: request.refactor,
      action: request.action,
    },
    timeoutMs,
    [filePath],
  );

  const rawBody = isRecord(body) ? body : {};
  const edits =
    Array.isArray(rawBody.edits) ?
      rawBody.edits.flatMap((entry) => {
        if (
          !isRecord(entry) ||
          typeof entry.fileName !== "string" ||
          !Array.isArray(entry.textChanges)
        ) {
          return [];
        }
        const changes = entry.textChanges.flatMap((change) => {
          const summary = summarizeCodeEdit(change);
          return summary ? [summary] : [];
        });
        return [{ file: entry.fileName, isNewFile: false, changes }];
      })
    : [];
  const rangeSummary = summarizeRange(request.range);

  const result: RefactorPreviewResult = {
    kind: "refactor-preview",
    file: filePath,
    queryLocation: formatLineOffset(request.range.line, request.range.offset),
    refactor: request.refactor,
    action: request.action,
    ...(typeof rawBody.notApplicableReason === "string" ?
      { notApplicableReason: rawBody.notApplicableReason }
    : {}),
    ...(typeof rawBody.renameFilename === "string" ?
      { renameFilename: rawBody.renameFilename }
    : {}),
    ...(isLocationRecord(rawBody.renameLocation) ?
      {
        renameLocation: formatLineOffset(
          rawBody.renameLocation.line,
          rawBody.renameLocation.offset,
        ),
      }
    : {}),
    edits,
  };
  if (rangeSummary) {
    result.range = rangeSummary;
  }
  return result;
}

export function printRefactorPreviewResult(result: RefactorPreviewResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`range_start=${result.range?.start || "<none>"}`);
  console.log(`range_end=${result.range?.end || "<none>"}`);
  console.log(`refactor=${result.refactor}`);
  console.log(`action=${result.action}`);
  console.log(`not_applicable_reason=${result.notApplicableReason || "<none>"}`);
  console.log(`rename_filename=${result.renameFilename || "<none>"}`);
  console.log(`rename_location=${result.renameLocation || "<none>"}`);
  console.log(`file_count=${result.edits.length}`);
  console.log(`edit_count=${result.edits.reduce((count, file) => count + file.changes.length, 0)}`);
  console.log("edits_start");
  for (const file of result.edits) {
    console.log(`file|${file.file}|${file.changes.length}`);
    for (const change of file.changes) {
      console.log(["change", change.start, change.end, change.newTextPreview].join("|"));
    }
  }
  console.log("edits_end");
}
