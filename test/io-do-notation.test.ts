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

describe("IO.do", () => {
  it.gen("threads context through a sequence of do-notation steps", function* () {
    const result = yield* IO.do(
      IO.bindV("left", IO.of("a")),
      IO.bind("right", ({ left }) => IO.of(left + "b")),
      IO.return(({ left, right }) => left + right),
    );

    expect(result).toBe("aab");
  });
});

describe("IO.let and IO.letV", () => {
  it.gen("add derived and constant fields to the current context", function* () {
    const result = yield* IO.do(
      IO.letV("a", 1),
      IO.let("b", ({ a }) => a + 1),
      IO.return(({ a, b }) => a + b),
    );

    expect(result).toBe(3);
  });
});

describe("IO.bind and IO.bindV", () => {
  it.gen("store effectful fields in the current context", function* () {
    const result = yield* IO.do(
      IO.bindV("left", IO.of("a")),
      IO.bind("right", ({ left }) => IO.of(left + "b")),
      IO.return(({ left, right }) => `${left}:${right}`),
    );

    expect(result).toBe("a:ab");
  });
});

describe("IO.also and IO.alsoV", () => {
  it.gen("run additional effects and preserve the original context", function* () {
    const events: string[] = [];

    const result = yield* IO.do(
      IO.letV("value", 1),
      IO.also(({ value }) =>
        IO.sync(() => {
          events.push(`also:${value}`);
        }),
      ),
      IO.alsoV(
        IO.sync(() => {
          events.push("alsoV");
        }),
      ),
      IO.return(({ value }) => value),
    );

    expect(result).toBe(1);
    expect(events).toEqual(["also:1", "alsoV"]);
  });
});

describe("IO.return and IO.returnM", () => {
  it.gen("project pure and effectful final values from the context", function* () {
    const pure = yield* IO.do(
      IO.letV("a", 1),
      IO.bindV("b", IO.of(2)),
      IO.return(({ a, b }) => a + b),
    );

    const effectful = yield* IO.do(
      IO.letV("a", 1),
      IO.bindV("b", IO.of(2)),
      IO.returnM(({ a, b }) => IO.of(a * b)),
    );

    expect(pure).toBe(3);
    expect(effectful).toBe(2);
  });
});
