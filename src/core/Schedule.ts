/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * A pure schedule for recurring work.
 *
 * A schedule receives the 1-based attempt number for the next step it controls and the elapsed time in milliseconds since scheduling started.
 * Attempt `1` is the first step controlled by the schedule.
 * Returning `0` means recur immediately, while returning `undefined` means stop recurring.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = upTo(spaced(1000), 5000);
 *
 * schedule(1, 0); // => 1000
 * schedule(5, 5000); // => undefined
 * ```
 */
export interface Schedule {
  // eslint-disable-next-line @typescript-eslint/prefer-function-type
  (attempt: number, elapsedMs: number): number | undefined;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveUnsafeCreate = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) =>
  function unsafeCreate(run: Schedule): ScheduleType {
    return Object.setPrototypeOf(run, ScheduleProto) as ScheduleType;
  };

export const deriveForever = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that recurs forever with no built-in delay.
   *
   * This schedule always returns `0`, so the caller will immediately continue unless the schedule is later transformed with `addDelay`, `modifyDelay`, or `upTo`.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = addDelay(forever(), () => 1000);
   *
   * schedule(1, 0); // => 1000
   * schedule(100, 99_000); // => 1000
   * ```
   */
  return function forever(): ScheduleType {
    return unsafeCreate(function forever() {
      return 0;
    });
  };
};

export const deriveOnce = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const recurs = deriveRecurs<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that permits exactly one schedule-controlled step.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = once();
   *
   * schedule(1, 0); // => 0
   * schedule(2, 0); // => undefined
   * ```
   */
  return function once(): ScheduleType {
    return recurs(1);
  };
};

export const deriveRecurs = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that permits at most `n` schedule-controlled steps with no built-in delay.
   *
   * This schedule controls only how many steps are permitted and does not add delay on its own.
   * Passing `0` means the schedule stops immediately.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = recurs(2);
   *
   * schedule(1, 0); // => 0
   * schedule(2, 0); // => 0
   * schedule(3, 0); // => undefined
   * ```
   */
  return function recurs(n: number): ScheduleType {
    return unsafeCreate(function recurs(attempt) {
      return attempt <= n ? 0 : void 0;
    });
  };
};

export const deriveSpaced = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that waits the same delay between every recurrence.
   *
   * Unlike `fixed`, this delay is measured from the end of the previous run rather than from the original start time.
   * That means long-running actions push the whole schedule later instead of causing the next recurrence to catch up.
   *
   * ```plaintext
   * [run 1 done] |---- ms ----| [run 2 done] |---- ms ----| [run 3]
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = spaced(1000);
   *
   * schedule(1, 0); // => 1000
   * schedule(2, 1500); // => 1000
   * ```
   */
  return function spaced(ms: number): ScheduleType {
    return unsafeCreate(function spaced() {
      return ms;
    });
  };
};

export const deriveFixed = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that tries to stay aligned to multiples of the interval measured from the start time.
   *
   * Unlike `spaced`, this schedule keeps aiming for the original timeline rather than waiting a full interval after each completion.
   * If a previous run took longer than expected, the next delay is shortened so the schedule can catch up.
   * Non-positive intervals behave like immediate recurrence.
   *
   * ```plaintext
   * |----- interval -----|----- interval -----|----- interval -----|
   * |--------- action --------||action|-------|action|-------------|
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = fixed(1000);
   *
   * schedule(1, 100); // => 900
   * schedule(2, 1500); // => 500
   * schedule(2, 2200); // => 0
   * ```
   */
  return function fixed(intervalMs: number): ScheduleType {
    const interval = intervalMs > 0 ? intervalMs : 0;

    return unsafeCreate(function fixed(attempt, elapsed) {
      if (interval === 0) return 0;

      const target = attempt * interval;
      return target > elapsed ? target - elapsed : 0;
    });
  };
};

export const deriveWindowed = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule that waits for the next interval boundary measured from the start time.
   *
   * Time is divided into equal windows and the schedule always waits for the next window boundary.
   * If a run finishes halfway through a window, the schedule sleeps until the next window starts.
   * Unlike `fixed`, landing exactly on a boundary waits one full interval before recurring again.
   * Non-positive intervals behave like immediate recurrence.
   *
   * ```plaintext
   *      ms         ms         ms         ms
   * |----------|----------|----------|----------|
   * |action------|sleep---|act|-sleep|action----|
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = windowed(1000);
   *
   * schedule(1, 100); // => 900
   * schedule(2, 1000); // => 1000
   * schedule(3, 2500); // => 500
   * ```
   */
  return function windowed(intervalMs: number): ScheduleType {
    const interval = intervalMs > 0 ? intervalMs : 0;

    return unsafeCreate(function windowed(_attempt, elapsed) {
      if (interval === 0) return 0;

      const remainder = elapsed % interval;
      return remainder === 0 ? interval : interval - remainder;
    });
  };
};

export const deriveFibonacci = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  const sqrt5 = Math.sqrt(5);
  const phi = (1 + sqrt5) / 2;
  const psi = (1 - sqrt5) / 2;

  /**
   * Constructs a schedule whose delays follow the Fibonacci sequence scaled by `baseMs`.
   *
   * This schedule grows more gradually than `exponential`: delays still increase over time, but less aggressively.
   * The pattern is `baseMs, baseMs, 2*baseMs, 3*baseMs, 5*baseMs, ...`.
   *
   * ```plaintext
   * attempt: 1      2      3      4      5
   * delay:   1x     1x     2x     3x     5x of baseMs
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = fibonacci(250);
   *
   * schedule(1, 0); // => 250
   * schedule(2, 0); // => 250
   * schedule(3, 0); // => 500
   * ```
   */
  return function fibonacci(baseMs: number): ScheduleType {
    return unsafeCreate(function fibonacci(attempt) {
      return Math.round((Math.pow(phi, attempt) - Math.pow(psi, attempt)) / sqrt5) * baseMs;
    });
  };
};

export const deriveExponential = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Constructs a schedule whose delays grow geometrically.
   *
   * This schedule implements exponential backoff.
   * The delay for attempt `n` is `baseMs * factor^n`, so with the default factor `2` the delay doubles on every recurrence.
   * This is useful when repeated failures should quickly back off from the original rate.
   *
   * ```plaintext
   * attempt: 1    2     3     4
   * delay:   2x   4x    8x   16x of baseMs
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = exponential(250);
   *
   * schedule(1, 0); // => 500
   * schedule(2, 0); // => 1000
   * schedule(3, 0); // => 2000
   * ```
   */
  return function exponential(baseMs: number, factor = 2): ScheduleType {
    return unsafeCreate(function exponential(attempt) {
      return Math.pow(factor, attempt) * baseMs;
    });
  };
};

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveModifyDelay = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Transforms every produced delay with a pure function.
   *
   * This is the most general way to reshape a schedule's delays without changing when it stops.
   * `undefined` remains `undefined`, and negative transformed delays are clamped to `0`.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = modifyDelay(spaced(1000), (delay) => delay / 2);
   *
   * schedule(1, 0); // => 500
   * ```
   */
  return function modifyDelay(self: Schedule, f: (delay: number) => number): ScheduleType {
    return unsafeCreate(function modifyDelay(attempt, elapsed) {
      const delay = self(attempt, elapsed);
      if (delay === void 0) return void 0;
      const modifiedDelay = f(delay);
      return modifiedDelay > 0 ? modifiedDelay : 0;
    });
  };
};

export const deriveAddDelay = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const modifyDelay = deriveModifyDelay<ScheduleType>(ScheduleProto);

  /**
   * Adds an extra delay to every recurrence.
   *
   * This adds an extra offset to every produced delay.
   * The combined delay is clamped at `0`, so negative additions can shorten a schedule but never produce a negative wait.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = addDelay(spaced(1000), () => 250);
   *
   * schedule(1, 0); // => 1250
   * ```
   */
  return function addDelay(self: Schedule, f: () => number): ScheduleType {
    return modifyDelay(self, (delay) => delay + f());
  };
};

export const deriveUpTo = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Stops a schedule once the elapsed time reaches the given upper bound.
   *
   * This applies an overall elapsed-time limit to the whole schedule.
   * The current elapsed time is checked before delegating to the wrapped schedule, so `elapsedMs === max` already terminates the schedule.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = upTo(spaced(1000), 2500);
   *
   * schedule(1, 2400); // => 1000
   * schedule(1, 2500); // => undefined
   * ```
   */
  return function upTo(self: Schedule, max: number): ScheduleType {
    return unsafeCreate(function upTo(attempt, elapsed) {
      return elapsed < max ? self(attempt, elapsed) : void 0;
    });
  };
};

export const deriveJittered = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Randomizes each produced delay into the default `0.8x` to `1.2x` range.
   *
   * This preserves the underlying recurrence pattern, but replaces exact delays with a small randomized band around each one.
   * For example, a `1000` millisecond delay becomes something between `800` and `1200` milliseconds.
   * Stopping behavior is preserved, so a wrapped schedule that returns `undefined` still stops immediately.
   *
   * **Example**
   *
   * ```typescript
   * const schedule = jittered(spaced(1000));
   *
   * schedule(1, 0); // => between 800 and 1200
   * ```
   */
  return function jittered(self: Schedule): ScheduleType {
    return unsafeCreate(function jittered(attempt, elapsed) {
      const delay = self(attempt, elapsed);
      if (delay === void 0) return void 0;
      // eslint-disable-next-line sonarjs/pseudo-random
      const jitteredDelay = delay * (0.8 + Math.random() * 0.4);
      return jitteredDelay > 0 ? jitteredDelay : 0;
    });
  };
};

export const deriveUnion = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Combines two schedules and recurs whenever either schedule wants to recur.
   *
   * If either schedule still wants to continue, the combined schedule continues.
   * When both schedules recur, the shorter delay wins.
   *
   * ```plaintext
   * left:   0ms ---- stop
   * right: 1500ms - 1500ms - 1500ms - ...
   * union:  0ms --- 1500ms - 1500ms - ...
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = union(once(), spaced(1500));
   *
   * schedule(1, 0); // => 0
   * schedule(2, 0); // => 1500
   * ```
   */
  return function union(left: Schedule, right: Schedule): ScheduleType {
    return unsafeCreate(function union(attempt, elapsed) {
      const l = left(attempt, elapsed);
      const r = right(attempt, elapsed);

      if (l === void 0) return r;
      if (r === void 0) return l;
      return Math.min(l, r);
    });
  };
};

export const deriveIntersect = <ScheduleType extends Schedule>(
  ScheduleProto: object | null = Function.prototype,
) => {
  const unsafeCreate = deriveUnsafeCreate<ScheduleType>(ScheduleProto);

  /**
   * Combines two schedules and recurs only while both schedules want to recur.
   *
   * If either schedule stops, the combined schedule stops.
   * When both schedules recur, the longer delay wins.
   *
   * ```plaintext
   * left:      0ms ---- stop
   * right:  1500ms - 1500ms - 1500ms - ...
   * meet:   1500ms ---- stop
   * ```
   *
   * **Example**
   *
   * ```typescript
   * const schedule = intersect(once(), spaced(1500));
   *
   * schedule(1, 0); // => 1500
   * schedule(2, 1500); // => undefined
   * ```
   */
  return function intersect(left: Schedule, right: Schedule): ScheduleType {
    return unsafeCreate(function intersect(attempt, elapsed) {
      const l = left(attempt, elapsed);
      const r = right(attempt, elapsed);

      return l === void 0 || r === void 0 ? void 0 : Math.max(l, r);
    });
  };
};
