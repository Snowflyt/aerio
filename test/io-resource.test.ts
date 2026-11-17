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

describe("IO.acquireUseRelease", () => {
  it.gen("releases after successful use", function* () {
    const events = yield* IO.ref<string[]>([]);
    const record = (event: string) => events.pipe(Ref.update((xs) => [...xs, event]));

    const result = yield* IO.acquireUseRelease(
      record("acquire").pipe(IO.as("resource")),
      (resource) => record(`use:${resource}`).pipe(IO.as(42)),
      (resource) => record(`release:${resource}`),
    );

    expect(result).toBe(42);
    expect(yield* events.pipe(Ref.get)).toEqual(["acquire", "use:resource", "release:resource"]);
  });

  it.gen("releases when the use phase is cancelled", function* () {
    const events = yield* IO.ref<string[]>([]);
    const record = (event: string) => events.pipe(Ref.update((xs) => [...xs, event]));

    const started = yield* IO.deferred<undefined>();
    const fiber = yield* IO.acquireUseRelease(
      record("acquire").pipe(IO.as("resource")),
      () => started.pipe(Deferred.complete(undefined), IO.zipR(IO.never())),
      (resource) => record(`release:${resource}`),
    ).pipe(IO.fork);

    yield* started.pipe(Deferred.get);
    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome.isCancelled()).toBe(true);
    expect(yield* events.pipe(Ref.get)).toEqual(["acquire", "release:resource"]);
  });
});
