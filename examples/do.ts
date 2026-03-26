import { Fiber, IO } from "../src";

function readStr(): IO<string> {
  // eslint-disable-next-line sonarjs/pseudo-random
  return IO.sync(() => (Math.random() + 1).toString(36).substring(2, 6));
}

const program1 = IO.do(
  IO.bind("left", () => readStr()),
  IO.bind("right", () => readStr()),
  IO.let("full", ({ left, right }) => left + right),
  IO.also(({ full }) => IO.log(full)),
);
await IO.unsafeRunPromise(program1);

const getPostsByUserId = (userId: number) =>
  IO.fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "GET",
    params: { userId },
  }).pipe(
    IO.flatTap((res) => IO.throwWhen(!res.ok, new Error(`Fetch failed: ${res.status}`))),
    IO.flatMap((res) => IO.promise(() => res.json())),
  );

const program2 = IO.do(
  IO.bindV("data", getPostsByUserId(1)),
  IO.also(({ data }) => IO.log("Response received:", data)),
).pipe(IO.onCancel(IO.logDebug("Fetch cancelled")));

const main = IO.do(
  IO.bindV("fiber", program2.pipe(IO.fork)),
  IO.also(({ fiber }) => fiber.pipe(Fiber.cancel, IO.fork, IO.delay(700))),
  IO.also(({ fiber }) => fiber.pipe(Fiber.join)),
);

await IO.unsafeRunPromise(main);
