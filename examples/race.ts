import { IO } from "../src";

IO.unsafeRun(IO.log("Program started"));

const program = IO.race([
  IO.sleep(1000).pipe(IO.zipR(IO.log("A"))), //
  IO.sleep(2000).pipe(IO.zipR(IO.log("B"))),
]);

IO.unsafeRun(program);
