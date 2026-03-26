/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { IO, Ref } from "../src";

import { it } from "./test-utils";

describe("Ref.get", () => {
  it.gen("reads the current value", function* () {
    const ref = yield* IO.ref(1);

    expect(yield* ref.pipe(Ref.get)).toBe(1);
  });
});

describe("Ref.getAndSet", () => {
  it.gen("returns the previous value and stores the new one", function* () {
    const ref = yield* IO.ref(0);
    const previous = yield* ref.pipe(Ref.getAndSet(1));

    expect(previous).toBe(0);
    expect(yield* ref.pipe(Ref.get)).toBe(1);
  });
});

describe("Ref.getAndUpdate", () => {
  it.gen("returns the previous value and stores the updated one", function* () {
    const ref = yield* IO.ref(0);
    const previous = yield* ref.pipe(Ref.getAndUpdate((n) => n + 1));

    expect(previous).toBe(0);
    expect(yield* ref.pipe(Ref.get)).toBe(1);
  });
});

describe("Ref.set", () => {
  it.gen("stores the new value", function* () {
    const ref = yield* IO.ref(0);

    yield* ref.pipe(Ref.set(2));

    expect(yield* ref.pipe(Ref.get)).toBe(2);
  });
});

describe("Ref.setAndGet", () => {
  it.gen("returns the stored value", function* () {
    const ref = yield* IO.ref(0);
    const current = yield* ref.pipe(Ref.setAndGet(2));

    expect(current).toBe(2);
    expect(yield* ref.pipe(Ref.get)).toBe(2);
  });
});

describe("Ref.modify", () => {
  it.gen("returns a result and stores the new value", function* () {
    const ref = yield* IO.ref(1);
    const result = yield* ref.pipe(Ref.modify((n) => [`before=${n}`, n + 1] as const));

    expect(result).toBe("before=1");
    expect(yield* ref.pipe(Ref.get)).toBe(2);
  });
});

describe("Ref.update and Ref.updateAndGet", () => {
  it.gen("applies pure updates", function* () {
    const ref = yield* IO.ref(1);

    yield* ref.pipe(Ref.update((n) => n + 1));
    expect(yield* ref.pipe(Ref.get)).toBe(2);

    const current = yield* ref.pipe(Ref.updateAndGet((n) => n * 10));

    expect(current).toBe(20);
    expect(yield* ref.pipe(Ref.get)).toBe(20);
  });
});

describe("Ref.imap", () => {
  it.gen("maps reads and writes through pure conversions", function* () {
    const ref = yield* IO.ref({ count: 1 });
    const countRef = ref.pipe(
      Ref.imap(
        (state) => state.count,
        (count) => ({ count }),
      ),
    );

    expect(yield* countRef.pipe(Ref.get)).toBe(1);
    expect(yield* countRef.pipe(Ref.getAndUpdate((n) => n + 1))).toBe(1);
    expect(yield* ref.pipe(Ref.get)).toEqual({ count: 2 });
  });
});
