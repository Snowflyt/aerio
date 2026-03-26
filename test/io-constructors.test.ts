/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Fiber, IO, TestControl } from "../src";
import { CancellationError } from "../src/errors";

import { it } from "./test-utils";

describe("IO.of and IO.void", () => {
  it.gen("lift pure values", function* () {
    expect(yield* IO.of(42)).toBe(42);
    expect(yield* IO.void()).toBeUndefined();
  });
});

describe("IO.sync", () => {
  it.gen("evaluates lazily and routes thrown errors to the error channel", function* () {
    let runs = 0;
    const error = new Error("boom");

    const program = IO.sync(() => {
      runs += 1;
      return runs;
    });

    expect(runs).toBe(0);
    expect(yield* program).toBe(1);
    expect(runs).toBe(1);

    const result = yield* IO.catch(
      IO.sync(() => {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.suspend", () => {
  it.gen("rebuilds the source effect on each execution", function* () {
    let current = 0;

    const program = IO.suspend(() => IO.of(++current));

    expect(yield* program).toBe(1);
    expect(yield* program).toBe(2);
  });

  it.gen("routes thunk errors to the error channel", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      IO.suspend(() => {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.try", () => {
  it.gen("lifts direct values, IO values, and promise values", function* () {
    expect(yield* IO.try((n: number) => n + 1, 1)).toBe(2);
    expect(yield* IO.try(() => IO.of(42))).toBe(42);
    expect(yield* IO.try(() => Promise.resolve("ok"))).toBe("ok");
  });

  it.gen("captures thrown errors", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      IO.try(() => {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.cont", () => {
  it.gen("resolves from succeed and ignores later callbacks", function* () {
    const result = yield* IO.cont<number>((succeed, fail, get) => {
      succeed(1);
      fail(new Error("boom"));
      succeed(2);
      return get;
    });

    expect(result).toBe(1);
  });

  it.gen("routes failures through get", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      IO.cont<number>((_succeed, fail, get) => {
        fail(error);
        return get;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.asyncUncancellable", () => {
  it("resolves and rejects from asynchronous callbacks", async () => {
    await expect(
      IO.unsafeRunPromise(
        IO.asyncUncancellable<number>((succeed) => {
          setTimeout(() => succeed(42), 0);
        }),
      ),
    ).resolves.toBe(42);

    const error = new Error("boom");

    await expect(
      IO.unsafeRunPromise(
        IO.asyncUncancellable<number>((_succeed, fail) => {
          setTimeout(() => fail(error), 0);
        }),
      ),
    ).rejects.toBe(error);
  });
});

describe("IO.asyncCancellable", () => {
  it("runs its cancellation finalizer when cancelled", async () => {
    let cancelled = false;

    const program = IO.asyncCancellable<number>((succeed) => {
      const timeoutId = setTimeout(() => succeed(42), 50);

      return IO.sync(() => {
        cancelled = true;
        clearTimeout(timeoutId);
      });
    });

    const { cancel, promise } = IO.unsafeRunPromiseCancellable(program);
    const rejection = expect(promise).rejects.toBeInstanceOf(CancellationError);

    await cancel();
    await rejection;

    expect(cancelled).toBe(true);
  });

  it("resolves when not cancelled", async () => {
    await expect(
      IO.unsafeRunPromise(
        IO.asyncCancellable<number>((succeed) => {
          const timeoutId = setTimeout(() => succeed(42), 0);
          return IO.sync(() => clearTimeout(timeoutId));
        }),
      ),
    ).resolves.toBe(42);
  });
});

describe("IO.promise", () => {
  it("resolves and rejects promise results", async () => {
    await expect(IO.unsafeRunPromise(IO.promise(() => Promise.resolve(42)))).resolves.toBe(42);

    const error = new Error("boom");

    await expect(IO.unsafeRunPromise(IO.promise(() => Promise.reject(error)))).rejects.toBe(error);
  });

  it("aborts the provided signal when cancelled", async () => {
    let aborted = false;

    const run = IO.unsafeRunPromiseCancellable(
      IO.promise((signal) => {
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
          },
          { once: true },
        );

        return new Promise<number>(() => {});
      }),
    );

    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await run.cancel();
    await rejection;

    expect(aborted).toBe(true);
  });
});

describe("IO.gen", () => {
  it.gen("sequences computations with generator syntax", function* () {
    const program = IO.gen(function* () {
      const left = yield* IO.of(1);
      const right = yield* IO.of(2);
      return left + right;
    });

    expect(yield* program).toBe(3);
  });

  it.gen("succeeds when the generator returns before yielding", function* () {
    // eslint-disable-next-line require-yield
    const program = IO.gen(function* () {
      return 42;
    });

    expect(yield* program).toBe(42);
  });

  it.gen("routes errors thrown before the first yield to the error channel", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      // eslint-disable-next-line require-yield
      IO.gen(function* () {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });

  it.gen("routes errors thrown after resuming a yielded effect to the error channel", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      IO.gen(function* () {
        yield* IO.of(undefined);
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.withFiberRuntime", () => {
  it.gen("provides access to the current runtime fiber", function* () {
    const fiberId = yield* IO.withFiberRuntime((fiber) => IO.of(fiber.id));

    expect(fiberId).toBeGreaterThanOrEqual(0);
  });

  it.gen("routes callback errors to the error channel", function* () {
    const error = new Error("boom");

    const result = yield* IO.catch(
      IO.withFiberRuntime(() => {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
  });
});

describe("IO.cede", () => {
  it.gen("yields execution until the next scheduler tick", function* () {
    const control = yield* TestControl.execute(IO.cede().pipe(IO.as("done")));

    expect(yield* control.result).toBeNull();

    yield* control.tick();

    const result = yield* control.result;
    expect(result).toMatchObject({ _tag: "Succeeded", _0: "done" });
  });
});

describe("IO.isIO", () => {
  it("recognizes IO values", () => {
    expect(IO.isIO(IO.of(1))).toBe(true);
    expect(IO.isIO(Promise.resolve(1))).toBe(false);
    expect(IO.isIO({ pipe: () => void 0 })).toBe(false);
  });
});

describe("IO.withFiberRuntime and IO.fork", () => {
  it.gen("observes different runtime fibers across forks", function* () {
    const parentId = yield* IO.withFiberRuntime((fiber) => IO.of(fiber.id));
    const child = yield* IO.withFiberRuntime((fiber) => IO.of(fiber.id)).pipe(IO.fork);
    const childId = yield* child.pipe(Fiber.join);

    expect(childId).not.toBe(parentId);
  });
});
