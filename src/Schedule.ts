/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as core from "./core/Schedule";
import * as internal from "./internal/schedule";
import type { Dual } from "./utils";
import { dual } from "./utils";

/**
 * A pure {@linkcode Schedule} for recurring work.
 *
 * A {@linkcode Schedule} receives the 1-based attempt number for the next step it controls and the elapsed time in milliseconds since scheduling started.
 * Attempt `1` is the first step controlled by the {@linkcode Schedule}.
 * Returning `0` means recur immediately, while returning `undefined` means stop recurring.
 *
 * Use {@linkcode Schedule}s with {@linkcode IO.retry} and {@linkcode IO.schedule}, or evaluate them directly in tests because they are plain functions.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(
 *   Schedule.addDelay(() => 250),
 *   Schedule.upTo(5000),
 * );
 *
 * schedule(1, 0); // => 1250
 * schedule(5, 5000); // => undefined
 * ```
 */
export interface Schedule extends core.Schedule {
  readonly [Symbol.toStringTag]: "Schedule";

  /**
   * Pipe the {@linkcode Schedule} through a series of schedule transformations.
   */
  pipe<A>(this: A): A;
  pipe<A, B = never>(this: A, ab: (a: A) => B): B;
  // prettier-ignore
  pipe<A, B = never, C = never>(this: A, ab: (a: A) => B, bc: (b: B) => C): C;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): H;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): I;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): J;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K): K;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L): L;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M): M;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N): N;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O): O;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P): P;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q): Q;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R): R;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S): S;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T): T;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U): U;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V): V;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W): W;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X): X;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y): Y;
  // prettier-ignore
  pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never, Z = never>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y, yz: (y: Y) => Z): Z;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
/**
 * Constructs a {@linkcode Schedule} that recurs forever with no built-in delay.
 *
 * This schedule always returns `0`, so the caller will immediately continue unless the schedule is later transformed with {@linkcode addDelay}, {@linkcode modifyDelay}, or {@linkcode upTo}.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.forever().pipe(Schedule.addDelay(() => 1000));
 *
 * schedule(1, 0); // => 1000
 * schedule(100, 99_000); // => 1000
 * ```
 */
export const forever: () => Schedule = /* @__PURE__ */ core.deriveForever<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} that permits exactly one schedule-controlled step.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.once();
 *
 * schedule(1, 0); // => 0
 * schedule(2, 0); // => undefined
 * ```
 */
export const once: () => Schedule = /* @__PURE__ */ core.deriveOnce<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} that permits at most `n` schedule-controlled steps with no built-in delay.
 *
 * This {@linkcode Schedule} controls only how many steps are permitted and does not add delay on its own.
 * Passing `0` means the schedule stops immediately.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.recurs(2);
 *
 * schedule(1, 0); // => 0
 * schedule(2, 0); // => 0
 * schedule(3, 0); // => undefined
 * ```
 */
export const recurs: (n: number) => Schedule = /* @__PURE__ */ core.deriveRecurs<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} that waits the same delay between every recurrence.
 *
 * Unlike {@linkcode fixed}, this {@linkcode Schedule}'s delay is measured from the end of the previous run rather than from the original start time.
 * That means long-running actions push the whole schedule later instead of causing the next recurrence to “catch up”.
 *
 * ```plaintext
 * [run 1 done] |---- ms ----| [run 2 done] |---- ms ----| [run 3]
 * ```
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(Schedule.upTo(2500));
 *
 * schedule(1, 0); // => 1000
 * schedule(2, 1500); // => 1000
 * schedule(3, 2500); // => undefined
 * ```
 */
export const spaced: (ms: number) => Schedule = /* @__PURE__ */ core.deriveSpaced<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} that tries to stay aligned to multiples of the interval measured from the start time.
 *
 * Unlike {@linkcode spaced}, this {@linkcode Schedule} keeps aiming for the original timeline rather than waiting a full interval after each completion.
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
 * const schedule = Schedule.fixed(1000);
 *
 * schedule(1, 100); // => 900
 * schedule(2, 1500); // => 500
 * schedule(2, 2200); // => 0
 * ```
 */
export const fixed: (ms: number) => Schedule = /* @__PURE__ */ core.deriveFixed<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} that waits for the next interval boundary measured from the start time.
 *
 * Time is divided into equal windows and the {@linkcode Schedule} always waits for the next window boundary.
 * If a run finishes halfway through a window, the schedule sleeps until the next window starts.
 * Unlike {@linkcode fixed}, landing exactly on a boundary waits one full interval before recurring again.
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
 * const schedule = Schedule.windowed(1000);
 *
 * schedule(1, 100); // => 900
 * schedule(2, 1000); // => 1000
 * schedule(3, 2500); // => 500
 * ```
 */
export const windowed: (ms: number) => Schedule = /* @__PURE__ */ core.deriveWindowed<Schedule>(
  internal.ScheduleProto,
);

/**
 * Constructs a {@linkcode Schedule} whose delays grow geometrically.
 *
 * This {@linkcode Schedule} implements exponential backoff.
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
 * const schedule = Schedule.exponential(250);
 *
 * schedule(1, 0); // => 500
 * schedule(2, 0); // => 1000
 * schedule(3, 0); // => 2000
 * ```
 */
export const exponential: (baseMs: number, factor?: number) => Schedule =
  /* @__PURE__ */ core.deriveExponential<Schedule>(internal.ScheduleProto);

/**
 * Constructs a {@linkcode Schedule} whose delays follow the Fibonacci sequence scaled by `baseMs`.
 *
 * This {@linkcode Schedule} grows more gradually than {@linkcode exponential}: delays still increase over time, but less aggressively.
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
 * const schedule = Schedule.fibonacci(250);
 *
 * schedule(1, 0); // => 250
 * schedule(2, 0); // => 250
 * schedule(3, 0); // => 500
 * schedule(4, 0); // => 750
 * ```
 */
export const fibonacci: (baseMs: number) => Schedule =
  /* @__PURE__ */ core.deriveFibonacci<Schedule>(internal.ScheduleProto);

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
/**
 * Transforms every produced delay with a pure function.
 *
 * This is the most general way to reshape a {@linkcode Schedule}'s delays without changing when it stops.
 * `undefined` remains `undefined`, and negative transformed delays are clamped to `0`.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(Schedule.modifyDelay((delay) => delay / 2));
 *
 * schedule(1, 0); // => 500
 * ```
 */
export const modifyDelay: Dual<
  (self: Schedule, f: (delay: number) => number) => Schedule,
  (f: (delay: number) => number) => (self: Schedule) => Schedule
> = /* @__PURE__ */ dual(
  2,
  /* @__PURE__ */ core.deriveModifyDelay<Schedule>(internal.ScheduleProto),
);

/**
 * Adds an extra delay to every recurrence.
 *
 * This adds an extra offset to every produced delay.
 * The combined delay is clamped at `0`, so negative additions can shorten a schedule but never produce a negative wait.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(Schedule.addDelay(() => 250));
 *
 * schedule(1, 0); // => 1250
 * ```
 */
export const addDelay: Dual<
  (self: Schedule, f: () => number) => Schedule,
  (f: () => number) => (self: Schedule) => Schedule
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveAddDelay<Schedule>(internal.ScheduleProto));

/**
 * Stops a {@linkcode Schedule} once the elapsed time reaches the given upper bound.
 *
 * This applies an overall elapsed-time limit to the whole {@linkcode Schedule}.
 * The current elapsed time is checked before delegating to the wrapped schedule, so `elapsedMs === max` already terminates the schedule.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(Schedule.upTo(2500));
 *
 * schedule(1, 2400); // => 1000
 * schedule(1, 2500); // => undefined
 * ```
 */
export const upTo: Dual<
  (self: Schedule, max: number) => Schedule,
  (max: number) => (self: Schedule) => Schedule
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveUpTo<Schedule>(internal.ScheduleProto));

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
 * const schedule = Schedule.spaced(1000).pipe(Schedule.jittered);
 *
 * schedule(1, 0); // => between 800 and 1200
 * ```
 */
export const jittered: (self: Schedule) => Schedule = /* @__PURE__ */ core.deriveJittered<Schedule>(
  internal.ScheduleProto,
);

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
 * const schedule = Schedule.once().pipe(Schedule.union(Schedule.spaced(1500)));
 *
 * schedule(1, 0); // => 0
 * schedule(2, 0); // => 1500
 * ```
 */
export const union: Dual<
  (left: Schedule, right: Schedule) => Schedule,
  (that: Schedule) => (self: Schedule) => Schedule
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveUnion<Schedule>(internal.ScheduleProto));

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
 * const schedule = Schedule.once().pipe(Schedule.intersect(Schedule.spaced(1500)));
 *
 * schedule(1, 0); // => 1500
 * schedule(2, 1500); // => undefined
 * ```
 */
export const intersect: Dual<
  (left: Schedule, right: Schedule) => Schedule,
  (that: Schedule) => (self: Schedule) => Schedule
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveIntersect<Schedule>(internal.ScheduleProto));
