/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Fiber, IO, Ref } from "../src";

import { it } from "./test-utils";

describe("Fiber.join", () => {
  it.gen("returns the result of the child fiber", function* () {
    const fiber = yield* IO.of(42).pipe(IO.fork);

    expect(yield* fiber.pipe(Fiber.join)).toBe(42);
  });
});

describe("Fiber.await", () => {
  it.gen("returns a succeeded outcome for a successful child", function* () {
    const fiber = yield* IO.of(42).pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome.isSucceeded()).toBe(true);

    if (outcome.isSucceeded()) {
      expect(yield* outcome._0).toBe(42);
    }
  });
});

describe("Fiber.cancel", () => {
  it.gen("cancels the child fiber through the handle", function* () {
    const cancelled = yield* IO.ref(false);
    const fiber = yield* IO.never().pipe(IO.onCancel(cancelled.pipe(Ref.set(true))), IO.fork);

    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome.isCancelled()).toBe(true);
    expect(yield* cancelled.pipe(Ref.get)).toBe(true);
  });
});
