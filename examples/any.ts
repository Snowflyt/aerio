import { IO } from "../src";

const program = IO.any([
  IO.sleep(1000).pipe(IO.zipR(IO.throw("A"))), //
  IO.sleep(2000).pipe(IO.as("B")),
]);

IO.unsafeRun(program, console.log);
