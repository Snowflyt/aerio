/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  Arg0,
  Call1,
  HKT,
  PartialApply,
  RawArg1,
  RawArg2,
  RawTArg,
  TypeLambdaG,
} from "hkt-core";

import * as core from "./core/Outcome";
import * as internal from "./internal/outcome";
import type { Applicative } from "./typeclass/Applicative";
import type { ApplicativeThrow } from "./typeclass/ApplicativeThrow";
import type { Apply } from "./typeclass/Apply";
import type { Covariant } from "./typeclass/Covariant";
import type { Invariant } from "./typeclass/Invariant";
import type { Of } from "./typeclass/Of";
import type { Dual, PickRaw } from "./utils";
import { dual } from "./utils";

/**
 * Represents the terminal result of a computation or fiber.
 *
 * An {@linkcode Outcome} can be one of three states:
 * - {@linkcode Succeeded}: Represents a successful computation, containing a value of type `F<A>`.
 * - {@linkcode Failed}: Represents a failed computation, containing an error of type `E`.
 * - {@linkcode Cancelled}: Represents a computation that was cancelled and contains no value or error.
 *
 * A successful outcome stores `F<A>` rather than plain `A`.
 * This lets the success case preserve the surrounding effect type instead of forcing the value out of it.
 * With plain `IO`, a successful result usually looks like `Outcome.Succeeded(IO.of(value))`.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(42));
 *
 * IO.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export type Outcome<F extends HKT<unknown, unknown>, E, A> =
  Succeeded<F, A> | Failed<E> | Cancelled;
export interface Succeeded<out F extends HKT<unknown, unknown>, out A>
  extends OutcomeBase, Extract<core.Outcome<F, unknown, A>, { _tag: "Succeeded" }> {}
export interface Failed<out E>
  extends
    OutcomeBase,
    Extract<core.Outcome<HKT<unknown, unknown>, E, unknown>, { _tag: "Failed" }> {}
export interface Cancelled
  extends
    OutcomeBase,
    Extract<core.Outcome<HKT<unknown, unknown>, unknown, unknown>, { _tag: "Cancelled" }> {}

interface OutcomeBase {
  readonly [Symbol.toStringTag]: "Outcome";

  /**
   * Checks if the {@linkcode Outcome} is {@linkcode Succeeded}.
   *
   * **Example**
   *
   * ```typescript
   * Outcome.Succeeded(IO.of(42)).isSucceeded(); // => true
   * Outcome.Failed("Something went wrong").isSucceeded(); // => false
   * // Outcome.Cancelled() is internal and cannot be constructed directly,
   * // but we can observe it by cancelling a fiber
   * IO.cancelled().pipe(IO.unsafeRunFork, Fiber.await, IO.unsafeRunSync).isCancelled(); // => true
   * ```
   *
   * @see {@linkcode isFailed} and {@linkcode isCancelled} for the opposite checks.
   */
  isSucceeded<F extends HKT<unknown, unknown>, E, A>(
    this: Outcome<F, E, A>,
  ): this is Succeeded<F, A>;
  /**
   * Checks if the {@linkcode Outcome} is {@linkcode Failed}.
   *
   * **Example**
   *
   * ```typescript
   * Outcome.Succeeded(IO.of(42)).isFailed(); // => false
   * Outcome.Failed("Something went wrong").isFailed(); // => true
   * // Outcome.Cancelled() is internal and cannot be constructed directly,
   * // but we can observe it by cancelling a fiber
   * IO.cancelled().pipe(IO.unsafeRunFork, Fiber.await, IO.unsafeRunSync).isFailed(); // => false
   * ```
   *
   * @see {@linkcode isSucceeded} and {@linkcode isCancelled} for the opposite checks.
   */
  isFailed<F extends HKT<unknown, unknown>, E, A>(this: Outcome<F, E, A>): this is Failed<E>;
  /**
   * Checks if the {@linkcode Outcome} is {@linkcode Cancelled}.
   *
   * **Example**
   *
   * ```typescript
   * Outcome.Succeeded(IO.of(42)).isCancelled(); // => false
   * Outcome.Failed("Something went wrong").isCancelled(); // => false
   * // Outcome.Cancelled() is internal and cannot be constructed directly,
   * // but we can observe it by cancelling a fiber
   * IO.cancelled().pipe(IO.unsafeRunFork, Fiber.await, IO.unsafeRunSync).isCancelled(); // => true
   * ```
   *
   * @see {@linkcode isSucceeded} and {@linkcode isFailed} for the opposite checks.
   */
  isCancelled<F extends HKT<unknown, unknown>, E, A>(this: Outcome<F, E, A>): this is Cancelled;

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

export namespace Outcome {
  /**
   * Extracts the successful value type from an {@linkcode Outcome}.
   */
  export type Value<T> = T extends Outcome<infer _F, infer _E, infer A> ? A : never;
}

export interface OutcomeHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "E", "A"]> {
  signature: (
    f: RawTArg<this, "F">,
    e: RawTArg<this, "E">,
    a: RawTArg<this, "A">,
  ) => Outcome<RawTArg<this, "F">, RawTArg<this, "E">, RawTArg<this, "A">>;
  return: Outcome<Arg0<this>, RawArg1<this>, RawArg2<this>>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
/**
 * Constructs a successful {@linkcode Outcome}.
 *
 * `Succeeded` stores `F<A>` rather than plain `A`, so callers can keep working inside the same effect type.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(42));
 *
 * outcome.isSucceeded(); // => true
 * IO.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export const Succeeded: <F extends HKT<unknown, unknown>, E, A>(
  fa: Call1<F, A>,
) => Outcome<F, E, A> = /* @__PURE__ */ (
  core.deriveSucceeded as (
    OutcomeProto?: object | null,
  ) => <F extends HKT<unknown, unknown>, E, A>(fa: Call1<F, A>) => Outcome<F, E, A>
)(internal.OutcomeProto);

/**
 * Constructs a failed {@linkcode Outcome}.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Failed("boom");
 *
 * outcome.isFailed(); // => true
 * outcome._0; // => "boom"
 * ```
 */
export const Failed: <F extends HKT<unknown, unknown>, E, A>(e: E) => Outcome<F, E, A> =
  /* @__PURE__ */ (
    core.deriveFailed as (
      OutcomeProto?: object | null,
    ) => <F extends HKT<unknown, unknown>, E, A>(e: E) => Outcome<F, E, A>
  )(internal.OutcomeProto);

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
/**
 * Checks whether a value has the runtime shape of an {@linkcode Outcome}.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.isOutcome(Outcome.Succeeded(IO.of(1))); // => true
 * Outcome.isOutcome({ _tag: "Succeeded" }); // => false
 * ```
 */
export const isOutcome: (
  value: unknown,
) => value is Outcome<HKT<unknown, unknown>, unknown, unknown> =
  /* @__PURE__ */ core.deriveIsOutcome<OutcomeHKT>();

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
/**
 * Invariantly maps the successful value inside the {@linkcode Outcome} when it is {@linkcode Succeeded}.
 *
 * Failed and cancelled outcomes are preserved unchanged.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of("42")).pipe(
 *   Outcome.imap(IO)(Number, String),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export const imap: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Invariant<F>, "imap">,
) => Dual<
  <E, A, B>(
    self: Outcome<F, E, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ) => Outcome<F, E, B>,
  <A, B>(
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ) => <E>(self: Outcome<F, E, A>) => Outcome<F, E, B>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveImap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    3,
    (
      core.deriveImap as (
        F: Parameters<
          typeof core.deriveImap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
        >[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(
        self: Outcome<F, E, A>,
        to: (a: NoInfer<A>) => B,
        from: (b: NoInfer<B>) => A,
      ) => Outcome<F, E, B>
    )(F, internal.OutcomeProto),
  );

/**
 * Maps the successful value inside the {@linkcode Outcome} when it is {@linkcode Succeeded}.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(Outcome.map(IO)((n) => n + 1));
 *
 * IO.unsafeRunSync(outcome._0); // => 2
 * ```
 */
export const map: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
) => Dual<
  <E, A, B>(self: Outcome<F, E, A>, f: (a: NoInfer<A>) => B) => Outcome<F, E, B>,
  <A, B>(f: (a: NoInfer<A>) => B) => <E>(self: Outcome<F, E, A>) => Outcome<F, E, B>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveMap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveMap as (
        F: Parameters<typeof core.deriveMap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(self: Outcome<F, E, A>, f: (a: NoInfer<A>) => B) => Outcome<F, E, B>
    )(F, internal.OutcomeProto),
  );

/**
 * Runs a callback on the successful value inside the {@linkcode Outcome} when it is {@linkcode Succeeded}, and preserves that value.
 *
 * **Example**
 *
 * ```typescript
 * let seen = 0;
 * const outcome = Outcome.Succeeded(IO.of(2)).pipe(
 *   Outcome.tap(IO)((n) => { seen = n; }),
 * );
 *
 * seen; // => 2
 * IO.unsafeRunSync(outcome._0); // => 2
 * ```
 */
export const tap: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "tap">,
) => Dual<
  <E, A>(self: Outcome<F, E, A>, f: (a: NoInfer<A>) => void) => Outcome<F, E, A>,
  <A>(f: (a: NoInfer<A>) => void) => <E>(self: Outcome<F, E, A>) => Outcome<F, E, A>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveTap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveTap as (
        F: Parameters<typeof core.deriveTap<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
        OutcomeProto?: object | null,
      ) => <E, A>(self: Outcome<F, E, A>, f: (a: NoInfer<A>) => void) => Outcome<F, E, A>
    )(F, internal.OutcomeProto),
  );

/**
 * Replaces the successful value inside the {@linkcode Outcome} when it is {@linkcode Succeeded} with a constant value.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(Outcome.as(IO)("done"));
 *
 * IO.unsafeRunSync(outcome._0); // => "done"
 * ```
 */
export const as: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "as">,
) => Dual<
  <E, A, B>(self: Outcome<F, E, A>, b: B) => Outcome<F, E, B>,
  <B>(b: B) => <E, A>(self: Outcome<F, E, A>) => Outcome<F, E, B>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveAs<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveAs as (
        F: Parameters<typeof core.deriveAs<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(self: Outcome<F, E, A>, b: B) => Outcome<F, E, B>
    )(F, internal.OutcomeProto),
  );

/**
 * Replaces the successful value inside the {@linkcode Outcome} when it is {@linkcode Succeeded} with `void`.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(Outcome.asVoid(IO));
 *
 * IO.unsafeRunSync(outcome._0); // => undefined
 * ```
 */
export const asVoid: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "asVoid">,
) => <E, A>(self: Outcome<F, E, A>) => Outcome<F, E, void> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveAsVoid<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  (
    core.deriveAsVoid as (
      F: Parameters<
        typeof core.deriveAsVoid<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
      >[0],
      OutcomeProto?: object | null,
    ) => <E, A>(self: Outcome<F, E, A>) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Lifts a plain value into {@linkcode Succeeded} using `F.of`.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.of(IO)(42);
 *
 * outcome.isSucceeded(); // => true
 * IO.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export const of: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Of<F>, "of">,
) => <E, A>(a: A) => Outcome<F, E, A> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveOf<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  (
    core.deriveOf as (
      F: Parameters<typeof core.deriveOf<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
      OutcomeProto?: object | null,
    ) => <E, A>(a: A) => Outcome<F, E, A>
  )(F, internal.OutcomeProto);

/**
 * Constructs a successful {@linkcode Outcome} containing `F.void()`.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.void(IO)();
 *
 * outcome.isSucceeded(); // => true
 * IO.unsafeRunSync(outcome._0); // => undefined
 * ```
 */
const void_: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Of<F>, "void">,
) => <E>() => Outcome<F, E, void> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveVoid<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  (
    core.deriveVoid as (
      F: Parameters<typeof core.deriveVoid<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
      OutcomeProto?: object | null,
    ) => <E>() => Outcome<F, E, void>
  )(F, internal.OutcomeProto);
export { void_ as void };

/**
 * Applies a successful function outcome to a successful value outcome.
 *
 * Failed and cancelled outcomes short-circuit.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of((n: number) => n + 1)).pipe(
 *   Outcome.ap(IO)(Outcome.Succeeded(IO.of(1))),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => 2
 * ```
 */
export const ap: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "ap">,
) => Dual<
  <E, A, B>(fab: Outcome<F, E, (a: A) => B>, fa: Outcome<F, E, A>) => Outcome<F, E, B>,
  <E, A>(fa: Outcome<F, E, A>) => <B>(self: Outcome<F, E, (a: A) => B>) => Outcome<F, E, B>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveAp<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveAp as (
        F: Parameters<typeof core.deriveAp<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(fab: Outcome<F, E, (a: A) => B>, fa: Outcome<F, E, A>) => Outcome<F, E, B>
    )(F, internal.OutcomeProto),
  );

/**
 * Combines two successful outcomes into a pair.
 *
 * Failed and cancelled outcomes short-circuit.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(
 *   Outcome.product(IO)(Outcome.Succeeded(IO.of("a"))),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => [1, "a"]
 * ```
 */
export const product: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "product">,
) => Dual<
  <E, A, B>(left: Outcome<F, E, A>, right: Outcome<F, E, B>) => Outcome<F, E, readonly [A, B]>,
  <E, A>(that: Outcome<F, E, A>) => <B>(self: Outcome<F, E, B>) => Outcome<F, E, readonly [A, B]>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveProduct<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveProduct as (
        F: Parameters<
          typeof core.deriveProduct<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
        >[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(
        left: Outcome<F, E, A>,
        right: Outcome<F, E, B>,
      ) => Outcome<F, E, readonly [A, B]>
    )(F, internal.OutcomeProto),
  );

/**
 * Sequences two successful outcomes and keeps the left value.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(
 *   Outcome.productL(IO)(Outcome.Succeeded(IO.of("a"))),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => 1
 * ```
 */
export const productL: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "productL">,
) => Dual<
  <E, A, B>(self: Outcome<F, E, A>, that: Outcome<F, E, B>) => Outcome<F, E, A>,
  <E, B>(that: Outcome<F, E, B>) => <A>(self: Outcome<F, E, A>) => Outcome<F, E, A>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveProductL<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveProductL as (
        F: Parameters<
          typeof core.deriveProductL<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
        >[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(self: Outcome<F, E, A>, that: Outcome<F, E, B>) => Outcome<F, E, A>
    )(F, internal.OutcomeProto),
  );

/**
 * Sequences two successful outcomes and keeps the right value.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(
 *   Outcome.productR(IO)(Outcome.Succeeded(IO.of("a"))),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => "a"
 * ```
 */
export const productR: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "productR">,
) => Dual<
  <E, A, B>(self: Outcome<F, E, A>, that: Outcome<F, E, B>) => Outcome<F, E, B>,
  <E, B>(that: Outcome<F, E, B>) => <A>(self: Outcome<F, E, A>) => Outcome<F, E, B>
> = <F extends HKT<unknown, unknown>>(
  F: Parameters<typeof core.deriveProductR<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  dual(
    2,
    (
      core.deriveProductR as (
        F: Parameters<
          typeof core.deriveProductR<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
        >[0],
        OutcomeProto?: object | null,
      ) => <E, A, B>(self: Outcome<F, E, A>, that: Outcome<F, E, B>) => Outcome<F, E, B>
    )(F, internal.OutcomeProto),
  );

/**
 * Returns the given outcome when the condition is true.
 *
 * When the condition is false, this returns a successful void outcome.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.when(IO)(true, Outcome.Succeeded(IO.void()))._tag; // => "Succeeded"
 * Outcome.when(IO)(false, Outcome.Failed("boom"))._tag; // => "Succeeded"
 * ```
 */
export const when: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Applicative<F>, "void">,
) => <E>(cond: boolean, then: Outcome<F, E, void>) => Outcome<F, E, void> = <
  F extends HKT<unknown, unknown>,
>(
  F: Parameters<typeof core.deriveWhen<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  (
    core.deriveWhen as (
      F: Parameters<typeof core.deriveWhen<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
      OutcomeProto?: object | null,
    ) => <E>(cond: boolean, then: Outcome<F, E, void>) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Returns the given outcome when the condition is false.
 *
 * When the condition is true, this returns a successful void outcome.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.unless(IO)(false, Outcome.Succeeded(IO.void()))._tag; // => "Succeeded"
 * Outcome.unless(IO)(true, Outcome.Failed("boom"))._tag; // => "Succeeded"
 * ```
 */
export const unless: <F extends HKT<unknown, unknown>>(
  F: PickRaw<Applicative<F>, "void">,
) => <E>(cond: boolean, then: Outcome<F, E, void>) => Outcome<F, E, void> = <
  F extends HKT<unknown, unknown>,
>(
  F: Parameters<typeof core.deriveUnless<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>>[0],
) =>
  (
    core.deriveUnless as (
      F: Parameters<
        typeof core.deriveUnless<F, unknown, PartialApply<OutcomeHKT, [F, unknown]>>
      >[0],
      OutcomeProto?: object | null,
    ) => <E>(cond: boolean, then: Outcome<F, E, void>) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Constructs a failed {@linkcode Outcome}.
 *
 * This is the `ApplicativeThrow`-style alias of {@linkcode Failed}.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.throw("boom").isFailed(); // => true
 * ```
 */
const throw_: <F extends HKT<unknown, unknown>, E, A = never>(e: E) => Outcome<F, E, A> = (
  core.deriveThrow as <F extends HKT<unknown, unknown>, E>(
    OutcomeProto?: object | null,
  ) => <A = never>(e: E) => Outcome<F, E, A>
)(internal.OutcomeProto);
export { throw_ as throw };

/**
 * Recovers only failed outcomes.
 *
 * Successful and cancelled outcomes are preserved unchanged.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Failed("boom").pipe(
 *   Outcome.catch((error) => Outcome.Succeeded(IO.of(error.length))),
 * );
 *
 * IO.unsafeRunSync(outcome._0); // => 4
 * ```
 */
const catch_: Dual<
  <F extends HKT<unknown, unknown>, E, A, B>(
    self: Outcome<F, E, A>,
    handler: (e: E) => Outcome<F, E, B>,
  ) => Outcome<F, E, A | B>,
  <F extends HKT<unknown, unknown>, E, B>(
    handler: (e: E) => Outcome<F, E, B>,
  ) => <A>(self: Outcome<F, E, A>) => Outcome<F, E, A | B>
> = /* @__PURE__ */ dual(
  2,
  /* @__PURE__ */ (
    core.deriveCatch as () => <F extends HKT<unknown, unknown>, E, A, B>(
      self: Outcome<F, E, A>,
      handler: (e: E) => Outcome<F, E, B>,
    ) => Outcome<F, E, A | B>
  )(),
);
export { catch_ as catch };

/**
 * Discards success values and failures, but preserves cancellation.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(1)).pipe(Outcome.ignore(IO));
 *
 * IO.unsafeRunSync(outcome._0); // => undefined
 * ```
 */
export const ignore: <F extends HKT<unknown, unknown>, E>(
  F: PickRaw<ApplicativeThrow<F, E>, "asVoid" | "void">,
) => <A>(self: Outcome<F, E, A>) => Outcome<F, E, void> = <F extends HKT<unknown, unknown>, E>(
  F: Parameters<typeof core.deriveIgnore<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
) =>
  (
    core.deriveIgnore as (
      F: Parameters<typeof core.deriveIgnore<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
      OutcomeProto?: object | null,
    ) => <A>(self: Outcome<F, E, A>) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Fails when the condition is true and succeeds with `void` otherwise.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.throwWhen(IO)(true, "boom").isFailed(); // => true
 * Outcome.throwWhen(IO)(false, "boom").isSucceeded(); // => true
 * ```
 */
export const throwWhen: <F extends HKT<unknown, unknown>, E>(
  F: PickRaw<ApplicativeThrow<F, E>, "void">,
) => (cond: boolean, e: E) => Outcome<F, E, void> = <F extends HKT<unknown, unknown>, E>(
  F: Parameters<typeof core.deriveThrowWhen<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
) =>
  (
    core.deriveThrowWhen as (
      F: Parameters<typeof core.deriveThrowWhen<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
      OutcomeProto?: object | null,
    ) => (cond: boolean, e: E) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Fails when the condition is false and succeeds with `void` otherwise.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.throwUnless(IO)(true, "boom").isSucceeded(); // => true
 * Outcome.throwUnless(IO)(false, "boom").isFailed(); // => true
 * ```
 */
export const throwUnless: <F extends HKT<unknown, unknown>, E>(
  F: PickRaw<ApplicativeThrow<F, E>, "void">,
) => (cond: boolean, e: E) => Outcome<F, E, void> = <F extends HKT<unknown, unknown>, E>(
  F: Parameters<typeof core.deriveThrowUnless<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
) =>
  (
    core.deriveThrowUnless as (
      F: Parameters<typeof core.deriveThrowUnless<F, E, PartialApply<OutcomeHKT, [F, E]>>>[0],
      OutcomeProto?: object | null,
    ) => (cond: boolean, e: E) => Outcome<F, E, void>
  )(F, internal.OutcomeProto);

/**
 * Checks whether an {@linkcode Outcome} is a {@linkcode Succeeded}.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.Succeeded(IO.of(1)).pipe(Outcome.isSucceeded); // => true
 * ```
 */
export const isSucceeded: <F extends HKT<unknown, unknown>, E, A>(
  self: Outcome<F, E, A>,
) => self is Succeeded<F, A> = /* @__PURE__ */ (
  core.deriveIsSucceeded as (
    OutcomeProto?: object | null,
  ) => <F extends HKT<unknown, unknown>, E, A>(self: Outcome<F, E, A>) => self is Succeeded<F, A>
)(internal.OutcomeProto);

/**
 * Checks whether an {@linkcode Outcome} is a {@linkcode Failed}.
 *
 * **Example**
 *
 * ```typescript
 * Outcome.Failed("boom").pipe(Outcome.isFailed); // => true
 * ```
 */
export const isFailed: <F extends HKT<unknown, unknown>, E, A>(
  self: Outcome<F, E, A>,
) => self is Failed<E> = /* @__PURE__ */ (
  core.deriveIsFailed as (
    OutcomeProto?: object | null,
  ) => <F extends HKT<unknown, unknown>, E, A>(self: Outcome<F, E, A>) => self is Failed<E>
)(internal.OutcomeProto);

/**
 * Checks whether an {@linkcode Outcome} is a {@linkcode Cancelled}.
 *
 * **Example**
 *
 * ```typescript
 * const cancelled = IO.cancelled().pipe(
 *   IO.unsafeRunFork,
 *   Fiber.await,
 *   IO.unsafeRunSync
 * );
 *
 * cancelled.pipe(Outcome.isCancelled); // => true
 * ```
 */
export const isCancelled: <F extends HKT<unknown, unknown>, E, A>(
  self: Outcome<F, E, A>,
) => self is Cancelled = /* @__PURE__ */ (
  core.deriveIsCancelled as (
    OutcomeProto?: object | null,
  ) => <F extends HKT<unknown, unknown>, E, A>(self: Outcome<F, E, A>) => self is Cancelled
)(internal.OutcomeProto);
