/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { IO } from "../src";

import { it } from "./test-utils";

describe("IO.imap", () => {
  it.gen("transforms the success value and ignores the reverse mapping", function* () {
    let forwardCalls = 0;
    let backwardCalls = 0;

    const program = IO.of(1).pipe(
      IO.imap(
        (value) => {
          forwardCalls += 1;
          return value + 1;
        },
        (value) => {
          backwardCalls += 1;
          return value - 1;
        },
      ),
    );

    expect(forwardCalls).toBe(0);
    expect(backwardCalls).toBe(0);
    expect(yield* program).toBe(2);
    expect(forwardCalls).toBe(1);
    expect(backwardCalls).toBe(0);
  });
});

describe("IO.map", () => {
  it.gen("behaves lazily and transforms the success value", function* () {
    let calls = 0;

    const program = IO.of(1).pipe(
      IO.map((value) => {
        calls += 1;
        return value + 1;
      }),
    );

    expect(calls).toBe(0);
    expect(yield* program).toBe(2);
    expect(calls).toBe(1);
  });

  it.gen("routes callback throws to the error channel", function* () {
    const error = new Error("map boom");

    const result = yield* IO.of(1).pipe(
      IO.map(() => {
        throw error;
      }),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });
});

describe("IO.tap", () => {
  it.gen("runs the callback and preserves the original value", function* () {
    let calls = 0;
    const seen: number[] = [];

    const program = IO.of(1).pipe(
      IO.tap((value) => {
        calls += 1;
        seen.push(value);
      }),
    );

    expect(calls).toBe(0);
    expect(seen).toEqual([]);
    expect(yield* program).toBe(1);
    expect(calls).toBe(1);
    expect(seen).toEqual([1]);
  });

  it.gen("routes callback throws to the error channel", function* () {
    const error = new Error("tap boom");

    const result = yield* IO.of(1).pipe(
      IO.tap(() => {
        throw error;
      }),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });
});

describe("IO.as", () => {
  it.gen("replaces the success value with a constant", function* () {
    let calls = 0;

    const program = IO.sync(() => {
      calls += 1;
      return 1;
    }).pipe(IO.as("done"));

    expect(calls).toBe(0);
    expect(yield* program).toBe("done");
    expect(calls).toBe(1);
  });
});

describe("IO.asVoid", () => {
  it.gen("discards the success value", function* () {
    let calls = 0;

    const program = IO.sync(() => {
      calls += 1;
      return 1;
    }).pipe(IO.asVoid);

    expect(calls).toBe(0);
    expect(yield* program).toBeUndefined();
    expect(calls).toBe(1);
  });
});

describe("IO.ap", () => {
  it.gen("applies an effectful function to an effectful value", function* () {
    const events: string[] = [];

    const program = IO.ap(
      IO.sync(() => {
        events.push("function");
        return (value: number) => value + 1;
      }),
      IO.sync(() => {
        events.push("value");
        return 1;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(2);
    expect(events).toEqual(["function", "value"]);
  });
});

describe("IO.product", () => {
  it.gen("collects both success values in order", function* () {
    const events: string[] = [];

    const program = IO.product(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toEqual([1, 2]);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.productL", () => {
  it.gen("keeps the left success value", function* () {
    const events: string[] = [];

    const program = IO.productL(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(1);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.productR", () => {
  it.gen("keeps the right success value", function* () {
    const events: string[] = [];

    const program = IO.productR(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(2);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.zip", () => {
  it.gen("collects both success values in order", function* () {
    const events: string[] = [];

    const program = IO.zip(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toEqual([1, 2]);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.zipWith", () => {
  it.gen("merges both success values with the provided function", function* () {
    const events: string[] = [];

    const program = IO.zipWith(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
      (left, right) => left + right,
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(3);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.zipL", () => {
  it.gen("keeps the left success value", function* () {
    const events: string[] = [];

    const program = IO.zipL(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(1);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.zipR", () => {
  it.gen("keeps the right success value", function* () {
    const events: string[] = [];

    const program = IO.zipR(
      IO.sync(() => {
        events.push("left");
        return 1;
      }),
      IO.sync(() => {
        events.push("right");
        return 2;
      }),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(2);
    expect(events).toEqual(["left", "right"]);
  });
});

describe("IO.flatten", () => {
  it.gen("runs the outer and inner effects lazily", function* () {
    const events: string[] = [];

    const program = IO.sync(() => {
      events.push("outer");
      return IO.sync(() => {
        events.push("inner");
        return 2;
      });
    }).pipe(IO.flatten);

    expect(events).toEqual([]);
    expect(yield* program).toBe(2);
    expect(events).toEqual(["outer", "inner"]);
  });
});

describe("IO.flatMap", () => {
  it.gen("calls the callback without a receiver and with one argument on each run", function* () {
    const calls: unknown[][] = [];
    const program = IO.flatMap(IO.of(1), function (this: unknown, ...args: [number]) {
      calls.push([this, ...args]);
      return IO.of(args[0] + 1);
    });

    expect(calls).toEqual([]);
    expect(yield* program).toBe(2);
    expect(yield* program).toBe(2);
    expect(calls).toEqual([
      [undefined, 1],
      [undefined, 1],
    ]);
  });

  it.gen("behaves lazily and runs the returned IO", function* () {
    let calls = 0;

    const program = IO.of(1).pipe(
      IO.flatMap((value) => {
        calls += 1;
        return IO.of(value + 1);
      }),
    );

    expect(calls).toBe(0);
    expect(yield* program).toBe(2);
    expect(calls).toBe(1);
  });

  it.gen("routes callback throws to the error channel", function* () {
    const error = new Error("flatMap boom");

    const result = yield* IO.of(1).pipe(
      IO.flatMap(() => {
        throw error;
      }),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });
});

describe("IO.flatTap", () => {
  it.gen("runs an effectful callback and preserves the original value", function* () {
    const events: number[] = [];

    const program = IO.of(2).pipe(
      IO.flatTap((value) =>
        IO.sync(() => {
          events.push(value);
          return value + 1;
        }),
      ),
    );

    expect(events).toEqual([]);
    expect(yield* program).toBe(2);
    expect(events).toEqual([2]);
  });

  it.gen("propagates failures from the callback effect", function* () {
    const error = new Error("flatTap boom");

    const result = yield* IO.of(1).pipe(
      IO.flatTap(() => IO.throw(error)),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });
});

describe("IO.forever", () => {
  it.gen("repeats the source until it fails", function* () {
    let runs = 0;
    const error = new Error("stop");

    const result = yield* IO.catch(
      IO.sync(() => {
        runs += 1;
        if (runs === 3) throw error;
        return runs;
      }).pipe(IO.forever),
      IO.of,
    );

    expect(result).toBe(error);
    expect(runs).toBe(3);
  });
});

describe("IO.andThen", () => {
  it.gen("behaves lazily and maps pure callback results", function* () {
    let calls = 0;

    const program = IO.of(1).pipe(
      IO.andThen((value) => {
        calls += 1;
        return value + 1;
      }),
    );

    expect(calls).toBe(0);
    expect(yield* program).toBe(2);
    expect(calls).toBe(1);
  });

  it.gen("sequences IO-returning callbacks", function* () {
    let calls = 0;

    const program = IO.of(1).pipe(
      IO.andThen((value) => {
        calls += 1;
        return IO.of(value + 1);
      }),
    );

    expect(calls).toBe(0);
    expect(yield* program).toBe(2);
    expect(calls).toBe(1);
  });

  it.gen("accepts non-function values and IOs", function* () {
    expect(yield* IO.of(1).pipe(IO.andThen(2))).toBe(2);
    expect(yield* IO.of(1).pipe(IO.andThen({ value: 2 }))).toEqual({ value: 2 });
    expect(yield* IO.of(1).pipe(IO.andThen(IO.of(2)))).toBe(2);
  });

  it.gen("accepts promise-like values", function* () {
    const promiseLike = {
      then: (resolve: (value: number) => void) => {
        resolve(2);
      },
    };

    expect(yield* IO.of(1).pipe(IO.andThen(promiseLike))).toBe(2);
  });

  it.gen("awaits promise-returning callbacks", function* () {
    let calls = 0;

    const program = IO.of(1).pipe(
      IO.andThen((value) => {
        calls += 1;
        return Promise.resolve(value + 1);
      }),
    );

    expect(calls).toBe(0);
    expect(yield* program).toBe(2);
    expect(calls).toBe(1);
  });

  it.gen("routes callback throws to the error channel", function* () {
    const error = new Error("andThen boom");

    const result = yield* IO.of(1).pipe(
      IO.andThen(() => {
        throw error;
      }),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });

  it.gen("routes rejected promises to the error channel", function* () {
    const error = new Error("promise boom");

    const result = yield* IO.of(1).pipe(
      IO.andThen(() => Promise.reject(error)),
      IO.catch(IO.of),
    );

    expect(result).toBe(error);
  });
});
