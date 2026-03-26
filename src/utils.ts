/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Creates a dual function that can be called with the first argument as the value to be operated on (“data-first”),
 * or with the rest of the arguments first and returning a function that takes the value to be operated on (“data-last”).
 *
 * **Example**
 *
 * ```typescript
 * const concat = dual(2, (self: string, that: string) => self + that);
 *
 * concat("foo", "bar"); // => "foobar"
 * concat("bar")("foo"); // => "foobar"
 * ```
 *
 * **Example** (with a predicate indicating whether it is a “data-first” call)
 *
 * ```typescript
 * const retry = dual(
 *   (...args) => args[0] instanceof Promise,
 *   <A>(self: Promise<A>, retires: number, delayMs?: number): Promise<A> => ...
 * );
 * ```
 *
 * @param arity The arity (number of arguments) of the function, or a predicate function that accepts the arguments of the function and returns a boolean indicating whether it is a “data-first” call.
 * @param f The function to create a dual function for.
 */
export function dual<
  DataFirst extends (...args: never) => unknown,
  DataLast extends (...args: never) => unknown = (
    ...args: Tail<ParametersW<DataFirst>>
  ) => (...args: HeadPart<ParametersW<DataFirst>>) => ReturnTypeW<DataFirst>,
>(arity: ParametersW<DataFirst>["length"], f: DataFirst, g?: DataLast): Dual<DataFirst, DataLast>;
export function dual<
  DataFirst extends (...args: never) => unknown,
  DataLast extends (...args: never) => unknown = (
    ...args: Tail<ParametersW<DataFirst>>
  ) => (...args: HeadPart<ParametersW<DataFirst>>) => ReturnTypeW<DataFirst>,
>(
  isDataFirst: (...args: ParametersW<DataFirst> | Tail<ParametersW<DataFirst>>) => boolean,
  f: DataFirst,
): Dual<DataFirst, DataLast>;
export function dual(
  arity: number | ((...args: any[]) => boolean),
  f: (...args: any[]) => unknown,
): Dual<any, any> {
  if (typeof arity === "function")
    return (...args: any[]) => (arity(...args) ? f(...args) : (self: any) => f(self, ...args));

  switch (arity) {
    case 0:
    case 1:
      throw new TypeError("Invalid arity for `dual`: " + arity);

    case 2:
      return Object.assign(
        Object.defineProperty(
          (...args: any[]) => (args.length >= 2 ? f(...args) : (self: any) => f(self, ...args)),
          "name",
          { value: f.name, configurable: true },
        ),
        { raw: f },
      ) as never;

    case 3:
      return Object.assign(
        Object.defineProperty(
          (...args: any[]) => (args.length >= 3 ? f(...args) : (self: any) => f(self, ...args)),
          "name",
          { value: f.name, configurable: true },
        ),
        { raw: f },
      ) as never;

    case 4:
      return Object.assign(
        Object.defineProperty(
          (...args: any[]) => (args.length >= 4 ? f(...args) : (self: any) => f(self, ...args)),
          "name",
          { value: f.name, configurable: true },
        ),
        { raw: f },
      ) as never;

    case 5:
      return Object.assign(
        Object.defineProperty(
          (...args: any[]) => (args.length >= 5 ? f(...args) : (self: any) => f(self, ...args)),
          "name",
          { value: f.name, configurable: true },
        ),
        { raw: f },
      ) as never;

    case 6:
      return Object.assign(
        Object.defineProperty(
          (...args: any[]) => (args.length >= 6 ? f(...args) : (self: any) => f(self, ...args)),
          "name",
          { value: f.name, configurable: true },
        ),
        { raw: f },
      ) as never;
  }

  throw new Error("Unsupported arity for `dual`: " + arity);
}
/**
 * A dual function that can be called with the first argument as the value to be operated on (“data-first”),
 * or with the rest of the arguments first and returning a function that takes the value to be operated on (“data-last”).
 *
 * In addition to being callable in both data-first and data-last styles, a `Dual` function also has a `raw` property that contains the original data-first function.
 */
export type Dual<
  DataFirst extends (...args: never) => unknown,
  DataLast extends (...args: never) => unknown,
> = DataFirst & DataLast & { readonly raw: DataFirst };
export namespace Dual {
  /**
   * Extracts the data-first function type from a {@linkcode Dual}.
   */
  export type First<D> = D extends Dual<infer DataFirst, infer _> ? DataFirst : never;
  /**
   * Extracts the data-last function type from a {@linkcode Dual}.
   */
  export type Last<D> = D extends Dual<infer _, infer DataLast> ? DataLast : never;
}

/**
 * Like {@linkcode Pick}, but converts {@linkcode Dual} properties to their data-first versions.
 * @internal
 */
export type PickRaw<T, K extends keyof T = keyof T> = {
  [P in K]: T[P] extends Dual<infer DataFirst, infer _> ? DataFirst : T[P];
};

/**
 * Pipes a value through a pipeline of functions.
 *
 * **Example**
 *
 * ```typescript
 * const result = pipe(
 *   IO.of(42),
 *   IO.map((n) => n + 1),
 *   IO.unsafeRunSync,
 * ); // => 43
 * ```
 *
 * @see {@linkcode flow} for composing functions.
 */
export function pipe<A>(a: A): A;
export function pipe<A, B = never>(a: A, ab: (a: A) => B): B;
// prettier-ignore
export function pipe<A, B = never, C = never>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): H;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): I;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): J;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K): K;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L): L;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M): M;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N): N;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O): O;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P): P;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q): Q;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R): R;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S): S;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T): T;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U): U;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V): V;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W): W;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X): X;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y): Y;
// prettier-ignore
export function pipe<A, B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never, Z = never>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y, yz: (y: Y) => Z): Z;
export function pipe(value: any, ...fs: any[]) {
  // Optimization inspired by Effect
  // https://github.com/Effect-TS/effect/blob/f293e97ab2a26f45586de106b85119c5d98ab4c7/packages/effect/src/Pipeable.ts#L491-L524
  switch (fs.length) {
    case 1:
      return fs[0](value);
    case 2:
      return fs[1](fs[0](value));
    case 3:
      return fs[2](fs[1](fs[0](value)));
    case 4:
      return fs[3](fs[2](fs[1](fs[0](value))));
    case 5:
      return fs[4](fs[3](fs[2](fs[1](fs[0](value)))));
    case 6:
      return fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](value))))));
    case 7:
      return fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](value)))))));
    case 8:
      return fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](value))))))));
    case 9:
      return fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](value)))))))));
    default: {
      let result = value;
      for (const f of fs) result = f(result);
      return result;
    }
  }
}

/**
 * Compose a series of functions from left to right.
 *
 * **Example**
 *
 * ```typescript
 * const f = flow(
 *   (n: number) => n + 1,
 *   IO.of,
 *   IO.map((n) => n * 2),
 *   IO.unsafeRunSync,
 * );
 * f(42); // => 86
 * ```
 *
 * @see {@linkcode pipe} for piping a value through a series of functions.
 */
// prettier-ignore
export function flow<A extends unknown[], B = never>(ab: (...a: A) => B): (...a: A) => B;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never>(ab: (...a: A) => B, bc: (b: B) => C): (...a: A) => C;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (...a: A) => D;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (...a: A) => E;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (...a: A) => F;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (...a: A) => G;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (...a: A) => H;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): (...a: A) => I;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): (...a: A) => J;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K): (...a: A) => K;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L): (...a: A) => L;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M): (...a: A) => M;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N): (...a: A) => N;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O): (...a: A) => O;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P): (...a: A) => P;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q): (...a: A) => Q;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R): (...a: A) => R;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S): (...a: A) => S;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T): (...a: A) => T;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U): (...a: A) => U;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V): (...a: A) => V;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W): (...a: A) => W;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X): (...a: A) => X;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y): (...a: A) => Y;
// prettier-ignore
export function flow<A extends unknown[], B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never, Z = never>(ab: (...a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J, jk: (j: J) => K, kl: (k: K) => L, lm: (l: L) => M, mn: (m: M) => N, no: (n: N) => O, op: (o: O) => P, pq: (p: P) => Q, qr: (q: Q) => R, rs: (r: R) => S, st: (s: S) => T, tu: (t: T) => U, uv: (u: U) => V, vw: (v: V) => W, wx: (w: W) => X, xy: (x: X) => Y, yz: (y: Y) => Z): (...a: A) => Z;
export function flow(...fs: any[]) {
  // Optimization inspired by Effect
  // https://github.com/Effect-TS/effect/blob/f293e97ab2a26f45586de106b85119c5d98ab4c7/packages/effect/src/Pipeable.ts#L491-L524
  switch (fs.length) {
    case 1:
      return fs[0];
    case 2:
      return function (this: any, ...args: any[]) {
        return fs[1](fs[0].apply(this, args));
      };
    case 3:
      return function (this: any, ...args: any[]) {
        return fs[2](fs[1](fs[0].apply(this, args)));
      };
    case 4:
      return function (this: any, ...args: any[]) {
        return fs[3](fs[2](fs[1](fs[0].apply(this, args))));
      };
    case 5:
      return function (this: any, ...args: any[]) {
        return fs[4](fs[3](fs[2](fs[1](fs[0].apply(this, args)))));
      };
    case 6:
      return function (this: any, ...args: any[]) {
        return fs[5](fs[4](fs[3](fs[2](fs[1](fs[0].apply(this, args))))));
      };
    case 7:
      return function (this: any, ...args: any[]) {
        return fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0].apply(this, args)))))));
      };
    case 8:
      return function (this: any, ...args: any[]) {
        return fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0].apply(this, args))))))));
      };
    case 9:
      return function (this: any, ...args: any[]) {
        return fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0].apply(this, args)))))))));
      };
    default:
      return function (this: any, ...args: any[]) {
        let result = fs[0].apply(this, args);
        for (let i = 1; i < fs.length; i++) result = fs[i](result);
        return result;
      };
  }
}

// -----------------------------------------------------------------------------
// Internal type utilities
// -----------------------------------------------------------------------------
/**
 * A wider version of {@linkcode Parameters} that does not require the type to be a function.
 */
type ParametersW<F> = F extends (...args: infer Params) => unknown ? Params : never;
/**
 * A wider version of {@linkcode ReturnType} that does not require the type to be a function.
 */
type ReturnTypeW<F> = F extends (...args: never) => infer R ? R : never;

/**
 * Get the first element of a tuple wrapped in a one-element tuple.
 *
 * This is a hacking to keep the labels of the function parameters in the generated DTS files,
 * since TypeScript only keeps the labels in a tuple, so we cannot unwrap the tuple directly.
 */
type HeadPart<T> =
  T extends [unknown] ? T
  : T extends [...infer Init, unknown] ? HeadPart<Init>
  : never;

type Tail<T> = T extends [unknown, ...infer Tail] ? Tail : [];
