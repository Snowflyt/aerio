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
  MiniDeferred,
  MiniOutcome,
  MiniRef,
  deferred as makeDeferred,
  ref,
  runPromise,
  unsafeRunPromise,
  unsafeRunSync,
} from "../test-utils/mini-effect";

describe("deferred", () => {
  it("returns the completed value from get", () => {
    const deferred = makeDeferred<number>();

    expect(unsafeRunSync(MiniDeferred.complete(deferred, 42))).toBe(true);
    expect(unsafeRunSync(MiniDeferred.get(deferred))).toBe(42);
  });

  it("completes at most once: the second complete returns false", () => {
    const deferred = makeDeferred<number>();

    expect(unsafeRunSync(MiniDeferred.complete(deferred, 1))).toBe(true);
    expect(unsafeRunSync(MiniDeferred.complete(deferred, 2))).toBe(false);
    expect(unsafeRunSync(MiniDeferred.get(deferred))).toBe(1);
  });

  it("blocks get until the deferred is completed", async () => {
    const deferred = makeDeferred<number>();
    const completer = Mini.asyncUncancellable<void>((succeed) => {
      setTimeout(() => {
        expect(unsafeRunSync(MiniDeferred.complete(deferred, 42))).toBe(true);
        succeed(undefined);
      }, 0);
    });

    await expect(
      unsafeRunPromise(Mini.productR(completer, MiniDeferred.get(deferred))),
    ).resolves.toBe(42);
  });
});

describe("asyncUncancellable", () => {
  it("succeeds with the value passed to succeed", async () => {
    const eff = Mini.asyncUncancellable<number>((succeed) => {
      setTimeout(() => succeed(42), 0);
    });

    await expect(unsafeRunPromise(eff)).resolves.toBe(42);
  });

  it("fails with the error passed to fail", async () => {
    const eff = Mini.asyncUncancellable<number>((_, fail) => {
      setTimeout(() => fail("boom"), 0);
    });

    expect(await runPromise(eff)).toEqual(MiniOutcome.Failed("boom"));
  });

  it("only considers the first invocation of succeed", async () => {
    const eff = Mini.asyncUncancellable<number>((succeed) => {
      setTimeout(() => {
        succeed(1);
        succeed(2);
      }, 0);
    });

    await expect(unsafeRunPromise(eff)).resolves.toBe(1);
  });
});

describe("asyncCancellable", () => {
  it("succeeds with the value passed to succeed", async () => {
    const eff = Mini.asyncCancellable<number>((succeed) => {
      setTimeout(() => succeed(42), 0);
      return Mini.void();
    });

    await expect(unsafeRunPromise(eff)).resolves.toBe(42);
  });

  it("fails with the error passed to fail", async () => {
    const eff = Mini.asyncCancellable<number>((_, fail) => {
      setTimeout(() => fail("boom"), 0);
      return Mini.void();
    });

    expect(await runPromise(eff)).toEqual(MiniOutcome.Failed("boom"));
  });

  it("runs the finalizer when cancelled", async () => {
    const finalized = ref(false);
    const eff = Mini.asyncCancellable<never>(() => MiniRef.set(finalized, true));

    await expect(unsafeRunPromise(Mini.race2(eff, Mini.of("winner")))).resolves.toBe("winner");
    expect(unsafeRunSync(MiniRef.get(finalized))).toBe(true);
  });
});

describe("promise", () => {
  it("succeeds with the resolved value", async () => {
    await expect(unsafeRunPromise(Mini.promise(() => Promise.resolve(42)))).resolves.toBe(42);
  });

  it("fails with the rejection reason", async () => {
    const error = new Error("boom");

    expect(await runPromise(Mini.promise(() => Promise.reject(error)))).toEqual(
      MiniOutcome.Failed(error),
    );
  });

  it("passes an abort signal to the callback", async () => {
    let received: unknown;
    const eff = Mini.promise((signal) => {
      received = signal;
      return Promise.resolve(1);
    });

    await expect(unsafeRunPromise(eff)).resolves.toBe(1);
    expect(received).toBeInstanceOf(AbortSignal);
  });
});
