import { describe, expect, it } from "vitest";

import { DefaultScheduler, IO } from "../src";

describe("Cede public contract on Node host", () => {
  it("lets a prequeued host callback run before resuming IO.cede", async () => {
    const order: string[] = [];
    const host = new Promise<void>((resolve) =>
      setImmediate(() => {
        order.push("host");
        resolve();
      }),
    );
    const result = IO.unsafeRunPromise(
      IO.gen(function* () {
        order.push("before");
        yield* IO.cede();
        order.push("after");
      }),
    );
    expect(order).toEqual(["before"]);
    await Promise.all([host, result]);
    expect(order).toEqual(["before", "host", "after"]);
  });

  it("lets a new host checkpoint run between repeated cedes", async () => {
    const order: string[] = [];
    let host!: Promise<void>;
    await IO.unsafeRunPromise(
      IO.gen(function* () {
        yield* IO.cede();
        order.push("first");
        host = new Promise<void>((resolve) =>
          setImmediate(() => {
            order.push("host");
            resolve();
          }),
        );
        yield* IO.cede();
        order.push("second");
      }),
    );
    await host;
    expect(order).toEqual(["first", "host", "second"]);
  });

  it("does not lose or duplicate mixed ready and ceded work", async () => {
    const scheduler = new DefaultScheduler(2048, 3);
    const seen: number[] = [];
    await Promise.all(
      Array.from(
        { length: 40 },
        (_, i) =>
          new Promise<void>((resolve) => {
            scheduler.scheduleTask(
              () => {
                seen.push(i);
                scheduler.scheduleTask(
                  () => {
                    seen.push(40 + i);
                    resolve();
                  },
                  i % 2 === 0,
                );
              },
              i % 3 === 0,
            );
          }),
      ),
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 80 }, (_, i) => i));
  });
});
