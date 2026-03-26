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

import type { Schedule } from "../Schedule";
import type * as core from "../core/Schedule";

/** @internal */
export const ScheduleProto = /* @__PURE__ */ (() =>
  // HACK: We define `class Schedule {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "Schedule" when logging instances to the console
  Object.defineProperty(
    (
      class Schedule extends Function {
        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        Schedule,
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        keyof core.Schedule | typeof Symbol.toStringTag
      > as new () => Schedule
    ).prototype,
    Symbol.toStringTag,
    {
      value: "Schedule",
      writable: true,
      configurable: true,
    },
  ))();
