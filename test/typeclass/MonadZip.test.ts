/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, unsafeRunSync } from "../test-utils/mini-effect";

describe("zipWith", () => {
  it("combines both values with the given function", () => {
    expect(unsafeRunSync(Mini.zipWith(Mini.of(20), Mini.of(22), (a, b) => a + b))).toBe(42);
  });
});

describe("zipL", () => {
  it("keeps the left value", () => {
    expect(unsafeRunSync(Mini.zipL(Mini.of("left"), Mini.of("right")))).toBe("left");
  });
});

describe("zipR", () => {
  it("keeps the right value", () => {
    expect(unsafeRunSync(Mini.zipR(Mini.of("left"), Mini.of("right")))).toBe("right");
  });
});
