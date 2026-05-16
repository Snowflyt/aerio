export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerSink {
  debug?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
}

export interface BridgeLogger {
  child(scope: string): BridgeLogger;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

interface CreateBridgeLoggerOptions {
  component: string;
  minimumLevel?: LogLevel;
  sink?: LoggerSink;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

class SimpleBridgeLogger implements BridgeLogger {
  readonly #component: string;
  readonly #minimumLevel: LogLevel;
  readonly #sink: LoggerSink;

  constructor(component: string, minimumLevel: LogLevel, sink: LoggerSink) {
    this.#component = component;
    this.#minimumLevel = minimumLevel;
    this.#sink = sink;
  }

  child(scope: string): BridgeLogger {
    return new SimpleBridgeLogger(`${this.#component}.${scope}`, this.#minimumLevel, this.#sink);
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    this.#write("debug", message, fields);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.#write("info", message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.#write("warn", message, fields);
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.#write("error", message, fields);
  }

  #write(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.#minimumLevel]) {
      return;
    }

    const sinkMethod =
      (level === "debug" ? this.#sink.debug : undefined) ||
      (level === "info" ? this.#sink.info : undefined) ||
      (level === "warn" ? this.#sink.warn : undefined) ||
      (level === "error" ? this.#sink.error : undefined) ||
      this.#sink.log ||
      console.log;

    const parts = [
      `[${new Date().toISOString()}]`,
      level.toUpperCase(),
      `[${this.#component}]`,
      message,
    ];

    if (fields && Object.keys(fields).length > 0) {
      sinkMethod(parts.join(" "), JSON.stringify(fields));
      return;
    }

    sinkMethod(parts.join(" "));
  }
}

export function createBridgeLogger(options: CreateBridgeLoggerOptions): BridgeLogger {
  return new SimpleBridgeLogger(
    options.component,
    options.minimumLevel ?? "info",
    options.sink ?? console,
  );
}
