/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { IO } from "../src";

import { it } from "./test-utils";

describe("IO.when", () => {
  it.gen("runs the action when the condition is true", function* () {
    let calls = 0;

    yield* IO.when(
      true,
      IO.sync(() => {
        calls += 1;
      }),
    );

    expect(calls).toBe(1);
  });

  it.gen("skips the action when the condition is false", function* () {
    let calls = 0;

    yield* IO.when(
      false,
      IO.sync(() => {
        calls += 1;
      }),
    );

    expect(calls).toBe(0);
  });
});

describe("IO.unless", () => {
  it.gen("runs the action when the condition is false", function* () {
    let calls = 0;

    yield* IO.unless(
      false,
      IO.sync(() => {
        calls += 1;
      }),
    );

    expect(calls).toBe(1);
  });

  it.gen("skips the action when the condition is true", function* () {
    let calls = 0;

    yield* IO.unless(
      true,
      IO.sync(() => {
        calls += 1;
      }),
    );

    expect(calls).toBe(0);
  });
});

describe("IO.throwWhen", () => {
  it.gen("fails when the condition is true", function* () {
    const result = yield* IO.catch(IO.throwWhen(true, "boom"), IO.of);

    expect(result).toBe("boom");
  });

  it.gen("succeeds when the condition is false", function* () {
    expect(yield* IO.throwWhen(false, "boom")).toBeUndefined();
  });
});

describe("IO.throwUnless", () => {
  it.gen("fails when the condition is false", function* () {
    const result = yield* IO.catch(IO.throwUnless(false, "boom"), IO.of);

    expect(result).toBe("boom");
  });

  it.gen("succeeds when the condition is true", function* () {
    expect(yield* IO.throwUnless(true, "boom")).toBeUndefined();
  });
});
