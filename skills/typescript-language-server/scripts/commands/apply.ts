import type { TypeScriptLanguageServerBackend } from "../core/backend.ts";
import type { ApplyControlRequest, ApplyResult } from "../core/contracts/index.ts";

import { executeRefactorApply, printRefactorApplyResult } from "./refactor-apply.ts";
import { executeRenameApply, printRenameApplyResult } from "./rename-apply.ts";

export async function executeApplyCommand(
  backend: TypeScriptLanguageServerBackend,
  repoRoot: string,
  request: ApplyControlRequest,
  timeoutMs: number,
): Promise<ApplyResult> {
  switch (request.command) {
    case "rename-apply":
      return executeRenameApply(backend, repoRoot, request, timeoutMs);
    case "refactor-apply":
      return executeRefactorApply(backend, repoRoot, request, timeoutMs);
  }
}

export function printApplyResult(result: ApplyResult): void {
  switch (result.kind) {
    case "rename-apply":
      printRenameApplyResult(result);
      return;
    case "refactor-apply":
      printRefactorApplyResult(result);
      return;
  }
}
