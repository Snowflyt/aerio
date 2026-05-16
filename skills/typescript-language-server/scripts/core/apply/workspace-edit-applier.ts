import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { formatNow, truncatePreview } from "../common.ts";
import type { FileEditSummary } from "../contracts/index.ts";
import { formatLineOffset } from "../query-shared.ts";
import { resolveTypeScriptInstall } from "../runtime/typescript.ts";

interface TextChangeLocation {
  line: number;
  offset: number;
}

interface MaterializedTextChange extends WorkspaceTextChange {
  startIndex: number;
  endIndex: number;
}

interface MaterializedFilePlan {
  file: string;
  isNewFile: boolean;
  changes: readonly MaterializedTextChange[];
  nextText: string;
  summary: FileEditSummary;
}

export interface WorkspaceTextChange {
  file: string;
  isNewFile: boolean;
  start: TextChangeLocation;
  end: TextChangeLocation;
  newText: string;
}

export interface WorkspaceApplyOptions {
  dryRun: boolean;
  createBackup: boolean;
  backupNamespace: string;
}

export interface WorkspaceApplyResult {
  backupDir?: string;
  fileCount: number;
  editCount: number;
  edits: readonly FileEditSummary[];
}

export class WorkspaceEditApplier {
  readonly #repoRoot: string;
  readonly #workspaceRoot: string;

  constructor(repoRoot: string) {
    this.#repoRoot = resolve(repoRoot);
    this.#workspaceRoot = resolveTypeScriptInstall(this.#repoRoot).workspaceRoot;
  }

  applyTextChanges(
    textChanges: readonly WorkspaceTextChange[],
    options: WorkspaceApplyOptions,
  ): WorkspaceApplyResult {
    const plans = this.#materializePlans(textChanges);
    const shouldCreateBackup =
      !options.dryRun && options.createBackup && plans.some((plan) => !plan.isNewFile);
    const backupDir = shouldCreateBackup ? this.#createBackupDir(options.backupNamespace) : "";

    if (!options.dryRun) {
      for (const plan of plans) {
        if (backupDir && !plan.isNewFile && existsSync(plan.file)) {
          this.#backupFile(plan.file, backupDir);
        }
        mkdirSync(dirname(plan.file), { recursive: true });
        writeFileSync(plan.file, plan.nextText, "utf8");
      }
    }

    const edits = plans.map((plan) => plan.summary);
    const result: WorkspaceApplyResult = {
      fileCount: edits.length,
      editCount: edits.reduce((count, file) => count + file.changes.length, 0),
      edits,
    };
    if (backupDir) {
      result.backupDir = backupDir;
    }
    return result;
  }

  #materializePlans(textChanges: readonly WorkspaceTextChange[]): MaterializedFilePlan[] {
    const byFile = new Map<string, WorkspaceTextChange[]>();

    for (const change of textChanges) {
      const resolvedFile = resolve(change.file);
      const existing = byFile.get(resolvedFile) || [];
      existing.push({ ...change, file: resolvedFile });
      byFile.set(resolvedFile, existing);
    }

    return [...byFile.entries()]
      .map(([file, changes]) => this.#buildPlan(file, changes))
      .toSorted((a, b) => a.file.localeCompare(b.file));
  }

  #buildPlan(file: string, changes: readonly WorkspaceTextChange[]): MaterializedFilePlan {
    const isNewFile = changes.every((change) => change.isNewFile) && !existsSync(file);
    const originalText = isNewFile ? "" : readFileSync(file, "utf8");
    const materializedChanges = changes
      .map((change) => ({
        ...change,
        startIndex: this.#lineOffsetToIndex(originalText, change.start.line, change.start.offset),
        endIndex: this.#lineOffsetToIndex(originalText, change.end.line, change.end.offset),
      }))
      .toSorted((a, b) => {
        if (a.startIndex !== b.startIndex) {
          return b.startIndex - a.startIndex;
        }
        return b.endIndex - a.endIndex;
      });

    let nextStartIndex = Number.POSITIVE_INFINITY;
    for (const change of materializedChanges) {
      if (change.startIndex > change.endIndex) {
        throw new Error(`invalid text change span for ${file}`);
      }
      if (change.endIndex > nextStartIndex) {
        throw new Error(`overlapping text changes detected for ${file}`);
      }
      nextStartIndex = change.startIndex;
    }

    let nextText = originalText;
    for (const change of materializedChanges) {
      nextText =
        nextText.slice(0, change.startIndex) + change.newText + nextText.slice(change.endIndex);
    }

    const summary: FileEditSummary = {
      file,
      isNewFile,
      changes: [...materializedChanges]
        .toSorted((a, b) => {
          if (a.startIndex !== b.startIndex) {
            return a.startIndex - b.startIndex;
          }
          return a.endIndex - b.endIndex;
        })
        .map((change) => ({
          start: formatLineOffset(change.start.line, change.start.offset),
          end: formatLineOffset(change.end.line, change.end.offset),
          newTextPreview: truncatePreview(change.newText),
        })),
    };

    return {
      file,
      isNewFile,
      changes: materializedChanges,
      nextText,
      summary,
    };
  }

  #lineOffsetToIndex(text: string, line: number, offset: number): number {
    if (line < 1 || offset < 1) {
      throw new Error(`invalid line/offset ${line}:${offset}`);
    }

    const lineStarts = [0];
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === "\n") {
        lineStarts.push(index + 1);
      }
    }

    if (line > lineStarts.length) {
      throw new Error(`line ${line} is outside file bounds`);
    }

    const lineStart = lineStarts[line - 1];
    if (lineStart == null) {
      throw new Error(`line ${line} is outside file bounds`);
    }
    const lineEnd = line < lineStarts.length ? (lineStarts[line] ?? text.length) : text.length;
    const maxOffset = lineEnd - lineStart + 1;
    if (offset > maxOffset) {
      throw new Error(`offset ${offset} is outside line ${line} bounds`);
    }
    return lineStart + offset - 1;
  }

  #createBackupDir(namespace: string): string {
    const baseRoot = join(this.#workspaceRoot, ".tmp", "typescript-language-server", "backups");
    mkdirSync(baseRoot, { recursive: true });

    const baseName = `${formatNow().replaceAll(":", "-").replaceAll(".", "-")}-${namespace}`;
    for (let index = 0; index < 1000; index += 1) {
      const candidate = join(baseRoot, index === 0 ? baseName : `${baseName}-${index}`);
      if (!existsSync(candidate)) {
        mkdirSync(candidate, { recursive: true });
        return candidate;
      }
    }

    throw new Error("failed to allocate backup directory");
  }

  #backupFile(file: string, backupDir: string): void {
    const backupPath = this.#resolveBackupPath(file, backupDir);
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(file, backupPath);
  }

  #resolveBackupPath(file: string, backupDir: string): string {
    const relativePath = relative(this.#repoRoot, file);
    if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
      return join(backupDir, relativePath);
    }

    const sanitizedPath = file
      .replace(/^[A-Za-z]:/, "")
      .replace(/^[/\\]+/, "")
      .replace(/[\\:]+/g, "/");
    return join(backupDir, "_external", sanitizedPath);
  }
}
