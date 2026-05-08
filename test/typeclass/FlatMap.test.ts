/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniOutcome, MiniRef, ref, runSync, unsafeRunSync } from "../test-utils/mini-effect";

describe("ap", () => {
  it("applies the function inside the left effect to the value inside the right", () => {
    expect(
      unsafeRunSync(
        Mini.ap(
          Mini.of((a: number) => a + 1),
          Mini.of(41),
        ),
      ),
    ).toBe(42);
  });
});

describe("product", () => {
  it("combines both values into a tuple", () => {
    expect(unsafeRunSync(Mini.product(Mini.of(1), Mini.of("a")))).toEqual([1, "a"]);
  });
});

describe("productR", () => {
  it("keeps only the right value", () => {
    expect(unsafeRunSync(Mini.productR(Mini.of(1), Mini.of("a")))).toBe("a");
  });
});

describe("flatten", () => {
  it("flattens a nested effect", () => {
    expect(unsafeRunSync(Mini.flatten(Mini.of(Mini.of(42))))).toBe(42);
  });
});

describe("flatTap", () => {
  it("runs the derived effect and preserves the original value", () => {
    const seen = ref<number | null>(null);

    expect(unsafeRunSync(Mini.flatTap(Mini.of(42), (a) => MiniRef.set(seen, a)))).toBe(42);
    expect(unsafeRunSync(MiniRef.get(seen))).toBe(42);
  });
});

describe("forever", () => {
  it("repeats the effect until it fails", () => {
    let count = 0;
    const eff = Mini.forever(
      Mini.suspend(() => {
        count++;
        return count >= 3 ? Mini.throw("stop") : Mini.void();
      }),
    );

    expect(runSync(eff)).toEqual(MiniOutcome.Failed("stop"));
    expect(count).toBe(3);
  });
});
