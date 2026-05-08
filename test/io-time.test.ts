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
import { js, runNode6, runQuickJS } from "./test-utils/compat";

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

  it("can be cancelled after timer registration in node 6", async () => {
    const { probe, stdout } = await runNode6(
      js`
        const { IO } = require("aerio");

        let resumed = false;
        let errorName = "";

        const run = IO.unsafeRunPromiseCancellable(
          IO.sleep(200).pipe(
            IO.flatMap(function() {
              return IO.sync(function() {
                resumed = true;
              });
            }),
          ),
        );

        run.promise.then(
          function() {},
          function(error) {
            errorName =
              error && typeof error === "object" && "name" in error ? String(error.name) : String(error);
          },
        );

        setTimeout(function() {
          run.cancel().catch(function(error) {
            console.error(error && error.stack ? error.stack : String(error));
            process.exitCode = 1;
          });
        }, 20);

        setTimeout(function() {
          console.log(JSON.stringify({ errorName: errorName, resumed: resumed }));
        }, 250);
      `,
    );

    const result = JSON.parse(stdout.trim()) as {
      errorName: string;
      resumed: boolean;
    };

    expect(probe.observedVersion).toMatch(/^v6\./);
    expect(result.errorName).toBe("CancellationError");
    expect(result.resumed).toBe(false);
  }, 300_000);

  it("can be cancelled after timer registration in QuickJS runtimes", async () => {
    for (const { result } of await runQuickJS<{
      errorName: string;
      resumed: boolean;
    }>(
      js`
        import { IO } from "aerio/index.js";

        const osModule = await import("qjs:os").catch(() => import("os"));
        if (!osModule || typeof osModule.setTimeout !== "function") {
          throw new Error("QuickJS host timer is unavailable");
        }

        let resumed = false;

        const { promise, cancel } = IO.unsafeRunPromiseCancellable(
          IO.sleep(500).pipe(
            IO.flatMap(() =>
              IO.sync(() => {
                resumed = true;
              }),
            ),
          ),
        );

        const observed = promise.then(
          () => ({ errorName: "", resumed }),
          (error) => ({
            errorName:
              error && typeof error === "object" && "name" in error ? String(error.name) : String(error),
            resumed,
          }),
        );

        await new Promise((resolve) => osModule.setTimeout(resolve, 100));
        await cancel();

        const outcome = await observed;

        await new Promise((resolve) => osModule.setTimeout(resolve, 550));

        __compat.setResult({
          errorName: outcome.errorName,
          resumed,
        });
      `,
    )) {
      expect(result!.errorName).toBe("CancellationError");
      expect(result!.resumed).toBe(false);
    }
  }, 300_000);

  it("uses the runtime timer implementation for node 6", async () => {
    const { probe, stdout } = await runNode6(
      js`
        const { IO } = require("aerio");

        const start = Date.now();

        IO.unsafeRun(
          IO.sleep(120).pipe(
            IO.flatMap(function() {
              return IO.println(JSON.stringify({ elapsed: Date.now() - start }));
            }),
          ),
        );
      `,
    );

    const result = JSON.parse(stdout.trim()) as {
      elapsed: number;
    };

    expect(probe.observedVersion).toMatch(/^v6\./);
    expect(result.elapsed).toBeGreaterThanOrEqual(80);
    expect(result.elapsed).toBeLessThan(1_000);
  }, 300_000);

  it("uses the runtime timer implementation for QuickJS", async () => {
    for (const { result } of await runQuickJS<{
      elapsed: number;
    }>(
      js`
        import { IO } from "aerio/index.js";

        const start = Date.now();

        await IO.unsafeRunPromise(IO.sleep(500));

        __compat.setResult({
          elapsed: Date.now() - start,
        });
      `,
    )) {
      expect(result!.elapsed).toBeGreaterThanOrEqual(350);
      expect(result!.elapsed).toBeLessThan(950);
    }
  }, 300_000);
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
