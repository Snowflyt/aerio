/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Monad } from "./Monad";

export interface MonadZip<in out F extends HKT<unknown, unknown>> extends Monad<F> {}

// ╔═════╗
// ║ zip ║
// ╚═════╝
export interface MonadZip<F> {
  /**
   * Combines two container types **independently**, keeping both results in a tuple.
   */
  readonly zip: Dual<
    <A, B>(self: Call1<F, A>, that: Call1<F, B>) => Call1<F, readonly [A, B]>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, readonly [A, B]>
  >;
}

// ╔═════════╗
// ║ zipWith ║
// ╚═════════╝
export interface MonadZip<F> {
  /**
   * Combines two container types **independently**, using a provided function to combine the results.
   */
  readonly zipWith: Dual<
    <A, B, R>(
      self: Call1<F, A>,
      that: Call1<F, B>,
      f: (a: NoInfer<A>, b: NoInfer<B>) => R,
    ) => Call1<F, R>,
    <A, B, R>(
      that: Call1<F, B>,
      f: (a: NoInfer<A>, b: NoInfer<B>) => R,
    ) => (self: Call1<F, A>) => Call1<F, R>
  >;
}

export const deriveZipWith = <F extends HKT<unknown, unknown>>(
  F: PickRaw<MonadZip<F>, "map" | "zip">,
): Dual.First<MonadZip<F>["zipWith"]> =>
  function zipWith(self, that, f) {
    return F.map(F.zip(self, that), ([a, b]) => f(a, b));
  };

// ╔══════╗
// ║ zipL ║
// ╚══════╝
export interface MonadZip<F> {
  /**
   * Combines two container types **independently**, keeping the result of the left container and discarding the right.
   */
  readonly zipL: Dual<
    <A, B>(self: Call1<F, A>, that: Call1<F, B>) => Call1<F, A>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveZipL = <F extends HKT<unknown, unknown>>(
  F: PickRaw<MonadZip<F>, "map" | "zip">,
): Dual.First<MonadZip<F>["zipL"]> =>
  function zipL(self, that) {
    return F.map(F.zip(self, that), ([a]) => a);
  };

// ╔══════╗
// ║ zipR ║
// ╚══════╝
export interface MonadZip<F> {
  /**
   * Combines two container types **independently**, keeping the result of the right container and discarding the left.
   */
  readonly zipR: Dual<
    <A, B>(self: Call1<F, A>, that: Call1<F, B>) => Call1<F, B>,
    <B>(that: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, B>
  >;
}

export const deriveZipR = <F extends HKT<unknown, unknown>>(
  F: PickRaw<MonadZip<F>, "map" | "zip">,
): Dual.First<MonadZip<F>["zipR"]> =>
  function zipR(self, that) {
    return F.map(F.zip(self, that), ([, b]) => b);
  };
