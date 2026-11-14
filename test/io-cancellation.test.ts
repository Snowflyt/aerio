/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Fiber, IO, Ref } from "../src";
import { CancellationError } from "../src/errors";

import { it } from "./test-utils";

describe("IO.cancelled", () => {
  it.gen("produces a cancelled outcome when awaited", function* () {
    const fiber = yield* IO.cancelled().pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });
});

describe("IO.onCancel", () => {
  it.gen("runs the finalizer only when cancellation is observed", function* () {
    const cancelled = yield* IO.ref(false);
    const completed = yield* IO.ref(false);

    const fiber = yield* IO.never().pipe(IO.onCancel(cancelled.pipe(Ref.set(true))), IO.fork);
    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome._tag).toBe("Cancelled");
    expect(yield* cancelled.pipe(Ref.get)).toBe(true);

    yield* IO.of("ok").pipe(IO.onCancel(completed.pipe(Ref.set(true))), IO.asVoid);

    expect(yield* completed.pipe(Ref.get)).toBe(false);
  });

  it.gen("continues unwinding cancellation when a finalizer throws", function* () {
    const ranLaterFinalizer = yield* IO.ref(false);

    const fiber = yield* IO.never().pipe(
      IO.onCancel(ranLaterFinalizer.pipe(Ref.set(true))),
      IO.onCancel(
        IO.sync(() => {
          throw new Error("finalizer boom");
        }),
      ),
      IO.fork,
    );

    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
    expect(yield* ranLaterFinalizer.pipe(Ref.get)).toBe(true);
  });
});

describe("IO.uncancellable", () => {
  it("masks cancellation unless polling is used", async () => {
    let finalizerRuns = 0;

    const masked = IO.uncancellable(() =>
      IO.asyncCancellable<string>((succeed) => {
        const timeoutId = setTimeout(() => succeed("done"), 20);

        return IO.sync(() => {
          finalizerRuns += 1;
          clearTimeout(timeoutId);
        });
      }),
    );

    const maskedRun = IO.unsafeRunPromiseCancellable(masked);
    await maskedRun.cancel();
    await expect(maskedRun.promise).resolves.toBe("done");
    expect(finalizerRuns).toBe(0);

    const polled = IO.uncancellable((poll) =>
      poll(
        IO.asyncCancellable<string>((succeed) => {
          const timeoutId = setTimeout(() => succeed("done"), 20);

          return IO.sync(() => {
            finalizerRuns += 1;
            clearTimeout(timeoutId);
          });
        }),
      ),
    );

    const polledRun = IO.unsafeRunPromiseCancellable(polled);
    const rejection = expect(polledRun.promise).rejects.toBeInstanceOf(CancellationError);

    await polledRun.cancel();
    await rejection;

    expect(finalizerRuns).toBe(1);
  });
});

describe("IO.guarantee", () => {
  it.gen("runs the finalizer after success, failure, and cancellation", function* () {
    const events = yield* IO.ref<string[]>([]);
    const record = (event: string) => events.pipe(Ref.update((xs) => [...xs, event]));

    const success = yield* IO.of("ok").pipe(IO.guarantee(record("success-finalizer")));
    expect(success).toBe("ok");

    const error = new Error("boom");
    const failure = yield* IO.catch(
      IO.throw(error).pipe(IO.guarantee(record("failure-finalizer"))),
      IO.of,
    );
    expect(failure).toBe(error);

    const fiber = yield* IO.never().pipe(IO.guarantee(record("cancel-finalizer")), IO.fork);
    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome._tag).toBe("Cancelled");

    expect(yield* events.pipe(Ref.get)).toEqual([
      "success-finalizer",
      "failure-finalizer",
      "cancel-finalizer",
    ]);
  });
});

describe("IO.guarantee regressions", () => {
  it.gen("does not retry a failed suspended finalizer", function* () {
    const error = new Error("cleanup");
    let constructions = 0;
    let runs = 0;
    const finalizer = IO.suspend(() => {
      constructions++;
      return IO.sync(() => {
        runs++;
        throw error;
      });
    });

    expect(yield* IO.catch(IO.of(42).pipe(IO.guarantee(finalizer)), IO.of)).toBe(error);
    expect(constructions).toBe(1);
    expect(runs).toBe(1);
  });

  it.gen("preserves the source error when the finalizer also fails", function* () {
    const sourceError = new Error("source");
    const finalizerError = new Error("finalizer");
    const error = yield* IO.catch(
      IO.throw(sourceError).pipe(IO.guarantee(IO.throw(finalizerError))),
      IO.of,
    );

    expect(error).toBe(sourceError);
  });
});

describe("IO.guaranteeCase", () => {
  it.gen("observes success and preserves the value", function* () {
    const tags = yield* IO.ref<string[]>([]);

    const value = yield* IO.of(42).pipe(
      IO.guaranteeCase((outcome) =>
        IO.gen(function* () {
          yield* tags.pipe(Ref.update((xs) => [...xs, outcome._tag]));
          expect(outcome.isSucceeded()).toBe(true);
          expect(yield* (outcome as { _0: IO<number> })._0).toBe(42);
        }),
      ),
    );

    expect(value).toBe(42);
    expect(yield* tags.pipe(Ref.get)).toEqual(["Succeeded"]);
  });

  it.gen("observes failure and preserves the source error", function* () {
    const sourceError = new Error("source");
    const finalizerError = new Error("finalizer");
    const tags = yield* IO.ref<string[]>([]);

    const error = yield* IO.catch(
      IO.throw(sourceError).pipe(
        IO.guaranteeCase((outcome) =>
          IO.flatten(
            IO.gen(function* () {
              yield* tags.pipe(Ref.update((xs) => [...xs, outcome._tag]));
              expect(outcome.isFailed()).toBe(true);
              if (outcome.isFailed()) expect(outcome._0).toBe(sourceError);
              return IO.throw(finalizerError);
            }),
          ),
        ),
      ),
      IO.of,
    );

    expect(error).toBe(sourceError);
    expect(yield* tags.pipe(Ref.get)).toEqual(["Failed"]);
  });

  it("uses a failing success finalizer as the result error", async () => {
    const finalizerError = new Error("finalizer");

    await expect(
      IO.unsafeRunPromise(IO.of(42).pipe(IO.guaranteeCase(() => IO.throw(finalizerError)))),
    ).rejects.toBe(finalizerError);
  });

  it("handles a synchronously thrown finalizer callback", async () => {
    const successFinalizerError = new Error("success finalizer");
    const sourceError = new Error("source");

    await expect(
      IO.unsafeRunPromise(
        IO.of(42).pipe(
          IO.guaranteeCase(() => {
            throw successFinalizerError;
          }),
        ),
      ),
    ).rejects.toBe(successFinalizerError);

    await expect(
      IO.unsafeRunPromise(
        IO.throw(sourceError).pipe(
          IO.guaranteeCase(() => {
            throw new Error("ignored finalizer");
          }),
        ),
      ),
    ).rejects.toBe(sourceError);
  });

  it.gen("can be reused sequentially and concurrently", function* () {
    const runs = yield* IO.ref(0);
    const effect = IO.of(1).pipe(IO.guaranteeCase(() => runs.pipe(Ref.update((n) => n + 1))));

    expect(yield* effect).toBe(1);
    expect(yield* effect).toBe(1);
    expect(yield* IO.all([effect, effect])).toEqual([1, 1]);
    expect(yield* runs.pipe(Ref.get)).toBe(4);
  });

  it.gen("observes cancellation exactly once in innermost-first order", function* () {
    const events = yield* IO.ref<string[]>([]);

    const fiber = yield* IO.never().pipe(
      IO.guaranteeCase((outcome) =>
        IO.gen(function* () {
          yield* events.pipe(Ref.update((xs) => [...xs, `inner:${outcome._tag}`]));
          throw new Error("ignored cancellation finalizer failure");
        }),
      ),
      IO.guaranteeCase((outcome) =>
        events.pipe(Ref.update((xs) => [...xs, `outer:${outcome._tag}`])),
      ),
      IO.fork,
    );

    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome.isCancelled()).toBe(true);
    expect(yield* events.pipe(Ref.get)).toEqual(["inner:Cancelled", "outer:Cancelled"]);
  });

  it("masks and awaits an asynchronous cancellation finalizer", async () => {
    const events: string[] = [];
    const run = IO.unsafeRunPromiseCancellable(
      IO.never().pipe(
        IO.guaranteeCase((outcome) =>
          IO.sync(() => void events.push(`start:${outcome._tag}`)).pipe(
            IO.zipR(IO.sleep(20)),
            IO.zipR(IO.sync(() => void events.push(`end:${outcome._tag}`))),
          ),
        ),
      ),
    );
    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await run.cancel();
    await rejection;

    expect(events).toEqual(["start:Cancelled", "end:Cancelled"]);
  });

  it("masks and awaits an asynchronous success finalizer", async () => {
    const events: string[] = [];
    let startFinalizer!: () => void;
    const finalizerStarted = new Promise<void>((resolve) => {
      startFinalizer = resolve;
    });
    const run = IO.unsafeRunPromiseCancellable(
      IO.of(42).pipe(
        IO.guaranteeCase((outcome) =>
          IO.sync(() => {
            events.push(`start:${outcome._tag}`);
            startFinalizer();
          }).pipe(
            IO.zipR(IO.sleep(20)),
            IO.zipR(IO.sync(() => void events.push(`end:${outcome._tag}`))),
          ),
        ),
      ),
    );

    await finalizerStarted;
    await run.cancel();

    await expect(run.promise).resolves.toBe(42);
    expect(events).toEqual(["start:Succeeded", "end:Succeeded"]);
  });
});
