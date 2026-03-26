import { IO, Ref, TestControl } from "../src";

const program1 = IO.gen(function* () {
  const control = yield* TestControl.execute(IO.sleep(1000).pipe(IO.andThen(IO.realTime())));

  const beforeTick = yield* control.nextInterval;
  yield* control.tick();
  const afterTick = yield* control.nextInterval;
  yield* control.advance(1000);
  yield* control.tick();

  return { beforeTick, afterTick, result: yield* control.result };
});

await IO.unsafeRunPromise(program1.pipe(IO.flatMap(IO.println)));

const program2 = IO.gen(function* () {
  const control = yield* TestControl.execute(IO.sleep(500).pipe(IO.as("done")));

  yield* control.tickFor(250);
  const halfway = yield* control.nextInterval;
  yield* control.tickFor(250);

  return { halfway, result: yield* control.result };
});

await IO.unsafeRunPromise(program2.pipe(IO.flatMap(IO.println)));

const program3 = IO.gen(function* () {
  const winners = yield* IO.ref<readonly string[]>([]);

  for (let i = 0; i < 10; i++) {
    const winner = yield* TestControl.executeEmbed(
      IO.race([
        IO.cede().pipe(IO.andThen(IO.of("left"))),
        IO.cede().pipe(IO.andThen(IO.of("right"))),
      ]),
    );
    yield* winners.pipe(Ref.update((ws) => [...ws, winner]));
  }

  return { winners: yield* winners.pipe(Ref.get) };
});

await IO.unsafeRunPromise(program3.pipe(IO.flatMap(IO.println)));
