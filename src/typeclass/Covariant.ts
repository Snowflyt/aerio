/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Invariant } from "./Invariant";

export interface Covariant<in out F extends HKT<unknown, unknown>> extends Invariant<F> {}

export const deriveImap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Dual.First<Invariant<F>["imap"]> =>
  function imap(self, to, _from) {
    return F.map(self, to);
  };

// ╔═════╗
// ║ map ║
// ╚═════╝
export interface Covariant<F> {
  /**
   * Transforms the value inside the context of the container type using a function.
   */
  readonly map: Dual<
    <A, B>(self: Call1<F, A>, f: (a: NoInfer<A>) => B) => Call1<F, B>,
    <A, B>(f: (a: NoInfer<A>) => B) => (self: Call1<F, A>) => Call1<F, B>
  >;
}

// ╔═════╗
// ║ tap ║
// ╚═════╝
export interface Covariant<F> {
  /**
   * Performs an effectful operation using the value inside the context of the container type, without modifying the value itself.
   * This is useful for performing side effects or logging while keeping the original value intact.
   */
  readonly tap: Dual<
    <A>(self: Call1<F, A>, f: (a: NoInfer<A>) => void) => Call1<F, A>,
    <A>(f: (a: NoInfer<A>) => void) => (self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveTap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Dual.First<Covariant<F>["tap"]> =>
  function tap(self, f) {
    return F.map(self, (a) => {
      f(a);
      return a;
    });
  };

// ╔════╗
// ║ as ║
// ╚════╝
export interface Covariant<F> {
  /**
   * Replaces the value inside the context of the container type with a constant value, while keeping the structure of the container intact.
   * This is useful for ignoring the original value and substituting it with a new value.
   */
  readonly as: Dual<
    <A, B>(self: Call1<F, A>, that: B) => Call1<F, B>,
    <B>(that: B) => <A>(self: Call1<F, A>) => Call1<F, B>
  >;
}

export const deriveAs = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "map">,
): Dual.First<Covariant<F>["as"]> =>
  function as(self, that) {
    return F.map(self, () => that);
  };

// ╔════════╗
// ║ asVoid ║
// ╚════════╝
export interface Covariant<F> {
  /**
   * Replaces the value inside the context of the container type with `void`, while keeping the structure of the container intact.
   * This is useful for ignoring the original value and substituting it with `void`.
   */
  readonly asVoid: <A>(self: Call1<F, A>) => Call1<F, void>;
}

export const deriveAsVoid = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Covariant<F>, "as">,
): Covariant<F>["asVoid"] =>
  function asVoid(self) {
    return F.as(self, void 0);
  };
