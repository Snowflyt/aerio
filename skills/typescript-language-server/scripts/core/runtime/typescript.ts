import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { isRecord } from "../common.ts";

export interface ResolvedTypeScriptInstall {
  workspaceRoot: string;
  tsserverPath: string;
  typescriptModulePath: string;
  version: string;
  searchRoots: readonly string[];
}

interface FallbackProjectConfig {
  extends?: string;
  compilerOptions: {
    noEmit: boolean;
    allowJs: boolean;
    checkJs: boolean;
    target: string;
    module: string;
    moduleResolution: string;
    resolveJsonModule: boolean;
    jsx: string;
  };
  include: string[];
  exclude: string[];
}

interface TypeScriptPackageJson {
  version?: string;
}

export interface ProjectRootResolutionOptions {
  cwd?: string;
  explicitProject?: string;
  fileHints?: readonly string[];
}

const PREFERRED_PROJECT_CONFIG_NAMES = [
  "tsconfig.json",
  "tsconfig.test.json",
  "tsconfig.build.json",
  "jsconfig.json",
];

function findWorkspaceRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);
  let nearestAgentsRoot: string | null = null;
  let nearestPackageRoot: string | null = null;

  while (true) {
    if (existsSync(path.join(currentDir, ".git"))) {
      return currentDir;
    }

    if (nearestAgentsRoot === null && existsSync(path.join(currentDir, "AGENTS.md"))) {
      nearestAgentsRoot = currentDir;
    }

    if (nearestPackageRoot === null && existsSync(path.join(currentDir, "package.json"))) {
      nearestPackageRoot = currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return nearestAgentsRoot ?? nearestPackageRoot ?? path.resolve(startDir);
    }
    currentDir = parentDir;
  }
}

function collectAncestorNodeModules(startDir: string, workspaceRoot: string): string[] {
  const roots: string[] = [];
  let currentDir = path.resolve(startDir);

  while (true) {
    roots.push(path.join(currentDir, "node_modules"));
    if (currentDir === workspaceRoot) {
      return roots;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return roots;
    }
    currentDir = parentDir;
  }
}

function collectTypeScriptSearchRoots(projectRoot: string, workspaceRoot: string): string[] {
  const searchRoots = [
    ...collectAncestorNodeModules(projectRoot, workspaceRoot),
    path.join(workspaceRoot, "node_modules"),
  ];

  return Array.from(new Set(searchRoots.filter((searchRoot) => existsSync(searchRoot))));
}

function tryResolveTypeScriptPath(
  specifier: string,
  searchRoots: readonly string[],
): string | undefined {
  const require = createRequire(import.meta.url);

  for (const searchRoot of searchRoots) {
    try {
      return require.resolve(specifier, { paths: [searchRoot] });
    } catch {
      continue;
    }
  }

  return undefined;
}

function readTypeScriptVersion(typescriptModulePath: string): string {
  const packageJsonPath = path.join(
    path.dirname(path.dirname(typescriptModulePath)),
    "package.json",
  );
  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as TypeScriptPackageJson;
  return typeof parsed.version === "string" && parsed.version ? parsed.version : "unknown";
}

function isNodeModulesPath(value: string): boolean {
  return value.split(path.sep).includes("node_modules");
}

function listTypeScriptConfigFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const dynamicConfigNames = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^tsconfig(\..+)?\.json$/u.test(name) || name === "jsconfig.json");

  const ordered = [
    ...PREFERRED_PROJECT_CONFIG_NAMES.filter((name) => dynamicConfigNames.includes(name)),
    ...dynamicConfigNames
      .filter((name) => !PREFERRED_PROJECT_CONFIG_NAMES.includes(name))
      .toSorted((left, right) => left.localeCompare(right)),
  ];

  return ordered.map((name) => path.join(dir, name));
}

function hasProjectConfig(dir: string): boolean {
  return listTypeScriptConfigFiles(dir).length > 0;
}

export function findProjectConfigPaths(projectRoot: string): string[] {
  return listTypeScriptConfigFiles(projectRoot);
}

export function resolveTypeScriptInstall(projectRoot: string): ResolvedTypeScriptInstall {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  const overridePath = process.env.TYPESCRIPT_LANGUAGE_SERVER_TSSERVER_PATH?.trim();
  const searchRoots = collectTypeScriptSearchRoots(projectRoot, workspaceRoot);

  const tsserverPath =
    overridePath && overridePath.length > 0 ?
      path.isAbsolute(overridePath) ?
        overridePath
      : path.resolve(projectRoot, overridePath)
    : tryResolveTypeScriptPath("typescript/lib/tsserver.js", searchRoots);

  if (!tsserverPath) {
    const searchText = searchRoots.map((searchRoot) => `- ${searchRoot}`).join("\n");
    throw new Error(
      `Could not resolve repo-local TypeScript for ${projectRoot}.\nSearched:\n${searchText}\nSet TYPESCRIPT_LANGUAGE_SERVER_TSSERVER_PATH if you need an explicit override.`,
    );
  }

  const typescriptModulePath = path.join(path.dirname(tsserverPath), "typescript.js");
  if (!existsSync(typescriptModulePath)) {
    throw new Error(
      `Resolved tsserver at ${tsserverPath}, but ${typescriptModulePath} is missing.`,
    );
  }

  if (!overridePath && !isNodeModulesPath(tsserverPath)) {
    throw new Error(`Resolved TypeScript path is not inside node_modules: ${tsserverPath}`);
  }

  return {
    workspaceRoot,
    tsserverPath,
    typescriptModulePath,
    version: readTypeScriptVersion(typescriptModulePath),
    searchRoots,
  };
}

export function resolveFallbackTsconfigPath(projectRoot: string): string | undefined {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  const explicitOverride = process.env.TYPESCRIPT_LANGUAGE_SERVER_FALLBACK_TSCONFIG_PATH?.trim();
  if (explicitOverride) {
    return path.resolve(workspaceRoot, explicitOverride);
  }

  for (const baseDir of [projectRoot, workspaceRoot]) {
    for (const candidate of [
      "tsconfig.test.json",
      "tsconfig.build.json",
      "tsconfig.json",
      "jsconfig.json",
    ]) {
      const candidatePath = path.join(baseDir, candidate);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return undefined;
}

export function createFallbackProjectConfig(projectRoot: string): FallbackProjectConfig {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  const fallbackTsconfigPath = resolveFallbackTsconfigPath(projectRoot);

  return {
    ...(fallbackTsconfigPath ? { extends: path.relative(projectRoot, fallbackTsconfigPath) } : {}),
    compilerOptions: {
      noEmit: true,
      allowJs: true,
      checkJs: false,
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "Bundler",
      resolveJsonModule: true,
      jsx: "react-jsx",
    },
    include: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.js", "**/*.jsx"],
    exclude: [
      "**/node_modules",
      "**/dist",
      "**/build",
      "**/output",
      "**/.next",
      "**/.turbo",
      "**/coverage",
      path.relative(projectRoot, path.join(workspaceRoot, ".tmp")),
    ],
  };
}

export function loadTypeScriptModule<TypeScriptApi>(projectRoot: string): TypeScriptApi {
  const require = createRequire(import.meta.url);
  const install = resolveTypeScriptInstall(projectRoot);
  return require(install.typescriptModulePath) as TypeScriptApi;
}

export function getProjectRoot(): string {
  return resolveProjectRoot();
}

function findProjectRootFromStartDir(startDir: string): string {
  let currentDir = path.resolve(startDir);
  let nearestPackageRoot: string | null = null;

  while (true) {
    if (hasProjectConfig(currentDir)) {
      return currentDir;
    }

    if (nearestPackageRoot === null && existsSync(path.join(currentDir, "package.json"))) {
      nearestPackageRoot = currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return nearestPackageRoot ?? path.resolve(startDir);
    }
    currentDir = parentDir;
  }
}

function resolveProjectRootFromFileHints(fileHints: readonly string[], cwd: string): string | null {
  const workspaceRoot = findWorkspaceRoot(cwd);
  const candidateBaseDirs = Array.from(new Set([cwd, workspaceRoot]));

  for (const fileHint of fileHints) {
    const trimmedFileHint = fileHint.trim();
    if (!trimmedFileHint) {
      continue;
    }

    const candidates =
      path.isAbsolute(trimmedFileHint) ?
        [path.resolve(trimmedFileHint)]
      : candidateBaseDirs.map((baseDir) => path.resolve(baseDir, trimmedFileHint));

    for (const candidatePath of candidates) {
      if (!existsSync(candidatePath)) {
        continue;
      }
      const candidateStat = statSync(candidatePath);
      const candidateDir =
        candidateStat.isDirectory() ? candidatePath : path.dirname(candidatePath);
      return findProjectRootFromStartDir(candidateDir);
    }
  }

  return null;
}

export function resolveProjectRoot(options: ProjectRootResolutionOptions = {}): string {
  const cwd = path.resolve(options.cwd || process.cwd());
  const envProjectRoot = process.env.TYPESCRIPT_LANGUAGE_SERVER_PROJECT_ROOT?.trim();
  if (envProjectRoot) {
    return findProjectRootFromStartDir(path.resolve(cwd, envProjectRoot));
  }

  const explicitProject = options.explicitProject?.trim();
  if (explicitProject) {
    return findProjectRootFromStartDir(path.resolve(cwd, explicitProject));
  }

  const hintedProjectRoot =
    options.fileHints && options.fileHints.length > 0 ?
      resolveProjectRootFromFileHints(options.fileHints, cwd)
    : null;
  if (hintedProjectRoot) {
    return hintedProjectRoot;
  }

  return findProjectRootFromStartDir(cwd);
}

export function isTypeScriptResolution(value: unknown): value is ResolvedTypeScriptInstall {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.workspaceRoot === "string" &&
    typeof value.tsserverPath === "string" &&
    typeof value.typescriptModulePath === "string" &&
    typeof value.version === "string" &&
    Array.isArray(value.searchRoots)
  );
}
