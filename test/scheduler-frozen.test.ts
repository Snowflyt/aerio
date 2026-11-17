import { expect, it } from "vitest";

import { DefaultScheduler } from "../src";

it("leaves a host checkpoint before executing newly queued reentrant work", async () => {
  const events: string[] = [];
  const scheduler = new DefaultScheduler();
  const finished = new Promise<void>((resolve) => {
    scheduler.scheduleTask(() => {
      events.push("first");
      scheduler.scheduleTask(() => {
        events.push("reentrant");
        resolve();
      });
    });
    queueMicrotask(() => events.push("host"));
  });
  await finished;
  expect(events).toEqual(["first", "host", "reentrant"]);
});
