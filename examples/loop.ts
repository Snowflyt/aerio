import { Fiber, IO } from "../src";

const loop: IO<void> = IO.println("Loop until cancel..").pipe(
  IO.andThen(IO.sleep(500)),
  IO.andThen(() => loop),
);

const fiber = IO.unsafeRunFork(loop.pipe(IO.onCancel(IO.logDebug("Loop cancelled"))));

IO.unsafeRun(fiber.pipe(Fiber.cancel, IO.delay(1500)));
