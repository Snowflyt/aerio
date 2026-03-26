/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Deferred, Fiber, IO, Ref } from "../src";

import { it } from "./test-utils";

describe("IO.memoize", () => {
  it.gen("reuses the successful result across sequential runs", function* () {
    let calls = 0;

    const memoized = yield* IO.memoize(
      IO.sync(() => {
        calls += 1;
        return calls;
      }),
    );

    expect(yield* memoized).toBe(1);
    expect(yield* memoized).toBe(1);
    expect(calls).toBe(1);
  });

  it.gen("shares an in-flight evaluation across concurrent subscribers", function* () {
    const started = yield* IO.deferred<void>();
    const gate = yield* IO.deferred<void>();
    let calls = 0;

    const memoized = yield* IO.memoize(
      IO.gen(function* () {
        calls += 1;
        yield* started.pipe(Deferred.complete(void 0 as void));
        yield* gate.pipe(Deferred.get);
        return "ok";
      }),
    );

    const left = yield* memoized.pipe(IO.fork);
    yield* started.pipe(Deferred.get);

    const right = yield* memoized.pipe(IO.fork);
    yield* IO.cede();

    expect(calls).toBe(1);

    yield* gate.pipe(Deferred.complete(void 0 as void));

    expect(yield* left.pipe(Fiber.join)).toBe("ok");
    expect(yield* right.pipe(Fiber.join)).toBe("ok");
  });

  it.gen("caches failures across sequential runs", function* () {
    let calls = 0;
    const error = new Error("boom");

    const memoized = yield* IO.memoize(
      IO.sync(() => {
        calls += 1;
        throw error;
      }),
    );

    expect(yield* IO.catch(memoized, IO.of)).toBe(error);
    expect(yield* IO.catch(memoized, IO.of)).toBe(error);
    expect(calls).toBe(1);
  });

  it.gen("keeps the source running while another subscriber remains", function* () {
    const started = yield* IO.deferred<void>();
    const gate = yield* IO.deferred<void>();
    const cancelled = yield* IO.ref(0);
    let calls = 0;

    const memoized = yield* IO.memoize(
      IO.gen(function* () {
        calls += 1;
        yield* started.pipe(Deferred.complete(void 0 as void));
        yield* gate.pipe(Deferred.get);
        return "ok";
      }).pipe(IO.onCancel(cancelled.pipe(Ref.update((n) => n + 1)))),
    );

    const left = yield* memoized.pipe(IO.fork);
    yield* started.pipe(Deferred.get);

    const right = yield* memoized.pipe(IO.fork);
    yield* IO.cede();

    yield* left.pipe(Fiber.cancel);
    expect(yield* cancelled.pipe(Ref.get)).toBe(0);

    yield* gate.pipe(Deferred.complete(void 0 as void));

    expect(yield* right.pipe(Fiber.join)).toBe("ok");
    expect(yield* memoized).toBe("ok");
    expect(calls).toBe(1);
  });

  it.gen("cancels the source and clears the cache when every subscriber cancels", function* () {
    const started = yield* IO.deferred<void>();
    const gate = yield* IO.deferred<void>();
    const cancelled = yield* IO.ref(0);
    let calls = 0;

    const memoized = yield* IO.memoize(
      IO.gen(function* () {
        calls += 1;
        yield* started.pipe(Deferred.complete(void 0 as void));
        yield* gate.pipe(Deferred.get);
        return "ok";
      }).pipe(IO.onCancel(cancelled.pipe(Ref.update((n) => n + 1)))),
    );

    const left = yield* memoized.pipe(IO.fork);
    yield* started.pipe(Deferred.get);

    const right = yield* memoized.pipe(IO.fork);
    yield* IO.cede();

    yield* left.pipe(Fiber.cancel);
    yield* right.pipe(Fiber.cancel);

    expect(yield* cancelled.pipe(Ref.get)).toBe(1);
    expect(calls).toBe(1);

    yield* gate.pipe(Deferred.complete(void 0 as void));

    expect(yield* memoized).toBe("ok");
    expect(calls).toBe(2);
  });
});
