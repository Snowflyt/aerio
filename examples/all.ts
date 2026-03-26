import { Fiber, IO } from "../src";

const program = IO.all([
  IO.sleep(1000).pipe(IO.zipR(IO.log("A")), IO.as("A")), //
  IO.sleep(2000).pipe(IO.zipR(IO.log("B")), IO.as("B")),
  IO.sleep(3000).pipe(IO.zipR(IO.log("C")), IO.as("C")),
  IO.sleep(4000).pipe(IO.zipR(IO.log("D")), IO.as("D")),
]);

const fiber = IO.unsafeRunFork(program.pipe(IO.onCancel(IO.log("Program cancelled"))));
IO.unsafeRun(fiber.pipe(Fiber.await, IO.flatMap(IO.println)));

IO.unsafeRun(fiber.pipe(Fiber.cancel, IO.delay(4500)));
