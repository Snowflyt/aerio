/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Deferred, Fiber, IO, TestControl } from "../src";
import type { IOHKT } from "../src/IO";

import { it } from "./test-utils";

describe("Deferred.get", () => {
  it.gen("waits for completion and wakes all readers", function* () {
    const deferred = yield* IO.deferred<number>();
    const leftReady = yield* IO.deferred<void>();
    const rightReady = yield* IO.deferred<void>();

    const left = yield* IO.gen(function* () {
      yield* leftReady.pipe(Deferred.complete(void 0 as void));
      return yield* deferred.pipe(Deferred.get);
    }).pipe(IO.fork);

    const right = yield* IO.gen(function* () {
      yield* rightReady.pipe(Deferred.complete(void 0 as void));
      return yield* deferred.pipe(Deferred.get);
    }).pipe(IO.fork);

    yield* leftReady.pipe(Deferred.get);
    yield* rightReady.pipe(Deferred.get);

    expect(yield* deferred.pipe(Deferred.complete(42))).toBe(true);
    expect(yield* Fiber.join(left)).toBe(42);
    expect(yield* Fiber.join(right)).toBe(42);
  });

  it.gen("does not lose completion while a reader is being registered", function* () {
    const program = IO.gen(function* () {
      const deferred = yield* IO.deferred<number>();
      const reader = yield* deferred.pipe(Deferred.get, IO.fork);

      expect(yield* deferred.pipe(Deferred.complete(42))).toBe(true);
      return yield* reader.pipe(Fiber.join);
    });

    for (let seed = 0; seed < 32; seed++)
      expect(
        yield* TestControl.executeEmbed(program, {
          maxOpCountBeforeAutoYield: 1,
          seed,
        }),
      ).toBe(42);
  });
});

describe("Deferred.complete", () => {
  it.gen("succeeds once and keeps the first value", function* () {
    const deferred = yield* IO.deferred<number>();

    expect(yield* deferred.pipe(Deferred.complete(1))).toBe(true);
    expect(yield* deferred.pipe(Deferred.complete(2))).toBe(false);
    expect(yield* deferred.pipe(Deferred.get)).toBe(1);
  });
});

describe("Deferred.imap", () => {
  it.gen("maps both completion and reads", function* () {
    const deferred = yield* IO.deferred<number>();
    const text = deferred.pipe(Deferred.imap<IOHKT>(IO)(String, Number));

    expect(yield* text.pipe(Deferred.complete("42"))).toBe(true);
    expect(yield* deferred.pipe(Deferred.get)).toBe(42);
    expect(yield* text.pipe(Deferred.get)).toBe("42");
  });
});
