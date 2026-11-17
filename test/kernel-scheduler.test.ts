import { describe, expect, it, vi } from "vitest";

import type { FiberRuntimeOptions, Scheduler } from "../src";
import { CancellationError, DefaultScheduler, Fiber, FiberRuntime, IO } from "../src";
import type { Op } from "../src/internal/kernel";

import { withPatchedGlobals } from "./test-utils";
import { js, runNode6 } from "./test-utils/compat";

const runWithOptions = <A>(program: any, options: FiberRuntimeOptions): Promise<A> =>
  new Promise<A>((resolve, reject) =>
    new FiberRuntime<A>(options, program, null, null, (outcome) =>
      outcome._tag === "Succeeded" ?
        resolve((outcome._0 as { readonly _0: A })._0)
      : reject(
          outcome._tag === "Failed" ?
            outcome._0 instanceof Error ?
              outcome._0
            : new Error(String(outcome._0))
          : new CancellationError(),
        ),
    ).run(),
  );

const flushTasks = (tasks: (() => void)[]): void => {
  while (tasks.length > 0) tasks.shift()!();
};

class ControlledDefaultScheduler extends DefaultScheduler {
  public readonly hostTasks: (() => void)[] = [];
  public readonly tasks: (() => void)[] = [];

  public override scheduleTask(thunk: () => void, cede?: boolean): void {
    (cede ? this.hostTasks : this.tasks).push(thunk);
  }

  public override scheduleDelay(_delayMs: number, _thunk: () => void): () => void {
    throw new Error("unexpected scheduleDelay");
  }
}

const countedChain = (steps: number, onStep: () => void): Op<number> => {
  const loop = (index: number): Op<number> =>
    index >= steps ?
      { _tag: "Pure", _0: index }
    : {
        _tag: "FlatMap",
        _0: {
          _tag: "Sync",
          _0: () => {
            onStep();
            return index + 1;
          },
        },
        _1: loop,
      };

  return loop(0);
};

class KeepAliveTestScheduler extends DefaultScheduler {
  public readonly delays: number[] = [];
  public readonly callbacks: (() => void)[] = [];
  public cancelCalls = 0;

  public override scheduleDelay(delayMs: number, thunk: () => void): () => void {
    this.delays.push(delayMs);
    this.callbacks.push(thunk);
    return () => {
      this.cancelCalls++;
    };
  }
}

describe("Runtime scheduler ownership", () => {
  it("resolves the default without mutating caller options or sharing unrelated roots", () => {
    const options = Object.freeze({});
    const first = new FiberRuntime(options, { _tag: "Pure", _0: 1 });
    const second = new FiberRuntime(options, { _tag: "Pure", _0: 2 });

    expect(options).toEqual({});
    expect(first.options.scheduler).toBe(first.scheduler);
    expect(second.options.scheduler).toBe(second.scheduler);
    expect(first.scheduler).not.toBe(second.scheduler);
  });

  it.each([false, true])(
    "inherits the resolved scheduler through nested forks (explicit=%s)",
    async (explicit) => {
      const scheduler = new DefaultScheduler();
      const options = Object.freeze(explicit ? { scheduler } : {});
      const current = IO.withFiberRuntime((fiber) => IO.of(fiber.scheduler));
      const program = IO.gen(function* () {
        const root = yield* current;
        const child = yield* IO.gen(function* () {
          const own = yield* current;
          const grandchild = yield* IO.fork(current);
          return [own, yield* Fiber.join(grandchild)];
        }).pipe(IO.fork);
        const detached = yield* IO.forkGlobal(current);
        return [root, ...(yield* Fiber.join(child)), yield* Fiber.join(detached)];
      });

      const observed = await IO.unsafeRunPromise(program, options);

      expect(observed).toHaveLength(4);
      for (const inherited of observed) expect(inherited).toBe(observed[0]);
      if (explicit) expect(observed[0]).toBe(scheduler);
      expect(Object.keys(options)).toEqual(explicit ? ["scheduler"] : []);
    },
  );

  it("preserves explicit options when starting helper fibers", () => {
    const options = Object.freeze({ scheduler: new DefaultScheduler() });
    const target = new FiberRuntime(options, { _tag: "Never" });
    const otherRoot = new FiberRuntime(options, { _tag: "Pure", _0: 1 });
    const cancellation = new FiberRuntime(target.options, target.cancel());

    expect(target.options).toBe(options);
    expect(otherRoot.scheduler).toBe(target.scheduler);
    expect(cancellation.options).toBe(options);
    expect(cancellation.scheduler).toBe(target.scheduler);
  });
});

describe("Default scheduler keepAlive", () => {
  it("shares a single keepAlive lease", () => {
    const scheduler = new KeepAliveTestScheduler();

    const release1 = scheduler.acquireKeepAlive();
    const release2 = scheduler.acquireKeepAlive();

    expect(scheduler.delays).toEqual([2147483647]);

    release1();
    expect(scheduler.cancelCalls).toBe(0);

    scheduler.callbacks[0]!();
    expect(scheduler.delays).toEqual([2147483647, 2147483647]);

    release2();
    expect(scheduler.cancelCalls).toBe(1);
  });
});

describe("Default scheduler host dispatch", () => {
  it("uses queueMicrotask for non-ceded tasks when available", async () => {
    const queueMicrotask = vi.fn((thunk: () => void) => {
      thunk();
    });
    let executed = false;

    await withPatchedGlobals(
      {
        queueMicrotask,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        new DefaultScheduler().scheduleTask(() => {
          executed = true;
        });

        expect(queueMicrotask).toHaveBeenCalledTimes(1);
        expect(executed).toBe(true);
      },
    );
  });

  it("falls back to Promise microtasks when queueMicrotask is unavailable", async () => {
    const order: string[] = [];

    await withPatchedGlobals(
      {
        queueMicrotask: undefined,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        new DefaultScheduler().scheduleTask(() => {
          order.push("task");
        });
        order.push("sync");

        expect(order).toEqual(["sync"]);

        await Promise.resolve();

        expect(order).toEqual(["sync", "task"]);
      },
    );
  });

  it("falls back to Date.now when neither performance.now nor process.hrtime is available", async () => {
    const dateNow = vi.fn(() => 789);

    await withPatchedGlobals(
      {
        Date: class FakeDate extends Date {
          public static override readonly now = dateNow;
        },
        performance: undefined,
        process: undefined,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        expect(new DefaultScheduler().monotonic()).toBe(789);
        expect(dateNow).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("uses Date.now for realTime", async () => {
    const dateNow = vi.fn(() => 4567);

    await withPatchedGlobals(
      {
        Date: class FakeDate extends Date {
          public static override readonly now = dateNow;
        },
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        expect(new DefaultScheduler().realTime()).toBe(4567);
        expect(dateNow).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("uses performance.now in browser-like runtimes", async () => {
    const now = vi.fn(() => 123.5);

    await withPatchedGlobals(
      {
        performance: { now },
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        expect(new DefaultScheduler().monotonic()).toBe(123.5);
        expect(now).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("uses process.hrtime when performance.now is unavailable", async () => {
    const hrtime = vi.fn(() => [1, 250_000_000] as const);

    await withPatchedGlobals(
      {
        performance: undefined,
        process: { hrtime },
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        expect(new DefaultScheduler().monotonic()).toBe(1_250);
        expect(hrtime).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("uses process.hrtime in real node 6 runtimes", async () => {
    const { probe, result } = await runNode6<{
      hasPerformanceNow: boolean;
      hasProcessHrtime: boolean;
      monotonic: number;
    }>(
      js`
        const { DefaultScheduler } = require("aerio");

        __compat.setResult({
          hasPerformanceNow:
            typeof performance !== "undefined" &&
            performance !== null &&
            typeof performance.now === "function",
          hasProcessHrtime: typeof process.hrtime === "function",
          monotonic: new DefaultScheduler().monotonic(),
        });
      `,
    );

    expect(probe.observedVersion).toMatch(/^v6\./);
    expect(result!.hasPerformanceNow).toBe(false);
    expect(result!.hasProcessHrtime).toBe(true);
    expect(Number.isFinite(result!.monotonic)).toBe(true);
    expect(result!.monotonic).toBeGreaterThanOrEqual(0);
  }, 300_000);

  it("uses setImmediate for ceded tasks in Node-like runtimes", async () => {
    const setImmediate = vi.fn((thunk: () => void) => {
      thunk();
      return 1;
    });
    const setTimeout = vi.fn();
    let executed = false;

    await withPatchedGlobals(
      {
        MessageChannel: undefined,
        setImmediate,
        setTimeout,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        new DefaultScheduler().scheduleTask(() => {
          executed = true;
        }, true);

        expect(setImmediate).toHaveBeenCalledTimes(1);
        expect(executed).toBe(true);
        expect(setTimeout).not.toHaveBeenCalled();
      },
    );
  });

  it("uses MessageChannel for ceded tasks in browser-like runtimes", async () => {
    const postMessage = vi.fn();
    const setTimeout = vi.fn();
    let channelCount = 0;
    let executed = false;

    class FakeMessageChannel {
      public readonly port1: { onmessage: null | (() => void) } = { onmessage: null };
      public readonly port2 = {
        postMessage: postMessage.mockImplementation(() => {
          this.port1.onmessage?.();
        }),
      };

      constructor() {
        channelCount += 1;
      }
    }

    await withPatchedGlobals(
      {
        MessageChannel: FakeMessageChannel,
        setImmediate: undefined,
        setTimeout,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        new DefaultScheduler().scheduleTask(() => {
          executed = true;
        }, true);

        expect(channelCount).toBe(1);
        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(executed).toBe(true);
        expect(setTimeout).not.toHaveBeenCalled();
      },
    );
  });

  it.each([false, true])(
    "preserves MessageChannel work after a throw (reentrant=%s)",
    async (reentrant) => {
      const messages: (() => void)[] = [];
      class FakeMessageChannel {
        public readonly port1: { onmessage: null | (() => void) } = { onmessage: null };
        public readonly port2 = {
          postMessage: () => messages.push(() => this.port1.onmessage?.()),
        };
      }

      await withPatchedGlobals(
        { MessageChannel: FakeMessageChannel, setImmediate: undefined },
        async () => {
          const { DefaultScheduler } = await import("../src");
          const first = new DefaultScheduler();
          const second = new DefaultScheduler();
          const third = new DefaultScheduler();
          const error = new Error("host task failed");
          const executed: string[] = [];
          first.scheduleTask(() => {
            executed.push("first");
            if (reentrant) third.scheduleTask(() => executed.push("reentrant"), true);
            throw error;
          }, true);
          second.scheduleTask(() => executed.push("second"), true);

          expect(messages).toHaveLength(1);
          let thrown: unknown;
          try {
            messages.shift()!();
          } catch (error) {
            thrown = error;
          }
          expect(thrown).toBe(error);
          expect(executed).toEqual(["first"]);
          expect(messages).toHaveLength(1);
          messages.shift()!();
          expect(executed).toEqual(
            reentrant ? ["first", "second", "reentrant"] : ["first", "second"],
          );
          expect(messages).toHaveLength(0);

          second.scheduleTask(() => executed.push("restarted"), true);
          expect(messages).toHaveLength(1);
          messages.shift()!();
          expect(executed.at(-1)).toBe("restarted");
        },
      );
    },
  );

  it("uses setTimeout for ceded tasks when setImmediate and MessageChannel are unavailable", async () => {
    let scheduledThunk!: () => void;
    const setTimeout = vi.fn((thunk: () => void, delayMs: number) => {
      scheduledThunk = thunk;
      return delayMs;
    });
    let executed = false;

    await withPatchedGlobals(
      {
        MessageChannel: undefined,
        setImmediate: undefined,
        setTimeout,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        new DefaultScheduler().scheduleTask(() => {
          executed = true;
        }, true);

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
        expect(executed).toBe(false);

        scheduledThunk();

        expect(executed).toBe(true);
      },
    );
  });

  it("uses host setTimeout for delayed tasks", async () => {
    let scheduledThunk!: () => void;
    const setTimeout = vi.fn((thunk: () => void, delayMs: number) => {
      scheduledThunk = thunk;
      return delayMs;
    });
    const clearTimeout = vi.fn();
    let executed = false;

    await withPatchedGlobals(
      {
        clearTimeout,
        setTimeout,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        const cancel = new DefaultScheduler().scheduleDelay(25, () => {
          executed = true;
        });

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 25);
        expect(executed).toBe(false);

        scheduledThunk();

        expect(executed).toBe(true);

        cancel();
        expect(clearTimeout).not.toHaveBeenCalled();
      },
    );
  });

  it("clears host timers when delayed tasks are cancelled", async () => {
    let scheduledThunk!: () => void;
    const timeoutId = { id: 1 };
    const setTimeout = vi.fn((thunk: () => void) => {
      scheduledThunk = thunk;
      return timeoutId;
    });
    const clearTimeout = vi.fn();
    let executed = false;

    await withPatchedGlobals(
      {
        clearTimeout,
        setTimeout,
      },
      async () => {
        const { DefaultScheduler } = await import("../src");

        const cancel = new DefaultScheduler().scheduleDelay(25, () => {
          executed = true;
        });

        cancel();

        expect(clearTimeout).toHaveBeenCalledTimes(1);
        expect(clearTimeout).toHaveBeenCalledWith(timeoutId);

        scheduledThunk();

        expect(executed).toBe(false);
      },
    );
  });
});

describe("Default scheduler batching", () => {
  const withTasks = async (
    run: (
      scheduler: DefaultScheduler,
      microtasks: (() => void)[],
      macrotasks: (() => void)[],
    ) => void,
    maxTasksPerBatch = 64,
  ): Promise<void> => {
    const microtasks: (() => void)[] = [];
    const macrotasks: (() => void)[] = [];
    await withPatchedGlobals(
      {
        queueMicrotask: (task: () => void) => microtasks.push(task),
        setImmediate: (task: () => void) => macrotasks.push(task),
      },
      async () => {
        const { DefaultScheduler } = await import("../src");
        run(new DefaultScheduler(2048, maxTasksPerBatch), microtasks, macrotasks);
      },
    );
  };

  it.each([1, 64, 65, 257, 2048])(
    "preserves FIFO across bounded drains of %i tasks",
    async (size) => {
      await withTasks((scheduler, microtasks, macrotasks) => {
        const executed: number[] = [];
        for (let index = 0; index < size; index++) {
          scheduler.scheduleTask(() => {
            executed.push(index);
            if (index === 0) scheduler.scheduleTask(() => executed.push(size));
          });
        }

        expect(microtasks).toHaveLength(1);
        microtasks.shift()!();
        expect(executed).toEqual(Array.from({ length: Math.min(size, 64) }, (_, index) => index));
        expect(macrotasks).toHaveLength(1);

        let drains = 0;
        while (microtasks.length > 0 || macrotasks.length > 0) {
          const before = executed.length;
          (microtasks.shift() ?? macrotasks.shift())!();
          expect(executed.length - before).toBeLessThanOrEqual(64);
          expect(++drains).toBeLessThanOrEqual(size + 2);
        }
        expect(executed).toEqual(Array.from({ length: size + 1 }, (_, index) => index));

        scheduler.scheduleTask(() => executed.push(size + 1));
        expect(microtasks).toHaveLength(1);
        microtasks.shift()!();
        expect(executed.at(-1)).toBe(size + 1);
        expect(microtasks).toHaveLength(0);
        expect(macrotasks).toHaveLength(0);
      });
    },
  );

  it.each([false, true])("owns reentrant scheduling until drain exit (cede=%s)", async (cede) => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const executed: number[] = [];
      scheduler.scheduleTask(() => {
        executed.push(1);
        scheduler.scheduleTask(() => executed.push(2));
      }, cede);

      (microtasks.shift() ?? macrotasks.shift())!();
      expect(executed).toEqual([1]);
      expect(microtasks).toHaveLength(0);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual([1, 2]);
      expect(microtasks).toHaveLength(0);
      expect(macrotasks).toHaveLength(0);
    });
  });

  it("schedules reentrant work once even when its producer throws", async () => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const error = new Error("producer failed");
      const executed: string[] = [];
      scheduler.scheduleTask(() => {
        scheduler.scheduleTask(() => executed.push("ready"));
        scheduler.scheduleTask(() => executed.push("ceded"), true);
        throw error;
      });

      expect(microtasks.shift()!).toThrow(error);
      expect(microtasks).toHaveLength(0);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual(["ready", "ceded"]);
      expect(macrotasks).toHaveLength(0);
    });
  });

  it.each([1, 3, 128])("uses a batch budget of %i tasks", async (budget) => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const executed: number[] = [];
      for (let index = 0; index < budget + 1; index++)
        scheduler.scheduleTask(() => executed.push(index));

      microtasks.shift()!();
      expect(executed).toHaveLength(budget);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual(Array.from({ length: budget + 1 }, (_, index) => index));
      expect(macrotasks).toHaveLength(0);
    }, budget);
  });

  it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid task budget: %s",
    (budget) => {
      expect(() => new DefaultScheduler(2048, budget)).toThrow(RangeError);
    },
  );

  it.each([false, true])("reschedules queued work after a task throws (cede=%s)", async (cede) => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const error = new Error("task failed");
      const executed: string[] = [];
      scheduler.scheduleTask(() => {
        throw error;
      }, cede);
      scheduler.scheduleTask(() => executed.push("remaining"), cede);

      const drain = (microtasks.shift() ?? macrotasks.shift())!;
      expect(drain).toThrow(error);
      expect(executed).toEqual([]);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual(["remaining"]);

      scheduler.scheduleTask(() => executed.push("restarted"));
      expect(microtasks).toHaveLength(1);
      microtasks.shift()!();
      expect(executed).toEqual(["remaining", "restarted"]);
      expect(macrotasks).toHaveLength(0);
    });
  });

  it("preserves an unconsumed suffix when a later batch throws", async () => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const error = new Error("later task failed");
      const executed: number[] = [];
      for (let index = 0; index < 257; index++) {
        scheduler.scheduleTask(() => {
          executed.push(index);
          if (index === 80) throw error;
        });
      }

      microtasks.shift()!();
      expect(executed).toHaveLength(64);
      let thrown: unknown;
      try {
        macrotasks.shift()!();
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBe(error);
      expect(executed).toHaveLength(81);
      expect(macrotasks).toHaveLength(1);

      let drains = 0;
      while (macrotasks.length > 0) {
        macrotasks.shift()!();
        expect(++drains).toBeLessThanOrEqual(3);
      }
      expect(executed).toEqual(Array.from({ length: 257 }, (_, index) => index));
      expect(microtasks).toHaveLength(0);
    });
  });

  it("defers newly ceded tasks to a later host checkpoint", async () => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const executed: string[] = [];
      scheduler.scheduleTask(() => executed.push("ready"));
      scheduler.scheduleTask(() => {
        executed.push("ceded");
        scheduler.scheduleTask(() => executed.push("ceded-again"), true);
      }, true);

      microtasks.shift()!();
      expect(executed).toEqual(["ready"]);
      macrotasks.shift()!();
      expect(executed).toEqual(["ready", "ceded"]);
      expect(microtasks).toHaveLength(0);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual(["ready", "ceded", "ceded-again"]);
      expect(macrotasks).toHaveLength(0);
    });
  });

  it("promotes ceded work behind an unconsumed ready suffix", async () => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const executed: number[] = [];
      for (let index = 0; index < 257; index++) {
        scheduler.scheduleTask(() => {
          executed.push(index);
          if (index === 0) {
            scheduler.scheduleTask(() => executed.push(257));
            scheduler.scheduleTask(() => executed.push(259), true);
          }
        });
      }
      scheduler.scheduleTask(() => executed.push(258), true);

      microtasks.shift()!();
      expect(executed).toEqual(Array.from({ length: 64 }, (_, index) => index));
      expect(microtasks).toHaveLength(0);
      let drains = 0;
      while (macrotasks.length > 0) {
        const before = executed.length;
        macrotasks.shift()!();
        expect(executed.length - before).toBeLessThanOrEqual(64);
        expect(++drains).toBeLessThanOrEqual(5);
      }
      expect(executed).toEqual(Array.from({ length: 260 }, (_, index) => index));
      expect(microtasks).toHaveLength(0);
    });
  });

  it("keeps promoted work ahead of reentrant tasks across partial drains", async () => {
    await withTasks((scheduler, microtasks, macrotasks) => {
      const executed: number[] = [];
      for (let index = 0; index < 257; index++) {
        scheduler.scheduleTask(() => {
          executed.push(index);
          if (index === 0) scheduler.scheduleTask(() => executed.push(257));
        }, true);
      }

      expect(microtasks).toHaveLength(0);
      expect(macrotasks).toHaveLength(1);
      macrotasks.shift()!();
      expect(executed).toEqual(Array.from({ length: 64 }, (_, index) => index));
      let drains = 0;
      while (microtasks.length > 0 || macrotasks.length > 0) {
        (microtasks.shift() ?? macrotasks.shift())!();
        expect(++drains).toBeLessThanOrEqual(6);
      }
      expect(executed).toEqual(Array.from({ length: 258 }, (_, index) => index));
    });
  });
});

describe("Runtime fairness semantics", () => {
  it("suspends a hot interpreter after the default operation budget", () => {
    const scheduler = new ControlledDefaultScheduler();
    let completedSteps = 0;
    const stepCount = 10_000;
    const fiber = new FiberRuntime(
      { scheduler },
      countedChain(stepCount, () => {
        completedSteps++;
      }),
    );

    fiber.run();

    expect(fiber.outcome).toBeNull();
    expect(completedSteps).toBeGreaterThan(0);
    expect(completedSteps).toBeLessThan(stepCount);
    expect(scheduler.hostTasks).toHaveLength(1);
    expect(scheduler.tasks).toHaveLength(0);

    flushTasks(scheduler.hostTasks);

    expect(completedSteps).toBe(stepCount);
    expect(fiber.outcome?._tag).toBe("Succeeded");
  });

  it("rotates continuously runnable peers at operation-budget boundaries", () => {
    const scheduler = new ControlledDefaultScheduler();
    const progress = [0, 0];
    const stepCount = 10_000;
    const fibers = progress.map(
      (_, index) =>
        new FiberRuntime(
          { scheduler },
          countedChain(stepCount, () => {
            progress[index]!++;
          }),
        ),
    );

    fibers.forEach((fiber) => fiber.run());

    expect(scheduler.hostTasks).toHaveLength(2);
    const initialProgress = [...progress];

    scheduler.hostTasks.shift()!();
    expect(progress[0]).toBeGreaterThan(initialProgress[0]!);
    expect(progress[1]).toBe(initialProgress[1]);

    scheduler.hostTasks.shift()!();
    expect(progress[1]).toBeGreaterThan(initialProgress[1]!);
    expect(scheduler.hostTasks).toHaveLength(2);

    flushTasks(scheduler.hostTasks);

    expect(progress).toEqual([stepCount, stepCount]);
    expect(fibers.map((fiber) => fiber.outcome?._tag)).toEqual(["Succeeded", "Succeeded"]);
  });

  it("resumes explicit cede only after an existing host checkpoint", () => {
    const scheduler = new ControlledDefaultScheduler();
    const events: string[] = [];
    const program: Op<void> = {
      _tag: "Then",
      _0: {
        _tag: "Sync",
        _0: () => {
          events.push("before-cede");
        },
      },
      _1: {
        _tag: "Then",
        _0: { _tag: "Cede" },
        _1: {
          _tag: "Sync",
          _0: () => {
            events.push("after-cede");
          },
        },
      },
    };
    const fiber = new FiberRuntime({ scheduler }, program);

    scheduler.hostTasks.push(() => {
      events.push("host-checkpoint");
    });
    fiber.run();

    expect(events).toEqual(["before-cede"]);
    expect(scheduler.tasks).toHaveLength(0);
    expect(scheduler.hostTasks).toHaveLength(2);

    scheduler.hostTasks.shift()!();
    expect(events).toEqual(["before-cede", "host-checkpoint"]);

    scheduler.hostTasks.shift()!();
    expect(events).toEqual(["before-cede", "host-checkpoint", "after-cede"]);
    expect(fiber.outcome?._tag).toBe("Succeeded");
  });

  it("observes cancellation and runs finalizers during sustained interpreter work", () => {
    const scheduler = new ControlledDefaultScheduler();
    let completedSteps = 0;
    let finalizerRuns = 0;
    const stepCount = 10_000;
    const target = new FiberRuntime<number>(
      { scheduler },
      {
        _tag: "OnCancel",
        _0: countedChain(stepCount, () => {
          completedSteps++;
        }),
        _1: {
          _tag: "Sync",
          _0: () => {
            finalizerRuns++;
          },
        },
      },
    );
    const cancellation = new FiberRuntime({ scheduler }, target.cancel());

    target.run();
    const stepsBeforeCancellation = completedSteps;
    cancellation.run();

    expect(target.outcome).toBeNull();
    expect(scheduler.tasks).toHaveLength(1);

    flushTasks(scheduler.tasks);

    expect(completedSteps).toBe(stepsBeforeCancellation);
    expect(completedSteps).toBeLessThan(stepCount);
    expect(finalizerRuns).toBe(1);
    expect(target.outcome?._tag).toBe("Cancelled");
    expect(cancellation.outcome?._tag).toBe("Succeeded");
  });
});

describe("Runtime scheduler delegation", () => {
  it("delegates monotonic and realTime", async () => {
    const calls: string[] = [];
    const scheduler: Scheduler = {
      monotonic: () => {
        calls.push("monotonic");
        return 123;
      },
      realTime: () => {
        calls.push("realTime");
        return 456;
      },
      shouldYield: () => false,
      scheduleTask: () => {
        throw new Error("unexpected scheduleTask");
      },
      scheduleDelay: () => {
        throw new Error("unexpected sleep");
      },
    };

    const result = await runWithOptions(
      IO.gen(function* () {
        const monotonic = yield* IO.monotonic();
        const realTime = yield* IO.realTime();
        return [monotonic, realTime] as const;
      }),
      { scheduler },
    );

    expect(result).toEqual([123, 456]);
    expect(calls).toEqual(["monotonic", "realTime"]);
  });

  it("delegates sleep registration", async () => {
    const delays: number[] = [];
    const tasks: (() => void)[] = [];
    let resume!: () => void;
    let settled = false;

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: (delayMs, thunk) => {
        delays.push(delayMs);
        resume = thunk;
        return () => {};
      },
    };

    const promise = runWithOptions(IO.sleep(25).pipe(IO.as("done")), { scheduler });

    expect(delays).toEqual([25]);

    void promise.then(() => {
      settled = true;
    });

    resume();

    expect(tasks).toHaveLength(1);
    await Promise.resolve();
    expect(settled).toBe(false);

    flushTasks(tasks);

    await expect(promise).resolves.toBe("done");
  });

  it("uses the runtime scheduler canceler when a sleep is cancelled", async () => {
    let cancelCalls = 0;
    const tasks: (() => void)[] = [];

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: () => () => {
        cancelCalls++;
      },
    };

    const fiber = new FiberRuntime<string>({ scheduler }, IO.sleep(25).pipe(IO.as("done")) as any);
    fiber.run();

    const cancelPromise = runWithOptions(fiber.cancel(), { scheduler });

    expect(cancelCalls).toBe(0);
    expect(tasks).toHaveLength(1);

    flushTasks(tasks);

    await expect(cancelPromise).resolves.toBeUndefined();
    expect(cancelCalls).toBe(1);
    expect(fiber.outcome?._tag).toBe("Cancelled");
  });
});

describe("Never fibers", () => {
  it("never suspends without requiring scheduler keepAlive support", async () => {
    const tasks: (() => void)[] = [];

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: () => {
        throw new Error("unexpected scheduleDelay");
      },
    };

    const fiber = new FiberRuntime<never>({ scheduler }, IO.never() as any);
    fiber.run();

    expect(tasks).toHaveLength(0);

    const cancelPromise = runWithOptions(fiber.cancel(), { scheduler });

    expect(tasks).toHaveLength(1);

    flushTasks(tasks);

    await expect(cancelPromise).resolves.toBeUndefined();
    expect(fiber.outcome?._tag).toBe("Cancelled");
  });

  it("never acquires and releases the scheduler keepAlive lease", async () => {
    const tasks: (() => void)[] = [];
    let acquireCalls = 0;
    let releaseCalls = 0;

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: () => {
        throw new Error("unexpected scheduleDelay");
      },
      acquireKeepAlive: () => {
        acquireCalls++;
        return () => {
          releaseCalls++;
        };
      },
    };

    const fiber = new FiberRuntime<never>({ scheduler }, IO.never() as any);
    fiber.run();

    expect(acquireCalls).toBe(1);
    expect(releaseCalls).toBe(0);

    const cancelPromise = runWithOptions(fiber.cancel(), { scheduler });

    expect(tasks).toHaveLength(1);

    flushTasks(tasks);

    await expect(cancelPromise).resolves.toBeUndefined();
    expect(releaseCalls).toBe(1);
    expect(fiber.outcome?._tag).toBe("Cancelled");
  });
});

describe("Public run functions", () => {
  it("accepts runtime options via unsafeRunSync", () => {
    const scheduler: Scheduler = {
      monotonic: () => 123,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: () => {
        throw new Error("unexpected scheduleTask");
      },
      scheduleDelay: () => {
        throw new Error("unexpected sleep");
      },
    };

    expect(IO.unsafeRunSync(IO.monotonic(), { scheduler })).toBe(123);
  });

  it("accepts options with or without a callback via unsafeRun", () => {
    const calls: string[] = [];
    const scheduler: Scheduler = {
      monotonic: () => {
        calls.push("monotonic");
        return 1;
      },
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: () => {
        throw new Error("unexpected scheduleTask");
      },
      scheduleDelay: () => {
        throw new Error("unexpected sleep");
      },
    };

    let value = -1;
    IO.unsafeRun(IO.of(42), (outcome) => {
      if (outcome._tag === "Succeeded") value = IO.unsafeRunSync(outcome._0);
    });
    IO.unsafeRun(IO.monotonic(), { scheduler }, (outcome) => {
      if (outcome._tag === "Succeeded") value = IO.unsafeRunSync(outcome._0);
    });
    IO.unsafeRun(IO.monotonic().pipe(IO.asVoid), { scheduler });

    expect(value).toBe(1);
    expect(calls).toEqual(["monotonic", "monotonic"]);
  });

  it("accepts runtime options via async unsafe runners", async () => {
    const delays: number[] = [];
    const resumes: (() => void)[] = [];
    const tasks: (() => void)[] = [];

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: (delayMs, thunk) => {
        delays.push(delayMs);
        resumes.push(thunk);
        return () => {};
      },
    };

    const asyncResult = new Promise<string>((resolve, reject) => {
      IO.unsafeRunAsync(IO.sleep(25).pipe(IO.as("done")), { scheduler }, (outcome) => {
        if (outcome._tag === "Succeeded") resolve(IO.unsafeRunSync(outcome._0));
        else reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
      });
    });
    const promise = IO.unsafeRunPromise(IO.sleep(25).pipe(IO.as("done")), { scheduler });

    expect(delays).toEqual([25, 25]);

    resumes.forEach((resume) => resume());

    expect(tasks).toHaveLength(2);

    flushTasks(tasks);

    await expect(asyncResult).resolves.toBe("done");
    await expect(promise).resolves.toBe("done");
  });

  it("accepts runtime options via unsafeRunFork", async () => {
    const delays: number[] = [];
    const tasks: (() => void)[] = [];
    let resume!: () => void;

    const scheduler: Scheduler = {
      monotonic: () => 0,
      realTime: () => 0,
      shouldYield: () => false,
      scheduleTask: (thunk) => {
        tasks.push(thunk);
      },
      scheduleDelay: (delayMs, thunk) => {
        delays.push(delayMs);
        resume = thunk;
        return () => {};
      },
    };

    const fiber = IO.unsafeRunFork(IO.sleep(25).pipe(IO.as("done")), { scheduler });
    const promise = IO.unsafeRunPromise(Fiber.join(fiber));

    expect(delays).toEqual([25]);

    resume();

    expect(tasks).toHaveLength(1);

    flushTasks(tasks);

    await expect(promise).resolves.toBe("done");
  });
});
