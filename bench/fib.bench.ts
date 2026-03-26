import { Effect } from "effect";
import { expect, test } from "vitest";

import { IO } from "../src";

const fib = (n: number): number => {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
};

/* aerio */
const fibIOGen = (n: number): IO<number> =>
  IO.gen(function* () {
    if (n <= 1) return n;
    return (yield* fibIOGen(n - 1)) + (yield* fibIOGen(n - 2));
  });

const fibIO1 = (n: number): IO<number> => {
  if (n <= 1) return IO.of(n);
  return fibIO1(n - 1).pipe(IO.flatMap((a) => fibIO1(n - 2).pipe(IO.map((b) => a + b))));
};

const fibIO2 = (n: number): IO<number> => {
  if (n <= 1) return IO.of(n);
  return fibIO2(n - 1).pipe(IO.andThen((a) => fibIO2(n - 2).pipe(IO.andThen((b) => a + b))));
};

const fibIO3 = (n: number): IO<number> => {
  if (n <= 1) return IO.of(n);
  return fibIO3(n - 1).pipe(IO.zipWith(fibIO3(n - 2), (a, b) => a + b));
};

const fibIODo = (n: number): IO<number> => {
  if (n <= 1) return IO.of(n);
  return IO.do(
    IO.bind("a", () => fibIODo(n - 1)),
    IO.bind("b", () => fibIODo(n - 2)),
    IO.return(({ a, b }) => a + b),
  );
};

/* Effect */
const fibEGen = (n: number): Effect.Effect<number> =>
  Effect.gen(function* () {
    if (n <= 1) return n;
    return (yield* fibEGen(n - 1)) + (yield* fibEGen(n - 2));
  });

const fibEPipe1 = (n: number): Effect.Effect<number> => {
  if (n <= 1) return Effect.succeed(n);
  return fibEPipe1(n - 1).pipe(
    Effect.flatMap((a) => fibEPipe1(n - 2).pipe(Effect.map((b) => a + b))),
  );
};

const fibEPipe2 = (n: number): Effect.Effect<number> => {
  if (n <= 1) return Effect.succeed(n);
  return fibEPipe2(n - 1).pipe(
    Effect.andThen((a) => fibEPipe2(n - 2).pipe(Effect.map((b) => a + b))),
  );
};

const fibEPipe3 = (n: number): Effect.Effect<number> => {
  if (n <= 1) return Effect.succeed(n);
  return fibEPipe3(n - 1).pipe(Effect.zipWith(fibEPipe3(n - 2), (a, b) => a + b));
};

const fibEDo = (n: number): Effect.Effect<number> => {
  if (n <= 1) return Effect.succeed(n);
  return Effect.Do.pipe(
    Effect.bind("a", () => fibEDo(n - 1)),
    Effect.bind("b", () => fibEDo(n - 2)),
    Effect.map(({ a, b }) => a + b),
  );
};

/* Bench */
test("fib(20)", async ({ bench }) => {
  expect(IO.unsafeRunSync(fibIOGen(20))).toBe(6765);
  expect(IO.unsafeRunSync(fibIO1(20))).toBe(6765);
  expect(IO.unsafeRunSync(fibIO2(20))).toBe(6765);
  expect(IO.unsafeRunSync(fibIO3(20))).toBe(6765);
  expect(IO.unsafeRunSync(fibIODo(20))).toBe(6765);

  expect(Effect.runSync(fibEGen(20))).toBe(6765);
  expect(Effect.runSync(fibEPipe1(20))).toBe(6765);
  expect(Effect.runSync(fibEPipe2(20))).toBe(6765);
  expect(Effect.runSync(fibEPipe3(20))).toBe(6765);
  expect(Effect.runSync(fibEDo(20))).toBe(6765);

  await bench.compare(
    bench("[baseline] fib(20)", () => void fib(20)),
    bench("[aerio] fibGen(20)", () => void IO.unsafeRunSync(fibIOGen(20))),
    bench("[aerio] fibIO(20) with map/flatMap", () => void IO.unsafeRunSync(fibIO1(20))),
    bench("[aerio] fibIO(20) with andThen", () => void IO.unsafeRunSync(fibIO2(20))),
    bench("[aerio] fibIO(20) with zip", () => void IO.unsafeRunSync(fibIO3(20))),
    bench("[aerio] fibIO(20) with do notation", () => void IO.unsafeRunSync(fibIODo(20))),
    bench("[Effect] fibGen(20)", () => void Effect.runSync(fibEGen(20))),
    bench("[Effect] fibPipe(20) with map/flatMap", () => void Effect.runSync(fibEPipe1(20))),
    bench("[Effect] fibPipe(20) with andThen", () => void Effect.runSync(fibEPipe2(20))),
    bench("[Effect] fibPipe(20) with zip", () => void Effect.runSync(fibEPipe3(20))),
    bench("[Effect] fibPipe(20) with do simulation", () => void Effect.runSync(fibEDo(20))),
    bench("[aerio-after] fibGen(20)", () => void IO.unsafeRunSync(fibIOGen(20))),
    bench("[aerio-after] fibIO(20) with map/flatMap", () => void IO.unsafeRunSync(fibIO1(20))),
    bench("[aerio-after] fibIO(20) with andThen", () => void IO.unsafeRunSync(fibIO2(20))),
    bench("[aerio-after] fibIO(20) with zip", () => void IO.unsafeRunSync(fibIO3(20))),
    bench("[aerio-after] fibIO(20) with do notation", () => void IO.unsafeRunSync(fibIODo(20))),
    bench("[Effect-after] fibGen(20)", () => void Effect.runSync(fibEGen(20))),
    bench("[Effect-after] fibPipe(20) with map/flatMap", () => void Effect.runSync(fibEPipe1(20))),
    bench("[Effect-after] fibPipe(20) with andThen", () => void Effect.runSync(fibEPipe2(20))),
    bench("[Effect-after] fibPipe(20) with zip", () => void Effect.runSync(fibEPipe3(20))),
    bench("[Effect-after] fibPipe(20) with do simulation", () => void Effect.runSync(fibEDo(20))),
  );
}, 300_000);

test("fib(30)", async ({ bench }) => {
  await bench.compare(
    bench("[baseline] fib(30)", () => void fib(30)),
    bench("[aerio] fibGen(30)", () => void IO.unsafeRunSync(fibIOGen(30))),
    bench("[aerio] fibIO(30) with map/flatMap", () => void IO.unsafeRunSync(fibIO1(30))),
    bench("[aerio] fibIO(30) with andThen", () => void IO.unsafeRunSync(fibIO2(30))),
    bench("[aerio] fibIO(30) with zip", () => void IO.unsafeRunSync(fibIO3(30))),
    bench("[aerio] fibIO(30) with do notation", () => void IO.unsafeRunSync(fibIODo(30))),
    bench("[Effect] fibGen(30)", () => void Effect.runSync(fibEGen(30))),
    bench("[Effect] fibPipe(30) with map/flatMap", () => void Effect.runSync(fibEPipe1(30))),
    bench("[Effect] fibPipe(30) with andThen", () => void Effect.runSync(fibEPipe2(30))),
    bench("[Effect] fibPipe(30) with zip", () => void Effect.runSync(fibEPipe3(30))),
    bench("[Effect] fibPipe(30) with do simulation", () => void Effect.runSync(fibEDo(30))),
  );
}, 3_600_000);
