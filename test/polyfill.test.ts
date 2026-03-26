/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const nativeAggregateError = globalThis.AggregateError;

afterEach(() => {
  vi.resetModules();
  Object.defineProperty(globalThis, "AggregateError", {
    configurable: true,
    writable: true,
    value: nativeAggregateError,
  });
});

describe("AggregateError polyfill", () => {
  it("falls back when AggregateError is unavailable", async () => {
    const cause = new TypeError("boom");
    cause.stack = "type-error-stack";

    Object.defineProperty(globalThis, "AggregateError", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.resetModules();

    // eslint-disable-next-line sonarjs/no-globals-shadowing
    const { AggregateError } = await import("../src/internal/polyfill");
    const aggregate = new AggregateError(new Set([cause]), "custom message");

    expect(aggregate.errors).toEqual([cause]);
    expect(aggregate.message).toBe("custom message");
    expect(aggregate.name).toBe("AggregateError(TypeError...)");
    expect(aggregate.stack).toBe("type-error-stack");
  });

  it("uses fallback defaults when error metadata is missing", async () => {
    const first = { code: 1 };
    const second = { code: 2 };

    Object.defineProperty(globalThis, "AggregateError", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.resetModules();

    // eslint-disable-next-line sonarjs/no-globals-shadowing
    const { AggregateError } = await import("../src/internal/polyfill");
    const aggregate = new AggregateError([first, second]);

    expect(aggregate.errors).toEqual([first, second]);
    expect(aggregate.message).toBe("AggregateError with 2 errors");
    expect(aggregate.name).toBe("AggregateError(...)");
  });
});
