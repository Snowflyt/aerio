/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import type { IOFiber, IOOutcome } from "../src";
import { Fiber, IO, Ref, TestControl } from "../src";
import { CancellationError } from "../src/errors";

import { it } from "./test-utils";

describe("IO.both", () => {
  it.gen("returns both success values", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.both(IO.sleep(20).pipe(IO.as("left")), IO.sleep(10).pipe(IO.as("right"))),
    );

    expect(result).toEqual(["left", "right"]);
  });

  it.gen("cancels the other branch when one branch fails", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.catch(
      IO.both(
        IO.throw("boom"),
        IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as("right")),
      ),
      IO.of,
    );

    expect(result).toBe("boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("cancels when the remaining branch is cancelled after the first success", function* () {
    const control = yield* TestControl.execute(
      IO.both(IO.of("left"), IO.cancelled().pipe(IO.delay(10))),
    );

    yield* control.tick();
    expect(yield* control.result).toBeNull();

    yield* control.advance(10);
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Cancelled" });
  });
});

describe("IO.bothOutcome", () => {
  it.gen("collects both outcomes without short-circuiting", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.bothOutcome(IO.throw("boom"), IO.sleep(10).pipe(IO.as("ok"))),
    );

    expect(result[0]._tag).toBe("Failed");
    if (result[0]._tag !== "Failed") throw new Error("Expected left outcome to fail");
    expect(result[0]._0).toBe("boom");

    expect(result[1]._tag).toBe("Succeeded");
    if (result[1]._tag !== "Succeeded") throw new Error("Expected right outcome to succeed");
    expect(yield* result[1]._0).toBe("ok");
  });

  it.gen("waits for the left outcome when the right branch completes first", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.bothOutcome(IO.sleep(10).pipe(IO.as("left")), IO.throw("boom")),
    );

    expect(result[0]._tag).toBe("Succeeded");
    if (result[0]._tag !== "Succeeded") throw new Error("Expected left outcome to succeed");
    expect(yield* result[0]._0).toBe("left");

    expect(result[1]._tag).toBe("Failed");
    if (result[1]._tag !== "Failed") throw new Error("Expected right outcome to fail");
    expect(result[1]._0).toBe("boom");
  });
});

const collectionConcurrency = [
  ["IO.all", (inputs: Iterable<IO<unknown>>) => IO.all(inputs)],
  ["IO.allOutcome", (inputs: Iterable<IO<unknown>>) => IO.allOutcome(inputs)],
  ["IO.any", (inputs: Iterable<IO<unknown>>) => IO.any(inputs)],
  ["IO.anyOrdered", (inputs: Iterable<IO<unknown>>) => IO.anyOrdered(inputs)],
  ["IO.race", (inputs: Iterable<IO<unknown>>) => IO.race(inputs)],
  ["IO.raceOutcome", (inputs: Iterable<IO<unknown>>) => IO.raceOutcome(inputs)],
] as const;

describe.each(collectionConcurrency)("%s producer failures", (_, combine) => {
  it("preserves undefined iterator failures and cancels yielded children", async () => {
    let cancelled = false;
    const inputs: Iterable<IO<unknown>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              cancelled = true;
            }),
          ),
        );
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- undefined is the regression case
        throw undefined;
      },
    };

    await expect(IO.unsafeRunPromise(combine(inputs))).rejects.toBeUndefined();
    expect(cancelled).toBe(true);
  });

  it("does not let an immediate child override an iterator failure", async () => {
    const error = new Error("iterator boom");
    let started = false;
    const inputs: Iterable<IO<unknown>> = {
      *[Symbol.iterator]() {
        yield IO.sync(() => {
          started = true;
          return 1;
        });
        throw error;
      },
    };

    await expect(IO.unsafeRunPromise(combine(inputs))).rejects.toBe(error);
    expect(started).toBe(true);
  });
});

describe.each(collectionConcurrency)("%s mutable bookkeeping", (_, combine) => {
  it("isolates state across many concurrent executions", async () => {
    const effect = combine([IO.of(undefined), IO.of(1)]);
    const results = await IO.unsafeRunPromise(IO.all(Array.from({ length: 64 }, () => effect)));

    expect(results).toHaveLength(64);
  });

  it("waits for asynchronous child finalizers when cancelled externally", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let finalizers = 0;
    const child = IO.never().pipe(
      IO.onCancel(
        IO.promise(() => gate).pipe(
          IO.zipR(
            IO.sync(() => {
              finalizers++;
            }),
          ),
        ),
      ),
    );
    const run = IO.unsafeRunPromiseCancellable(combine([child, child]));
    let cancellationSettled = false;
    const cancellation = run.cancel().then(() => {
      cancellationSettled = true;
    });
    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await Promise.resolve();
    expect(cancellationSettled).toBe(false);
    expect(finalizers).toBe(0);

    release();
    await cancellation;
    await rejection;
    expect(finalizers).toBe(2);
  });
});

describe("collection concurrency bookkeeping", () => {
  it.gen("preserves undefined successes across forced scheduler yields", function* () {
    const options = { maxOpCountBeforeAutoYield: 1 };

    expect(yield* TestControl.executeEmbed(IO.all([IO.of(undefined), IO.of(1)]), options)).toEqual([
      undefined,
      1,
    ]);

    const allOutcomes = yield* TestControl.executeEmbed(
      IO.allOutcome([IO.of(undefined), IO.of(1)]),
      options,
    );
    expect(allOutcomes[0]._tag).toBe("Succeeded");
    if (allOutcomes[0]._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* allOutcomes[0]._0).toBeUndefined();

    expect(
      yield* TestControl.executeEmbed(IO.any([IO.throw("boom"), IO.of(undefined)]), options),
    ).toBeUndefined();
    expect(
      yield* TestControl.executeEmbed(IO.anyOrdered([IO.throw("boom"), IO.of(undefined)]), options),
    ).toBeUndefined();
    expect(
      yield* TestControl.executeEmbed(
        IO.race([IO.of(undefined), IO.never().pipe(IO.delay(10))]),
        options,
      ),
    ).toBeUndefined();

    const raceOutcome = yield* TestControl.executeEmbed(
      IO.raceOutcome([IO.of(undefined), IO.never().pipe(IO.delay(10))]),
      options,
    );
    expect(raceOutcome._tag).toBe("Succeeded");
    if (raceOutcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* raceOutcome._0).toBeUndefined();
  });
});

const shortCircuitingCollectionConcurrency = [
  ["IO.all", (loser: IO<never>): IO<unknown> => IO.all([IO.throw("boom"), loser]), true],
  ["IO.any", (loser: IO<never>): IO<unknown> => IO.any([IO.of(undefined), loser]), false],
  [
    "IO.anyOrdered",
    (loser: IO<never>): IO<unknown> => IO.anyOrdered([IO.of(undefined), loser]),
    false,
  ],
  ["IO.race", (loser: IO<never>): IO<unknown> => IO.race([IO.of(undefined), loser]), false],
  [
    "IO.raceOutcome",
    (loser: IO<never>): IO<unknown> => IO.raceOutcome([IO.of(undefined), loser]),
    false,
  ],
] as const;

describe.each(shortCircuitingCollectionConcurrency)("%s cleanup", (_, makeEffect, fails) => {
  it("does not expose the winner before asynchronous loser finalizers finish", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let finalizerStarted = false;
    const loser = IO.never().pipe(
      IO.onCancel(
        IO.sync(() => {
          finalizerStarted = true;
        }).pipe(IO.zipR(IO.promise(() => gate))),
      ),
    );
    const promise = IO.unsafeRunPromise(makeEffect(loser));
    let settled = false;
    const settlement = promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await Promise.resolve();
    expect(finalizerStarted).toBe(true);
    expect(settled).toBe(false);

    release();
    if (fails) await expect(promise).rejects.toBe("boom");
    else await promise;
    await settlement;
  });
});

describe("IO.all", () => {
  it.gen("returns an empty result for an empty input", function* () {
    expect(yield* IO.all([])).toEqual([]);
  });

  it.gen("preserves input order regardless of completion order", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.all([IO.sleep(20).pipe(IO.as("left")), IO.sleep(10).pipe(IO.as("right"))]),
    );

    expect(result).toEqual(["left", "right"]);
  });

  it.gen("short-circuits on failure and cancels remaining computations", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.catch(
      IO.all([
        IO.throw("boom"),
        IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as("right")),
      ]),
      IO.of,
    );

    expect(result).toBe("boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("preserves order when direct pure inputs mix with async siblings", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.all([IO.of("a"), IO.sleep(20).pipe(IO.as("b")), IO.of("c")]),
    );

    expect(result).toEqual(["a", "b", "c"]);
  });

  it.gen(
    "propagates failure and cancels async siblings alongside direct pure inputs",
    function* () {
      const cancelled = yield* IO.ref(false);

      const error = yield* IO.catch(
        IO.all([
          IO.of(1),
          IO.throw("boom"),
          IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
        ]),
        IO.of,
      );

      expect(error).toBe("boom");
      expect(yield* Ref.get(cancelled)).toBe(true);
    },
  );

  it.gen("can execute the same all effect repeatedly and concurrently", function* () {
    const all = IO.all([IO.of(1), IO.of(2), IO.of(3)]);

    expect(yield* all).toEqual([1, 2, 3]);
    expect(yield* all).toEqual([1, 2, 3]);
    expect(yield* IO.both(all, all)).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ]);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.all(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("cancels late children after an immediate child cancellation", function* () {
    const cancelled = yield* IO.ref(false);
    const fiber = yield* IO.all([
      IO.cancelled(),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    ]).pipe(IO.fork);

    expect((yield* fiber.pipe(Fiber.await))._tag).toBe("Cancelled");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it("waits for child finalizers when cancelled externally", async () => {
    let leftCancelled = false;
    let rightCancelled = false;
    const run = IO.unsafeRunPromiseCancellable(
      IO.all([
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              leftCancelled = true;
            }),
          ),
        ),
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              rightCancelled = true;
            }),
          ),
        ),
      ]),
    );

    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);
    await run.cancel();
    await rejection;

    expect(leftCancelled).toBe(true);
    expect(rightCancelled).toBe(true);
  });
});

describe("IO.allOutcome", () => {
  it.gen("collects every outcome without short-circuiting", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.allOutcome([IO.throw("boom"), IO.sleep(10).pipe(IO.as("ok"))]),
    );

    expect(result[0]._tag).toBe("Failed");
    if (result[0]._tag !== "Failed") throw new Error("Expected first outcome to fail");
    expect(result[0]._0).toBe("boom");

    expect(result[1]._tag).toBe("Succeeded");
    if (result[1]._tag !== "Succeeded") throw new Error("Expected second outcome to succeed");
    expect(yield* result[1]._0).toBe("ok");
  });

  it.gen("returns an empty result for an empty input", function* () {
    expect(yield* IO.allOutcome([])).toEqual([]);
  });

  it.gen("preserves input order regardless of completion order", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.allOutcome([IO.sleep(20).pipe(IO.as("left")), IO.sleep(10).pipe(IO.as("right"))]),
    );

    expect(result[0]._tag).toBe("Succeeded");
    if (result[0]._tag !== "Succeeded") throw new Error("Expected first outcome to succeed");
    expect(yield* result[0]._0).toBe("left");

    expect(result[1]._tag).toBe("Succeeded");
    if (result[1]._tag !== "Succeeded") throw new Error("Expected second outcome to succeed");
    expect(yield* result[1]._0).toBe("right");
  });

  it.gen("collects Cancelled outcomes for self-cancelling children", function* () {
    const result = yield* IO.allOutcome([IO.cancelled(), IO.of("ok")]);

    expect(result[0]._tag).toBe("Cancelled");
    expect(result[1]._tag).toBe("Succeeded");
    if (result[1]._tag !== "Succeeded") throw new Error("Expected second outcome to succeed");
    expect(yield* result[1]._0).toBe("ok");
  });

  it.gen("can execute the same allOutcome effect repeatedly and concurrently", function* () {
    const allOutcome = IO.allOutcome([IO.of(1), IO.throw("boom")]);

    const expectShape = (result: readonly IOOutcome<unknown>[]) => {
      expect(result[0]?._tag).toBe("Succeeded");
      expect(result[1]?._tag).toBe("Failed");
    };

    expectShape(yield* allOutcome);
    expectShape(yield* allOutcome);
    const [left, right] = yield* IO.both(allOutcome, allOutcome);
    expectShape(left);
    expectShape(right);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.allOutcome(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it("waits for child finalizers when cancelled externally", async () => {
    let leftCancelled = false;
    let rightCancelled = false;
    const run = IO.unsafeRunPromiseCancellable(
      IO.allOutcome([
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              leftCancelled = true;
            }),
          ),
        ),
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              rightCancelled = true;
            }),
          ),
        ),
      ]),
    );

    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);
    await run.cancel();
    await rejection;

    expect(leftCancelled).toBe(true);
    expect(rightCancelled).toBe(true);
  });
});

describe("IO.any", () => {
  it.gen("returns the first succeeding computation", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.any([IO.sleep(10).pipe(IO.zipR(IO.throw("left"))), IO.sleep(20).pipe(IO.as("right"))]),
    );

    expect(result).toBe("right");
  });

  it.gen("cancels remaining computations after a success", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.any([
      IO.of("ok"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as("slow")),
    ]);

    expect(result).toBe("ok");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("fails with AggregateError for an empty input", function* () {
    const error = yield* IO.catch(IO.any<never>([]), IO.of);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
  });

  it.gen(
    "fails with AggregateError when failures and cancellations exhaust the inputs",
    function* () {
      const error = yield* IO.catch(IO.any<void>([IO.throw("boom"), IO.cancelled()]), IO.of);

      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
    },
  );

  it.gen("is cancelled when every input is cancelled", function* () {
    const fiber = yield* IO.any<void>([IO.cancelled(), IO.cancelled()]).pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });

  it.gen("can execute the same any effect repeatedly and concurrently", function* () {
    const any = IO.any([IO.throw("boom"), IO.of(2)]);

    expect(yield* any).toBe(2);
    expect(yield* any).toBe(2);
    expect(yield* IO.both(any, any)).toEqual([2, 2]);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.any(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });
});

describe("IO.anyOrdered", () => {
  it.gen("waits for the earliest succeeding input index", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.anyOrdered([
        IO.throw("left"),
        IO.sleep(20).pipe(IO.as("right")),
        IO.sleep(10).pipe(IO.as("fast")),
      ]),
    );

    expect(result).toBe("right");
  });

  it.gen("releases a buffered success after earlier indices cancel", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.anyOrdered([IO.cancelled().pipe(IO.delay(10), IO.as("skipped")), IO.of("ok")]),
    );

    expect(result).toBe("ok");
  });

  it.gen("releases a buffered success after earlier indices fail", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.anyOrdered([IO.throw("left").pipe(IO.delay(10)), IO.of("ok")]),
    );

    expect(result).toBe("ok");
  });

  it.gen("fails with AggregateError when remaining inputs fail or cancel", function* () {
    const error = yield* IO.catch(
      TestControl.executeEmbed(
        IO.anyOrdered([IO.throw("boom"), IO.cancelled().pipe(IO.delay(10))]),
      ),
      IO.of,
    );

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
  });

  it.gen(
    "fails with AggregateError when failure and cancellation exhaust the inputs immediately",
    function* () {
      const error = yield* IO.catch(IO.anyOrdered<void>([IO.throw("boom"), IO.cancelled()]), IO.of);

      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
    },
  );

  it.gen("fails with AggregateError when buffered failures exhaust the inputs", function* () {
    const error = yield* IO.catch(
      TestControl.executeEmbed(
        IO.anyOrdered([IO.throw("left").pipe(IO.delay(10)), IO.throw("right")]),
      ),
      IO.of,
    );

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
  });

  it.gen("fails with an AggregateError for an empty input", function* () {
    const error = yield* IO.catch(IO.anyOrdered<never>([]), IO.of);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toBe("All effects were failed or cancelled");
    expect((error as AggregateError).errors).toEqual([]);
  });

  it.gen("can execute the same anyOrdered effect repeatedly and concurrently", function* () {
    const anyOrdered = IO.anyOrdered([IO.throw("boom"), IO.of(2)]);

    expect(yield* anyOrdered).toBe(2);
    expect(yield* anyOrdered).toBe(2);
    expect(yield* IO.both(anyOrdered, anyOrdered)).toEqual([2, 2]);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.anyOrdered(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });
});

describe("IO.racePair", () => {
  it.gen("returns the winning outcome without cancelling the loser", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.racePair(
      IO.of("fast"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    );

    expect(yield* Ref.get(cancelled)).toBe(false);

    if (!("_tag" in result[0])) throw new Error("Expected the left branch to win");
    expect(result[0]._tag).toBe("Succeeded");
    if (result[0]._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* result[0]._0).toBe("fast");

    const loser = result[1] as IOFiber<never>;

    yield* loser.pipe(Fiber.cancel);

    const loserOutcome = yield* loser.pipe(Fiber.await);
    expect(loserOutcome._tag).toBe("Cancelled");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("returns a failed winner without cancelling the loser", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.racePair(
      IO.throw("boom"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    );

    if (!("_tag" in result[0])) throw new Error("Expected the left branch to win");
    expect(result[0]._tag).toBe("Failed");
    if (result[0]._tag !== "Failed") throw new Error("Expected a failed outcome");
    expect(result[0]._0).toBe("boom");

    expect(yield* Ref.get(cancelled)).toBe(false);

    yield* (result[1] as IOFiber<never>).pipe(Fiber.cancel);
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("joins the losing right fiber when the left branch wins", function* () {
    const joined = yield* TestControl.executeEmbed(
      IO.gen(function* () {
        const result = yield* IO.racePair(IO.of("fast"), IO.sleep(10).pipe(IO.as("slow")));

        if (!("_tag" in result[0])) throw new Error("Expected the left branch to win");

        return yield* (result[1] as IOFiber<string>).pipe(Fiber.join);
      }),
    );

    expect(joined).toBe("slow");
  });

  it.gen("joins the losing right fiber when the left branch wins with a failure", function* () {
    const error = new Error("right boom");

    const joined = yield* TestControl.executeEmbed(
      IO.gen(function* () {
        const result = yield* IO.racePair(IO.of("fast"), IO.throw(error).pipe(IO.delay(10)));

        if (!("_tag" in result[0])) throw new Error("Expected the left branch to win");

        return yield* IO.catch((result[1] as IOFiber<never>).pipe(Fiber.join), IO.of);
      }),
    );

    expect(joined).toBe(error);
  });

  it.gen("joins the losing left fiber when the right branch wins with a failure", function* () {
    const error = new Error("left boom");

    const joined = yield* TestControl.executeEmbed(
      IO.gen(function* () {
        const result = yield* IO.racePair(IO.throw(error).pipe(IO.delay(10)), IO.of("fast"));

        if ("_tag" in result[0]) throw new Error("Expected the right branch to win");

        return yield* IO.catch(result[0].pipe(Fiber.join), IO.of);
      }),
    );

    expect(joined).toBe(error);
  });

  it.gen("joins the losing left fiber when the right branch wins", function* () {
    const joined = yield* TestControl.executeEmbed(
      IO.gen(function* () {
        const result = yield* IO.racePair(IO.sleep(10).pipe(IO.as("slow")), IO.of("fast"));

        if ("_tag" in result[0]) throw new Error("Expected the right branch to win");

        return yield* result[0].pipe(Fiber.join);
      }),
    );

    expect(joined).toBe("slow");
  });

  it.gen("propagates cancellation when joining a cancelled loser", function* () {
    const outcome = yield* IO.gen(function* () {
      const result = yield* IO.racePair(IO.of("fast"), IO.never());

      if (!("_tag" in result[0])) throw new Error("Expected the left branch to win");

      const loser = result[1] as IOFiber<never>;
      yield* loser.pipe(Fiber.cancel);

      const joinFiber = yield* loser.pipe(Fiber.join, IO.fork);
      return yield* joinFiber.pipe(Fiber.await);
    });

    expect(outcome._tag).toBe("Cancelled");
  });

  it.gen(
    "propagates cancellation when joining a cancelled left loser after a right win",
    function* () {
      const outcome = yield* IO.gen(function* () {
        const result = yield* IO.racePair(IO.never(), IO.of("fast"));

        if ("_tag" in result[0]) throw new Error("Expected the right branch to win");

        const loser = result[0];
        yield* loser.pipe(Fiber.cancel);

        const joinFiber = yield* loser.pipe(Fiber.join, IO.fork);
        return yield* joinFiber.pipe(Fiber.await);
      });

      expect(outcome._tag).toBe("Cancelled");
    },
  );

  it.gen("cancels both branches when the racePair itself is cancelled", function* () {
    const leftCancelled = yield* IO.ref(false);
    const rightCancelled = yield* IO.ref(false);

    const fiber = yield* IO.racePair(
      IO.never().pipe(IO.onCancel(Ref.set(leftCancelled, true))),
      IO.never().pipe(IO.onCancel(Ref.set(rightCancelled, true))),
    ).pipe(IO.fork);

    yield* fiber.pipe(Fiber.cancel);

    const outcome = yield* fiber.pipe(Fiber.await);
    expect(outcome._tag).toBe("Cancelled");
    expect(yield* Ref.get(leftCancelled)).toBe(true);
    expect(yield* Ref.get(rightCancelled)).toBe(true);
  });

  it("waits for both branch cancellations when cancelled from outside the racePair fiber", async () => {
    let leftCancelled = false;
    let rightCancelled = false;

    const run = IO.unsafeRunPromiseCancellable(
      IO.racePair(
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              leftCancelled = true;
            }),
          ),
        ),
        IO.never().pipe(
          IO.onCancel(
            IO.sync(() => {
              rightCancelled = true;
            }),
          ),
        ),
      ),
    );

    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await run.cancel();
    await rejection;

    expect(leftCancelled).toBe(true);
    expect(rightCancelled).toBe(true);
  });
});

describe("IO.race2", () => {
  it.gen("returns the winner and cancels the loser", function* () {
    const cancelled = yield* IO.ref(false);

    const result = yield* IO.race2(
      IO.of("fast"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    );

    expect(result).toBe("fast");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("waits for a remaining success when the first completion is cancelled", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.race2(IO.cancelled(), IO.of("ok").pipe(IO.delay(10))),
    );

    expect(result).toBe("ok");
  });

  it.gen("fails with the remaining failure when the first completion is cancelled", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.catch(IO.race2(IO.cancelled(), IO.throw("boom").pipe(IO.delay(10))), IO.of),
    );

    expect(result).toBe("boom");
  });

  it.gen("waits for the left branch when the right branch cancels first", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.race2(IO.of("ok").pipe(IO.delay(10)), IO.cancelled()),
    );

    expect(result).toBe("ok");
  });
});

describe("IO.race2Outcome", () => {
  it.gen("returns the winner outcome and cancels the loser", function* () {
    const cancelled = yield* IO.ref(false);

    const outcome = yield* IO.race2Outcome(
      IO.of("fast"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    );

    expect(outcome._tag).toBe("Succeeded");
    if (outcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* outcome._0).toBe("fast");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });
});

describe("IO.race", () => {
  it.gen("ignores cancelled branches and waits for a remaining winner", function* () {
    const result = yield* IO.race<void | string>([IO.cancelled(), IO.of("ok")]);

    expect(result).toBe("ok");
  });

  it.gen("cancels late-registered losers after an immediate winner", function* () {
    const leftCancelled = yield* IO.ref(false);
    const rightCancelled = yield* IO.ref(false);

    const result = yield* IO.race([
      IO.of("fast"),
      IO.never().pipe(IO.onCancel(Ref.set(leftCancelled, true)), IO.as("left")),
      IO.never().pipe(IO.onCancel(Ref.set(rightCancelled, true)), IO.as("right")),
    ]);

    expect(result).toBe("fast");
    expect(yield* Ref.get(leftCancelled)).toBe(true);
    expect(yield* Ref.get(rightCancelled)).toBe(true);
  });

  it.gen("fails fast and cancels late-registered losers after an immediate failure", function* () {
    const leftCancelled = yield* IO.ref(false);
    const rightCancelled = yield* IO.ref(false);

    const result = yield* IO.catch(
      IO.race([
        IO.throw("boom"),
        IO.never().pipe(IO.onCancel(Ref.set(leftCancelled, true)), IO.as("left")),
        IO.never().pipe(IO.onCancel(Ref.set(rightCancelled, true)), IO.as("right")),
      ]),
      IO.of,
    );

    expect(result).toBe("boom");
    expect(yield* Ref.get(leftCancelled)).toBe(true);
    expect(yield* Ref.get(rightCancelled)).toBe(true);
  });

  it.gen("is cancelled when delayed branches all cancel after registration", function* () {
    const control = yield* TestControl.execute(
      IO.race<void>([IO.cancelled().pipe(IO.delay(10)), IO.cancelled().pipe(IO.delay(20))]),
    );

    yield* control.advance(10);
    yield* control.tick();
    expect(yield* control.result).toBeNull();

    yield* control.advance(10);
    yield* control.tickAll();
    expect(yield* control.result).toMatchObject({ _tag: "Cancelled" });
  });

  it.gen("is cancelled when every branch is cancelled", function* () {
    const fiber = yield* IO.race<void>([IO.cancelled(), IO.cancelled()]).pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });

  it.gen("is cancelled for an empty race input", function* () {
    const fiber = yield* IO.race<never>([]).pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });

  it.gen("can execute the same race effect repeatedly and concurrently", function* () {
    const race = IO.race([IO.of(1), IO.of(2)]);

    expect(yield* race).toBe(1);
    expect(yield* race).toBe(1);
    expect(yield* IO.both(race, race)).toEqual([1, 1]);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.race(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });
});

describe("IO.raceOutcome", () => {
  it.gen("returns the first completed outcome and cancels losers", function* () {
    const cancelled = yield* IO.ref(false);

    const outcome = yield* IO.raceOutcome([
      IO.throw("boom"),
      IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
    ]);

    expect(outcome._tag).toBe("Failed");
    if (outcome._tag !== "Failed") throw new Error("Expected a failed outcome");
    expect(outcome._0).toBe("boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("returns a succeeded outcome and cancels slower losers", function* () {
    const cancelled = yield* IO.ref(false);

    const outcome = yield* TestControl.executeEmbed(
      IO.raceOutcome([
        IO.of("ok").pipe(IO.delay(10)),
        IO.never().pipe(IO.onCancel(Ref.set(cancelled, true))),
      ]),
    );

    expect(outcome._tag).toBe("Succeeded");
    if (outcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* outcome._0).toBe("ok");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });

  it.gen("cancels late-registered losers after an immediate outcome", function* () {
    const leftCancelled = yield* IO.ref(false);
    const rightCancelled = yield* IO.ref(false);

    const outcome = yield* IO.raceOutcome([
      IO.of("fast"),
      IO.never().pipe(IO.onCancel(Ref.set(leftCancelled, true))),
      IO.never().pipe(IO.onCancel(Ref.set(rightCancelled, true))),
    ]);

    expect(outcome._tag).toBe("Succeeded");
    if (outcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
    expect(yield* outcome._0).toBe("fast");
    expect(yield* Ref.get(leftCancelled)).toBe(true);
    expect(yield* Ref.get(rightCancelled)).toBe(true);
  });

  it.gen("is cancelled for an empty raceOutcome input", function* () {
    const fiber = yield* IO.raceOutcome<never>([]).pipe(IO.fork);
    const outcome = yield* fiber.pipe(Fiber.await);

    expect(outcome._tag).toBe("Cancelled");
  });

  it.gen("can execute the same raceOutcome effect repeatedly and concurrently", function* () {
    const raceOutcome = IO.raceOutcome([IO.of(1), IO.of(2)]);

    const expectShape = (outcome: IOOutcome<number>) => {
      expect(outcome._tag).toBe("Succeeded");
    };

    expectShape(yield* raceOutcome);
    expectShape(yield* raceOutcome);
    const [left, right] = yield* IO.both(raceOutcome, raceOutcome);
    expectShape(left);
    expectShape(right);
  });

  it.gen("cancels already-started children when the input iterable throws", function* () {
    const cancelled = yield* IO.ref(false);
    const inputs: Iterable<IO<number>> = {
      *[Symbol.iterator]() {
        yield IO.never().pipe(IO.onCancel(Ref.set(cancelled, true)), IO.as(1));
        throw new Error("iterable boom");
      },
    };

    const error = yield* IO.catch(IO.raceOutcome(inputs), IO.of);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("iterable boom");
    expect(yield* Ref.get(cancelled)).toBe(true);
  });
});
