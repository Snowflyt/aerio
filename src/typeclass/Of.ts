/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { PickRaw } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Of<out F extends HKT<unknown, unknown>> {}

// ╔════╗
// ║ of ║
// ╚════╝
export interface Of<F> {
  /**
   * Lifts a value into the context of the container type.
   */
  readonly of: <A>(a: A) => Call1<F, A>;
}

// ╔══════╗
// ║ void ║
// ╚══════╝
export interface Of<F> {
  /**
   * Lifts `undefined` into the context of the container type.
   */
  readonly void: () => Call1<F, void>;
}

export const deriveVoid = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Of<F>, "of">,
): Of<F>["void"] =>
  function void_() {
    return F.of(void 0);
  };
