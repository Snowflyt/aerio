import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { ReferencesQueryRequest, ReferencesResult } from "../core/contracts/index.ts";
import {
  formatLineOffset,
  resolveQueryFilePath,
  summarizeDocumentSpan,
} from "../core/query-shared.ts";

export async function executeReferencesQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: ReferencesQueryRequest,
  timeoutMs: number,
): Promise<ReferencesResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.location.file);
  const body = await backend.execute(
    "references",
    {
      file: filePath,
      line: request.location.line,
      offset: request.location.offset,
    },
    timeoutMs,
    [filePath],
  );

  const rawBody = isRecord(body) ? body : {};
  const references =
    Array.isArray(rawBody.refs) ?
      rawBody.refs.flatMap((entry) => {
        const summary = summarizeDocumentSpan(entry);
        return summary ? [summary] : [];
      })
    : [];

  return {
    kind: "references",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    symbolName: typeof rawBody.symbolName === "string" ? rawBody.symbolName : "",
    symbolDisplayString:
      typeof rawBody.symbolDisplayString === "string" ? rawBody.symbolDisplayString : "",
    references,
  };
}

export function printReferencesResult(result: ReferencesResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`symbol_name=${result.symbolName || "<unknown>"}`);
  console.log(`symbol_display=${result.symbolDisplayString || "<unknown>"}`);
  console.log(`reference_count=${result.references.length}`);
  console.log("references_start");
  for (const reference of result.references) {
    console.log(
      [
        reference.file,
        reference.start,
        reference.end,
        reference.isWriteAccess ? "write" : "read",
        reference.isDefinition ? "definition" : "reference",
        reference.lineText || "",
      ].join("|"),
    );
  }
  console.log("references_end");
}
