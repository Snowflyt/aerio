/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniRef, ref, unsafeRunSync } from "../mini-effect";

describe("productL", () => {
  it("keeps the left value and still runs the right effect", () => {
    const rightRan = ref(false);

    expect(unsafeRunSync(Mini.productL(Mini.of(42), MiniRef.set(rightRan, true)))).toBe(42);
    expect(unsafeRunSync(MiniRef.get(rightRan))).toBe(true);
  });
});
