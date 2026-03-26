import { Fiber, IO } from "../src";

const program = IO.fetch("https://jsonplaceholder.typicode.com/posts", {
  params: { userId: 1 },
}).pipe(
  IO.flatTap((res) => IO.throwWhen(!res.ok, new Error(`Fetch failed: ${res.status}`))),
  IO.andThen((res) => res.json()),
  IO.andThen((data) => IO.log("Response received:", data)),
  IO.onCancel(IO.logDebug("Fetch cancelled")),
);

const main = IO.gen(function* () {
  const fiber = yield* program.pipe(IO.fork);
  yield* fiber.pipe(Fiber.cancel, IO.fork, IO.delay(700));
  yield* fiber.pipe(Fiber.join);
});

IO.unsafeRun(main);
