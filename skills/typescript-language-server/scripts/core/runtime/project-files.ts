import { dirname, resolve } from "node:path";

import { isRecord } from "../common.ts";
import type { BridgeLogger } from "../logger.ts";

import {
  createFallbackProjectConfig,
  findProjectConfigPaths,
  loadTypeScriptModule,
  resolveFallbackTsconfigPath,
  resolveTypeScriptInstall,
} from "./typescript.ts";

interface TypeScriptApi {
  readonly sys: {
    fileExists(path: string): boolean;
    readFile(path: string): string | undefined;
  };
  readConfigFile(
    fileName: string,
    readFile: (fileName: string) => string | undefined,
  ): {
    config: unknown;
    error?: {
      messageText: unknown;
    };
  };
  parseJsonConfigFileContent(
    json: unknown,
    host: {
      useCaseSensitiveFileNames?: boolean;
      readDirectory?:
        | ((
            rootDir: string,
            extensions: readonly string[],
            excludes: readonly string[] | undefined,
            includes: readonly string[],
            depth?: number,
          ) => string[])
        | undefined;
      fileExists(path: string): boolean;
      readFile(path: string): string | undefined;
    },
    basePath: string,
  ): {
    fileNames: readonly string[];
    errors: readonly {
      messageText: unknown;
    }[];
  };
  flattenDiagnosticMessageText(messageText: unknown, newLine: string): string;
}

interface ParsedConfigGraph {
  fileNames: readonly string[];
  errors: readonly { messageText: unknown }[];
  sourceConfigs: readonly string[];
}

function isTypeScriptApi(value: unknown): value is TypeScriptApi {
  if (!isRecord(value) || !isRecord(value.sys)) {
    return false;
  }
  return (
    typeof value.readConfigFile === "function" &&
    typeof value.parseJsonConfigFileContent === "function" &&
    typeof value.flattenDiagnosticMessageText === "function" &&
    typeof value.sys.fileExists === "function" &&
    typeof value.sys.readFile === "function"
  );
}

function resolveReferencedConfigPaths(config: unknown, configPath: string): string[] {
  if (!isRecord(config) || !Array.isArray(config.references)) {
    return [];
  }

  return config.references.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.path !== "string" || !entry.path.trim()) {
      return [];
    }

    const referencePath = entry.path.trim();
    if (referencePath.endsWith(".json")) {
      return [resolve(dirname(configPath), referencePath)];
    }

    const referenceRoot = resolve(dirname(configPath), referencePath);
    const configCandidates = findProjectConfigPaths(referenceRoot);
    return configCandidates.length > 0 ? [configCandidates[0]!] : [];
  });
}

export class TypeScriptProjectFiles {
  readonly #repoRoot: string;
  readonly #logger: BridgeLogger;
  readonly #typescript: TypeScriptApi;
  readonly #workspaceRoot: string;

  constructor(repoRoot: string, logger: BridgeLogger) {
    this.#repoRoot = repoRoot;
    this.#logger = logger;
    const typescriptInstall = resolveTypeScriptInstall(repoRoot);
    this.#workspaceRoot = typescriptInstall.workspaceRoot;
    const typescriptModule = loadTypeScriptModule<unknown>(repoRoot);
    if (!isTypeScriptApi(typescriptModule)) {
      throw new Error("loaded typescript module does not expose the expected API");
    }
    this.#typescript = typescriptModule;
    this.#logger.debug("resolved repo-local TypeScript", {
      version: typescriptInstall.version,
      tsserverPath: typescriptInstall.tsserverPath,
    });
  }

  discover(): string[] {
    const readFile = (fileName: string): string | undefined =>
      this.#typescript.sys.readFile(fileName);
    const configPaths = findProjectConfigPaths(this.#repoRoot);

    for (const configPath of configPaths) {
      const parsed = this.#parseConfigGraph(configPath, readFile, new Set());
      if (parsed.errors.length > 0) {
        const firstError = parsed.errors[0];
        throw new Error(
          this.#typescript.flattenDiagnosticMessageText(firstError?.messageText || "", "\n"),
        );
      }

      const files = parsed.fileNames.map((filePath) => resolve(filePath)).toSorted();
      if (files.length === 0) {
        continue;
      }

      this.#logger.debug("discovered project files", {
        count: files.length,
        configPath,
        sourceConfigs: parsed.sourceConfigs,
      });
      return files;
    }

    const parsed = this.#parseFallbackConfig();
    if (parsed.errors.length > 0) {
      const firstError = parsed.errors[0];
      throw new Error(
        this.#typescript.flattenDiagnosticMessageText(firstError?.messageText || "", "\n"),
      );
    }

    const files = parsed.fileNames.map((filePath) => resolve(filePath)).toSorted();
    this.#logger.debug("discovered project files from fallback config", {
      count: files.length,
      sourceConfigs: parsed.sourceConfigs,
    });
    return files;
  }

  #parseConfigGraph(
    configPath: string,
    readFile: (fileName: string) => string | undefined,
    seen: Set<string>,
  ): ParsedConfigGraph {
    const resolvedConfigPath = resolve(configPath);
    if (seen.has(resolvedConfigPath)) {
      return {
        fileNames: [],
        errors: [],
        sourceConfigs: [],
      };
    }
    seen.add(resolvedConfigPath);

    const configResult = this.#typescript.readConfigFile(resolvedConfigPath, (fileName) =>
      readFile(fileName),
    );
    if (configResult.error) {
      throw new Error(
        this.#typescript.flattenDiagnosticMessageText(configResult.error.messageText, "\n"),
      );
    }

    const parsed = this.#typescript.parseJsonConfigFileContent(
      configResult.config,
      this.#typescript.sys,
      dirname(resolvedConfigPath),
    );
    if (parsed.errors.length > 0) {
      return {
        fileNames: parsed.fileNames,
        errors: parsed.errors,
        sourceConfigs: [resolvedConfigPath],
      };
    }

    const fileNames = new Set(parsed.fileNames.map((filePath) => resolve(filePath)));
    const sourceConfigs = [resolvedConfigPath];
    for (const referencedConfigPath of resolveReferencedConfigPaths(
      configResult.config,
      resolvedConfigPath,
    )) {
      const referenced = this.#parseConfigGraph(referencedConfigPath, readFile, seen);
      if (referenced.errors.length > 0) {
        return referenced;
      }
      for (const fileName of referenced.fileNames) {
        fileNames.add(resolve(fileName));
      }
      for (const sourceConfigPath of referenced.sourceConfigs) {
        sourceConfigs.push(sourceConfigPath);
      }
    }

    return {
      fileNames: [...fileNames],
      errors: [],
      sourceConfigs: Array.from(new Set(sourceConfigs)),
    };
  }

  #parseFallbackConfig(): ParsedConfigGraph {
    const fallbackTsconfigPath = resolveFallbackTsconfigPath(this.#repoRoot);
    this.#logger.warn(
      "typescript-language-server project check is using fallback compiler options",
      {
        projectRoot: this.#repoRoot,
        workspaceRoot: this.#workspaceRoot,
        fallbackTsconfigPath: fallbackTsconfigPath || "<inline>",
      },
    );

    const parsed = this.#typescript.parseJsonConfigFileContent(
      createFallbackProjectConfig(this.#repoRoot),
      this.#typescript.sys,
      this.#repoRoot,
    );

    return {
      fileNames: parsed.fileNames,
      errors: parsed.errors,
      sourceConfigs: [fallbackTsconfigPath || "<inline>"],
    };
  }
}
