/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from "vitest";

import { Mini, MiniOutcome, runSync, unsafeRunSync } from "../test-utils/mini-effect";

describe("ignore", () => {
  it("discards a successful value", () => {
    expect(unsafeRunSync(Mini.ignore(Mini.of(42)))).toBeUndefined();
  });

  it("swallows a failure and succeeds with void", () => {
    expect(unsafeRunSync(Mini.ignore(Mini.throw("boom")))).toBeUndefined();
  });
});

describe("throwWhen", () => {
  it("fails when the condition is true", () => {
    expect(runSync(Mini.throwWhen(true, "boom"))).toEqual(MiniOutcome.Failed("boom"));
  });

  it("succeeds with void when the condition is false", () => {
    expect(unsafeRunSync(Mini.throwWhen(false, "boom"))).toBeUndefined();
  });
});

describe("throwUnless", () => {
  it("succeeds with void when the condition is true", () => {
    expect(unsafeRunSync(Mini.throwUnless(true, "boom"))).toBeUndefined();
  });

  it("fails when the condition is false", () => {
    expect(runSync(Mini.throwUnless(false, "boom"))).toEqual(MiniOutcome.Failed("boom"));
  });
});
