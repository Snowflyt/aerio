/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniOutcome, MiniRef, ref, runSync, unsafeRunSync } from "../mini-effect";

describe("guarantee", () => {
  it("runs the finalizer after a success and preserves the value", () => {
    const flag = ref(false);
    const eff = Mini.guarantee(Mini.of(42), MiniRef.set(flag, true));

    expect(unsafeRunSync(eff)).toBe(42);
    expect(unsafeRunSync(MiniRef.get(flag))).toBe(true);
  });

  it("runs the finalizer after a failure and rethrows the original error", () => {
    const flag = ref(false);
    const eff = Mini.guarantee(Mini.throw("boom"), MiniRef.set(flag, true));

    expect(runSync(eff)).toEqual(MiniOutcome.Failed("boom"));
    expect(unsafeRunSync(MiniRef.get(flag))).toBe(true);
  });

  it("runs the finalizer after cancellation", () => {
    const flag = ref(false);
    const eff = Mini.guarantee(Mini.cancelled(), MiniRef.set(flag, true));

    expect(runSync(eff)).toEqual(MiniOutcome.Cancelled());
    expect(unsafeRunSync(MiniRef.get(flag))).toBe(true);
  });

  it("a failing finalizer overrides a success", () => {
    const eff = Mini.guarantee(Mini.of(1), Mini.throw("finalizer-boom"));
    expect(runSync(eff)).toEqual(MiniOutcome.Failed("finalizer-boom"));
  });
});

describe("guaranteeCase", () => {
  it("runs the finalizer with Succeeded and preserves the original value", () => {
    const seen = ref<MiniOutcome<number> | null>(null);
    const eff = Mini.guaranteeCase(Mini.of(42), (outcome) => MiniRef.set(seen, outcome));

    expect(unsafeRunSync(eff)).toBe(42);
    expect(unsafeRunSync(MiniRef.get(seen))?._tag).toBe("Succeeded");
  });

  it("exposes the success value as a re-runnable effect in the Succeeded outcome", () => {
    const inner = ref<unknown>(undefined);
    const eff = Mini.guaranteeCase(Mini.of(42), (outcome) =>
      outcome._tag === "Succeeded" ? MiniRef.set(inner, unsafeRunSync(outcome._0)) : Mini.void(),
    );

    runSync(eff);
    expect(unsafeRunSync(MiniRef.get(inner))).toBe(42);
  });

  it("runs the finalizer with Failed and re-throws the original error", () => {
    const seen = ref<MiniOutcome<unknown> | null>(null);
    const eff = Mini.guaranteeCase(Mini.throw<unknown>("boom"), (outcome) =>
      MiniRef.set(seen, outcome),
    );

    expect(runSync(eff)).toEqual(MiniOutcome.Failed("boom"));
    expect(unsafeRunSync(MiniRef.get(seen))).toEqual(MiniOutcome.Failed("boom"));
  });

  it("runs the finalizer with Cancelled when the effect is cancelled", () => {
    const seen = ref<MiniOutcome<unknown> | null>(null);
    const eff = Mini.guaranteeCase(Mini.cancelled(), (outcome) => MiniRef.set(seen, outcome));

    expect(runSync(eff)).toEqual(MiniOutcome.Cancelled());
    expect(unsafeRunSync(MiniRef.get(seen))).toEqual(MiniOutcome.Cancelled());
  });

  it("observes cancellation through poll inside an uncancellable region", () => {
    const seen = ref<MiniOutcome<unknown> | null>(null);
    const eff = Mini.guaranteeCase(
      Mini.uncancellable((poll) => poll(Mini.cancelled())),
      (outcome) => MiniRef.set(seen, outcome),
    );

    expect(runSync(eff)).toEqual(MiniOutcome.Cancelled());
    expect(unsafeRunSync(MiniRef.get(seen))).toEqual(MiniOutcome.Cancelled());
  });

  it("lets a failed finalizer override a successful value", () => {
    const eff = Mini.guaranteeCase(Mini.of(1), () => Mini.throw("fin-boom"));
    expect(runSync(eff)).toEqual(MiniOutcome.Failed("fin-boom"));
  });

  it("swallows a failed finalizer on the failure path, keeping the original error", () => {
    const eff = Mini.guaranteeCase(Mini.throw("original"), () => Mini.throw("fin-boom"));
    expect(runSync(eff)).toEqual(MiniOutcome.Failed("original"));
  });

  it("runs the finalizer only once for a nested guaranteeCase", () => {
    const count = ref(0);
    const finalizer = () => MiniRef.update(count, (n) => n + 1);
    const eff = Mini.guaranteeCase(Mini.guaranteeCase(Mini.of(1), finalizer), finalizer);

    runSync(eff);
    expect(unsafeRunSync(MiniRef.get(count))).toBe(2);
  });
});

describe("acquireUseRelease", () => {
  it("releases the resource after a successful use and returns the value", () => {
    const released = ref<readonly string[]>([]);
    const acquire = Mini.of("res");
    const use = (r: string) =>
      Mini.as(
        MiniRef.update(released, (xs) => [...xs, `use:${r}`]),
        7,
      );
    const release = (r: string) => MiniRef.update(released, (xs) => [...xs, `release:${r}`]);

    const eff = Mini.acquireUseRelease(acquire, use, release);

    expect(unsafeRunSync(eff)).toBe(7);
    expect(unsafeRunSync(MiniRef.get(released))).toEqual(["use:res", "release:res"]);
  });

  it("releases the resource when use fails and rethrows the original error", () => {
    const released = ref<readonly string[]>([]);
    const acquire = Mini.of("res");
    const use = () => Mini.throw("boom");
    const release = (r: string) => MiniRef.update(released, (xs) => [...xs, `release:${r}`]);

    const eff = Mini.acquireUseRelease(acquire, use, release);

    expect(runSync(eff)).toEqual(MiniOutcome.Failed("boom"));
    expect(unsafeRunSync(MiniRef.get(released))).toEqual(["release:res"]);
  });

  it("releases the resource when use is cancelled", () => {
    const released = ref<readonly string[]>([]);
    const acquire = Mini.of("res");
    const use = () => Mini.cancelled();
    const release = (r: string) => MiniRef.update(released, (xs) => [...xs, `release:${r}`]);

    const eff = Mini.acquireUseRelease(acquire, use, release);

    expect(runSync(eff)).toEqual(MiniOutcome.Cancelled());
    expect(unsafeRunSync(MiniRef.get(released))).toEqual(["release:res"]);
  });

  it("does not run release when acquire itself fails", () => {
    const released = ref<readonly string[]>([]);
    const acquire = Mini.throw("acquire-boom");
    const use = () => Mini.of(1);
    const release = (r: string) => MiniRef.update(released, (xs) => [...xs, `release:${r}`]);

    const eff = Mini.acquireUseRelease(acquire, use, release);

    expect(runSync(eff)).toEqual(MiniOutcome.Failed("acquire-boom"));
    expect(unsafeRunSync(MiniRef.get(released))).toEqual([]);
  });
});
