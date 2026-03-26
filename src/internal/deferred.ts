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

import type { Deferred } from "../Deferred";
import type * as core from "../core/Deferred";

/** @internal */
export const DeferredProto = /* @__PURE__ */ (() =>
  // HACK: We define `class Deferred {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "Deferred" when logging instances to the console
  Object.defineProperty(
    (
      class Deferred {
        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        Deferred<HKT<unknown, unknown>, unknown>,
        keyof core.Deferred<HKT<unknown, unknown>, unknown> | typeof Symbol.toStringTag
      > as new () => Deferred<HKT<unknown, unknown>, unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "Deferred",
      writable: true,
      configurable: true,
    },
  ))();
