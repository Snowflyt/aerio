/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { PickRaw } from "../utils";

import type { Apply } from "./Apply";
import type { Of } from "./Of";

export interface Applicative<F extends HKT<unknown, unknown>> extends Apply<F>, Of<F> {}

// ╔══════╗
// ║ when ║
// ╚══════╝
export interface Applicative<F> {
  /**
   * Returns the original container if `cond` is `true`, otherwise returns `undefined` lifted into the context of the container type.
   */
  readonly when: (cond: boolean, then: Call1<F, void>) => Call1<F, void>;
}

export const deriveWhen = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Applicative<F>, "void">,
): Applicative<F>["when"] =>
  function when(cond, then) {
    return cond ? then : F.void();
  };

// ╔════════╗
// ║ unless ║
// ╚════════╝
export interface Applicative<F> {
  /**
   * Returns the original container if `cond` is `false`, otherwise returns `undefined` lifted into the context of the container type.
   */
  readonly unless: (cond: boolean, then: Call1<F, void>) => Call1<F, void>;
}

export const deriveUnless = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Applicative<F>, "void">,
): Applicative<F>["unless"] =>
  function unless(cond, then) {
    return cond ? F.void() : then;
  };
