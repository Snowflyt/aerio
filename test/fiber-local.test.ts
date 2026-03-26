/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { Deferred, Fiber, FiberLocal, IO } from "../src";

import { it } from "./test-utils";

describe("Fiber-local state within a fiber", () => {
  it.gen("remains visible across async boundaries", function* () {
    const local = yield* IO.fiberLocal(0);

    expect(yield* FiberLocal.updateAndGet(local, (n) => n + 1)).toBe(1);
    yield* IO.cede();
    expect(yield* FiberLocal.get(local)).toBe(1);

    expect(yield* FiberLocal.getAndUpdate(local, (n) => n + 1)).toBe(1);
    yield* IO.cede();
    expect(yield* FiberLocal.get(local)).toBe(2);
  });
});

describe("FiberLocal.get and FiberLocal.set", () => {
  it.gen("reads the current value after setting it", function* () {
    const local = yield* IO.fiberLocal(0);

    yield* FiberLocal.set(local, 2);

    expect(yield* FiberLocal.get(local)).toBe(2);
  });
});

describe("FiberLocal.getAndSet", () => {
  it.gen("returns the previous value and stores the new one", function* () {
    const local = yield* IO.fiberLocal(0);
    const previous = yield* FiberLocal.getAndSet(local, 1);

    expect(previous).toBe(0);
    expect(yield* FiberLocal.get(local)).toBe(1);
  });
});

describe("FiberLocal.getAndUpdate", () => {
  it.gen("returns the previous value and stores the updated one", function* () {
    const local = yield* IO.fiberLocal(0);
    const previous = yield* FiberLocal.getAndUpdate(local, (n) => n + 1);

    expect(previous).toBe(0);
    expect(yield* FiberLocal.get(local)).toBe(1);
  });
});

describe("FiberLocal.setAndGet", () => {
  it.gen("returns the stored value", function* () {
    const local = yield* IO.fiberLocal(0);
    const current = yield* FiberLocal.setAndGet(local, 2);

    expect(current).toBe(2);
    expect(yield* FiberLocal.get(local)).toBe(2);
  });
});

describe("FiberLocal.modify", () => {
  it.gen("returns a result and stores the new value", function* () {
    const local = yield* IO.fiberLocal(1);
    const result = yield* FiberLocal.modify(local, (n) => [`before=${n}`, n + 1] as const);

    expect(result).toBe("before=1");
    expect(yield* FiberLocal.get(local)).toBe(2);
  });

  it.gen("routes updater errors through the error channel", function* () {
    const local = yield* IO.fiberLocal(1);
    const error = new Error("boom");

    const result = yield* IO.catch(
      FiberLocal.modify(local, () => {
        throw error;
      }),
      IO.of,
    );

    expect(result).toBe(error);
    expect(yield* FiberLocal.get(local)).toBe(1);
  });
});

describe("FiberLocal.update and FiberLocal.updateAndGet", () => {
  it.gen("applies pure updates", function* () {
    const local = yield* IO.fiberLocal(1);

    yield* FiberLocal.update(local, (n) => n + 1);
    expect(yield* FiberLocal.get(local)).toBe(2);

    const current = yield* FiberLocal.updateAndGet(local, (n) => n * 10);

    expect(current).toBe(20);
    expect(yield* FiberLocal.get(local)).toBe(20);
  });
});

describe("Fiber-local inheritance and isolation", () => {
  it.gen("fork inherits a snapshot and child updates do not merge back", function* () {
    const local = yield* IO.fiberLocal(0);
    const ready = yield* IO.deferred<void>();
    const release = yield* IO.deferred<void>();

    yield* FiberLocal.set(local, 1);

    const fiber = yield* IO.gen(function* () {
      yield* Deferred.complete(ready, void 0);
      yield* Deferred.get(release);

      const inherited = yield* FiberLocal.get(local);
      yield* FiberLocal.set(local, 3);
      const updated = yield* FiberLocal.get(local);

      return [inherited, updated] as const;
    }).pipe(IO.fork);

    yield* Deferred.get(ready);
    yield* FiberLocal.set(local, 2);
    yield* Deferred.complete(release, void 0);

    expect(yield* Fiber.join(fiber)).toEqual([1, 3]);
    expect(yield* FiberLocal.get(local)).toBe(2);
  });

  it.gen("forkGlobal inherits a snapshot and remains isolated", function* () {
    const local = yield* IO.fiberLocal("root");
    const ready = yield* IO.deferred<void>();
    const release = yield* IO.deferred<void>();

    yield* FiberLocal.set(local, "parent");

    const fiber = yield* IO.gen(function* () {
      yield* Deferred.complete(ready, void 0);
      yield* Deferred.get(release);
      return yield* FiberLocal.get(local);
    }).pipe(IO.forkGlobal);

    yield* Deferred.get(ready);
    yield* FiberLocal.set(local, "updated");
    yield* Deferred.complete(release, void 0);

    expect(yield* Fiber.join(fiber)).toBe("parent");
    expect(yield* FiberLocal.get(local)).toBe("updated");
  });

  it.gen("each sibling inherits the same snapshot and remains isolated", function* () {
    const local = yield* IO.fiberLocal(0);
    const start = yield* IO.deferred<void>();
    const release = yield* IO.deferred<void>();

    yield* FiberLocal.set(local, 1);

    const left = yield* IO.gen(function* () {
      yield* Deferred.get(start);
      const inherited = yield* FiberLocal.get(local);
      yield* FiberLocal.set(local, 10);
      yield* Deferred.get(release);
      return [inherited, yield* FiberLocal.get(local)] as const;
    }).pipe(IO.fork);

    const right = yield* IO.gen(function* () {
      yield* Deferred.get(start);
      const inherited = yield* FiberLocal.get(local);
      yield* FiberLocal.set(local, 20);
      yield* Deferred.get(release);
      return [inherited, yield* FiberLocal.get(local)] as const;
    }).pipe(IO.fork);

    yield* Deferred.complete(start, void 0);
    yield* Deferred.complete(release, void 0);

    expect(yield* Fiber.join(left)).toEqual([1, 10]);
    expect(yield* Fiber.join(right)).toEqual([1, 20]);
    expect(yield* FiberLocal.get(local)).toBe(1);
  });
});

describe("FiberLocal.imap", () => {
  it.gen("exposes a reversible view of the same local", function* () {
    const local = yield* IO.fiberLocal(41);
    const text = FiberLocal.imap(local, String, Number);

    expect(yield* FiberLocal.get(text)).toBe("41");
    expect(yield* text.pipe(FiberLocal.getAndSet("42"))).toBe("41");
    expect(yield* FiberLocal.get(local)).toBe(42);

    expect(yield* FiberLocal.getAndSet(text, "43")).toBe("42");
    expect(yield* FiberLocal.get(local)).toBe(43);

    expect(yield* FiberLocal.updateAndGet(text, (n) => String(Number(n) + 1))).toBe("44");
    expect(yield* FiberLocal.get(local)).toBe(44);

    expect(yield* FiberLocal.setAndGet(local, 45)).toBe(45);
    expect(yield* FiberLocal.get(text)).toBe("45");
  });
});
