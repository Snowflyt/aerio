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

describe("IO.fork", () => {
  it.gen("fork cancels child when parent completes", function* () {
    const cancelled = yield* IO.ref(false);
    const fiber = yield* IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.fork, IO.fork);
    yield* Fiber.await(fiber);
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it("inherits preferSync under unsafeRunSync", () => {
    let child = IO.of(0);

    for (let i = 0; i < 4096; ++i) child = child.pipe(IO.map((n) => n + 1));

    const program = child.pipe(IO.fork, IO.flatMap(Fiber.join));

    expect(IO.unsafeRunSync(program)).toBe(4096);
  });
});

describe("IO.forkGlobal", () => {
  it.gen("forkGlobal does not cancel child when parent completes", function* () {
    const cancelled = yield* IO.ref(false);
    const fiber = yield* IO.never().pipe(
      IO.onCancel(Ref.set(cancelled, true)),
      IO.forkGlobal,
      IO.fork,
    );
    yield* Fiber.await(fiber);
    expect(yield* Ref.get(cancelled)).toBe(false);
  });
});
