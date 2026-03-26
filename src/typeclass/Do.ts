/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, TolerantRetType } from "hkt-core";

import type { PickRaw } from "../utils";

import type { Applicative } from "./Applicative";
import type { Covariant } from "./Covariant";
import type { Monad } from "./Monad";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Do<in out FF extends HKT<unknown, unknown>> {}

export interface Return<A> {
  readonly _tag: "Return";
  readonly _0: A;
}

// ╔════╗
// ║ do ║
// ╚════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly do: {
    <B = never>(ab: (ctx: Call1<FF, {}>) => Return<B>): B;
    (ab: (ctx: Call1<FF, {}>) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => Return<C>): C;
    // prettier-ignore
    <B = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => Return<D>): D;
    // prettier-ignore
    <B = never, C = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => Return<E>): E;
    // prettier-ignore
    <B = never, C = never, D = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => Return<F>): F;
    // prettier-ignore
    <B = never, C = never, D = never, E = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => Return<G>): G;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => Return<H>): H;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => Return<I>): I;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => Return<J>): J;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => Return<K>): K;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => Return<L>): L;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => Return<M>): M;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => Return<N>): N;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => Return<O>): O;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => Return<P>): P;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Return<Q>): Q;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => Return<R>): R;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => Return<S>): S;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => Return<T>): T;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => Return<U>): U;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => Return<V>): V;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => Return<W>): W;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => Return<X>): X;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Return<Y>): Y;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => TolerantRetType<FF>): Call1<FF, void>;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never, Z = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Y, yz: (ctx: Y) => Return<Z>): Z;
    // prettier-ignore
    <B = never, C = never, D = never, E = never, F = never, G = never, H = never, I = never, J = never, K = never, L = never, M = never, N = never, O = never, P = never, Q = never, R = never, S = never, T = never, U = never, V = never, W = never, X = never, Y = never>(ab: (ctx: Call1<FF, {}>) => B, bc: (ctx: B) => C, cd: (ctx: C) => D, de: (ctx: D) => E, ef: (ctx: E) => F, fg: (ctx: F) => G, gh: (ctx: G) => H, hi: (ctx: H) => I, ij: (ctx: I) => J, jk: (ctx: J) => K, kl: (ctx: K) => L, lm: (ctx: L) => M, mn: (ctx: M) => N, no: (ctx: N) => O, op: (ctx: O) => P, pq: (ctx: P) => Q, qr: (ctx: Q) => R, rs: (ctx: R) => S, st: (ctx: S) => T, tu: (ctx: T) => U, uv: (ctx: U) => V, vw: (ctx: V) => W, wx: (ctx: W) => X, xy: (ctx: X) => Y, yz: (ctx: Y) => TolerantRetType<FF>): Call1<FF, void>;
  };
}

export const deriveDo = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Applicative<F>, "asVoid" | "of">,
): Do<F>["do"] =>
  function do_(...fs: any[]): any {
    let a = F.of({});
    for (const f of fs) a = f(a);
    if (typeof a === "object" && a !== null && "_tag" in a && a._tag === "Return" && "_0" in a)
      return a._0;
    return F.asVoid(a);
  };

// ╔═════╗
// ║ let ║
// ╚═════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly let: <Ctx, K extends PropertyKey, A>(
    name: K,
    f: (ctx: Ctx) => A,
  ) => (
    ctx: Call1<FF, Ctx>,
  ) => Call1<FF, { [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }>;
}

export const deriveLet = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Do<F>["let"] =>
  function let_<Ctx, K extends PropertyKey, A>(name: K, f: (ctx: Ctx) => A) {
    return (ctx: Call1<F, Ctx>) =>
      F.map(ctx, (ctx) => {
        const a = f(ctx);
        return Object.assign({}, ctx, { [name]: a }) as {
          [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A;
        };
      });
  };

// ╔══════╗
// ║ letV ║
// ╚══════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly letV: <K extends PropertyKey, A>(
    name: K,
    value: A,
  ) => <Ctx>(
    ctx: Call1<FF, Ctx>,
  ) => Call1<FF, { [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }>;
}

export const deriveLetV = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Do<F>["letV"] =>
  function letV<K extends PropertyKey, A>(name: K, value: A) {
    return <Ctx>(ctx: Call1<F, Ctx>) =>
      F.map(
        ctx,
        (ctx) =>
          Object.assign({}, ctx, { [name]: value }) as {
            [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A;
          },
      );
  };

// ╔══════╗
// ║ bind ║
// ╚══════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly bind: <Ctx, K extends PropertyKey, A>(
    name: K,
    f: (ctx: Ctx) => Call1<FF, A>,
  ) => (
    ctx: Call1<FF, Ctx>,
  ) => Call1<FF, { [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }>;
}

export const deriveBind = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "map" | "flatMap">,
): Do<F>["bind"] =>
  function bind<Ctx, K extends PropertyKey, A>(name: K, f: (ctx: Ctx) => Call1<F, A>) {
    return (ctx: Call1<F, Ctx>) =>
      F.flatMap(ctx, (ctx) =>
        F.map(
          f(ctx),
          (a) =>
            Object.assign({}, ctx, { [name]: a }) as {
              [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A;
            },
        ),
      );
  };

// ╔═══════╗
// ║ bindV ║
// ╚═══════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly bindV: <Ctx, K extends PropertyKey, A>(
    name: K,
    fa: Call1<FF, A>,
  ) => (
    ctx: Call1<FF, Ctx>,
  ) => Call1<FF, { [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A }>;
}

export const deriveBindV = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "map" | "flatMap">,
): Do<F>["bindV"] =>
  function bindV<K extends PropertyKey, A>(name: K, fa: Call1<F, A>) {
    return <Ctx>(ctx: Call1<F, Ctx>) =>
      F.flatMap(ctx, (ctx) =>
        F.map(
          fa,
          (a) =>
            Object.assign({}, ctx, { [name]: a }) as {
              [P in K | keyof Ctx]: P extends keyof Ctx ? Ctx[P] : A;
            },
        ),
      );
  };

// ╔══════╗
// ║ also ║
// ╚══════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly also: <Ctx, A>(f: (ctx: Ctx) => Call1<FF, A>) => (ctx: Call1<FF, Ctx>) => Call1<FF, Ctx>;
}

export const deriveAlso = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "as" | "flatMap">,
): Do<F>["also"] =>
  function also(f) {
    return (ctx) => F.flatMap(ctx, (ctx) => F.as(f(ctx), ctx));
  };

// ╔═══════╗
// ║ alsoV ║
// ╚═══════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly alsoV: <Ctx, A>(ma: Call1<FF, A>) => (ctx: Call1<FF, Ctx>) => Call1<FF, Ctx>;
}

export const deriveAlsoV = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "as" | "flatMap">,
): Do<F>["alsoV"] =>
  function alsoV(fa) {
    return (ctx) => F.flatMap(ctx, (ctx) => F.as(fa, ctx));
  };

// ╔════════╗
// ║ return ║
// ╚════════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly return: <Ctx, A>(f: (ctx: Ctx) => A) => (ctx: Call1<FF, Ctx>) => Return<Call1<FF, A>>;
}

export const deriveReturn = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Do<F>["return"] =>
  function return_(f) {
    return (ctx) => ({ _tag: "Return", _0: F.map(ctx, f) });
  };

// ╔═════════╗
// ║ returnM ║
// ╚═════════╝
export interface Do<FF extends HKT<unknown, unknown>> {
  readonly returnM: <Ctx, A>(
    f: (ctx: Ctx) => Call1<FF, A>,
  ) => (ctx: Call1<FF, Ctx>) => Return<Call1<FF, A>>;
}

export const deriveReturnM = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "flatMap">,
): Do<F>["returnM"] =>
  function returnM(f) {
    return (ctx) => ({ _tag: "Return", _0: F.flatMap(ctx, f) });
  };
