/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Re-exports all functions and methods in a chainable API.
 * Some specialized functions/methods (e.g., `IO.isIO`, `IO.try` and `IO#andThen`) that only make sense in this chainable API are also defined here.
 * @module
 * @private
 * @internal
 */

import type { PartialApply, RawArg0, RawTArg, TypeLambdaG } from "hkt-core";

import type { Deferred, DeferredHKT } from "./Deferred";
import type { Fiber, FiberHKT } from "./Fiber";
import type { FiberLocal, FiberLocalHKT } from "./FiberLocal";
import type { Outcome, OutcomeHKT } from "./Outcome";
import type { Ref, RefHKT } from "./Ref";
import type { RequestOptions } from "./core/IO";
import * as core from "./core/IO";
import type { Schedule } from "./core/Schedule";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CancellationError, NoScheduledExecutionError, TimeoutError } from "./errors";
import { DeferredProto } from "./internal/deferred";
import { FiberProto } from "./internal/fiber";
import { FiberLocalProto } from "./internal/fiberLocal";
import * as internal from "./internal/io";
import type { FiberRuntime, FiberRuntimeOptions } from "./internal/kernel";
import { OutcomeProto } from "./internal/outcome";
import { RefProto } from "./internal/ref";
import type { Return } from "./typeclass/Do";
import type { RetryOptions } from "./typeclass/Sleep";
import type { Dual } from "./utils";
import { dual } from "./utils";

export type { FiberRuntimeOptions, Scheduler } from "./internal/kernel";
export { void_ as void };

export type IOOutcome<A> = Outcome<IOHKT, unknown, A>;
export type IOFiber<A> = Fiber<IOHKT, unknown, A>;
export type IOFiberLocal<A> = FiberLocal<IOHKT, A>;
export type IORef<A> = Ref<IOHKT, A>;
export type IODeferred<A> = Deferred<IOHKT, A>;

// ╔════╗
// ║ IO ║
// ╚════╝
/**
 * {@linkcode IO} represents a computation that can be executed to produce a value.
 *
 * _Cancellation_ is supported via {@linkcode IO.cont}.
 *
 * **Note**: {@linkcode IO} does not distinguish between synchronous and asynchronous computations.
 * Use {@linkcode IO.sync}, {@linkcode IO.asyncUncancellable}, {@linkcode IO.asyncCancellable}, or {@linkcode IO.promise} to create an {@linkcode IO} instance.
 * Run it **synchronously** with {@linkcode IO.unsafeRunSync}, **asynchronously** with {@linkcode IO.unsafeRunPromise}, or with the callback-style {@linkcode IO.unsafeRun} — {@linkcode IO.unsafeRunSync} throws a `TypeError` if the computation is asynchronous.
 *
 * **Note**: The {@linkcode MonadThrow} type class is implemented via a built-in error channel to allow imperative-style error handling through {@linkcode IO.throw} and {@linkcode IO.catch}.
 * The error information is not encoded into the {@linkcode IO} type itself for simplicity, so these methods are best used for “unexpected” errors.
 * For more predictable error handling, define a Rust-like `Result<E, A>` type and use `IO<Result<E, A>>` instead.
 *
 * **Example** (abstract side effects with {@linkcode IO})
 *
 * ```typescript
 * IO.unsafeRun(IO.println("Hello, world!"));
 * //> Hello, world!
 *
 * const random = () => IO.sync(() => Math.random());
 * const getTime = () => IO.sync(() => Date.now());
 *
 * IO.unsafeRunSync(random()); // => <random number>
 * IO.unsafeRunSync(getTime()); // => <current timestamp>
 *
 * const randomAdd = () =>
 *   IO.liftA2((a: number, b: number) => a + b)(random(), random());
 *
 * IO.unsafeRunSync(randomAdd()); // => <random number>
 * ```
 *
 * **Example** (“do” notation)
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bind("a", () => random()),
 *   IO.bind("b", () => random()),
 *   IO.let("full", ({ a, b }) => a + b),
 *   IO.bind("currTime", () => getTime()),
 *   IO.return(({ full, currTime }) => `Result: ${full}, Time: ${currTime}`),
 * );
 * IO.unsafeRunSync(program); // => "Result: <random number>, Time: <current timestamp>"
 * ```
 *
 * **Example** (generator syntax)
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const a = yield* random();
 *   const b = yield* random();
 *   const full = a + b;
 *   const currTime = yield* getTime();
 *   return `Result: ${full}, Time: ${currTime}`;
 * });
 * IO.unsafeRunSync(program); // => "Result: <random number>, Time: <current timestamp>"
 * ```
 */
export interface IO<out A> extends core.IO<A>, Iterable<IO<A>, A, unknown> {
  readonly [Symbol.toStringTag]: "IO";

  /**
   * Pipe the value through a series of functions.
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

export namespace IO {
  /**
   * Extracts the value type from an {@linkcode IO}.
   */
  export type Value<T> = T extends IO<infer A> ? A : never;
}

export interface IOHKT extends TypeLambdaG<["A"]> {
  signature: (A: RawTArg<this, "A">) => IO<RawTArg<this, "A">>;
  return: IO<RawArg0<this>>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
/**
 * Creates a pure {@linkcode IO} that immediately succeeds with the given value.
 */
export const of: <A>(a: A) => IO<A> = /* @__PURE__ */ core.deriveOf<IOHKT>(internal.IOProto);

/**
 * Creates a pure {@linkcode IO} that immediately succeeds with `undefined`.
 */
const void_: () => IO<void> = /* @__PURE__ */ core.deriveVoid<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} that immediately fails with the given error.
 */
const throw_: <A = never>(e: unknown) => IO<A> = /* @__PURE__ */ core.deriveThrow<IOHKT>(
  internal.IOProto,
);
export { throw_ as throw };

/**
 * Creates an {@linkcode IO} from a synchronous function.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.sync(() => console.log("Hello, world!"));
 * IO.unsafeRun(program);
 * //> Hello, world!
 * ```
 */
export const sync: <A>(thunk: () => A) => IO<A> = /* @__PURE__ */ core.deriveSync<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} from a suspend function.
 *
 * **Example**
 *
 * ```typescript
 * let i = 0;
 *
 * const increment = IO.suspend(() => IO.of(i++));
 *
 * console.log(IO.unsafeRunSync(increment));
 * //> 0
 * console.log(IO.unsafeRunSync(increment));
 * //> 1
 * console.log(IO.unsafeRunSync(increment));
 * //> 2
 * ```
 */
export const suspend: <A>(thunk: () => IO<A>) => IO<A> = /* @__PURE__ */ core.deriveSuspend<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} from a continuation function.
 *
 * **Note:** This is a low-level primitive and is not meant for end users.
 * For a more ergonomic alternative, use {@linkcode sync}, {@linkcode asyncUncancellable}, {@linkcode asyncCancellable}, or {@linkcode promise}.
 *
 * The continuation function accepts three parameters: `succeed`, `fail`, and `get`.
 * - The `succeed` callback should be called with the result of the computation when it completes successfully.
 * - The `fail` callback should be called with an error if the computation fails.
 * - The `get` {@linkcode IO} awaits the result passed to `succeed` or `fail` and can be cancelled.
 *   Use {@linkcode IO.onCancel} to register a finalizer that runs if `get` is cancelled, or wrap it with {@linkcode uncancellable} to prevent cancellation.
 *
 * Note that only the **first** invocation of the `succeed` or `fail` callback will be considered, and subsequent calls will be silently ignored.
 *
 * The continuation function **must** return an {@linkcode IO} that represents the ongoing computation.
 * For example, `IO.uncancellable((poll) => poll(get).pipe(IO.onCancel(...)))` or `IO.uncancellable(() => get)`.
 */
export const cont: <X, A = X>(
  cont: (succeed: (a: X) => void, fail: (e: unknown) => void, get: IO<X>) => IO<A>,
) => IO<A> = /* @__PURE__ */ core.deriveCont<IOHKT>(internal.IOProto);

/**
 * Creates an uncancellable {@linkcode IO} from an asynchronous callback.
 */
export const asyncUncancellable: <A>(
  callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => void,
) => IO<A> = /* @__PURE__ */ core.deriveAsyncUncancellable<IOHKT>(internal.IOProto);

/**
 * Creates a cancellable {@linkcode IO} from an asynchronous callback.
 *
 * This function should return an {@linkcode IO} as the cancellation finalizer, which will be called if the operation is cancelled.
 */
export const asyncCancellable: <A>(
  callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => IO<void>,
) => IO<A> = /* @__PURE__ */ core.deriveAsyncCancellable<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} from a function that may return an {@linkcode IO}, a {@linkcode PromiseLike}, or a direct value.
 * It is similar to {@linkcode Promise.try}.
 *
 * The function `f` is invoked with the provided arguments `args`, which can do one of the following:
 * - Returns an {@linkcode IO}: The resulting {@linkcode IO} is used directly.
 * - Returns a {@linkcode PromiseLike}: An {@linkcode IO} is created that resolves with the promise’s value.
 * - Throws an error: An {@linkcode IO} is created that fails with the thrown error.
 * - Returns a direct value: An {@linkcode IO} is created that succeeds with the returned value.
 */
const try_: <A, Args extends unknown[] = []>(
  f: (...args: Args) => A,
  ...args: Args
) => [A] extends [IO<A>] ? IO<A>
: [A] extends [PromiseLike<infer A>] ? IO<A>
: IO<A> = /* @__PURE__ */ (() => {
  const F = {
    of: core.deriveOf<IOHKT>(internal.IOProto),
    productR: core.deriveProductR<IOHKT>(internal.IOProto),
    flatMap: core.deriveFlatMap<IOHKT>(internal.IOProto),
    uncancellable: core.deriveUncancellable<IOHKT>(internal.IOProto),
    sync: core.deriveSync<IOHKT>(internal.IOProto),
    cont: core.deriveCont<IOHKT>(internal.IOProto),
  } as const;

  return function try_<A, Args extends unknown[] = []>(
    f: (...args: Args) => A,
    ...args: Args
  ): [A] extends [IO<A>] ? IO<A>
  : [A] extends [PromiseLike<infer A>] ? IO<A>
  : IO<A> {
    return F.flatMap(
      F.sync(() => f(...args)),
      (a) =>
        typeof a !== "object" || a === null ? F.of(a)
        : (
          Symbol.toStringTag in a &&
          a[Symbol.toStringTag] === "IO" &&
          "pipe" in a &&
          typeof a.pipe === "function"
        ) ?
          (a as unknown as IO<A>)
        : "then" in a && typeof a.then === "function" ?
          F.cont<A, A>((succeed, fail, get) =>
            F.uncancellable(() =>
              F.productR(
                F.sync(() => {
                  (a as PromiseLike<A>).then(succeed, fail);
                }),
                get,
              ),
            ),
          )
        : F.of(a),
    ) as never;
  };
})();
export { try_ as try };

/**
 * Creates an {@linkcode IO} from a {@linkcode Promise}.
 *
 * **Example**
 *
 * ```typescript
 * const sleep = (ms: number) => IO.promise<void>(() =>
 *   new Promise((resolve) => setTimeout(resolve, ms)),
 * );
 *
 * const program = sleep(1000).pipe(IO.andThen(IO.println("Hello, world!")));
 *
 * // After 1 second, it prints "Hello, world!" to the console.
 * await IO.unsafeRunPromise(program);
 * ```
 */
export const promise: <A>(
  f: (
    ...args: typeof globalThis extends { readonly AbortSignal: new () => infer AbortSignal } ?
      [signal: AbortSignal]
    : []
  ) => PromiseLike<A>,
) => IO<A> = /* @__PURE__ */ core.derivePromise<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} with generator syntax.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const name = yield* IO.input("Enter your name: ");
 *   yield* IO.println(`Hello, ${name}!`);
 * });
 *
 * IO.unsafeRun(program);
 * //> Enter your name: John
 * //> Hello, John!
 * ```
 */
export const gen: <A>(
  f: ($: <X>(fa: IO<X>) => Iterable<IO<X>, X, unknown>) => Iterable<IO<unknown>, A, unknown>,
) => IO<A> = /* @__PURE__ */ core.deriveGen<IOHKT>(internal.IOProto);

/**
 * Accesses the current fiber executing the {@linkcode IO}.
 *
 * Takes a function that receives the current {@linkcode RuntimeFiber} and returns an {@linkcode IO}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.withFiberRuntime((fiber) =>
 *   IO.println(`Current fiber ID: ${fiber.id}`),
 * );
 *
 * IO.unsafeRun(program);
 * //> Current fiber ID: 0
 * ```
 */
export const withFiberRuntime: <A>(withFiberRuntime: (fiber: FiberRuntime<any>) => IO<A>) => IO<A> =
  /* @__PURE__ */ core.deriveWithFiberRuntime<IOHKT>(internal.IOProto);

/**
 * Creates a self-cancelled {@linkcode IO}.
 */
export const cancelled: () => IO<void> = /* @__PURE__ */ core.deriveCancelled<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} that cannot be cancelled.
 * This is useful for wrapping operations that should not be interrupted, such as cleanup tasks or finalization logic.
 *
 * `poll` can be used to mark a region of code as cancellable.
 *
 * **Example**
 *
 * ```typescript
 * interface FileHandle {
 *   readLine: () => IO<string>;
 *   close: () => IO<void>;
 * }
 *
 * function acquireResource(): IO<FileHandle> {
 *   return IO.log("Acquiring resource...").pipe(
 *     IO.zipR(IO.sleep(1000)),
 *     IO.zipR(IO.log("Resource acquired")),
 *     IO.as({
 *       readLine: () => IO.sleep(2000).pipe(IO.as("line")),
 *       close: () => IO.log("File closed"),
 *     }),
 *   );
 * }
 *
 * function releaseResource(handle: FileHandle): IO<void> {
 *   return IO.log("Releasing resource...").pipe(
 *     IO.zipR(IO.sleep(1000)),
 *     IO.zipR(handle.close()),
 *   );
 * }
 *
 * const program = IO.uncancellable((poll) =>
 *   acquireResource().pipe(
 *     IO.flatMap((handle) =>
 *       poll(handle.readLine().pipe(IO.flatTap(IO.log))).pipe(
 *         IO.onCancel(releaseResource(handle)),
 *         IO.flatTap(() => releaseResource(handle)),
 *       ),
 *     ),
 *   ),
 * );
 *
 * IO.unsafeRun(program);
 * //> [2025-09-09 11:24:00.000] [info] [fiber #0] Acquiring resource...
 * //> [2025-09-09 11:24:01.000] [info] [fiber #0] Resource acquired
 * // (if not cancelled within 2 seconds)
 * //> [2025-09-09 11:24:03.000] [info] [fiber #0] line
 * // (should always run even if cancelled)
 * //> [2025-09-09 11:24:03.000] [info] [fiber #0] Releasing resource...
 * //> [2025-09-09 11:24:04.000] [info] [fiber #0] File closed
 * ```
 */
export const uncancellable: <A>(body: (poll: <X>(io: IO<X>) => IO<X>) => IO<A>) => IO<A> =
  /* @__PURE__ */ core.deriveUncancellable<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} computation that returns the current **monotonic** time in **milliseconds** since an arbitrary fixed point in the past.
 * Unlike {@linkcode realTime}, the value returned by {@linkcode monotonic} is a floating-point number with up to **microsecond** precision.
 *
 * This is useful for measuring elapsed time, as it is not affected by changes to the system clock.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const start = yield* IO.monotonic();
 *   yield* IO.sleep(1000);
 *   const end = yield* IO.monotonic();
 *   const elapsed = end - start;
 *   yield* IO.println(`Elapsed time: ${elapsed} ms`);
 * });
 *
 * IO.unsafeRun(program);
 * //> Elapsed time: 1009.0614999999998 ms
 * ```
 */
export const monotonic: () => IO<number> = /* @__PURE__ */ core.deriveMonotonic<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} computation that returns the current real time in **milliseconds** since the Unix epoch (January 1, 1970, 00:00:00 UTC).
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.realTime().pipe(
 *   IO.flatMap((time) => IO.println(`Current time: ${new Date(time).toISOString()}`)),
 * );
 *
 * IO.unsafeRun(program);
 * //> Current time: 2026-04-19T15:28:26.609Z
 * ```
 */
export const realTime: () => IO<number> = /* @__PURE__ */ core.deriveRealTime<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} computation that sleeps for the given number of milliseconds.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.sleep(1000).pipe(IO.zipR(IO.println("Hello, world!")));
 *
 * await IO.unsafeRunPromise(program);
 * // (after 1 second)
 * //> Hello, world!
 * ```
 */
export const sleep: (ms: number) => IO<void> = /* @__PURE__ */ core.deriveSleep<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} that never terminates.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.never();
 *
 * // This program will never terminate
 * await IO.unsafeRunPromise(program);
 * ```
 */
export const never: () => IO<never> = /* @__PURE__ */ core.deriveNever<IOHKT>(internal.IOProto);

/**
 * Yields execution to the event loop (macrotask), improving fairness.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.println("Start").pipe(
 *   IO.zipR(IO.cede()),
 *   IO.zipR(IO.println("After cede")),
 * );
 *
 * await IO.unsafeRunPromise(program);
 * //> Start
 * //> After cede
 * ```
 */
export const cede: () => IO<void> = /* @__PURE__ */ core.deriveCede<IOHKT>(internal.IOProto);

/**
 * A low-level primitive for racing two fibers against each other, returning the {@linkcode Outcome} of the winner along with the {@linkcode Fiber} of the loser.
 * The winner of the race is determined by which fiber completes first, regardless of whether it succeeds, fails, or is cancelled.
 *
 * **Important:** The losing fiber is _not_ automatically cancelled, and must be manually cancelled if it is no longer needed to avoid resource leaks.
 * It is recommended to use {@linkcode race2} instead of {@linkcode racePair} unless you need access to the losing fiber for some reason, as {@linkcode race2} will automatically cancel the losing fibers for you.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const result = yield* IO.racePair(
 *     IO.sleep(10).pipe(IO.as("fast")),
 *     IO.sleep(100).pipe(IO.as("slow")),
 *   );
 *
 *   if (Outcome.isOutcome(result[0])) {
 *     const [, loser] = result;
 *     yield* loser.pipe(Fiber.cancel);
 *     return "left";
 *   }
 *
 *   const [loser] = result;
 *   yield* loser.pipe(Fiber.cancel);
 *   return "right";
 * });
 *
 * await IO.unsafeRunPromise(program); // => "left"
 * ```
 */
export const racePair: <A, B>(
  left: IO<A>,
  right: IO<B>,
) => IO<readonly [IOOutcome<A>, IOFiber<B>] | readonly [IOFiber<A>, IOOutcome<B>]> =
  /* @__PURE__ */ core.deriveRacePair<
    IOHKT,
    PartialApply<FiberHKT, [IOHKT, unknown]>,
    PartialApply<OutcomeHKT, [IOHKT, unknown]>
  >(internal.IOProto, FiberProto, OutcomeProto);

/**
 * Races two {@linkcode IO} computations concurrently and returns the {@linkcode Outcome} of the winner.
 *
 * The losing computation is cancelled once the winning outcome is observed.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.race2Outcome(
 *   IO.sleep(10).pipe(IO.as("fast")),
 *   IO.sleep(100).pipe(IO.as("slow")),
 * );
 *
 * await IO.unsafeRunPromise(program);
 * // => Outcome { _tag: "Succeeded", _0: IO { _tag: "Pure", _0: "fast" } }
 * ```
 */
export const race2Outcome: <A, B>(left: IO<A>, right: IO<B>) => IO<IOOutcome<A | B>> =
  /* @__PURE__ */ core.deriveRace2Outcome<IOHKT, PartialApply<OutcomeHKT, [IOHKT, unknown]>>(
    internal.IOProto,
    OutcomeProto,
  );

/**
 * Races two {@linkcode IO} computations concurrently and returns the result of the winner.
 *
 * 1. If the winner succeeds, the race returns the value of the winner, and the loser is cancelled.
 * 2. If the winner fails, the race fails with the error of the winner, and the loser is cancelled.
 * 3. If the winner is cancelled, the race returns the result of the loser, consistent with the first two cases.
 * 4. If both computations are cancelled and the resulting computation is not in an uncancellable region, the resulting computation is cancelled.
 * 5. If both computations are cancelled and the resulting computation is in an uncancellable region, the resulting computation blocks indefinitely.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.race2(
 *   IO.sleep(10).pipe(IO.as("fast")),
 *   IO.sleep(100).pipe(IO.as("slow")),
 * );
 *
 * await IO.unsafeRunPromise(program); // => "fast"
 * ```
 */
export const race2: <A, B>(left: IO<A>, right: IO<B>) => IO<A | B> =
  /* @__PURE__ */ core.deriveRace2<IOHKT>(internal.IOProto);

/**
 * Runs two {@linkcode IO} computations concurrently and returns a tuple of their {@linkcode Outcome}s.
 *
 * If the resulting computation is cancelled before one or both computations complete, whichever computation that has not completed will be cancelled.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.bothOutcome(
 *   IO.throw("Oops!").pipe(IO.delay(1000)),
 *   IO.of("OK").pipe(IO.delay(2000)),
 * );
 *
 * await IO.unsafeRunPromise(program);
 * // => [
 * //   Outcome { _tag: "Failed", _0: "Oops!" },
 * //   Outcome { _tag: "Succeeded", _0: IO { _tag: "Pure", _0: "OK" } },
 * // ]
 * ```
 */
export const bothOutcome: <A, B>(
  left: IO<A>,
  right: IO<B>,
) => IO<readonly [IOOutcome<A>, IOOutcome<B>]> = /* @__PURE__ */ core.deriveBothOutcome<
  IOHKT,
  PartialApply<OutcomeHKT, [IOHKT, unknown]>
>(internal.IOProto, OutcomeProto);

/**
 * Runs two {@linkcode IO} computations concurrently and returns a tuple of their results.
 *
 * 1. If both computations succeed, the result will be a tuple of their values.
 * 2. If either computation fails, the result will be a failure with the error of the first computation that fails, and the other computation will be cancelled if it is still running.
 * 3. If either computation is cancelled and the resulting computation is not in an uncancellable region, the result will be a cancellation, and the other computation will be cancelled if it is still running.
 * 4. If either computation is cancelled and the resulting computation is in an uncancellable region, the result willing computation will block indefinitely, and the other computation will be cancelled if it is still running.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.both(
 *   IO.of("left").pipe(IO.delay(1000)),
 *   IO.of("right").pipe(IO.delay(2000)),
 * );
 *
 * await IO.unsafeRunPromise(program); // => ["left", "right"]
 * ```
 */
export const both: <A, B>(left: IO<A>, right: IO<B>) => IO<readonly [A, B]> =
  /* @__PURE__ */ core.deriveBoth<IOHKT>(internal.IOProto);

// -----------------------------------------------------------------------------
// Do notation
// -----------------------------------------------------------------------------
/**
 * Threads a context object through a sequence of steps in a lightweight do-notation style.
 *
 * Use it together with {@linkcode bind}, {@linkcode let}, {@linkcode also}, and {@linkcode return}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bind("left", () => IO.of("a")),
 *   IO.bind("right", () => IO.of("b")),
 *   IO.let("full", ({ left, right }) => left + right),
 *   IO.also(({ full }) => IO.println(`Full string: ${full}`)),
 *   IO.return(({ full }) => full.toUpperCase()),
 * );
 *
 * IO.unsafeRunSync(program); // => "AB"
 * //> Full string: AB
 * ```
 */
const do_: {
  <B = never>(ab: (ctx: IO<{}>) => Return<B>): B;
  (ab: (ctx: IO<{}>) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => Return<C>): C;
  // prettier-ignore
  <B = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => Return<D>): D;
  // prettier-ignore
  <B = never, C = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => Return<E>): E;
  // prettier-ignore
  <B = never, C = never, D = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => Return<F>): F;
  // prettier-ignore
  <B = never, C = never, D = never, E = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => Return<G>): G;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => Return<H>): H;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => Return<I>): I;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => Return<J>): J;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => Return<K>): K;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => Return<L>): L;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => Return<M>): M;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => Return<N>): N;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => Return<O>): O;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => Return<P>): P;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Return<Q>): Q;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => Return<R>): R;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => Return<S>): S;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => Return<T>): T;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => Return<U>): U;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => Return<V>): V;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => Return<W>): W;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => Return<X>): X;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Return<Y>): Y;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => IO<unknown>): IO<void>;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never, Z = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Y, yz: (ctx: Y) => Return<Z>): Z;
  // prettier-ignore
  <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(ab: (ctx: IO<{}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Y, yz: (ctx: Y) => IO<unknown>): IO<void>;
} = /* @__PURE__ */ core.deriveDo<IOHKT>(internal.IOProto);
export { do_ as do };

/**
 * Adds a derived pure field to the current do-notation context.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.let("a", () => 1),
 *   IO.let("b", ({ a }) => a + 1),
 *   IO.let("c", ({ a, b }) => a + b),
 *   IO.return(({ c }) => c * 2),
 * );
 *
 * IO.unsafeRunSync(program); // => 6
 * ```
 */
const let_: <Ctx, K extends PropertyKey, A>(
  name: K,
  f: (ctx: Ctx) => A,
) => (ctx: IO<Ctx>) => IO<{ [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }> =
  /* @__PURE__ */ core.deriveLet<IOHKT>(internal.IOProto);
export { let_ as let };

/**
 * Adds a constant field to the current do-notation context.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.letV("a", 1),
 *   IO.letV("b", 2),
 *   IO.let("c", ({ a, b }) => a + b),
 *   IO.return(({ c }) => c * 2),
 * );
 *
 * IO.unsafeRunSync(program); // => 6
 * ```
 */
export const letV: <K extends PropertyKey, A>(
  name: K,
  value: A,
) => <Ctx>(ctx: IO<Ctx>) => IO<{ [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }> =
  /* @__PURE__ */ core.deriveLetV<IOHKT>(internal.IOProto);

/**
 * Runs an {@linkcode IO} derived from the current do-notation context and stores its result under `name`.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bind("left", () => IO.of("a")),
 *   IO.bind("right", ({ left }) => IO.of(left + "b")),
 *   IO.return(({ left, right }) => left + right),
 * );
 *
 * IO.unsafeRunSync(program); // => "aab"
 * ```
 */
export const bind: <Ctx, K extends PropertyKey, A>(
  name: K,
  f: (ctx: Ctx) => IO<A>,
) => (ctx: IO<Ctx>) => IO<{ [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }> =
  /* @__PURE__ */ core.deriveBind<IOHKT>(internal.IOProto);

/**
 * Stores the result of an existing {@linkcode IO} under `name` in the current do-notation context.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bindV("left", IO.of("a")),
 *   IO.bindV("right", IO.of("b")),
 *   IO.return(({ left, right }) => left + right),
 * );
 *
 * IO.unsafeRunSync(program); // => "ab"
 * ```
 */
export const bindV: <Ctx, K extends PropertyKey, A>(
  name: K,
  fa: IO<A>,
) => (ctx: IO<Ctx>) => IO<{ [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }> =
  /* @__PURE__ */ core.deriveBindV<IOHKT>(internal.IOProto);

/**
 * Runs an additional {@linkcode IO} derived from the current do-notation context and keeps the original context.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.let("a", () => 1),
 *   IO.bind("b", ({ a }) => IO.of(a + 1)),
 *   IO.also(({ a, b }) => IO.println("a:", a, "b:", b)),
 *   IO.return(({ a, b }) => a + b),
 * );
 *
 * IO.unsafeRunSync(program); // => 3
 * //> a: 1 b: 2
 * ```
 */
export const also: <Ctx, A>(f: (ctx: Ctx) => IO<A>) => (ctx: IO<Ctx>) => IO<Ctx> =
  /* @__PURE__ */ core.deriveAlso<IOHKT>(internal.IOProto);

/**
 * Runs an additional {@linkcode IO} for its effects and keeps the original do-notation context.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.let("a", () => 1),
 *   IO.bind("b", ({ a }) => IO.of(a + 1)),
 *   IO.alsoV(IO.println("Hello, World!")),
 *   IO.return(({ a, b }) => a + b),
 * );
 *
 * IO.unsafeRunSync(program); // => 3
 * //> Hello, World!
 * ```
 */
export const alsoV: <Ctx, A>(fa: IO<A>) => (ctx: IO<Ctx>) => IO<Ctx> =
  /* @__PURE__ */ core.deriveAlsoV<IOHKT>(internal.IOProto);

/**
 * Projects the current do-notation context into a final pure value.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.let("a", () => 1),
 *   IO.bind("b", ({ a }) => IO.of(a + 1)),
 *   IO.return(({ a, b }) => a + b),
 * );
 *
 * IO.unsafeRunSync(program); // => 3
 * ```
 */
const return_: <Ctx, A>(f: (ctx: Ctx) => A) => (ctx: IO<Ctx>) => Return<IO<A>> =
  /* @__PURE__ */ core.deriveReturn<IOHKT>(internal.IOProto);
export { return_ as return };

/**
 * Projects the current do-notation context into a final {@linkcode IO} computation, which is then flattened into the resulting do-notation {@linkcode IO} computation.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.do(
 *   IO.let("a", () => 1),
 *   IO.bind("b", ({ a }) => IO.of(a + 1)),
 *   IO.returnM(({ a, b }) => IO.of(a + b)),
 * );
 *
 * IO.unsafeRunSync(program); // => 3
 * ```
 */
export const returnM: <Ctx, A>(f: (ctx: Ctx) => IO<A>) => (ctx: IO<Ctx>) => Return<IO<A>> =
  /* @__PURE__ */ core.deriveReturnM<IOHKT>(internal.IOProto);

// -----------------------------------------------------------------------------
// Control flow
// -----------------------------------------------------------------------------
/**
 * Creates an {@linkcode IO} computation that executes the given action when `cond` is `true`, or succeeds with `undefined` otherwise.
 */
export const when: (cond: boolean, then: IO<void>) => IO<void> =
  /* @__PURE__ */ core.deriveWhen<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} computation that fails with the given error when `cond` is `true`, or succeeds with `undefined` otherwise.
 */
export const throwWhen: (cond: boolean, e: unknown) => IO<void> =
  /* @__PURE__ */ core.deriveThrowWhen<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} computation that executes the given action when `cond` is `false`, or succeeds with `undefined` otherwise.
 */
export const unless: (cond: boolean, then: IO<void>) => IO<void> =
  /* @__PURE__ */ core.deriveUnless<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} computation that fails with the given error when `cond` is `false`, or succeeds with `undefined` otherwise.
 */
export const throwUnless: (cond: boolean, e: unknown) => IO<void> =
  /* @__PURE__ */ core.deriveThrowUnless<IOHKT>(internal.IOProto);

// -----------------------------------------------------------------------------
// Scheduling
// -----------------------------------------------------------------------------
/**
 * Runs an {@linkcode IO} according to the provided {@linkcode Schedule} and returns the last successful value.
 *
 * If the source fails, that failure is preserved and no further recurrences are attempted.
 *
 * If the schedule completes before the first execution, the resulting effect fails with {@linkcode NoScheduledExecutionError}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const ctr = yield* IO.ref(0);
 *   const tick = ctr.pipe(
 *     Ref.updateAndGet((n) => n + 1),
 *     IO.flatTap((n) => IO.log("tick", n)),
 *   );
 *   yield* IO.log("start");
 *   return yield* tick.pipe(
 *     IO.schedule(Schedule.spaced(1000).pipe(Schedule.intersect(Schedule.recurs(3)))),
 *   );
 * });
 *
 * IO.unsafeRun(program.pipe(IO.debug("last value")));
 * //> [2026-05-02 13:05:02.725] [info] [fiber #0] start
 * //> [2026-05-02 13:05:03.728] [info] [fiber #0] tick 1
 * //> [2026-05-02 13:05:04.729] [info] [fiber #0] tick 2
 * //> [2026-05-02 13:05:05.731] [info] [fiber #0] tick 3
 * //> last value: 3
 * ```
 */
export const schedule: Dual<
  <A>(self: IO<A>, schedule: Schedule) => IO<A>,
  (schedule: Schedule) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveSchedule<IOHKT>(internal.IOProto));

/**
 * Runs an {@linkcode IO} once immediately and then repeats it according to the provided {@linkcode Schedule}, returning the last successful value.
 *
 * If the source fails, that failure is preserved and no further recurrences are attempted.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const ctr = yield* IO.ref(0);
 *   const tick = ctr.pipe(
 *     Ref.updateAndGet((n) => n + 1),
 *     IO.flatTap((n) => IO.log("tick", n)),
 *   );
 *   yield* IO.log("start");
 *   return yield* tick.pipe(
 *     IO.repeat(Schedule.spaced(1000).pipe(Schedule.intersect(Schedule.recurs(3)))),
 *   );
 * });
 *
 * IO.unsafeRun(program.pipe(IO.debug("last value")));
 * //> [2026-05-02 17:51:08.286] [info] [fiber #0] start
 * //> [2026-05-02 17:51:08.288] [info] [fiber #0] tick 1
 * //> [2026-05-02 17:51:09.290] [info] [fiber #0] tick 2
 * //> [2026-05-02 17:51:10.292] [info] [fiber #0] tick 3
 * //> [2026-05-02 17:51:11.293] [info] [fiber #0] tick 4
 * //> last value: 4
 * ```
 */
export const repeat: Dual<
  <A>(self: IO<A>, schedule: Schedule) => IO<A>,
  (schedule: Schedule) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveRepeat<IOHKT>(internal.IOProto));

/**
 * Retries a failing {@linkcode IO} according to the provided {@linkcode Schedule}.
 *
 * If the schedule is exhausted, the resulting {@linkcode IO} fails with the last error.
 *
 * **Example**
 *
 * ```typescript
 * const unreliableOperation = IO.sync(Math.random).pipe(
 *   IO.flatMap((n) => (n < 0.3 ? IO.of("Success") : IO.throw("Failure"))),
 * );
 *
 * const program = IO.log("Attempting operation...").pipe(
 *   IO.zipR(unreliableOperation),
 *   IO.retry(Schedule.spaced(1000).pipe(Schedule.intersect(Schedule.recurs(3)))),
 * );
 *
 * IO.unsafeRun(
 *   program.pipe(
 *     IO.flatMap((s) => IO.log("Result:", s)),
 *     IO.catch((e) => IO.log("Error:", e)),
 *   ),
 * );
 * //> [2026-05-02 18:16:58.516] [info] [fiber #0] Attempting operation...
 * //> [2026-05-02 18:16:59.518] [info] [fiber #0] Attempting operation...
 * //> [2026-05-02 18:17:00.519] [info] [fiber #0] Attempting operation...
 * //> [2026-05-02 18:17:00.519] [info] [fiber #0] Result: Success
 * ```
 */
export const retry: Dual<
  {
    <A>(self: IO<A>, options: RetryOptions): IO<A>;
    <A>(self: IO<A>, schedule: Schedule): IO<A>;
  },
  {
    (options: RetryOptions): <A>(self: IO<A>) => IO<A>;
    (schedule: Schedule): <A>(self: IO<A>) => IO<A>;
  }
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveRetry<IOHKT>(internal.IOProto));

/**
 * Fails with a {@linkcode TimeoutError} if the {@linkcode IO} does not complete in time.
 *
 * **Example**
 *
 * ```typescript
 * const slowOperation = IO.log("completed").pipe(IO.delay(2000));
 *
 * const program = slowOperation.pipe(IO.timeout(1000));
 *
 * await IO.unsafeRunPromise(program);
 * // (after 1 second)
 * // TimeoutError: Operation timed out after 1000ms
 * //     at ...
 * ```
 */
export const timeout: Dual<
  <A>(self: IO<A>, ms: number) => IO<A>,
  (ms: number) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveTimeout<IOHKT>(internal.IOProto));

/**
 * Returns the fallback {@linkcode IO} if the original {@linkcode IO} does not complete in time.
 *
 * If the source fails before the deadline, the resulting {@linkcode IO} fails with the same error.
 *
 * **Example**
 *
 * ```typescript
 * const slowOperation = IO.sleep(2000).pipe(IO.as("completed"));
 *
 * const program = slowOperation.pipe(IO.timeoutTo(1000, IO.of("fallback"));
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.log)));
 * // (after 1 second)
 * //> [2026-02-11 13:55:02.842] [info] [fiber #0] fallback
 * ```
 */
export const timeoutTo: Dual<
  <A, B>(self: IO<A>, ms: number, fallback: IO<B>) => IO<A | B>,
  <B>(ms: number, fallback: IO<B>) => <A>(self: IO<A>) => IO<A | B>
> = /* @__PURE__ */ dual(3, /* @__PURE__ */ core.deriveTimeoutTo<IOHKT>(internal.IOProto));

// -----------------------------------------------------------------------------
// State management
// -----------------------------------------------------------------------------
/**
 * Creates an {@linkcode IO} that immediately succeeds with a {@linkcode Ref} containing the given value.
 */
export const ref: <A>(a: A) => IO<IORef<A>> = /* @__PURE__ */ core.deriveRef<
  IOHKT,
  PartialApply<RefHKT, [IOHKT]>
>(internal.IOProto, RefProto);

/**
 * Creates an {@linkcode IO} that immediately succeeds with a {@linkcode FiberLocal} containing the given initial value.
 *
 * Each forked fiber inherits the current value snapshot, and child updates are isolated from the parent.
 */
export const fiberLocal: <A>(initial: A) => IO<IOFiberLocal<A>> =
  /* @__PURE__ */ core.deriveFiberLocal<IOHKT, PartialApply<FiberLocalHKT, [IOHKT]>>(
    internal.IOProto,
    FiberLocalProto,
  );

// -----------------------------------------------------------------------------
// Concurrency
// -----------------------------------------------------------------------------
/**
 * Creates an {@linkcode IO} that immediately succeeds with a {@linkcode Deferred} that can be completed later.
 */
export const deferred: <A>() => IO<IODeferred<A>> = /* @__PURE__ */ core.deriveDeferred<
  IOHKT,
  PartialApply<DeferredHKT, [IOHKT]>
>(internal.IOProto, DeferredProto);

/**
 * Builds a memoized view of an {@linkcode IO}.
 *
 * The first run evaluates `action`; later runs reuse the cached result or wait for the in-flight evaluation.
 * If every subscriber is cancelled before completion, the underlying action is cancelled and the cache is cleared.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const runs = yield* IO.ref(0);
 *   const memoized = yield* IO.memoize(Ref.updateAndGet(runs, (n) => n + 1));
 *   const first = yield* memoized;
 *   const second = yield* memoized;
 *   return [first, second, yield* Ref.get(runs)] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [1, 1, 1]
 * ```
 */
export const memoize: <A>(action: IO<A>) => IO<IO<A>> = /* @__PURE__ */ core.deriveMemoize<IOHKT>(
  internal.IOProto,
);

/**
 * Runs an array of {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces an array of results.
 * The order of the results is guaranteed to be the same as the order of the input computations.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.all([
 *   IO.of("A").pipe(IO.flatTap(IO.log), IO.delay(1000)),
 *   IO.of("B").pipe(IO.flatTap(IO.log), IO.delay(2000)),
 * ]).pipe(IO.flatMap((results) => IO.println("Results:", results)));
 *
 * IO.unsafeRun(program);
 * //> [2026-02-09 21:36:11.782] [info] [fiber #1] A
 * //> [2026-02-09 21:36:12.782] [info] [fiber #2] B
 * //> Results: ["A", "B"]
 * ```
 */
export const all: <const IOS extends Iterable<IO<unknown>>>(
  ios: IOS,
) => IO<
  IOS extends readonly unknown[] ?
    { readonly [I in keyof IOS]: IOS[I] extends IO<infer A> ? A : never }
  : IOS extends Iterable<IO<infer A>> ? readonly A[]
  : never
> = /* @__PURE__ */ core.deriveAll<IOHKT>(internal.IOProto);

/**
 * Runs a record of {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces an object mapping each input key to its result.
 *
 * This is the keyed counterpart of {@linkcode all}, matching {@linkcode Promise.allKeyed}.
 * The result object keeps the input keys, and own enumerable keys (including symbol keys) are used.
 * The result is a null-prototype object, so a `"__proto__"` key becomes a safe own data property rather than setting the prototype.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.allKeyed({
 *   shape: IO.of("circle"),
 *   color: IO.of("red"),
 * });
 *
 * IO.unsafeRunSync(program); // => { shape: "circle", color: "red" }
 * ```
 */
export const allKeyed: <const IOS extends { readonly [K in string | symbol]: IO<unknown> }>(
  ios: IOS,
) => IO<{ readonly [K in keyof IOS]: IOS[K] extends IO<infer A> ? A : never }> =
  /* @__PURE__ */ core.deriveAllKeyed<IOHKT>(internal.IOProto);

/**
 * Runs multiple {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces the {@linkcode Outcome} of each computation.
 * The order of the results is guaranteed to be the same as the order of the input computations.
 *
 * Unlike {@linkcode all}, this method does not short-circuit on failure or cancellation.
 * Instead, it waits for every computation to complete and collects each final {@linkcode Outcome}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.allOutcome([
 *   IO.sleep(1000).pipe(IO.as("A")),
 *   IO.sleep(2000).pipe(IO.as("B")),
 * ]);
 *
 * await IO.unsafeRunPromise(program);
 * // => [Outcome { _tag: "Succeeded", _0: "A" }, Outcome { _tag: "Succeeded", _0: "B" }]
 * ```
 */
export const allOutcome: <const IOS extends Iterable<IO<unknown>>>(
  ios: IOS,
) => IO<
  IOS extends readonly unknown[] ?
    { readonly [I in keyof IOS]: IOS[I] extends IO<infer A> ? IOOutcome<A> : never }
  : IOS extends Iterable<IO<infer A>> ? readonly IOOutcome<A>[]
  : never
> = /* @__PURE__ */ core.deriveAllOutcome<IOHKT, PartialApply<OutcomeHKT, [IOHKT, unknown]>>(
  internal.IOProto,
  OutcomeProto,
);

/**
 * Runs multiple {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces the result of the first computation that succeeds.
 * All other computations are cancelled when one succeeds.
 *
 * The {@linkcode IO} fails with an {@linkcode AggregateError} containing all errors if every computation fails or is cancelled.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.any([
 *   IO.sleep(1000).pipe(IO.zipR(IO.throw("A"))),
 *   IO.sleep(2000).pipe(IO.as("B")),
 * ]);
 *
 * await IO.unsafeRunPromise(program); // => "B"
 * ```
 */
export const any: <A>(ios: Iterable<IO<A>>) => IO<A> = /* @__PURE__ */ core.deriveAny<IOHKT>(
  internal.IOProto,
);

/**
 * Runs multiple {@linkcode IO} computations concurrently and returns the _earliest_ successful result **according to input order**.
 *
 * - If a later computation succeeds while an earlier one is still pending, that success is ignored and execution waits for the earlier computation to complete.
 * - If all earlier computations fail, the first succeeding result among the remaining ones is returned.
 * - If every computation fails, the IO fails with an {@linkcode AggregateError} containing all the errors from the failed computations.
 *
 * Examples:
 * - `[failed(A), succeeded(B), succeeded(C)]` -> B
 * - `[failed(A),   pending(B), succeeded(C)]` -> pending (wait for index 1)
 * - `[failed(A),    failed(B), succeeded(C)]` -> C
 *
 * **Example**
 *
 * ```typescript
 * const firstSuccess = IO.anyOrdered([
 *   IO.throw("A"),
 *   IO.sleep(1000).pipe(IO.as("B")),
 *   IO.sleep(500).pipe(IO.as("C")),
 * ]);
 *
 * await IO.unsafeRunPromise(firstSuccess); // => "B"
 *
 * const afterEarlierFailures = IO.anyOrdered([
 *   IO.throw("A"),
 *   IO.sleep(1000).pipe(IO.zipR(IO.throw("B"))),
 *   IO.sleep(500).pipe(IO.as("C")),
 * ]);
 *
 * await IO.unsafeRunPromise(afterEarlierFailures); // => "C"
 * ```
 */
export const anyOrdered: <A>(ios: Iterable<IO<A>>) => IO<A> =
  /* @__PURE__ */ core.deriveAnyOrdered<IOHKT>(internal.IOProto);

/**
 * Runs multiple {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces the result of the first computation that **succeeds or fails** (whichever comes first).
 * All other computations are cancelled when one **succeeds or fails**.
 *
 * 1. If a child computation succeeds first, the race succeeds with its value, and all other computations are cancelled if they are still running.
 * 2. If a child computation fails first, the race fails with its error, and all other computations are cancelled if they are still running.
 * 3. If a child computation is cancelled, it does not win the race and the race continues with the remaining computations.
 * 4. If all computations are cancelled and the resulting computation is not in an uncancellable region, the result is cancellation.
 * 5. If all computations are cancelled and the resulting computation is in an uncancellable region, the resulting computation blocks indefinitely.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.race([
 *   IO.sleep(1000).pipe(IO.zipR(IO.log("A"))),
 *   IO.sleep(2000).pipe(IO.zipR(IO.log("B"))),
 * ]);
 *
 * IO.unsafeRun(program);
 * //> [2026-02-10 18:54:48.816] [info] [fiber #1] A
 * ```
 */
export const race: <A>(ios: Iterable<IO<A>>) => IO<A> = /* @__PURE__ */ core.deriveRace<IOHKT>(
  internal.IOProto,
);

/**
 * Runs multiple {@linkcode IO} computations concurrently and returns an {@linkcode IO} that produces the {@linkcode Outcome} of the first computation that completes.
 * All other computations are cancelled once the winning outcome is observed.
 *
 * 1. If a child computation completes, the race completes with its {@linkcode Outcome}, and all other computations are cancelled if they are still running.
 * 2. If the input is empty and the resulting computation is not in an uncancellable region, the result is cancellation.
 * 3. If the input is empty and the resulting computation is in an uncancellable region, the resulting computation blocks indefinitely.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.raceOutcome([
 *   IO.log("A").pipe(IO.delay(1000)),
 *   IO.log("B").pipe(IO.delay(2000)),
 * ]);
 *
 * const outcome = await IO.unsafeRunPromise(program);
 * outcome._tag; // => "Succeeded"
 * ```
 */
export const raceOutcome: <A>(ios: Iterable<IO<A>>) => IO<IOOutcome<A>> =
  /* @__PURE__ */ core.deriveRaceOutcome<IOHKT, PartialApply<OutcomeHKT, [IOHKT, unknown]>>(
    internal.IOProto,
    OutcomeProto,
  );

// -----------------------------------------------------------------------------
// Resource management
// -----------------------------------------------------------------------------
/**
 * Acquires a resource, uses it, and always runs the release action afterward.
 *
 * The release action runs after success, failure, or cancellation.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const events = yield* IO.ref<string[]>([]);
 *   const record = (event: string) => events.pipe(Ref.update((xs) => [...xs, event]));
 *
 *   const result = yield* IO.acquireUseRelease(
 *     record("acquire").pipe(IO.as("resource")),
 *     (resource) => record(`use:${resource}`).pipe(IO.as(42)),
 *     (resource) => record(`release:${resource}`),
 *   );
 *
 *   return [result, yield* events.pipe(Ref.get)] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [42, ["acquire", "use:resource", "release:resource"]]
 * ```
 */
export const acquireUseRelease: Dual<
  <R, A>(
    acquire: IO<R>,
    use: (resource: NoInfer<R>) => IO<A>,
    release: (resource: NoInfer<R>) => IO<void>,
  ) => IO<A>,
  <R, A>(
    use: (resource: NoInfer<R>) => IO<A>,
    release: (resource: NoInfer<R>) => IO<void>,
  ) => (acquire: IO<R>) => IO<A>
> = /* @__PURE__*/ dual(3, /* @__PURE__ */ core.deriveAcquireUseRelease<IOHKT>(internal.IOProto));

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
/**
 * Checks if a given value is an {@linkcode IO}.
 *
 * **Example**
 *
 * ```typescript
 * IO.isIO(IO.of(42)); // => true
 * IO.isIO("foo"); // => false
 * ```
 */
export const isIO = (value: unknown): value is IO<unknown> =>
  typeof value === "object" &&
  value !== null &&
  Symbol.toStringTag in value &&
  value[Symbol.toStringTag] === "IO" &&
  "pipe" in value &&
  typeof value.pipe === "function";

/**
 * Creates an {@linkcode IO} that prompts the user for input.
 *
 * **Note**
 *
 * This function is only available in browser, Node.js-compatible environments (requires Node.js 6+), and QuickJS.
 * - In browser, it uses the `window.prompt` function to display a dialog box.
 * - In Node.js, it uses the `readline` module to read input from the console.
 * - In QuickJS, it uses the `os.setReadHandler` API to read input from `std.in`.
 *
 * Note that due to the synchronous nature of `window.prompt`, this function is not cancellable in browsers and will block the main thread until the user provides input.
 * In Node.js and QuickJS, it is cancellable and will not block the main thread.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.input("Enter your name: ").pipe(
 *   IO.flatMap((name) => IO.println(`Hello, ${name}!`)),
 * );
 *
 * IO.unsafeRun(program);
 * //> Enter your name: John
 * //> Hello, John!
 * ```
 */
export const input: (prompt?: string) => IO<string> = /* @__PURE__ */ core.deriveInput<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} that notifies the user with a message.
 *
 * **Note**
 *
 * This function uses different APIs depending on the environment:
 * - In browser, it uses the `window.alert` function to display a dialog box.
 * - In other environments, it falls back to `console.log` to display the message.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.notify("Hello, world!");
 *
 * IO.unsafeRun(program);
 * //> Hello, world!
 * ```
 */
export const notify: (message?: string) => IO<void> = /* @__PURE__ */ core.deriveNotify<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} that prints the given arguments to the console.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.println("Hello, world!")); //> Hello, world!
 * IO.unsafeRun(IO.println({ foo: "bar" }, 42n)); //> { foo: "bar" } 42n
 * ```
 */
export const println: (...args: unknown[]) => IO<void> = /* @__PURE__ */ core.derivePrintln<IOHKT>(
  internal.IOProto,
);

/**
 * Creates an {@linkcode IO} that prints the given arguments to the console with {@linkcode console.error}.
 *
 * **Example**
 *
 * ```typescript
 * unsafeRun(eprintln("Oops!")); //> Oops!
 * unsafeRun(eprintln({ foo: "bar" }, 42n)); //> { foo: "bar" } 42n
 * ```
 */
export const eprintln: (...args: unknown[]) => IO<void> =
  /* @__PURE__ */ core.deriveEprintln<IOHKT>(internal.IOProto);

/**
 * Creates an {@linkcode IO} that logs the given arguments with timestamp, log level, and current fiber ID.
 *
 * The log level defaults to `info`. Use {@linkcode logDebug}, {@linkcode logInfo}, {@linkcode logWarn}, {@linkcode logError}, etc. for different log levels.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.log("Hello, world!"));
 * //> [2025-11-09 13:58:00.000] [info] [fiber #0] Hello, world!
 * IO.unsafeRun(IO.log(Symbol("foo"), ["a"]));
 * //> [2025-11-09 13:58:00.000] [info] [fiber #1] Symbol("foo") ["a"]
 * ```
 */
export const log: (...args: unknown[]) => IO<void> = /* @__PURE__ */ core.deriveLog<IOHKT>(
  internal.IOProto,
);

/**
 * The same as {@linkcode log}, but sets the log level to `debug`, and uses {@linkcode console.debug} instead of {@linkcode console.log}.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.logDebug("Hello, debug!"));
 * //> [2025-11-09 13:58:00.000] [debug] [fiber #0] Hello, debug!
 * ```
 */
export const logDebug: (...args: unknown[]) => IO<void> =
  /* @__PURE__ */ core.deriveLogDebug<IOHKT>(internal.IOProto);

/**
 * The same as {@linkcode log}, but uses {@linkcode console.info} instead of {@linkcode console.log}.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.logInfo("Hello, info!"));
 * //> [2025-11-09 13:58:00.000] [info] [fiber #0] Hello, info!
 * ```
 */
export const logInfo: (...args: unknown[]) => IO<void> = /* @__PURE__ */ core.deriveLogInfo<IOHKT>(
  internal.IOProto,
);

/**
 * The same as {@linkcode log}, but sets the log level to `warn`, and uses {@linkcode console.warn} instead of {@linkcode console.log}.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.logWarn("Hello, warn!"));
 * //> [2025-11-09 13:58:00.000] [warn] [fiber #0] Hello, warn!
 * ```
 */
export const logWarn: (...args: unknown[]) => IO<void> = /* @__PURE__ */ core.deriveLogWarn<IOHKT>(
  internal.IOProto,
);

/**
 * The same as {@linkcode log}, but sets the log level to `error`, and uses {@linkcode console.error} instead of {@linkcode console.log}.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.logError("Hello, error!"));
 * //> [2025-11-09 13:58:00.000] [error] [fiber #0] Hello, error!
 * ```
 */
export const logError: (...args: unknown[]) => IO<void> =
  /* @__PURE__ */ core.deriveLogError<IOHKT>(internal.IOProto);

type Response =
  typeof globalThis extends { fetch: (...args: never) => Promise<infer R> } ? R : never;

/**
 * Creates an {@linkcode IO} that performs a {@linkcode fetch} request.
 *
 * Aside from the standard {@linkcode fetch} options, you can also provide:
 * - `params`: Search parameters to append to the URL. If provided, {@linkcode URLSearchParams} will be used to append the parameters to the URL’s query string.
 * - `json`: JSON body to send with the request. If this option is provided, the value will be serialized as JSON with {@linkcode JSON.stringify} and set as the request body, with the `Content-Type` header set to `application/json`.
 *
 * **Note**
 *
 * This function assumes that {@linkcode fetch} is available in the global scope, along with the {@linkcode AbortController} API for cancellation.
 * This is the case in modern browsers and Node.js 18+. If you are using an older version of Node.js, you will need to use a polyfill with [node-fetch](https://github.com/node-fetch/node-fetch) or similar.
 *
 * **Example** (Perform an HTTP GET request)
 *
 * ```typescript
 * const program = IO.fetch("https://jsonplaceholder.typicode.com/posts", {
 *   params: { userId: 1 },
 * }).pipe(
 *   IO.andThen((res) => res.json()),
 *   IO.andThen(IO.println),
 * );
 *
 * IO.unsafeRun(program);
 * //> [{ userId: 1, id: 1, title: "...", body: "..." }, ...]
 * ```
 *
 * **Example** (Perform an HTTP POST request with JSON body)
 *
 * ```typescript
 * const program = IO.fetch("https://jsonplaceholder.typicode.com/posts", {
 *   method: "POST",
 *   json: { userId: 1, title: "foo", body: "bar" },
 * }).pipe(
 *   IO.flatTap((res) => IO.throwWhen(!res.ok, new Error(`Fetch failed: ${res.status}`))),
 *   IO.andThen((res) => res.json()),
 *   IO.andThen(IO.println),
 * );
 *
 * IO.unsafeRun(program);
 * //> { userId: 1, title: "foo", body: "bar", id: 101 }
 * ```
 */
const fetch_: (
  input:
    | string
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | (typeof globalThis extends { fetch: (input: infer Input, ...args: never) => unknown } ? Input
      : never),
  options?: RequestOptions,
) => IO<Response> = /* @__PURE__ */ core.deriveFetch<IOHKT>(internal.IOProto);
export { fetch_ as fetch };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
/**
 * Forks an {@linkcode IO} into a child {@linkcode Fiber} handle.
 *
 * The child fiber is scoped to the current parent fiber, so it is cancelled if the parent completes before the child does.
 *
 * **Example**
 *
 * ```typescript
 * const randInt = (min: number, max: number) =>
 *   IO.sync(Math.random).pipe(IO.map((n) => Math.floor(min + n * (max - min))));
 *
 * const sleepPrint = (word: string, name: string) =>
 *   IO.gen(function* () {
 *     const delayMs = yield* randInt(200, 700);
 *     yield* IO.sleep(delayMs);
 *     yield* IO.log(`${word}, ${name}`);
 *   });
 *
 * const program = IO.gen(function* () {
 *   const name = yield* IO.input("What is your name? ");
 *
 *   yield* sleepPrint("Hello", name).pipe(IO.forever, IO.fork);
 *   yield* sleepPrint("Bonjour", name).pipe(IO.forever, IO.fork);
 *   yield* sleepPrint("Hola", name).pipe(IO.forever, IO.fork);
 *
 *   yield* IO.sleep(5000);
 * });
 *
 * IO.unsafeRun(program);
 * //> What is your name? John
 * // (after 0.2-0.7s)
 * //> Hello, John
 * // (after 0.2-0.7s)
 * //> Bonjour, John
 * // (after 0.2-0.7s)
 * //> Hola, John
 * // (repeats every 0.2-0.7s for 5 seconds)
 * // (after 5 seconds, all greetings stop, since the child fibers are automatically cancelled when the parent fiber completes)
 * ```
 */
export const fork: <A>(self: IO<A>) => IO<IOFiber<A>> = /* @__PURE__ */ core.deriveFork<
  IOHKT,
  PartialApply<FiberHKT, [IOHKT, unknown]>
>(internal.IOProto, FiberProto, OutcomeProto);

/**
 * Forks an {@linkcode IO} into a global {@linkcode Fiber} handle.
 *
 * Unlike {@linkcode fork}, the child fiber is detached from the current parent fiber and is not cancelled when the parent completes.
 *
 * **Example**
 *
 * ```typescript
 * const greet1 = IO.println("Hello, world!").pipe(IO.delay(1000), IO.forever);
 * const greet2 = IO.println("Bonjour, monde!").pipe(IO.delay(2000), IO.forever);
 *
 * IO.unsafeRun(IO.forkGlobal(greet1).pipe(IO.zipR(IO.forkGlobal(greet2))));
 * // (after 1 second)
 * //> Hello, world!
 * // (after 2 seconds)
 * //> Bonjour, monde!
 * // (greetings repeat indefinitely, since the child fibers are not cancelled when the parent fiber completes)
 * ```
 */
export const forkGlobal: <A>(self: IO<A>) => IO<IOFiber<A>> = /* @__PURE__ */ core.deriveForkGlobal<
  IOHKT,
  PartialApply<FiberHKT, [IOHKT, unknown]>
>(internal.IOProto, FiberProto, OutcomeProto);

export const imap: Dual<
  <A, B>(self: IO<A>, to: (a: NoInfer<A>) => B, from: (b: NoInfer<B>) => A) => IO<B>,
  <A, B>(to: (a: NoInfer<A>) => B, from: (b: NoInfer<B>) => A) => (self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(3, /* @__PURE__ */ core.deriveImap<IOHKT>(internal.IOProto));

/**
 * Transforms the successful result of an {@linkcode IO}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(21).pipe(IO.map((n) => n * 2));
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const map: Dual<
  <A, B>(self: IO<A>, f: (a: NoInfer<A>) => B) => IO<B>,
  <A, B>(f: (a: NoInfer<A>) => B) => (self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveMap<IOHKT>(internal.IOProto));

/**
 * Runs a callback on the successful result of an {@linkcode IO} and keeps the original value.
 *
 * **Example**
 *
 * ```typescript
 * let seen = 0;
 *
 * const program = IO.of(2).pipe(
 *   IO.tap((n) => {
 *     seen = n;
 *   }),
 *   IO.map((n) => n + 1),
 * );
 *
 * IO.unsafeRunSync(program); // => 3
 * seen; // => 2
 * ```
 */
export const tap: Dual<
  <A>(self: IO<A>, f: (a: NoInfer<A>) => void) => IO<A>,
  <A>(f: (a: NoInfer<A>) => void) => (self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveTap<IOHKT>(internal.IOProto));

/**
 * Replaces the successful result of an {@linkcode IO} with a constant value.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(42).pipe(IO.as("done"));
 *
 * IO.unsafeRunSync(program); // => "done"
 * ```
 */
export const as: Dual<
  <A, B>(self: IO<A>, that: B) => IO<B>,
  <B>(that: B) => <A>(self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveAs<IOHKT>(internal.IOProto));

/**
 * Discards the successful result of an {@linkcode IO}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(42).pipe(IO.asVoid);
 *
 * IO.unsafeRunSync(program); // => undefined
 * ```
 */
export const asVoid: <A>(self: IO<A>) => IO<void> = /* @__PURE__ */ core.deriveAsVoid<IOHKT>(
  internal.IOProto,
);

/**
 * Applies a function produced by one {@linkcode IO} to the value produced by another.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of((n: number) => n + 1).pipe(IO.ap(IO.of(41)));
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const ap: Dual<
  <A, B>(fab: IO<(a: NoInfer<A>) => B>, fa: IO<A>) => IO<B>,
  <A>(fa: IO<A>) => <B>(fab: IO<(a: NoInfer<A>) => B>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveAp<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations and returns both results as a tuple.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.product(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => ["left", "right"]
 * ```
 */
export const product: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<readonly [A, B]>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<readonly [A, B]>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveProduct<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations and keeps the left result.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.productL(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => "left"
 * ```
 */
export const productL: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<A>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveProductL<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations and keeps the right result.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.productR(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => "right"
 * ```
 */
export const productR: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<B>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveProductR<IOHKT>(internal.IOProto));

/**
 * Flattens a nested {@linkcode IO}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(IO.of(42)).pipe(IO.flatten);
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const flatten: <A>(self: IO<IO<A>>) => IO<A> = /* @__PURE__ */ core.deriveFlatten<IOHKT>(
  internal.IOProto,
);

/**
 * Sequences computations by feeding the successful result of one {@linkcode IO} into the next.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(21).pipe(IO.flatMap((n) => IO.of(n * 2)));
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const flatMap: Dual<
  <A, B>(self: IO<A>, f: (a: A) => IO<B>) => IO<B>,
  <A, B>(f: (a: A) => IO<B>) => (self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveFlatMap<IOHKT>(internal.IOProto));

/**
 * Runs the {@linkcode IO} computation and applies the given action (second argument) to the result.
 *
 * The action can be one of the following:
 * - A function that takes the result of the computation and returns an {@linkcode IO}. (acts like {@linkcode flatMap})
 * - A function that takes the result of the computation and returns a {@linkcode PromiseLike}. (acts like `self.pipe(IO.flatMap((a) => IO.promise(() => f(a))))`)
 * - A function that takes the result of the computation and returns a value. (acts like {@linkcode map})
 * - An {@linkcode IO}. (acts like {@linkcode zipR})
 * - A {@linkcode PromiseLike}. (acts like `self.pipe(IO.zipR(IO.promise(() => that)))`)
 * - A value. (acts like {@linkcode as})
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRunSync(IO.of(42).pipe(IO.andThen((a) => IO.of(a + 1)))); // => 43
 * IO.unsafeRunSync(IO.of(42).pipe(IO.andThen((a) => a + 1)))); // => 43
 *
 * const program = IO.fetch("https://jsonplaceholder.typicode.com/todos").pipe(
 *   IO.andThen((res) => res.json()),
 *   IO.andThen((data) => IO.log("Fetched data:", data)),
 * );
 *
 * IO.unsafeRun(program);
 * //> [2026-05-02 18:33:45.898] [info] [fiber #2] Fetched data: [
 * //   { userId: 1, id: 1, title: "...", completed: false },
 * //   { userId: 1, id: 2, title: "...", completed: false },
 * //   ...
 * // ]
 * ```
 */
export const andThen: Dual<
  {
    <A, B>(
      self: IO<A>,
      f: (a: NoInfer<A>) => B,
    ): [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
    <A, B>(
      self: IO<A>,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      that: B extends Function ? never : B,
    ): [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
  },
  {
    <A, B>(
      f: (a: NoInfer<A>) => B,
    ): (self: IO<A>) => [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
    <B>(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      that: B extends Function ? never : B,
    ): <A>(self: IO<A>) => [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
  }
> = /* @__PURE__ */ dual<
  {
    <A, B>(
      self: IO<A>,
      f: (a: NoInfer<A>) => B,
    ): [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
    <A, B>(
      self: IO<A>,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      that: B extends Function ? never : B,
    ): [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
  },
  {
    <A, B>(
      f: (a: NoInfer<A>) => B,
    ): (self: IO<A>) => [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
    <B>(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      that: B extends Function ? never : B,
    ): <A>(self: IO<A>) => [B] extends [IO<infer B>] ? IO<B>
    : [B] extends [PromiseLike<infer B>] ? IO<B>
    : IO<B>;
  }
>(
  2,
  /* @__PURE__ */ (() => {
    const F = {
      as: core.deriveAs<IOHKT>(internal.IOProto),
      of: core.deriveOf<IOHKT>(internal.IOProto),
      productR: core.deriveProductR<IOHKT>(internal.IOProto),
      flatMap: core.deriveFlatMap<IOHKT>(internal.IOProto),
      uncancellable: core.deriveUncancellable<IOHKT>(internal.IOProto),
      sync: core.deriveSync<IOHKT>(internal.IOProto),
      cont: core.deriveCont<IOHKT>(internal.IOProto),
    } as const;

    return function andThen<A, B>(
      self: IO<A>,
      f: B | IO<B> | PromiseLike<B> | ((a: A) => B | IO<B> | PromiseLike<B>),
    ) {
      if (typeof f === "function")
        return F.flatMap(self, (a) => {
          const b = (f as (a: unknown) => any)(a);
          return (
            typeof b !== "object" || b === null ? { _tag: "Pure", _0: b }
            : (
              Symbol.toStringTag in b &&
              b[Symbol.toStringTag] === "IO" &&
              "pipe" in b &&
              typeof b.pipe === "function"
            ) ?
              b
            : "then" in b && typeof b.then === "function" ?
              F.cont((succeed, fail, get) =>
                F.uncancellable(() =>
                  F.productR(
                    F.sync(() => {
                      (b as PromiseLike<unknown>).then(succeed, fail);
                    }),
                    get,
                  ),
                ),
              )
            : F.of(b)
          );
        });

      if (typeof f !== "object" || f === null) return F.as(self, f);

      if (
        Symbol.toStringTag in f &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        f[Symbol.toStringTag] === "IO" &&
        "pipe" in f &&
        typeof f.pipe === "function"
      )
        return F.productR(self, f);

      if ("then" in f && typeof f.then === "function")
        return F.productR(
          self,
          F.cont((succeed, fail, get) =>
            F.uncancellable(() =>
              F.productR(
                F.sync(() => {
                  (f as PromiseLike<unknown>).then(succeed, fail);
                }),
                get,
              ),
            ),
          ),
        );

      return F.as(self, f);
    };
  })(),
);

/**
 * Prints the current value with a message and keeps that value in the computation chain.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(42).pipe(IO.debug("The answer is"));
 *
 * const result = IO.unsafeRunSync(program);
 * //> The answer is: 42
 * console.log(result);
 * //> 42
 * ```
 */
export const debug: Dual<
  <A>(self: IO<A>, message: string) => IO<A>,
  <A>(message: string) => (self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(
  2,
  /* @__PURE__ */ (() => {
    const F = {
      as: core.deriveAs<IOHKT>(internal.IOProto),
      flatMap: core.deriveFlatMap<IOHKT>(internal.IOProto),
      sync: core.deriveSync<IOHKT>(internal.IOProto),
    } as const;

    return function debug<A>(self: IO<A>, message: string): IO<A> {
      return F.flatMap(self, (a) =>
        F.as(
          F.sync(function debug() {
            // @ts-expect-error - `console` may not be available in some environments
            console.log(message + ":", a);
          }),
          a,
        ),
      );
    };
  })(),
);

/**
 * Runs an additional {@linkcode IO} based on the successful result and keeps the original value.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(2).pipe(IO.flatTap((n) => IO.println(`seen: ${n}`)));
 *
 * const result = IO.unsafeRunSync(program);
 * //> seen: 2
 * console.log(result);
 * //> 2
 * ```
 */
export const flatTap: Dual<
  <A, B>(self: IO<A>, f: (a: A) => IO<B>) => IO<A>,
  <A, B>(f: (a: A) => IO<B>) => (self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveFlatTap<IOHKT>(internal.IOProto));

/**
 * Repeats an {@linkcode IO} forever.
 *
 * **Example**
 *
 * ```typescript
 * const fiber = IO.unsafeRunFork(IO.sleep(10).pipe(IO.forever));
 *
 * IO.unsafeRunSync(fiber.pipe(Fiber.cancel));
 * IO.unsafeRunSync(fiber.pipe(Fiber.await)).isCancelled(); // => true
 * ```
 */
export const forever: <A>(self: IO<A>) => IO<never> = /* @__PURE__ */ core.deriveForever<IOHKT>(
  internal.IOProto,
);

/**
 * Combines two {@linkcode IO} computations independently and returns both results as a tuple.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.zip(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => ["left", "right"]
 * ```
 */
export const zip: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<readonly [A, B]>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<readonly [A, B]>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveZip<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations independently and merges their results with `f`.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(20).pipe(IO.zipWith(IO.of(22), (a, b) => a + b));
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const zipWith: Dual<
  <A, B, C>(self: IO<A>, that: IO<B>, f: (a: NoInfer<A>, b: NoInfer<B>) => C) => IO<C>,
  <A, B, C>(that: IO<B>, f: (a: NoInfer<A>, b: NoInfer<B>) => C) => (self: IO<A>) => IO<C>
> = /* @__PURE__ */ dual(3, /* @__PURE__ */ core.deriveZipWith<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations independently and keeps the left result.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.zipL(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => "left"
 * ```
 */
export const zipL: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<A>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveZipL<IOHKT>(internal.IOProto));

/**
 * Combines two {@linkcode IO} computations independently and keeps the right result.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of("left").pipe(IO.zipR(IO.of("right")));
 *
 * IO.unsafeRunSync(program); // => "right"
 * ```
 */
export const zipR: Dual<
  <A, B>(self: IO<A>, that: IO<B>) => IO<B>,
  <B>(that: IO<B>) => <A>(self: IO<A>) => IO<B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveZipR<IOHKT>(internal.IOProto));

/**
 * Recovers from failures in the error channel by switching to `handler`.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.throw("boom").pipe(
 *   IO.catch((e) => IO.of(`recovered:${e as string}`)),
 * );
 *
 * IO.unsafeRunSync(program); // => "recovered:boom"
 * ```
 */
const catch_: Dual<
  <A, B>(self: IO<A>, handler: (e: unknown) => IO<B>) => IO<A | B>,
  <B>(handler: (e: unknown) => IO<B>) => <A>(self: IO<A>) => IO<A | B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveCatch<IOHKT>(internal.IOProto));
export { catch_ as catch };

/**
 * Discards the result of an {@linkcode IO}, whether it succeeds or fails.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRunSync(IO.of(42).pipe(IO.ignore)); // => undefined
 * IO.unsafeRunSync(IO.throw("boom").pipe(IO.ignore)); // => undefined
 * ```
 */
export const ignore: <A>(self: IO<A>) => IO<void> = /* @__PURE__ */ core.deriveIgnore<IOHKT>(
  internal.IOProto,
);

/**
 * Runs `finalizer` only if the {@linkcode IO} is cancelled.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   yield* IO.log("start");
 *   yield* IO.sleep(1000).pipe(
 *     IO.as("ok"),
 *     IO.onCancel(IO.log("cancelled")),
 *   );
 *   yield* IO.log(`done`);
 * });
 *
 * await IO.unsafeRunPromise(program);
 * //> [2025-09-09 18:55:20.000] [info] start
 * //> [2025-09-09 18:55:21.000] [info] done
 *
 * const fiber = IO.unsafeRunFork(program);
 * setTimeout(() => IO.unsafeRun(fiber.pipe(Fiber.cancel)), 500);
 * //> [2025-09-09 18:55:22.000] [info] start
 * //> [2025-09-09 18:55:22.500] [info] cancelled
 * ```
 */
export const onCancel: Dual<
  <A>(self: IO<A>, finalizer: IO<void>) => IO<A>,
  (finalizer: IO<void>) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveOnCancel<IOHKT>(internal.IOProto));

/**
 * Runs an outcome-aware finalizer after the {@linkcode IO} completes.
 *
 * The finalizer is uncancellable and receives the terminal success, failure, or cancellation.
 */
export const guaranteeCase: Dual<
  <A>(self: IO<A>, finalizer: (outcome: IOOutcome<A>) => IO<void>) => IO<A>,
  <A>(finalizer: (outcome: IOOutcome<A>) => IO<void>) => (self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(
  2,
  /* @__PURE__ */ core.deriveGuaranteeCase<IOHKT>(internal.IOProto, OutcomeProto) as <A>(
    self: IO<A>,
    finalizer: (outcome: IOOutcome<A>) => IO<void>,
  ) => IO<A>,
);

/**
 * Runs `finalizer` after the {@linkcode IO} completes, regardless of success, failure, or cancellation.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   yield* IO.log("start");
 *   const res = yield* IO.sleep(1000).pipe(
 *     IO.as("ok"),
 *     IO.guarantee(IO.log("finalized")),
 *   );
 *   yield* IO.log(`use:${res}`);
 * });
 *
 * await IO.unsafeRunPromise(program);
 * //> [2025-09-09 18:55:20.000] [info] start
 * //> [2025-09-09 18:55:21.000] [info] finalized
 * //> [2025-09-09 18:55:21.000] [info] use:ok
 *
 * const fiber = IO.unsafeRunFork(program);
 * setTimeout(() => IO.unsafeRun(fiber.pipe(Fiber.cancel)), 500);
 * //> [2025-09-09 18:55:22.000] [info] start
 * //> [2025-09-09 18:55:22.500] [info] finalized
 * ```
 */
export const guarantee: Dual<
  <A>(self: IO<A>, finalizer: IO<void>) => IO<A>,
  (finalizer: IO<void>) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveGuarantee<IOHKT>(internal.IOProto));

/**
 * Delays execution of the {@linkcode IO} by the given number of milliseconds.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.println("Hello, world!").pipe(IO.delay(1000));
 *
 * IO.unsafeRun(program);
 * // (after 1 second)
 * //> Hello, world!
 * ```
 */
export const delay: Dual<
  <A>(self: IO<A>, ms: number) => IO<A>,
  (ms: number) => <A>(self: IO<A>) => IO<A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveDelay<IOHKT>(internal.IOProto));

// -----------------------------------------------------------------------------
// Run functions
// -----------------------------------------------------------------------------
/**
 * Runs the {@linkcode IO} and returns a {@linkcode Fiber} that can be used to observe the result of the computation or to cancel it.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * const fiber = IO.unsafeRunFork(IO.sleep(1000).pipe(IO.as("done")));
 * await IO.unsafeRunPromise(fiber.pipe(Fiber.join)); => "done"
 * ```
 */
export const unsafeRunFork: <A>(program: IO<A>, options?: FiberRuntimeOptions) => IOFiber<A> =
  /* @__PURE__ */ core.deriveUnsafeRunFork<IOHKT, PartialApply<FiberHKT, [IOHKT, unknown]>>(
    internal.IOProto,
    FiberProto,
    OutcomeProto,
  );

/**
 * Runs the {@linkcode IO} and invokes the given callback with the {@linkcode Outcome} of the computation when it completes.
 * This method runs the computation synchronously as far as possible and switches to asynchronous execution when it encounters an asynchronous operation.
 *
 * This method works for both synchronous and asynchronous computations.
 * It first executes as much of the computation synchronously as possible.
 * If the computation encounters an asynchronous operation, it switches to asynchronous mode and continues there.
 * This might result in unfair scheduling if the computation contains long-running synchronous work before reaching an asynchronous boundary.
 * Use {@linkcode unsafeRunAsync} instead if you want automatic yielding for fairness.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRun(IO.println("Hello, world!"));
 * //> Hello, world!
 * ```
 *
 * **Example** (generator syntax)
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const a = yield* IO.of(1);
 *   const b = yield* IO.of(2);
 *   const sum = a + b;
 *   yield* IO.println(sum);
 * });
 * IO.unsafeRun(program);
 * //> 3
 * ```
 */
export const unsafeRun: {
  <A>(program: IO<A>, onComplete?: (outcome: IOOutcome<A>) => void): void;
  <A>(
    program: IO<A>,
    options: FiberRuntimeOptions,
    onComplete?: (outcome: IOOutcome<A>) => void,
  ): void;
} = /* @__PURE__ */ core.deriveUnsafeRun<IOHKT, PartialApply<OutcomeHKT, [IOHKT, unknown]>>(
  OutcomeProto,
);

/**
 * Runs the {@linkcode IO} computation **synchronously** and returns the result.
 * It throws a {@linkcode TypeError} if the computation is asynchronous.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * IO.unsafeRunSync(IO.println("Hello, world!"));
 * //> Hello, world!
 * ```
 *
 * **Example** (do notation)
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bind("a", () => IO.of(1)),
 *   IO.bind("b", () => IO.of(2)),
 *   IO.let("sum", ({ a, b }) => a + b),
 *   IO.returnM(({ sum }) => IO.println(sum)),
 * );
 * IO.unsafeRunSync(program);
 * //> 3
 * ```
 *
 * **Example** (generator syntax)
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const a = yield* IO.of(1);
 *   const b = yield* IO.of(2);
 *   const sum = a + b;
 *   yield* IO.println(sum);
 * });
 * IO.unsafeRunSync(program);
 * //> 3
 * ```
 *
 * @throws {TypeError} if the computation is asynchronous.
 */
export const unsafeRunSync: <A>(program: IO<A>, options?: FiberRuntimeOptions) => A =
  /* @__PURE__ */ core.deriveUnsafeRunSync<IOHKT>();

/**
 * Runs the {@linkcode IO} asynchronously and invokes the given callback with the {@linkcode Outcome} of the computation when it completes.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.println("Hello, world!").pipe(IO.delay(1000));
 *
 * IO.unsafeRunAsync(program);
 * // (after 1 second)
 * //> Hello, world!
 * ```
 */
export const unsafeRunAsync: {
  <A>(program: IO<A>, onComplete?: (outcome: IOOutcome<A>) => void): void;
  <A>(
    program: IO<A>,
    options: FiberRuntimeOptions,
    onComplete?: (outcome: IOOutcome<A>) => void,
  ): void;
} = /* @__PURE__ */ core.deriveUnsafeRunAsync<IOHKT, PartialApply<OutcomeHKT, [IOHKT, unknown]>>(
  OutcomeProto,
);

/**
 * Runs the {@linkcode IO} computation and returns a {@linkcode Promise} with the result.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.println("Hello, world!").pipe(IO.delay(1000));
 *
 * await IO.unsafeRunPromise(program);
 * // (after 1 second)
 * //> Hello, world!
 * ```
 */
export const unsafeRunPromise: <A>(program: IO<A>, options?: FiberRuntimeOptions) => Promise<A> =
  /* @__PURE__ */ core.deriveUnsafeRunPromise<IOHKT>();

/**
 * Runs the {@linkcode IO} computation and returns an object with a {@linkcode Promise} and a cancel function.
 *
 * **Cancellation Behavior:** Calling `cancel` stops the internal operation.
 * The returned Promise is rejected with a {@linkcode CancellationError}.
 * You can catch that error to distinguish cancellation from other failures.
 *
 * **Note:** You should only use this method at the top level of your program or to interact with the outside world.
 * It is not recommended to use this function in the middle of your program as it will execute the computation immediately and may cause side effects.
 *
 * **Example**
 *
 * ```typescript
 * const loop: IO<void> = IO.println("Loop until cancel..").pipe(
 *   IO.andThen(IO.sleep(500)),
 *   IO.andThen(() => loop),
 * );
 *
 * const { cancel, promise } = IO.unsafeRunPromiseCancellable(
 *   loop.pipe(IO.onCancel(IO.logDebug("Loop cancelled"))),
 * );
 *
 * setTimeout(cancel, 1500);
 *
 * await promise.catch(() => {});
 * //> Loop until cancel..
 * //> Loop until cancel..
 * //> Loop until cancel..
 * //> [2025-11-11 11:04:16.275] [debug] [fiber #0] Loop cancelled
 * ```
 */
export const unsafeRunPromiseCancellable: <A>(
  program: IO<A>,
  options?: FiberRuntimeOptions,
) => {
  readonly promise: Promise<A>;
  readonly cancel: () => Promise<void>;
} = /* @__PURE__ */ core.deriveUnsafeRunPromiseCancellable<IOHKT>();
