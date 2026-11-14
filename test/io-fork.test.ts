/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Deferred, Fiber, IO, Ref, TestControl } from "../src";

import { it } from "./test-utils";

describe("IO.fork", () => {
  for (const exit of ["success", "failure", "cancellation"] as const) {
    it.gen(`cancels all children and awaits their cleanup on ${exit}`, function* () {
      const events: string[] = [];
      const finishParent = yield* IO.deferred<void>();
      const releaseA = yield* IO.deferred<void>();
      const releaseB = yield* IO.deferred<void>();
      const error = new Error("parent failed");
      const record = (event: string) => IO.sync(() => void events.push(event));

      const child = (name: string, release: IO<void>) =>
        IO.never().pipe(
          IO.onCancel(
            record(`${name}:start`).pipe(IO.andThen(release), IO.andThen(record(`${name}:end`))),
          ),
        );
      const control = yield* TestControl.execute(
        IO.gen(function* () {
          yield* IO.gen(function* () {
            yield* child("a", releaseA.pipe(Deferred.get)).pipe(IO.fork);
            yield* child("b", releaseB.pipe(Deferred.get)).pipe(IO.fork);
          }).pipe(IO.onCancel(record("exited-scope")));

          yield* finishParent.pipe(Deferred.get);
          if (exit === "failure") return yield* IO.throw(error);
          return "done";
        }),
        { seed: 1 },
      );

      try {
        yield* control.tick();
        expect(events).toEqual([]);
        expect(yield* control.result).toBeNull();

        if (exit === "cancellation") yield* control.cancel();
        else yield* finishParent.pipe(Deferred.complete(void 0 as void));
        yield* control.tick();

        expect([...events].sort()).toEqual(["a:start", "b:start"]);
        expect(yield* control.result).toBeNull();

        yield* releaseB.pipe(Deferred.complete(void 0 as void));
        yield* control.tick();

        expect([...events].sort()).toEqual(["a:start", "b:end", "b:start"]);
        expect(yield* control.result).toBeNull();

        yield* releaseA.pipe(Deferred.complete(void 0 as void));
        yield* control.tick();

        expect([...events].sort()).toEqual(["a:end", "a:start", "b:end", "b:start"]);
        expect(yield* control.result).toEqual(
          expect.objectContaining(
            exit === "success" ? { _tag: "Succeeded", _0: "done" }
            : exit === "failure" ? { _tag: "Failed", _0: error }
            : { _tag: "Cancelled" },
          ),
        );
      } finally {
        yield* finishParent.pipe(Deferred.complete(void 0 as void));
        yield* releaseA.pipe(Deferred.complete(void 0 as void));
        yield* releaseB.pipe(Deferred.complete(void 0 as void));
        yield* control.cancel();
        yield* control.tick();
      }
    });
  }

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
