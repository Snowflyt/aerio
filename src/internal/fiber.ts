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

import type { Fiber } from "../Fiber";
import type * as core from "../core/Fiber";

/** @internal */
export const FiberProto = /* @__PURE__ */ (() =>
  // HACK: We define `class Fiber {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "Fiber" when logging instances to the console
  Object.defineProperty(
    (
      class Fiber {
        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        Fiber<HKT<unknown, unknown>, unknown, unknown>,
        keyof core.Fiber<HKT<unknown, unknown>, unknown, unknown> | typeof Symbol.toStringTag
      > as new () => Fiber<HKT<unknown, unknown>, unknown, unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "Fiber",
      writable: true,
      configurable: true,
    },
  ))();
