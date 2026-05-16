import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";

import type { TypeScriptLanguageServerBackend } from "./backend.ts";
import { createEmptyBackendObservability } from "./backend.ts";
import { isRecord, parseJsonValue } from "./common.ts";
import type {
  CheckResult,
  DiagnosticSummary,
  PendingEventRequest,
  PendingResponse,
  TsServerEventMessage,
  TsServerMessage,
  TsServerRequestCompletedEventMessage,
  TsServerResponseMessage,
} from "./contracts/index.ts";
import {
  isTsServerEventMessage,
  isTsServerRequestCompletedEventMessage,
  isTsServerResponseMessage,
} from "./contracts/index.ts";
import type { BridgeLogger } from "./logger.ts";
import { resolveTypeScriptInstall } from "./runtime/typescript.ts";

function parseTsServerMessage(text: string): TsServerMessage {
  const parsed = parseJsonValue(text);
  if (isTsServerResponseMessage(parsed) || isTsServerEventMessage(parsed)) {
    return parsed;
  }
  throw new Error("invalid tsserver protocol message");
}

function compareDiagnostics(a: DiagnosticSummary, b: DiagnosticSummary): number {
  const categoryOrder = new Map<string, number>([
    ["error", 0],
    ["warning", 1],
    ["suggestion", 2],
  ]);
  const categoryDiff = (categoryOrder.get(a.category) ?? 9) - (categoryOrder.get(b.category) ?? 9);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }
  const fileDiff = a.file.localeCompare(b.file);
  if (fileDiff !== 0) {
    return fileDiff;
  }
  const locationDiff = a.location.localeCompare(b.location);
  if (locationDiff !== 0) {
    return locationDiff;
  }
  return a.code - b.code;
}

function updateCategoryCounts(
  category: string,
  errorCount: number,
  warningCount: number,
  suggestionCount: number,
): { errorCount: number; warningCount: number; suggestionCount: number } {
  if (category === "error") {
    return { errorCount: errorCount + 1, warningCount, suggestionCount };
  }
  if (category === "warning") {
    return { errorCount, warningCount: warningCount + 1, suggestionCount };
  }
  if (category === "suggestion") {
    return { errorCount, warningCount, suggestionCount: suggestionCount + 1 };
  }
  return { errorCount, warningCount, suggestionCount };
}

function summarizeProtocolDiagnostic(
  rawDiagnostic: unknown,
  filePath: string,
): DiagnosticSummary | null {
  if (!filePath || !isRecord(rawDiagnostic)) {
    return null;
  }

  const category = typeof rawDiagnostic.category === "string" ? rawDiagnostic.category : "";
  const text = typeof rawDiagnostic.text === "string" ? rawDiagnostic.text : "";
  const code = typeof rawDiagnostic.code === "number" ? rawDiagnostic.code : 0;
  const source = typeof rawDiagnostic.source === "string" ? rawDiagnostic.source : "";
  const start = isRecord(rawDiagnostic.start) ? rawDiagnostic.start : {};
  const line = typeof start.line === "number" ? start.line : 0;
  const offset = typeof start.offset === "number" ? start.offset : 0;

  if (!category || !text) {
    return null;
  }

  return {
    category,
    code,
    file: filePath,
    location: line > 0 && offset > 0 ? `${line}:${offset}` : "",
    source,
    text: text.replace(/\s+/g, " ").trim(),
  };
}

export class TsServerProtocolClient implements TypeScriptLanguageServerBackend {
  readonly #repoRoot: string;
  readonly #logger: BridgeLogger;

  #child: ChildProcessWithoutNullStreams | null = null;
  #buffer = "";
  #nextRequestSeq = 1;
  #pendingResponses = new Map<number, PendingResponse>();
  #pendingEventRequests = new Map<number, PendingEventRequest>();
  #openedFiles = new Set<string>();
  #collectingProjectDiagnostics = false;
  #projectDiagnostics = new Map<string, DiagnosticSummary>();
  #projectDiagnosticFiles = new Set<string>();

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#repoRoot = repoRoot;
    this.#logger = logger;
  }

  get kind() {
    return "tsserver" as const;
  }

  get serverPid(): number {
    return this.#child?.pid ?? 0;
  }

  get openedFileCount(): number {
    return this.#openedFiles.size;
  }

  getObservability() {
    return createEmptyBackendObservability();
  }

  start(): Promise<void> {
    if (this.#child) {
      return Promise.resolve();
    }

    const typescriptInstall = resolveTypeScriptInstall(this.#repoRoot);
    const tsserverPath = typescriptInstall.tsserverPath;
    const child = spawn(process.execPath, [tsserverPath], {
      cwd: this.#repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      this.#onStdoutChunk(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      this.#logger.warn("tsserver stderr", {
        text: String(chunk).trim(),
      });
    });
    child.once("exit", (code, signal) => {
      const reason = `tsserver exited code=${code ?? "null"} signal=${signal ?? "null"}`;
      this.#logger.warn("tsserver exited", { code, signal });
      this.#child = null;
      this.#openedFiles.clear();
      this.#failPending(reason);
    });
    child.once("error", (error) => {
      this.#logger.error("tsserver failed to start", { error });
      this.#child = null;
      this.#openedFiles.clear();
      this.#failPending(`tsserver start failed: ${error.message}`);
    });

    this.#child = child;
    this.#logger.info("started tsserver child", {
      pid: child.pid,
      tsserverPath,
      typescriptVersion: typescriptInstall.version,
    });

    return Promise.resolve();
  }

  async stop(): Promise<void> {
    if (!this.#child) {
      return;
    }

    const child = this.#child;
    this.#child = null;
    this.#openedFiles.clear();
    this.#failPending("tsserver stopped");

    await new Promise<void>((resolvePromise) => {
      child.once("exit", () => {
        resolvePromise();
      });
      child.kill();
    });
  }

  async runCheck(projectFiles: readonly string[], timeoutMs: number): Promise<CheckResult> {
    if (!this.#child) {
      throw new Error("tsserver is not running");
    }

    if (projectFiles.length === 0) {
      return {
        errorCount: 0,
        warningCount: 0,
        suggestionCount: 0,
        diagnostics: [],
      };
    }

    const anchorFile = projectFiles[0];
    if (!anchorFile) {
      return {
        errorCount: 0,
        warningCount: 0,
        suggestionCount: 0,
        diagnostics: [],
      };
    }

    await this.#collectDiagnostics({
      command: "geterrForProject",
      args: {
        file: anchorFile,
        delay: 0,
      },
      openFiles: [anchorFile],
      trackedFiles: projectFiles,
      timeoutMs,
    });

    let errorCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;
    const diagnostics = [...this.#projectDiagnostics.values()].toSorted(compareDiagnostics);
    for (const diagnostic of diagnostics) {
      ({ errorCount, suggestionCount, warningCount } = updateCategoryCounts(
        diagnostic.category,
        errorCount,
        warningCount,
        suggestionCount,
      ));
    }

    return {
      errorCount,
      warningCount,
      suggestionCount,
      diagnostics,
    };
  }

  async runFocusedCheck(files: readonly string[], timeoutMs: number): Promise<CheckResult> {
    if (!this.#child) {
      throw new Error("tsserver is not running");
    }

    const targetFiles = [...new Set(files)];
    if (targetFiles.length === 0) {
      return {
        errorCount: 0,
        warningCount: 0,
        suggestionCount: 0,
        diagnostics: [],
      };
    }

    await this.#collectDiagnostics({
      command: "geterr",
      args: {
        files: targetFiles,
        delay: 0,
      },
      openFiles: targetFiles,
      trackedFiles: targetFiles,
      timeoutMs,
    });

    let errorCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;
    const diagnostics = [...this.#projectDiagnostics.values()].toSorted(compareDiagnostics);
    for (const diagnostic of diagnostics) {
      ({ errorCount, suggestionCount, warningCount } = updateCategoryCounts(
        diagnostic.category,
        errorCount,
        warningCount,
        suggestionCount,
      ));
    }

    return {
      errorCount,
      warningCount,
      suggestionCount,
      diagnostics,
    };
  }

  async execute(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown> {
    if (!this.#child) {
      throw new Error("tsserver is not running");
    }

    await this.#synchronizeOpenFiles(openFiles);
    const response = await this.#request(command, args, timeoutMs).response;
    return response.body;
  }

  #onStdoutChunk(chunk: Buffer | string): void {
    this.#buffer += String(chunk);

    while (true) {
      const headerEnd = this.#buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.#buffer.slice(0, headerEnd);
      const lengthMatch = /^Content-Length:\s*(\d+)$/im.exec(headerText);
      if (!lengthMatch) {
        throw new Error("tsserver message missing Content-Length header");
      }

      const contentLength = Number(lengthMatch[1]);
      const payloadStart = headerEnd + 4;
      const payloadEnd = payloadStart + contentLength;
      if (this.#buffer.length < payloadEnd) {
        return;
      }

      const payloadText = this.#buffer.slice(payloadStart, payloadEnd);
      this.#buffer = this.#buffer.slice(payloadEnd);
      this.#handleMessage(parseTsServerMessage(payloadText));
    }
  }

  #handleMessage(message: TsServerMessage): void {
    if (message.type === "event") {
      this.#handleEvent(message);
      return;
    }

    const pending = this.#pendingResponses.get(message.request_seq);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutHandle);
    this.#pendingResponses.delete(message.request_seq);
    if (!message.success) {
      pending.reject(new Error(message.message || `tsserver request failed: ${message.command}`));
      return;
    }
    pending.resolve(message);
  }

  #failPending(reason: string): void {
    for (const pending of this.#pendingResponses.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error(reason));
    }
    this.#pendingResponses.clear();
    for (const pending of this.#pendingEventRequests.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error(reason));
    }
    this.#pendingEventRequests.clear();
  }

  #writeRequest(payload: Record<string, unknown>): void {
    if (!this.#child?.stdin.writable) {
      throw new Error("tsserver stdin is not writable");
    }
    this.#child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  #request(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
  ): { seq: number; response: Promise<TsServerResponseMessage> } {
    const seq = this.#nextRequestSeq++;
    const response = new Promise<TsServerResponseMessage>((resolvePromise, rejectPromise) => {
      const timeoutHandle = setTimeout(() => {
        this.#pendingResponses.delete(seq);
        rejectPromise(new Error(`tsserver request timed out: ${command}`));
      }, timeoutMs);

      this.#pendingResponses.set(seq, {
        resolve: resolvePromise,
        reject: rejectPromise,
        timeoutHandle,
      });
    });

    this.#writeRequest({
      seq,
      type: "request",
      command,
      arguments: args,
    });

    return { seq, response };
  }

  #requestWithCompletion(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
  ): { seq: number; response: Promise<TsServerRequestCompletedEventMessage> } {
    const seq = this.#nextRequestSeq++;
    const response = new Promise<TsServerRequestCompletedEventMessage>(
      (resolvePromise, rejectPromise) => {
        const timeoutHandle = setTimeout(() => {
          this.#pendingEventRequests.delete(seq);
          rejectPromise(new Error(`tsserver event request timed out: ${command}`));
        }, timeoutMs);

        this.#pendingEventRequests.set(seq, {
          command,
          requestSeq: seq,
          resolve: resolvePromise,
          reject: rejectPromise,
          timeoutHandle,
        });
      },
    );

    this.#writeRequest({
      seq,
      type: "request",
      command,
      arguments: args,
    });

    return { seq, response };
  }

  #notify(command: string, args: Record<string, unknown>): void {
    const seq = this.#nextRequestSeq++;
    this.#writeRequest({
      seq,
      type: "request",
      command,
      arguments: args,
    });
  }

  #synchronizeOpenFiles(projectFiles: readonly string[]): Promise<void> {
    const desired = new Set(projectFiles);
    const toClose = [...this.#openedFiles].filter((filePath) => !desired.has(filePath));
    const toOpen = projectFiles.filter((filePath) => !this.#openedFiles.has(filePath));

    for (const filePath of toClose) {
      this.#notify("close", { file: filePath });
      this.#openedFiles.delete(filePath);
    }

    for (const filePath of toOpen) {
      this.#notify("open", {
        file: filePath,
        projectRootPath: this.#repoRoot,
      });
      this.#openedFiles.add(filePath);
    }

    return Promise.resolve();
  }

  #handleEvent(message: TsServerEventMessage): void {
    if (isTsServerRequestCompletedEventMessage(message)) {
      const pending = this.#pendingEventRequests.get(message.body.request_seq);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timeoutHandle);
      this.#pendingEventRequests.delete(message.body.request_seq);
      pending.resolve(message);
      return;
    }

    if (!this.#collectingProjectDiagnostics) {
      return;
    }

    if (message.event === "configFileDiag") {
      this.#collectConfigDiagnostics(message.body);
      return;
    }
    if (
      message.event === "semanticDiag" ||
      message.event === "syntaxDiag" ||
      message.event === "suggestionDiag"
    ) {
      this.#collectFileDiagnostics(message.body);
    }
  }

  async #collectDiagnostics(input: {
    command: "geterr" | "geterrForProject";
    args: Record<string, unknown>;
    openFiles: readonly string[];
    trackedFiles: readonly string[];
    timeoutMs: number;
  }): Promise<void> {
    this.#collectingProjectDiagnostics = true;
    this.#projectDiagnostics.clear();
    this.#projectDiagnosticFiles = new Set(input.trackedFiles);
    await this.#synchronizeOpenFiles(input.openFiles);

    try {
      const { response } = this.#requestWithCompletion(input.command, input.args, input.timeoutMs);
      await response;
    } finally {
      this.#collectingProjectDiagnostics = false;
      this.#projectDiagnosticFiles.clear();
    }
  }

  #collectFileDiagnostics(body: unknown): void {
    if (!isRecord(body) || typeof body.file !== "string" || !Array.isArray(body.diagnostics)) {
      return;
    }
    if (!this.#projectDiagnosticFiles.has(body.file)) {
      return;
    }
    this.#addDiagnostics(body.diagnostics, body.file, "event");
  }

  #collectConfigDiagnostics(body: unknown): void {
    if (
      !isRecord(body) ||
      typeof body.configFile !== "string" ||
      !Array.isArray(body.diagnostics)
    ) {
      return;
    }
    this.#projectDiagnosticFiles.add(body.configFile);
    for (const rawDiagnostic of body.diagnostics) {
      if (!isRecord(rawDiagnostic)) {
        continue;
      }
      const filePath =
        typeof rawDiagnostic.fileName === "string" ? rawDiagnostic.fileName : body.configFile;
      this.#addDiagnostics([rawDiagnostic], filePath, "config");
    }
  }

  #addDiagnostics(rawDiagnostics: readonly unknown[], filePath: string, origin: string): void {
    for (const rawDiagnostic of rawDiagnostics) {
      const summary = summarizeProtocolDiagnostic(rawDiagnostic, filePath);
      if (!summary) {
        continue;
      }
      const key = `${origin}|${summary.file}|${summary.location}|${summary.code}|${summary.text}`;
      this.#projectDiagnostics.set(key, summary);
    }
  }
}
