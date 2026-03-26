import { IO } from "../dist/index.js";

const program = IO.input("Enter your name: ").pipe(
  IO.andThen((name) => IO.notify(`Hello, ${name}!`)),
);

IO.unsafeRun(program);
