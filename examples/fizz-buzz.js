// @ts-check

import { Fiber, IO, Ref } from "../dist/index.js";

const program = IO.gen(function* () {
  const ctr = yield* IO.ref(0);

  const wait = IO.sleep(1000);
  const poll = wait.pipe(IO.zipR(ctr.pipe(Ref.get)));

  yield* poll.pipe(IO.flatMap(IO.log), IO.forever, IO.fork);
  yield* poll.pipe(
    IO.flatMap((n) => IO.when(n % 3 === 0, IO.log("fizz"))),
    IO.forever,
    IO.fork,
  );
  yield* poll.pipe(
    IO.flatMap((n) => IO.when(n % 5 === 0, IO.log("buzz"))),
    IO.forever,
    IO.fork,
  );

  yield* wait.pipe(IO.zipR(ctr.pipe(Ref.update((n) => n + 1))), IO.forever);
});

const fiber = IO.unsafeRunFork(program);
IO.unsafeRun(fiber.pipe(Fiber.cancel, IO.delay(10_000)));
