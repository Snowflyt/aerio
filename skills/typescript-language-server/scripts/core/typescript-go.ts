import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

import type { TypeScriptLanguageServerBackend } from "./backend.ts";
import { UnsupportedBackendCommandError, createEmptyBackendObservability } from "./backend.ts";
import type { UnknownRecord } from "./common.ts";
import { normalizeText } from "./common.ts";
import type { CheckResult, DiagnosticSummary } from "./contracts/index.ts";
import type { BridgeLogger } from "./logger.ts";
import { ensureManagedTypeScriptGoInstall } from "./runtime/typescript-go.ts";
import type { TextDocumentPosition, TextDocumentRange } from "./text-document.ts";
import {
  documentUriToFilePath,
  extractIdentifierAt,
  extractIdentifierSpanAt,
  filePathToDocumentUri,
  getLineText,
  guessLanguageId,
  lineOffsetFromPosition,
  positionFromLineOffset,
  rangeToLineOffsetSpan,
} from "./text-document.ts";

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface PendingResponse {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

interface ManagedDocument {
  version: number;
  text: string;
}

class JsonRpcError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export const TYPESCRIPT_GO_SOURCE_REFACTOR_NAME = "typescript-go.source-actions";

export class TypeScriptGoProtocolClient implements TypeScriptLanguageServerBackend {
  readonly #repoRoot: string;
  readonly #logger: BridgeLogger;

  #child: ChildProcessWithoutNullStreams | null = null;
  #buffer = Buffer.alloc(0);
  #nextRequestId = 1;
  #pendingResponses = new Map<number | string, PendingResponse>();
  #documents = new Map<string, ManagedDocument>();
  #workspaceFolders: { uri: string; name: string }[];

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#repoRoot = repoRoot;
    this.#logger = logger;
    this.#workspaceFolders = [
      {
        uri: filePathToDocumentUri(repoRoot),
        name: basename(repoRoot) || "workspace",
      },
    ];
  }

  get kind() {
    return "typescript-go" as const;
  }

  get serverPid(): number {
    return this.#child?.pid ?? 0;
  }

  get openedFileCount(): number {
    return this.#documents.size;
  }

  getObservability() {
    return createEmptyBackendObservability();
  }

  async start(): Promise<void> {
    if (this.#child) {
      return;
    }

    const install = await ensureManagedTypeScriptGoInstall(
      this.#repoRoot,
      this.#logger.child("install"),
    );
    const child = spawn(install.executablePath, ["--lsp", "--stdio"], {
      cwd: this.#repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      this.#onStdoutChunk(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk).trim();
      if (text) {
        this.#logger.warn("typescript-go stderr", { text });
      }
    });
    child.once("error", (error) => {
      this.#child = null;
      this.#documents.clear();
      this.#failPending(`typescript-go start failed: ${error.message}`);
    });
    child.once("exit", (code, signal) => {
      this.#child = null;
      this.#documents.clear();
      this.#logger.warn("typescript-go exited", { code, signal });
      this.#failPending(`typescript-go exited code=${code ?? "null"} signal=${signal ?? "null"}`);
    });

    this.#child = child;

    try {
      await this.#request(
        "initialize",
        {
          processId: process.pid,
          clientInfo: {
            name: "aerio-typescript-language-server-skill",
          },
          rootUri: filePathToDocumentUri(this.#repoRoot),
          workspaceFolders: this.#workspaceFolders,
          capabilities: {
            workspace: {
              workspaceFolders: true,
              configuration: true,
            },
            textDocument: {
              definition: {
                linkSupport: true,
              },
              typeDefinition: {
                linkSupport: true,
              },
              implementation: {
                linkSupport: true,
              },
              rename: {
                prepareSupport: true,
              },
            },
          },
        },
        30_000,
      );
      this.#notify("initialized", {});
      this.#logger.info("started typescript-go language server", {
        executablePath: install.executablePath,
        pid: child.pid,
        version: install.version,
      });
    } catch (error: unknown) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.#child) {
      return;
    }

    const child = this.#child;
    try {
      await this.#request("shutdown", null, 5_000);
    } catch {
      // Ignore shutdown failures and continue with best-effort exit.
    }

    if (child.stdin.writable) {
      const payload = JSON.stringify({
        jsonrpc: "2.0",
        method: "exit",
      });
      child.stdin.write(`Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`);
    }

    await new Promise<void>((resolvePromise) => {
      const timer = setTimeout(() => {
        child.kill();
      }, 2_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolvePromise();
      });
    });

    this.#child = null;
    this.#documents.clear();
    this.#failPending("typescript-go stopped");
  }

  async runCheck(projectFiles: readonly string[], timeoutMs: number): Promise<CheckResult> {
    const files = [...new Set(projectFiles.filter((filePath) => existsSync(filePath)))];
    return this.#collectDiagnostics(files, timeoutMs);
  }

  async runFocusedCheck(files: readonly string[], timeoutMs: number): Promise<CheckResult> {
    const targetFiles = [...new Set(files.filter((filePath) => existsSync(filePath)))];
    return this.#collectDiagnostics(targetFiles, timeoutMs);
  }

  async execute(
    command: string,
    args: Record<string, unknown>,
    timeoutMs: number,
    openFiles: readonly string[],
  ): Promise<unknown> {
    await this.start();
    await this.#synchronizeOpenFiles(openFiles);

    switch (command) {
      case "quickinfo":
        return this.#executeQuickInfo(args, timeoutMs);
      case "definitionAndBoundSpan":
        return this.#executeDefinition(args, timeoutMs);
      case "typeDefinition":
        return this.#executeTypeDefinition(args, timeoutMs);
      case "implementation":
        return this.#executeImplementation(args, timeoutMs);
      case "references":
        return this.#executeReferences(args, timeoutMs);
      case "rename":
        return this.#executeRename(args, timeoutMs);
      case "getApplicableRefactors":
        return this.#executeApplicableRefactors(args, timeoutMs);
      case "getEditsForRefactor":
        return this.#executeRefactorEdits(args, timeoutMs);
      default:
        throw new UnsupportedBackendCommandError(this.kind, command);
    }
  }

  async #collectDiagnostics(files: readonly string[], timeoutMs: number): Promise<CheckResult> {
    if (files.length === 0) {
      return {
        errorCount: 0,
        warningCount: 0,
        suggestionCount: 0,
        diagnostics: [],
      };
    }

    const remaining = new Set(files);
    const diagnosticsByKey = new Map<string, DiagnosticSummary>();

    while (remaining.size > 0) {
      const nextFile = remaining.values().next().value;
      if (!nextFile) {
        break;
      }

      await this.#synchronizeOpenFiles([nextFile]);
      const reports = await this.#requestDiagnostics(nextFile, timeoutMs);
      remaining.delete(nextFile);

      for (const [filePath, diagnostics] of reports.entries()) {
        remaining.delete(filePath);
        for (const diagnostic of diagnostics) {
          diagnosticsByKey.set(
            `${diagnostic.category}|${diagnostic.file}|${diagnostic.location}|${diagnostic.code}|${diagnostic.text}`,
            diagnostic,
          );
        }
      }
    }

    const diagnostics = [...diagnosticsByKey.values()].toSorted(compareDiagnostics);
    let errorCount = 0;
    let warningCount = 0;
    let suggestionCount = 0;

    for (const diagnostic of diagnostics) {
      if (diagnostic.category === "error") {
        errorCount += 1;
        continue;
      }
      if (diagnostic.category === "warning") {
        warningCount += 1;
        continue;
      }
      suggestionCount += 1;
    }

    return {
      errorCount,
      warningCount,
      suggestionCount,
      diagnostics,
    };
  }

  async #executeQuickInfo(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const hover = await this.#request(
      "textDocument/hover",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position: positionFromLineOffset(text, location.line, location.offset),
      },
      timeoutMs,
    );

    const hoverRecord = isRecord(hover) ? hover : {};
    const range =
      isRangeRecord(hoverRecord.range) ?
        hoverRecord.range
      : identifierSpanToRange(text, location.line, location.offset);
    const span = rangeToLineOffsetSpan(text, range);
    const content = extractHoverDisplayParts(hoverRecord.contents);

    return {
      start: span.start,
      end: span.end,
      kind: "",
      kindModifiers: "",
      displayString: content.displayString,
      documentation: content.documentation,
      tags: [],
      canIncreaseVerbosityLevel: false,
    };
  }

  async #executeDefinition(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const response = await this.#request(
      "textDocument/definition",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position: positionFromLineOffset(text, location.line, location.offset),
      },
      timeoutMs,
    );

    const locationLinks = normalizeLocationLinks(response);
    const locations = locationLinks.map((entry) =>
      this.#summarizeLocation(entry.targetUri, entry.targetRange),
    );
    const originRange =
      locationLinks[0]?.originSelectionRange ||
      identifierSpanToRange(text, location.line, location.offset);

    return {
      textSpan: rangeToLineOffsetSpan(text, originRange),
      definitions: locations,
    };
  }

  async #executeTypeDefinition(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<readonly Record<string, unknown>[]> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const position = positionFromLineOffset(text, location.line, location.offset);
    const response = await this.#request(
      "textDocument/typeDefinition",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position,
      },
      timeoutMs,
    );

    const locations = normalizeLocationLinks(response).map((entry) =>
      this.#summarizeLocation(entry.targetUri, entry.targetRange),
    );
    if (locations.length > 0) {
      return locations;
    }

    const hover = await this.#request(
      "textDocument/hover",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position,
      },
      timeoutMs,
    );
    const hoverDisplay = extractHoverDisplayParts(isRecord(hover) ? hover.contents : undefined);
    if (!looksLikeTypeSymbol(hoverDisplay.displayString)) {
      return [];
    }

    const definitionResponse = await this.#request(
      "textDocument/definition",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position,
      },
      timeoutMs,
    );
    return normalizeLocationLinks(definitionResponse).map((entry) =>
      this.#summarizeLocation(entry.targetUri, entry.targetRange),
    );
  }

  async #executeImplementation(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<readonly Record<string, unknown>[]> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const response = await this.#request(
      "textDocument/implementation",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position: positionFromLineOffset(text, location.line, location.offset),
      },
      timeoutMs,
    );

    return normalizeLocationLinks(response).map((entry) =>
      this.#summarizeLocation(entry.targetUri, entry.targetRange),
    );
  }

  async #executeReferences(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const position = positionFromLineOffset(text, location.line, location.offset);

    const [referencesResponse, definitionResponse, hoverResponse] = await Promise.all([
      this.#request(
        "textDocument/references",
        {
          textDocument: {
            uri: filePathToDocumentUri(location.filePath),
          },
          position,
          context: {
            includeDeclaration: true,
          },
        },
        timeoutMs,
      ),
      this.#request(
        "textDocument/definition",
        {
          textDocument: {
            uri: filePathToDocumentUri(location.filePath),
          },
          position,
        },
        timeoutMs,
      ),
      this.#request(
        "textDocument/hover",
        {
          textDocument: {
            uri: filePathToDocumentUri(location.filePath),
          },
          position,
        },
        timeoutMs,
      ),
    ]);

    const definitionKeys = new Set(
      normalizeLocationLinks(definitionResponse).map((entry) => {
        const targetRangeKey = JSON.stringify(entry.targetRange);
        return [documentUriToFilePath(entry.targetUri), targetRangeKey].join("|");
      }),
    );
    const symbolName = extractIdentifierAt(text, location.line, location.offset);
    const hoverDisplay = extractHoverDisplayParts(
      isRecord(hoverResponse) ? hoverResponse.contents : undefined,
    );

    return {
      symbolName,
      symbolDisplayString: hoverDisplay.displayString,
      refs:
        Array.isArray(referencesResponse) ?
          referencesResponse.flatMap((entry) => {
            if (!isRecord(entry) || typeof entry.uri !== "string" || !isRangeRecord(entry.range)) {
              return [];
            }
            const reference = this.#summarizeLocation(entry.uri, entry.range);
            const rangeKey = JSON.stringify(entry.range);
            return [
              {
                ...reference,
                isDefinition: definitionKeys.has([reference.file, rangeKey].join("|")),
                isWriteAccess: false,
              },
            ];
          })
        : [],
    };
  }

  async #executeRename(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const location = this.#parseLocationArgs(args);
    const text = this.#getDocumentText(location.filePath);
    const position = positionFromLineOffset(text, location.line, location.offset);
    const placeholderToken = `__aerio_typescript_go_symbol_${Date.now()}__`;

    let prepareResult: unknown;
    try {
      prepareResult = await this.#request(
        "textDocument/prepareRename",
        {
          textDocument: {
            uri: filePathToDocumentUri(location.filePath),
          },
          position,
        },
        timeoutMs,
      );
    } catch (error: unknown) {
      if (error instanceof JsonRpcError) {
        return {
          info: {
            canRename: false,
            localizedErrorMessage: error.message,
          },
          locs: [],
        };
      }
      throw error;
    }

    const renameRange = extractPrepareRenameRange(
      prepareResult,
      text,
      location.line,
      location.offset,
    );
    if (!renameRange) {
      return {
        info: {
          canRename: false,
          localizedErrorMessage: "typescript-go reported that the symbol cannot be renamed",
        },
        locs: [],
      };
    }

    const placeholder =
      extractPrepareRenamePlaceholder(prepareResult) ||
      extractIdentifierAt(text, location.line, location.offset);
    const hover = await this.#request(
      "textDocument/hover",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position,
      },
      timeoutMs,
    );
    const hoverDisplay = extractHoverDisplayParts(isRecord(hover) ? hover.contents : undefined);
    const edit = await this.#request(
      "textDocument/rename",
      {
        textDocument: {
          uri: filePathToDocumentUri(location.filePath),
        },
        position,
        newName: placeholderToken,
      },
      timeoutMs,
    );

    const renameFile = findRenameFileTarget(edit);
    const groups = collectWorkspaceEditTextChanges(edit).map((group) => ({
      file: group.file,
      locs: group.edits.map((entry) => {
        const markerIndex = entry.newText.indexOf(placeholderToken);
        return {
          start: entry.start,
          end: entry.end,
          prefixText: markerIndex >= 0 ? entry.newText.slice(0, markerIndex) : "",
          suffixText:
            markerIndex >= 0 ? entry.newText.slice(markerIndex + placeholderToken.length) : "",
          newText: entry.newText,
          placeholderText: placeholderToken,
        };
      }),
    }));

    return {
      info: {
        canRename: true,
        displayName: placeholder,
        fullDisplayName: hoverDisplay.displayString || placeholder,
        ...(renameFile ? { fileToRename: renameFile } : {}),
        triggerSpan: rangeToLineOffsetSpan(text, renameRange),
      },
      locs: groups,
    };
  }

  async #executeApplicableRefactors(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<readonly Record<string, unknown>[]> {
    const codeActions = await this.#requestSupportedSourceActions(args, timeoutMs);
    if (codeActions.length === 0) {
      return [];
    }

    return [
      {
        name: TYPESCRIPT_GO_SOURCE_REFACTOR_NAME,
        description: "Source Actions (typescript-go)",
        actions: codeActions.map((action) => ({
          name: typeof action.kind === "string" ? action.kind : "",
          description: typeof action.title === "string" ? action.title : "Source Action",
          kind: typeof action.kind === "string" ? action.kind : undefined,
          isInteractive: false,
        })),
      },
    ];
  }

  async #executeRefactorEdits(
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const refactor = typeof args.refactor === "string" ? args.refactor : "";
    const action = typeof args.action === "string" ? args.action : "";
    if (refactor !== TYPESCRIPT_GO_SOURCE_REFACTOR_NAME || !action) {
      throw new UnsupportedBackendCommandError(
        this.kind,
        "getEditsForRefactor",
        `typescript-go does not support refactor ${refactor || "<empty>"} / ${action || "<empty>"}`,
      );
    }

    const codeActions = await this.#requestSupportedSourceActions(args, timeoutMs, [action]);
    const matched = codeActions.find((entry) => entry.kind === action);
    if (!matched) {
      return {
        notApplicableReason: `typescript-go did not return source action ${action}`,
        edits: [],
      };
    }

    const resolved = await this.#resolveCodeActionIfNeeded(matched, timeoutMs);
    if (!isRecord(resolved) || !("edit" in resolved)) {
      return {
        notApplicableReason: `typescript-go returned source action ${action} without edits`,
        edits: [],
      };
    }

    return {
      edits: workspaceEditToTsServerEdits(resolved.edit),
    };
  }

  async #requestDiagnostics(
    filePath: string,
    timeoutMs: number,
  ): Promise<Map<string, DiagnosticSummary[]>> {
    const response = await this.#request(
      "textDocument/diagnostic",
      {
        textDocument: {
          uri: filePathToDocumentUri(filePath),
        },
      },
      timeoutMs,
    );

    const reports = new Map<string, DiagnosticSummary[]>();
    const mainReport = isRecord(response) ? response : {};
    reports.set(filePath, this.#diagnosticsFromReport(filePath, mainReport));

    if (isRecord(mainReport.relatedDocuments)) {
      for (const [uri, report] of Object.entries(mainReport.relatedDocuments)) {
        if (typeof uri !== "string") {
          continue;
        }
        const relatedFilePath = documentUriToFilePath(uri);
        reports.set(relatedFilePath, this.#diagnosticsFromReport(relatedFilePath, report));
      }
    }

    return reports;
  }

  #diagnosticsFromReport(filePath: string, report: unknown): DiagnosticSummary[] {
    if (!isRecord(report) || !Array.isArray(report.items)) {
      return [];
    }

    const text = this.#getFileText(filePath);
    return report.items.flatMap((entry) => {
      if (!isRecord(entry) || !isRangeRecord(entry.range) || typeof entry.message !== "string") {
        return [];
      }
      const location = lineOffsetFromPosition(text, entry.range.start);
      return [
        {
          category: diagnosticSeverityToCategory(entry.severity),
          code: diagnosticCodeToNumber(entry.code),
          file: filePath,
          location: `${location.line}:${location.offset}`,
          source: typeof entry.source === "string" ? entry.source : "typescript-go",
          text: normalizeText(entry.message),
        },
      ];
    });
  }

  #synchronizeOpenFiles(openFiles: readonly string[]): Promise<void> {
    const desired = new Set(openFiles);
    const toClose = [...this.#documents.keys()].filter((filePath) => !desired.has(filePath));
    const toOpenOrUpdate = [...desired];

    for (const filePath of toClose) {
      this.#notify("textDocument/didClose", {
        textDocument: {
          uri: filePathToDocumentUri(filePath),
        },
      });
      this.#documents.delete(filePath);
    }

    for (const filePath of toOpenOrUpdate) {
      const nextText = this.#getFileText(filePath);
      const existing = this.#documents.get(filePath);
      if (!existing) {
        this.#notify("textDocument/didOpen", {
          textDocument: {
            uri: filePathToDocumentUri(filePath),
            languageId: guessLanguageId(filePath),
            version: 1,
            text: nextText,
          },
        });
        this.#documents.set(filePath, { version: 1, text: nextText });

        return Promise.resolve();
      }
      if (existing.text === nextText) {
        continue;
      }
      const nextVersion = existing.version + 1;
      this.#notify("textDocument/didChange", {
        textDocument: {
          uri: filePathToDocumentUri(filePath),
          version: nextVersion,
        },
        contentChanges: [
          {
            text: nextText,
          },
        ],
      });
      this.#documents.set(filePath, { version: nextVersion, text: nextText });
    }

    return Promise.resolve();
  }

  async #request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    if (!this.#child?.stdin.writable) {
      throw new Error("typescript-go stdin is not writable");
    }
    const id = this.#nextRequestId++;
    const response = new Promise<unknown>((resolvePromise, rejectPromise) => {
      const timeoutHandle = setTimeout(() => {
        this.#pendingResponses.delete(id);
        rejectPromise(new Error(`typescript-go request timed out: ${method}`));
      }, timeoutMs);
      this.#pendingResponses.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
        timeoutHandle,
      });
    });

    this.#writeMessage({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    return response;
  }

  #notify(method: string, params: unknown): void {
    this.#writeMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  #writeMessage(message: JsonRpcRequest | JsonRpcNotification): void {
    if (!this.#child?.stdin.writable) {
      throw new Error("typescript-go stdin is not writable");
    }
    const payload = JSON.stringify(message);
    this.#child.stdin.write(
      `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`,
    );
  }

  #onStdoutChunk(chunk: Buffer | string): void {
    const nextChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.#buffer = Buffer.concat([this.#buffer, nextChunk]);

    while (true) {
      const headerEnd = this.#buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.#buffer.toString("utf8", 0, headerEnd);
      const match = /^Content-Length:\s*(\d+)$/im.exec(headerText);
      if (!match) {
        throw new Error("typescript-go message missing Content-Length header");
      }

      const contentLength = Number(match[1]);
      const payloadStart = headerEnd + 4;
      const payloadEnd = payloadStart + contentLength;
      if (this.#buffer.length < payloadEnd) {
        return;
      }

      const payloadText = this.#buffer.toString("utf8", payloadStart, payloadEnd);
      this.#buffer = this.#buffer.subarray(payloadEnd);
      this.#handleMessage(JSON.parse(payloadText) as unknown);
    }
  }

  #handleMessage(message: unknown): void {
    if (!isRecord(message)) {
      return;
    }

    if ("id" in message && "method" in message && typeof message.method === "string") {
      this.#handleServerRequest(message as unknown as JsonRpcRequest);
      return;
    }

    if ("id" in message && ("result" in message || "error" in message)) {
      this.#handleResponse(message as unknown as JsonRpcResponse);
      return;
    }

    if (typeof message.method === "string") {
      this.#handleNotification(message as unknown as JsonRpcNotification);
    }
  }

  #handleServerRequest(message: JsonRpcRequest): void {
    let result: unknown = null;

    if (message.method === "workspace/configuration") {
      const items =
        isRecord(message.params) && Array.isArray(message.params.items) ? message.params.items : [];
      result = items.map(() => null);
    } else if (message.method === "workspace/workspaceFolders") {
      result = this.#workspaceFolders;
    }

    this.#writeMessage({
      jsonrpc: "2.0",
      id: message.id,
      result,
    } as unknown as JsonRpcNotification);
  }

  #handleResponse(message: JsonRpcResponse): void {
    const pending = this.#pendingResponses.get(message.id!);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutHandle);
    this.#pendingResponses.delete(message.id!);
    if (message.error) {
      pending.reject(
        new JsonRpcError(message.error.code, message.error.message, message.error.data),
      );
      return;
    }
    pending.resolve(message.result);
  }

  #handleNotification(message: JsonRpcNotification): void {
    if (message.method === "window/logMessage" && isRecord(message.params)) {
      this.#logger.info("typescript-go log", {
        type: message.params.type,
        message: message.params.message,
      });
    }
  }

  #failPending(reason: string): void {
    for (const pending of this.#pendingResponses.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(new Error(reason));
    }
    this.#pendingResponses.clear();
  }

  #parseLocationArgs(args: Record<string, unknown>): {
    filePath: string;
    line: number;
    offset: number;
  } {
    if (typeof args.file !== "string") {
      throw new Error("typescript-go command is missing a file argument");
    }
    if (typeof args.line !== "number" || typeof args.offset !== "number") {
      throw new Error("typescript-go command is missing a line/offset argument");
    }
    return {
      filePath: args.file,
      line: args.line,
      offset: args.offset,
    };
  }

  #summarizeLocation(uri: string, range: TextDocumentRange): Record<string, unknown> {
    const filePath = documentUriToFilePath(uri);
    const text = this.#getFileText(filePath);
    const span = rangeToLineOffsetSpan(text, range);
    return {
      file: filePath,
      start: span.start,
      end: span.end,
      lineText: normalizeText(getLineText(text, range.start.line)),
    };
  }

  #getDocumentText(filePath: string): string {
    return this.#documents.get(filePath)?.text || this.#getFileText(filePath);
  }

  #getFileText(filePath: string): string {
    return readFileSync(filePath, "utf8");
  }

  async #requestSupportedSourceActions(
    args: Record<string, unknown>,
    timeoutMs: number,
    onlyKinds = ["source.organizeImports", "source.removeUnusedImports", "source.sortImports"],
  ): Promise<UnknownRecord[]> {
    const rangeArgs = this.#parseRangeArgs(args);
    const fileText = this.#getDocumentText(rangeArgs.filePath);
    const range = this.#fullDocumentRange(fileText);
    const response = await this.#request(
      "textDocument/codeAction",
      {
        textDocument: {
          uri: filePathToDocumentUri(rangeArgs.filePath),
        },
        range,
        context: {
          diagnostics: [],
          only: onlyKinds,
        },
      },
      timeoutMs,
    );

    if (!Array.isArray(response)) {
      return [];
    }
    return response.flatMap((entry) => (isRecord(entry) ? [entry] : []));
  }

  async #resolveCodeActionIfNeeded(
    action: UnknownRecord,
    timeoutMs: number,
  ): Promise<UnknownRecord> {
    if ("edit" in action || "command" in action) {
      return action;
    }
    try {
      const resolved = await this.#request("codeAction/resolve", action, timeoutMs);
      return isRecord(resolved) ? resolved : action;
    } catch {
      return action;
    }
  }

  #parseRangeArgs(args: Record<string, unknown>): {
    filePath: string;
    line: number;
    offset: number;
    endLine?: number;
    endOffset?: number;
  } {
    if (typeof args.file !== "string") {
      throw new Error("typescript-go command is missing a file argument");
    }
    const hasStartRange =
      typeof args.startLine === "number" && typeof args.startOffset === "number";
    const line =
      hasStartRange ? args.startLine
      : typeof args.line === "number" ? args.line
      : undefined;
    const offset =
      hasStartRange ? args.startOffset
      : typeof args.offset === "number" ? args.offset
      : undefined;
    if (typeof line !== "number" || typeof offset !== "number") {
      throw new Error("typescript-go command is missing a line/offset argument");
    }
    return {
      filePath: args.file,
      line,
      offset,
      ...(typeof args.endLine === "number" ? { endLine: args.endLine } : {}),
      ...(typeof args.endOffset === "number" ? { endOffset: args.endOffset } : {}),
    };
  }

  #fullDocumentRange(text: string): TextDocumentRange {
    const lines = text.split(/\r?\n/);
    const lastLineIndex = Math.max(0, lines.length - 1);
    const lastLine = lines[lastLineIndex] ?? "";
    return {
      start: {
        line: 0,
        character: 0,
      },
      end: {
        line: lastLineIndex,
        character: lastLine.length,
      },
    };
  }
}

function collectWorkspaceEditTextChanges(edit: unknown): {
  file: string;
  edits: {
    start: { line: number; offset: number };
    end: { line: number; offset: number };
    newText: string;
  }[];
}[] {
  const grouped = new Map<
    string,
    {
      start: { line: number; offset: number };
      end: { line: number; offset: number };
      newText: string;
    }[]
  >();

  if (isRecord(edit) && isRecord(edit.changes)) {
    for (const [uri, rawEdits] of Object.entries(edit.changes)) {
      if (!Array.isArray(rawEdits)) {
        continue;
      }
      const filePath = documentUriToFilePath(uri);
      const fileText = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
      const entries = rawEdits.flatMap((entry) => {
        if (!isRecord(entry) || !isRangeRecord(entry.range) || typeof entry.newText !== "string") {
          return [];
        }
        const span = rangeToLineOffsetSpan(fileText, entry.range);
        return [
          {
            start: span.start,
            end: span.end,
            newText: entry.newText,
          },
        ];
      });
      grouped.set(filePath, entries);
    }
  }

  if (isRecord(edit) && Array.isArray(edit.documentChanges)) {
    for (const change of edit.documentChanges) {
      if (!isRecord(change)) {
        continue;
      }
      if (
        isRecord(change.textDocument) &&
        typeof change.textDocument.uri === "string" &&
        Array.isArray(change.edits)
      ) {
        const filePath = documentUriToFilePath(change.textDocument.uri);
        const fileText = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
        const entries = change.edits.flatMap((entry) => {
          if (
            !isRecord(entry) ||
            !isRangeRecord(entry.range) ||
            typeof entry.newText !== "string"
          ) {
            return [];
          }
          const span = rangeToLineOffsetSpan(fileText, entry.range);
          return [
            {
              start: span.start,
              end: span.end,
              newText: entry.newText,
            },
          ];
        });
        grouped.set(filePath, [...(grouped.get(filePath) || []), ...entries]);
      }
    }
  }

  return [...grouped.entries()]
    .map(([file, edits]) => ({ file, edits }))
    .toSorted((a, b) => a.file.localeCompare(b.file));
}

function findRenameFileTarget(edit: unknown): string | undefined {
  if (!isRecord(edit) || !Array.isArray(edit.documentChanges)) {
    return undefined;
  }

  for (const change of edit.documentChanges) {
    if (isRecord(change) && change.kind === "rename" && typeof change.oldUri === "string") {
      return documentUriToFilePath(change.oldUri);
    }
  }

  return undefined;
}

function workspaceEditToTsServerEdits(edit: unknown): {
  fileName: string;
  isNewFile: boolean;
  textChanges: {
    start: { line: number; offset: number };
    end: { line: number; offset: number };
    newText: string;
  }[];
}[] {
  return collectWorkspaceEditTextChanges(edit).map((entry) => ({
    fileName: entry.file,
    isNewFile: false,
    textChanges: entry.edits.map((change) => ({
      start: change.start,
      end: change.end,
      newText: change.newText,
    })),
  }));
}

function normalizeLocationLinks(response: unknown): {
  targetUri: string;
  targetRange: TextDocumentRange;
  originSelectionRange?: TextDocumentRange;
}[] {
  if (Array.isArray(response)) {
    return response.flatMap((entry) => normalizeLocationLink(entry));
  }
  return normalizeLocationLink(response);
}

function normalizeLocationLink(value: unknown): {
  targetUri: string;
  targetRange: TextDocumentRange;
  originSelectionRange?: TextDocumentRange;
}[] {
  if (!isRecord(value)) {
    return [];
  }

  if (typeof value.targetUri === "string" && isRangeRecord(value.targetRange)) {
    return [
      {
        targetUri: value.targetUri,
        targetRange:
          isRangeRecord(value.targetSelectionRange) ?
            value.targetSelectionRange
          : value.targetRange,
        ...(isRangeRecord(value.originSelectionRange) ?
          { originSelectionRange: value.originSelectionRange }
        : {}),
      },
    ];
  }

  if (typeof value.uri === "string" && isRangeRecord(value.range)) {
    return [
      {
        targetUri: value.uri,
        targetRange: value.range,
      },
    ];
  }

  return [];
}

function extractPrepareRenameRange(
  value: unknown,
  text: string,
  line: number,
  offset: number,
): TextDocumentRange | null {
  if (isRangeRecord(value)) {
    return value;
  }
  if (isRecord(value) && isRangeRecord(value.range)) {
    return value.range;
  }

  const identifierSpan = extractIdentifierSpanAt(text, line, offset);
  if (!identifierSpan) {
    return null;
  }

  return {
    start: {
      line: identifierSpan.start.line - 1,
      character: identifierSpan.start.offset - 1,
    },
    end: {
      line: identifierSpan.end.line - 1,
      character: identifierSpan.end.offset - 1,
    },
  };
}

function extractPrepareRenamePlaceholder(value: unknown): string {
  if (isRecord(value) && typeof value.placeholder === "string") {
    return value.placeholder;
  }
  return "";
}

function identifierSpanToRange(text: string, line: number, offset: number): TextDocumentRange {
  const identifierSpan = extractIdentifierSpanAt(text, line, offset);
  if (!identifierSpan) {
    const position = positionFromLineOffset(text, line, offset);
    return {
      start: position,
      end: position,
    };
  }
  return {
    start: {
      line: identifierSpan.start.line - 1,
      character: identifierSpan.start.offset - 1,
    },
    end: {
      line: identifierSpan.end.line - 1,
      character: identifierSpan.end.offset - 1,
    },
  };
}

function extractHoverDisplayParts(value: unknown): {
  displayString: string;
  documentation: string;
} {
  const parts = flattenHoverParts(value).filter((entry) => entry.length > 0);
  return {
    displayString: parts[0] || "",
    documentation: parts.slice(1).join(" "),
  };
}

function flattenHoverParts(value: unknown): string[] {
  if (typeof value === "string") {
    return [normalizeMarkdownText(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenHoverParts(entry));
  }
  if (isRecord(value) && typeof value.language === "string" && typeof value.value === "string") {
    return [normalizeText(value.value)];
  }
  if (isRecord(value) && typeof value.kind === "string" && typeof value.value === "string") {
    return normalizeMarkdownText(value.value)
      .split(/\n{2,}/)
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function normalizeMarkdownText(value: string): string {
  return normalizeText(
    value.replace(/```[A-Za-z0-9_-]*\n([\s\S]*?)```/g, (_match, codeBlock) => codeBlock),
  );
}

function diagnosticSeverityToCategory(value: unknown): string {
  if (value === 1) {
    return "error";
  }
  if (value === 2) {
    return "warning";
  }
  return "suggestion";
}

function diagnosticCodeToNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value) && typeof value.value === "string") {
    const parsed = Number(value.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

function looksLikeTypeSymbol(displayString: string): boolean {
  if (!displayString) {
    return false;
  }
  return /\b(interface|type|class|enum|namespace)\b/.test(displayString);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isRangeRecord(value: unknown): value is TextDocumentRange {
  return isRecord(value) && isPositionRecord(value.start) && isPositionRecord(value.end);
}

function isPositionRecord(value: unknown): value is TextDocumentPosition {
  return isRecord(value) && typeof value.line === "number" && typeof value.character === "number";
}
