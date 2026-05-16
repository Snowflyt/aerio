#!/usr/bin/env node
import { parseArgs } from "node:util";

import { printApplyResult } from "../commands/apply.ts";
import { isPositiveInteger, toErrorMessage } from "../core/common.ts";
import type { ApplyControlRequest, QueryRange } from "../core/contracts/index.ts";
import { isApplyResult } from "../core/contracts/index.ts";
import { createBridgeLogger } from "../core/logger.ts";
import { getRequestPrimaryFile } from "../core/query-shared.ts";
import { DEFAULT_TIMEOUT_MS } from "../core/runtime/constants.ts";
import { TypeScriptLanguageServerController } from "../core/runtime/controller.ts";
import { isExecutedAsMain } from "../core/runtime/module.ts";
import { resolveRepoRoot } from "../core/runtime/paths.ts";

function wantsHelp(args: readonly string[]): boolean {
  return args.includes("--help") || args[0] === "help";
}

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  node skills/typescript-language-server/scripts/cli/apply.ts rename --file <path> --line <n> --offset <n> --new-name <name>",
  );
  console.log(
    "  node skills/typescript-language-server/scripts/cli/apply.ts refactor --file <path> --line <n> --offset <n> --end-line <n> --end-offset <n> --refactor <name> --action <name>",
  );
  console.log(
    "Flags: --write, --no-backup, --project <path>, --timeout-ms <number>, --json, --help",
  );
}

function parseRequiredPositiveInt(name: string, rawValue: string | undefined): number {
  const numeric = Number(rawValue);
  if (!isPositiveInteger(numeric)) {
    throw new Error(`missing or invalid --${name}`);
  }
  return numeric;
}

function parseLocation(values: Record<string, string | boolean | undefined>): {
  file: string;
  line: number;
  offset: number;
} {
  const file = values.file;
  if (typeof file !== "string" || file.trim().length === 0) {
    throw new Error("missing --file");
  }
  return {
    file,
    line: parseRequiredPositiveInt(
      "line",
      typeof values.line === "string" ? values.line : undefined,
    ),
    offset: parseRequiredPositiveInt(
      "offset",
      typeof values.offset === "string" ? values.offset : undefined,
    ),
  };
}

function parseRange(values: Record<string, string | boolean | undefined>): QueryRange {
  const location = parseLocation(values);
  const endLine = typeof values["end-line"] === "string" ? Number(values["end-line"]) : undefined;
  const endOffset =
    typeof values["end-offset"] === "string" ? Number(values["end-offset"]) : undefined;
  if (endLine == null && endOffset == null) {
    return location;
  }
  if (!isPositiveInteger(endLine) || !isPositiveInteger(endOffset)) {
    throw new Error("--end-line and --end-offset must both be positive integers");
  }
  return {
    ...location,
    endLine,
    endOffset,
  };
}

function buildApplyRequest(args: readonly string[]): {
  request: ApplyControlRequest;
  explicitProject?: string;
  asJson: boolean;
} {
  const { positionals, values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    strict: true,
    options: {
      file: { type: "string" },
      line: { type: "string" },
      offset: { type: "string" },
      "end-line": { type: "string" },
      "end-offset": { type: "string" },
      "new-name": { type: "string" },
      refactor: { type: "string" },
      action: { type: "string" },
      "find-in-comments": { type: "boolean" },
      "find-in-strings": { type: "boolean" },
      "timeout-ms": { type: "string" },
      "no-backup": { type: "boolean" },
      write: { type: "boolean" },
      project: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help === true) {
    throw new Error("--help should be handled before building a request");
  }

  const command = positionals[0] || "";
  const timeoutMs = Math.max(
    1_000,
    Number(typeof values["timeout-ms"] === "string" ? values["timeout-ms"] : DEFAULT_TIMEOUT_MS),
  );
  const dryRun = values.write !== true;
  const createBackup = values["no-backup"] !== true;

  if (command === "rename") {
    const newName = typeof values["new-name"] === "string" ? values["new-name"] : "";
    if (!newName.trim()) {
      throw new Error("missing --new-name");
    }
    return {
      request: {
        command: "rename-apply",
        location: parseLocation(values),
        newName,
        ...(values["find-in-comments"] === true ? { findInComments: true } : {}),
        ...(values["find-in-strings"] === true ? { findInStrings: true } : {}),
        dryRun,
        createBackup,
        timeoutMs,
      },
      ...(typeof values.project === "string" ? { explicitProject: values.project } : {}),
      asJson: values.json === true,
    };
  }

  if (command === "refactor") {
    const refactor = typeof values.refactor === "string" ? values.refactor : "";
    const action = typeof values.action === "string" ? values.action : "";
    if (!refactor || !action) {
      throw new Error("--refactor and --action are required for refactor apply");
    }
    return {
      request: {
        command: "refactor-apply",
        range: parseRange(values),
        refactor,
        action,
        dryRun,
        createBackup,
        timeoutMs,
      },
      ...(typeof values.project === "string" ? { explicitProject: values.project } : {}),
      asJson: values.json === true,
    };
  }

  throw new Error(`unknown typescript-language-server apply command: ${command || "<empty>"}`);
}

export async function runApplyCli(args: readonly string[]): Promise<number> {
  if (wantsHelp(args)) {
    printUsage();
    return 0;
  }

  const { asJson, explicitProject, request } = buildApplyRequest(args);
  const logger = createBridgeLogger({ component: "tooling.typescript-language-server.apply" });
  const controller = new TypeScriptLanguageServerController(
    resolveRepoRoot({
      ...(explicitProject ? { explicitProject } : {}),
      fileHints: [getRequestPrimaryFile(request)],
    }),
    logger,
  );
  const response = await controller.apply(request);

  if (asJson) {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return 0;
  }

  if (!response.result || !isApplyResult(response.result)) {
    console.log("typescript_language_server_apply=unavailable");
    return 1;
  }

  printApplyResult(response.result);
  return 0;
}

if (isExecutedAsMain(import.meta.url)) {
  runApplyCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(`typescript-language-server apply failed: ${toErrorMessage(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exitCode = 1;
    });
}
