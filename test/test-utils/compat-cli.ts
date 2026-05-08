import type { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import extractZip from "extract-zip";
import * as istanbulInstrument from "istanbul-lib-instrument";
import * as tar from "tar";
import tsBlankSpace from "ts-blank-space";
import { replaceTscAliasPaths } from "tsc-alias";
import * as ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const compatTempRoot = path.join(projectRoot, ".tmp", "runtime-compat");
const distRoot = path.join(projectRoot, "dist");
const distCjsRoot = path.join(distRoot, "cjs");
const sourceRoot = path.join(projectRoot, "src");
const tsconfigBuildPath = path.join(projectRoot, "tsconfig.build.json");
const compatCoverageVariable = "__aerioCompatCoverage__";
const node6LatestDistRoot = "https://nodejs.org/dist/latest-v6.x";
const quickJSBellardDistRoot = "https://bellard.org/quickjs/binary_releases";
const quickJSBellardLatestVersionURL = `${quickJSBellardDistRoot}/LATEST.json`;
const quickJSNGLatestReleaseURL = "https://github.com/quickjs-ng/quickjs/releases/latest";
const quickJSNGDownloadRoot = "https://github.com/quickjs-ng/quickjs/releases/download";
const compatInstallLockRetryMs = 100;
const compatInstallLockTimeoutMs = 300_000;
const compatFetchRetryDelayMs = [0, 500, 1500] as const;

export type Node6Command = "node6" | "node6-probe";
export type QuickJSCommand = "quickjs" | "quickjs-ng";
export type CompatCommand = Node6Command | QuickJSCommand;
export type QuickJSFlavor = "bellard" | "ng";

interface Node6CompatDirContext {
  readonly compatDir: string;
  readonly tempRoot: string;
}

interface QuickJSCompatDirContext {
  readonly compatDir: string;
  readonly tempRoot: string | null;
}

interface InstrumentCompatOptions {
  readonly coverageGlobalScope: string;
  readonly coverageGlobalScopeFunc?: boolean;
  readonly esModules: boolean;
}

interface CompatDirOptions {
  readonly instrumentCoverage?: boolean;
}

interface Node6RuntimeOptions {
  readonly collectCoverage?: boolean;
  readonly stdin?: string;
}

interface QuickJSInlineCaseOptions {
  readonly collectCoverage?: boolean;
  readonly stdin?: string;
}

interface QuickJSRunOptions {
  readonly collectCoverage?: boolean;
  readonly compatDir: string;
  readonly stdin?: string;
  readonly tempRoot: string | null;
}

interface Node6Distribution {
  readonly archiveName: string;
  readonly archiveType: "tar.gz" | "zip";
  readonly binaryRelativePath: string;
  readonly directoryName: string;
  readonly url: string;
}

interface QuickJSDistribution {
  readonly assetName: string;
  readonly assetType: "binary" | "zip";
  readonly binaryRelativePath: string;
  readonly installDirectoryName: string;
  readonly url: string;
}

type InstrumentInputSourceMap = NonNullable<
  Parameters<ReturnType<typeof istanbulInstrument.createInstrumenter>["instrumentSync"]>[2]
>;

interface TranspileOutput {
  readonly code: string;
  readonly sourceMap?: InstrumentInputSourceMap;
}

export interface CompatError {
  readonly message: string;
  readonly name: string;
  readonly stack: string | undefined;
}

export interface CompatFailure {
  readonly error: CompatError;
  readonly ok: false;
}

export interface Node6Probe {
  readonly observedVersion: string;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export interface Node6ProbeCompatSuccess extends Node6Probe {
  readonly ok: true;
}

export interface Node6RuntimeCompatSuccess<Result = unknown> {
  readonly coverage?: unknown;
  readonly ok: true;
  readonly probe: Node6Probe;
  readonly result?: Result;
  readonly stdout: string;
}

export interface QuickJSCompatSuccess<Result = unknown> {
  readonly coverage?: unknown;
  readonly ok: true;
  readonly result?: Result;
  readonly stdout: string;
}

export interface CompatCommandResultMap<Result = unknown> {
  readonly node6: Node6RuntimeCompatSuccess<Result>;
  readonly "node6-probe": Node6ProbeCompatSuccess;
  readonly quickjs: QuickJSCompatSuccess<Result>;
  readonly "quickjs-ng": QuickJSCompatSuccess<Result>;
}

export type CompatSuccess<Result = unknown> =
  Node6RuntimeCompatSuccess<Result> | Node6ProbeCompatSuccess | QuickJSCompatSuccess<Result>;

export type CompatSuccessForCommand<
  Command extends CompatCommand,
  Result = unknown,
> = CompatCommandResultMap<Result>[Command];

export type CompatResult<Result = unknown> = CompatFailure | CompatSuccess<Result>;

export type CompatResultForCommand<Command extends CompatCommand, Result = unknown> =
  CompatFailure | CompatSuccessForCommand<Command, Result>;

const normalizeCompatErrorStack = (
  name: string,
  message: string,
  stack: unknown,
): string | undefined => {
  if (typeof stack !== "string" || stack.length === 0) return undefined;
  if (stack.startsWith(`${name}: ${message}`)) return stack;
  return `${name}: ${message}\n${stack}`;
};

const formatUnknownError = (error: unknown): CompatError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: normalizeCompatErrorStack(error.name, error.message, error.stack),
    };
  }

  if (typeof error === "object" && error !== null) {
    const errorRecord = error as {
      readonly message?: unknown;
      readonly name?: unknown;
      readonly stack?: unknown;
    };
    const message =
      typeof errorRecord.message === "string" ?
        errorRecord.message
      : JSON.stringify(error, null, 2);
    const name = typeof errorRecord.name === "string" ? errorRecord.name : "Error";

    return {
      message,
      name,
      stack: normalizeCompatErrorStack(name, message, errorRecord.stack),
    };
  }

  const fallback = new Error(String(error));
  return {
    message: fallback.message,
    name: fallback.name,
    stack: fallback.stack,
  };
};

interface CompatCLIFlags {
  readonly collectCoverage: boolean;
  readonly command: CompatCommand;
  readonly inlineStdinB64?: string;
  readonly inlineSourceB64?: string;
  readonly useDist?: boolean;
}

const isCompatCommand = (value: string): value is CompatCommand => {
  return (
    value === "node6" || value === "node6-probe" || value === "quickjs" || value === "quickjs-ng"
  );
};

const resolveCompatCommand = (positionals: readonly string[]): CompatCommand => {
  const [command, ...rest] = positionals;

  if (!command) throw new Error("Missing compat command.");
  if (rest.length > 0) {
    throw new Error(`Unexpected extra positional arguments: ${rest.join(" ")}`);
  }
  if (isCompatCommand(command)) return command;

  throw new Error(`Unknown command: ${positionals.join(" ")}`);
};

const readCompatCLIFlags = (args: readonly string[]): CompatCLIFlags => {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      coverage: { type: "boolean" },
      "inline-stdin-b64": { type: "string" },
      "inline-source-b64": { type: "string" },
      "use-dist": { type: "boolean" },
    },
  });

  return {
    collectCoverage: values.coverage === true,
    command: resolveCompatCommand(positionals),
    ...(typeof values["use-dist"] === "boolean" ? { useDist: values["use-dist"] } : {}),
    ...(typeof values["inline-stdin-b64"] === "string" ?
      { inlineStdinB64: values["inline-stdin-b64"] }
    : {}),
    ...(typeof values["inline-source-b64"] === "string" ?
      { inlineSourceB64: values["inline-source-b64"] }
    : {}),
  };
};

const cliFlags = readCompatCLIFlags(process.argv.slice(2));

const readInlineCaseSource = (label: "Node6" | "QuickJS"): string => {
  const encoded = cliFlags.inlineSourceB64;
  if (!encoded) throw new Error(`Missing inline ${label} case source. Pass --inline-source-b64.`);

  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    throw new Error(`Invalid inline ${label} case source encoding.`);
  }
};

const readInlineCaseStdin = (label: "Node6" | "QuickJS"): string | undefined => {
  const encoded = cliFlags.inlineStdinB64;
  if (!encoded) return undefined;

  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    throw new Error(`Invalid inline ${label} case stdin encoding.`);
  }
};

const resolveSourcePath = (relativeJsPath: string): string => {
  const jsPath = path.join(projectRoot, "src", relativeJsPath);
  const tsPath = jsPath.replace(/\.js$/u, ".ts");

  if (existsSync(tsPath)) return tsPath;
  return jsPath;
};

const ensureCompatTempRoot = () => {
  mkdirSync(compatTempRoot, { recursive: true });
};

const ensureExecutable = (filePath: string): void => {
  if (process.platform !== "win32") chmodSync(filePath, 0o755);
};

const makeCompatTempDir = (prefix: string): string => {
  ensureCompatTempRoot();
  return mkdtempSync(path.join(compatTempRoot, `${prefix}-`));
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

const toCompatInstallLockName = (...parts: readonly string[]): string => {
  return parts.join("--").replace(/[^a-zA-Z0-9._-]/gu, "_");
};

const withCompatInstallLock = async <T>(lockName: string, run: () => Promise<T>): Promise<T> => {
  ensureCompatTempRoot();

  const lockPath = path.join(compatTempRoot, `${lockName}.lock`);
  const deadline = Date.now() + compatInstallLockTimeoutMs;

  while (true) {
    try {
      mkdirSync(lockPath);
      break;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new Error(`Timed out waiting for compat install lock at ${lockPath}`, {
          cause: error,
        });

      await sleep(compatInstallLockRetryMs);
    }
  }

  try {
    return await run();
  } finally {
    rmSync(lockPath, { force: true, recursive: true });
  }
};

const ensureInstalledCompatBinary = async (
  binaryPath: string,
  lockName: string,
  install: () => Promise<void>,
): Promise<string> => {
  if (existsSync(binaryPath)) return binaryPath;

  return await withCompatInstallLock(lockName, async () => {
    if (existsSync(binaryPath)) return binaryPath;

    await install();

    if (!existsSync(binaryPath)) {
      throw new Error(`Compat binary not found at ${binaryPath}`);
    }

    return binaryPath;
  });
};

const commonJSCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  checkJs: false,
  module: ts.ModuleKind.CommonJS,
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
  target: ts.ScriptTarget.ES2015,
};

const esModuleCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  checkJs: false,
  module: ts.ModuleKind.ESNext,
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
  target: ts.ScriptTarget.ESNext,
  verbatimModuleSyntax: true,
};

const formatTypescriptDiagnostic = (diagnostic: ts.Diagnostic): string => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (diagnostic.file && typeof diagnostic.start === "number") {
    const { character, line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`;
  }

  return message;
};

const normalizeSourceMap = (
  sourceMapText: string,
  sourceCode: string,
  sourceFilePath: string,
): InstrumentInputSourceMap => {
  const sourceMap = JSON.parse(sourceMapText) as InstrumentInputSourceMap;

  return {
    ...sourceMap,
    sources: [sourceFilePath],
    sourcesContent: [sourceCode],
  };
};

const transpileWithTypescript = (
  sourceCode: string,
  fileName: string,
  compilerOptions: ts.CompilerOptions,
  emitSourceMap = false,
): TranspileOutput => {
  const result = ts.transpileModule(sourceCode, {
    compilerOptions: {
      ...compilerOptions,
      inlineSources: emitSourceMap,
      sourceMap: emitSourceMap,
    },
    fileName,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    throw new Error(
      `TypeScript transpilation failed for ${fileName}\n${errors
        .map((diagnostic) => formatTypescriptDiagnostic(diagnostic))
        .join("\n")}`,
    );
  }

  return {
    code: result.outputText,
    ...(typeof result.sourceMapText === "string" ?
      { sourceMap: normalizeSourceMap(result.sourceMapText, sourceCode, fileName) }
    : {}),
  };
};

const transpileToCommonJS = (
  sourceCode: string,
  fileName: string,
  emitSourceMap = false,
): TranspileOutput => {
  return transpileWithTypescript(sourceCode, fileName, commonJSCompilerOptions, emitSourceMap);
};

const transpileToESModule = (
  sourceCode: string,
  fileName: string,
  emitSourceMap = false,
): TranspileOutput => {
  return transpileWithTypescript(sourceCode, fileName, esModuleCompilerOptions, emitSourceMap);
};

const writeTranspiledOutput = (filePath: string, output: TranspileOutput): void => {
  writeFileSync(filePath, output.code, "utf8");

  if (output.sourceMap) {
    writeFileSync(`${filePath}.map`, JSON.stringify(output.sourceMap), "utf8");
  }
};

const readStoredSourceMap = (filePath: string): InstrumentInputSourceMap | undefined => {
  const sourceMapFile = `${filePath}.map`;
  if (!existsSync(sourceMapFile)) return undefined;

  return JSON.parse(readFileSync(sourceMapFile, "utf8")) as InstrumentInputSourceMap;
};

const resolveCompatOriginalFilePath = (
  compatDir: string,
  sourceDir: string,
  compatFilePath: string,
): string => {
  return path.join(sourceDir, path.relative(compatDir, compatFilePath));
};

const toRelativeImportPath = (fromFile: string, toFile: string): string => {
  const relativePath = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

const resolveCompatModuleFile = (compatDir: string, moduleName: string): string | null => {
  const relativePath =
    moduleName === "aerio" || moduleName === "aerio/" || moduleName === "aerio/index.js" ?
      "index.js"
    : moduleName.startsWith("aerio/") ? moduleName.slice("aerio/".length)
    : null;

  if (!relativePath) return null;

  const candidates = [
    path.join(compatDir, relativePath),
    path.join(compatDir, `${relativePath}.js`),
    path.join(compatDir, relativePath, "index.js"),
  ];

  const resolvedFile = candidates.find((candidate) => existsSync(candidate));
  if (!resolvedFile) {
    throw new Error(`Missing compat module for ${moduleName}`);
  }

  return resolvedFile;
};

const rewriteNode6CompatRequires = (
  sourceCode: string,
  fileName: string,
  runtimeEntryFile: string,
  compatDir: string,
): string => {
  const transpiled = transpileToCommonJS(sourceCode, fileName).code;
  const sourceFile = ts.createSourceFile(
    fileName.replace(/\.[^.]+$/u, ".js"),
    transpiled,
    ts.ScriptTarget.ES2017,
    true,
    ts.ScriptKind.JS,
  );
  const transformResult = ts.transform(sourceFile, [
    (context) => {
      const visit: ts.Visitor = (node) => {
        const visited = ts.visitEachChild(node, visit, context);

        if (
          !ts.isCallExpression(visited) ||
          !ts.isIdentifier(visited.expression) ||
          visited.expression.text !== "require" ||
          visited.arguments.length === 0
        ) {
          return visited;
        }

        const moduleName = visited.arguments[0];
        if (!moduleName || !ts.isStringLiteralLike(moduleName)) return visited;

        const rest = visited.arguments.slice(1);

        const resolvedFile = resolveCompatModuleFile(compatDir, moduleName.text);
        if (!resolvedFile) return visited;

        return ts.factory.updateCallExpression(visited, visited.expression, visited.typeArguments, [
          ts.factory.createStringLiteral(toRelativeImportPath(runtimeEntryFile, resolvedFile)),
          ...rest,
        ]);
      };

      return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    },
  ]);

  try {
    const transformedSourceFile = transformResult.transformed[0]!;

    return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformedSourceFile);
  } finally {
    transformResult.dispose();
  }
};

const buildNode6InlineEntrySource = (
  sourceCode: string,
  runtimeEntryFile: string,
  compatDir: string,
): string => {
  const transpileFile = path.join(path.dirname(runtimeEntryFile), "inline-entry.ts");
  return rewriteNode6CompatRequires(sourceCode, transpileFile, runtimeEntryFile, compatDir);
};

const walkFiles = (rootDir: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      for (const childPath of walkFiles(fullPath)) files.push(childPath);
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const instrumentCompatDir = (rootDir: string, options: InstrumentCompatOptions): void => {
  const instrumenter = istanbulInstrument.createInstrumenter({
    autoWrap: false,
    compact: false,
    coverageGlobalScope: options.coverageGlobalScope,
    coverageGlobalScopeFunc: options.coverageGlobalScopeFunc === true,
    coverageVariable: compatCoverageVariable,
    esModules: options.esModules,
    preserveComments: true,
    produceSourceMap: false,
  });

  for (const file of walkFiles(rootDir)) {
    if (!file.endsWith(".js")) continue;

    const relativePath = path.relative(rootDir, file);
    const sourcePath = resolveSourcePath(relativePath);
    const inputSourceMap = readStoredSourceMap(file);

    if (!existsSync(sourcePath)) continue;

    writeFileSync(
      file,
      instrumenter.instrumentSync(readFileSync(file, "utf8"), sourcePath, inputSourceMap),
      "utf8",
    );
  }
};

const createNode6CompatDir = (
  tempRoot: string,
  sourceDir: string,
  emitSourceMaps = false,
): string => {
  const compatDir = path.join(tempRoot, "dist");

  cpSync(sourceDir, compatDir, { recursive: true });

  for (const file of walkFiles(compatDir)) {
    if (file.endsWith(".d.ts")) {
      rmSync(file);
      continue;
    }

    const sourceFilePath = resolveCompatOriginalFilePath(compatDir, sourceDir, file);

    if (file.endsWith(".ts")) {
      writeTranspiledOutput(
        file.replace(/\.ts$/u, ".js"),
        transpileToCommonJS(readFileSync(file, "utf8"), sourceFilePath, emitSourceMaps),
      );
      rmSync(file);
      continue;
    }

    if (!file.endsWith(".js")) continue;

    writeTranspiledOutput(
      file,
      transpileToCommonJS(readFileSync(file, "utf8"), sourceFilePath, emitSourceMaps),
    );
  }

  writeFileSync(path.join(compatDir, "package.json"), '{\n  "type": "commonjs"\n}\n', "utf8");

  return compatDir;
};

const ensureDistCjs = () => {
  if (!existsSync(path.join(distCjsRoot, "index.js"))) {
    throw new Error("dist/cjs is missing. Run `npm run build` first.");
  }
};

const withNode6CompatDir = <T>(
  run: (context: Node6CompatDirContext) => T,
  options: CompatDirOptions = {},
): T => {
  const tempRoot = makeCompatTempDir("node6-compat");
  const hasDist = existsSync(path.join(distRoot, "index.js"));
  const shouldUseDist = cliFlags.useDist === true;
  const compatDir =
    !options.instrumentCoverage && shouldUseDist ?
      (ensureDistCjs(), distCjsRoot)
    : createNode6CompatDir(
        tempRoot,
        !shouldUseDist || options.instrumentCoverage || !hasDist ? sourceRoot : distRoot,
        options.instrumentCoverage === true,
      );

  if (options.instrumentCoverage)
    instrumentCompatDir(compatDir, {
      coverageGlobalScope: "global",
      coverageGlobalScopeFunc: true,
      esModules: false,
    });

  try {
    return run({ compatDir, tempRoot });
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
};

const createQuickJSCompatDir = async (
  tempRoot: string,
  sourceDir: string,
  emitSourceMaps = false,
): Promise<string> => {
  const compatDir = path.join(tempRoot, "dist");

  cpSync(sourceDir, compatDir, { recursive: true });

  for (const file of walkFiles(compatDir)) {
    if (!file.endsWith(".ts") || file.endsWith(".d.ts")) continue;

    const sourceFilePath = resolveCompatOriginalFilePath(compatDir, sourceDir, file);
    const outputFile = file.replace(/\.ts$/u, ".js");

    if (emitSourceMaps) {
      writeTranspiledOutput(
        outputFile,
        transpileToESModule(readFileSync(file, "utf8"), sourceFilePath, true),
      );
    } else {
      writeFileSync(outputFile, tsBlankSpace(readFileSync(file, "utf8")), "utf8");
    }

    rmSync(file);
  }

  await replaceTscAliasPaths({
    configFile: tsconfigBuildPath,
    outDir: compatDir,
    resolveFullExtension: ".js",
    resolveFullPaths: true,
    verbose: false,
  });

  return compatDir;
};

const withQuickJSCompatDir = async <T>(
  run: (context: QuickJSCompatDirContext) => Promise<T> | T,
  options: CompatDirOptions & {
    readonly useDist?: boolean;
  } = {},
): Promise<T> => {
  const hasDist = existsSync(path.join(distRoot, "index.js"));
  const shouldUseDist = options.useDist === true;

  if (shouldUseDist && !hasDist) {
    throw new Error("dist/index.js is missing. Run `npm run build` first.");
  }

  if (!options.instrumentCoverage && shouldUseDist) {
    return run({ compatDir: distRoot, tempRoot: null });
  }

  const tempRoot = makeCompatTempDir("quickjs-compat");
  const compatDir = await createQuickJSCompatDir(
    tempRoot,
    shouldUseDist ? distRoot : sourceRoot,
    options.instrumentCoverage === true,
  );

  if (options.instrumentCoverage) {
    instrumentCompatDir(compatDir, {
      coverageGlobalScope: "globalThis",
      esModules: true,
    });
  }

  try {
    return await run({ compatDir, tempRoot });
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
};

const runCommand = (
  command: string,
  args: readonly string[],
  options: Omit<SpawnSyncOptionsWithStringEncoding, "encoding"> = {},
): SpawnSyncReturns<string> => {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    ...options,
  });
};

const runPowerShellCommand = (
  script: string,
  options: Omit<SpawnSyncOptionsWithStringEncoding, "encoding"> = {},
): SpawnSyncReturns<string> => {
  const commandArgs = ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script];
  const result = runCommand("powershell.exe", commandArgs, options);
  const error = result.error as NodeJS.ErrnoException | undefined;

  if (error?.code === "ENOENT") return runCommand("pwsh", commandArgs, options);
  return result;
};

const toPowerShellLiteral = (value: string): string => {
  return `'${value.replace(/'/gu, "''")}'`;
};

const extractZipArchive = async (archivePath: string, destinationDir: string): Promise<void> => {
  if (process.platform !== "win32") {
    // Prefer the system `unzip`:
    // Bellard's macOS `qjs` is a Cosmopolitan APE — itself a polyglot zip — and the release stores it DEFLATE-compressed.
    // yauzl 2.10's inflate stream never emits `end` on that entry (verified: a *stored* copy extracts fine, the *deflated* one hangs; pure stream reads hang too), so `extract-zip` hangs forever rather than failing.
    // The OS `unzip` uses the platform zlib and handles it correctly.
    // Fall back to `extract-zip` only when `unzip` is absent (still fine for normal zips).
    const extraction = runCommand("unzip", ["-oq", archivePath, "-d", destinationDir]);
    const error = extraction.error as NodeJS.ErrnoException | undefined;

    if (error?.code === "ENOENT") {
      await extractZip(archivePath, { dir: destinationDir });
      return;
    }

    if (extraction.status !== 0)
      throw new Error(
        `Zip extraction failed with exit code ${extraction.status}\n${extraction.stdout}\n${extraction.stderr}`,
      );
    return;
  }

  const extraction = runPowerShellCommand(
    `$ProgressPreference = 'SilentlyContinue'; Expand-Archive -LiteralPath ${toPowerShellLiteral(archivePath)} -DestinationPath ${toPowerShellLiteral(destinationDir)} -Force`,
  );

  if (extraction.status !== 0)
    throw new Error(
      `Zip extraction failed with exit code ${extraction.status}\n${extraction.stdout}\n${extraction.stderr}`,
    );
};

const moveCompatTree = (sourcePath: string, destinationPath: string): void => {
  try {
    renameSync(sourcePath, destinationPath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (process.platform !== "win32" || nodeError.code !== "EPERM") throw error;

    cpSync(sourcePath, destinationPath, { recursive: true });
    rmSync(sourcePath, { force: true, recursive: true });
  }
};

const withCompatFetchRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (const [attempt, delayMs] of compatFetchRetryDelayMs.entries()) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt === compatFetchRetryDelayMs.length - 1) break;
    }
  }

  throw lastError;
};

const fetchResponse = async (url: string): Promise<Response> => {
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);

  return response;
};

const fetchText = async (url: string): Promise<string> => {
  return await withCompatFetchRetry(async () => await (await fetchResponse(url)).text());
};

const fetchJSON = async <Result>(url: string): Promise<Result> => {
  return JSON.parse(await fetchText(url)) as Result;
};

const downloadFile = async (url: string, filePath: string): Promise<void> => {
  const bytes = await withCompatFetchRetry(async () => {
    return Buffer.from(await (await fetchResponse(url)).arrayBuffer());
  });

  writeFileSync(filePath, bytes);
};

const stripDownloadedFileExtension = (fileName: string): string => {
  return fileName.replace(/\.tar\.gz$/u, "").replace(/\.(zip|exe)$/u, "");
};

const findIndexedAssetName = (
  indexText: string,
  matches: (fileName: string) => boolean,
): string | undefined => {
  for (const line of indexText.split(/\r?\n/u)) {
    const columns = line.trim().split(/\s+/u);
    const fileName = columns[columns.length - 1];
    if (fileName && matches(fileName)) return fileName;
  }

  return undefined;
};

const extractNode6Archive = async (
  distribution: Node6Distribution,
  archivePath: string,
  tempRoot: string,
): Promise<void> => {
  if (distribution.archiveType === "tar.gz") {
    await tar.x({ cwd: tempRoot, file: archivePath, gzip: true, strict: true });
    return;
  }

  await extractZipArchive(archivePath, tempRoot);
};

interface Node6DistributionRequest {
  readonly archiveSuffix: string;
  readonly archiveType: Node6Distribution["archiveType"];
  readonly binaryRelativePath: string;
}

let node6DistributionPromise: Promise<Node6Distribution> | undefined;

const resolveNode6DistributionRequest = (): Node6DistributionRequest => {
  if (process.platform === "win32" && ["x64", "arm64"].includes(process.arch))
    return {
      archiveSuffix: "win-x64.zip",
      archiveType: "zip",
      binaryRelativePath: "node.exe",
    };

  if (process.platform === "win32" && process.arch === "ia32")
    return {
      archiveSuffix: "win-x86.zip",
      archiveType: "zip",
      binaryRelativePath: "node.exe",
    };

  if (process.platform === "darwin")
    return {
      archiveSuffix: "darwin-x64.tar.gz",
      archiveType: "tar.gz",
      binaryRelativePath: path.join("bin", "node"),
    };

  if (process.platform === "linux" && process.arch === "x64")
    return {
      archiveSuffix: "linux-x64.tar.gz",
      archiveType: "tar.gz",
      binaryRelativePath: path.join("bin", "node"),
    };

  throw new Error(`No official Node 6 binary configured for ${process.platform}/${process.arch}`);
};

const resolveLatestNode6Distribution = async (): Promise<Node6Distribution> => {
  const request = resolveNode6DistributionRequest();
  const shasums = await fetchText(`${node6LatestDistRoot}/SHASUMS256.txt`);
  const archiveName = findIndexedAssetName(
    shasums,
    (fileName) => fileName.startsWith("node-v6.") && fileName.endsWith(request.archiveSuffix),
  );

  if (!archiveName) {
    throw new Error(`Node 6 latest index does not include ${request.archiveSuffix}`);
  }

  return {
    archiveName,
    archiveType: request.archiveType,
    binaryRelativePath: request.binaryRelativePath,
    directoryName: stripDownloadedFileExtension(archiveName),
    url: `${node6LatestDistRoot}/${archiveName}`,
  };
};

const resolveNode6Distribution = (): Promise<Node6Distribution> => {
  node6DistributionPromise ??= resolveLatestNode6Distribution();
  return node6DistributionPromise;
};

const ensureNode6Binary = async (): Promise<string> => {
  const distribution = await resolveNode6Distribution();
  const installBase = path.join(compatTempRoot, "node6");
  const installRoot = path.join(installBase, distribution.directoryName);
  const binaryPath = path.join(installRoot, distribution.binaryRelativePath);

  return await ensureInstalledCompatBinary(
    binaryPath,
    toCompatInstallLockName("node6", distribution.directoryName),
    async () => {
      ensureCompatTempRoot();
      mkdirSync(installBase, { recursive: true });

      const tempRoot = makeCompatTempDir("node6-download");
      const archivePath = path.join(tempRoot, distribution.archiveName);

      try {
        await downloadFile(distribution.url, archivePath);
        await extractNode6Archive(distribution, archivePath, tempRoot);

        rmSync(installRoot, { force: true, recursive: true });
        moveCompatTree(path.join(tempRoot, distribution.directoryName), installRoot);
      } finally {
        rmSync(tempRoot, { force: true, recursive: true });
      }
    },
  );
};

const probeNode6Runtime = async (): Promise<Node6Probe> => {
  const node6Binary = await ensureNode6Binary();
  const probe = runCommand(node6Binary, ["-p", "process.version"]);

  const observedVersion = probe.stdout.trim();

  if (probe.status !== 0 || !observedVersion.startsWith("v6."))
    throw new Error(
      `Node 6 probe failed with exit code ${probe.status}\n${probe.stdout}\n${probe.stderr}`,
    );

  return {
    observedVersion,
    status: probe.status,
    stderr: probe.stderr.trim(),
    stdout: probe.stdout.trim(),
  };
};

const runNode6Runtime = async (options: Node6RuntimeOptions = {}) => {
  const probe = await probeNode6Runtime();
  const inlineSource = readInlineCaseSource("Node6");
  const stdin = options.stdin ?? readInlineCaseStdin("Node6");
  const node6Binary = await ensureNode6Binary();

  return withNode6CompatDir(
    ({ compatDir, tempRoot }) => {
      const runtimeEntryFile = path.join(tempRoot, "runtime.cjs");
      const coverageFile = path.join(tempRoot, "coverage.json");
      const resultFile = path.join(tempRoot, "result.json");
      const entrySource = buildNode6InlineEntrySource(inlineSource, runtimeEntryFile, compatDir);
      writeFileSync(
        runtimeEntryFile,
        [
          entrySource,
          `if (typeof global.__compatResult !== "undefined") { require("fs").writeFileSync(${JSON.stringify(resultFile)}, JSON.stringify(global.__compatResult), "utf8"); }`,
          options.collectCoverage ?
            `require("fs").writeFileSync(${JSON.stringify(coverageFile)}, JSON.stringify(global.${compatCoverageVariable} || {}), "utf8");`
          : "",
        ].join("\n") + "\n",
        "utf8",
      );

      const runtime = runCommand(node6Binary, [runtimeEntryFile], {
        ...(typeof stdin === "string" ? { input: stdin } : {}),
      });

      if (runtime.status !== 0)
        throw new Error(
          `Node 6 runtime failed with exit code ${runtime.status}\n${runtime.stdout}\n${runtime.stderr}`,
        );

      return {
        coverage:
          options.collectCoverage && existsSync(coverageFile) ?
            JSON.parse(readFileSync(coverageFile, "utf8"))
          : undefined,
        probe,
        result: existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, "utf8")) : undefined,
        stdout: runtime.stdout,
      };
    },
    { instrumentCoverage: options.collectCoverage === true },
  );
};

interface QuickJSBellardDistributionRequest {
  readonly assetPrefix: string;
  readonly binaryRelativePath: string;
  readonly installTarget: string;
}

interface QuickJSBellardLatestRelease {
  readonly version: string;
}

let quickJSBellardDistributionPromise: Promise<QuickJSDistribution> | undefined;
let quickJSNGDistributionPromise: Promise<QuickJSDistribution> | undefined;

const resolveQuickJSBellardDistributionRequest = (): QuickJSBellardDistributionRequest => {
  if (process.platform === "darwin") {
    return {
      assetPrefix: "quickjs-cosmo",
      binaryRelativePath: "qjs",
      installTarget: "cosmo",
    };
  }

  if (process.platform === "linux" && process.arch === "x64") {
    return {
      assetPrefix: "quickjs-linux-x86_64",
      binaryRelativePath: "qjs",
      installTarget: "linux-x86_64",
    };
  }

  if (process.platform === "linux" && process.arch === "ia32") {
    return {
      assetPrefix: "quickjs-linux-i686",
      binaryRelativePath: "qjs",
      installTarget: "linux-i686",
    };
  }

  if (process.platform === "win32" && process.arch === "x64") {
    return {
      assetPrefix: "quickjs-win-x86_64",
      binaryRelativePath: "qjs.exe",
      installTarget: "win-x86_64",
    };
  }

  if (process.platform === "win32" && process.arch === "ia32") {
    return {
      assetPrefix: "quickjs-win-i686",
      binaryRelativePath: "qjs.exe",
      installTarget: "win-i686",
    };
  }

  throw new Error(
    `No official Bellard QuickJS binary configured for ${process.platform}/${process.arch}`,
  );
};

const resolveLatestQuickJSBellardDistribution = async (): Promise<QuickJSDistribution> => {
  const { version } = await fetchJSON<QuickJSBellardLatestRelease>(quickJSBellardLatestVersionURL);
  const request = resolveQuickJSBellardDistributionRequest();
  const assetName = `${request.assetPrefix}-${version}.zip`;

  return {
    assetName,
    assetType: "zip",
    binaryRelativePath: request.binaryRelativePath,
    installDirectoryName: `quickjs-${version}-${request.installTarget}`,
    url: `${quickJSBellardDistRoot}/${assetName}`,
  };
};

const resolveQuickJSBellardDistribution = (): Promise<QuickJSDistribution> => {
  quickJSBellardDistributionPromise ??= resolveLatestQuickJSBellardDistribution();
  return quickJSBellardDistributionPromise;
};

interface QuickJSNGDistributionRequest {
  readonly assetName: string;
  readonly binaryRelativePath: string;
  readonly installTarget: string;
}

const resolveQuickJSNGDistributionRequest = (): QuickJSNGDistributionRequest => {
  if (process.platform === "darwin")
    return {
      assetName: "qjs-darwin",
      binaryRelativePath: "qjs",
      installTarget: "darwin",
    };

  if (process.platform === "linux" && process.arch === "x64")
    return {
      assetName: "qjs-linux-x86_64",
      binaryRelativePath: "qjs",
      installTarget: "linux-x86_64",
    };

  if (process.platform === "linux" && process.arch === "ia32")
    return {
      assetName: "qjs-linux-x86",
      binaryRelativePath: "qjs",
      installTarget: "linux-x86",
    };

  if (process.platform === "linux" && process.arch === "arm64")
    return {
      assetName: "qjs-linux-aarch64",
      binaryRelativePath: "qjs",
      installTarget: "linux-aarch64",
    };

  if (process.platform === "linux" && process.arch === "arm")
    return {
      assetName: "qjs-linux-armv7",
      binaryRelativePath: "qjs",
      installTarget: "linux-armv7",
    };

  if (process.platform === "linux" && process.arch === "riscv64")
    return {
      assetName: "qjs-linux-riscv64",
      binaryRelativePath: "qjs",
      installTarget: "linux-riscv64",
    };

  if (process.platform === "win32" && process.arch === "x64")
    return {
      assetName: "qjs-windows-x86_64.exe",
      binaryRelativePath: "qjs.exe",
      installTarget: "windows-x86_64",
    };

  if (process.platform === "win32" && process.arch === "ia32")
    return {
      assetName: "qjs-windows-x86.exe",
      binaryRelativePath: "qjs.exe",
      installTarget: "windows-x86",
    };

  throw new Error(
    `No official QuickJS-NG binary configured for ${process.platform}/${process.arch}`,
  );
};

const extractLatestReleaseTag = (releaseURL: string): string => {
  const segments = new URL(releaseURL).pathname.split("/").filter(Boolean);
  const tagIndex = segments.findIndex((segment) => segment === "tag");
  const tagName = tagIndex >= 0 ? segments[tagIndex + 1] : undefined;

  if (!tagName) {
    throw new Error(`Could not determine latest release tag from ${releaseURL}`);
  }

  return tagName;
};

const resolveLatestQuickJSNGDistribution = async (): Promise<QuickJSDistribution> => {
  const latestRelease = await withCompatFetchRetry(
    async () => await fetchResponse(quickJSNGLatestReleaseURL),
  );
  const request = resolveQuickJSNGDistributionRequest();
  const tagName = extractLatestReleaseTag(latestRelease.url);

  return {
    assetName: request.assetName,
    assetType: "binary",
    binaryRelativePath: request.binaryRelativePath,
    installDirectoryName: `quickjs-ng-${tagName}-${request.installTarget}`,
    url: `${quickJSNGDownloadRoot}/${tagName}/${request.assetName}`,
  };
};

const resolveQuickJSNGDistribution = (): Promise<QuickJSDistribution> => {
  quickJSNGDistributionPromise ??= resolveLatestQuickJSNGDistribution();
  return quickJSNGDistributionPromise;
};

const ensureQuickJSDistributionBinary = async (
  installBaseName: "quickjs" | "quickjs-ng",
  distribution: QuickJSDistribution,
): Promise<string> => {
  const installBase = path.join(compatTempRoot, installBaseName);
  const installRoot = path.join(installBase, distribution.installDirectoryName);
  const binaryPath = path.join(installRoot, distribution.binaryRelativePath);

  const installedBinary = await ensureInstalledCompatBinary(
    binaryPath,
    toCompatInstallLockName(installBaseName, distribution.installDirectoryName),
    async () => {
      ensureCompatTempRoot();
      mkdirSync(installBase, { recursive: true });

      const tempRoot = makeCompatTempDir(`${installBaseName}-download`);
      const downloadPath = path.join(tempRoot, distribution.assetName);
      const extractedRoot = path.join(tempRoot, "extracted");

      try {
        await downloadFile(distribution.url, downloadPath);
        mkdirSync(extractedRoot, { recursive: true });

        if (distribution.assetType === "zip") {
          await extractZipArchive(downloadPath, extractedRoot);
        } else {
          renameSync(downloadPath, path.join(extractedRoot, distribution.binaryRelativePath));
        }

        const extractedBinary = path.join(extractedRoot, distribution.binaryRelativePath);
        if (!existsSync(extractedBinary)) {
          throw new Error(`QuickJS binary not found in ${distribution.assetName}`);
        }

        ensureExecutable(extractedBinary);
        rmSync(installRoot, { force: true, recursive: true });
        moveCompatTree(extractedRoot, installRoot);
      } finally {
        rmSync(tempRoot, { force: true, recursive: true });
      }
    },
  );

  ensureExecutable(installedBinary);
  return installedBinary;
};

const ensureQuickJSBinary = async (flavor: QuickJSFlavor): Promise<string> => {
  if (flavor === "bellard") {
    return await ensureQuickJSDistributionBinary(
      "quickjs",
      await resolveQuickJSBellardDistribution(),
    );
  }

  return await ensureQuickJSDistributionBinary("quickjs-ng", await resolveQuickJSNGDistribution());
};

const resolveQuickJSAerioImportPath = (
  moduleName: string,
  filePath: string,
  compatDir: string,
): string | null => {
  const compatFile = resolveCompatModuleFile(compatDir, moduleName);
  return compatFile ? toRelativeImportPath(filePath, compatFile) : null;
};

const rewriteQuickJSAerioImportSpecifiers = (
  sourceCode: string,
  fileName: string,
  filePath: string,
  compatDir: string,
): string => {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceCode,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  const transformResult = ts.transform(sourceFile, [
    (context) => {
      const rewriteSpecifier = (node: ts.StringLiteralLike): ts.StringLiteralLike => {
        const rewritten = resolveQuickJSAerioImportPath(node.text, filePath, compatDir);
        return rewritten ? ts.factory.createStringLiteral(rewritten) : node;
      };

      const visit: ts.Visitor = (node) => {
        const visited = ts.visitEachChild(node, visit, context);

        if (ts.isImportDeclaration(visited) && ts.isStringLiteralLike(visited.moduleSpecifier)) {
          const moduleSpecifier = rewriteSpecifier(visited.moduleSpecifier);
          return moduleSpecifier === visited.moduleSpecifier ?
              visited
            : ts.factory.updateImportDeclaration(
                visited,
                visited.modifiers,
                visited.importClause,
                moduleSpecifier,
                visited.attributes,
              );
        }

        if (
          ts.isExportDeclaration(visited) &&
          visited.moduleSpecifier &&
          ts.isStringLiteralLike(visited.moduleSpecifier)
        ) {
          const moduleSpecifier = rewriteSpecifier(visited.moduleSpecifier);
          return moduleSpecifier === visited.moduleSpecifier ?
              visited
            : ts.factory.updateExportDeclaration(
                visited,
                visited.modifiers,
                visited.isTypeOnly,
                visited.exportClause,
                moduleSpecifier,
                visited.attributes,
              );
        }

        if (
          ts.isCallExpression(visited) &&
          visited.expression.kind === ts.SyntaxKind.ImportKeyword &&
          visited.arguments.length === 1
        ) {
          const [moduleSpecifier] = visited.arguments;
          if (!moduleSpecifier || !ts.isStringLiteralLike(moduleSpecifier)) return visited;
          const rewritten = rewriteSpecifier(moduleSpecifier);
          return rewritten === moduleSpecifier ? visited : (
              ts.factory.updateCallExpression(visited, visited.expression, visited.typeArguments, [
                rewritten,
              ])
            );
        }

        return visited;
      };

      return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    },
  ]);

  try {
    const transformedSourceFile = transformResult.transformed[0]!;
    return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformedSourceFile);
  } finally {
    transformResult.dispose();
  }
};

const buildQuickJSInlineEntrySource = (
  sourceCode: string,
  fileName: string,
  filePath: string,
  compatDir: string,
): string => {
  const transpiled = transpileToESModule(sourceCode, fileName).code;
  return rewriteQuickJSAerioImportSpecifiers(
    transpiled,
    fileName.replace(/\.[^.]+$/u, ".js"),
    filePath,
    compatDir,
  );
};

const buildQuickJSRuntimeSource = (
  userEntryFile: string,
  runtimeEntryFile: string,
  resultFile: string,
  coverageFile: string,
  collectCoverage: boolean,
): string => {
  const userEntryImport = toRelativeImportPath(runtimeEntryFile, userEntryFile);

  return [
    'const std = await import("qjs:std").catch(() => import("std"));',
    "",
    "const writeCompatFile = (filePath, value) => {",
    '  const file = std.open(filePath, "w");',
    "  if (!file) throw new Error(`Cannot open ${filePath} for writing`);",
    "  try {",
    "    file.puts(value);",
    "  } finally {",
    "    file.close();",
    "  }",
    "};",
    "",
    `await import(${JSON.stringify(userEntryImport)});`,
    `if (typeof globalThis.__compatResult !== "undefined") writeCompatFile(${JSON.stringify(resultFile)}, JSON.stringify(globalThis.__compatResult));`,
    collectCoverage ?
      `writeCompatFile(${JSON.stringify(coverageFile)}, JSON.stringify(globalThis.${compatCoverageVariable} || {}));`
    : "",
    "",
  ].join("\n");
};

const runQuickJSCommand = (
  binaryPath: string,
  args: readonly string[],
  options: Omit<SpawnSyncOptionsWithStringEncoding, "encoding">,
): SpawnSyncReturns<string> => {
  const runtime = runCommand(binaryPath, args, options);
  const runtimeError = runtime.error as NodeJS.ErrnoException | undefined;
  if (runtimeError?.code !== "ENOEXEC" || process.platform === "win32") return runtime;
  return runCommand("/bin/sh", [binaryPath, ...args], options);
};

const runQuickJSSourceInDir = async (
  flavor: QuickJSFlavor,
  sourceCode: string,
  options: QuickJSRunOptions,
) => {
  const quickjsBinary = await ensureQuickJSBinary(flavor);
  const ownsRunRoot = options.tempRoot === null;
  const runRoot = options.tempRoot ?? makeCompatTempDir(`quickjs-${flavor}`);

  try {
    const userEntryFile = path.join(runRoot, `inline-${flavor}.js`);
    const runtimeEntryFile = path.join(runRoot, `runtime-${flavor}.js`);
    const resultFile = path.join(runRoot, `result-${flavor}.json`);
    const coverageFile = path.join(runRoot, `coverage-${flavor}.json`);

    writeFileSync(
      userEntryFile,
      buildQuickJSInlineEntrySource(
        sourceCode,
        path.join(runRoot, `inline-${flavor}.ts`),
        userEntryFile,
        options.compatDir,
      ),
      "utf8",
    );
    writeFileSync(
      runtimeEntryFile,
      buildQuickJSRuntimeSource(
        userEntryFile,
        runtimeEntryFile,
        resultFile,
        coverageFile,
        options.collectCoverage === true,
      ),
      "utf8",
    );

    const runtime = runQuickJSCommand(quickjsBinary, ["-m", path.basename(runtimeEntryFile)], {
      cwd: runRoot,
      ...(typeof options.stdin === "string" ? { input: options.stdin } : {}),
    });

    if (runtime.status !== 0) {
      throw new Error(
        `${flavor === "bellard" ? "QuickJS" : "QuickJS-NG"} runtime failed with exit code ${runtime.status}\n${runtime.stdout}\n${runtime.stderr}`,
      );
    }

    return {
      coverage:
        options.collectCoverage && existsSync(coverageFile) ?
          JSON.parse(readFileSync(coverageFile, "utf8"))
        : undefined,
      result: existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, "utf8")) : undefined,
      stdout: runtime.stdout,
    };
  } finally {
    if (ownsRunRoot) rmSync(runRoot, { force: true, recursive: true });
  }
};

const runQuickJSInlineCase = async (
  flavor: QuickJSFlavor,
  options: QuickJSInlineCaseOptions = {},
) => {
  const stdin = options.stdin ?? readInlineCaseStdin("QuickJS");

  return withQuickJSCompatDir(
    ({ compatDir, tempRoot }) =>
      runQuickJSSourceInDir(flavor, readInlineCaseSource("QuickJS"), {
        collectCoverage: options.collectCoverage === true,
        compatDir,
        ...(typeof stdin === "string" ? { stdin } : {}),
        tempRoot,
      }),
    {
      instrumentCoverage: options.collectCoverage === true,
      ...(typeof cliFlags.useDist === "boolean" ? { useDist: cliFlags.useDist } : {}),
    },
  );
};

const capture = async <T extends object>(
  run: () => Promise<T> | T,
): Promise<({ readonly ok: true } & T) | CompatFailure> => {
  try {
    return { ok: true, ...(await run()) };
  } catch (error) {
    return { ok: false, error: formatUnknownError(error) };
  }
};

const main = async () => {
  const { collectCoverage, command } = cliFlags;

  switch (command) {
    case "node6":
      return capture(() => runNode6Runtime({ collectCoverage }));

    case "node6-probe":
      return capture(() => probeNode6Runtime());

    case "quickjs":
      return capture(() => runQuickJSInlineCase("bellard", { collectCoverage }));

    case "quickjs-ng":
      return capture(() => runQuickJSInlineCase("ng", { collectCoverage }));

    default: {
      const exhaustiveCheck: never = command;
      throw new Error(`Unknown compat command: ${String(exhaustiveCheck)}`);
    }
  }
};

const result = await main();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
