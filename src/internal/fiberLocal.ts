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

import type { FiberLocal } from "../FiberLocal";
import type * as core from "../core/FiberLocal";

/** @internal */
export const FiberLocalProto = /* @__PURE__ */ (() =>
  // HACK: We define `class FiberLocal {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "FiberLocal" when logging instances to the console
  Object.defineProperty(
    (
      class FiberLocal {
        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        FiberLocal<HKT<unknown, unknown>, unknown>,
        keyof core.FiberLocal<HKT<unknown, unknown>, unknown> | typeof Symbol.toStringTag
      > as new () => FiberLocal<HKT<unknown, unknown>, unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "FiberLocal",
      writable: true,
      configurable: true,
    },
  ))();
