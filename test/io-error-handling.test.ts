/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Fiber, IO } from "../src";

import { it } from "./test-utils";

describe("IO.throw", () => {
  it.gen("fails with the provided error", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(IO.throw(error), IO.of);

    expect(result).toBe(error);
  });
});

describe("IO.catch", () => {
  it.gen("calls the handler without a receiver and with one argument on each run", function* () {
    const error = new Error("boom");
    const calls: unknown[][] = [];
    const program = IO.catch(IO.throw(error), function (this: unknown, ...args: [unknown]) {
      calls.push([this, ...args]);
      return IO.of(42);
    });

    expect(calls).toEqual([]);
    expect(yield* program).toBe(42);
    expect(yield* program).toBe(42);
    expect(calls).toEqual([
      [undefined, error],
      [undefined, error],
    ]);
  });

  it.gen("recovers failures and leaves successes untouched", function* () {
    const error = new Error("boom");

    const recovered = yield* IO.catch(IO.throw(error), (e) => IO.of((e as Error).message));
    const kept = yield* IO.catch(IO.of(42), () => IO.of(0));

    expect(recovered).toBe("boom");
    expect(kept).toBe(42);
  });

  it.gen("fails with the recovery error when the handler throws", function* () {
    const original = new Error("boom");
    const recovery = new Error("recovery boom");

    const result = yield* IO.catch(
      IO.catch(IO.throw(original), () => {
        throw recovery;
      }),
      IO.of,
    );

    expect(result).toBe(recovery);
  });
});

describe("IO.ignore", () => {
  it.gen("discards both success values and failures", function* () {
    const error = new Error("boom");

    expect(yield* IO.of(42).pipe(IO.ignore)).toBeUndefined();
    expect(yield* IO.throw(error).pipe(IO.ignore)).toBeUndefined();
  });

  it.gen("preserves cancellation", function* () {
    const fiber = yield* IO.cancelled().pipe(IO.ignore, IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });
});
