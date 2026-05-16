import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { InfoQueryRequest, QuickInfoResult } from "../core/contracts/index.ts";
import {
  flattenDisplayText,
  formatLineOffset,
  formatSpan,
  formatTagText,
  isLocationRecord,
  resolveQueryFilePath,
} from "../core/query-shared.ts";

export async function executeInfoQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: InfoQueryRequest,
  timeoutMs: number,
): Promise<QuickInfoResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.location.file);
  const body = await backend.execute(
    "quickinfo",
    {
      file: filePath,
      line: request.location.line,
      offset: request.location.offset,
      ...(request.verbosityLevel ? { verbosityLevel: request.verbosityLevel } : {}),
    },
    timeoutMs,
    [filePath],
  );

  const rawBody = isRecord(body) ? body : {};
  const start =
    isLocationRecord(rawBody.start) ?
      rawBody.start
    : { line: request.location.line, offset: request.location.offset };
  const end = isLocationRecord(rawBody.end) ? rawBody.end : start;
  const tags =
    Array.isArray(rawBody.tags) ?
      rawBody.tags.flatMap((tag) => {
        if (!isRecord(tag) || typeof tag.name !== "string") {
          return [];
        }
        return [formatTagText(tag.name, tag.text)];
      })
    : [];

  return {
    kind: "info",
    file: filePath,
    queryLocation: formatLineOffset(request.location.line, request.location.offset),
    span: formatSpan(start, end),
    symbolKind: typeof rawBody.kind === "string" ? rawBody.kind : "",
    kindModifiers: typeof rawBody.kindModifiers === "string" ? rawBody.kindModifiers : "",
    displayString:
      typeof rawBody.displayString === "string" ?
        rawBody.displayString
      : flattenDisplayText(rawBody.displayString),
    documentation: flattenDisplayText(rawBody.documentation),
    tags,
    canIncreaseVerbosityLevel: rawBody.canIncreaseVerbosityLevel === true,
  };
}

export function printInfoResult(result: QuickInfoResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`span_start=${result.span.start}`);
  console.log(`span_end=${result.span.end}`);
  console.log(`symbol_kind=${result.symbolKind || "<unknown>"}`);
  console.log(`kind_modifiers=${result.kindModifiers || "<none>"}`);
  console.log(`display_string=${result.displayString || "<empty>"}`);
  console.log(`documentation=${result.documentation || "<empty>"}`);
  console.log(`can_increase_verbosity=${result.canIncreaseVerbosityLevel ? "yes" : "no"}`);
  console.log("tags_start");
  for (const tag of result.tags) {
    console.log(tag);
  }
  console.log("tags_end");
}
