import { describe, expect, it, vi } from "vitest";
import type { CoverageProvider } from "vitest/node";

import { CustomCompatCoverageProvider } from "./test-utils/compat-coverage-provider";

describe("coverage provider lifecycle delegation", () => {
  it("preserves the run specifications and async result", async () => {
    const specifications = [] as Parameters<NonNullable<CoverageProvider["onTestRunStart"]>>[0];
    const result = Promise.resolve();
    const start = vi.fn(() => result);
    const delegate = {
      name: "probe",
      version: "5.1.0",
      onTestRunStart: start,
    } as unknown as CoverageProvider;
    const provider = new CustomCompatCoverageProvider(delegate);
    expect(provider.onTestRunStart(specifications)).toBe(result);
    expect(start).toHaveBeenCalledExactlyOnceWith(specifications);
    expect(start.mock.contexts[0]).toBe(delegate);
    await result;
  });
  it("preserves delegate identity metadata", () => {
    const provider = new CustomCompatCoverageProvider({
      name: "probe",
      version: "5.1.0",
    } as CoverageProvider);
    expect(provider.name).toBe("probe");
    expect(provider.version).toBe("5.1.0");
  });
  it("allows the optional start hook to be absent", () => {
    const provider = new CustomCompatCoverageProvider({
      name: "probe",
      version: "5.1.0",
    } as CoverageProvider);
    expect(provider.onTestRunStart([])).toBeUndefined();
  });
  it("propagates a start-hook failure", () => {
    const error = new Error("start failed");
    const delegate = {
      name: "probe",
      version: "5.1.0",
      onTestRunStart: () => {
        throw error;
      },
    } as unknown as CoverageProvider;
    expect(() => new CustomCompatCoverageProvider(delegate).onTestRunStart([])).toThrow(error);
  });
});

it("allows an absent optional provider version", () => {
  const provider = new CustomCompatCoverageProvider({ name: "probe" } as CoverageProvider);
  expect(provider.version).toBeUndefined();
});

it("preserves asynchronous hook rejection", async () => {
  const error = new Error("async start failed");
  const delegate = {
    name: "probe",
    onTestRunStart: () => Promise.reject(error),
  } as unknown as CoverageProvider;
  await expect(new CustomCompatCoverageProvider(delegate).onTestRunStart([])).rejects.toBe(error);
});
