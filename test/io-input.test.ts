/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import { withDOM, withPatchedProperties } from "./test-utils";

const createTTYInput = () => Object.assign(new PassThrough(), { isTTY: true }) as PassThrough;

const createTTYOutput = () => {
  const output = Object.assign(new PassThrough(), {
    columns: 80,
    isTTY: true,
    rows: 24,
  }) as PassThrough;
  const chunks: string[] = [];

  output.on("data", (chunk) => {
    chunks.push(String(chunk));
  });

  return {
    chunks,
    output,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IO.input", () => {
  describe("browser", () => {
    it("returns the entered line", async () => {
      await withDOM(async (window) => {
        const prompt = vi.fn().mockReturnValue("Alice");

        Object.defineProperty(window, "prompt", {
          configurable: true,
          writable: true,
          value: prompt,
        });

        const { IO } = await import("../src");

        await expect(IO.unsafeRunPromise(IO.input("Name: "))).resolves.toBe("Alice");
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(prompt).toHaveBeenCalledWith("Name: ");
      });
    });

    it("treats an empty string as valid browser input", async () => {
      await withDOM(async (window) => {
        const prompt = vi.fn().mockReturnValue("");

        Object.defineProperty(window, "prompt", {
          configurable: true,
          writable: true,
          value: prompt,
        });

        const { IO } = await import("../src");

        await expect(IO.unsafeRunPromise(IO.input("Name: "))).resolves.toBe("");
      });
    });

    it("fails with CancellationError when the user cancels the prompt", async () => {
      await withDOM(async (window) => {
        Object.defineProperty(window, "prompt", {
          configurable: true,
          writable: true,
          value: vi.fn().mockReturnValue(null),
        });

        const { IO } = await import("../src");
        const { CancellationError } = await import("../src/errors");

        await expect(IO.unsafeRunPromise(IO.input("Name: "))).rejects.toBeInstanceOf(
          CancellationError,
        );
      });
    });
  });

  describe("Node-compatible environments", () => {
    it("reads a line through readline", async () => {
      const input = createTTYInput();
      const { chunks, output } = createTTYOutput();

      await withPatchedProperties(
        process,
        {
          stdin: input,
          stdout: output,
        },
        async () => {
          const { IO } = await import("../src");

          const run = IO.unsafeRunPromise(IO.input("Name: "));

          await vi.waitFor(() => {
            expect(chunks.join("")).toContain("Name: ");
          });

          input.write("Alice\n");

          await expect(run).resolves.toBe("Alice");
        },
      );
    });

    it("treats an empty readline answer as cancellation", async () => {
      const input = createTTYInput();
      const { chunks, output } = createTTYOutput();

      await withPatchedProperties(
        process,
        {
          stdin: input,
          stdout: output,
        },
        async () => {
          const { IO } = await import("../src");
          const { CancellationError } = await import("../src/errors");

          const run = IO.unsafeRunPromise(IO.input("Name: "));

          await vi.waitFor(() => {
            expect(chunks.join("")).toContain("Name: ");
          });

          input.write("\n");

          await expect(run).rejects.toBeInstanceOf(CancellationError);
        },
      );
    });

    it("closes readline when cancelled before it answers", async () => {
      const input = createTTYInput();
      const { chunks, output } = createTTYOutput();

      await withPatchedProperties(
        process,
        {
          stdin: input,
          stdout: output,
        },
        async () => {
          const { IO } = await import("../src");
          const { CancellationError } = await import("../src/errors");

          const run = IO.unsafeRunPromiseCancellable(IO.input("Name: "));

          await vi.waitFor(() => {
            expect(chunks.join("")).toContain("Name: ");
            expect(input.listenerCount("keypress")).toBeGreaterThan(0);
          });

          const rejection = expect(run.promise).rejects.toBeInstanceOf(CancellationError);

          await run.cancel();
          await rejection;

          expect(input.listenerCount("keypress")).toBe(0);
        },
      );
    });
  });
});
