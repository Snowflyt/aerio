import { IO } from "../src";

const randInt = (min: number, max: number) =>
  IO.sync(Math.random).pipe(IO.map((n) => Math.floor(min + n * (max - min))));

const sleepPrint = (word: string, name: string) =>
  IO.gen(function* () {
    const delayMs = yield* randInt(200, 700);
    yield* IO.sleep(delayMs);
    yield* IO.log(`${word}, ${name}`);
  });

const program = IO.gen(function* () {
  const name = yield* IO.input("What is your name? ");

  yield* sleepPrint("Hello", name).pipe(IO.forever, IO.fork);
  yield* sleepPrint("Bonjour", name).pipe(IO.forever, IO.fork);
  yield* sleepPrint("Hola", name).pipe(IO.forever, IO.fork);

  yield* IO.sleep(5000);
});

IO.unsafeRun(program);
