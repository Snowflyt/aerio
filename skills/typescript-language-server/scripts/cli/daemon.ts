#!/usr/bin/env node
import { parseArgs } from "node:util";

import { toErrorMessage } from "../core/common.ts";
import type { ControlResponse, DaemonStatus } from "../core/contracts/index.ts";
import { createBridgeLogger } from "../core/logger.ts";
import { DEFAULT_CHECK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS } from "../core/runtime/constants.ts";
import { TypeScriptLanguageServerController } from "../core/runtime/controller.ts";
import { TypeScriptLanguageServerDaemon } from "../core/runtime/daemon.ts";
import { isExecutedAsMain } from "../core/runtime/module.ts";
import { resolveRepoRoot } from "../core/runtime/paths.ts";

function wantsHelp(args: readonly string[]): boolean {
  return args.includes("--help") || args[0] === "help";
}

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  node skills/typescript-language-server/scripts/cli/daemon.ts start [--project <path>]",
  );
  console.log(
    "  node skills/typescript-language-server/scripts/cli/daemon.ts status [--project <path>]",
  );
  console.log(
    "  node skills/typescript-language-server/scripts/cli/daemon.ts check [--project <path>] [--file <path>]...",
  );
  console.log(
    "  node skills/typescript-language-server/scripts/cli/daemon.ts stop [--project <path>]",
  );
  console.log("Flags: --timeout-ms <number>, --json, --help");
}

function printStatus(status: DaemonStatus, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return;
  }

  console.log(`typescript_language_server_running=${status.running ? "yes" : "no"}`);
  console.log(`backend=${status.backend}`);
  console.log(`project_root=${status.repoRoot}`);
  console.log(`workspace_root=${status.workspaceRoot}`);
  console.log(`state_dir=${status.stateDir}`);
  console.log(`log_path=${status.logPath}`);
  console.log(`socket_path=${status.socketPath}`);
  console.log(`daemon_pid=${status.pid || 0}`);
  console.log(`server_pid=${status.serverPid || 0}`);
  console.log(`project_file_count=${status.projectFileCount}`);
  console.log(`opened_file_count=${status.openedFileCount}`);
  console.log(`started_at=${status.startedAt || "<none>"}`);
  console.log(`updated_at=${status.updatedAt || "<none>"}`);
  console.log(`last_check_at=${status.lastCheckAt || "<none>"}`);
  console.log(`last_error_count=${status.lastErrorCount}`);
  console.log(`last_warning_count=${status.lastWarningCount}`);
  console.log(`last_suggestion_count=${status.lastSuggestionCount}`);
  console.log(`fallback_count=${status.fallbackCount}`);
  console.log(`last_fallback_at=${status.lastFallbackAt || "<none>"}`);
  console.log(`last_fallback_command=${status.lastFallbackCommand || "<none>"}`);
  console.log(`last_fallback_reason=${status.lastFallbackReason || "<none>"}`);
  console.log(`tsserver_route_count=${status.tsServerRouteCount}`);
  console.log(`last_tsserver_route_at=${status.lastTsServerRouteAt || "<none>"}`);
  console.log(`last_tsserver_route_command=${status.lastTsServerRouteCommand || "<none>"}`);
  console.log(`last_tsserver_route_reason=${status.lastTsServerRouteReason || "<none>"}`);
}

function printCheck(response: ControlResponse, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  printStatus(response.status, false);
  if (!response.check) {
    console.log("typescript_language_server_check=unavailable");
    return;
  }

  console.log("typescript_language_server_check=ok");
  console.log(`error_count=${response.check.errorCount}`);
  console.log(`warning_count=${response.check.warningCount}`);
  console.log(`suggestion_count=${response.check.suggestionCount}`);
  console.log("diagnostics_start");
  for (const diagnostic of response.check.diagnostics) {
    console.log(
      `${diagnostic.category}|${diagnostic.file}|${diagnostic.location || "-"}|TS${diagnostic.code}|${diagnostic.text}`,
    );
  }
  console.log("diagnostics_end");
}

function parseTimeout(raw: string | undefined, fallbackMs: number): number {
  return Math.max(1_000, Number(raw || fallbackMs));
}

export async function runDaemonCli(args: readonly string[]): Promise<number> {
  if (wantsHelp(args)) {
    printUsage();
    return 0;
  }

  const { positionals, values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    strict: true,
    options: {
      "timeout-ms": { type: "string" },
      file: { type: "string", multiple: true },
      project: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help === true) {
    printUsage();
    return 0;
  }

  const command = positionals[0] || "status";
  const asJson = values.json === true;
  const timeoutMs = parseTimeout(
    typeof values["timeout-ms"] === "string" ? values["timeout-ms"] : undefined,
    command === "check" ? DEFAULT_CHECK_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
  );
  const files = (values.file || []).filter((value) => value.trim().length > 0);
  const logger = createBridgeLogger({ component: "tooling.typescript-language-server" });
  const explicitProject = typeof values.project === "string" ? values.project : undefined;
  const projectRoot = resolveRepoRoot({
    ...(explicitProject ? { explicitProject } : {}),
    fileHints: files,
  });
  const controller = new TypeScriptLanguageServerController(projectRoot, logger);

  if (command === "start") {
    const status = await controller.start(timeoutMs);
    printStatus(status, asJson);
    return 0;
  }

  if (command === "status") {
    const status = await controller.status();
    printStatus(status, asJson);
    return status.running ? 0 : 1;
  }

  if (command === "check") {
    const response = await controller.check(timeoutMs, files);
    printCheck(response, asJson);
    return response.check && response.check.errorCount > 0 ? 2 : 0;
  }

  if (command === "stop") {
    const status = await controller.stop();
    printStatus({ ...status, running: false }, asJson);
    return 0;
  }

  if (command !== "serve") {
    throw new Error(`unknown typescript-language-server command: ${command}`);
  }

  const daemon = new TypeScriptLanguageServerDaemon(projectRoot, logger);
  const shutdown = async (): Promise<void> => {
    await daemon.shutdown();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(130));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(143));
  });

  await daemon.run();
  return await new Promise<number>(() => {
    // Keep the daemon process alive until it is stopped explicitly.
  });
}

if (isExecutedAsMain(import.meta.url)) {
  runDaemonCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(`typescript-language-server daemon failed: ${toErrorMessage(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exitCode = 1;
    });
}
