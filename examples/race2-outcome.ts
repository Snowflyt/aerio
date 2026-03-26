import { IO } from "../src";

const program = IO.race2Outcome(
  IO.sleep(10).pipe(IO.as("fast")),
  IO.sleep(100).pipe(IO.as("slow")),
);

console.log(await IO.unsafeRunPromise(program));
