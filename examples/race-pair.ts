import { IO } from "../src";

const program = IO.racePair(
  IO.sleep(1000).pipe(IO.zipR(IO.log("A")), IO.as("A")), //
  IO.sleep(2000).pipe(IO.zipR(IO.log("B")), IO.as("B")),
);

IO.unsafeRun(program.pipe(IO.zipL(IO.sleep(2000))), console.log);
