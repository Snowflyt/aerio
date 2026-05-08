/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniRef, ref, unsafeRunSync } from "../test-utils/mini-effect";

describe("when", () => {
  it("runs the effect when the condition is true", () => {
    const ran = ref(false);

    unsafeRunSync(Mini.when(true, MiniRef.set(ran, true)));
    expect(unsafeRunSync(MiniRef.get(ran))).toBe(true);
  });

  it("skips the effect when the condition is false", () => {
    const ran = ref(false);

    unsafeRunSync(Mini.when(false, MiniRef.set(ran, true)));
    expect(unsafeRunSync(MiniRef.get(ran))).toBe(false);
  });
});

describe("unless", () => {
  it("skips the effect when the condition is true", () => {
    const ran = ref(false);

    unsafeRunSync(Mini.unless(true, MiniRef.set(ran, true)));
    expect(unsafeRunSync(MiniRef.get(ran))).toBe(false);
  });

  it("runs the effect when the condition is false", () => {
    const ran = ref(false);

    unsafeRunSync(Mini.unless(false, MiniRef.set(ran, true)));
    expect(unsafeRunSync(MiniRef.get(ran))).toBe(true);
  });
});
