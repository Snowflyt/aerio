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

import type { IO } from "../IO";
import type * as core from "../core/IO";

/** @internal */
export const IOProto = /* @__PURE__ */ (() =>
  // HACK: We define `class IO {}` instead of using object literal here to derive sure
  //       Node.js displays the class name "IO" when logging instances to the console
  Object.defineProperty(
    (
      class IO {
        [Symbol.iterator](
          this: import("../IO").IO<unknown>,
        ): Iterator<import("../IO").IO<unknown>, unknown, unknown> {
          let called = false;
          return {
            next: (value) =>
              called ? { done: true, value } : ((called = true), { done: false, value: this }),
          };
        }

        pipe() {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          let out = this;
          // eslint-disable-next-line prefer-rest-params
          for (let i = 0, len = arguments.length; i < len; i++) out = arguments[i](out);
          return out;
        }
      } satisfies new () => Omit<
        IO<unknown>,
        keyof core.IO<unknown> | typeof Symbol.toStringTag
      > as new () => IO<unknown>
    ).prototype,
    Symbol.toStringTag,
    {
      value: "IO",
      writable: true,
      configurable: true,
    },
  ))();
