/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { IO } from "../src";
import { CancellationError } from "../src/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IO.fetch", () => {
  it("passes params, json, and an abort signal to fetch", async () => {
    const response = { ok: true, status: 200 };

    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response as never);

    await expect(
      IO.unsafeRunPromise(
        IO.fetch("https://example.com/api", {
          method: "POST",
          params: { q: "test", page: 2 },
          json: { hello: "world" },
        }),
      ),
    ).resolves.toBe(response);

    expect(spy).toHaveBeenCalledTimes(1);

    const [input, init] = spy.mock.calls[0]!;

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(String(input)).toBe("https://example.com/api?q=test&page=2");
    expect(init?.method).toBe("POST");
    expect((init as Record<string, unknown>).body).toBe(JSON.stringify({ hello: "world" }));
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.signal).toBeDefined();
  });

  it("aborts the underlying fetch when cancelled", async () => {
    let aborted = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            },
            { once: true },
          );
        }),
    );

    const run = IO.unsafeRunPromiseCancellable(IO.fetch("https://example.com/api"));
    const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

    await run.cancel();
    await rejection;

    expect(aborted).toBe(true);
  });
});
