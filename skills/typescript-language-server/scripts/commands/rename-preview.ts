import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { RenamePreviewQueryRequest, RenamePreviewResult } from "../core/contracts/index.ts";
import {
  formatLineOffset,
  formatSpan,
  isTextSpanRecord,
  resolveQueryFilePath,
  summarizeDocumentSpan,
} from "../core/query-shared.ts";

export async function executeRenamePreviewQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: RenamePreviewQueryRequest,
  timeoutMs: number,
): Promise<RenamePreviewResult> {
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
  const groups =
    Array.isArray(rawBody.locs) ?
      rawBody.locs.flatMap((group) => {
        if (!isRecord(group) || typeof group.file !== "string" || !Array.isArray(group.locs)) {
          return [];
        }
        const spans = group.locs.flatMap((entry) => {
          const summary = summarizeDocumentSpan({ ...entry, file: group.file });
          if (!summary) {
            return [];
          }
          return [
            {
              ...summary,
              ...(typeof entry.prefixText === "string" ? { prefixText: entry.prefixText } : {}),
              ...(typeof entry.suffixText === "string" ? { suffixText: entry.suffixText } : {}),
            },
          ];
        });
        return [{ file: group.file, spans }];
      })
    : [];

  return {
    kind: "rename-preview",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    canRename: info.canRename === true,
    ...(typeof info.displayName === "string" ? { displayName: info.displayName } : {}),
    ...(typeof info.fullDisplayName === "string" ? { fullDisplayName: info.fullDisplayName } : {}),
    ...(typeof info.localizedErrorMessage === "string" ?
      { errorMessage: info.localizedErrorMessage }
    : {}),
    ...(typeof info.fileToRename === "string" ? { fileToRename: info.fileToRename } : {}),
    ...(isTextSpanRecord(info.triggerSpan) ?
      { triggerSpan: formatSpan(info.triggerSpan.start, info.triggerSpan.end) }
    : {}),
    groups,
  };
}

export function printRenamePreviewResult(result: RenamePreviewResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`can_rename=${result.canRename ? "yes" : "no"}`);
  console.log(`display_name=${result.displayName || "<unknown>"}`);
  console.log(`full_display_name=${result.fullDisplayName || "<unknown>"}`);
  console.log(`error_message=${result.errorMessage || "<none>"}`);
  console.log(`file_to_rename=${result.fileToRename || "<none>"}`);
  console.log(`trigger_span_start=${result.triggerSpan?.start || "<none>"}`);
  console.log(`trigger_span_end=${result.triggerSpan?.end || "<none>"}`);
  console.log(`group_count=${result.groups.length}`);
  console.log("groups_start");
  for (const group of result.groups) {
    console.log(`group|${group.file}|${group.spans.length}`);
    for (const span of group.spans) {
      console.log(
        ["span", span.start, span.end, span.prefixText || "", span.suffixText || ""].join("|"),
      );
    }
  }
  console.log("groups_end");
}
