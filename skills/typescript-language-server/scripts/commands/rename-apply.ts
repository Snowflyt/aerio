import { WorkspaceEditApplier } from "../core/apply/workspace-edit-applier.ts";
import type { WorkspaceTextChange } from "../core/apply/workspace-edit-applier.ts";
import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { RenameApplyRequest, RenameApplyResult } from "../core/contracts/index.ts";
import { formatLineOffset, isLocationRecord, resolveQueryFilePath } from "../core/query-shared.ts";

export async function executeRenameApply(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: RenameApplyRequest,
  timeoutMs: number,
): Promise<RenameApplyResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.location.file);
  const body = await backend.execute(
    "rename",
    {
      file: filePath,
      line: request.location.line,
      offset: request.location.offset,
      ...(request.findInComments != null ? { findInComments: request.findInComments } : {}),
      ...(request.findInStrings != null ? { findInStrings: request.findInStrings } : {}),
    },
    timeoutMs,
    [filePath],
  );

  const rawBody = isRecord(body) ? body : {};
  const info = isRecord(rawBody.info) ? rawBody.info : {};
  if (info.canRename !== true) {
    throw new Error(
      typeof info.localizedErrorMessage === "string" ?
        info.localizedErrorMessage
      : "tsserver reported that the symbol cannot be renamed",
    );
  }
  if (typeof info.fileToRename === "string" && info.fileToRename.length > 0) {
    throw new Error("file rename operations are not supported by rename-apply yet");
  }

  const textChanges: WorkspaceTextChange[] =
    Array.isArray(rawBody.locs) ?
      rawBody.locs.flatMap((group) => {
        if (!isRecord(group) || typeof group.file !== "string" || !Array.isArray(group.locs)) {
          return [];
        }
        const groupFile = group.file;
        return group.locs.flatMap((entry) => {
          if (!isLocationRecord(entry?.start) || !isLocationRecord(entry?.end)) {
            return [];
          }
          const prefixText = typeof entry.prefixText === "string" ? entry.prefixText : "";
          const suffixText = typeof entry.suffixText === "string" ? entry.suffixText : "";
          const directNewText = typeof entry.newText === "string" ? entry.newText : "";
          const placeholderText =
            typeof entry.placeholderText === "string" ? entry.placeholderText : "";
          return [
            {
              file: groupFile,
              isNewFile: false,
              start: entry.start,
              end: entry.end,
              newText:
                directNewText && placeholderText ?
                  directNewText.split(placeholderText).join(request.newName)
                : `${prefixText}${request.newName}${suffixText}`,
            },
          ];
        });
      })
    : [];

  const applyResult = new WorkspaceEditApplier(repoRoot).applyTextChanges(textChanges, {
    dryRun: request.dryRun !== false,
    createBackup: request.createBackup !== false,
    backupNamespace: "rename-apply",
  });

  return {
    kind: "rename-apply",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    newName: request.newName,
    dryRun: request.dryRun !== false,
    ...(applyResult.backupDir ? { backupDir: applyResult.backupDir } : {}),
    ...(typeof info.displayName === "string" ? { displayName: info.displayName } : {}),
    ...(typeof info.fullDisplayName === "string" ? { fullDisplayName: info.fullDisplayName } : {}),
    fileCount: applyResult.fileCount,
    editCount: applyResult.editCount,
    edits: applyResult.edits,
  };
}

export function printRenameApplyResult(result: RenameApplyResult): void {
  console.log("typescript_language_server_apply=ok");
  console.log(`operation_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`new_name=${result.newName}`);
  console.log(`dry_run=${result.dryRun ? "yes" : "no"}`);
  console.log(`backup_dir=${result.backupDir || "<none>"}`);
  console.log(`display_name=${result.displayName || "<unknown>"}`);
  console.log(`full_display_name=${result.fullDisplayName || "<unknown>"}`);
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
