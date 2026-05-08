import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dedent from "dedent";

import type { CompatCommand, CompatResultForCommand, CompatSuccessForCommand } from "./compat-cli";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const compatCLI = path.join(__dirname, "compat-cli.ts");
const compatCoverageFile = process.env.AERIO_RUNTIME_COMPAT_COVERAGE_FILE;

export const js = (strings: TemplateStringsArray, ...values: (string | number)[]) =>
  dedent(String.raw({ raw: strings }, ...values));

export interface CompatOptions {
  readonly stdin?: string;
  readonly useDist?: boolean;
}

export const runNode6 = <Result = unknown>(source: string, options: CompatOptions = {}) =>
  runCompat<"node6", Result>("node6", source, options);

export const runQuickJS = <Result = unknown>(source: string, options: CompatOptions = {}) =>
  Promise.all([
    runCompat<"quickjs", Result>("quickjs", source, options),
    runCompat<"quickjs-ng", Result>("quickjs-ng", source, options),
  ]);

export const runCompat = async <Command extends CompatCommand, Result = unknown>(
  command: Command,
  source?: string,
  options?: CompatOptions,
): Promise<Omit<CompatSuccessForCommand<Command, Result>, "ok">> => {
  const { stdin, useDist } = options ?? {};
  const collectCoverage = typeof compatCoverageFile === "string";

  if (command === "node6" && source) {
    const full = dedent`
      const __compat = {
        setResult(value) { global.__compatResult = value; },
      };
      ${source}
    `;

    const result = await runCompatCLI<Command, Result>(command, {
      collectCoverage,
      inlineSource: full,
      ...(typeof stdin === "string" ? { inlineStdin: stdin } : {}),
      ...(typeof useDist === "boolean" ? { useDist } : {}),
    });
    recordCompatCoverage(result);
    return result;
  }

  if (command === "quickjs" || command === "quickjs-ng") {
    if (!source) throw new Error(`runCompat("${command}") requires a source script`);

    const full = dedent`
      const __compat = {
        setResult(value) { globalThis.__compatResult = value; },
      };
      ${source}
    `;

    const result = await runCompatCLI<Command, Result>(command, {
      collectCoverage,
      inlineSource: full,
      ...(typeof stdin === "string" ? { inlineStdin: stdin } : {}),
      ...(typeof useDist === "boolean" ? { useDist } : {}),
    });
    recordCompatCoverage(result);
    return result;
  }

  const result = await runCompatCLI<Command, Result>(command, {
    collectCoverage,
    ...(useDist !== undefined ? { useDist } : {}),
  });
  recordCompatCoverage(result);
  return result;
};

export interface CompatCLIOptions {
  readonly collectCoverage?: boolean;
  readonly inlineStdin?: string;
  readonly inlineSource?: string;
  readonly useDist?: boolean;
}

const serializeCompatCLIOptions = (options: CompatCLIOptions = {}): string[] => {
  const args: string[] = [];

  if (options.collectCoverage) args.push("--coverage");
  if (typeof options.inlineSource === "string")
    args.push("--inline-source-b64", Buffer.from(options.inlineSource, "utf8").toString("base64"));
  if (typeof options.inlineStdin === "string")
    args.push("--inline-stdin-b64", Buffer.from(options.inlineStdin, "utf8").toString("base64"));
  if (options.useDist) args.push("--use-dist");

  return args;
};

export const runCompatCLI = async <Command extends CompatCommand, Result = unknown>(
  command: Command,
  options: CompatCLIOptions = {},
): Promise<Omit<CompatSuccessForCommand<Command, Result>, "ok">> => {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      [compatCLI, command, ...serializeCompatCLIOptions(options)],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      },
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });
  const result = JSON.parse(stdout.trim()) as CompatResultForCommand<Command, Result>;
  if (!result.ok) {
    const error = new Error(result.error.message);
    error.name = result.error.name;
    if (result.error.stack) error.stack = result.error.stack;
    throw error;
  }
  return result;
};

const recordCompatCoverage = (result: unknown) => {
  if (!compatCoverageFile || typeof result !== "object" || result === null) return;

  const coverage = (result as { coverage?: unknown }).coverage;
  if (typeof coverage === "undefined") return;

  appendFileSync(compatCoverageFile, `${JSON.stringify(coverage)}\n`, "utf8");
  delete (result as { coverage?: unknown }).coverage;
};
