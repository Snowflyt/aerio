/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { dual, flow, pipe } from "../src";

const makeDual = dual as (
  arity: number | ((...args: any[]) => boolean),
  f: (...args: any[]) => unknown,
) => ((...args: any[]) => any) & { raw: (...args: any[]) => unknown; name: string };

const runPipe = pipe as (value: any, ...functions: ((value: any) => any)[]) => any;

const makeFlow = flow as (...functions: ((...args: any[]) => any)[]) => (...args: any[]) => any;

describe("dual", () => {
  it("supports predicate-based data-first and data-last calls", () => {
    const prepend = makeDual(
      (...args: [string, string] | [string]) => args.length === 2,
      (self: string, prefix: string) => prefix + self,
    ) as ((self: string, prefix: string) => string) &
      ((prefix: string) => (self: string) => string);

    expect(prepend("value", "pre-")).toBe("pre-value");
    expect(prepend("pre-")("value")).toBe("pre-value");
  });

  it.each([2, 6])("supports boundary arity %i in data-first and data-last forms", (arity) => {
    const raw = (self: number, ...rest: number[]) => rest.reduce((sum, value) => sum + value, self);
    const lifted = makeDual(arity, raw);
    const args = Array.from({ length: arity }, (_, index) => index + 1);
    const expected = args.reduce((sum, value) => sum + value, 0);
    const first = args[0]!;

    expect((lifted as (...args: number[]) => number)(...args)).toBe(expected);
    expect(
      (lifted as (...args: number[]) => (self: number) => number)(...args.slice(1))(first),
    ).toBe(expected);
    expect(lifted.raw).toBe(raw);
    expect(lifted.name).toBe(raw.name);
  });

  it("throws for invalid arities below 2", () => {
    const raw = (self: number) => self;

    expect(() => makeDual(0, raw)).toThrow("Invalid arity for `dual`: 0");
    expect(() => makeDual(1, raw)).toThrow("Invalid arity for `dual`: 1");
  });

  it("throws for unsupported arities above 6", () => {
    const raw = (self: number, ...rest: number[]) => rest.reduce((sum, value) => sum + value, self);

    expect(() => makeDual(7, raw)).toThrow("Unsupported arity for `dual`: 7");
  });
});

describe("pipe", () => {
  it("applies a single stage", () => {
    expect(runPipe(1, (value: number) => value + 1)).toBe(2);
  });

  it("applies the largest optimized pipeline", () => {
    const functions = Array.from({ length: 9 }, (_, index) => (value: number) => value + index + 1);

    expect(runPipe(0, ...functions)).toBe(45);
  });

  it("applies more than 9 functions through the fallback loop", () => {
    const functions = Array.from(
      { length: 10 },
      (_, index) => (value: number) => value + index + 1,
    );

    expect(runPipe(0, ...functions)).toBe(55);
  });
});

describe("flow", () => {
  it("returns the original function when given one stage", () => {
    const first = (value: number) => value + 1;

    expect(makeFlow(first)).toBe(first);
  });

  it("composes the largest optimized pipeline while preserving the receiver", () => {
    const first = function (this: { offset: number }, value: number) {
      return this.offset + value;
    };
    const rest = Array.from({ length: 8 }, () => (value: number) => value + 1);
    const composed = makeFlow(first, ...rest);

    expect(composed.call({ offset: 2 }, 3)).toBe(13);
  });

  it("composes more than 9 stages through the fallback loop", () => {
    const first = function (this: { offset: number }, value: number) {
      return this.offset + value;
    };
    const rest = Array.from({ length: 9 }, () => (value: number) => value + 1);
    const composed = makeFlow(first, ...rest);

    expect(composed.call({ offset: 2 }, 3)).toBe(14);
  });
});
