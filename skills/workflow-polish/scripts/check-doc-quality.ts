import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Issue = {
  filePath: string;
  line: number;
  message: string;
};

type ThrowsPhraseException = {
  filePath: string;
  requiredPhrases: readonly string[];
};

const MAX_CONSECUTIVE_LIST_ITEMS = 10;

const THROWS_PHRASE_EXCEPTIONS: readonly ThrowsPhraseException[] = [
  {
    filePath: "src/IO.ts",
    requiredPhrases: [
      "The function `f` is invoked with the provided arguments `args`",
      "- Throws an error: An {@linkcode IO} is created that fails with the thrown error.",
    ],
  },
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");

function relativeFromRepoRoot(filePath: string): string {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function listTopLevelDocs(): string[] {
  const docsDir = path.join(repoRoot, "docs");
  return fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(docsDir, entry.name));
}

function listSkillDocs(): string[] {
  const skillsDir = path.join(repoRoot, "skills");
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name, "SKILL.md"))
    .filter((filePath) => fs.existsSync(filePath));
}

function walkFiles(rootDir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir) {
      continue;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }
      if (entry.isFile() && predicate(entryPath)) {
        results.push(entryPath);
      }
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function checkMarkdownListRuns(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = readText(filePath).split(/\r?\n/u);
  let inFence = false;
  let runStartLine = 0;
  let runLength = 0;
  let runType: "ordered" | "unordered" | null = null;

  const flushRun = (): void => {
    if (runType && runLength > MAX_CONSECUTIVE_LIST_ITEMS) {
      issues.push({
        filePath,
        line: runStartLine,
        message: `has ${runLength} consecutive ${runType} list items; regroup or split the section before it grows past ${MAX_CONSECUTIVE_LIST_ITEMS}`,
      });
    }
    runStartLine = 0;
    runLength = 0;
    runType = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (/^(```|~~~)/u.test(trimmed)) {
      flushRun();
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const unordered = /^\s*[-*+]\s+/u.test(line);
    const ordered = /^\s*\d+\.\s+/u.test(line);
    if (!unordered && !ordered) {
      flushRun();
      continue;
    }

    const nextType = unordered ? "unordered" : "ordered";
    if (runType === nextType) {
      runLength += 1;
      continue;
    }

    flushRun();
    runType = nextType;
    runStartLine = index + 1;
    runLength = 1;
  }

  flushRun();
  return issues;
}

function hasStraightDoubleQuoteOutsideInlineCode(line: string): boolean {
  let inInlineCode = false;
  let backtickRunLength = 0;

  for (const char of line) {
    if (char === "`") {
      backtickRunLength += 1;
      continue;
    }

    if (backtickRunLength > 0) {
      inInlineCode = !inInlineCode;
      backtickRunLength = 0;
    }

    if (!inInlineCode && char === '"') {
      return true;
    }
  }

  return false;
}

function checkMarkdownProseQuotes(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = readText(filePath).split(/\r?\n/u);
  let inFence = false;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (/^(```|~~~)/u.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (inFence || !hasStraightDoubleQuoteOutsideInlineCode(line)) {
      continue;
    }

    issues.push({
      filePath,
      line: index + 1,
      message:
        "uses straight double quotes in Markdown prose; use typographic double quotation marks instead",
    });
  }

  return issues;
}

function normalizeJSDocBlock(rawBlock: string): string {
  return rawBlock
    .replace(/^\/\*\*/u, "")
    .replace(/\*\/$/u, "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\*\s?/u, "").trimEnd())
    .join("\n");
}

function lineNumberAtOffset(sourceText: string, offset: number): number {
  return sourceText.slice(0, offset).split(/\r?\n/u).length;
}

function isAerioImportLine(line: string): boolean {
  return (
    line.startsWith("import ") &&
    (line.endsWith(' from "aerio";') || line.endsWith(" from 'aerio';"))
  );
}

function allowsThrowsPhrase(filePath: string, blockText: string): boolean {
  const relativePath = relativeFromRepoRoot(filePath);

  return THROWS_PHRASE_EXCEPTIONS.some(
    (exception) =>
      exception.filePath === relativePath &&
      exception.requiredPhrases.every((phrase) => blockText.includes(phrase)),
  );
}

function checkJSDocConventions(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const sourceText = readText(filePath);
  const jsdocPattern = /\/\*\*[\s\S]*?\*\//gu;

  for (const match of sourceText.matchAll(jsdocPattern)) {
    const rawBlock = match[0];
    const offset = match.index;
    const line = lineNumberAtOffset(sourceText, offset);
    const blockText = normalizeJSDocBlock(rawBlock);

    if (/@example\b/u.test(blockText)) {
      issues.push({
        filePath,
        line,
        message: "uses `@example`; use explicit `**Example**` blocks instead",
      });
    }

    for (const [index, blockLine] of blockText.split(/\r?\n/u).entries()) {
      if (!isAerioImportLine(blockLine)) {
        continue;
      }

      issues.push({
        filePath,
        line: line + index,
        message:
          'includes `import ... from "aerio"` in JSDoc; examples should assume aerio exports are already in scope',
      });
    }

    if (
      relativeFromRepoRoot(filePath).startsWith("src/core/") &&
      /\bderive[A-Z]\w*\b/u.test(blockText)
    ) {
      issues.push({
        filePath,
        line,
        message:
          "mentions `deriveXxx` inside `src/core/` JSDoc; describe the returned helper directly instead",
      });
    }

    if (
      blockText.includes("Throws an error:") &&
      blockText.includes("{@linkcode IO}") &&
      !allowsThrowsPhrase(filePath, blockText)
    ) {
      issues.push({
        filePath,
        line,
        message:
          "describes an IO failure with `Throws an error`; use `fails with ...` phrasing instead",
      });
    }
  }

  return issues;
}

function collectIssues(): Issue[] {
  const issues: Issue[] = [];
  const markdownFiles = [
    path.join(repoRoot, "AGENTS.md"),
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "CONTRIBUTING.md"),
    ...listTopLevelDocs(),
    ...listSkillDocs(),
  ];

  for (const filePath of markdownFiles) {
    for (const issue of checkMarkdownListRuns(filePath)) issues.push(issue);
    for (const issue of checkMarkdownProseQuotes(filePath)) issues.push(issue);
  }

  const sourceFiles = walkFiles(path.join(repoRoot, "src"), (filePath) => filePath.endsWith(".ts"));
  for (const filePath of sourceFiles) {
    for (const issue of checkJSDocConventions(filePath)) issues.push(issue);
  }

  return issues.sort((left, right) => {
    const fileOrder = left.filePath.localeCompare(right.filePath);
    return fileOrder !== 0 ? fileOrder : left.line - right.line;
  });
}

const issues = collectIssues();
if (issues.length === 0) {
  console.log("workflow_polish=ok");
  process.exit(0);
}

for (const issue of issues) {
  console.error(`${relativeFromRepoRoot(issue.filePath)}:${issue.line}: ${issue.message}`);
}
console.error(`workflow_polish_error_count=${issues.length}`);
process.exit(1);
