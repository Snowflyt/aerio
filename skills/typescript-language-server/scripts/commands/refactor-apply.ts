import { WorkspaceEditApplier } from "../core/apply/workspace-edit-applier.ts";
import type { WorkspaceTextChange } from "../core/apply/workspace-edit-applier.ts";
import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { RefactorApplyRequest, RefactorApplyResult } from "../core/contracts/index.ts";
import {
  buildRangeArgs,
  formatLineOffset,
  isLocationRecord,
  isTextSpanRecord,
  resolveQueryFilePath,
  summarizeRange,
} from "../core/query-shared.ts";

export async function executeRefactorApply(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: RefactorApplyRequest,
  timeoutMs: number,
): Promise<RefactorApplyResult> {
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
  const renameFilename =
    typeof rawBody.renameFilename === "string" ? rawBody.renameFilename : undefined;
  const rawRenameLocation = rawBody.renameLocation;
  const renameLocation =
    isLocationRecord(rawRenameLocation) ?
      formatLineOffset(rawRenameLocation.line, rawRenameLocation.offset)
    : undefined;
  if (!request.dryRun && (renameFilename || renameLocation)) {
    throw new Error(
      "interactive refactors that require a follow-up rename are only supported in dry-run mode",
    );
  }

  const textChanges: WorkspaceTextChange[] =
    Array.isArray(rawBody.edits) ?
      rawBody.edits.flatMap((entry) => {
        if (
          !isRecord(entry) ||
          typeof entry.fileName !== "string" ||
          !Array.isArray(entry.textChanges)
        ) {
          return [];
        }
        const fileName = entry.fileName;
        const isNewFile = entry.isNewFile === true;
        return entry.textChanges.flatMap((change) => {
          if (
            !isRecord(change) ||
            !isTextSpanRecord(change) ||
            typeof change.newText !== "string"
          ) {
            return [];
          }
          return [
            {
              file: fileName,
              isNewFile,
              start: change.start,
              end: change.end,
              newText: change.newText,
            },
          ];
        });
      })
    : [];

  const applyResult = new WorkspaceEditApplier(repoRoot).applyTextChanges(textChanges, {
    dryRun: request.dryRun !== false,
    createBackup: request.createBackup !== false,
    backupNamespace: "refactor-apply",
  });

  const result: RefactorApplyResult = {
    kind: "refactor-apply",
    file: filePath,
    queryLocation: formatLineOffset(request.range.line, request.range.offset),
    refactor: request.refactor,
    action: request.action,
    dryRun: request.dryRun !== false,
    ...(applyResult.backupDir ? { backupDir: applyResult.backupDir } : {}),
    ...(renameFilename ? { renameFilename } : {}),
    ...(renameLocation ? { renameLocation } : {}),
    fileCount: applyResult.fileCount,
    editCount: applyResult.editCount,
    edits: applyResult.edits,
  };
  const range = summarizeRange(request.range);
  if (range) {
    result.range = range;
  }
  return result;
}

export function printRefactorApplyResult(result: RefactorApplyResult): void {
  console.log("typescript_language_server_apply=ok");
  console.log(`operation_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`range_start=${result.range?.start || "<none>"}`);
  console.log(`range_end=${result.range?.end || "<none>"}`);
  console.log(`refactor=${result.refactor}`);
  console.log(`action=${result.action}`);
  console.log(`dry_run=${result.dryRun ? "yes" : "no"}`);
  console.log(`backup_dir=${result.backupDir || "<none>"}`);
  console.log(`rename_filename=${result.renameFilename || "<none>"}`);
  console.log(`rename_location=${result.renameLocation || "<none>"}`);
  console.log(`file_count=${result.fileCount}`);
  console.log(`edit_count=${result.editCount}`);
  console.log("edits_start");
  for (const file of result.edits) {
    console.log(`file|${file.file}|${file.changes.length}|${file.isNewFile ? "new" : "existing"}`);
    for (const change of file.changes) {
      console.log(["change", change.start, change.end, change.newTextPreview].join("|"));
    }
  }
  console.log("edits_end");
}
