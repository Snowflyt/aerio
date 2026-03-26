import { IO, Ref, Schedule } from "../src";

const program = IO.gen(function* () {
  const ctr = yield* IO.ref(0);
  const tick = ctr.pipe(
    Ref.updateAndGet((n) => n + 1),
    IO.flatTap((n) => IO.log("tick", n)),
  );
  yield* IO.log("start");
  return yield* tick.pipe(
    IO.repeat(Schedule.spaced(1000).pipe(Schedule.intersect(Schedule.recurs(3)))),
  );
});

IO.unsafeRun(program.pipe(IO.debug("last value")));
