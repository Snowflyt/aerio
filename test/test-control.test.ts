/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, expect } from "vitest";

import { IO, TestControl } from "../src";
import { NonTerminationError } from "../src/errors";

import { it } from "./test-utils";

describe("Manual stepping", () => {
  it.gen("does not run the program before tick", function* () {
    const control = yield* TestControl.execute(IO.of(42));

    expect(yield* control.result).toBeNull();
    expect(yield* control.isDeadlocked).toBe(false);

    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 42 });
  });

  it.gen("tick drains ready work at the current virtual time", function* () {
    const control = yield* TestControl.execute(IO.cede().pipe(IO.as("done")));

    expect(yield* control.result).toBeNull();

    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "done" });
  });

  it.gen("advance only makes due timers ready after tick sequences sleep", function* () {
    const control = yield* TestControl.execute(IO.sleep(10).pipe(IO.as("done")));

    expect(yield* control.nextInterval).toBe(0);

    yield* control.tick();

    expect(yield* control.result).toBeNull();
    expect(yield* control.nextInterval).toBe(10);

    yield* control.advance(10);

    expect(yield* control.monotonic).toBe(10);
    expect(yield* control.realTime).toBe(10);
    expect(yield* control.result).toBeNull();

    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "done" });
  });

  it.gen("nextInterval returns zero when work is ready or the runtime is deadlocked", function* () {
    const control = yield* TestControl.execute(IO.never());

    expect(yield* control.nextInterval).toBe(0);

    yield* control.tick();

    expect(yield* control.result).toBeNull();
    expect(yield* control.isDeadlocked).toBe(true);
    expect(yield* control.nextInterval).toBe(0);
  });

  it.gen("advanceToNext lets the caller drive timer boundaries explicitly", function* () {
    const control = yield* TestControl.execute(
      IO.gen(function* () {
        yield* IO.sleep(10);
        const first = yield* IO.monotonic();
        yield* IO.sleep(5);
        const second = yield* IO.realTime();
        return [first, second] as const;
      }),
      { realTime: 1000 },
    );

    yield* control.tick();

    expect(yield* control.advanceToNext()).toBe(10);
    expect(yield* control.monotonic).toBe(10);
    expect(yield* control.realTime).toBe(1010);
    expect(yield* control.result).toBeNull();

    yield* control.tick();

    expect(yield* control.nextInterval).toBe(5);
    expect(yield* control.advanceToNext()).toBe(5);

    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [10, 1015] });
  });

  it.gen("tickOne executes one scheduler turn at a time", function* () {
    const control = yield* TestControl.execute(
      IO.cede().pipe(IO.andThen(IO.cede()), IO.as("done")),
    );

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toBeNull();

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toBeNull();

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: "done" });

    expect(yield* control.tickOne()).toBe(false);
  });

  it.gen("tickOne does not drain auto-yielded work after a macrotask", function* () {
    const control = yield* TestControl.execute(
      IO.cede().pipe(IO.andThen(IO.of(1).pipe(IO.map((n) => n + 1)))),
      {
        maxOpCountBeforeAutoYield: 1,
      },
    );

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toBeNull();

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toBeNull();

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toBeNull();

    expect(yield* control.tickOne()).toBe(true);
    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 2 });
  });

  it.gen("orders new timers past cancelled ones", function* () {
    const log: string[] = [];
    const at = (label: string) =>
      IO.monotonic().pipe(IO.flatMap((t) => IO.sync(() => void log.push(`${label}@${t}`))));

    yield* TestControl.executeEmbed(
      IO.all([
        IO.sleep(500).pipe(IO.timeout(100), IO.ignore),
        IO.sleep(300).pipe(IO.andThen(at("a"))),
        IO.sleep(600).pipe(IO.andThen(at("b"))),
        IO.sleep(200).pipe(IO.andThen(IO.sleep(1_000)), IO.andThen(at("c"))),
      ]),
    );

    expect(log).toEqual(["a@300", "b@600", "c@1200"]);
  });
});

describe("Scheduler randomness", () => {
  it.gen("makes progress on auto-yielded work and a ceded peer", function* () {
    for (const seed of [1, 2, 3]) {
      let steps = 0;
      let peerProgress = -1;
      const loop = (): IO<number> =>
        steps === 5000 ?
          IO.of(steps)
        : IO.sync(() => {
            steps++;
          }).pipe(IO.flatMap(loop));
      const hot = IO.suspend(loop);
      const peer = IO.cede().pipe(
        IO.zipR(
          IO.sync(() => {
            peerProgress = steps;
            return "peer";
          }),
        ),
      );
      const control = yield* TestControl.execute(IO.all([hot, peer]), {
        seed,
        maxOpCountBeforeAutoYield: 32,
      });

      yield* control.tick();

      expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [5000, "peer"] });
      expect(peerProgress).toBeGreaterThanOrEqual(0);
      expect(peerProgress).toBeLessThan(5000);
      expect(yield* control.monotonic).toBe(0);
    }
  });

  it.gen("seed reproduces randomized runnable-fiber selection", function* () {
    const program = IO.race([
      IO.cede().pipe(IO.andThen(IO.of("left"))),
      IO.cede().pipe(IO.andThen(IO.of("right"))),
    ]);

    const first = yield* TestControl.executeEmbed(program, { seed: 1 });
    const second = yield* TestControl.executeEmbed(program, { seed: 1 });
    const observed = new Set<string>();

    observed.add(first);
    observed.add(second);

    for (const seed of [2, 3, 4, 5, 6, 7, 8]) {
      observed.add(yield* TestControl.executeEmbed(program, { seed }));
    }

    expect(first).toBe(second);
    expect(observed.size).toBeGreaterThan(1);
  });

  it.gen("execute exposes the normalized scheduler seed", function* () {
    const seeded = yield* TestControl.execute(IO.of(42), { seed: -1 });
    const generated = yield* TestControl.execute(IO.of(42));

    expect(seeded.seed).toBe(0xffffffff);
    expect(Number.isInteger(generated.seed)).toBe(true);
    expect(generated.seed).toBeGreaterThanOrEqual(0);
    expect(generated.seed).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("Whole-run helpers", () => {
  it.gen("tickAll stops at deadlock and cancel can resume progress", function* () {
    const control = yield* TestControl.execute(IO.never());

    yield* control.tickAll();

    expect(yield* control.result).toBeNull();
    expect(yield* control.isDeadlocked).toBe(true);

    yield* control.cancel();
    yield* control.tick();

    expect(yield* control.result).toMatchObject({ _tag: "Cancelled" });
  });

  it.gen("tickAll advances virtual time until completion", function* () {
    const control = yield* TestControl.execute(
      IO.gen(function* () {
        yield* IO.sleep(10);
        const first = yield* IO.monotonic();
        yield* IO.sleep(5);
        const second = yield* IO.realTime();
        return [first, second] as const;
      }),
      { realTime: 1000 },
    );

    yield* control.tickAll();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [10, 1015] });
  });

  it.gen("tickFor advances in minimum steps without overshooting timer boundaries", function* () {
    const control = yield* TestControl.execute(
      IO.gen(function* () {
        yield* IO.sleep(10);
        const first = yield* IO.realTime();
        yield* IO.sleep(10);
        const second = yield* IO.realTime();
        return [first, second] as const;
      }),
    );

    yield* control.tickFor(15);

    expect(yield* control.result).toBeNull();
    expect(yield* control.realTime).toBe(15);
    expect(yield* control.nextInterval).toBe(5);

    yield* control.tickAll();

    expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: [10, 20] });
  });

  it.gen(
    "advanceAndTick schedules the first sleep against the already-advanced clock",
    function* () {
      const control = yield* TestControl.execute(IO.sleep(10).pipe(IO.andThen(IO.realTime())));

      yield* control.advanceAndTick(10);

      expect(yield* control.result).toBeNull();

      yield* control.advanceAndTick(10);

      expect(yield* control.result).toMatchObject({ _tag: "Succeeded", _0: 20 });
    },
  );

  it.gen("executeEmbed fails fast on deadlock", function* () {
    const error = yield* IO.catch(TestControl.executeEmbed(IO.never()), IO.of);

    expect(error).toBeInstanceOf(NonTerminationError);
  });
});
