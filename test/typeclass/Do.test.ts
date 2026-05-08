/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniRef, ref, unsafeRunSync } from "../test-utils/mini-effect";

describe("do", () => {
  it("threads the context through bind/let steps and returns the final value", () => {
    const eff = Mini.do(
      Mini.bind("a", () => Mini.of(1)),
      Mini.bind("b", ({ a }) => Mini.of(a + 1)),
      Mini.let("c", ({ a, b }) => a + b),
      Mini.return(({ a, b, c }) => a + b + c),
    );

    expect(unsafeRunSync(eff)).toBe(6);
  });

  it("binds constant effects with bindV and constant values with letV", () => {
    const eff = Mini.do(
      Mini.bindV("a", Mini.of(1)),
      Mini.letV("b", 2),
      Mini.return(({ a, b }) => a + b),
    );

    expect(unsafeRunSync(eff)).toBe(3);
  });

  it("runs side effects with also/alsoV without changing the context", () => {
    const seen = ref<number[]>([]);
    const eff = Mini.do(
      Mini.bind("a", () => Mini.of(1)),
      Mini.also(({ a }) => MiniRef.update(seen, (prev) => [...prev, a])),
      Mini.alsoV(MiniRef.update(seen, (prev) => [...prev, 99])),
      Mini.return(({ a }) => a),
    );

    expect(unsafeRunSync(eff)).toBe(1);
    expect(unsafeRunSync(MiniRef.get(seen))).toEqual([1, 99]);
  });

  it("returns the final effect’s value with returnM", () => {
    const eff = Mini.do(
      Mini.bind("a", () => Mini.of(21)),
      Mini.returnM(({ a }) => Mini.of(a * 2)),
    );

    expect(unsafeRunSync(eff)).toBe(42);
  });

  it("succeeds with void when there is no return step", () => {
    const eff = Mini.do(Mini.bind("a", () => Mini.of(1)));

    expect(unsafeRunSync(eff)).toBeUndefined();
  });
});
