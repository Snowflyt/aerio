/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Fiber, IO, NoScheduledExecutionError, Schedule, TestControl, TimeoutError } from "../src";

import { it } from "./test-utils";

describe("IO.schedule", () => {
  it.gen("waits for the first scheduled delay before the first execution", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.schedule(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        Schedule.spaced(6_000),
      ),
    );

    yield* control.tick();

    expect(runs).toBe(0);
    expect(yield* control.nextInterval).toBe(6_000);

    yield* control.advance(6_000);
    yield* control.tick();

    expect(runs).toBe(1);
  });

  it.gen("repeats successful executions according to the schedule", function* () {
    let runs = 0;
    const attemptsSeen: number[] = [];
    const elapsedSeen: number[] = [];

    const control = yield* TestControl.execute(
      IO.schedule(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        (attempt, elapsedMs) => {
          attemptsSeen.push(attempt);
          elapsedSeen.push(elapsedMs);
          return attempt <= 3 ? 6_000 : void 0;
        },
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(18_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 3 });
    expect(runs).toBe(3);
    expect(attemptsSeen).toEqual([1, 2, 3, 4]);
    expect(elapsedSeen).toEqual([0, 6_000, 12_000, 18_000]);
  });

  it.gen("treats Schedule.recurs as the number of scheduled executions", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.schedule(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        Schedule.spaced(1_000).pipe(Schedule.intersect(Schedule.recurs(3))),
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(3_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 3 });
    expect(runs).toBe(3);
  });

  it.gen("fails before the first execution when the schedule ends immediately", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.schedule(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        () => void 0,
      ),
    );

    yield* control.tickAll();

    const result = (yield* control.result)!;

    expect(yield* control.monotonic).toBe(0);
    expect(result._tag).toBe("Failed");
    if (result._tag !== "Failed") throw new Error("Expected IO.schedule to fail");
    expect(result._0).toBeInstanceOf(NoScheduledExecutionError);
    expect((result._0 as NoScheduledExecutionError).message).toBe(
      "Schedule completed before the first execution",
    );
    expect(runs).toBe(0);
  });

  it.gen("fails if a repeated execution fails", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.catch(
        IO.schedule(
          IO.sync(() => {
            runs += 1;
            if (runs === 2) throw new Error("boom");
            return runs;
          }),
          Schedule.spaced(9_000),
        ),
        (e) => IO.of((e as Error).message),
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(18_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "boom" });
    expect(runs).toBe(2);
  });
});

describe("IO.repeat", () => {
  it.gen("runs once immediately and then repeats according to the schedule", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.repeat(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        Schedule.spaced(6_000).pipe(Schedule.intersect(Schedule.recurs(3))),
      ),
    );

    yield* control.tick();

    expect(runs).toBe(1);

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(18_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 4 });
    expect(runs).toBe(4);
  });

  it.gen("returns the first successful value when the schedule stops immediately", function* () {
    let runs = 0;

    const control = yield* TestControl.execute(
      IO.repeat(
        IO.sync(() => {
          runs += 1;
          return runs;
        }),
        Schedule.recurs(0),
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(0);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 1 });
    expect(runs).toBe(1);
  });
});

describe("IO.retry", () => {
  it.gen("succeeds within the configured retry budget", function* () {
    let attempts = 0;

    const control = yield* TestControl.execute(
      IO.retry(
        IO.sync(() => {
          attempts += 1;
          if (attempts < 3) throw new Error("not yet");
          return "ok";
        }),
        Schedule.spaced(10_000),
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(20_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "ok" });
    expect(attempts).toBe(3);
  });

  it.gen("stops when the while predicate rejects the error", function* () {
    let attempts = 0;

    const result = yield* IO.catch(
      IO.retry(
        IO.sync(() => {
          attempts += 1;
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw attempts;
        }),
        { while: (e) => typeof e === "number" && e < 2 },
      ),
      IO.of,
    );

    expect(result).toBe(2);
    expect(attempts).toBe(2);
  });

  it.gen("stops when the until predicate matches the error", function* () {
    let attempts = 0;

    const result = yield* IO.catch(
      IO.retry(
        IO.sync(() => {
          attempts += 1;
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw attempts;
        }),
        { until: (e) => typeof e === "number" && e >= 2 },
      ),
      IO.of,
    );

    expect(result).toBe(2);
    expect(attempts).toBe(2);
  });

  it.gen("propagates the last error when the schedule is exhausted", function* () {
    let attempts = 0;
    const error = new Error("still failing");

    const control = yield* TestControl.execute(
      IO.catch(
        IO.retry(
          IO.sync(() => {
            attempts += 1;
            throw error;
          }),
          (attempt) => (attempt === 1 ? 12_000 : void 0),
        ),
        IO.of,
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(12_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: error });
    expect(attempts).toBe(2);
  });

  it.gen("retries immediately when no schedule is provided", function* () {
    let attempts = 0;

    const result = yield* IO.retry(
      IO.sync(() => {
        attempts += 1;
        if (attempts === 1) throw new Error("again");
        return "ok";
      }),
      {},
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it.gen("passes attempt numbers and elapsed time to the schedule", function* () {
    const attemptsSeen: number[] = [];
    const elapsedSeen: number[] = [];
    let attempts = 0;

    const control = yield* TestControl.execute(
      IO.retry(
        IO.sync(() => {
          attempts += 1;
          if (attempts < 3) throw new Error("again");
          return attempts;
        }),
        (attempt, elapsedMs) => {
          attemptsSeen.push(attempt);
          elapsedSeen.push(elapsedMs);
          return 4_000;
        },
      ),
    );

    yield* control.tickAll();

    expect(yield* control.monotonic).toBe(8_000);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 3 });
    expect(elapsedSeen).toEqual([0, 4_000]);
    expect(attemptsSeen).toEqual([1, 2]);
  });
});

describe("IO.timeout", () => {
  it.gen("returns the original value when it completes in time", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.timeout(IO.sleep(2_000).pipe(IO.as("ok")), 10_000),
    );

    expect(result).toBe("ok");
  });

  it.gen("fails with TimeoutError when the deadline wins", function* () {
    const result = yield* IO.catch(
      TestControl.executeEmbed(IO.timeout(IO.sleep(20_000).pipe(IO.as("value")), 5_000)),
      IO.of,
    );

    expect(result).toBeInstanceOf(TimeoutError);
    expect((result as TimeoutError).message).toBe("Operation timed out after 5000ms");
  });
});

describe("IO.timeoutTo", () => {
  it.gen("does not confuse ordinary symbol values with the timeout sentinel", function* () {
    const value = Symbol("value");

    const result = yield* TestControl.executeEmbed(
      IO.timeoutTo(IO.of(value), 50_000, IO.of("fallback")),
    );

    expect(result).toBe(value);
  });

  it.gen("timeoutTo returns the fallback when the deadline wins", function* () {
    const result = yield* TestControl.executeEmbed(
      IO.timeoutTo(IO.sleep(20_000).pipe(IO.as("value")), 5_000, IO.of("fallback")),
    );

    expect(result).toBe("fallback");
  });

  it.gen("propagates fallback failures when the deadline wins", function* () {
    const error = new Error("fallback failed");

    const result = yield* IO.catch(
      TestControl.executeEmbed(IO.timeoutTo(IO.never(), 5_000, IO.throw(error))),
      IO.of,
    );

    expect(result).toBe(error);
  });

  it.gen("propagates the source failure when the source wins", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      TestControl.executeEmbed(IO.timeoutTo(IO.throw(error), 50_000, IO.of("fallback"))),
      IO.of,
    );

    expect(result).toBe(error);
  });

  it.gen("preserves cancellation semantics", function* () {
    const outcome = yield* TestControl.executeEmbed(
      IO.timeoutTo(IO.cancelled(), 50_000, IO.of("fallback")).pipe(
        IO.fork,
        IO.flatMap(Fiber.await),
      ),
    );

    expect(outcome._tag).toBe("Cancelled");
  });
});
