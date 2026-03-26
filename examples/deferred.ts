import { Deferred, IO } from "../src";

const program = IO.gen(function* () {
  const deferred = yield* IO.deferred<number>();

  yield* deferred.pipe(Deferred.get, IO.debug("a"), IO.fork);

  yield* deferred.pipe(Deferred.complete(42));

  yield* deferred.pipe(Deferred.get, IO.debug("b"));
});

IO.unsafeRun(program);
