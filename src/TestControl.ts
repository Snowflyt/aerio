/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, Identity } from "hkt-core";

import type { IO } from "./IO";
import { flatMap, of, productR, sync, throw as throw_, unsafeRun } from "./IO";
import type { Outcome } from "./Outcome";
import { CancellationError, NonTerminationError } from "./errors";
import type { Op, Scheduler } from "./internal/kernel";
import { FiberRuntime } from "./internal/kernel";
import { OutcomeProto } from "./internal/outcome";

/**
 * Options for a {@linkcode TestControl} runtime.
 *
 * These options configure the virtual scheduler that backs {@linkcode IO.sleep}, {@linkcode IO.monotonic}, and {@linkcode IO.realTime} while a program is running under {@linkcode execute} or {@linkcode executeEmbed}.
 */
export interface TestControlOptions {
  /**
   * Seed used to reproduce randomized fiber interleavings.
   *
   * When omitted, a fresh seed is generated for each runtime.
   */
  readonly seed?: number;
  /**
   * Initial monotonic time in milliseconds.
   *
   * @default 0
   */
  readonly monotonic?: number;
  /**
   * Initial real time in milliseconds since the Unix epoch.
   *
   * @default 0
   */
  readonly realTime?: number;
  /**
   * Maximum operation count before the runtime auto-yields back to the scheduler.
   *
   * @default Number.MAX_SAFE_INTEGER
   */
  readonly maxOpCountBeforeAutoYield?: number;
}

/**
 * Drives an {@linkcode IO} program with a virtual-time runtime.
 *
 * The controlled program does not start evaluating until one of the stepping effects on this handle is sequenced.
 * The outer {@linkcode IO}s returned by this interface run on the caller’s runtime rather than inside the controlled runtime.
 *
 * If multiple fibers are runnable at the same time, {@linkcode TestControl} randomly chooses between them.
 * Use {@linkcode seed} to reproduce a particular interleaving.
 *
 * Use {@linkcode tick} to drain work that is already runnable, {@linkcode advance} to move the virtual clock, and {@linkcode tickFor} or {@linkcode tickAll} to combine both behaviors.
 * Virtual time is only observed through {@linkcode IO.monotonic}, {@linkcode IO.realTime}, and {@linkcode IO.sleep}.
 * If a program stops making progress without producing a result, {@linkcode isDeadlocked} becomes `true` and {@linkcode executeEmbed} fails with {@linkcode NonTerminationError}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const control = yield* TestControl.execute(
 *     IO.sleep(1000).pipe(IO.andThen(IO.realTime())),
 *   );
 *
 *   const beforeTick = yield* control.nextInterval;
 *   yield* control.tick();
 *   const afterTick = yield* control.nextInterval;
 *   yield* control.advance(1000);
 *   yield* control.tick();
 *
 *   return { beforeTick, afterTick, result: yield* control.result };
 * });
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> {
 * //   beforeTick: 0,
 * //   afterTick: 1000,
 * //   result: Outcome { _tag: "Succeeded", _0: 1000 }
 * // }
 * ```
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const control = yield* TestControl.execute(IO.sleep(500).pipe(IO.as("done")));
 *
 *   yield* control.tickFor(250);
 *   const halfway = yield* control.nextInterval;
 *   yield* control.tickFor(250);
 *
 *   return { halfway, result: yield* control.result };
 * });
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> { halfway: 250, result: Outcome { _tag: "Succeeded", _0: "done" } }
 * ```
 */
export interface TestControl<out A> {
  /**
   * Seed used to replay the current randomized scheduling order.
   */
  readonly seed: number;
  /**
   * Produces the final {@linkcode Outcome} when the controlled program has completed, or `null` if it is still running.
   */
  readonly result: IO<Outcome<Identity, unknown, A> | null>;
  /**
   * Reads the current virtual monotonic clock seen by {@linkcode IO.monotonic}.
   */
  readonly monotonic: IO<number>;
  /**
   * Reads the current virtual real-time clock seen by {@linkcode IO.realTime}.
   */
  readonly realTime: IO<number>;
  /**
   * Produces `true` when the program has no runnable work, no pending timers, and no result.
   */
  readonly isDeadlocked: IO<boolean>;
  /**
   * Produces the minimum delay before another fiber becomes runnable.
   *
   * This returns `0` when work is already runnable or when no timers remain.
   */
  readonly nextInterval: IO<number>;

  /**
   * Executes all work that is already runnable at the current virtual time.
   *
   * This does not advance time on its own.
   */
  tick(): IO<void>;
  /**
   * Executes at most one ready scheduler turn.
   *
   * Returns `false` when no work is currently runnable.
   */
  tickOne(): IO<boolean>;
  /**
   * Drives the runtime until the program completes or deadlocks.
   *
   * This advances the clock to the next scheduled timer only after all currently-runnable work has been exhausted.
   * A program that keeps rescheduling immediate work forever can therefore cause this effect to run forever.
   */
  tickAll(): IO<void>;
  /**
   * Drives the runtime forward for at most the given virtual duration.
   *
   * Unlike {@linkcode advanceAndTick}, this advances in the minimum number of steps needed to hit timer boundaries that become due within the requested window.
   * Passing `0` still drains work that is already runnable at the current time.
   * This effect fails with {@linkcode RangeError} if `ms` is negative.
   */
  tickFor(ms: number): IO<void>;

  /**
   * Requests cancellation of the controlled program.
   *
   * Cancellation is requested inside the controlled runtime, so the program usually needs a later {@linkcode tick}, {@linkcode tickFor}, or {@linkcode tickAll} to observe the final outcome.
   */
  cancel(): IO<void>;

  /**
   * Advances virtual time without running newly-due work.
   *
   * Any timers that become due are made runnable for a later {@linkcode tick}, {@linkcode tickFor}, or {@linkcode tickAll}.
   * This effect fails with `RangeError` if `ms` is negative.
   */
  advance(ms: number): IO<void>;
  /**
   * Advances virtual time and then drains all ready work.
   *
   * This is a convenience method, but it is easy to call it before the controlled program has had a chance to schedule its first {@linkcode IO.sleep}.
   * In that case, the sleep is scheduled relative to the already-advanced clock and the program will appear to make no progress.
   */
  advanceAndTick(ms: number): IO<void>;
  /**
   * Advances virtual time to an absolute monotonic time without running newly-due work.
   *
   * This effect fails with `RangeError` if `timeMs` is less than the current virtual monotonic time.
   */
  advanceTo(timeMs: number): IO<void>;
  /**
   * Advances virtual time to the next scheduled timer, if any.
   *
   * This ignores already-runnable work and returns `null` when there are no pending timers.
   */
  advanceToNext(): IO<number | null>;
}

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
/**
 * Creates a {@linkcode TestControl} handle for the given {@linkcode IO}.
 *
 * The returned handle can be used to inspect results, advance virtual time, and manually drive evaluation with {@linkcode TestControl.tick}, {@linkcode TestControl.tickFor}, or {@linkcode TestControl.tickAll}.
 * If the program fails, the failure is stored in {@linkcode TestControl.result} as a failed {@linkcode Outcome} rather than being raised by this outer effect.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const control = yield* TestControl.execute(IO.sleep(10).pipe(IO.as("done")));
 *
 *   yield* control.tick();
 *   const next = yield* control.nextInterval;
 *   yield* control.advance(10);
 *   yield* control.tick();
 *
 *   return { next, result: yield* control.result };
 * });
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> { next: 10, result: Outcome { _tag: "Succeeded", _0: "done" } }
 * ```
 */
export const execute = <A>(program: IO<A>, options: TestControlOptions = {}): IO<TestControl<A>> =>
  sync(() => new TestControlImpl(program, options));

/**
 * Runs an {@linkcode IO} to completion under {@linkcode TestControl}.
 *
 * This is the most convenient entry point when you do not need intermediate assertions between timer boundaries.
 * It succeeds with the program result, fails with the program error if the program fails, fails with {@linkcode CancellationError} if the program is cancelled, and fails with {@linkcode NonTerminationError} if the program deadlocks or never produces a result.
 *
 * **Example**
 *
 * ```typescript
 * const program = TestControl.executeEmbed(
 *   IO.sleep(25).pipe(IO.andThen(IO.of("done"))),
 * );
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> "done"
 * ```
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.catch(TestControl.executeEmbed(IO.never()), IO.of);
 *
 * console.log(await program.unsafeRunPromise() instanceof NonTerminationError);
 * //> true
 * ```
 */
export const executeEmbed = <A>(program: IO<A>, options: TestControlOptions = {}): IO<A> =>
  execute(program, options).pipe(
    flatMap((control) =>
      control.tickAll().pipe(
        productR(control.result),
        flatMap((result) =>
          result === null ?
            throw_(new NonTerminationError("TestControl.executeEmbed detected non-termination"))
          : result._tag === "Succeeded" ? of(result._0)
          : result._tag === "Failed" ? throw_(result._0)
          : throw_(new CancellationError()),
        ),
      ),
    ),
  );

// -----------------------------------------------------------------------------
// Test runtime implementation
// -----------------------------------------------------------------------------
class TestControlImpl<A> implements TestControl<A> {
  declare public readonly seed: number;
  declare public readonly result: IO<Outcome<Identity, unknown, A> | null>;
  declare public readonly monotonic: IO<number>;
  declare public readonly realTime: IO<number>;
  declare public readonly isDeadlocked: IO<boolean>;
  declare public readonly nextInterval: IO<number>;

  declare private _scheduler: ControlledScheduler;
  declare private _result: Outcome<Identity, unknown, A> | null;
  declare private _fiber: FiberRuntime<A>;

  constructor(program: IO<A>, options: TestControlOptions = {}) {
    this._scheduler = new ControlledScheduler(options);
    this._result = null;

    this.seed = this._scheduler.seed();
    this.result = sync(() => this._result);
    this.monotonic = sync(() => this._scheduler.monotonic());
    this.realTime = sync(() => this._scheduler.realTime());
    this.isDeadlocked = sync(() => this._isDeadlocked());
    this.nextInterval = sync(() => this._scheduler.nextInterval());

    this._fiber = new FiberRuntime<A>(
      { scheduler: this._scheduler },
      program as unknown as Op<A>,
      null,
      null,
      (outcome) => {
        const result = Object.create(OutcomeProto) as Writable<Outcome<Identity, unknown, A>>;
        result._tag = outcome._tag;
        if (outcome._tag === "Succeeded")
          (result as Narrow<typeof result, "Succeeded">)._0 = (
            outcome._0 as Narrow<typeof outcome._0, "Pure">
          )._0 as Call1<Identity, A>;
        else if (outcome._tag === "Failed")
          (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
        this._result = result;
      },
    );

    this._scheduler.scheduleTask(() => {
      this._fiber.run();
    });
  }

  /**
   * Executes all work that is already runnable at the current virtual time.
   */
  public tick(): IO<void> {
    return sync(() => {
      this._scheduler.tick();
    });
  }

  /**
   * Executes at most one ready scheduler turn.
   */
  public tickOne(): IO<boolean> {
    return sync(() => this._scheduler.step());
  }

  /**
   * Drives the runtime until the program completes or deadlocks.
   */
  public tickAll(): IO<void> {
    return sync(() => {
      while (true) {
        this._scheduler.tick();

        if (this._result !== null || this._isDeadlocked()) return;

        const interval = this._scheduler.nextTimerInterval();
        if (interval === null) return;

        this._scheduler.advance(interval);
      }
    });
  }

  /**
   * Drives the runtime forward for at most the given virtual duration.
   */
  public tickFor(ms: number): IO<void> {
    return sync(() => {
      if (ms < 0) throw new RangeError("TestControl.tickFor requires a non-negative delay");

      let remaining = ms;

      this._scheduler.tick();

      while (remaining > 0 && this._result === null && !this._isDeadlocked()) {
        const step = Math.min(remaining, this._scheduler.nextInterval());

        if (step <= 0) return;

        this._scheduler.advance(step);
        remaining -= step;
        this._scheduler.tick();
      }
    });
  }

  /**
   * Requests cancellation of the controlled program.
   */
  public cancel(): IO<void> {
    return sync(() => {
      if (this._result !== null) return;

      unsafeRun(this._fiber.cancel() as unknown as IO<void>, { scheduler: this._scheduler });
    });
  }

  /**
   * Advances virtual time without running newly-due work.
   */
  public advance(ms: number): IO<void> {
    return sync(() => {
      this._scheduler.advance(ms);
    });
  }

  /**
   * Advances virtual time and then drains all ready work.
   */
  public advanceAndTick(ms: number): IO<void> {
    return sync(() => {
      this._scheduler.advance(ms);
      this._scheduler.tick();
    });
  }

  /**
   * Advances virtual time to an absolute monotonic time without running newly-due work.
   */
  public advanceTo(timeMs: number): IO<void> {
    return sync(() => {
      this._scheduler.advanceTo(timeMs);
    });
  }

  /**
   * Advances virtual time to the next scheduled timer, if any.
   */
  public advanceToNext(): IO<number | null> {
    return sync(() => this._scheduler.advanceToNext());
  }

  private _isDeadlocked(): boolean {
    const hasReadyTasks = this._scheduler.hasReadyTasks();
    const hasPendingTimers = this._scheduler.hasPendingTimers();

    return this._result === null && !hasReadyTasks && !hasPendingTimers;
  }
}

// -----------------------------------------------------------------------------
// Internal scheduler
// -----------------------------------------------------------------------------
class ControlledScheduler implements Scheduler {
  declare private _seed: number;
  declare private _randomState: number;
  declare private _monotonic: number;
  declare private _realTime: number;
  declare private _maxOpCountBeforeAutoYield: number;

  declare private _microtasks: (() => void)[];
  declare private _macrotasks: (() => void)[];
  declare private _delays: {
    readonly id: number;
    readonly dueTime: number;
    readonly thunk: () => void;
    cancelled: boolean;
  }[];
  declare private _nextDelayId: number;

  constructor(options: TestControlOptions = {}) {
    this._seed =
      // eslint-disable-next-line sonarjs/pseudo-random
      (options.seed !== void 0 ? options.seed : Math.floor(Math.random() * 0x100000000)) >>> 0;
    this._randomState = this._seed;
    this._monotonic = options.monotonic !== void 0 ? options.monotonic : 0;
    this._realTime = options.realTime !== void 0 ? options.realTime : 0;
    this._maxOpCountBeforeAutoYield =
      options.maxOpCountBeforeAutoYield !== void 0 ?
        options.maxOpCountBeforeAutoYield
      : Number.MAX_SAFE_INTEGER;

    this._microtasks = [];
    this._macrotasks = [];
    this._delays = [];
    this._nextDelayId = 0;
  }

  public seed(): number {
    return this._seed;
  }

  public monotonic(): number {
    return this._monotonic;
  }

  public realTime(): number {
    return this._realTime;
  }

  public shouldYield(currOpCount: number): boolean {
    return currOpCount >= this._maxOpCountBeforeAutoYield;
  }

  public scheduleTask(thunk: () => void, cede?: boolean): void {
    (cede ? this._macrotasks : this._microtasks).push(thunk);
  }

  public scheduleDelay(delayMs: number, thunk: () => void): () => void {
    const entry: (typeof this._delays)[number] = {
      id: this._nextDelayId++,
      dueTime: this._monotonic + (delayMs > 0 ? delayMs : 0),
      thunk,
      cancelled: false,
    };

    let index = 0;
    while (index < this._delays.length) {
      const curr = this._delays[index]!;
      if (curr.dueTime > entry.dueTime || (curr.dueTime === entry.dueTime && curr.id > entry.id))
        break;
      ++index;
    }

    this._delays.splice(index, 0, entry);

    return () => {
      entry.cancelled = true;
    };
  }

  public step(): boolean {
    this._flushDueTasks();

    const microtask = this._takeRandomTask(this._microtasks);
    if (microtask) {
      microtask();
      return true;
    }

    const macrotask = this._takeRandomTask(this._macrotasks);
    if (!macrotask) return false;

    macrotask();
    return true;
  }

  public tick(): void {
    while (this.step()) void 0;
  }

  public advance(ms: number): void {
    if (ms < 0) throw new RangeError("TestControl.advance requires a non-negative delay");

    this._monotonic += ms;
    this._realTime += ms;
    this._flushDueTasks();
  }

  public advanceTo(timeMs: number): void {
    if (timeMs < this._monotonic)
      throw new RangeError("TestControl.advanceTo cannot move time backwards");

    this.advance(timeMs - this._monotonic);
  }

  public advanceToNext(): number | null {
    const interval = this.nextTimerInterval();
    if (interval === null) return null;

    this.advance(interval);
    return interval;
  }

  public nextInterval(): number {
    this._flushDueTasks();

    if (this._microtasks.length > 0 || this._macrotasks.length > 0) return 0;

    const nextDelay = this._delays[0];
    return nextDelay ? Math.max(0, nextDelay.dueTime - this._monotonic) : 0;
  }

  public nextTimerInterval(): number | null {
    this._dropCancelledDelays();

    const nextDelay = this._delays[0];
    return nextDelay ? Math.max(0, nextDelay.dueTime - this._monotonic) : null;
  }

  public hasReadyTasks(): boolean {
    this._flushDueTasks();
    return this._microtasks.length > 0 || this._macrotasks.length > 0;
  }

  public hasPendingTimers(): boolean {
    this._dropCancelledDelays();
    return this._delays.length > 0;
  }

  private _dropCancelledDelays(): void {
    while (this._delays.length > 0 && this._delays[0]!.cancelled) this._delays.shift();
  }

  private _flushDueTasks(): void {
    this._dropCancelledDelays();

    while (this._delays.length > 0) {
      const nextDelay = this._delays[0]!;
      if (nextDelay.dueTime > this._monotonic) return;

      this._delays.shift();
      if (!nextDelay.cancelled) this._macrotasks.push(nextDelay.thunk);
      this._dropCancelledDelays();
    }
  }

  private _takeRandomTask(tasks: (() => void)[]): (() => void) | undefined {
    const length = tasks.length;
    if (length === 0) return void 0;
    if (length === 1) return tasks.pop();

    const index = this._nextUint32() % length;
    const task = tasks[index]!;
    const last = tasks.pop()!;

    if (index < tasks.length) tasks[index] = last;

    return task;
  }

  private _nextUint32(): number {
    let state = (this._randomState += 0x6d2b79f5);
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return (state ^ (state >>> 14)) >>> 0;
  }
}

// -----------------------------------------------------------------------------
// Internal type utilities
// -----------------------------------------------------------------------------
type Writable<A> = { -readonly [K in keyof A]: A[K] };

type Narrow<A, Tag extends string> = Extract<A, { _tag: Tag }>;
