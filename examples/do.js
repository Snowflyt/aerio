import { IO } from "../dist/index.js";

function readStr() {
  // eslint-disable-next-line sonarjs/pseudo-random
  return IO.sync(() => (Math.random() + 1).toString(36).substring(2, 6));
}

const program = IO.do(
  IO.bind("left", () => readStr()),
  IO.bind("right", () => readStr()),
  IO.let("full", ({ left, right }) => left + right),
  IO.also(({ full }) => IO.log(full)),
);

program.unsafeRun();
