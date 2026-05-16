import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { DefinitionQueryRequest, NavigationResult } from "../core/contracts/index.ts";
import {
  formatLineOffset,
  formatSpan,
  isTextSpanRecord,
  resolveQueryFilePath,
  summarizeDocumentSpan,
} from "../core/query-shared.ts";

export async function executeDefinitionQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: DefinitionQueryRequest,
  timeoutMs: number,
): Promise<NavigationResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.location.file);
  const body = await backend.execute(
    "definitionAndBoundSpan",
    {
      file: filePath,
      line: request.location.line,
      offset: request.location.offset,
    },
    timeoutMs,
    [filePath],
  );

  const rawBody = isRecord(body) ? body : {};
  const locations =
    Array.isArray(rawBody.definitions) ?
      rawBody.definitions.flatMap((entry) => {
        const summary = summarizeDocumentSpan(entry);
        return summary ? [summary] : [];
      })
    : [];

  return {
    kind: "definition",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    ...(isTextSpanRecord(rawBody.textSpan) ?
      { boundSpan: formatSpan(rawBody.textSpan.start, rawBody.textSpan.end) }
    : {}),
    locations,
  };
}

export function printDefinitionResult(result: NavigationResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`location_count=${result.locations.length}`);
  console.log(`bound_span_start=${result.boundSpan?.start || "<none>"}`);
  console.log(`bound_span_end=${result.boundSpan?.end || "<none>"}`);
  console.log("locations_start");
  for (const location of result.locations) {
    console.log(
      [
        location.file,
        location.start,
        location.end,
        location.kind || "",
        location.name || "",
        location.containerName || "",
      ].join("|"),
    );
  }
  console.log("locations_end");
}
