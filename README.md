# Aerio

A clean asynchronous runtime for TypeScript.

[![downloads](https://img.shields.io/npm/dm/aerio.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/aerio)
[![version](https://img.shields.io/npm/v/aerio.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/aerio)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/aerio.svg?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/aerio)
[![coverage status](https://img.shields.io/coverallsCoverage/github/kindlevel/aerio?branch=main&style=flat&colorA=000000&colorB=000000)](https://coveralls.io/github/kindlevel/aerio?branch=main)
[![license](https://img.shields.io/npm/l/aerio.svg?style=flat&colorA=000000&colorB=000000)](https://github.com/kindlevel/aerio)

Aerio is a lightweight runtime for writing reliable asynchronous applications in TypeScript. It implements a _tiny_, _fast_ and _pure_ [IO monad](#what-is-an-io-monad) with a rich set of combinators and utilities for handling asynchronous computations, errors, and cancellations in a composable and type-safe way.

- Start with an ergonomic, tree-shakable API from ~3kB minzipped.
- Compose synchronous and asynchronous effects with lightweight fibers, racing, cancellation, timeouts, and resource-safe cleanup.
- Coordinate shared state and concurrent work with `Deferred`, `Ref`, `FiberLocal`, [`Outcome`](#running-ios-and-outcome), `Schedule`, and other focused primitives.
- Test time-based and concurrent programs deterministically with `TestControl`.
- Run anywhere ES2015 is available, including browsers, Node.js 6+, QuickJS, and QuickJS-NG.
- Build custom abstractions on Aerio’s small core and type class layer, designed for advanced users and library authors.

## Installation

To install Aerio via npm (or any other package manager you prefer):

```shell
npm install aerio
```

Most code can use module imports directly from `aerio`:

```typescript
import { IO, Fiber, Outcome, Deferred, Ref, FiberLocal, Schedule } from "aerio";

const loop: IO<void> = IO.println("Loop until cancel...").pipe(
  IO.andThen(IO.sleep(1000)),
  IO.andThen(() => loop),
);

IO.unsafeRun(loop);
```

The root entrypoint exposes modules with `export * as IO from "./IO"`-style exports. Modern bundlers such as Rollup and Webpack 5+ can tree-shake this form. Aerio’s root type declarations are also shaped so each imported module can be used as the matching type, such as `IO<A>` instead of `IO.IO<A>`.

If your bundler cannot tree-shake module imports from the root entrypoint, import the focused subpath instead:

```typescript
import * as IO from "aerio/IO";
import * as Fiber from "aerio/Fiber";

const loop: IO.IO<void> = IO.println("Loop until cancel...").pipe(
  IO.andThen(IO.sleep(1000)),
  IO.andThen(() => loop),
);

const fiber = IO.unsafeRunFork(loop.pipe(IO.onCancel(IO.log("Loop cancelled"))));
IO.unsafeRun(fiber.pipe(Fiber.cancel, IO.delay(3000)));
```

Subpath namespace imports keep tree shaking straightforward, but their types live under the namespace, so you write `IO.IO<A>` instead of `IO<A>`.

## Quick Start

Aerio is built around one type: `IO<A>`. An `IO<A>` is a description of a computation that may perform effects and eventually produce an `A`. Nothing happens when you create it. You build and transform these descriptions first, then run them once at the edge of your program with the `unsafeRun*` family.

```typescript
import { IO } from "aerio";

const program = IO.println("Hello from Aerio");

IO.unsafeRun(program);
//> Hello from Aerio
```

Here, `IO.println` creates an `IO<void>` that describes printing to the console. `IO.unsafeRun` executes that description. If you want the plain version, `IO.println("x")` is essentially the console helper you would otherwise write as `IO.sync(() => console.log("x"))`.

Like a `Promise<A>`, an `IO<A>` can succeed with `A` or fail with an error. Unlike a `Promise<A>`, it does not begin running when you create it, and it does not distinguish synchronous and asynchronous effects in the type.

```typescript
const pure = IO.of(42);
const sync = IO.sync(() => Date.now());
const async = IO.sleep(1000).pipe(IO.as("done"));
const failed = IO.throw(new Error("boom"));

await IO.unsafeRunPromise(pure); // => 42
await IO.unsafeRunPromise(async); // => "done"
```

`IO.of(value)` is the Aerio equivalent of `Promise.resolve(value)`. `IO.throw(error)` is the equivalent of `Promise.reject(error)`.

Most Aerio code uses one of two styles: pipeline style for local transformations, or `IO.gen` when you want named intermediate values. They compose the same `IO` values.

```typescript
const pipeline = IO.of(20).pipe(
  IO.map((n) => n + 1),
  IO.flatTap((n) => IO.println("seen", n)),
  IO.flatMap((n) => IO.of(n * 2)),
  IO.andThen((n) => n - 2),
);

IO.unsafeRunSync(pipeline); // => 42
//> seen 21
```

In pipeline style, `map` changes the successful value, `flatMap` sequences the next `IO` from that value (`flatTap` does the same for a side effect while keeping the original value), and `andThen` is the ergonomic “then continue” combinator for plain values, promises, and other `IO`s. These transformations follow the same “Dual API” pattern as in [Effect](https://github.com/Effect-TS/website/blob/1c1ac4586a9e71367459fea96faa76dffd4fe227/content/src/content/docs/docs/code-style/dual.mdx).

When a program has several dependent steps, generator syntax can read more like direct style while still building a lazy `IO` value:

```typescript
const program = IO.gen(function* () {
  const startedAt = yield* IO.realTime();
  const n = yield* IO.of(20);
  const next = n + 1;
  yield* IO.println("seen", next, "at", startedAt);
  return next * 2;
});

IO.unsafeRunSync(program); // => 42
//> seen 21 at <timestamp>
```

Pipeline style tends to be compact when each step is a transformation. Generator style tends to be clearer when the program has branching, local names, or several dependent effects.

For functional programming nerds, Aerio also provides a Haskell-style “do notation” simulation, roughly in the same family as Scala’s “for comprehension”. See [“Do notation”](#do-notation) for the details.

## Referential Transparency

A `Promise` starts running when it is created, so reusing the same promise reuses the same in-flight or completed result. An `IO` is just a description, so reusing the same `IO` reuses the recipe; each run evaluates it again.

```typescript
let promiseRuns = 0;
const promise = Promise.resolve().then(() => ++promiseRuns);

await promise; // => 1
await promise; // => 1

let ioRuns = 0;
const io = IO.sync(() => ++ioRuns);

IO.unsafeRunSync(io); // => 1
IO.unsafeRunSync(io); // => 2
```

That is the useful part of referential transparency in Aerio: creating, storing, passing, or composing an `IO` has no observable effect by itself. You can put descriptions in data structures, retry them, race them, test them, and decide at the edge of your program how they should run.

```typescript
const increment = IO.sync(() => ++ioRuns);
const twice = increment.pipe(IO.zip(increment));

IO.unsafeRunSync(twice); // => [3, 4]
```

## Creating `IO`s

Aerio does not force a boundary between synchronous and asynchronous work. Create whichever `IO` description you need, then compose all of them as `IO<A>`.

```typescript
const pure = IO.of(42);
const failed = IO.throw(new Error("boom"));
const now = IO.sync(() => Date.now());

const parsed = (json: string) => IO.try(() => JSON.parse(json) as unknown);

const user = IO.promise((signal) =>
  fetch("/api/user", { signal }).then((response) => response.json()),
);

const timer = (ms: number) =>
  IO.asyncCancellable<void>((succeed, fail) => {
    const id = setTimeout(() => succeed(), ms);
    return IO.sync(() => clearTimeout(id)); // Invoked on cancellation
  });
```

Common constructors and low-level hooks:

- `IO.of`, `IO.void`, and `IO.throw` create pure success and failure values.
- `IO.sync`, `IO.try`, `IO.suspend`, and `IO.promise` wrap ordinary TypeScript code.
- `IO.asyncUncancellable`, `IO.asyncCancellable`, and `IO.cont` adapt callback-style APIs.
- `IO.sleep`, `IO.never`, `IO.cede`, `IO.monotonic`, and `IO.realTime` model time and scheduler boundaries.
- `IO.fetch`, `IO.input`, `IO.notify`, `IO.println`, and `IO.log*` provide host-facing helpers.

## Composing `IO`s

Most combinators are functions rather than methods, which keeps them tree-shakable and easy to extend. They support Aerio’s dual API style, so both `IO.map(io, f)` and `io.pipe(IO.map(f))` work.

```typescript
const loadUser = (id: string): IO<User> =>
  IO.fetch(`/api/users/${id}`).pipe(IO.andThen((response) => response.json()));

const program = loadUser("ada").pipe(
  IO.map((user) => user.name),
  IO.flatTap((name) => IO.log("loaded", name)),
  IO.asVoid,
);
```

The core combinators are the usual ones: `map` for pure transformations, `flatMap` for transformations that return another `IO`, and `andThen` as an ergonomic bridge that accepts a plain value, a `PromiseLike`, or another `IO`.

```typescript
IO.unsafeRunSync(IO.of(41).pipe(IO.map((n) => n + 1))); // => 42

IO.unsafeRunSync(IO.of(41).pipe(IO.flatMap((n) => IO.of(n + 1)))); // => 42

await IO.unsafeRunPromise(
  IO.of(41).pipe(
    IO.andThen((n) => n + 1),
    IO.andThen((n) => Promise.resolve(n + 1)),
    IO.andThen((n) => IO.of(n + 1)),
  ),
); // => 44
```

`andThen` is also useful for “do this, then that” sequencing:

```typescript
const program = IO.println("step 1").pipe(
  IO.andThen(IO.sleep(100)),
  IO.andThen(IO.println("step 2")),
);

IO.unsafeRun(program);
//> step 1
//> step 2
```

For longer dependent programs, `IO.gen` keeps intermediate values local:

```typescript
const program = IO.gen(function* () {
  const user = yield* IO.fetch("/api/users/ada").pipe(
    IO.andThen((response) => response.json() as Promise<User>),
  );

  if (!user.active) {
    yield* IO.println("inactive user");
    return null;
  }

  yield* IO.println("loaded", user.name);
  return user;
});
```

Other composition helpers include `tap`, `as`, `asVoid`, `zip`, `zipWith`, `zipL`, `zipR`, `product`, `productL`, `productR`, `ap`, `flatten`, `catch`, `ignore`, `when`, `unless`, `throwWhen`, and `throwUnless`.

## “Do notation”

`IO.do` is a small typed context builder. Each step receives the context accumulated so far and returns a new `IO` context, so the syntax is closer to Haskell’s “do notation” or Scala’s “for comprehension” than to a JavaScript block.

It does not implicitly return the final expression. If the last step is just another `IO`, `IO.do` runs it and returns `IO<void>`. Use `IO.return` to project the context into a final pure value, or `IO.returnM` to project it into a final `IO` and flatten it.

The main primitives are:

- `IO.let(name, f)` adds a pure value computed from the current context.
- `IO.bind(name, f)` runs an `IO` computed from the current context and stores its successful value, similar to `flatMap`.
- `IO.also(f)` runs an `IO` computed from the current context and keeps the original context, similar to `flatTap`.
- `IO.return(f)` returns a pure final value from the context.
- `IO.returnM(f)` returns a final `IO` from the context.

`letV`, `bindV`, and `alsoV` are the value forms for steps that do not need to inspect the context.

```typescript
const program = IO.do(
  IO.letV("base", 20),
  IO.let("next", ({ base }) => base + 1),
  IO.bindV("startedAt", IO.realTime()),
  IO.bind("doubled", ({ next }) => IO.of(next * 2)),
  IO.also(({ next, startedAt }) => IO.println("seen", next, "at", startedAt)),
  IO.alsoV(IO.println("done")),
  IO.return(({ doubled }) => doubled),
);

IO.unsafeRunSync(program); // => 42
//> seen 21 at <timestamp>
//> done
```

Use `IO.returnM` when the final projection itself is effectful:

```typescript
const program = IO.do(
  IO.letV("value", 42),
  IO.returnM(({ value }) => IO.println("returning", value).pipe(IO.as(value))),
);

IO.unsafeRunSync(program); // => 42
//> returning 42
```

## Running `IO`s and `Outcome`

Run effects at the edge of your program. The `unsafeRun*` names are intentional: this is where a pure description becomes real work.

```typescript
IO.unsafeRunSync(IO.of(42)); // => 42

await IO.unsafeRunPromise(IO.sleep(100).pipe(IO.as("done"))); // => "done"

IO.unsafeRunAsync(IO.throw(new Error("boom")), (outcome) => {
  console.log(outcome._tag); // => "Failed"
});
```

Choose the runner based on the boundary you need:

- `IO.unsafeRunPromise` returns a `Promise<A>` that resolves with success or rejects with failure/cancellation.
- `IO.unsafeRunSync` returns `A` directly, but throws if the program fails or reaches an asynchronous boundary.
- `IO.unsafeRunAsync` invokes a callback with an `Outcome` when the program completes.
- `IO.unsafeRun` starts synchronously and switches to async mode if the program reaches an async boundary.
- `IO.unsafeRunFork` starts an `IO` and returns a `Fiber` handle.
- `IO.unsafeRunPromiseCancellable` returns `{ cancel, promise }` for callers that use promises and need cancellation.

Use `unsafeRunFork` or `unsafeRunPromiseCancellable` when the caller needs a cancellation handle:

```typescript
const loop: IO<void> = IO.println("tick").pipe(
  IO.delay(500),
  IO.andThen(() => loop),
);

const { cancel, promise } = IO.unsafeRunPromiseCancellable(
  loop.pipe(IO.onCancel(IO.logDebug("loop cancelled"))),
);

setTimeout(cancel, 1500);
await promise.catch(() => undefined);
```

`unsafeRunPromiseCancellable` is convenient, but `unsafeRunFork` is the most direct expression of Aerio’s internal [fiber model](#fibers). Use it when you need full control over whether you cancel, await, join, or inspect the running computation.

```typescript
import { Fiber, IO } from "aerio";

const loop: IO<void> = IO.println("tick").pipe(
  IO.delay(500),
  IO.andThen(() => loop),
);

const fiber = IO.unsafeRunFork(loop.pipe(IO.onCancel(IO.log("loop cancelled"))));

IO.unsafeRun(fiber.pipe(Fiber.cancel, IO.delay(1500)));

const outcome = await IO.unsafeRunPromise(fiber.pipe(Fiber.await));
outcome._tag; // => "Cancelled"
```

`Outcome` is the data representation of how a computation ended:

- `Outcome.Succeeded(effect)` means the computation succeeded.
- `Outcome.Failed(error)` means it failed.
- A `Cancelled` outcome means it was interrupted before producing a value.

For `IO`, a successful `Outcome` stores an `IO<A>` rather than a plain `A`. That lets APIs such as `Fiber.await` report terminal state without forcing the success value out of the effect context. See [Fibers](#fibers) for the `Fiber.await` and `Fiber.join` distinction.

```typescript
import { Fiber, IO } from "aerio";

const program = IO.gen(function* () {
  const fiber = yield* IO.of(42).pipe(IO.fork);
  const outcome = yield* fiber.pipe(Fiber.await);

  if (outcome._tag === "Succeeded") return yield* outcome._0;

  return 0;
});

IO.unsafeRunSync(program); // => 42
```

Use `Fiber.join` when you want success/failure/cancellation to re-enter the normal `IO` flow. Use `Fiber.await`, `IO.allOutcome`, or `IO.raceOutcome` when you want to inspect terminal state as data.

## Concurrency

Sequential and concurrent programs use the same `IO` type. Concurrency is expressed with combinators that fork child [fibers](#fibers) under the runtime, then combine their results back into the parent fiber.

```typescript
const task = (label: string, ms: number) => IO.sleep(ms).pipe(IO.as(label));

await IO.unsafeRunPromise(IO.all([task("A", 100), task("B", 50)]));
// => ["A", "B"]

await IO.unsafeRunPromise(IO.race([task("slow", 100), task("fast", 10)]));
// => "fast"

await IO.unsafeRunPromise(IO.any([IO.throw("nope"), task("yes", 10)]));
// => "yes"
```

Use the variant that matches the semantics you want:

- `IO.all` runs everything concurrently, preserves input order, and cancels unfinished work on the first failure or cancellation.
- `IO.any` returns the first successful result and cancels the rest.
- `IO.anyOrdered` returns the first successful result by input order, waiting for earlier pending tasks when needed.
- `IO.race` returns the first success or failure and cancels the rest.
- `IO.allOutcome` and `IO.raceOutcome` preserve terminal states as `Outcome` values instead of throwing them into the normal success/failure path.

There are also binary forms such as `both`, `bothOutcome`, `race2`, `race2Outcome`, and lower-level `racePair` for integrations that need the loser fiber.

## Fibers

A fiber is the runtime’s unit of execution. Every `unsafeRun*` function creates a runtime fiber and starts evaluating your `IO` in it, whether the program finishes synchronously or crosses asynchronous boundaries. Think of a fiber as a lightweight semantic thread: it has its own continuation stack, cancellation state, finalizer stack, and fiber-local state.

Inside a running program, `IO.fork` and `IO.forkGlobal` start additional fibers and return a `Fiber` handle. The handle is the public control surface for that running computation: it lets another fiber join it, await its `Outcome`, or request cancellation.

Concurrency primitives such as `IO.all`, `IO.race`, and `IO.any` are built on the same machinery. They start multiple fibers, coordinate their results, and cancel the work that is no longer needed.

```typescript
import { Fiber, IO } from "aerio";

const program = IO.gen(function* () {
  const fiber = yield* IO.sleep(100).pipe(IO.as("child result"), IO.fork);

  return yield* fiber.pipe(Fiber.join);
});

await IO.unsafeRunPromise(program); // => "child result"
```

There are two ways to fork from inside an `IO`. `IO.fork` creates a scoped child fiber: if the parent completes before the child, the child is cancelled. `IO.forkGlobal` creates a detached fiber that is not tied to the parent’s lifetime.

```typescript
const child = IO.println("still running").pipe(IO.delay(1000), IO.forever);

IO.unsafeRun(IO.fork(child).pipe(IO.andThen(IO.sleep(100))));
// The scoped child is cancelled when the parent fiber completes.

IO.unsafeRun(IO.forkGlobal(child).pipe(IO.andThen(IO.sleep(100))));
// The global child keeps running after the parent fiber completes.
```

Use `Fiber.await` to observe the terminal `Outcome`. Use `Fiber.join` when you want the child’s terminal state to re-enter the caller’s `IO` flow:

- `Succeeded(io)` continues with `io`.
- `Failed(error)` fails the caller with `error`.
- `Cancelled` cancels the caller and then semantically waits forever if that cancellation is masked.

Use `Fiber.cancel` to request cancellation and wait for the target fiber’s finalizers.

```typescript
const program = IO.gen(function* () {
  const fiber = yield* IO.never().pipe(IO.fork);
  yield* fiber.pipe(Fiber.cancel);
  const outcome = yield* fiber.pipe(Fiber.await);
  return outcome.isCancelled();
});

await IO.unsafeRunPromise(program); // => true
```

At runtime, each fiber evaluates one `IO` node at a time. The current node might be pure, synchronous, asynchronous, sleeping, racing, waiting on a `Deferred`, or running user code. That is why synchronous and asynchronous parts of a program share the same `IO` data type.

Aerio keeps failure and cancellation separate. `IO.catch` handles failures, while cancellation is observed with tools such as `IO.onCancel`, `IO.guarantee`, and `Fiber.await`. A cancelled fiber does not resume normal execution, but its parent or observer can still continue by inspecting the fiber’s `Outcome`.

## Cancellation Model

Cancellation is a cooperative signal in Aerio. A timeout, a race loser, or an explicit `Fiber.cancel` asks a running fiber to stop, then waits for that fiber to reach a boundary where the request can be observed and its finalizers can run.

For example, cancel a `fetch` after 100 milliseconds:

```typescript
const request = IO.fetch("/api/slow").pipe(IO.onCancel(IO.log("request cancelled")));

const observe = IO.gen(function* () {
  const fiber = yield* request.pipe(IO.fork);

  yield* IO.sleep(100);
  yield* fiber.pipe(Fiber.cancel);

  return yield* fiber.pipe(Fiber.await);
});

const outcome = await IO.unsafeRunPromise(observe);
outcome.isCancelled(); // => true
//> [....] [info] [fiber #...] request cancelled
```

For application deadlines, use [`IO.timeout` or `IO.timeoutTo`](#scheduling-retry-and-timeout) instead of cancelling the fiber manually.

Operationally:

- Cancellation is observed at runtime boundaries: when a fiber is waiting, yielding, or entering cancellable async work.
- Common boundaries include `IO.fetch`, `IO.promise` with an abort signal, `IO.asyncCancellable`, timers such as `IO.sleep`, `Deferred.get`, `Fiber.join`, `Fiber.await`, `IO.cede`, and `poll`ed regions.
- Synchronous JavaScript runs to the end of the current stack frame. If a host API has real cancellation support, expose it to Aerio with `IO.promise`, `IO.asyncCancellable`, or `IO.fetch`.
- `IO.onCancel(finalizer)` runs cleanup when cancellation is observed, but it does not turn the cancelled computation into success.
- `IO.guarantee(finalizer)` runs after success, failure, or cancellation.

A smaller example makes the cleanup path explicit:

```typescript
const program = IO.sleep(1000).pipe(IO.as("done"), IO.onCancel(IO.log("cancelled")));

const fiber = IO.unsafeRunFork(program);

IO.unsafeRunFork(fiber.pipe(Fiber.cancel, IO.delay(100)));

const outcome = await IO.unsafeRunPromise(fiber.pipe(Fiber.await));
outcome.isCancelled(); // => true
//> [....] [info] [fiber #...] cancelled
```

## Uncancellable Regions

Some regions must be atomic for resource safety. `IO.uncancellable` masks cancellation while a critical section is running. If cancellation is requested while the fiber is masked, the request is remembered but not observed until the fiber becomes unmasked again.

The `poll` function selectively restores cancellation for a sub-effect, but only for the mask that produced that `poll`. Nested masks are local: an inner `poll` cannot remove an outer mask.

This is the useful pattern:

```typescript
import { IO } from "aerio";

const guarded = <R, A>(
  acquire: IO<R>,
  use: (resource: R) => IO<A>,
  release: (resource: R) => IO<void>,
) =>
  IO.uncancellable((poll) =>
    acquire.pipe(
      IO.flatMap((resource) => poll(use(resource)).pipe(IO.guarantee(release(resource)))),
    ),
  );
```

Here, `acquire` is masked, so once it begins it is not interrupted halfway by cancellation. The potentially long-running `use(resource)` is wrapped in `poll`, so it can be cancelled. The `guarantee` ensures `release(resource)` runs whether `use` succeeds, fails, or is cancelled. If cancellation was already requested before `poll(use(resource))`, it will be observed there and `release` still runs.

That distinction matters when masks are nested. If two uncancellable regions are active, both masks must be removed before cancellation can be observed inside the inner work:

```typescript
const nested = IO.uncancellable((outerPoll) =>
  IO.uncancellable((innerPoll) => innerPoll(outerPoll(IO.fetch("/api/slow")))),
);
```

In the example above, the fetch is cancellable because the work is wrapped by both polls. The order matters: `outerPoll` is applied to the work first, then `innerPoll` wraps the result. Polling in the wrong order does not remove all active masks, applying the same poll twice does not remove another mask, and a poll created in one fiber cannot unmask work running in another fiber. This is what lets an inner abstraction temporarily restore cancellation for its own work without accidentally punching through an outer abstraction’s critical section.

Most code should reach for `acquireUseRelease`, which packages the same idea:

```typescript
import { IO, Ref } from "aerio";

const program = IO.gen(function* () {
  const events = yield* IO.ref<string[]>([]);
  const record = (event: string) => events.pipe(Ref.update((xs) => [...xs, event]));

  const result = yield* IO.acquireUseRelease(
    record("acquire").pipe(IO.as("resource")),
    (resource) => record(`use:${resource}`).pipe(IO.as(42)),
    (resource) => record(`release:${resource}`),
  );

  return [result, yield* events.pipe(Ref.get)] as const;
});

IO.unsafeRunSync(program);
// => [42, ["acquire", "use:resource", "release:resource"]]
```

## State and Coordination

`Ref` and `Deferred` cover two different coordination shapes. They are generic over the effect `F`; the examples below use Aerio’s concrete `IO` runtime. Use `Ref` when the value already exists and many fibers need atomic access to its latest state. Use `Deferred` when one or more fibers need to wait for a value that another fiber will provide later.

### `Ref`

`Ref<F<~>, E, A>` is a mutable cell for an effect `F`. Reads and updates are atomic, and updates are expressed as pure functions, which makes it a good fit for counters, registries, test probes, and small shared state machines.

```typescript
import { IO, Ref } from "aerio";

const program = IO.gen(function* () {
  const count = yield* IO.ref(0);

  const first = yield* count.pipe(Ref.updateAndGet((n) => n + 1));
  const previous = yield* count.pipe(Ref.getAndUpdate((n) => n + 1));
  const label = yield* count.pipe(Ref.modify((n) => [`count=${n}`, n + 1] as const));
  const current = yield* count.pipe(Ref.get);

  return { first, previous, label, current };
});

IO.unsafeRunSync(program);
// => { first: 1, previous: 1, label: "count=2", current: 3 }
```

The common operations are `Ref.get`, `Ref.set`, `Ref.setAndGet`, `Ref.update`, `Ref.updateAndGet`, `Ref.getAndUpdate`, and `Ref.modify`. `modify` is the most general one: its callback returns `[result, nextValue]`, so you can compute an output and commit the next state in the same atomic step.

### `Deferred`

`Deferred<F<~>, E, A>` is a one-shot handoff point. It starts empty; `Deferred.get` waits until the value is available; `Deferred.complete(value)` completes it exactly once, wakes every waiter, and returns `true` for the winning completion or `false` after it has already been completed.

```typescript
import { Deferred, Fiber, IO, Ref } from "aerio";

const program = IO.gen(function* () {
  const count = yield* IO.ref(0);
  const start = yield* IO.deferred<void>();

  const worker = yield* IO.gen(function* () {
    yield* start.pipe(Deferred.get);
    return yield* count.pipe(Ref.updateAndGet((n) => n + 1));
  }).pipe(IO.fork);

  const opened = yield* start.pipe(Deferred.complete(undefined));
  const alreadyOpen = yield* start.pipe(Deferred.complete(undefined));
  const result = yield* worker.pipe(Fiber.join);

  return { opened, alreadyOpen, result };
});

IO.unsafeRunSync(program); // => { opened: true, alreadyOpen: false, result: 1 }
```

This pattern is useful for gates, latches, startup handshakes, and “publish exactly once” results. A `Deferred` is not a variable: once completed, every current and future `get` sees the same value.

### `F.memoize`

`F.memoize(action)` packages the common `Ref` plus `Deferred` pattern into one reusable combinator. In Aerio’s concrete runtime, that operation is exported as `IO.memoize`. The outer `F` allocates a small `Ref`-backed state machine and returns an inner `F<A>`; running the inner `F<A>` evaluates `action` once, shares in-flight work with concurrent callers through a `Deferred`, and reuses the cached result afterward.

```typescript
import { IO, Ref } from "aerio";

const program = IO.gen(function* () {
  const runs = yield* IO.ref(0);
  const memoized = yield* IO.memoize(Ref.updateAndGet(runs, (n) => n + 1).pipe(IO.delay(100)));

  const values = yield* IO.all([memoized, memoized, memoized]);
  const runCount = yield* runs.pipe(Ref.get);

  return [values, runCount] as const;
});

await IO.unsafeRunPromise(program); // => [[1, 1, 1], 1]
```

Semantically, the memoized value has three states. Before the first run, it is unevaluated. While the first run is in progress, concurrent callers subscribe to the same in-flight evaluation and wait for the same `Outcome`. After completion, success and failure are cached for future callers. If every subscriber is cancelled before the action completes, Aerio cancels the underlying evaluation and clears the cache, so the next caller can try again.

## Fiber-Local State

`FiberLocal` is contextual state scoped to a fiber tree. Child fibers inherit the parent’s current value when forked, but child updates do not leak back to the parent.

```typescript
import { Fiber, FiberLocal, IO } from "aerio";

const program = IO.gen(function* () {
  const requestId = yield* IO.fiberLocal("root");

  yield* requestId.pipe(FiberLocal.set("parent"));

  const child = yield* IO.gen(function* () {
    const inherited = yield* requestId.pipe(FiberLocal.get);
    yield* requestId.pipe(FiberLocal.set("child"));
    return [inherited, yield* requestId.pipe(FiberLocal.get)] as const;
  }).pipe(IO.fork);

  return [yield* child.pipe(Fiber.join), yield* requestId.pipe(FiberLocal.get)] as const;
});

IO.unsafeRunSync(program); // => [["parent", "child"], "parent"]
```

This is useful for request IDs, logging context, test knobs, and other values that should follow forked work without becoming global mutable state.

## Scheduling, Retry, and Timeout

`Schedule` is a pure recurrence policy. It is used by `IO.schedule`, `IO.repeat`, and `IO.retry`, and it can also be evaluated directly in tests.

```typescript
import { IO, Schedule } from "aerio";

const retryPolicy = Schedule.exponential(100).pipe(
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(5)),
  Schedule.upTo(10_000),
);

const loadUser = IO.fetch("/api/user").pipe(
  IO.retry(retryPolicy),
  IO.timeoutTo(3_000, IO.of(null)),
);
```

Schedules can be built with `forever`, `once`, `recurs`, `spaced`, `fixed`, `windowed`, `exponential`, and `fibonacci`. They can be transformed with `modifyDelay`, `addDelay`, `jittered`, `upTo`, `union`, and `intersect`.

```typescript
const schedule = Schedule.spaced(1000).pipe(
  Schedule.addDelay(() => 250),
  Schedule.upTo(5000),
);

schedule(1, 0); // => 1250
schedule(5, 5000); // => undefined
```

Use `IO.delay` to postpone one effect, `IO.timeout` to fail on a deadline, and `IO.timeoutTo` to switch to a fallback.

## Deterministic Tests

`TestControl` runs the same `IO` programs against virtual time. That makes time-based and concurrent behavior testable without real sleeps.

```typescript
import { IO, TestControl } from "aerio";

const program = TestControl.executeEmbed(IO.sleep(1000).pipe(IO.as("done")));

await IO.unsafeRunPromise(program); // => "done"
```

Use `TestControl.execute` when you want to step through the runtime:

```typescript
const test = IO.gen(function* () {
  const control = yield* TestControl.execute(IO.sleep(500).pipe(IO.as("done")));

  yield* control.tickFor(250);
  const halfway = yield* control.nextInterval;
  yield* control.tickFor(250);

  return { halfway, result: yield* control.result };
});

await IO.unsafeRunPromise(test);
// => { halfway: 250, result: Outcome { _tag: "Succeeded", _0: "done" } }
```

The stepping API includes `tick`, `tickOne`, `tickFor`, `tickAll`, `advance`, `advanceAndTick`, `advanceTo`, `advanceToNext`, `nextInterval`, and `result`.

## Module Map

| Module        | Use it for                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `IO`          | Effect construction, composition, running, timing, cancellation, resources, concurrency, and host helpers. |
| `Fiber`       | Joining, awaiting, or cancelling a running computation.                                                    |
| `Outcome`     | Inspecting whether a computation succeeded, failed, or was cancelled.                                      |
| `Ref`         | Shared state with atomic reads and pure updates.                                                           |
| `Deferred`    | One-shot coordination between fibers.                                                                      |
| `FiberLocal`  | Fiber-scoped contextual state.                                                                             |
| `Schedule`    | Retry, repeat, and recurrence policies.                                                                    |
| `TestControl` | Virtual-time execution for deterministic tests.                                                            |

## Building Abstractions

Most application code can stop at `IO`. Advanced users and library authors can build on Aerio’s small core and type class layer instead of hard-coding against the concrete runtime too early.

> [!WARNING]
>
> The `core/*` and `typeclass/*` subpaths are intended for advanced users. They are public enough to explore, but their exact shape may change before Aerio reaches 1.0.

There are two main reasons to reach for these layers:

- Use `core/*` when you want to build a concrete abstraction with your own surface.
- Use `typeclass/*` when you want code to work with any effect type that provides the capabilities you need.

For example, `core/IO` exposes `derive*` helpers for defining your own effect type. The example below defines `MyEffect` with a method-based API:

```typescript
import type { Arg0, HKT } from "hkt-core";

import * as IOCore from "aerio/core/IO";

interface MyEffect<A> extends IOCore.IO<A> {
  as: <B>(a: B) => MyEffect<B>;
  map: <B>(f: (a: A) => B) => MyEffect<B>;
  flatMap: <B>(f: (a: A) => MyEffect<B>) => MyEffect<B>;
  flatTap: <B>(f: (a: A) => MyEffect<B>) => MyEffect<A>;
}

interface MyEffectHKT extends HKT<unknown, unknown> {
  return: MyEffect<Arg0<this>>;
}

const MyEffectProto = {
  as(this: MyEffect<any>, a: any): MyEffect<any> {
    return _as(this, a);
  },
  map(this: MyEffect<any>, f: (a: any) => any): MyEffect<any> {
    return _map(this, f);
  },
  flatMap(this: MyEffect<any>, f: (a: any) => MyEffect<any>): MyEffect<any> {
    return _flatMap(this, f);
  },
  flatTap(this: MyEffect<any>, f: (a: any) => MyEffect<any>): MyEffect<any> {
    return _flatTap(this, f);
  },
};

const _as = IOCore.deriveAs<MyEffectHKT>(MyEffectProto);
const _map = IOCore.deriveMap<MyEffectHKT>(MyEffectProto);
const _flatMap = IOCore.deriveFlatMap<MyEffectHKT>(MyEffectProto);
const _flatTap = IOCore.deriveFlatTap<MyEffectHKT>(MyEffectProto);

const MyEffect = {
  of: IOCore.deriveOf<MyEffectHKT>(MyEffectProto),
  throw: IOCore.deriveThrow<MyEffectHKT>(MyEffectProto),
  sleep: IOCore.deriveSleep<MyEffectHKT>(MyEffectProto),
  never: IOCore.deriveNever<MyEffectHKT>(MyEffectProto),
  println: IOCore.derivePrintln<MyEffectHKT>(MyEffectProto),
  log: IOCore.deriveLog<MyEffectHKT>(MyEffectProto),

  unsafeRunPromise: IOCore.deriveUnsafeRunPromise<MyEffectHKT>(),
  unsafeRunPromiseCancellable: IOCore.deriveUnsafeRunPromiseCancellable<MyEffectHKT>(),
};

const program = MyEffect.sleep(1000)
  .as(42)
  .map((n) => n + 1)
  .flatTap((n) => MyEffect.println("seen", n))
  .flatMap((n) => MyEffect.of(n * 2))
  .map((n) => n - 2);

await MyEffect.unsafeRunPromise(program.flatMap(MyEffect.log));
//> seen 43
//> [2026-05-18 01:34:06.680] [info] [fiber #0] 84
```

The important part is that `MyEffect` reuses Aerio’s runtime representation while choosing a different user-facing API. That is what `core/*` is for: building your own concrete module without reimplementing the interpreter.

For code that should be generic over any effect type, depend on `typeclass/*` capabilities instead. A small helper can ask for only the operations it actually needs:

```typescript
import type { Call1, HKT } from "hkt-core";
import type { Sleep } from "aerio/typeclass/Sleep";
import type { Sync } from "aerio/typeclass/Sync";

const waitAndReturn =
  <F extends HKT<unknown, unknown>>(F: Sync<F> & Sleep<F, unknown>) =>
  <A>(ms: number, value: A): Call1<F, A> =>
    F.productR(F.sleep(ms), F.of(value));
```

The helper can now run with `IO`, `MyEffect`, or any other `F` that provides `Sync` and `Sleep`, without depending on Aerio’s concrete `IO` module.

## Compatibility

Aerio’s core runtime targets ES2015 engines.

- The core runtime works on environments such as Node.js 6+, Chrome 51+, and comparable ES2015 engines.
- QuickJS and QuickJS-NG are supported.
- The core runtime does not depend on the DOM or Node-specific APIs.
- `IO.fetch` depends on host `fetch`, `Request`, `URL`, and `AbortController` support.
- `IO.input` adapts to the host: browser prompt, Node.js readline, or QuickJS-specific input support.

See [docs/runtime-compat.md](docs/runtime-compat.md) for the full matrix.

## More Examples

The [examples](examples/) directory includes runnable examples for cancellation, retries, scheduling, fetching, memoization, racing, deterministic tests, and more.

## FAQ

### What Is an IO Monad?

In Aerio, `IO<A>` is a monad.

In functional programming, a monad is a type constructor `F<A>` with operations like `of` and `flatMap`, or equivalently `of`, `map`, and `flatten`, that obey a small set of laws. The word comes from category theory, but the useful programming idea is much simpler: `flatMap` lets you sequence computations that return the same kind of container without accumulating nested types.

For `IO`, that means a function `A => IO<B>` can be chained after an `IO<A>` and produce one `IO<B>`, not `IO<IO<B>>`:

```typescript
const loadUser = IO.fetch("/api/user").pipe(
  IO.andThen((response) => response.json() as Promise<User>),
);

const program = loadUser.pipe(
  IO.flatMap((user) => IO.println("loaded", user.name).pipe(IO.as(user))),
);
```

In particular, an `IO` monad is a common way to model side effects with monadic sequencing. Each program step returns another `IO`, `flatMap` connects those steps, and the result is still a single description that can be run later. This strategy is widely used in functional programming languages such as Haskell. The practical benefits are concrete: side effects stay explicit in the type, construction is separated from execution, programs can be transformed before they run, and cross-cutting runtime behavior such as retries, cancellation, resource safety, structured concurrency, and deterministic testing can be expressed as ordinary composition.

The same shape appears outside effect runtimes. `Option<A>` benefits from `flatMap` because it avoids `Option<Option<A>>`; a `Result<E, A>` with fixed `E` avoids `Result<E, Result<E, A>>`; JavaScript arrays avoid nested arrays with `Array.prototype.flatMap`. `IO<A>` uses the same sequencing idea for effect descriptions.

`Promise` has a monadic-looking operation too: `then` behaves a lot like `flatMap`. But JavaScript promises start running immediately and share one in-flight or completed result, so they do not have the same referential transparency as Aerio’s `IO`. It is usually more precise to call `Promise` monadic than to treat it as a lawful lazy effect monad.

### How Is Aerio Related to Cats Effect 3?

[Cats Effect](https://github.com/typelevel/cats-effect) 3 is a Scala library for typed functional effects, and it is Aerio’s main influence.

If you know Cats Effect, Aerio should feel familiar at a conceptual level: one concrete `IO` runtime, lazy effect descriptions, lightweight fibers, `Outcome`, cancellation masking with `uncancellable` and `poll`, `Ref`, `Deferred`, resource-safe composition, and a type class layer for reusable abstractions.

The important differences are intentional:

| Cats Effect 3 (CE3)                                        | Aerio                                                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IO[A]`                                                    | `IO<A>`                                                                                        | Same core idea: a value that describes a computation and runs only when interpreted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Fiber#join: F[Outcome[F, E, A]]`                          | `Fiber.await: F<Outcome<F<~>, E, A>>`                                                          | Aerio uses `await` for the Outcome-producing operation because it observes the fiber’s terminal state as data.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `joinWithNever`-style value joining                        | `Fiber.join: F<A>`                                                                             | Aerio reserves `join` for ergonomic value joining, but it is not a direct `joinWithNever` equivalent: joining a cancelled fiber behaves like Cats Effect 3’s `canceled *> never` semantics, or `F.productR(F.cancelled(), F.never())` in Aerio terms. When unmasked, the cancellation is observed and the parent fiber is cancelled; when masked, it behaves like `joinWithNever` and waits forever. This avoids accidental self-cancelled fibers silently hanging a program forever, and keeps `join` consistent with cancellation-aware primitives such as `race`. |
| `Spawn#start`-style detached work                          | `F.forkGlobal`                                                                                 | Detached work belongs here. The fiber is not tied to the parent’s lifetime.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Structured fiber starts                                    | `F.fork`                                                                                       | Aerio’s default fork is structured: if the parent completes before the child, the child is cancelled. This is closer to [ZIO](https://github.com/zio/zio)/[Effect](https://github.com/Effect-TS/effect).                                                                                                                                                                                                                                                                                                                                                             |
| `Outcome.Succeeded`, `Outcome.Errored`, `Outcome.Canceled` | `Outcome.Succeeded`, `Outcome.Failed`, `Outcome.Cancelled`                                     | The shape is the same three-way terminal model; Aerio uses JavaScript-friendly naming.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `uncancelable` and `Poll`                                  | `F.uncancellable` and `poll`                                                                   | The masking model is deliberately close: cancellation is remembered while masked and observed again when a polled region is unmasked.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Ref`, `Deferred`, `IOLocal`                               | `Ref`, `Deferred`, `FiberLocal`                                                                | Same families of coordination/context primitives, with TypeScript-facing names.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Clock[F[_]]` type class                                   | `Clock<F<~>>` type class                                                                       | Aerio provides a `Clock` type class with `F.monotonic()` and `F.realTime()`. `monotonic` prefers `performance.now()` and falls back to similar monotonic sources when unavailable, while `realTime` uses `Date.now()`. To stay consistent with JavaScript conventions, both return time in milliseconds; `monotonic` may include a fractional part for microsecond-level precision.                                                                                                                                                                                  |
| `Temporal` time utilities                                  | `Sleep<F<~>, Err>` type class (`F.sleep`, `F.timeout`, `F.timeoutTo`, `F.schedule`, `F.retry`) | Aerio adds a small `Schedule` model inspired by `effect/Micro`, including composition, jitter, exponential backoff, and retry policy.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `timeoutTo(d, fallback)`                                   | `F.timeoutTo(fa, ms, fallback)`                                                                | CE3 runs `fallback` inside the `uncancelable` region, so `never.timeoutTo(d, never)` can never be cancelled. Aerio runs `fallback` under `poll`, so it is as cancellable as the caller.                                                                                                                                                                                                                                                                                                                                                                              |
| `Resource` / `bracket`-style APIs                          | `F.acquireUseRelease`, `F.guarantee`, `F.onCancel`, `F.uncancellable`                          | Aerio exposes the low-level cancellation/resource model directly, with a small packaged helper for the common acquire-use-release case.                                                                                                                                                                                                                                                                                                                                                                                                                              |

### How Is Aerio Different from ZIO/Effect?

[ZIO](https://github.com/zio/zio) is another effect runtime from the Scala ecosystem. Compared with Cats Effect, ZIO is more battery-included and encodes both the error type and the environment into the main effect type. It also tends to use services in the environment for decoupling, rather than leaning primarily on type classes. That model can be easier to start with and more ready for full application development out of the box.

[Effect](https://github.com/Effect-TS/effect) began as a TypeScript interpretation of ZIO’s ideas. It uses a similar model and has grown into an independent, active TypeScript ecosystem that many developers use to build robust applications.

Aerio sits in a different spot. It is more of a Cats Effect-style runtime for TypeScript: one concrete `IO<A>`, a smaller API and mental model, no typed environment or typed error channel in the primary effect type, and a type class layer available when library authors need abstraction. At the same time, Aerio does adopt some strengths from ZIO and Effect, including structured `fork` semantics and a `Schedule` model inspired by `effect/Micro`.

Compared with Effect, Aerio is not trying to be a full application platform with layers, schema, observability, platform modules, and a broad standard library. It focuses on the runtime. That smaller scope gives Aerio a much smaller bundle and, in our current benchmarks, comparable or higher performance in many cases. In simple computation-heavy examples, Aerio can be up to about 1.8x faster, though Effect may still do better in some complex asynchronous workloads.

For bundle size, Aerio is designed to stay tiny: a minimal Aerio program starts around ~3kB minzipped. A minimal Effect `Console.log` example is over 30kB minzipped in our measurements, and even `effect/Micro` is around ~4kB. Compared with `effect/Micro`, Aerio also aims to be more ergonomic out of the box: APIs such as `IO.fetch` and `IO.log` are part of the runtime-facing surface, while using `effect/Micro` often means rebuilding utilities that exist in full Effect but were not designed around Micro as the primary API.

### When Is Aerio Not the Right Fit?

Aerio is not trying to solve every problem.

It may not be the right tool if:

- You want typed environment and error channels in the main effect type.
- You want a broad application platform with batteries included beyond the runtime itself.
- Your problem is mostly CPU-bound parallel computation rather than asynchronous coordination and cancellation.
- You would be better served by plain promises because you only have a tiny amount of async code and do not need structured concurrency, retries, or runtime testing.

## License

This project is licensed under the Mozilla Public License Version 2.0 (MPL 2.0).
For details, please refer to the `LICENSE` file.
