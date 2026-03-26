/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { IO } from "../src";

import { withDOM } from "./test-utils";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IO.debug", () => {
  it("logs and preserves the current value", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = IO.unsafeRunSync(IO.of(42).pipe(IO.debug("curr")));

    expect(result).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("curr:", 42);
  });
});

describe("IO.println", () => {
  it("writes arguments directly through console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    IO.unsafeRunSync(IO.println("hello", 42));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("hello", 42);
  });
});

describe("IO.notify", () => {
  it("falls back to console.log outside browser alert environments", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    IO.unsafeRunSync(IO.notify("hello"));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("hello");
  });

  it("uses window.alert in browser alert environments", async () => {
    await withDOM(async (window) => {
      const alert = vi.fn();
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      Object.defineProperty(window, "alert", {
        configurable: true,
        writable: true,
        value: alert,
      });

      const { IO } = await import("../src");

      IO.unsafeRunSync(IO.notify("hello"));

      expect(alert).toHaveBeenCalledTimes(1);
      expect(alert).toHaveBeenCalledWith("hello");
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});

describe("IO.log", () => {
  it("writes info metadata through console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    IO.unsafeRunSync(IO.log("hello"));

    expect(spy).toHaveBeenCalledTimes(1);

    const prefix = String(spy.mock.calls[0]![0]);
    expect(prefix).toContain("info");
    expect(prefix).toMatch(/\[fiber #\d+\]/);
    expect(spy.mock.calls[0]!.at(-1)).toBe("hello");
  });
});

describe("Level-specific logging", () => {
  it("writes debug metadata through console.debug", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

    IO.unsafeRunSync(IO.logDebug("hello"));

    expect(spy).toHaveBeenCalledTimes(1);

    const prefix = String(spy.mock.calls[0]![0]);
    expect(prefix).toContain("debug");
    expect(prefix).toMatch(/\[fiber #\d+\]/);
    expect(spy.mock.calls[0]!.at(-1)).toBe("hello");
  });

  it("writes info metadata through console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    IO.unsafeRunSync(IO.logInfo("hello"));

    expect(spy).toHaveBeenCalledTimes(1);

    const prefix = String(spy.mock.calls[0]![0]);
    expect(prefix).toContain("info");
    expect(prefix).toMatch(/\[fiber #\d+\]/);
    expect(spy.mock.calls[0]!.at(-1)).toBe("hello");
  });

  it("writes warn metadata through console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    IO.unsafeRunSync(IO.logWarn("hello"));

    expect(spy).toHaveBeenCalledTimes(1);

    const prefix = String(spy.mock.calls[0]![0]);
    expect(prefix).toContain("warn");
    expect(prefix).toMatch(/\[fiber #\d+\]/);
    expect(spy.mock.calls[0]!.at(-1)).toBe("hello");
  });

  it("writes error metadata through console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    IO.unsafeRunSync(IO.logError("hello"));

    expect(spy).toHaveBeenCalledTimes(1);

    const prefix = String(spy.mock.calls[0]![0]);
    expect(prefix).toContain("error");
    expect(prefix).toMatch(/\[fiber #\d+\]/);
    expect(spy.mock.calls[0]!.at(-1)).toBe("hello");
  });
});
