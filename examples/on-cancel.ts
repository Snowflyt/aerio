import { Fiber, IO } from "../src";

const program = IO.gen(function* () {
  yield* IO.log("start");
  yield* IO.sleep(1000).pipe(IO.as("ok"), IO.onCancel(IO.log("cancelled")));
  yield* IO.log(`done`);
});

await IO.unsafeRunPromise(program);

const fiber = IO.unsafeRunFork(program);
setTimeout(() => IO.unsafeRun(fiber.pipe(Fiber.cancel)), 500);
