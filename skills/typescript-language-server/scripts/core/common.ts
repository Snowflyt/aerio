export interface UnknownRecord {
  [key: string]: unknown;
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function parseJsonValue(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function formatNow(): string {
  return new Date().toISOString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function truncatePreview(text: string, maxLength = 120): string {
  const normalized = normalizeText(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}
