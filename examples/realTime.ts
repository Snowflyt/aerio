import { IO } from "../src";

const program = IO.realTime().pipe(
  IO.flatMap((time) => IO.println(`Current time: ${new Date(time).toISOString()}`)),
);

IO.unsafeRun(program);
