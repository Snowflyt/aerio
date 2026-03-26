import { IO } from "../src";

const program = IO.both(
  IO.sleep(1000).pipe(IO.zipR(IO.log("A")), IO.as("A")), //
  IO.sleep(2000).pipe(IO.zipR(IO.log("B")), IO.as("B")),
);

IO.unsafeRun(program, console.log);
