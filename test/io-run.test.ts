/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { CancellationError, DefaultScheduler, Fiber, IO } from "../src";

import { js, runNode6, runQuickJS } from "./test-utils/compat";

const autoYieldStepCount = 20;

const scheduleNodeLikeHostMacrotask = (thunk: () => void) => {
  if (typeof setImmediate === "function") {
    setImmediate(thunk);
  } else {
    setTimeout(thunk, 0);
  }
};

const buildLongMapProgram = (steps: number) => {
  let program = IO.of(0);

  for (let step = 0; step < steps; step++) {
    program = program.pipe(IO.map((value) => value + 1));
  }

  return program;
};

describe("IO.unsafeRunFork", () => {
  it("returns a fiber whose result can be joined", async () => {
    const fiber = IO.unsafeRunFork(IO.of(42));

    await expect(IO.unsafeRunPromise(Fiber.join(fiber))).resolves.toBe(42);
  });
});

describe("IO.unsafeRun", () => {
  it("invokes the completion callback for synchronous and asynchronous success", async () => {
    let syncValue = -1;

    IO.unsafeRun(IO.of(42), (outcome) => {
      if (outcome._tag === "Succeeded") syncValue = IO.unsafeRunSync(outcome._0);
    });

    expect(syncValue).toBe(42);

    const asyncValue = await new Promise<number>((resolve, reject) => {
      IO.unsafeRun(
        IO.promise(() => Promise.resolve(24)),
        (outcome) => {
          if (outcome._tag === "Succeeded") {
            resolve(IO.unsafeRunSync(outcome._0));
          } else {
            reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
          }
        },
      );
    });

    expect(asyncValue).toBe(24);
  });
});

describe("IO.unsafeRunSync", () => {
  it("returns synchronous results", () => {
    expect(IO.unsafeRunSync(IO.of(42))).toBe(42);
  });

  it("throws failures", () => {
    const error = new Error("boom");

    let thrown: unknown;

    try {
      IO.unsafeRunSync(IO.throw(error));
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBe(error);
  });

  it("throws TypeError for asynchronous computations", () => {
    expect(() => IO.unsafeRunSync(IO.promise(() => Promise.resolve(42)))).toThrow(TypeError);
  });
});

describe("IO.unsafeRunAsync", () => {
  it("invokes the completion callback for success and failure", async () => {
    const success = new Promise<number>((resolve, reject) => {
      IO.unsafeRunAsync(
        IO.promise(() => Promise.resolve(42)),
        (outcome) => {
          if (outcome._tag === "Succeeded") {
            resolve(IO.unsafeRunSync(outcome._0));
          } else {
            reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
          }
        },
      );
    });

    const error = new Error("boom");
    const failure = new Promise<unknown>((resolve, reject) => {
      IO.unsafeRunAsync(IO.throw(error), (outcome) => {
        if (outcome._tag === "Failed") {
          resolve(outcome._0);
        } else {
          reject(
            outcome._tag === "Succeeded" ? IO.unsafeRunSync(outcome._0) : new CancellationError(),
          );
        }
      });
    });

    await expect(success).resolves.toBe(42);
    await expect(failure).resolves.toBe(error);
  });
});

describe("IO.unsafeRunPromise", () => {
  it("resolves successes and rejects failures", async () => {
    await expect(IO.unsafeRunPromise(IO.of(42))).resolves.toBe(42);

    const error = new Error("boom");

    await expect(IO.unsafeRunPromise(IO.throw(error))).rejects.toBe(error);
  });
});

describe("IO.unsafeRunPromiseCancellable", () => {
  it("resolves when not cancelled", async () => {
    const { promise } = IO.unsafeRunPromiseCancellable(IO.of(42));

    await expect(promise).resolves.toBe(42);
  });

  it("rejects with CancellationError when cancelled", async () => {
    let cancelled = false;

    const action = IO.never().pipe(
      IO.onCancel(
        IO.sync(() => {
          cancelled = true;
        }),
      ),
    );

    const { cancel, promise } = IO.unsafeRunPromiseCancellable(action);
    const rejection = expect(promise).rejects.toBeInstanceOf(CancellationError);

    await cancel();
    await rejection;

    expect(cancelled).toBe(true);
  });
});

describe("runtime auto-yield", () => {
  it("yields to host macrotasks after many synchronous steps", async () => {
    let hostMacrotaskSeen = false;

    scheduleNodeLikeHostMacrotask(() => {
      hostMacrotaskSeen = true;
    });

    const value = await IO.unsafeRunPromise(buildLongMapProgram(autoYieldStepCount), {
      scheduler: new DefaultScheduler(1),
    });

    expect(value).toBe(autoYieldStepCount);
    expect(hostMacrotaskSeen).toBe(true);
  });

  it("yields to host macrotasks after many synchronous steps in node 6", async () => {
    const { probe, stdout } = await runNode6(
      js`
        const { IO, DefaultScheduler } = require("aerio");

        const scheduler = new DefaultScheduler(1);
        const scheduleHostMacrotask =
          typeof setImmediate === "function" ?
            setImmediate
          : function(thunk) {
              setTimeout(thunk, 0);
            };
        let hostMacrotaskSeen = false;
        let program = IO.of(0);

        scheduleHostMacrotask(function() {
          hostMacrotaskSeen = true;
        });

        for (var step = 0; step < ${autoYieldStepCount}; step++) {
          program = program.pipe(
            IO.map(function(value) {
              return value + 1;
            }),
          );
        }

        IO.unsafeRunPromise(program, { scheduler: scheduler }).then(
          function(value) {
            console.log(JSON.stringify({
              hostMacrotaskSeen: hostMacrotaskSeen,
              value: value,
            }));
          },
          function(error) {
            console.error(error && error.stack ? error.stack : String(error));
            process.exitCode = 1;
          },
        );
      `,
    );

    const result = JSON.parse(stdout.trim()) as {
      hostMacrotaskSeen: boolean;
      value: number;
    };

    expect(probe.observedVersion).toMatch(/^v6\./);
    expect(result.value).toBe(autoYieldStepCount);
    expect(result.hostMacrotaskSeen).toBe(true);
  }, 300_000);

  it("yields to host macrotasks after many synchronous steps in QuickJS runtimes", async () => {
    for (const { result } of await runQuickJS<{
      hostMacrotaskSeen: boolean;
      value: number;
    }>(
      js`
        import { IO, DefaultScheduler } from "aerio/index.js";

        const osModule = await import("qjs:os").catch(() => import("os"));
        if (!osModule || typeof osModule.setTimeout !== "function") {
          throw new Error("QuickJS host timer is unavailable");
        }

        const scheduler = new DefaultScheduler(1);
        let hostMacrotaskSeen = false;
        let program = IO.of(0);

        osModule.setTimeout(() => {
          hostMacrotaskSeen = true;
        }, 0);

        for (let step = 0; step < ${autoYieldStepCount}; step++) {
          program = program.pipe(IO.map((value) => value + 1));
        }

        const value = await IO.unsafeRunPromise(program, { scheduler });

        __compat.setResult({
          hostMacrotaskSeen,
          value,
        });
      `,
    )) {
      expect(result!.value).toBe(autoYieldStepCount);
      expect(result!.hostMacrotaskSeen).toBe(true);
    }
  }, 300_000);
});
