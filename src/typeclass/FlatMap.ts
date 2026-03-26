/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Apply } from "./Apply";

export interface FlatMap<in out F extends HKT<unknown, unknown>> extends Apply<F> {}

export const deriveAp = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "map" | "flatMap">,
): Dual.First<Apply<F>["ap"]> =>
  function ap(fab, fa) {
    return F.flatMap(fab, (f) => F.map(fa, f));
  };

export const deriveProduct = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "map" | "flatMap">,
): Dual.First<Apply<F>["product"]> =>
  function product(left, right) {
    return F.flatMap(left, (a) => F.map(right, (b) => [a, b] as const));
  };

export const deriveProductR = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "flatMap">,
): Dual.First<Apply<F>["productR"]> =>
  function productR(self, that) {
    return F.flatMap(self, () => that);
  };

// ╔═════════╗
// ║ flatten ║
// ╚═════════╝
export interface FlatMap<F> {
  /**
   * Flattens a nested container type into a single layer of the container type.
   */
  readonly flatten: <A>(self: Call1<F, Call1<F, A>>) => Call1<F, A>;
}

export const deriveFlatten = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "flatMap">,
): FlatMap<F>["flatten"] =>
  function flatten(self) {
    return F.flatMap(self, (a) => a);
  };

// ╔═════════╗
// ║ flatMap ║
// ╚═════════╝
export interface FlatMap<F> {
  /**
   * Transforms the value inside the context of the container type using a function that returns a new container type, and then flattens the result.
   */
  readonly flatMap: Dual<
    <A, B>(self: Call1<F, A>, f: (a: NoInfer<A>) => Call1<F, B>) => Call1<F, B>,
    <A, B>(f: (a: NoInfer<A>) => Call1<F, B>) => (self: Call1<F, A>) => Call1<F, B>
  >;
}

export const deriveFlatMap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "map" | "flatten">,
): Dual.First<FlatMap<F>["flatMap"]> =>
  function flatMap(self, f) {
    return F.flatten(F.map(self, f));
  };

// ╔═════════╗
// ║ flatTap ║
// ╚═════════╝
export interface FlatMap<F> {
  /**
   * Transforms the value inside the context of the container type using a function that returns a new container type, but ignores the result of the transformation and returns the original value wrapped in the container type.
   */
  readonly flatTap: Dual<
    <A, B>(self: Call1<F, A>, f: (a: NoInfer<A>) => Call1<F, B>) => Call1<F, A>,
    <A, B>(f: (a: NoInfer<A>) => Call1<F, B>) => (self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveFlatTap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "as" | "flatMap">,
): Dual.First<FlatMap<F>["flatTap"]> =>
  function flatTap(self, f) {
    return F.flatMap(self, (a) => F.as(f(a), a));
  };

// ╔═════════╗
// ║ forever ║
// ╚═════════╝
export interface FlatMap<F> {
  /**
   * Repeats the given effect indefinitely.
   */
  readonly forever: <A>(self: Call1<F, A>) => Call1<F, never>;
}

export const deriveForever = <F extends HKT<unknown, unknown>>(
  F: PickRaw<FlatMap<F>, "flatMap">,
): FlatMap<F>["forever"] =>
  function forever<A>(self: Call1<F, A>) {
    const out: Call1<F, never> = F.flatMap(self, () => out);
    return out;
  };
