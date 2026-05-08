/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import {
  Mini,
  MiniOutcome,
  MiniRef,
  ref,
  runPromise,
  unsafeRunPromise,
  unsafeRunSync,
} from "../test-utils/mini-effect";

/** A {@linkcode Mini} effect that succeeds with `a` after `ms` milliseconds. */
const after = <A>(ms: number, a: A): Mini<A> => Mini.productR(Mini.sleep(ms), Mini.of(a));

/** A {@linkcode Mini} effect that fails with `e` after `ms` milliseconds. */
const failAfter = (ms: number, e: unknown): Mini<never> =>
  Mini.productR(Mini.sleep(ms), Mini.throw(e));

describe("race2", () => {
  it("returns the value of the faster effect", async () => {
    await expect(unsafeRunPromise(Mini.race2(after(0, "left"), after(50, "right")))).resolves.toBe(
      "left",
    );
    await expect(unsafeRunPromise(Mini.race2(after(50, "left"), after(0, "right")))).resolves.toBe(
      "right",
    );
  });

  it("fails with the winner's error", async () => {
    expect(await runPromise(Mini.race2(failAfter(0, "boom"), after(50, "right")))).toEqual(
      MiniOutcome.Failed("boom"),
    );
  });

  it("cancels the loser", async () => {
    const loserFinalized = ref(false);
    const loser = Mini.asyncCancellable<string>(() => MiniRef.set(loserFinalized, true));

    await expect(unsafeRunPromise(Mini.race2(loser, after(0, "winner")))).resolves.toBe("winner");
    expect(unsafeRunSync(MiniRef.get(loserFinalized))).toBe(true);
  });
});

describe("race2Outcome", () => {
  it("returns the winner's Succeeded outcome", async () => {
    const outcome = await unsafeRunPromise(Mini.race2Outcome(after(0, 1), after(50, 2)));

    expect(outcome._tag).toBe("Succeeded");
    expect(unsafeRunSync((outcome as { _0: Mini<number> })._0)).toBe(1);
  });

  it("returns the winner's Failed outcome", async () => {
    const outcome = await unsafeRunPromise(Mini.race2Outcome(failAfter(0, "boom"), after(50, 2)));

    expect(outcome._tag).toBe("Failed");
    expect((outcome as { _0: string })._0).toBe("boom");
  });
});

describe("both", () => {
  it("returns a tuple of both values, in order regardless of completion order", async () => {
    await expect(unsafeRunPromise(Mini.both(after(20, "a"), after(0, "b")))).resolves.toEqual([
      "a",
      "b",
    ]);
  });

  it("fails with the first error and cancels the other effect", async () => {
    const otherFinalized = ref(false);
    const other = Mini.asyncCancellable<string>(() => MiniRef.set(otherFinalized, true));

    expect(await runPromise(Mini.both(failAfter(0, "boom"), other))).toEqual(
      MiniOutcome.Failed("boom"),
    );
    expect(unsafeRunSync(MiniRef.get(otherFinalized))).toBe(true);
  });
});

describe("bothOutcome", () => {
  it("returns both outcomes when both succeed", async () => {
    const [left, right] = await unsafeRunPromise(Mini.bothOutcome(after(20, "a"), after(0, "b")));

    expect(left._tag).toBe("Succeeded");
    expect(unsafeRunSync((left as { _0: Mini<string> })._0)).toBe("a");
    expect(right._tag).toBe("Succeeded");
    expect(unsafeRunSync((right as { _0: Mini<string> })._0)).toBe("b");
  });

  it("collects a failure as an outcome without failing the pair", async () => {
    const [left, right] = await unsafeRunPromise(
      Mini.bothOutcome(failAfter(0, "boom"), after(20, "b")),
    );

    expect(left._tag).toBe("Failed");
    expect((left as { _0: string })._0).toBe("boom");
    expect(right._tag).toBe("Succeeded");
    expect(unsafeRunSync((right as { _0: Mini<string> })._0)).toBe("b");
  });
});
