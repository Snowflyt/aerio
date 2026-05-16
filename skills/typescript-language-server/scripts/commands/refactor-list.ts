import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import { isRecord } from "../core/common.ts";
import type { RefactorListQueryRequest, RefactorListResult } from "../core/contracts/index.ts";
import {
  buildRangeArgs,
  formatLineOffset,
  resolveQueryFilePath,
  summarizeRange,
} from "../core/query-shared.ts";

export async function executeRefactorListQuery(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: RefactorListQueryRequest,
  timeoutMs: number,
): Promise<RefactorListResult> {
  const filePath = resolveQueryFilePath(repoRoot, request.range.file);
  const body = await backend.execute(
    "getApplicableRefactors",
    buildRangeArgs(filePath, request.range, { includeInteractiveActions: true }),
    timeoutMs,
    [filePath],
  );

  const refactors =
    Array.isArray(body) ?
      body.flatMap((group) => {
        if (
          !isRecord(group) ||
          typeof group.name !== "string" ||
          typeof group.description !== "string"
        ) {
          return [];
        }
        const actions =
          Array.isArray(group.actions) ?
            group.actions.flatMap((action) => {
              if (
                !isRecord(action) ||
                typeof action.name !== "string" ||
                typeof action.description !== "string"
              ) {
                return [];
              }
              return [
                {
                  name: action.name,
                  description: action.description,
                  ...(typeof action.kind === "string" ? { kind: action.kind } : {}),
                  ...(typeof action.notApplicableReason === "string" ?
                    { notApplicableReason: action.notApplicableReason }
                  : {}),
                  isInteractive: action.isInteractive === true,
                },
              ];
            })
          : [];
        return [{ name: group.name, description: group.description, actions }];
      })
    : [];
  const rangeSummary = summarizeRange(request.range);

  const result: RefactorListResult = {
    kind: "refactor-list",
    file: filePath,
    queryLocation: formatLineOffset(request.range.line, request.range.offset),
    refactors,
  };
  if (rangeSummary) {
    result.range = rangeSummary;
  }
  return result;
}

export function printRefactorListResult(result: RefactorListResult): void {
  console.log("typescript_language_server_mode=inspect");
  console.log("typescript_language_server_status=ok");
  console.log(`query_kind=${result.kind}`);
  console.log(`file=${result.file}`);
  console.log(`query_location=${result.queryLocation}`);
  console.log(`range_start=${result.range?.start || "<none>"}`);
  console.log(`range_end=${result.range?.end || "<none>"}`);
  console.log(`refactor_count=${result.refactors.length}`);
  console.log("refactors_start");
  for (const refactor of result.refactors) {
    console.log(`refactor|${refactor.name}|${refactor.description}`);
    for (const action of refactor.actions) {
      console.log(
        [
          "action",
          refactor.name,
          action.name,
          action.description,
          action.kind || "",
          action.isInteractive ? "interactive" : "static",
          action.notApplicableReason || "",
        ].join("|"),
      );
    }
  }
  console.log("refactors_end");
}
