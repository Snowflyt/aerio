/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { IO, TestControl } from "../src";
import { CancellationError } from "../src/errors";

import { it } from "./test-utils";

describe("IO.sleep", () => {
  it.gen("waits until the configured interval elapses", function* () {
    const control = yield* TestControl.execute(IO.sleep(10).pipe(IO.as("done")));

    yield* control.tick();

    expect(yield* control.result).toBeNull();
    expect(yield* control.nextInterval).toBe(10);

    yield* control.advance(10);
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "done" });
  });

  it("can be cancelled before the timer elapses", async () => {
    let resumed = false;

    const run = IO.unsafeRunPromiseCancellable(
      IO.sleep(200).pipe(
        IO.flatMap(() =>
          IO.sync(() => {
            resumed = true;
          }),
        ),
      ),
    );

    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await run.cancel();
    await rejection;

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(resumed).toBe(false);
  });
});

describe("IO.monotonic", () => {
  it.gen("reports the virtual monotonic clock managed by TestControl", function* () {
    const control = yield* TestControl.execute(
      IO.gen(function* () {
        const start = yield* IO.monotonic();
        yield* IO.sleep(10);
        const end = yield* IO.monotonic();
        return [start, end] as const;
      }),
    );

    yield* control.tick();
    yield* control.advance(10);
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [0, 10] });
  });
});

describe("IO.realTime", () => {
  it.gen("reports the virtual real-time clock managed by TestControl", function* () {
    const control = yield* TestControl.execute(
      IO.gen(function* () {
        const start = yield* IO.realTime();
        yield* IO.sleep(10);
        const end = yield* IO.realTime();
        return [start, end] as const;
      }),
      { realTime: 1_000 },
    );

    yield* control.tick();
    yield* control.advance(10);
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [1_000, 1_010] });
  });
});

describe("IO.delay", () => {
  it.gen("delays an existing computation by the configured interval", function* () {
    const control = yield* TestControl.execute(IO.of("ok").pipe(IO.delay(15)));

    yield* control.tick();

    expect(yield* control.result).toBeNull();
    expect(yield* control.nextInterval).toBe(15);

    yield* control.advance(15);
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "ok" });
  });
});
