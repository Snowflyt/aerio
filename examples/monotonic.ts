import { IO } from "../src";

const program = IO.gen(function* () {
  const start = yield* IO.monotonic();
  yield* IO.sleep(1000);
  const end = yield* IO.monotonic();
  const elapsed = end - start;
  yield* IO.println(`Elapsed time: ${elapsed} ms`);
});

IO.unsafeRun(program);
