/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @module
 * @private
 * @internal
 */

import type { HKT } from "hkt-core";

import type { Cancelled, Failed, Outcome, Succeeded } from "../Outcome";
import type * as core from "../core/Outcome";

/** @internal */
export const OutcomeProto = /* @__PURE__ */ (() =>
  // HACK: We define `class Outcome {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "Outcome" when logging instances to the console
  Object.defineProperty(
    (
      class Outcome {
        isSucceeded<F extends HKT<unknown, unknown>, E, A>(
          this: core.Outcome<F, E, A>,
        ): this is Succeeded<F, A> {
          return this._tag === "Succeeded";
        }
        isFailed<F extends HKT<unknown, unknown>, E, A>(
          this: core.Outcome<F, E, A>,
        ): this is Failed<E> {
          return this._tag === "Failed";
        }
        isCancelled<F extends HKT<unknown, unknown>, E, A>(
          this: core.Outcome<F, E, A>,
        ): this is Cancelled {
          return this._tag === "Cancelled";
        }

        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        Outcome<HKT<unknown, unknown>, unknown, unknown>,
        keyof core.Outcome<HKT<unknown, unknown>, unknown, unknown> | typeof Symbol.toStringTag
      > as new () => Outcome<HKT<unknown, unknown>, unknown, unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "Outcome",
      writable: true,
      configurable: true,
    },
  ))();
