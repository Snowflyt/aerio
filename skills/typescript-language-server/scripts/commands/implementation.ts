import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import type { ImplementationQueryRequest, NavigationResult } from "../core/contracts/index.ts";
import {
  formatLineOffset,
  resolveQueryFilePath,
  summarizeDocumentSpan,
} from "../core/query-shared.ts";

export async function executeImplementationQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: ImplementationQueryRequest,
  timeoutMs: number,
): Promise<NavigationResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.location.file);
  const body = await backend.execute(
    "implementation",
    {
      file: filePath,
      line: request.location.line,
      offset: request.location.offset,
    },
    timeoutMs,
    [filePath],
  );

  const locations =
    Array.isArray(body) ?
      body.flatMap((entry) => {
        const summary = summarizeDocumentSpan(entry);
        return summary ? [summary] : [];
      })
    : [];

  return {
    kind: "implementation",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    locations,
  };
}

export function printImplementationResult(result: NavigationResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`location_count=${result.locations.length}`);
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
