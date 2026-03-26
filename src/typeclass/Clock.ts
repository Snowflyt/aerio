/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Clock<out F extends HKT<unknown, unknown>> {}

// ╔═══════════╗
// ║ monotonic ║
// ╚═══════════╝
export interface Clock<F> {
  /**
   * Gets the current **monotonic** time in **milliseconds** since an arbitrary fixed point in the past.
   * Unlike {@linkcode realTime}, the value returned by {@linkcode monotonic} is a floating-point number with up to **microsecond** precision.
   *
   * This is useful for measuring elapsed time, as it is not affected by changes to the system clock.
   */
  readonly monotonic: () => Call1<F, number>;
}

// ╔══════════╗
// ║ realTime ║
// ╚══════════╝
export interface Clock<F> {
  /**
   * Gets the current real time in **milliseconds** since the Unix epoch (January 1, 1970, 00:00:00 UTC).
   */
  readonly realTime: () => Call1<F, number>;
}
