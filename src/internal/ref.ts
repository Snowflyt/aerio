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

import type { Ref } from "../Ref";
import type * as core from "../core/Ref";

/** @internal */
export const RefProto = /* @__PURE__ */ (() =>
  // HACK: We define `class Ref {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "Ref" when logging instances to the console
  Object.defineProperty(
    (
      class Ref {
        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        Ref<HKT<unknown, unknown>, unknown>,
        keyof core.Ref<HKT<unknown, unknown>, unknown> | typeof Symbol.toStringTag
      > as new () => Ref<HKT<unknown, unknown>, unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "Ref",
      writable: true,
      configurable: true,
    },
  ))();
