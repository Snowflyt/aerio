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

    const fiber = yield* IO.acquireUseRelease(
      record("acquire").pipe(IO.as("resource")),
      () => IO.never(),
      (resource) => record(`release:${resource}`),
    ).pipe(IO.fork);

    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome.isCancelled()).toBe(true);
    expect(yield* events.pipe(Ref.get)).toEqual(["acquire", "release:resource"]);
  });
});

describe("IO.acquireUseRelease regressions", () => {
  it.gen("releases when the use callback throws", function* () {
    const error = new Error("use construction");
    let releases = 0;
    const program = IO.acquireUseRelease(
      IO.of("resource"),
      () => {
        throw error;
      },
      () =>
        IO.sync(() => {
          releases++;
        }),
    );

    expect(yield* IO.catch(program, IO.of)).toBe(error);
    expect(releases).toBe(1);
  });

  it.gen("skips use when acquisition leaves cancellation pending", function* () {
    let uses = 0;
    let releases = 0;
    const fiber = yield* IO.acquireUseRelease(
      IO.cancelled().pipe(IO.as("resource")),
      () => {
        uses++;
        throw new Error("use construction");
      },
      () =>
        IO.sync(() => {
          releases++;
        }),
    ).pipe(IO.fork);

    expect((yield* fiber.pipe(Fiber.await)).isCancelled()).toBe(true);
    expect(uses).toBe(0);
    expect(releases).toBe(1);
  });

  for (const phase of ["construction", "execution"] as const) {
    it.gen(`does not retry release ${phase} failures after use succeeds`, function* () {
      const error = new Error("release");
      const events: string[] = [];
      const program = IO.acquireUseRelease(
        IO.of("resource"),
        () => IO.sync(() => void events.push("use")),
        () => {
          events.push("release.construct");
          if (phase === "construction") throw error;
          return IO.sync(() => {
            events.push("release.run");
            throw error;
          });
        },
      );

      expect(events).toEqual([]);
      expect(yield* IO.catch(program, IO.of)).toBe(error);
      expect(events).toEqual(
        phase === "construction" ?
          ["use", "release.construct"]
        : ["use", "release.construct", "release.run"],
      );
    });

    it.gen(`preserves the use error when release ${phase} also fails`, function* () {
      const useError = new Error("use");
      const releaseError = new Error("release");
      let releases = 0;
      const program = IO.acquireUseRelease(
        IO.of("resource"),
        () => IO.throw(useError),
        () => {
          releases++;
          if (phase === "construction") throw releaseError;
          return IO.throw(releaseError);
        },
      );

      expect(yield* IO.catch(program, IO.of)).toBe(useError);
      expect(releases).toBe(1);
    });

    it.gen(`awaits outer cancellation cleanup after release ${phase} fails`, function* () {
      const events: string[] = [];
      const program = IO.gen(function* () {
        const started = yield* IO.deferred<undefined>();
        const fiber = yield* IO.acquireUseRelease(
          IO.of("resource"),
          () => started.pipe(Deferred.complete(undefined), IO.zipR(IO.never())),
          () => {
            events.push("release.construct");
            if (phase === "construction") throw new Error("release");
            return IO.sync(() => {
              events.push("release.run");
              throw new Error("release");
            });
          },
        ).pipe(
          IO.onCancel(IO.sleep(10).pipe(IO.zipR(IO.sync(() => void events.push("outer.done"))))),
          IO.fork,
        );

        yield* started.pipe(Deferred.get);
        yield* fiber.pipe(Fiber.cancel);
        events.push("cancel.return");
        expect(events).toEqual(
          phase === "construction" ?
            ["release.construct", "outer.done", "cancel.return"]
          : ["release.construct", "release.run", "outer.done", "cancel.return"],
        );
        expect((yield* fiber.pipe(Fiber.await)).isCancelled()).toBe(true);
      });

      yield* TestControl.executeEmbed(program, { seed: 1, maxOpCountBeforeAutoYield: 1 });
    });
  }

  it.gen("keeps release construction and execution local to each acquisition", function* () {
    let acquisitions = 0;
    const constructed: number[] = [];
    const released: number[] = [];
    const program = IO.acquireUseRelease(
      IO.sync(() => ++acquisitions),
      (resource) => IO.cede().pipe(IO.as(resource)),
      (resource) => {
        constructed.push(resource);
        return IO.sync(() => void released.push(resource));
      },
    );

    expect(constructed).toEqual([]);
    expect(yield* program).toBe(1);
    expect(yield* program).toBe(2);
    expect(yield* IO.all([program, program])).toEqual([3, 4]);
    expect(constructed.toSorted()).toEqual([1, 2, 3, 4]);
    expect(released.toSorted()).toEqual([1, 2, 3, 4]);
  });
});
