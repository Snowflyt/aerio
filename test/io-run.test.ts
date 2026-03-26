/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { CancellationError, Fiber, IO } from "../src";

describe("IO.unsafeRunFork", () => {
  it("returns a fiber whose result can be joined", async () => {
    const fiber = IO.unsafeRunFork(IO.of(42));

    await expect(IO.unsafeRunPromise(Fiber.join(fiber))).resolves.toBe(42);
  });
});

describe("IO.unsafeRun", () => {
  it("invokes the completion callback for synchronous and asynchronous success", async () => {
    let syncValue = -1;

    IO.unsafeRun(IO.of(42), (outcome) => {
      if (outcome._tag === "Succeeded") syncValue = IO.unsafeRunSync(outcome._0);
    });

    expect(syncValue).toBe(42);

    const asyncValue = await new Promise<number>((resolve, reject) => {
      IO.unsafeRun(
        IO.promise(() => Promise.resolve(24)),
        (outcome) => {
          if (outcome._tag === "Succeeded") {
            resolve(IO.unsafeRunSync(outcome._0));
          } else {
            reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
          }
        },
      );
    });

    expect(asyncValue).toBe(24);
  });
});

describe("IO.unsafeRunSync", () => {
  it("returns synchronous results", () => {
    expect(IO.unsafeRunSync(IO.of(42))).toBe(42);
  });

  it("throws failures", () => {
    const error = new Error("boom");

    let thrown: unknown;

    try {
      IO.unsafeRunSync(IO.throw(error));
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBe(error);
  });

  it("throws TypeError for asynchronous computations", () => {
    expect(() => IO.unsafeRunSync(IO.promise(() => Promise.resolve(42)))).toThrow(TypeError);
  });
});

describe("IO.unsafeRunAsync", () => {
  it("invokes the completion callback for success and failure", async () => {
    const success = new Promise<number>((resolve, reject) => {
      IO.unsafeRunAsync(
        IO.promise(() => Promise.resolve(42)),
        (outcome) => {
          if (outcome._tag === "Succeeded") {
            resolve(IO.unsafeRunSync(outcome._0));
          } else {
            reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
          }
        },
      );
    });

    const error = new Error("boom");
    const failure = new Promise<unknown>((resolve, reject) => {
      IO.unsafeRunAsync(IO.throw(error), (outcome) => {
        if (outcome._tag === "Failed") {
          resolve(outcome._0);
        } else {
          reject(
            outcome._tag === "Succeeded" ? IO.unsafeRunSync(outcome._0) : new CancellationError(),
          );
        }
      });
    });

    await expect(success).resolves.toBe(42);
    await expect(failure).resolves.toBe(error);
  });
});

describe("IO.unsafeRunPromise", () => {
  it("resolves successes and rejects failures", async () => {
    await expect(IO.unsafeRunPromise(IO.of(42))).resolves.toBe(42);

    const error = new Error("boom");

    await expect(IO.unsafeRunPromise(IO.throw(error))).rejects.toBe(error);
  });
});

describe("IO.unsafeRunPromiseCancellable", () => {
  it("resolves when not cancelled", async () => {
    const { promise } = IO.unsafeRunPromiseCancellable(IO.of(42));

    await expect(promise).resolves.toBe(42);
  });

  it("rejects with CancellationError when cancelled", async () => {
    let cancelled = false;

    const action = IO.never().pipe(
      IO.onCancel(
        IO.sync(() => {
          cancelled = true;
        }),
      ),
    );

    const { cancel, promise } = IO.unsafeRunPromiseCancellable(action);
    const rejection = expect(promise).rejects.toBeInstanceOf(CancellationError);

    await cancel();
    await rejection;

    expect(cancelled).toBe(true);
  });
});
