/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Invariant<in out F extends HKT<unknown, unknown>> {}

// ╔══════╗
// ║ imap ║
// ╚══════╝
export interface Invariant<F> {
  /**
   * Transforms the value inside the context of the container type using a pair of functions: one to transform the value from type `A` to type `B`, and another to transform it back from type `B` to type `A`.
   * This is useful for types that are invariant, meaning they cannot be safely transformed in one direction without also providing a way to transform back.
   */
  readonly imap: Dual<
    <A, B>(self: Call1<F, A>, to: (a: NoInfer<A>) => B, from: (b: NoInfer<B>) => A) => Call1<F, B>,
    <A, B>(
      to: (a: NoInfer<A>) => B,
      from: (b: NoInfer<B>) => A,
    ) => (self: Call1<F, A>) => Call1<F, B>
  >;
}
