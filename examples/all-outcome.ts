import { IO } from "../src";

const program = IO.allOutcome([
  IO.of("A"), //
  IO.of("B"),
]);

IO.unsafeRun(program, console.log);
