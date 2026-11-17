import { existsSync } from "node:fs";

import { expect, it } from "vitest";
import type { CoverageProvider, Vitest } from "vitest/node";

import { CustomCompatCoverageProvider } from "./test-utils/compat-coverage-provider";

const key = "AERIO_RUNTIME_COMPAT_COVERAGE_FILE";

for (const fail of [false, true]) {
  it(`retains temporary input until async reporting ${fail ? "rejects" : "resolves"}`, async () => {
    let finish!: () => void;
    const barrier = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const failure = new Error("report failure");
    let observedPath: string | undefined;
    const provider = new CustomCompatCoverageProvider({
      name: "probe",
      initialize() {},
      async reportCoverage() {
        await barrier;
        observedPath = process.env[key];
        if (fail) throw failure;
      },
    } as unknown as CoverageProvider);
    await provider.initialize({} as Vitest);
    const path = process.env[key]!;
    const result = provider.reportCoverage(undefined, {});
    const pending = Promise.resolve(result);
    const outcome = pending.then(
      () => null,
      (error: unknown) => error,
    );
    const existedDuringReport = existsSync(path);
    finish();
    const error = await outcome;
    expect(existedDuringReport).toBe(true);
    expect(observedPath).toBe(path);
    expect(error).toBe(fail ? failure : null);
    expect(existsSync(path)).toBe(false);
    expect(process.env[key]).toBeUndefined();
  });
}

for (const fail of [false, true]) {
  it(`cleans after a synchronous reporter ${fail ? "throws" : "returns"}`, async () => {
    const failure = new Error("sync report failure");
    let observed = false;
    const provider = new CustomCompatCoverageProvider({
      name: "probe",
      initialize() {},
      reportCoverage() {
        observed = existsSync(process.env[key]!);
        if (fail) throw failure;
      },
    } as unknown as CoverageProvider);
    await provider.initialize({} as Vitest);
    const path = process.env[key]!;
    let error: unknown;
    try {
      await provider.reportCoverage(undefined, {});
    } catch (caught) {
      error = caught;
    }
    expect(observed).toBe(true);
    expect(error).toBe(fail ? failure : undefined);
    expect(existsSync(path)).toBe(false);
    expect(process.env[key]).toBeUndefined();
  });
}
