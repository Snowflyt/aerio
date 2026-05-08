/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, unsafeRunSync } from "../test-utils/mini-effect";

describe("imap", () => {
  it("maps the value with the to function", () => {
    expect(unsafeRunSync(Mini.imap(Mini.of(42), String, Number))).toBe("42");
  });
});

describe("tap", () => {
  it("runs the side effect and preserves the original value", () => {
    let seen: number | null = null;

    expect(
      unsafeRunSync(
        Mini.tap(Mini.of(42), (a) => {
          seen = a;
        }),
      ),
    ).toBe(42);
    expect(seen).toBe(42);
  });
});

describe("as", () => {
  it("replaces the value with the given constant", () => {
    expect(unsafeRunSync(Mini.as(Mini.of(1), "replaced"))).toBe("replaced");
  });
});

describe("asVoid", () => {
  it("discards the value", () => {
    expect(unsafeRunSync(Mini.asVoid(Mini.of(1)))).toBeUndefined();
  });
});
