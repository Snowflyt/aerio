/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { HKT } from "hkt-core";

import type { Deferred as _Deferred } from "./Deferred";
import {
  complete as deferred_complete,
  get as deferred_get,
  imap as deferred_imap,
} from "./Deferred";
import type { Fiber as _Fiber } from "./Fiber";
import { await as fiber_await, cancel as fiber_cancel, join as fiber_join } from "./Fiber";
import type { FiberLocal as _FiberLocal } from "./FiberLocal";
import {
  get as fiberLocal_get,
  getAndSet as fiberLocal_getAndSet,
  getAndUpdate as fiberLocal_getAndUpdate,
  imap as fiberLocal_imap,
  modify as fiberLocal_modify,
  set as fiberLocal_set,
  setAndGet as fiberLocal_setAndGet,
  update as fiberLocal_update,
  updateAndGet as fiberLocal_updateAndGet,
} from "./FiberLocal";
import type { IO as _IO } from "./IO";
import {
  acquireUseRelease as io_acquireUseRelease,
  all as io_all,
  allKeyed as io_allKeyed,
  allOutcome as io_allOutcome,
  also as io_also,
  alsoV as io_alsoV,
  andThen as io_andThen,
  any as io_any,
  anyOrdered as io_anyOrdered,
  ap as io_ap,
  as as io_as,
  asVoid as io_asVoid,
  asyncCancellable as io_asyncCancellable,
  asyncUncancellable as io_asyncUncancellable,
  bind as io_bind,
  bindV as io_bindV,
  both as io_both,
  bothOutcome as io_bothOutcome,
  cancelled as io_cancelled,
  catch as io_catch,
  cede as io_cede,
  cont as io_cont,
  debug as io_debug,
  deferred as io_deferred,
  delay as io_delay,
  do as io_do,
  eprintln as io_eprintln,
  fetch as io_fetch,
  fiberLocal as io_fiberLocal,
  flatMap as io_flatMap,
  flatTap as io_flatTap,
  flatten as io_flatten,
  forever as io_forever,
  fork as io_fork,
  forkGlobal as io_forkGlobal,
  gen as io_gen,
  guarantee as io_guarantee,
  guaranteeCase as io_guaranteeCase,
  ignore as io_ignore,
  imap as io_imap,
  input as io_input,
  isIO as io_isIO,
  let as io_let,
  letV as io_letV,
  log as io_log,
  logDebug as io_logDebug,
  logError as io_logError,
  logInfo as io_logInfo,
  logWarn as io_logWarn,
  map as io_map,
  memoize as io_memoize,
  monotonic as io_monotonic,
  never as io_never,
  notify as io_notify,
  of as io_of,
  onCancel as io_onCancel,
  println as io_println,
  product as io_product,
  productL as io_productL,
  productR as io_productR,
  promise as io_promise,
  race as io_race,
  race2 as io_race2,
  race2Outcome as io_race2Outcome,
  raceOutcome as io_raceOutcome,
  racePair as io_racePair,
  realTime as io_realTime,
  ref as io_ref,
  repeat as io_repeat,
  retry as io_retry,
  return as io_return,
  returnM as io_returnM,
  schedule as io_schedule,
  sleep as io_sleep,
  suspend as io_suspend,
  sync as io_sync,
  tap as io_tap,
  throw as io_throw,
  throwUnless as io_throwUnless,
  throwWhen as io_throwWhen,
  timeout as io_timeout,
  timeoutTo as io_timeoutTo,
  try as io_try,
  uncancellable as io_uncancellable,
  unless as io_unless,
  unsafeRun as io_unsafeRun,
  unsafeRunAsync as io_unsafeRunAsync,
  unsafeRunFork as io_unsafeRunFork,
  unsafeRunPromise as io_unsafeRunPromise,
  unsafeRunPromiseCancellable as io_unsafeRunPromiseCancellable,
  unsafeRunSync as io_unsafeRunSync,
  void as io_void,
  when as io_when,
  withFiberRuntime as io_withFiberRuntime,
  zip as io_zip,
  zipL as io_zipL,
  zipR as io_zipR,
  zipWith as io_zipWith,
} from "./IO";
import type { Cancelled, Failed, Succeeded, Outcome as _Outcome } from "./Outcome";
import {
  Cancelled as outcome_Cancelled,
  Failed as outcome_Failed,
  Succeeded as outcome_Succeeded,
  ap as outcome_ap,
  as as outcome_as,
  asVoid as outcome_asVoid,
  catch as outcome_catch,
  ignore as outcome_ignore,
  imap as outcome_imap,
  isCancelled as outcome_isCancelled,
  isFailed as outcome_isFailed,
  isOutcome as outcome_isOutcome,
  isSucceeded as outcome_isSucceeded,
  map as outcome_map,
  of as outcome_of,
  product as outcome_product,
  productL as outcome_productL,
  productR as outcome_productR,
  tap as outcome_tap,
  throw as outcome_throw,
  throwUnless as outcome_throwUnless,
  throwWhen as outcome_throwWhen,
  unless as outcome_unless,
  void as outcome_void,
  when as outcome_when,
} from "./Outcome";
import type { Ref as _Ref } from "./Ref";
import {
  get as ref_get,
  getAndSet as ref_getAndSet,
  getAndUpdate as ref_getAndUpdate,
  imap as ref_imap,
  modify as ref_modify,
  set as ref_set,
  setAndGet as ref_setAndGet,
  update as ref_update,
  updateAndGet as ref_updateAndGet,
} from "./Ref";
import type { Schedule as _Schedule } from "./Schedule";
import {
  addDelay as schedule_addDelay,
  exponential as schedule_exponential,
  fibonacci as schedule_fibonacci,
  fixed as schedule_fixed,
  forever as schedule_forever,
  intersect as schedule_intersect,
  jittered as schedule_jittered,
  modifyDelay as schedule_modifyDelay,
  once as schedule_once,
  recurs as schedule_recurs,
  spaced as schedule_spaced,
  union as schedule_union,
  upTo as schedule_upTo,
  windowed as schedule_windowed,
} from "./Schedule";
import type { TestControl as _TestControl } from "./TestControl";
import {
  execute as testControl_execute,
  executeEmbed as testControl_executeEmbed,
} from "./TestControl";

export * from "./errors";
export { dual, flow, pipe } from "./utils";
export type { Dual } from "./utils";

export { DefaultScheduler, FiberRuntime } from "./internal/kernel";

// -----------------------------------------------------------------------------
// IO
// -----------------------------------------------------------------------------
/**
 * {@linkcode IO} represents a computation that can be executed to produce a value.
 *
 * _Cancellation_ is supported via {@linkcode IO.cont}.
 *
 * **Note**: {@linkcode IO} does not distinguish between synchronous and asynchronous computations.
 * Use {@linkcode IO.sync}, {@linkcode IO.asyncUncancellable}, {@linkcode IO.asyncCancellable}, or {@linkcode IO.promise} to create an {@linkcode IO} instance.
 * Run it **synchronously** with {@linkcode IO.unsafeRunSync}, **asynchronously** with {@linkcode IO.unsafeRunPromise}, or with the callback-style {@linkcode IO.unsafeRun} — {@linkcode IO.unsafeRunSync} throws a `TypeError` if the computation is asynchronous.
 *
 * **Note**: The {@linkcode MonadThrow} type class is implemented via a built-in error channel to allow imperative-style error handling through {@linkcode IO.throw} and {@linkcode IO.catch}.
 * The error information is not encoded into the {@linkcode IO} type itself for simplicity, so these methods are best used for “unexpected” errors.
 * For more predictable error handling, define a Rust-like `Result<E, A>` type and use `IO<Result<E, A>>` instead.
 *
 * **Example** (abstract side effects with {@linkcode IO})
 *
 * ```typescript
 * IO.unsafeRun(IO.println("Hello, world!"));
 * //> Hello, world!
 *
 * const random = () => IO.sync(() => Math.random());
 * const getTime = () => IO.sync(() => Date.now());
 *
 * IO.unsafeRunSync(random()); // => <random number>
 * IO.unsafeRunSync(getTime()); // => <current timestamp>
 *
 * const randomAdd = () =>
 *   IO.liftA2((a: number, b: number) => a + b)(random(), random());
 *
 * IO.unsafeRunSync(randomAdd()); // => <random number>
 * ```
 *
 * **Example** (“do” notation)
 *
 * ```typescript
 * const program = IO.do(
 *   IO.bind("a", () => random()),
 *   IO.bind("b", () => random()),
 *   IO.let("full", ({ a, b }) => a + b),
 *   IO.bind("currTime", () => getTime()),
 *   IO.return(({ full, currTime }) => `Result: ${full}, Time: ${currTime}`),
 * );
 * IO.unsafeRunSync(program); // => "Result: <random number>, Time: <current timestamp>"
 * ```
 *
 * **Example** (generator syntax)
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const a = yield* random();
 *   const b = yield* random();
 *   const full = a + b;
 *   const currTime = yield* getTime();
 *   return `Result: ${full}, Time: ${currTime}`;
 * });
 * IO.unsafeRunSync(program); // => "Result: <random number>, Time: <current timestamp>"
 * ```
 */
export interface IO<out A> extends _IO<A> {}

export namespace IO {
  /**
   * Extracts the value type from an {@linkcode IO}.
   */
  export type Value<T> = _IO.Value<T>;
}

export namespace IO {
  export {
    // Constructors
    io_of as of,
    io_void as void,
    io_throw as throw,
    io_sync as sync,
    io_suspend as suspend,
    io_cont as cont,
    io_asyncUncancellable as asyncUncancellable,
    io_asyncCancellable as asyncCancellable,
    io_try as try,
    io_promise as promise,
    io_gen as gen,
    io_withFiberRuntime as withFiberRuntime,
    io_cancelled as cancelled,
    io_uncancellable as uncancellable,
    io_monotonic as monotonic,
    io_realTime as realTime,
    io_sleep as sleep,
    io_never as never,
    io_cede as cede,
    io_racePair as racePair,
    io_race2Outcome as race2Outcome,
    io_race2 as race2,
    io_bothOutcome as bothOutcome,
    io_both as both,

    // Do notation
    io_do as do,
    io_let as let,
    io_letV as letV,
    io_bind as bind,
    io_bindV as bindV,
    io_also as also,
    io_alsoV as alsoV,
    io_return as return,
    io_returnM as returnM,

    // Control flow
    io_when as when,
    io_throwWhen as throwWhen,
    io_unless as unless,
    io_throwUnless as throwUnless,

    // Scheduling
    io_schedule as schedule,
    io_repeat as repeat,
    io_retry as retry,
    io_timeout as timeout,
    io_timeoutTo as timeoutTo,

    // State management
    io_ref as ref,
    io_fiberLocal as fiberLocal,

    // Concurrency
    io_deferred as deferred,
    io_memoize as memoize,
    io_all as all,
    io_allKeyed as allKeyed,
    io_allOutcome as allOutcome,
    io_any as any,
    io_anyOrdered as anyOrdered,
    io_race as race,
    io_raceOutcome as raceOutcome,

    // Resource management
    io_acquireUseRelease as acquireUseRelease,

    // Static methods
    io_isIO as isIO,
    io_input as input,
    io_notify as notify,
    io_println as println,
    io_eprintln as eprintln,
    io_log as log,
    io_logDebug as logDebug,
    io_logInfo as logInfo,
    io_logWarn as logWarn,
    io_logError as logError,
    io_fetch as fetch,

    // Methods
    io_fork as fork,
    io_forkGlobal as forkGlobal,
    io_imap as imap,
    io_map as map,
    io_tap as tap,
    io_as as as,
    io_asVoid as asVoid,
    io_ap as ap,
    io_product as product,
    io_productL as productL,
    io_productR as productR,
    io_flatten as flatten,
    io_flatMap as flatMap,
    io_flatTap as flatTap,
    io_forever as forever,
    io_zip as zip,
    io_zipWith as zipWith,
    io_zipL as zipL,
    io_zipR as zipR,
    io_andThen as andThen,
    io_debug as debug,
    io_catch as catch,
    io_ignore as ignore,
    io_onCancel as onCancel,
    io_guarantee as guarantee,
    io_guaranteeCase as guaranteeCase,
    io_delay as delay,

    // Run functions
    io_unsafeRunFork as unsafeRunFork,
    io_unsafeRun as unsafeRun,
    io_unsafeRunSync as unsafeRunSync,
    io_unsafeRunAsync as unsafeRunAsync,
    io_unsafeRunPromise as unsafeRunPromise,
    io_unsafeRunPromiseCancellable as unsafeRunPromiseCancellable,
  };
}

export type {
  FiberRuntimeOptions,
  IODeferred,
  IOFiber,
  IOFiberLocal,
  IOOutcome,
  IORef,
  Scheduler,
} from "./IO";

// -----------------------------------------------------------------------------
// TestControl
// -----------------------------------------------------------------------------
/**
 * Drives an {@linkcode IO} program with a virtual-time runtime.
 *
 * The controlled program does not start evaluating until one of the stepping effects on this handle is sequenced.
 * The outer {@linkcode IO}s returned by this interface run on the caller’s runtime rather than inside the controlled runtime.
 *
 * If multiple fibers are runnable at the same time, TestControl randomly chooses between them.
 * Use {@linkcode seed} to reproduce a particular interleaving.
 *
 * Use {@linkcode tick} to drain work that is already runnable, {@linkcode advance} to move the virtual clock, and {@linkcode tickFor} or {@linkcode tickAll} to combine both behaviors.
 * Virtual time is only observed through {@linkcode IO.monotonic}, {@linkcode IO.realTime}, and {@linkcode IO.sleep}.
 * If a program stops making progress without producing a result, {@linkcode isDeadlocked} becomes `true` and {@linkcode executeEmbed} fails with {@linkcode NonTerminationError}.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const control = yield* TestControl.execute(
 *     IO.sleep(1000).pipe(IO.andThen(IO.realTime())),
 *   );
 *
 *   const beforeTick = yield* control.nextInterval;
 *   yield* control.tick();
 *   const afterTick = yield* control.nextInterval;
 *   yield* control.advance(1000);
 *   yield* control.tick();
 *
 *   return { beforeTick, afterTick, result: yield* control.result };
 * });
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> {
 * //   beforeTick: 0,
 * //   afterTick: 1000,
 * //   result: Outcome { _tag: "Succeeded", _0: 1000 }
 * // }
 * ```
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const control = yield* TestControl.execute(IO.sleep(500).pipe(IO.as("done")));
 *
 *   yield* control.tickFor(250);
 *   const halfway = yield* control.nextInterval;
 *   yield* control.tickFor(250);
 *
 *   return { halfway, result: yield* control.result };
 * });
 *
 * IO.unsafeRun(program.pipe(IO.flatMap(IO.println)));
 * //> { halfway: 250, result: Outcome { _tag: "Succeeded", _0: "done" } }
 * ```
 */
export interface TestControl<out A> extends _TestControl<A> {}

export namespace TestControl {
  export {
    // Static methods
    testControl_execute as execute,
    testControl_executeEmbed as executeEmbed,
  };
}

export type { TestControlOptions } from "./TestControl";

// -----------------------------------------------------------------------------
// Schedule
// -----------------------------------------------------------------------------
/**
 * A pure schedule for recurring work.
 *
 * A {@linkcode Schedule} receives the current recurrence attempt number and the elapsed time in milliseconds since the initial execution started.
 * Attempt `1` is the first retry or repeat after the original execution, so the initial execution itself is not counted.
 * Returning `0` means recur immediately, while returning `undefined` means stop recurring.
 *
 * Use {@linkcode Schedule}s with {@linkcode IO.retry} and {@linkcode IO.schedule}, or evaluate them directly in tests because they are plain functions.
 *
 * **Example**
 *
 * ```typescript
 * const schedule = Schedule.spaced(1000).pipe(
 *   Schedule.addDelay(() => 250),
 *   Schedule.upTo(5000),
 * );
 *
 * schedule(1, 0); // => 1250
 * schedule(5, 5000); // => undefined
 * ```
 */
export interface Schedule extends _Schedule {}

export namespace Schedule {
  export {
    // Constructors
    schedule_forever as forever,
    schedule_once as once,
    schedule_recurs as recurs,
    schedule_spaced as spaced,
    schedule_fixed as fixed,
    schedule_windowed as windowed,
    schedule_exponential as exponential,
    schedule_fibonacci as fibonacci,

    // Methods
    schedule_modifyDelay as modifyDelay,
    schedule_addDelay as addDelay,
    schedule_upTo as upTo,
    schedule_jittered as jittered,
    schedule_union as union,
    schedule_intersect as intersect,
  };
}

// -----------------------------------------------------------------------------
// Outcome
// -----------------------------------------------------------------------------
/**
 * Represents the terminal result of a computation or fiber.
 *
 * An {@linkcode Outcome} can be one of three states:
 * - {@linkcode Succeeded}: Represents a successful computation, containing a value of type `F<A>`.
 * - {@linkcode Failed}: Represents a failed computation, containing an error of type `E`.
 * - {@linkcode Cancelled}: Represents a computation that was cancelled and contains no value or error.
 *
 * A successful outcome stores `F<A>` rather than plain `A`.
 * This lets the success case preserve the surrounding effect type instead of forcing the value out of it.
 * With plain `IO`, a successful result usually looks like `Outcome.Succeeded(IO.of(value))`.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Outcome.Succeeded(IO.of(42));
 *
 * IO.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export type Outcome<F extends HKT<unknown, unknown>, E, A> =
  Succeeded<F, A> | Failed<E> | Cancelled;

export namespace Outcome {
  /**
   * Extracts the value type from a {@linkcode Outcome}.
   */
  export type Value<T> = _Outcome.Value<T>;
}

export namespace Outcome {
  export {
    // Constructors
    outcome_Succeeded as Succeeded,
    outcome_Failed as Failed,
    outcome_Cancelled as Cancelled,

    // Static methods
    outcome_isOutcome as isOutcome,

    // Methods
    outcome_imap as imap,
    outcome_map as map,
    outcome_tap as tap,
    outcome_as as as,
    outcome_asVoid as asVoid,
    outcome_of as of,
    outcome_void as void,
    outcome_ap as ap,
    outcome_product as product,
    outcome_productL as productL,
    outcome_productR as productR,
    outcome_when as when,
    outcome_unless as unless,
    outcome_throw as throw,
    outcome_catch as catch,
    outcome_ignore as ignore,
    outcome_throwWhen as throwWhen,
    outcome_throwUnless as throwUnless,
    outcome_isSucceeded as isSucceeded,
    outcome_isFailed as isFailed,
    outcome_isCancelled as isCancelled,
  };
}

// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------
/**
 * A handle to a running or completed computation.
 *
 * Fibers are usually obtained from `IO.fork(...)` or `IO.forkGlobal(...)`.
 *
 * Use {@linkcode join} to wait for the successful result in the normal effect flow, {@linkcode await} to observe the terminal {@linkcode Outcome}, and {@linkcode cancel} to request cancellation through the handle.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.of(42).pipe(IO.fork, IO.flatMap(Fiber.join));
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export interface Fiber<out F extends HKT<unknown, unknown>, out E, out A> extends _Fiber<F, E, A> {}

export namespace Fiber {
  /**
   * Extracts the value type from a {@linkcode Fiber}.
   */
  export type Value<T> = _Fiber.Value<T>;
}

export namespace Fiber {
  export {
    // Methods
    fiber_join as join,
    fiber_await as await,
    fiber_cancel as cancel,
  };
}

// -----------------------------------------------------------------------------
// FiberLocal
// -----------------------------------------------------------------------------
/**
 * A fiber-local value of type `A`.
 *
 * Each forked fiber inherits the current value snapshot, and child updates are isolated from the parent.
 *
 * A {@linkcode FiberLocal} is scoped to the current fiber rather than shared across all fibers.
 * Use an effect-specific constructor such as `IO.fiberLocal(...)` to create one.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const local = yield* IO.fiberLocal("root");
 *   yield* local.pipe(FiberLocal.set("parent"));
 *
 *   const child = yield* IO.gen(function* () {
 *     const inherited = yield* local.pipe(FiberLocal.get);
 *     yield* local.pipe(FiberLocal.set("child"));
 *     return [inherited, yield* local.pipe(FiberLocal.get)] as const;
 *   }).pipe(IO.fork);
 *
 *   return [yield* Fiber.join(child), yield* local.pipe(FiberLocal.get)] as const;
 * });
 *
 * IO.unsafeRunSync(program); // => [["parent", "child"], "parent"]
 * ```
 */
export interface FiberLocal<out F extends HKT<unknown, unknown>, in out A> extends _FiberLocal<
  F,
  A
> {}

export namespace FiberLocal {
  /**
   * Extracts the value type from a {@linkcode FiberLocal}.
   */
  export type Value<T> = _FiberLocal.Value<T>;
}

export namespace FiberLocal {
  export {
    // Methods
    fiberLocal_imap as imap,
    fiberLocal_get as get,
    fiberLocal_getAndSet as getAndSet,
    fiberLocal_getAndUpdate as getAndUpdate,
    fiberLocal_set as set,
    fiberLocal_setAndGet as setAndGet,
    fiberLocal_modify as modify,
    fiberLocal_update as update,
    fiberLocal_updateAndGet as updateAndGet,
  };
}

// -----------------------------------------------------------------------------
// Ref
// -----------------------------------------------------------------------------
/**
 * A mutable reference to a value of type `A`.
 *
 * {@linkcode Ref} is the basic shared-state primitive in this library.
 * It supports atomic reads and pure updates, but it is not a coordination primitive like {@linkcode Deferred}.
 * Because a {@linkcode Ref} is always initialized, {@linkcode get} always has a value to return.
 *
 * Avoid storing mutable objects inside a {@linkcode Ref}.
 * Updates are safest when the stored value is treated as immutable and replaced with a new value.
 *
 * Use an effect-specific constructor such as `IO.ref(...)` to create one.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const ref = yield* IO.ref(0);
 *   yield* ref.pipe(Ref.update((n) => n + 1));
 *   return yield* ref.pipe(Ref.get);
 * });
 *
 * IO.unsafeRunSync(program); // => 1
 * ```
 */
export interface Ref<out F extends HKT<unknown, unknown>, in out A> extends _Ref<F, A> {}

export namespace Ref {
  /**
   * Extracts the value type from a {@linkcode Ref}.
   */
  export type Value<T> = _Ref.Value<T>;
}

export namespace Ref {
  export {
    // Methods
    ref_imap as imap,
    ref_get as get,
    ref_getAndSet as getAndSet,
    ref_getAndUpdate as getAndUpdate,
    ref_set as set,
    ref_setAndGet as setAndGet,
    ref_modify as modify,
    ref_update as update,
    ref_updateAndGet as updateAndGet,
  };
}

// -----------------------------------------------------------------------------
// Deferred
// -----------------------------------------------------------------------------
/**
 * A {@linkcode Deferred} represents a value that may not yet be available.
 *
 * When a {@linkcode Deferred} is created, it is initially **empty**. Later, it can be **completed exactly once** with a value, and never changed again.
 *
 * It exposes two main operations:
 * - `get` on an **empty** {@linkcode Deferred} will _semantically_ “block” the effect until the {@linkcode Deferred} is completed, and then return the completed value.
 *   `get` on a **completed** {@linkcode Deferred} will return the completed value immediately.
 * - `complete(a)` on an **empty** {@linkcode Deferred} will complete it with the value `a`, notify all readers waiting on `get`, and return `true`.
 *   `complete(a)` on a **completed** {@linkcode Deferred} will do nothing and return `false`.
 *
 * **Example**
 *
 * ```typescript
 * const program = IO.gen(function* () {
 *   const deferred = yield* IO.deferred<number>();
 *   const fiber = yield* deferred.pipe(Deferred.get).pipe(IO.fork);
 *   yield* deferred.pipe(Deferred.complete(42));
 *   return yield* Fiber.join(fiber);
 * });
 *
 * IO.unsafeRunSync(program); // => 42
 * ```
 */
export interface Deferred<out F extends HKT<unknown, unknown>, in out A> extends _Deferred<F, A> {}

export namespace Deferred {
  /**
   * Extracts the value type from a {@linkcode Deferred}.
   */
  export type Value<T> = _Deferred.Value<T>;
}

export namespace Deferred {
  export {
    // Methods
    deferred_imap as imap,
    deferred_get as get,
    deferred_complete as complete,
  };
}
