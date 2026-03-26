/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Arg0, Call1, HKT, RawArg1, RawTArg, TypeLambdaG } from "hkt-core";

import * as core from "./core/FiberLocal";
import * as internal from "./internal/fiberLocal";
import type { Dual } from "./utils";
import { dual } from "./utils";

/**
 * A fiber-local value of type `A`.
 *
 * Each forked fiber inherits the current value snapshot, and child updates are isolated from the parent.
 *
 * A {@linkcode FiberLocal} is scoped to the current fiber rather than shared across all fibers.
 * Use an effect-specific constructor such as `IO.fiberLocal(...)` to create one.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal("root");
 *   yield* local.pipe(FiberLocal.set("parent"));
 *
 *   const child = yield* IO.gen(function* () {
 *     const inherited = yield* local.pipe(FiberLocal.get);
 *     yield* local.pipe(FiberLocal.set("child"));
 *     return [inherited, yield* local.pipe(FiberLocal.get)] as const;
 *   }).pipe(IO.fork);
 *
 *   return [yield* Fiber.join(child), yield* local.pipe(FiberLocal.get)] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [["parent", "child"], "parent"]
 * ```
 */
export interface FiberLocal<out F extends HKT<unknown, unknown>, in out A> extends core.FiberLocal<
  F,
  A
> {
  readonly [Symbol.toStringTag]: "FiberLocal";

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

export namespace FiberLocal {
  /**
   * Extracts the stored value type from a {@linkcode FiberLocal}.
   */
  export type Value<T> = T extends FiberLocal<infer _, infer A> ? A : never;
}

export interface FiberLocalHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "A"]> {
  signature: (
    f: RawTArg<this, "F">,
    a: RawTArg<this, "A">,
  ) => FiberLocal<RawTArg<this, "F">, RawTArg<this, "A">>;
  return: FiberLocal<Arg0<this>, RawArg1<this>>;
}

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
/**
 * Creates a transformed view of a {@linkcode FiberLocal} by mapping reads with `to` and writes with `from`.
 *
 * This works like a pure lens over the current fiber-local value.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(41);
 *   const text = local.pipe(FiberLocal.imap(String, Number));
 *   yield* text.pipe(FiberLocal.set("42"));
 *   return yield* local.pipe(FiberLocal.get);
 * });
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export const imap: Dual<
  <F extends HKT<unknown, unknown>, A, B>(
    self: FiberLocal<F, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ) => FiberLocal<F, B>,
  <A, B>(
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => FiberLocal<F, B>
> = /* @__PURE__ */ dual(
  3,
  /* @__PURE__ */ (
    core.deriveImap as (
      FiberLocalProto?: object | null,
    ) => <F extends HKT<unknown, unknown>, A, B>(
      self: FiberLocal<F, A>,
      to: (a: NoInfer<A>) => B,
      from: (b: NoInfer<B>) => A,
    ) => FiberLocal<F, B>
  )(internal.FiberLocalProto),
);

/**
 * Obtains the current value of a {@linkcode FiberLocal} in the current fiber.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(1);
 *   return yield* local.pipe(FiberLocal.get);
 * });
 *
 * IO.unsafeRunSync(program); // => 1
 * ```
 */
export const get: <F extends HKT<unknown, unknown>, A>(self: FiberLocal<F, A>) => Call1<F, A> =
  /* @__PURE__ */ core.deriveGet();

/**
 * Replaces the current value of a {@linkcode FiberLocal} in the current fiber and returns the previous one.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(0);
 *   const previous = yield* local.pipe(FiberLocal.getAndSet(1));
 *   const current = yield* local.pipe(FiberLocal.get);
 *   return [previous, current] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [0, 1]
 * ```
 */
export const getAndSet: Dual<
  <F extends HKT<unknown, unknown>, A>(self: FiberLocal<F, A>, a: NoInfer<A>) => Call1<F, A>,
  <A>(a: A) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveGetAndSet());

/**
 * Applies an update function to a {@linkcode FiberLocal} in the current fiber, stores the new value, and returns the previous one.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(0);
 *   const previous = yield* local.pipe(FiberLocal.getAndUpdate((n) => n + 1));
 *   const current = yield* local.pipe(FiberLocal.get);
 *   return [previous, current] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [0, 1]
 * ```
 */
export const getAndUpdate: Dual<
  <F extends HKT<unknown, unknown>, A>(
    self: FiberLocal<F, A>,
    f: (a: NoInfer<A>) => A,
  ) => Call1<F, A>,
  <A>(f: (a: A) => A) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveGetAndUpdate());

/**
 * Replaces the current value of a {@linkcode FiberLocal} in the current fiber.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(0);
 *   yield* local.pipe(FiberLocal.set(2));
 *   return yield* local.pipe(FiberLocal.get);
 * });
 *
 * IO.unsafeRunSync(program); // => 2
 * ```
 */
export const set: Dual<
  <F extends HKT<unknown, unknown>, A>(self: FiberLocal<F, A>, a: NoInfer<A>) => Call1<F, void>,
  <A>(a: A) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, void>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveSet());

/**
 * Replaces the current value of a {@linkcode FiberLocal} in the current fiber and returns the stored value after the update.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(0);
 *   return yield* local.pipe(FiberLocal.setAndGet(2));
 * });
 *
 * IO.unsafeRunSync(program); // => 2
 * ```
 */
export const setAndGet: Dual<
  <F extends HKT<unknown, unknown>, A>(self: FiberLocal<F, A>, a: NoInfer<A>) => Call1<F, A>,
  <A>(a: A) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveSetAndGet());

/**
 * Atomically computes a result and the next current value of a {@linkcode FiberLocal} in the current fiber in one step.
 *
 * The callback returns a tuple of `[result, nextValue]`.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(1);
 *   const result = yield* local.pipe(
 *     FiberLocal.modify((n) => [`before=${n}`, n + 1] as const),
 *   );
 *   const current = yield* local.pipe(FiberLocal.get);
 *   return [result, current] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => ["before=1", 2]
 * ```
 */
export const modify: Dual<
  <F extends HKT<unknown, unknown>, A, B>(
    self: FiberLocal<F, A>,
    f: (a: NoInfer<A>) => readonly [B, A],
  ) => Call1<F, B>,
  <A, B>(
    f: (a: NoInfer<A>) => readonly [B, A],
  ) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, B>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveModify());

/**
 * Updates the current value of a {@linkcode FiberLocal} in the current fiber with a pure function and discards the result.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(1);
 *   yield* local.pipe(FiberLocal.update((n) => n + 1));
 *   return yield* local.pipe(FiberLocal.get);
 * });
 *
 * IO.unsafeRunSync(program); // => 2
 * ```
 */
export const update: Dual<
  <F extends HKT<unknown, unknown>, A>(
    self: FiberLocal<F, A>,
    f: (a: NoInfer<A>) => A,
  ) => Call1<F, void>,
  <A>(
    f: (a: NoInfer<A>) => A,
  ) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, void>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveUpdate());

/**
 * Updates the current value of a {@linkcode FiberLocal} in the current fiber with a pure function and returns the new value.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal(1);
 *   return yield* local.pipe(FiberLocal.updateAndGet((n) => n + 1));
 * });
 *
 * IO.unsafeRunSync(program); // => 2
 * ```
 */
export const updateAndGet: Dual<
  <F extends HKT<unknown, unknown>, A>(
    self: FiberLocal<F, A>,
    f: (a: NoInfer<A>) => A,
  ) => Call1<F, A>,
  <A>(
    f: (a: NoInfer<A>) => A,
  ) => <F extends HKT<unknown, unknown>>(self: FiberLocal<F, A>) => Call1<F, A>
> = /* @__PURE__ */ dual(2, /* @__PURE__ */ core.deriveUpdateAndGet());
