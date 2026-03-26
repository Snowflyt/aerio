/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { Schedule } from "../src";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Schedule.once", () => {
  it("allows only one schedule-controlled step", () => {
    const schedule = Schedule.once();

    expect(schedule(1, 0)).toBe(0);
    expect(schedule(2, 0)).toBeUndefined();
  });
});

describe("Schedule.forever", () => {
  it("recurs forever with no built-in delay", () => {
    const schedule = Schedule.forever();

    expect(schedule(1, 0)).toBe(0);
    expect(schedule(100, 99_000)).toBe(0);
  });
});

describe("Schedule.recurs", () => {
  it("permits the configured number of schedule-controlled steps", () => {
    const schedule = Schedule.recurs(2);

    expect(schedule(1, 0)).toBe(0);
    expect(schedule(2, 0)).toBe(0);
    expect(schedule(3, 0)).toBeUndefined();
  });
});

describe("Schedule.spaced", () => {
  it("returns the same delay regardless of elapsed time", () => {
    const schedule = Schedule.spaced(10);

    expect(schedule(1, 0)).toBe(10);
    expect(schedule(2, 15)).toBe(10);
  });
});

describe("Schedule.fixed", () => {
  it("catches up when it falls behind", () => {
    const schedule = Schedule.fixed(10);

    expect(schedule(1, 1)).toBe(9);
    expect(schedule(2, 15)).toBe(5);
    expect(schedule(2, 25)).toBe(0);
  });
});

describe("Schedule.windowed", () => {
  it("waits for the next interval boundary", () => {
    const schedule = Schedule.windowed(10);

    expect(schedule(1, 1)).toBe(9);
    expect(schedule(2, 10)).toBe(10);
    expect(schedule(3, 25)).toBe(5);
  });
});

describe("Schedule.fibonacci", () => {
  it("grows according to the fibonacci sequence", () => {
    const schedule = Schedule.fibonacci(5);

    expect(schedule(1, 0)).toBe(5);
    expect(schedule(2, 0)).toBe(5);
    expect(schedule(3, 0)).toBe(10);
    expect(schedule(4, 0)).toBe(15);
    expect(schedule(5, 0)).toBe(25);
  });
});

describe("Schedule.exponential", () => {
  it("grows geometrically according to the factor", () => {
    const schedule = Schedule.exponential(5, 3);

    expect(schedule(1, 0)).toBe(15);
    expect(schedule(2, 0)).toBe(45);
    expect(schedule(3, 0)).toBe(135);
  });
});

describe("Schedule.modifyDelay and Schedule.addDelay", () => {
  it("constructs pipeable schedules", () => {
    const schedule = Schedule.spaced(10).pipe(
      Schedule.modifyDelay((delay) => Math.min(delay, 5)),
      Schedule.addDelay(() => -2),
    );

    expect(schedule(1, 0)).toBe(3);
    expect(Object.prototype.toString.call(schedule)).toBe("[object Schedule]");
  });
});

describe("Schedule.upTo", () => {
  it("stops once the elapsed time reaches the limit", () => {
    const schedule = Schedule.spaced(10).pipe(Schedule.upTo(25));

    expect(schedule(1, 24)).toBe(10);
    expect(schedule(1, 25)).toBeUndefined();
  });
});

describe("Schedule.jittered", () => {
  it("uses the default 0.8 to 1.2 range", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(1);

    const schedule = Schedule.spaced(100).pipe(Schedule.jittered);

    expect(schedule(1, 0)).toBe(80);
    expect(schedule(2, 0)).toBeCloseTo(120, 8);
  });
});

describe("Schedule.union", () => {
  it("continues while either schedule continues and keeps the shorter delay", () => {
    const schedule = Schedule.once().pipe(Schedule.union(Schedule.spaced(15)));

    expect(schedule(1, 0)).toBe(0);
    expect(schedule(2, 0)).toBe(15);
    expect(schedule(3, 0)).toBe(15);
  });
});

describe("Schedule.intersect", () => {
  it("continues only while both schedules continue and keeps the longer delay", () => {
    const schedule = Schedule.once().pipe(Schedule.intersect(Schedule.spaced(15)));

    expect(schedule(1, 0)).toBe(15);
    expect(schedule(2, 15)).toBeUndefined();
  });
});
