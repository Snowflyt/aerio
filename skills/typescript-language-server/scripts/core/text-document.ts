import { extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface TextDocumentPosition {
  line: number;
  character: number;
}

export interface TextDocumentRange {
  start: TextDocumentPosition;
  end: TextDocumentPosition;
}

export interface LineOffsetLocation {
  line: number;
  offset: number;
}

export function filePathToDocumentUri(filePath: string): string {
  return pathToFileURL(filePath).href;
}

export function documentUriToFilePath(uri: string): string {
  return fileURLToPath(uri);
}

export function guessLanguageId(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  switch (extension) {
    case ".ts":
    case ".mts":
    case ".cts":
      return "typescript";
    case ".tsx":
      return "typescriptreact";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".jsx":
      return "javascriptreact";
    case ".json":
      return "json";
    default:
      return "plaintext";
  }
}

export function positionFromLineOffset(
  text: string,
  line: number,
  offset: number,
): TextDocumentPosition {
  const lineStarts = collectLineStarts(text);
  if (line < 1 || line > lineStarts.length) {
    throw new Error(`line ${line} is outside file bounds`);
  }
  const lineStart = lineStarts[line - 1];
  if (lineStart == null) {
    throw new Error(`line ${line} is outside file bounds`);
  }
  const lineEnd = line < lineStarts.length ? (lineStarts[line] ?? text.length) : text.length;
  const maxOffset = lineEnd - lineStart + 1;
  if (offset < 1 || offset > maxOffset) {
    throw new Error(`offset ${offset} is outside line ${line} bounds`);
  }
  return {
    line: line - 1,
    character: offset - 1,
  };
}

export function lineOffsetFromPosition(
  text: string,
  position: TextDocumentPosition,
): LineOffsetLocation {
  const lineStarts = collectLineStarts(text);
  const zeroBasedLine = position.line;
  if (zeroBasedLine < 0 || zeroBasedLine >= lineStarts.length) {
    throw new Error(`line ${zeroBasedLine + 1} is outside file bounds`);
  }
  const lineStart = lineStarts[zeroBasedLine];
  if (lineStart == null) {
    throw new Error(`line ${zeroBasedLine + 1} is outside file bounds`);
  }
  const nextLineStart =
    zeroBasedLine + 1 < lineStarts.length ?
      (lineStarts[zeroBasedLine + 1] ?? text.length)
    : text.length;
  const maxCharacter = nextLineStart - lineStart;
  const character = Math.max(0, Math.min(position.character, maxCharacter));
  return {
    line: zeroBasedLine + 1,
    offset: character + 1,
  };
}

export function rangeToLineOffsetSpan(
  text: string,
  range: TextDocumentRange,
): { start: LineOffsetLocation; end: LineOffsetLocation } {
  return {
    start: lineOffsetFromPosition(text, range.start),
    end: lineOffsetFromPosition(text, range.end),
  };
}

export function getLineText(text: string, zeroBasedLine: number): string {
  const lines = text.split(/\r?\n/);
  return lines[zeroBasedLine] ?? "";
}

export function extractIdentifierAt(text: string, line: number, offset: number): string {
  const span = extractIdentifierSpanAt(text, line, offset);
  if (!span) {
    return "";
  }
  const startIndex = indexFromLineOffset(text, span.start.line, span.start.offset);
  const endIndex = indexFromLineOffset(text, span.end.line, span.end.offset);
  return text.slice(startIndex, endIndex);
}

export function extractIdentifierSpanAt(
  text: string,
  line: number,
  offset: number,
): { start: LineOffsetLocation; end: LineOffsetLocation } | null {
  const index = indexFromLineOffset(text, line, offset);
  const normalizedIndex =
    index < text.length && isIdentifierCharacter(text[index] || "") ? index
    : index > 0 && isIdentifierCharacter(text[index - 1] || "") ? index - 1
    : -1;
  if (normalizedIndex < 0) {
    return null;
  }

  let startIndex = normalizedIndex;
  while (startIndex > 0 && isIdentifierCharacter(text[startIndex - 1] || "")) {
    startIndex -= 1;
  }

  let endIndex = normalizedIndex + 1;
  while (endIndex < text.length && isIdentifierCharacter(text[endIndex] || "")) {
    endIndex += 1;
  }

  return {
    start: lineOffsetFromIndex(text, startIndex),
    end: lineOffsetFromIndex(text, endIndex),
  };
}

export function lineOffsetFromIndex(text: string, index: number): LineOffsetLocation {
  const clampedIndex = Math.max(0, Math.min(index, text.length));
  const lineStarts = collectLineStarts(text);
  let lineNumber = 1;

  for (let currentLine = 0; currentLine < lineStarts.length; currentLine += 1) {
    const lineStart = lineStarts[currentLine]!;
    const nextLineStart =
      currentLine + 1 < lineStarts.length ?
        (lineStarts[currentLine + 1] ?? text.length)
      : text.length;
    if (clampedIndex >= lineStart && clampedIndex <= nextLineStart) {
      lineNumber = currentLine + 1;
      break;
    }
  }

  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  return {
    line: lineNumber,
    offset: clampedIndex - lineStart + 1,
  };
}

export function indexFromLineOffset(text: string, line: number, offset: number): number {
  return lineOffsetToIndex(text, line, offset);
}

function lineOffsetToIndex(text: string, line: number, offset: number): number {
  const position = positionFromLineOffset(text, line, offset);
  const lineStarts = collectLineStarts(text);
  const lineStart = lineStarts[position.line];
  return (lineStart ?? 0) + position.character;
}

function collectLineStarts(text: string): number[] {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }
  return lineStarts;
}

function isIdentifierCharacter(character: string): boolean {
  return /[A-Za-z0-9_$]/.test(character);
}
