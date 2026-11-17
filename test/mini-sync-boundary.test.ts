import { expect, it } from "vitest";

import { Mini, runSync, unsafeRunSync } from "./test-utils/mini-effect";

for (const length of [10, 1024, 2048, 4096]) {
  it(`runs ${length} pure sequential steps synchronously`, () => {
    let effect = Mini.of(0);
    for (let i = 0; i < length; i++) effect = Mini.flatMap(effect, (n) => Mini.of(n + 1));
    expect(unsafeRunSync(effect)).toBe(length);
  });
}
it("preserves failed outcomes", () => expect(runSync(Mini.throw("bad"))._tag).toBe("Failed"));
it("preserves cancelled outcomes", () => expect(runSync(Mini.cancelled())._tag).toBe("Cancelled"));
it("rejects asynchronous sleep", () =>
  expect(() => runSync(Mini.sleep(1))).toThrow("did not complete synchronously"));
it("rejects explicit cede", () =>
  expect(() => runSync(Mini.cede())).toThrow("did not complete synchronously"));
it("rejects never", () =>
  expect(() => runSync(Mini.never())).toThrow("did not complete synchronously"));
it("keeps deep synchronous finalization", () => {
  let finalized = 0;
  let effect = Mini.of(0);
  for (let i = 0; i < 4096; i++) effect = Mini.flatMap(effect, (n) => Mini.of(n + 1));
  const result = unsafeRunSync(
    Mini.guarantee(
      effect,
      Mini.sync(() => {
        finalized++;
      }),
    ),
  );
  expect(result).toBe(4096);
  expect(finalized).toBe(1);
});
