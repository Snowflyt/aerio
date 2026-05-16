import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import type { QueryControlRequest, QueryResult } from "../core/contracts/index.ts";

import { executeDefinitionQuery, printDefinitionResult } from "./definition.ts";
import { executeImplementationQuery, printImplementationResult } from "./implementation.ts";
import { executeInfoQuery, printInfoResult } from "./info.ts";
import { executeRefactorListQuery, printRefactorListResult } from "./refactor-list.ts";
import { executeRefactorPreviewQuery, printRefactorPreviewResult } from "./refactor-preview.ts";
import { executeReferencesQuery, printReferencesResult } from "./references.ts";
import { executeRenamePreviewQuery, printRenamePreviewResult } from "./rename-preview.ts";
import { executeTypeDefinitionQuery, printTypeDefinitionResult } from "./type-definition.ts";

export async function executeQueryCommand(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: QueryControlRequest,
  timeoutMs: number,
): Promise<QueryResult> {
  switch (request.command) {
    case "info":
      return executeInfoQuery(backend, repoRoot, request, timeoutMs);
    case "definition":
      return executeDefinitionQuery(backend, repoRoot, request, timeoutMs);
    case "type-definition":
      return executeTypeDefinitionQuery(backend, repoRoot, request, timeoutMs);
    case "implementation":
      return executeImplementationQuery(backend, repoRoot, request, timeoutMs);
    case "references":
      return executeReferencesQuery(backend, repoRoot, request, timeoutMs);
    case "rename-preview":
      return executeRenamePreviewQuery(backend, repoRoot, request, timeoutMs);
    case "refactor-list":
      return executeRefactorListQuery(backend, repoRoot, request, timeoutMs);
    case "refactor-preview":
      return executeRefactorPreviewQuery(backend, repoRoot, request, timeoutMs);
  }
}

export function printQueryResult(result: QueryResult): void {
  switch (result.kind) {
    case "info":
      printInfoResult(result);
      return;
    case "definition":
      printDefinitionResult(result);
      return;
    case "type-definition":
      printTypeDefinitionResult(result);
      return;
    case "implementation":
      printImplementationResult(result);
      return;
    case "references":
      printReferencesResult(result);
      return;
    case "rename-preview":
      printRenamePreviewResult(result);
      return;
    case "refactor-list":
      printRefactorListResult(result);
      return;
    case "refactor-preview":
      printRefactorPreviewResult(result);
      return;
  }
}
