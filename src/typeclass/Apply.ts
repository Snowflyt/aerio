/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Covariant } from "./Covariant";

export interface Apply<F extends HKT<unknown, unknown>> extends Covariant<F> {}

// ╔════╗
// ║ ap ║
// ╚════╝
export interface Apply<F> {
  /**
   * Applies a function wrapped in the context of the container type to a value wrapped in the same context, producing a new container type with the result.
   */
  readonly ap: Dual<
    <A, B>(fab: Call1<F, (a: A) => B>, fa: Call1<F, A>) => Call1<F, B>,
    <A>(fa: Call1<F, A>) => <B>(self: Call1<F, (a: A) => B>) => Call1<F, B>
  >;
}

export const deriveAp = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "map" | "product">,
): Dual.First<Apply<F>["ap"]> =>
  function ap(fab, fa) {
    return F.map(F.product(fab, fa), ([f, a]) => f(a));
  };

// ╔═════════╗
// ║ product ║
// ╚═════════╝
export interface Apply<F> {
  /**
   * Combines two container types and produces a new container type that contains a tuple of the values from both containers.
   */
  readonly product: Dual<
    <A, B>(left: Call1<F, A>, right: Call1<F, B>) => Call1<F, readonly [A, B]>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, readonly [A, B]>
  >;
}

export const deriveProduct = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "map" | "ap">,
): Dual.First<Apply<F>["product"]> =>
  function product<A, B>(left: Call1<F, A>, right: Call1<F, B>) {
    return F.ap(
      F.map(left, (a) => (b: B) => [a, b] as const),
      right,
    );
  };

// ╔══════════╗
// ║ productL ║
// ╚══════════╝
export interface Apply<F> {
  /**
   * Combines two container types and produces a new container type that contains the value from the first container, ignoring the value from the second container.
   */
  readonly productL: Dual<
    <A, B>(self: Call1<F, A>, that: Call1<F, B>) => Call1<F, A>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveProductL = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "map" | "product">,
): Dual.First<Apply<F>["productL"]> =>
  function productL<A, B>(self: Call1<F, A>, that: Call1<F, B>) {
    return F.map(F.product(self, that), ([a]) => a);
  };

// ╔══════════╗
// ║ productR ║
// ╚══════════╝
export interface Apply<F> {
  /**
   * Combines two container types and produces a new container type that contains the value from the second container, ignoring the value from the first container.
   */
  readonly productR: Dual<
    <A, B>(self: Call1<F, A>, that: Call1<F, B>) => Call1<F, B>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, B>
  >;
}

export const deriveProductR = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Apply<F>, "map" | "product">,
): Dual.First<Apply<F>["productR"]> =>
  function productR<A, B>(self: Call1<F, A>, that: Call1<F, B>) {
    return F.map(F.product(self, that), ([, b]) => b);
  };
