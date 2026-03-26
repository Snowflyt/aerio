import { IO } from "../src";

IO.unsafeRun(IO.log("program1"));

const program1 = IO.anyOrdered([
  IO.throw("A"),
  IO.sleep(1000).pipe(IO.as("B")),
  IO.sleep(500).pipe(IO.as("C")),
]).pipe(IO.flatMap(IO.log));

await IO.unsafeRunPromise(program1);

IO.unsafeRun(IO.log("program2"));

const program2 = IO.anyOrdered([
  IO.throw("A"),
  IO.sleep(1000).pipe(IO.zipR(IO.throw("B"))),
  IO.sleep(500).pipe(IO.as("C")),
]).pipe(IO.flatMap(IO.log));

await IO.unsafeRunPromise(program2);
