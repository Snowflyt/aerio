import { IO } from "../src";

const slowOperation = IO.sleep(2000).pipe(IO.as("completed"));

const program = slowOperation.pipe(IO.timeoutTo(1000, IO.of("fallback")));

IO.unsafeRun(IO.log("Program started"));
IO.unsafeRun(program.pipe(IO.flatMap(IO.log)));
