/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Covariant } from "./Covariant";
import type { Do } from "./Do";
import type { FlatMap } from "./FlatMap";
import type { Of } from "./Of";

export interface Monad<in out F extends HKT<unknown, unknown>> extends FlatMap<F>, Do<F>, Of<F> {}

export const deriveMap = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Monad<F>, "of" | "flatMap">,
): Dual.First<Covariant<F>["map"]> =>
  function map(self, f) {
    return F.flatMap(self, (a) => F.of(f(a)));
  };
