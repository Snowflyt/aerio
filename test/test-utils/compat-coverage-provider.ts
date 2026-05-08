import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import istanbulCoverageModule from "@vitest/coverage-istanbul";
import type { CoverageMap, CoverageMapData, FileCoverage } from "istanbul-lib-coverage";
import * as istanbulCoverage from "istanbul-lib-coverage";
import * as istanbulSourceMaps from "istanbul-lib-source-maps";
import type { CoverageProvider, CoverageProviderModule, ReportContext, Vitest } from "vitest/node";

const compatCoverageFileEnv = "AERIO_RUNTIME_COMPAT_COVERAGE_FILE";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const compatCoverageTempRoot = path.join(projectRoot, ".tmp", "runtime-compat", "coverage");

const normalizeCoveragePath = (filePath: string): string => {
  const absolutePath =
    path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(projectRoot, filePath);
  const relativePath = path.relative(projectRoot, absolutePath);
  const projectPath =
    relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath) ?
      absolutePath
    : relativePath;

  return projectPath.replace(/\\/gu, "/");
};

const normalizeCoverageMapPaths = (coverageMap: CoverageMap): CoverageMap => {
  const normalizedCoverageMap = istanbulCoverage.createCoverageMap({});

  for (const filePath of coverageMap.files()) {
    const normalizedPath = normalizeCoveragePath(filePath);
    const fileCoverage = coverageMap.fileCoverageFor(filePath).toJSON() as FileCoverage;

    fileCoverage.path = normalizedPath;
    normalizedCoverageMap.merge(
      istanbulCoverage.createCoverageMap({
        [normalizedPath]: fileCoverage,
      }),
    );
  }

  return normalizedCoverageMap;
};

const isCoverageMap = (value: unknown): value is CoverageMap => {
  return (
    typeof value === "object" &&
    value !== null &&
    "merge" in value &&
    typeof value.merge === "function"
  );
};

const readCompatCoverageEntries = (filePath: string | null): readonly CoverageMapData[] => {
  if (!filePath || !existsSync(filePath)) return [];

  const entries: CoverageMapData[] = [];

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    entries.push(JSON.parse(trimmed) as CoverageMapData);
  }

  return entries;
};

const remapCompatCoverageEntries = async (
  entries: readonly CoverageMapData[],
): Promise<CoverageMap> => {
  const sourceMapStore = istanbulSourceMaps.createSourceMapStore();
  const coverageMap = istanbulCoverage.createCoverageMap({});

  for (const entry of entries) {
    const remappedEntry = await sourceMapStore.transformCoverage(
      istanbulCoverage.createCoverageMap(entry),
    );
    coverageMap.merge(remappedEntry);
  }

  return coverageMap;
};

export class CustomCompatCoverageProvider implements CoverageProvider {
  readonly #delegate: CoverageProvider;
  readonly name: string;
  readonly version: string | undefined;
  #compatCoverageTempRoot: string | null = null;
  #compatCoverageFile: string | null = null;

  constructor(delegate: CoverageProvider & { version?: string }) {
    this.#delegate = delegate;
    this.name = delegate.name;
    this.version = delegate.version;
  }

  async initialize(ctx: Vitest) {
    mkdirSync(compatCoverageTempRoot, { recursive: true });
    this.#compatCoverageTempRoot = mkdtempSync(path.join(compatCoverageTempRoot, "session-"));
    this.#compatCoverageFile = path.join(this.#compatCoverageTempRoot, "compat.ndjson");
    writeFileSync(this.#compatCoverageFile, "", "utf8");
    process.env[compatCoverageFileEnv] = this.#compatCoverageFile;
    await this.#delegate.initialize(ctx);
  }

  resolveOptions() {
    return this.#delegate.resolveOptions();
  }

  clean(clean?: boolean) {
    return this.#delegate.clean(clean);
  }

  onAfterSuiteRun(meta: Parameters<CoverageProvider["onAfterSuiteRun"]>[0]) {
    return this.#delegate.onAfterSuiteRun(meta);
  }

  onTestRunStart() {
    return this.#delegate.onTestRunStart?.();
  }

  onTestFailure() {
    return this.#delegate.onTestFailure?.();
  }

  requiresTransform(id: string) {
    return this.#delegate.requiresTransform?.(id) || false;
  }

  onFileTransform(
    sourceCode: string,
    id: string,
    pluginCtx: Parameters<NonNullable<CoverageProvider["onFileTransform"]>>[2],
  ) {
    return this.#delegate.onFileTransform?.(sourceCode, id, pluginCtx);
  }

  onEnabled() {
    return this.#delegate.onEnabled?.();
  }

  async generateCoverage(reportContext: ReportContext) {
    const coverageMap = await this.#delegate.generateCoverage(reportContext);
    const compatCoverageMap = await remapCompatCoverageEntries(
      readCompatCoverageEntries(this.#compatCoverageFile),
    );
    if (!isCoverageMap(coverageMap)) {
      throw new TypeError("Expected the delegated coverage provider to return a CoverageMap");
    }

    const normalizedCoverageMap = normalizeCoverageMapPaths(coverageMap);
    normalizedCoverageMap.merge(normalizeCoverageMapPaths(compatCoverageMap));
    return normalizedCoverageMap;
  }

  reportCoverage(
    coverage: Parameters<CoverageProvider["reportCoverage"]>[0],
    reportContext: ReportContext,
  ) {
    try {
      return this.#delegate.reportCoverage(coverage, reportContext);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[compatCoverageFileEnv];
      if (this.#compatCoverageTempRoot) {
        rmSync(this.#compatCoverageTempRoot, { force: true, recursive: true });
      }
    }
  }

  mergeReports(coverages: Parameters<NonNullable<CoverageProvider["mergeReports"]>>[0]) {
    return this.#delegate.mergeReports?.(coverages);
  }
}

const coverageProviderModule: CoverageProviderModule = {
  ...(istanbulCoverageModule.startCoverage ?
    { startCoverage: istanbulCoverageModule.startCoverage }
  : {}),
  ...(istanbulCoverageModule.stopCoverage ?
    { stopCoverage: istanbulCoverageModule.stopCoverage }
  : {}),
  ...(istanbulCoverageModule.takeCoverage ?
    { takeCoverage: istanbulCoverageModule.takeCoverage }
  : {}),
  async getProvider() {
    const delegate = (await istanbulCoverageModule.getProvider()) as CoverageProvider & {
      version?: string;
    };
    return new CustomCompatCoverageProvider(delegate);
  },
};

export default coverageProviderModule;
