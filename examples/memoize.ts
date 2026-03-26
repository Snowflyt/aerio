import { IO, Ref } from "../src";

const program = IO.gen(function* () {
  const runs = yield* IO.ref(0);
  const memoized = yield* IO.memoize(Ref.updateAndGet(runs, (n) => n + 1));
  const first = yield* memoized;
  const second = yield* memoized;
  return [first, second, yield* Ref.get(runs)] as const;
});

IO.unsafeRunSync(program.pipe(IO.debug("")));
