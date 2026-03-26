import { IO, Schedule } from "../src";

const unreliableOperation = IO.sync(Math.random).pipe(
  IO.flatMap((n) => (n < 0.3 ? IO.of("Success") : IO.throw("Failure"))),
);

const program = IO.log("Attempting operation...").pipe(
  IO.zipR(unreliableOperation),
  IO.retry(Schedule.spaced(1000).pipe(Schedule.intersect(Schedule.recurs(3)))),
);

IO.unsafeRun(
  program.pipe(
    IO.flatMap((s) => IO.log("Result:", s)),
    IO.catch((e) => IO.log("Error:", e)),
  ),
);
