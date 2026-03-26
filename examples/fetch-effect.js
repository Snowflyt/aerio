import { Effect, Fiber } from "effect";

const program = Effect.promise((signal) =>
  fetch("https://jsonplaceholder.typicode.com/posts?userId=1", {
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  }),
).pipe(
  Effect.tap((res) =>
    Effect.when(
      Effect.fail(new Error(`Fetch failed: ${res.status}`)),
      Effect.sync(() => !res.ok),
    ),
  ),
  Effect.andThen((res) => Effect.promise(() => res.json())),
  Effect.andThen((data) => Effect.log("Response received:", data)),
  Effect.onInterrupt(() => Effect.logDebug("Fetch cancelled")),
);

const main = Effect.gen(function* () {
  const fiber = yield* program.pipe(Effect.forkChild);
  yield* fiber.pipe(Fiber.interrupt, Effect.forkChild, Effect.delay(700));
  yield* fiber.pipe(Fiber.join);
});

Effect.runFork(main);
