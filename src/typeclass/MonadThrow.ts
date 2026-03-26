/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { HKT } from "hkt-core";

import type { ApplicativeThrow } from "./ApplicativeThrow";
import type { Monad } from "./Monad";

export interface MonadThrow<in out F extends HKT<unknown, unknown>, in out Err>
  extends ApplicativeThrow<F, Err>, Monad<F> {}
