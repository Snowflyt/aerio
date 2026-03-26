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

export interface Contravariant<in out F extends HKT<unknown, unknown>> extends Invariant<F> {}

export const deriveImap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Contravariant<F>, "contramap">,
): Dual.First<Invariant<F>["imap"]> =>
  function imap(self, _to, from) {
    return F.contramap(self, from);
  };

// ╔═══════════╗
// ║ contramap ║
// ╚═══════════╝
export interface Contravariant<F> {
  readonly contramap: Dual<
    <A, B>(self: Call1<F, A>, f: (b: NoInfer<B>) => A) => Call1<F, B>,
    <A, B>(f: (b: NoInfer<B>) => A) => (self: Call1<F, A>) => Call1<F, B>
  >;
}
