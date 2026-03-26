import { IO } from "../src";

const slowOperation = IO.sleep(2000).pipe(IO.zipR(IO.log("completed")));

const program = slowOperation.pipe(IO.timeout(1000));

IO.unsafeRun(IO.log("Program started"));
IO.unsafeRun(program);
