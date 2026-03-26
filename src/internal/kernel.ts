/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @module
 * @private
 * @internal
 */

import type { Call1, HKT, PartialApply, RawArg0, RawTArg, TypeLambdaG } from "hkt-core";

import type { Fiber, FiberHKT } from "../core/Fiber";
import { deriveUnsafeCreate as deriveUnsafeCreateFiber } from "../core/Fiber";
import type { Outcome, OutcomeHKT } from "../core/Outcome";
import { CancellationError } from "../errors";

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------
/** @internal */
export const deriveOf = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function of<A>(a: A): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
    out._tag = "Pure";
    out._0 = a;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveThrow = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function throw_<A = never>(e: unknown): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Error">>;
    out._tag = "Error";
    out._0 = e;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveMap = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function map<A, B>(self: Call1<F, A>, f: (a: A) => B): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "Map">>;
    out._tag = "Map";
    out._0 = self as Op<A>;
    out._1 = f;
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveAs = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function as<A, B>(self: Call1<F, A>, b: B): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "As">>;
    out._tag = "As";
    out._0 = self as Op<A>;
    out._1 = b;
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveAp = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function ap<A, B>(fab: Call1<F, (a: NoInfer<A>) => B>, fa: Call1<F, A>): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "FlatMap">>;
    out._tag = "FlatMap";
    out._0 = fab as Op<(a: NoInfer<A>) => B>;
    out._1 = (f: (a: NoInfer<A>) => B) => ({ _tag: "Map", _0: fa as Op<A>, _1: (a: A) => f(a) });
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveProduct = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function flatMap<A, B>(self: Call1<F, A>, that: Call1<F, B>): Call1<F, readonly [A, B]> {
    const out = Object.create(Proto) as Writable<Narrow<Op<readonly [A, B]>, "FlatMap">>;
    out._tag = "FlatMap";
    out._0 = self as Op<A>;
    out._1 = (a: A) => ({ _tag: "Map", _0: that as Op<B>, _1: (b: B) => [a, b] });
    return out as Call1<F, readonly [A, B]>;
  };

/** @internal */
export const deriveProductR = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function productR<A, B>(self: Call1<F, A>, that: Call1<F, B>): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "Then">>;
    out._tag = "Then";
    out._0 = self as Op<A>;
    out._1 = that as Op<B>;
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveFlatten = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function flatten<A>(self: Call1<F, Call1<F, A>>): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Flatten">>;
    out._tag = "Flatten";
    out._0 = self as Op<Op<A>>;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveFlatMap = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function flatMap<A, B>(self: Call1<F, A>, f: (a: A) => Call1<F, B>): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "FlatMap">>;
    out._tag = "FlatMap";
    out._0 = self as Op<A>;
    out._1 = f as (a: A) => Op<B>;
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveZip = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function zip<A, B>(self: Call1<F, A>, that: Call1<F, B>): Call1<F, readonly [A, B]> {
    const out = Object.create(Proto) as Writable<Narrow<Op<readonly [A, B]>, "FlatMap">>;
    out._tag = "FlatMap";
    out._0 = self as Op<A>;
    out._1 = (a: A) => ({
      _tag: "Map",
      _0: that as Op<B>,
      _1: (b: B) => [a, b] as const,
    });
    return out as Call1<F, readonly [A, B]>;
  };

/** @internal */
export const deriveZipR = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function zipR<A, B>(self: Call1<F, A>, that: Call1<F, B>): Call1<F, B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<B>, "Then">>;
    out._tag = "Then";
    out._0 = self as Op<A>;
    out._1 = that as Op<B>;
    return out as Call1<F, B>;
  };

/** @internal */
export const deriveCatch = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function catch_<A, B>(self: Call1<F, A>, handler: (e: unknown) => Call1<F, B>): Call1<F, A | B> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A | B>, "Catch">>;
    out._tag = "Catch";
    out._0 = self as Op<A>;
    out._1 = handler as (e: unknown) => Op<B>;
    return out as Call1<F, A | B>;
  };

/** @internal */
export const deriveSync = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function sync<A>(thunk: () => A): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Sync">>;
    out._tag = "Sync";
    out._0 = thunk;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveSuspend = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function suspend<A>(thunk: () => Call1<F, A>): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Suspend">>;
    out._tag = "Suspend";
    out._0 = thunk as () => Op<A>;
    return out as Call1<F, A>;
  };

function $<A>(a: A): Iterable<A> {
  return {
    [Symbol.iterator]() {
      let called = false;
      return {
        next: (value) =>
          called ? { done: true, value } : ((called = true), { done: false, value: a }),
      };
    },
  };
}

/** @internal */
export const deriveGen = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function gen<A>(
    f: (
      $: <X>(fa: Call1<F, X>) => Iterable<Call1<F, X>, X, unknown>,
    ) => Iterable<Call1<F, unknown>, A, unknown>,
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Gen">>;
    out._tag = "Gen";
    out._0 = () => f($) as Iterable<Op, A, unknown>;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveCont = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function cont<X, A = X>(
    cont: (succeed: (a: X) => void, fail: (e: unknown) => void, get: Call1<F, X>) => Call1<F, A>,
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Cont">>;
    out._tag = "Cont";
    out._0 = cont as never;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveWithFiberRuntime = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  /**
   * Accesses the current fiber executing the effect.
   *
   * Takes a function that receives the current {@linkcode FiberRuntime} and returns an effect.
   *
   * **Example**
   *
   * ```typescript
   * const program = withFiberRuntime((fiber) =>
   *   println(`Current fiber ID: ${fiber.id}`),
   * );
   *
   * unsafeRun(program);
   * //> Current fiber ID: 0
   * ```
   */
  function withFiberRuntime<A>(
    withFiberRuntime: (fiber: FiberRuntime<any>) => Call1<F, A>,
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "WithFiberRuntime">>;
    out._tag = "WithFiberRuntime";
    out._0 = withFiberRuntime as (fiber: FiberRuntime<any>) => Op<A>;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveUnsafeModifyFiberLocal = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function unsafeModifyFiberLocal<A>(
    key: string | symbol,
    initial: unknown,
    f: (a: unknown) => readonly [A, unknown],
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "UnsafeModifyFiberLocal">>;
    out._tag = "UnsafeModifyFiberLocal";
    out._0 = key;
    out._1 = initial;
    out._2 = f;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveCancelled = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function cancelled(): Call1<F, void> {
    const out = Object.create(Proto) as Writable<Narrow<Op<void>, "Cancelled">>;
    out._tag = "Cancelled";
    return out as Call1<F, void>;
  };

/** @internal */
export const deriveOnCancel = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function onCancel<A>(self: Call1<F, A>, finalizer: Call1<F, void>): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "OnCancel">>;
    out._tag = "OnCancel";
    out._0 = self as Op<A>;
    out._1 = finalizer as Op<void>;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveGuaranteeCase = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) =>
  function guaranteeCase<A>(
    self: Call1<F, A>,
    finalizer: (outcome: Outcome<F, unknown, A>) => Call1<F, void>,
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "OnOutcome">>;
    out._tag = "OnOutcome";
    out._0 = self as Op<A>;
    out._1 = (outcome) => {
      const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
      result._tag = outcome._tag;
      if (outcome._tag === "Succeeded") {
        const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
        fa._tag = "Pure";
        fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
        (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
      } else if (outcome._tag === "Failed") {
        (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
      }
      return finalizer(result) as Op<void>;
    };
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveUncancellable = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  /**
   * Creates an {@linkcode IO} that cannot be cancelled.
   * This is useful for wrapping operations that should not be interrupted, such as cleanup
   * tasks or finalization logic.
   *
   * `poll` can be used to mark a region of code as cancellable.
   *
   * **Example**
   *
   * ```typescript
   * interface FileHandle {
   *   readLine: () => IO<string>;
   *   close: () => IO<void>;
   * }
   *
   * function acquireResource(): IO<FileHandle> {
   *   return as(
   *     zipR(
   *       zipR(log("Acquiring resource..."), sleep(1000)),
   *       log("Resource acquired"),
   *     ),
   *     {
   *       readLine: () => as(sleep(2000), "line"),
   *       close: () => log("File closed"),
   *     },
   *   );
   * }
   *
   * function releaseResource(handle: FileHandle): IO<void> {
   *   return flatMap(zipR(log("Releasing resource..."), sleep(1000)), () =>
   *     handle.close(),
   *   );
   * }
   *
   * const program = uncancellable((poll) =>
   *   flatMap(acquireResource(), (handle) =>
   *     flatTap(
   *       onCancel(poll(flatMap(handle.readLine(), log)), releaseResource(handle)),
   *       () => releaseResource(handle),
   *     ),
   *   ),
   * );
   *
   * unsafeRun(program);
   * //> [2025-09-09 11:24:00.000] [info] [fiber #0] Acquiring resource...
   * //> [2025-09-09 11:24:01.000] [info] [fiber #0] Resource acquired
   * // (if not cancelled within 2 seconds)
   * //> [2025-09-09 11:24:03.000] [info] [fiber #0] line
   * // (should always run even if cancelled)
   * //> [2025-09-09 11:24:03.000] [info] [fiber #0] Releasing resource...
   * //> [2025-09-09 11:24:04.000] [info] [fiber #0] Resource released
   * ```
   */
  function uncancellable<A>(
    body: (poll: <X>(io: Call1<F, X>) => Call1<F, X>) => Call1<F, A>,
  ): Call1<F, A> {
    const out = Object.create(Proto) as Writable<Narrow<Op<A>, "Uncancellable">>;
    out._tag = "Uncancellable";
    out._0 = body as unknown as typeof out._0;
    return out as Call1<F, A>;
  };

/** @internal */
export const deriveMonotonic = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function monotonic(): Call1<F, number> {
    const out = Object.create(Proto) as Writable<Narrow<Op<number>, "Monotonic">>;
    out._tag = "Monotonic";
    return out as Call1<F, number>;
  };

/** @internal */
export const deriveRealTime = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function realTime(): Call1<F, number> {
    const out = Object.create(Proto) as Writable<Narrow<Op<number>, "RealTime">>;
    out._tag = "RealTime";
    return out as Call1<F, number>;
  };

/** @internal */
export const deriveSleep = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function sleep(ms: number): Call1<F, void> {
    const out = Object.create(Proto) as Writable<Narrow<Op<void>, "Sleep">>;
    out._tag = "Sleep";
    out._0 = ms;
    return out as Call1<F, void>;
  };

/** @internal */
export const deriveNever = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function never(): Call1<F, never> {
    const out = Object.create(Proto) as Writable<Narrow<Op<never>, "Never">>;
    out._tag = "Never";
    return out as Call1<F, never>;
  };

/** @internal */
export const deriveCede = <F extends HKT<unknown, unknown> = OpHKT>(
  Proto: object | null = Object.prototype,
) =>
  function cede(): Call1<F, void> {
    const out = Object.create(Proto) as Writable<Narrow<Op<void>, "Cede">>;
    out._tag = "Cede";
    return out as Call1<F, void>;
  };

/** @internal */
export const deriveFork = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Fiber<F, unknown, unknown>> = PartialApply<FiberHKT, [F, unknown]>,
>(
  Proto: object | null = Object.prototype,
  FiberProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) => {
  const unsafeCreateFiber = deriveUnsafeCreateFiber<F, unknown, FF>(FiberProto);

  return function fork<A>(self: Call1<F, A>): Call1<F, Call1<FF, A>> {
    const out = Object.create(Proto) as Writable<Narrow<Op<Call1<FF, A>>, "WithFiberRuntime">>;
    out._tag = "WithFiberRuntime";
    out._0 = (parent) => ({
      _tag: "Sync",
      _0: () => {
        const fiber = new FiberRuntime<A>(parent.options, self as Op<A>, parent);
        fiber.schedule();
        const handle = unsafeCreateFiber<A>({
          join: () => {
            // Completed-fiber join fast path
            const outcome = fiber.outcome;
            if (outcome) {
              const out = Object.create(Proto) as Writable<Op<A>>;
              if (outcome._tag === "Succeeded") {
                out._tag = "Pure";
                (out as Narrow<typeof out, "Pure">)._0 = (outcome._0 as Narrow<Op<A>, "Pure">)._0;
              } else if (outcome._tag === "Failed") {
                out._tag = "Error";
                (out as Narrow<typeof out, "Error">)._0 = outcome._0;
              } else {
                out._tag = "Then";
                (out as Narrow<typeof out, "Then">)._0 = { _tag: "Cancelled" };
                (out as Narrow<typeof out, "Then">)._1 = { _tag: "Never" };
              }
              return out as Call1<F, A>;
            }
            const out = Object.create(Proto) as Writable<Narrow<Op<A>, "FlatMap">>;
            out._tag = "FlatMap";
            out._0 = fiber.await();
            out._1 = (outcome: Outcome<OpHKT, unknown, A>): Op<A> =>
              outcome._tag === "Succeeded" ? outcome._0
              : outcome._tag === "Failed" ? { _tag: "Error", _0: outcome._0 }
              : { _tag: "Then", _0: { _tag: "Cancelled" }, _1: { _tag: "Never" } };
            return out as Call1<F, A>;
          },
          await: () => {
            const out = Object.create(Proto) as Writable<Narrow<Op<Outcome<F, unknown, A>>, "Map">>;
            out._tag = "Map";
            out._0 = fiber.await();
            out._1 = (outcome: Outcome<OpHKT, unknown, A>): Outcome<F, unknown, A> => {
              const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
              result._tag = outcome._tag;
              if (outcome._tag === "Succeeded") {
                const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
                fa._tag = "Pure";
                fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
                (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
              } else if (outcome._tag === "Failed") {
                (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
              }
              return result;
            };
            return out as Call1<F, Outcome<F, unknown, A>>;
          },
          cancel: () => Object.assign(Object.create(Proto), fiber.cancel()) as Call1<F, void>,
        });
        (handle as { _runtime?: FiberRuntime<A> })._runtime = fiber;
        return handle;
      },
    });
    return out as Call1<F, Call1<FF, A>>;
  };
};

/** @internal */
export const deriveForkGlobal = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Fiber<F, unknown, unknown>> = PartialApply<FiberHKT, [F, unknown]>,
>(
  Proto: object | null = Object.prototype,
  FiberProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) => {
  const unsafeCreateFiber = deriveUnsafeCreateFiber<F, unknown, FF>(FiberProto);

  return function forkGlobal<A>(self: Call1<F, A>): Call1<F, Call1<FF, A>> {
    const out = Object.create(Proto) as Writable<Narrow<Op<Call1<FF, A>>, "WithFiberRuntime">>;
    out._tag = "WithFiberRuntime";
    out._0 = (parent) => ({
      _tag: "Sync",
      _0: () => {
        const fiber = new FiberRuntime<A>(parent.options, self as Op<A>, null, parent);
        fiber.schedule();
        const handle = unsafeCreateFiber<A>({
          join: () => {
            // Completed-fiber join fast path
            const outcome = fiber.outcome;
            if (outcome) {
              const out = Object.create(Proto) as Writable<Op<A>>;
              if (outcome._tag === "Succeeded") {
                out._tag = "Pure";
                (out as Narrow<typeof out, "Pure">)._0 = (outcome._0 as Narrow<Op<A>, "Pure">)._0;
              } else if (outcome._tag === "Failed") {
                out._tag = "Error";
                (out as Narrow<typeof out, "Error">)._0 = outcome._0;
              } else {
                out._tag = "Then";
                (out as Narrow<typeof out, "Then">)._0 = { _tag: "Cancelled" };
                (out as Narrow<typeof out, "Then">)._1 = { _tag: "Never" };
              }
              return out as Call1<F, A>;
            }
            const out = Object.create(Proto) as Writable<Narrow<Op<A>, "FlatMap">>;
            out._tag = "FlatMap";
            out._0 = fiber.await();
            out._1 = (outcome: Outcome<OpHKT, unknown, A>): Op<A> =>
              outcome._tag === "Succeeded" ? outcome._0
              : outcome._tag === "Failed" ? { _tag: "Error", _0: outcome._0 }
              : { _tag: "Then", _0: { _tag: "Cancelled" }, _1: { _tag: "Never" } };
            return out as Call1<F, A>;
          },
          await: () => {
            const out = Object.create(Proto) as Writable<Narrow<Op<Outcome<F, unknown, A>>, "Map">>;
            out._tag = "Map";
            out._0 = fiber.await();
            out._1 = (outcome: Outcome<OpHKT, unknown, A>): Outcome<F, unknown, A> => {
              const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
              result._tag = outcome._tag;
              if (outcome._tag === "Succeeded") {
                const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
                fa._tag = "Pure";
                fa._0 = (outcome._0 as Narrow<Op<A>, "Pure">)._0;
                (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
              } else if (outcome._tag === "Failed") {
                (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
              }
              return result;
            };
            return out as Call1<F, Outcome<F, unknown, A>>;
          },
          cancel: () => Object.assign(Object.create(Proto), fiber.cancel()) as Call1<F, void>,
        });
        (handle as { _runtime?: FiberRuntime<A> })._runtime = fiber;
        return handle;
      },
    });
    return out as Call1<F, Call1<FF, A>>;
  };
};

/** @internal */
export const deriveRacePair = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Fiber<F, unknown, unknown>> = PartialApply<FiberHKT, [F, unknown]>,
  FO extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  Proto: object | null = Object.prototype,
  FiberProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) => {
  const unsafeCreateFiber = deriveUnsafeCreateFiber<F, unknown, FF>(FiberProto);

  return function racePair<A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ): Call1<F, readonly [Call1<FO, A>, Call1<FF, B>] | readonly [Call1<FF, A>, Call1<FO, B>]> {
    const out = Object.create(Proto) as Writable<
      Extract<
        Op<readonly [Call1<FO, A>, Call1<FF, B>] | readonly [Call1<FF, A>, Call1<FO, B>]>,
        { _tag: "Cont" }
      >
    >;
    out._tag = "Cont";
    out._0 = (succeed, _fail, get) => ({
      _tag: "Uncancellable",
      _0: (poll) => ({
        _tag: "FlatMap",
        _0: {
          _tag: "WithFiberRuntime",
          _0: (parent) => ({
            _tag: "Sync",
            _0: (): Op<void> => {
              const fiberA = new FiberRuntime<A>(
                parent.options,
                left as Op<A>,
                parent,
                parent,
                (outcome) => {
                  const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
                  result._tag = outcome._tag;
                  if (outcome._tag === "Succeeded") {
                    const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
                    fa._tag = "Pure";
                    fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
                    (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
                  } else if (outcome._tag === "Failed") {
                    (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
                  }
                  const handle = unsafeCreateFiber<B>({
                    join: () => {
                      // Completed-fiber join fast path
                      const outcome = fiberB.outcome;
                      if (outcome) {
                        const out = Object.create(Proto) as Writable<Op<B>>;
                        if (outcome._tag === "Succeeded") {
                          out._tag = "Pure";
                          (out as Narrow<typeof out, "Pure">)._0 = (
                            outcome._0 as Narrow<typeof outcome._0, "Pure">
                          )._0;
                        } else if (outcome._tag === "Failed") {
                          out._tag = "Error";
                          (out as Narrow<typeof out, "Error">)._0 = outcome._0;
                        } else {
                          out._tag = "Then";
                          (out as Narrow<typeof out, "Then">)._0 = { _tag: "Cancelled" };
                          (out as Narrow<typeof out, "Then">)._1 = { _tag: "Never" };
                        }
                        return out as Call1<F, B>;
                      }
                      const out = Object.create(Proto) as Writable<Narrow<Op<B>, "FlatMap">>;
                      out._tag = "FlatMap";
                      out._0 = fiberB.await();
                      out._1 = (outcome: Outcome<OpHKT, unknown, B>): Op<B> =>
                        outcome._tag === "Succeeded" ? outcome._0
                        : outcome._tag === "Failed" ? { _tag: "Error", _0: outcome._0 }
                        : { _tag: "Then", _0: { _tag: "Cancelled" }, _1: { _tag: "Never" } };
                      return out as Call1<F, B>;
                    },
                    await: () => {
                      const out = Object.create(Proto) as Writable<
                        Narrow<Op<Outcome<F, unknown, B>>, "Map">
                      >;
                      out._tag = "Map";
                      out._0 = fiberB.await();
                      out._1 = (outcome: Outcome<OpHKT, unknown, B>): Outcome<F, unknown, B> => {
                        const result = Object.create(OutcomeProto) as Writable<
                          Outcome<F, unknown, B>
                        >;
                        result._tag = outcome._tag;
                        if (outcome._tag === "Succeeded") {
                          const fa = Object.create(Proto) as Writable<Narrow<Op<B>, "Pure">>;
                          fa._tag = "Pure";
                          fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
                          (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, B>;
                        } else if (outcome._tag === "Failed") {
                          (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
                        }
                        return result;
                      };
                      return out as Call1<F, Outcome<F, unknown, B>>;
                    },
                    cancel: () =>
                      Object.assign(Object.create(Proto), fiberB.cancel()) as Call1<F, void>,
                  });
                  (handle as { _runtime?: FiberRuntime<B> })._runtime = fiberB;
                  succeed([result, handle] as never);
                },
              );
              const fiberB = new FiberRuntime<B>(
                parent.options,
                right as Op<B>,
                parent,
                parent,
                (outcome) => {
                  const handle = unsafeCreateFiber<A>({
                    join: () => {
                      // Completed-fiber join fast path
                      const outcome = fiberA.outcome;
                      if (outcome) {
                        const out = Object.create(Proto) as Writable<Op<A>>;
                        if (outcome._tag === "Succeeded") {
                          out._tag = "Pure";
                          (out as Narrow<typeof out, "Pure">)._0 = (
                            outcome._0 as Narrow<typeof outcome._0, "Pure">
                          )._0;
                        } else if (outcome._tag === "Failed") {
                          out._tag = "Error";
                          (out as Narrow<typeof out, "Error">)._0 = outcome._0;
                        } else {
                          out._tag = "Then";
                          (out as Narrow<typeof out, "Then">)._0 = { _tag: "Cancelled" };
                          (out as Narrow<typeof out, "Then">)._1 = { _tag: "Never" };
                        }
                        return out as Call1<F, A>;
                      }
                      const out = Object.create(Proto) as Writable<Narrow<Op<A>, "FlatMap">>;
                      out._tag = "FlatMap";
                      out._0 = fiberA.await();
                      out._1 = (outcome: Outcome<OpHKT, unknown, A>): Op<A> =>
                        outcome._tag === "Succeeded" ? outcome._0
                        : outcome._tag === "Failed" ? { _tag: "Error", _0: outcome._0 }
                        : { _tag: "Then", _0: { _tag: "Cancelled" }, _1: { _tag: "Never" } };
                      return out as Call1<F, A>;
                    },
                    await: () => {
                      const out = Object.create(Proto) as Writable<
                        Narrow<Op<Outcome<F, unknown, A>>, "Map">
                      >;
                      out._tag = "Map";
                      out._0 = fiberA.await();
                      out._1 = (outcome: Outcome<OpHKT, unknown, A>): Outcome<F, unknown, A> => {
                        const result = Object.create(OutcomeProto) as Writable<
                          Outcome<F, unknown, A>
                        >;
                        result._tag = outcome._tag;
                        if (outcome._tag === "Succeeded") {
                          const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
                          fa._tag = "Pure";
                          fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
                          (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
                        } else if (outcome._tag === "Failed") {
                          (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
                        }
                        return result;
                      };
                      return out as Call1<F, Outcome<F, unknown, A>>;
                    },
                    cancel: () =>
                      Object.assign(Object.create(Proto), fiberA.cancel()) as Call1<F, void>,
                  });
                  (handle as { _runtime?: FiberRuntime<A> })._runtime = fiberA;
                  const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, B>>;
                  result._tag = outcome._tag;
                  if (outcome._tag === "Succeeded") {
                    const fa = Object.create(Proto) as Writable<Narrow<Op<B>, "Pure">>;
                    fa._tag = "Pure";
                    fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
                    (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, B>;
                  } else if (outcome._tag === "Failed") {
                    (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
                  }
                  succeed([handle, result] as never);
                },
              );

              fiberA.schedule();
              fiberB.schedule();

              return {
                _tag: "Suspend",
                _0: (): Op<void> => {
                  fiberA.requestCancel();
                  fiberB.requestCancel();
                  return {
                    _tag: "Map",
                    _0: { _tag: "FlatMap", _0: fiberA.await(), _1: () => fiberB.await() },
                    _1: () => void 0,
                  };
                },
              };
            },
          }),
        },
        _1: (finalizer: Op<void>) => ({
          _tag: "OnCancel",
          _0: poll(
            get as Op<
              readonly [Call1<FO, A>, Call1<FF, B>] | readonly [Call1<FF, A>, Call1<FO, B>]
            >,
          ),
          _1: finalizer,
        }),
      }),
    });
    return out as Call1<
      F,
      readonly [Call1<FO, A>, Call1<FF, B>] | readonly [Call1<FF, A>, Call1<FO, B>]
    >;
  };
};

// -----------------------------------------------------------------------------
// Run functions
// -----------------------------------------------------------------------------
/** @internal */
export const deriveUnsafeRunFork = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Fiber<F, unknown, unknown>> = PartialApply<FiberHKT, [F, unknown]>,
>(
  Proto: object | null = Object.prototype,
  FiberProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) => {
  const unsafeCreateFiber = deriveUnsafeCreateFiber<F, unknown, FF>(FiberProto);

  return function unsafeRunFork<A>(
    program: Call1<F, A>,
    options: FiberRuntimeOptions = {},
  ): Call1<FF, A> {
    const fiber = new FiberRuntime<A>(options, program as Op<A>);
    fiber.run();
    const handle = unsafeCreateFiber<A>({
      join: () => {
        // Completed-fiber join fast path
        const outcome = fiber.outcome;
        if (outcome) {
          const out = Object.create(Proto) as Writable<Op<A>>;
          if (outcome._tag === "Succeeded") {
            out._tag = "Pure";
            (out as Narrow<typeof out, "Pure">)._0 = (outcome._0 as Narrow<Op<A>, "Pure">)._0;
          } else if (outcome._tag === "Failed") {
            out._tag = "Error";
            (out as Narrow<typeof out, "Error">)._0 = outcome._0;
          } else {
            out._tag = "Then";
            (out as Narrow<typeof out, "Then">)._0 = { _tag: "Cancelled" };
            (out as Narrow<typeof out, "Then">)._1 = { _tag: "Never" };
          }
          return out as Call1<F, A>;
        }
        const out = Object.create(Proto) as Writable<Narrow<Op<A>, "FlatMap">>;
        out._tag = "FlatMap";
        out._0 = fiber.await();
        out._1 = (outcome: Outcome<OpHKT, unknown, A>): Op<A> =>
          outcome._tag === "Succeeded" ? outcome._0
          : outcome._tag === "Failed" ? { _tag: "Error", _0: outcome._0 }
          : { _tag: "Then", _0: { _tag: "Cancelled" }, _1: { _tag: "Never" } };
        return out as Call1<F, A>;
      },
      await: () => {
        const out = Object.create(Proto) as Writable<Narrow<Op<Outcome<F, unknown, A>>, "Map">>;
        out._tag = "Map";
        out._0 = fiber.await();
        out._1 = (outcome: Outcome<OpHKT, unknown, A>): Outcome<F, unknown, A> => {
          const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
          result._tag = outcome._tag;
          if (outcome._tag === "Succeeded") {
            const fa = Object.create(Proto) as Writable<Narrow<Op<A>, "Pure">>;
            fa._tag = "Pure";
            fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
            (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
          } else if (outcome._tag === "Failed") {
            (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
          }
          return result;
        };
        return out as Call1<F, Outcome<F, unknown, A>>;
      },
      cancel: () => Object.assign(Object.create(Proto), fiber.cancel()) as Call1<F, void>,
    });
    (handle as { _runtime?: FiberRuntime<A> })._runtime = fiber;
    return handle;
  };
};

/** @internal */
export const deriveUnsafeRun = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  OutcomeProto: object | null = Object.prototype,
) => {
  function unsafeRun<A>(self: Call1<F, A>, onComplete?: (outcome: Call1<FF, A>) => void): void;
  function unsafeRun<A>(
    self: Call1<F, A>,
    options: FiberRuntimeOptions,
    onComplete?: (outcome: Call1<FF, A>) => void,
  ): void;
  function unsafeRun<A>(
    program: Call1<F, A>,
    optionsOrOnComplete?: FiberRuntimeOptions | ((outcome: Call1<FF, A>) => void),
    onComplete?: (outcome: Call1<FF, A>) => void,
  ): void {
    const options: FiberRuntimeOptions =
      typeof optionsOrOnComplete === "function" ? {} : optionsOrOnComplete || {};
    const onCompleteCallback =
      typeof optionsOrOnComplete === "function" ? optionsOrOnComplete : onComplete;

    const scheduler = new SyncFirstScheduler(options.scheduler || new DefaultScheduler());
    const fiber =
      onCompleteCallback ?
        new FiberRuntime<A>({ ...options, scheduler }, program as Op<A>, null, null, (outcome) => {
          const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
          result._tag = outcome._tag;
          if (outcome._tag === "Succeeded") {
            const fa = Object.create(Object.getPrototypeOf(program)) as Writable<
              Narrow<Op<A>, "Pure">
            >;
            fa._tag = "Pure";
            fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
            (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
          } else if (outcome._tag === "Failed") {
            (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
          }
          onCompleteCallback(result as Call1<FF, A>);
        })
      : new FiberRuntime<A>({ ...options, scheduler }, program as Op<A>);

    try {
      fiber.run();
      const ready = scheduler.ready!;
      for (let index = 0; index < ready.length; index++) {
        const task = ready[index]!;
        ready[index] = undefined;
        task();
      }
    } finally {
      scheduler.ready = null;
    }
  }

  return unsafeRun;
};

/** @internal */
export const deriveUnsafeRunSync = <F extends HKT<unknown, unknown> = OpHKT>() =>
  function unsafeRunSync<A>(program: Call1<F, A>, options: FiberRuntimeOptions = {}): A {
    const scheduler = new SyncFirstScheduler(options.scheduler || new DefaultScheduler());
    const fiber = new FiberRuntime<A>({ ...options, scheduler }, program as Op<A>);

    try {
      fiber.run();
      const ready = scheduler.ready!;
      for (let index = 0; index < ready.length; index++) {
        const task = ready[index]!;
        ready[index] = undefined;
        task();
      }
    } finally {
      scheduler.ready = null;
    }
    const outcome = fiber.outcome;

    if (!outcome) {
      // Cancel the fiber to cleanup resources
      new FiberRuntime(fiber.options, fiber.cancel(), null, null, null).run();
      throw new TypeError(
        "Cannot run asynchronous IO with `IO.unsafeRunSync`, use `IO.unsafeRunAsync` instead",
      );
    }

    if (outcome._tag === "Succeeded") return (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
    if (outcome._tag === "Failed") throw outcome._0;
    // Though rare, it's possible for an IO to be cancelled synchronously (via `IO.cancelled`)
    throw new CancellationError();
  };

/** @internal */
export const deriveUnsafeRunAsync = <
  F extends HKT<unknown, unknown> = OpHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  OutcomeProto: object | null = Object.prototype,
) => {
  function unsafeRunAsync<A>(
    program: Call1<F, A>,
    onComplete?: (outcome: Call1<FF, A>) => void,
  ): void;
  function unsafeRunAsync<A>(
    program: Call1<F, A>,
    options: FiberRuntimeOptions,
    onComplete?: (outcome: Call1<FF, A>) => void,
  ): void;
  function unsafeRunAsync<A>(
    program: Call1<F, A>,
    optionsOrOnComplete?: FiberRuntimeOptions | ((outcome: Call1<FF, A>) => void),
    onComplete?: (outcome: Call1<FF, A>) => void,
  ): void {
    const options: FiberRuntimeOptions =
      typeof optionsOrOnComplete === "function" ? {} : optionsOrOnComplete || {};
    const onCompleteCallback =
      typeof optionsOrOnComplete === "function" ? optionsOrOnComplete : onComplete;

    const fiber =
      onCompleteCallback ?
        new FiberRuntime<A>(options, program as Op<A>, null, null, (outcome) => {
          const result = Object.create(OutcomeProto) as Writable<Outcome<F, unknown, A>>;
          result._tag = outcome._tag;
          if (outcome._tag === "Succeeded") {
            const fa = Object.create(Object.getPrototypeOf(program)) as Writable<
              Narrow<Op<A>, "Pure">
            >;
            fa._tag = "Pure";
            fa._0 = (outcome._0 as Narrow<typeof outcome._0, "Pure">)._0;
            (result as Narrow<typeof result, "Succeeded">)._0 = fa as Call1<F, A>;
          } else if (outcome._tag === "Failed") {
            (result as Narrow<typeof result, "Failed">)._0 = outcome._0;
          }
          onCompleteCallback(result as Call1<FF, A>);
        })
      : new FiberRuntime<A>(options, program as Op<A>);
    fiber.run();
  }

  return unsafeRunAsync;
};

/** @internal */
export const deriveUnsafeRunPromise = <F extends HKT<unknown, unknown> = OpHKT>() =>
  function unsafeRunPromise<A>(
    program: Call1<F, A>,
    options: FiberRuntimeOptions = {},
  ): Promise<A> {
    return new Promise<A>((resolve, reject) =>
      new FiberRuntime<A>(options, program as Op<A>, null, null, (outcome) =>
        outcome._tag === "Succeeded" ?
          resolve((outcome._0 as Narrow<typeof outcome._0, "Pure">)._0)
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        : reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError()),
      ).run(),
    );
  };

/** @internal */
export const deriveUnsafeRunPromiseCancellable = <F extends HKT<unknown, unknown> = OpHKT>() =>
  function unsafeRunPromiseCancellable<A>(
    program: Call1<F, A>,
    options: FiberRuntimeOptions = {},
  ): {
    readonly promise: Promise<A>;
    readonly cancel: () => Promise<void>;
  } {
    let resolve!: (value: A | PromiseLike<A>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<A>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    const fiber = new FiberRuntime<A>(options, program as Op<A>, null, null, (outcome) =>
      outcome._tag === "Succeeded" ?
        resolve((outcome._0 as Narrow<typeof outcome._0, "Pure">)._0)
      : reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError()),
    );

    fiber.run();

    return {
      promise,
      cancel: () =>
        new Promise<void>((resolve, reject) =>
          new FiberRuntime(fiber.options, fiber.cancel(), null, null, (outcome) =>
            outcome._tag === "Succeeded" ?
              resolve()
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            : reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError()),
          ).run(),
        ),
    };
  };

// -----------------------------------------------------------------------------
// Scheduler
// -----------------------------------------------------------------------------
/**
 * Scheduler interface for scheduling tasks and yielding execution.
 */
export interface Scheduler {
  monotonic(): number;
  realTime(): number;
  shouldYield(currOpCount: number): boolean;
  /**
   * Must not throw; a fiber whose submission was rejected stays marked as scheduled and never runs.
   */
  scheduleTask(thunk: () => void, cede?: boolean): void;
  scheduleDelay(delayMs: number, thunk: () => void): () => void;
  acquireKeepAlive?(): () => void;
}

/**
 * Runs ordinary ready work inline until the sync-first run drains, then forwards everything to `base`.
 */
class SyncFirstScheduler implements Scheduler {
  declare public ready: ((() => void) | undefined)[] | null;
  declare private _base: Scheduler;
  declare public acquireKeepAlive?: () => () => void;

  constructor(base: Scheduler) {
    this.ready = [];
    this._base = base;
    if (base.acquireKeepAlive) this.acquireKeepAlive = () => base.acquireKeepAlive!();
  }

  public monotonic(): number {
    return this._base.monotonic();
  }

  public realTime(): number {
    return this._base.realTime();
  }

  public shouldYield(currOpCount: number): boolean {
    return this.ready ? false : this._base.shouldYield(currOpCount);
  }

  public scheduleTask(thunk: () => void, cede?: boolean): void {
    if (!cede && this.ready) this.ready.push(thunk);
    else this._base.scheduleTask(thunk, cede);
  }

  public scheduleDelay(delayMs: number, thunk: () => void): () => void {
    return this._base.scheduleDelay(delayMs, thunk);
  }
}

const scheduleMicrotask: (thunk: () => void) => void = /* @__PURE__ */ (() =>
  // @ts-expect-error - queueMicrotask may be missing in some lib targets
  typeof queueMicrotask === "function" ? queueMicrotask : (
    (thunk) => Promise.resolve().then(thunk)
  ))();
let scheduleMacrotask: (thunk: () => void) => void = /* @__PURE__ */ (() =>
  // @ts-expect-error - setImmediate is only available in Node.js
  typeof setImmediate === "function" ? setImmediate
    // @ts-expect-error - MessageChannel may be missing in some lib targets
  : typeof MessageChannel !== "undefined" ?
    (() => {
      // @ts-expect-error - MessageChannel may be missing in some lib targets
      const channel = new MessageChannel();
      let queue: (() => void)[] = [];
      channel.port1.onmessage = () => {
        const batch = queue;
        queue = [];
        let index = 0;
        try {
          while (index < batch.length) batch[index++]!();
        } finally {
          if (index < batch.length) {
            const pending = queue.length > 0;
            queue = batch.slice(index).concat(queue);
            if (!pending) channel.port2.postMessage(0);
          }
        }
      };
      return (thunk) => {
        queue.push(thunk);
        if (queue.length === 1) channel.port2.postMessage(0);
      };
    })()
    // @ts-expect-error - `setTimeout` may be missing in some lib targets
  : typeof setTimeout !== "undefined" ? (thunk) => setTimeout(thunk, 0)
    // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
  : typeof os !== "undefined" && os !== null && typeof os.setTimeout === "function" ?
    // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
    (thunk) => os.setTimeout(thunk, 0)
  : (thunk) => {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      new Function("return import('qjs:os')")()
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        .catch(new Function("return import('os')"))
        .then(
          (os: any) => {
            if (os && typeof os.setTimeout === "function") {
              scheduleMacrotask = (thunk) => os.setTimeout(thunk, 0);
              scheduleMacrotask(thunk);
            } else {
              scheduleMicrotask(thunk);
            }
          },
          // Fallback to microtask in minimal environments
          () => scheduleMicrotask(thunk),
        );
    })();

/**
 * Default implementation of the {@linkcode Scheduler} interface.
 */
export class DefaultScheduler implements Scheduler {
  declare private _maxOpCountBeforeAutoYield: number;
  declare private _maxTasksPerBatch: number;

  declare private _keepAliveLeaseCount: number;
  declare private _keepAliveCanceller: (() => void) | null;

  declare private _ready: ((() => void) | undefined)[];
  declare private _next: number;
  declare private _scheduled: boolean;

  constructor(maxOpCountBeforeAutoYield = 2048, maxTasksPerBatch = 64) {
    if (!Number.isSafeInteger(maxTasksPerBatch) || maxTasksPerBatch < 1)
      throw new RangeError("maxTasksPerBatch must be a positive safe integer");

    this._maxOpCountBeforeAutoYield = maxOpCountBeforeAutoYield;
    this._maxTasksPerBatch = maxTasksPerBatch;

    this._keepAliveLeaseCount = 0;
    this._keepAliveCanceller = null;

    this._ready = [];
    this._next = 0;
    this._scheduled = false;
  }

  public monotonic(): number {
    if (
      // @ts-expect-error - `performance` may be missing in some lib targets
      typeof performance !== "undefined" &&
      // @ts-expect-error - `performance` may be missing in some lib targets
      performance !== null &&
      // @ts-expect-error - `performance` may be missing in some lib targets
      typeof performance.now === "function"
    )
      // @ts-expect-error - `performance` may be missing in some lib targets
      return performance.now();
    if (
      // @ts-expect-error - `process` may be missing in some lib targets
      typeof process !== "undefined" &&
      // @ts-expect-error - `process` may be missing in some lib targets
      process !== null &&
      // @ts-expect-error - `process` may be missing in some lib targets
      typeof process.hrtime === "function"
    ) {
      // @ts-expect-error - `process` may be missing in some lib targets
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    }
    return Date.now();
  }

  public realTime(): number {
    return Date.now();
  }

  public shouldYield(currOpCount: number): boolean {
    return currOpCount >= this._maxOpCountBeforeAutoYield;
  }

  public scheduleTask(thunk: () => void, cede?: boolean): void {
    if (cede) {
      scheduleMacrotask(thunk);
      return;
    }

    this._ready.push(thunk);
    if (!this._scheduled) {
      this._scheduled = true;
      scheduleMicrotask(() => this._drainBatch());
    }
  }

  private _drainBatch(): void {
    try {
      for (
        let count = 0;
        count < this._maxTasksPerBatch && this._next < this._ready.length;
        count++
      ) {
        const task = this._ready[this._next]!;
        this._ready[this._next++] = undefined;
        task();
      }
    } finally {
      if (this._next === this._ready.length) {
        this._ready.length = 0;
        this._next = 0;
      } else if (this._next * 2 >= this._ready.length) {
        // Copy the remaining suffix only after consuming at least half the queue
        this._ready.splice(0, this._next);
        this._next = 0;
      }

      // Retain drain ownership until the queue is empty, even when a task throws.
      if (this._next < this._ready.length) scheduleMacrotask(() => this._drainBatch());
      else this._scheduled = false;
    }
  }

  public scheduleDelay(delayMs: number, thunk: () => void): () => void {
    let timeoutId: any = null;
    let cancelled = false;

    const runThunk = () => {
      timeoutId = null;
      if (!cancelled) thunk();
    };

    // @ts-expect-error - `setTimeout` may be missing in some lib targets
    if (typeof setTimeout !== "undefined")
      // @ts-expect-error - `setTimeout` may be missing in some lib targets
      timeoutId = setTimeout(runThunk, delayMs);
    else if (
      // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
      typeof os !== "undefined" &&
      // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
      os !== null &&
      // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
      typeof os.setTimeout === "function"
    )
      // @ts-expect-error - `setTimeout` in QuickJS is in the `os` module
      timeoutId = os.setTimeout(runThunk, delayMs);
    else
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      new Function("return import('qjs:os')")()
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        .catch(new Function("return import('os')"))
        .then(
          (os: any) => {
            if (os && typeof os.setTimeout === "function" && !cancelled)
              timeoutId = os.setTimeout(runThunk, delayMs);
          },
          () => {},
        );

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        const timeoutIdToClear = timeoutId;
        timeoutId = null;
        // @ts-expect-error - `clearTimeout` may be missing in some lib targets
        if (typeof clearTimeout !== "undefined")
          // @ts-expect-error - `clearTimeout` may be missing in some lib targets
          clearTimeout(timeoutIdToClear);
        else if (
          // @ts-expect-error - `clearTimeout` in QuickJS is in the `os` module
          typeof os !== "undefined" &&
          // @ts-expect-error - `clearTimeout` in QuickJS is in the `os` module
          os !== null &&
          // @ts-expect-error - `clearTimeout` in QuickJS is in the `os` module
          typeof os.clearTimeout === "function"
        )
          // @ts-expect-error - `clearTimeout` in QuickJS is in the `os` module
          os.clearTimeout(timeoutIdToClear);
        else
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          new Function("return import('qjs:os')")()
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            .catch(new Function("return import('os')"))
            .then(
              (os: any) => {
                if (os && typeof os.clearTimeout === "function") os.clearTimeout(timeoutIdToClear);
              },
              () => {},
            );
      }
    };
  }

  public acquireKeepAlive(): () => void {
    let released = false;

    if (this._keepAliveLeaseCount === 0) this._renewKeepAlive();
    ++this._keepAliveLeaseCount;

    return () => {
      if (released) return;
      released = true;

      if (--this._keepAliveLeaseCount === 0) {
        const cancelKeepAlive = this._keepAliveCanceller;
        this._keepAliveCanceller = null;
        if (cancelKeepAlive !== null) cancelKeepAlive();
      }
    };
  }

  private _renewKeepAlive(): void {
    this._keepAliveCanceller = this.scheduleDelay(2147483647, () => {
      this._keepAliveCanceller = null;
      if (this._keepAliveLeaseCount > 0) this._renewKeepAlive();
    });
  }
}

// -----------------------------------------------------------------------------
// Fiber runtime implementation
// -----------------------------------------------------------------------------
/**
 * Internal representation of an effectful operation in {@linkcode FiberRuntime}.
 */
export type Op<A = unknown> =
  | { readonly _tag: "EndFiber" }
  | { readonly _tag: "Pure"; readonly _0: A }
  | { readonly _tag: "Error"; readonly _0: unknown }
  | { readonly _tag: "Map"; readonly _0: Op; readonly _1: (a: any) => A }
  | { readonly _tag: "As"; readonly _0: Op; readonly _1: A }
  | { readonly _tag: "Flatten"; readonly _0: Op<Op<A>> }
  | { readonly _tag: "FlatMap"; readonly _0: Op; readonly _1: (a: any) => Op<A> }
  | { readonly _tag: "Then"; readonly _0: Op; readonly _1: Op<A> }
  | { readonly _tag: "Catch"; readonly _0: Op<A>; readonly _1: (e: unknown) => Op<A> }
  | { readonly _tag: "WithFiberRuntime"; readonly _0: (fiber: FiberRuntime<any>) => Op<A> }
  | {
      readonly _tag: "UnsafeModifyFiberLocal";
      readonly _0: string | symbol;
      readonly _1: unknown;
      readonly _2: (a: unknown) => readonly [A, unknown];
    }
  | { readonly _tag: "Cancelled" }
  | { readonly _tag: "OnCancel"; readonly _0: Op<A>; readonly _1: Op<void> }
  | {
      readonly _tag: "OnOutcome";
      readonly _0: Op<A>;
      // Use `X extends A` (instead of direct `A`) so `A` stays covariant in `Op`
      readonly _1: <X extends A>(outcome: Outcome<OpHKT, unknown, X>) => Op<void>;
    }
  | { readonly _tag: "Uncancellable"; readonly _0: (poll: <X>(io: Op<X>) => Op<X>) => Op<A> }
  | {
      readonly _tag: "Unmask";
      readonly _0: Op<A>;
      readonly _1: /* maskId */ number;
      readonly _2: /* currFiber */ FiberRuntime<any>;
    }
  | { readonly _tag: "Monotonic" }
  | { readonly _tag: "RealTime" }
  | { readonly _tag: "Sleep"; readonly _0: /* ms */ number }
  | { readonly _tag: "Never" }
  | { readonly _tag: "Sync"; readonly _0: () => A }
  | { readonly _tag: "Suspend"; readonly _0: () => Op<A> }
  | { readonly _tag: "Gen"; readonly _0: () => Iterable<Op, A, unknown> }
  | {
      readonly _tag: "Cont";
      readonly _0: <X>(succeed: (a: X) => void, fail: (e: unknown) => void, get: Op<X>) => Op<A>;
    }
  | {
      readonly _tag: "Get";
      readonly _0: readonly [Left?: unknown, Right?: unknown] | null;
    }
  | { readonly _tag: "Cede" };

export interface OpHKT extends TypeLambdaG<["A"]> {
  signature: (a: RawTArg<this, "A">) => Op<RawTArg<this, "A">>;
  return: Op<RawArg0<this>>;
}

export interface FiberRuntimeOptions {
  /**
   * The scheduler used to provide time, register delays, schedule tasks, and yield execution.
   */
  readonly scheduler?: Scheduler;
}

// Marks env objects that have been inherited by a child and
// therefore must detach on the next write instead of mutating in place
const FiberLocalEnvShared = Symbol();

let fiberId = 0;

/**
 * Internal class representing a lightweight thread (i.e., “green thread” or “coroutine”) of execution for running effects.
 * Each fiber maintains its own stack of operations and can be independently cancelled or awaited.
 *
 * Adapted from [the `IOFiber` implementation in Cats Effect 3](https://github.com/typelevel/cats-effect/blob/083a635c1194628255eea9edb81cfe2478f2b0f8/core/shared/src/main/scala/cats/effect/IOFiber.scala).
 */
export class FiberRuntime<A> {
  declare public readonly options: FiberRuntimeOptions;

  declare public readonly scheduler: Scheduler;

  declare public readonly id: number;

  declare public readonly outcome: Outcome<OpHKT, unknown, A> | null;

  declare private _stackTags: number[];
  declare private _stackArgs: unknown[];

  declare private _resumeTag: number;
  declare private _resumeOp: Op | null;
  declare private _resumed: readonly [Left?: unknown, Right?: unknown] | null;
  declare private _scheduledTag: number;
  declare private _scheduledEpoch: number;

  declare private _awaiters: (((outcome: Outcome<OpHKT, unknown, A>) => void) | undefined)[];

  declare private _finalizers: Op<void>[];
  declare private _children: (FiberRuntime<any> | null)[];
  declare private _childHoles: number;
  declare private _parentChildIndex: number;
  declare private _childrenCancelled: boolean;
  declare private _finalizing: boolean;

  declare private _cancelled: boolean;
  /** Cancellation masking depth; >0 means cancellation is masked/deferred */
  declare private _maskDepth: number;
  declare private _fiberLocalEnv: Record<string | symbol, unknown>;

  constructor(
    options: FiberRuntimeOptions,
    op: Op<A>,
    parent: FiberRuntime<any> | null = null,
    inheritFrom: FiberRuntime<any> | null = parent,
    onComplete?: ((outcome: Outcome<OpHKT, unknown, A>) => void) | null,
  ) {
    const { scheduler = new DefaultScheduler() } = options;

    this.options = options.scheduler ? options : { ...options, scheduler };
    this.scheduler = scheduler;

    this.id = fiberId++;

    this._stackTags = [];
    this._stackArgs = [];

    this._resumeTag = /* Execute */ 1;
    this._resumeOp = op;
    this._resumed = null;
    this._scheduledTag = /* NotScheduled */ 0;
    this._scheduledEpoch = 0;

    this._awaiters = onComplete ? [onComplete] : [];

    this._finalizing = false;
    this._finalizers = [];
    this._children = [];
    this._childHoles = 0;
    this._parentChildIndex = -1;
    this._childrenCancelled = false;

    this._cancelled = false;
    this._maskDepth = 0;
    // Forks inherit the current bindings structurally
    // Once an env is shared, later writes detach so parent/child keep snapshot semantics
    if (inheritFrom) {
      inheritFrom._fiberLocalEnv[FiberLocalEnvShared] = true;
      this._fiberLocalEnv = Object.create(inheritFrom._fiberLocalEnv) as Record<
        string | symbol,
        unknown
      >;
    } else {
      this._fiberLocalEnv = Object.create(null) as Record<string | symbol, unknown>;
    }

    this.outcome = null;

    if (parent) {
      if (parent.outcome) {
        this._cancelled = true;
      } else {
        this._parentChildIndex = parent._children.push(this) - 1;
        this._awaiters.push(() => {
          parent._removeChild(this._parentChildIndex);
        });
      }
    }
  }

  /**
   * Completion includes the cleanup of all attached children.
   */
  public await(): Op<Outcome<OpHKT, unknown, A>> {
    if (this.outcome) return { _tag: "Pure", _0: this.outcome };

    return {
      _tag: "Cont",
      _0: (succeed, _fail, get) => ({
        _tag: "Uncancellable",
        _0: (poll): Op<Outcome<OpHKT, unknown, A>> => ({
          _tag: "FlatMap",
          _0: {
            _tag: "Sync",
            _0: (): [Op?, Outcome<OpHKT, unknown, A>?] => {
              // eslint-disable-next-line no-sparse-arrays
              if (this.outcome) return [, this.outcome];

              const index =
                this._awaiters.push(succeed as (a: Outcome<OpHKT, unknown, A>) => void) - 1;

              return [
                {
                  _tag: "Sync",
                  _0: () => {
                    if (index < this._awaiters.length) this._awaiters[index] = void 0;
                  },
                },
              ];
            },
          },
          _1: ([finalizer, outcome]: [
            finalizer?: Op<void>,
            outcome?: Outcome<OpHKT, unknown, A>,
          ]) =>
            finalizer ?
              {
                _tag: "OnCancel",
                _0: poll(get as Op<Outcome<OpHKT, unknown, A>>),
                _1: finalizer,
              }
            : { _tag: "Pure", _0: outcome! },
        }),
      }),
    };
  }

  /**
   * Requests the cancellation of the fiber bound to this {@linkcode Fiber} handle and awaits its finalization.
   */
  public cancel(): Op<void> {
    if (this.outcome) return { _tag: "Pure", _0: void 0 };

    return {
      _tag: "Uncancellable",
      _0: (): Op<void> => {
        this.requestCancel();
        // Wait until the target fiber is fully finalized.
        return { _tag: "As", _0: this.await(), _1: void 0 };
      },
    };
  }

  /** Signals cancellation without awaiting finalization. */
  public requestCancel(): void {
    if (this.outcome) return;

    this._cancelled = true;

    if (
      this._maskDepth === 0 &&
      (this._resumeTag === /* AsyncWait */ 2 ||
        this._resumeTag === /* AutoCede */ 7 ||
        (this._resumeTag !== /* Running */ 0 && this._scheduledTag === /* NotScheduled */ 0))
    ) {
      this._resumed = null;
      this._resumeOp = null;
      this._resumeTag = /* AsyncContinueCancelled */ 5;
      this.schedule();
    }
  }

  public schedule(cede = false): void {
    if (this.outcome || this._resumeTag === /* Running */ 0) return;

    const scheduledTag = cede ? /* CedeScheduled */ 1 : /* NormalScheduled */ 2;
    const previousTag = this._scheduledTag;

    if (
      previousTag >= scheduledTag ||
      (previousTag === /* CedeScheduled */ 1 && this._resumeTag === /* Cede */ 6)
    )
      return;

    this._scheduledTag = scheduledTag;
    const scheduledEpoch = ++this._scheduledEpoch;

    this.scheduler.scheduleTask(() => {
      if (this.outcome || this._scheduledEpoch !== scheduledEpoch) return;

      this._scheduledTag = /* NotScheduled */ 0;
      this.run();
    }, cede);
  }

  public run(): void {
    const resumeTag = this._resumeTag;
    if (
      resumeTag === /* Running */ 0 ||
      resumeTag === /* AsyncWait */ 2 ||
      resumeTag === /* Completed */ 8
    )
      return;
    this._resumeTag = /* Running */ 0;
    this._scheduledTag = /* NotScheduled */ 0;
    this._scheduledEpoch++;

    switch (resumeTag) {
      case /* Execute */ 1: {
        if (this._cancelled) {
          this._complete({ _tag: "Cancelled" });
          break;
        }

        this._stackTags = [/* RunTerminus */ 8];
        this._stackArgs = [];

        const op = this._resumeOp!;
        this._resumeOp = null;
        this._runLoop(op);
        break;
      }

      case /* AsyncContinueSucceeded */ 3: {
        const a = this._resumed![0];
        this._resumed = null;
        this._runLoop(this._succeed(a));
        break;
      }

      case /* AsyncContinueFailed */ 4: {
        const e = this._resumed![1];
        this._resumed = null;
        this._runLoop(this._fail(e));
        break;
      }

      case /* AsyncContinueCancelled */ 5:
        this._runLoop(this._finalize({ _tag: "Cancelled" }));
        break;

      case /* Cede */ 6:
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        this._runLoop((this._succeed as (a: void) => Op)());
        break;

      case /* AutoCede */ 7: {
        const op = this._resumeOp!;
        this._resumeOp = null;
        this._runLoop(op);
        break;
      }
    }
  }

  // ==== Implementations of continuations ====

  private _runLoop(op: Op): void {
    let curr: Op = op;

    let currOpCount = 0;

    while (true) {
      if (curr._tag === "EndFiber") return;

      if (this.scheduler.shouldYield(currOpCount++)) {
        this._resumeTag = /* AutoCede */ 7;
        this._resumeOp = curr;
        this.schedule(/* cede */ true);
        return;
      }

      if (this._shouldFinalize()) {
        curr = this._finalize({ _tag: "Cancelled" });
        continue;
      }

      const op = curr;

      switch (op._tag) {
        case "Pure":
          curr = this._succeed(op._0);
          break;

        case "Error":
          curr = this._fail(op._0);
          break;

        case "Map":
          this._stackTags.push(/* Map */ 1);
          this._stackArgs.push(op._1);
          curr = op._0;
          break;

        case "As":
          this._stackTags.push(/* As */ 2);
          this._stackArgs.push(op._1);
          curr = op._0;
          break;

        case "Flatten":
          this._stackTags.push(/* Flatten */ 3);
          curr = op._0;
          break;

        case "FlatMap":
          this._stackTags.push(/* FlatMap */ 4);
          this._stackArgs.push(op._1);
          curr = op._0;
          break;

        case "Then":
          this._stackTags.push(/* Then */ 5);
          this._stackArgs.push(op._1);
          curr = op._0;
          break;

        case "Catch":
          this._stackTags.push(/* Catch */ 9);
          this._stackArgs.push(op._1);
          curr = op._0;
          break;

        case "WithFiberRuntime":
          try {
            curr = op._0(this);
          } catch (e) {
            curr = this._fail(e);
          }
          break;

        case "UnsafeModifyFiberLocal": {
          const env = this._fiberLocalEnv;
          const prev = op._0 in env ? env[op._0] : op._1;
          let out: unknown;
          let next: unknown;

          try {
            [out, next] = op._2(prev);
          } catch (e) {
            curr = this._fail(e);
            break;
          }

          if (prev !== next) {
            // Private envs can mutate in place;
            // Shared envs detach on write so children keep the inherited snapshot
            if (Object.prototype.hasOwnProperty.call(env, FiberLocalEnvShared)) {
              const nextEnv = Object.create(env) as Record<string | symbol, unknown>;
              nextEnv[op._0] = next;
              this._fiberLocalEnv = nextEnv;
            } else {
              env[op._0] = next;
            }
          }

          curr = this._succeed(out);
          break;
        }

        case "Cancelled":
          this._cancelled = true;
          curr =
            this._maskDepth === 0 ? this._finalize({ _tag: "Cancelled" }) : this._succeed(void 0);
          break;

        case "OnCancel":
          this._stackTags.push(/* OnCancel */ 10);
          this._finalizers.push(op._1);
          curr = op._0;
          break;

        case "OnOutcome": {
          const cancelFinalizer = {
            _tag: "Suspend",
            _0: () => op._1({ _tag: "Cancelled" }),
          } satisfies Op<void>;
          this._stackTags.push(/* OnOutcome */ 11);
          this._stackArgs.push(op._1);
          this._finalizers.push(cancelFinalizer);
          curr = op._0;
          break;
        }

        case "Uncancellable": {
          const maskId = ++this._maskDepth;
          const Proto = Object.getPrototypeOf(op);
          const poll = <X>(io: Op<X>): Op<X> => {
            const unmask = Object.create(Proto) as Writable<Narrow<Op<X>, "Unmask">>;
            unmask._tag = "Unmask";
            unmask._0 = io;
            unmask._1 = maskId;
            unmask._2 = this;
            return unmask;
          };
          try {
            curr = op._0(poll);
          } catch (e) {
            curr = { _tag: "Error", _0: e };
          }
          this._stackTags.push(/* Uncancellable */ 14);
          break;
        }

        case "Unmask":
          if (this._maskDepth === op._1 && Object.is(this, op._2)) {
            this._maskDepth--;
            this._stackTags.push(/* Unmask */ 15);
          }
          curr = op._0;
          break;

        case "Monotonic":
          curr = {
            _tag: "Sync",
            _0: () => this.scheduler.monotonic(),
          };
          break;

        case "RealTime":
          curr = {
            _tag: "Sync",
            _0: () => this.scheduler.realTime(),
          };
          break;

        case "Sleep":
          if (/* delayMs */ op._0 <= 0) {
            curr = { _tag: "Cede" };
          } else {
            curr = {
              _tag: "Cont",
              _0: (succeed, _fail, get): Op<void> => ({
                _tag: "Uncancellable",
                _0: (poll) => ({
                  _tag: "FlatMap",
                  _0: {
                    _tag: "Sync",
                    _0: (): Op<void> => ({
                      _tag: "Sync",
                      _0: this.scheduler.scheduleDelay(
                        /* delayMs */ op._0,
                        succeed as (a: void) => void,
                      ),
                    }),
                  },
                  _1: (finalizer: Op<void>) => ({
                    _tag: "OnCancel",
                    _0: poll(get as Op<void>),
                    _1: finalizer,
                  }),
                }),
              }),
            };
          }
          break;

        case "Never":
          curr = {
            _tag: "Cont",
            _0: (_succeed, _fail, get) => ({
              _tag: "Uncancellable",
              _0: (poll) => {
                let releaseKeepAlive: (() => void) | undefined;
                return {
                  _tag: "Then",
                  _0: {
                    _tag: "Sync",
                    _0: () => {
                      if (this.scheduler.acquireKeepAlive)
                        releaseKeepAlive = this.scheduler.acquireKeepAlive();
                    },
                  },
                  _1: {
                    _tag: "OnCancel",
                    _0: poll(get as Op<never>),
                    _1: {
                      _tag: "Sync",
                      _0: () => {
                        if (releaseKeepAlive) releaseKeepAlive();
                        releaseKeepAlive = void 0;
                      },
                    },
                  },
                };
              },
            }),
          };
          break;

        case "Sync": {
          let out: unknown;
          let hasError = false;
          try {
            out = op._0();
          } catch (e) {
            hasError = true;
            out = e;
          }
          curr = hasError ? this._fail(out) : this._succeed(out);
          break;
        }

        case "Suspend": {
          try {
            curr = op._0();
          } catch (e) {
            curr = this._fail(e);
          }
          break;
        }

        case "Gen": {
          let iter: Iterator<Op, unknown, unknown>;
          let result: IteratorResult<Op, unknown>;
          try {
            const iterable = op._0();
            // PERF: Avoids a `[Symbol.iterator]()` call in the common case where the iterable
            // is already an iterator. While intuitively it won't improve the performance much,
            // it actually makes a noticeable difference in our benchmarks.
            iter =
              (
                typeof iterable === "object" &&
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                iterable !== null &&
                "next" in iterable &&
                typeof (iterable as any).next === "function"
              ) ?
                (iterable as unknown as Iterator<Op, unknown, unknown>)
              : iterable[Symbol.iterator]();
            result = iter.next();
          } catch (e) {
            curr = this._fail(e);
            break;
          }

          if (result.done) {
            curr = this._succeed(result.value);
          } else {
            this._stackTags.push(/* GenStep */ 6);
            this._stackArgs.push(iter);
            curr = result.value;
          }
          break;
        }

        case "Cont": {
          const get: Writable<Narrow<Op, "Get">> = { _tag: "Get", _0: null };
          let pendingGet: typeof get | null = get;
          const resume = (resumed: readonly [Left?: unknown, Right?: unknown]): void => {
            const get = pendingGet;
            if (!get || this.outcome) return;
            pendingGet = null;
            get._0 = resumed;

            if (this._resumeTag === /* AsyncWait */ 2 && this._resumeOp === get) {
              this._resumeOp = null;

              if (this._shouldFinalize()) {
                this._resumed = null;
                this._resumeTag = /* AsyncContinueCancelled */ 5;
              } else {
                this._resumeTag =
                  0 in resumed ? /* AsyncContinueSucceeded */ 3 : /* AsyncContinueFailed */ 4;
                this._resumed = resumed;
              }

              this.schedule();
            }
          };

          try {
            curr = op._0(
              (a: unknown) => resume([a]),
              // eslint-disable-next-line no-sparse-arrays
              (e: unknown) => resume([, e]),
              get,
            );
          } catch (e) {
            curr = this._fail(e);
          }
          break;
        }

        case "Get":
          if (op._0) {
            curr = 0 in op._0 ? this._succeed(op._0[0]) : this._fail(op._0[1]);
          } else {
            this._resumeTag = /* AsyncWait */ 2;
            this._resumeOp = op;
            return;
          }
          break;

        case "Cede":
          // Yield to the event loop and continue later
          this._resumeTag = /* Cede */ 6;
          this.schedule(/* cede */ true);
          return;
      }
    }
  }

  private _complete(outcome: Outcome<OpHKT, unknown, A>): void {
    (this as Writable<typeof this>).outcome = outcome;
    this._maskDepth = 0;
    this._resumeTag = /* Completed */ 8;
    this._resumeOp = null;
    this._resumed = null;
    this._scheduledTag = /* NotScheduled */ 0;

    // Invoke awaiters in LIFO order
    while (this._awaiters.length > 0) {
      const onComplete = this._awaiters.pop();
      if (!onComplete) continue;
      try {
        onComplete(outcome);
      } catch (e) {
        try {
          // @ts-expect-error - console.error may be missing in some lib targets
          (console.error || console.log)("Uncaught error in IO fiber awaiter:", e);
        } catch (e) {
          // Ignore
        }
      }
    }

    // Clear all states to avoid any possible memory leaks
    this._stackTags = [];
    this._stackArgs = [];
    this._finalizers = [];
    for (const child of this._children) if (child) child._parentChildIndex = -1;
    this._children = [];
    this._childHoles = 0;
    this._fiberLocalEnv = Object.create(null) as Record<string | symbol, unknown>;
  }

  private _removeChild(index: number): void {
    if (index < 0) return;
    const children = this._children;
    children[index]!._parentChildIndex = -1;
    if (index === children.length - 1) {
      children.pop();
      while (children.length > 0 && children[children.length - 1] === null) {
        children.pop();
        this._childHoles--;
      }
    } else {
      children[index] = null;
      this._childHoles++;
    }
    if (this._childHoles > 64 && this._childHoles * 2 > children.length) {
      let next = 0;
      for (const child of children) {
        if (!child) continue;
        child._parentChildIndex = next;
        children[next++] = child;
      }
      children.length = next;
      this._childHoles = 0;
    }
  }

  private _shouldFinalize(): boolean {
    return this._cancelled && this._maskDepth === 0;
  }

  private _requestChildCancellation(): void {
    const children: FiberRuntime<any>[] = [];
    // Mark all before waking any: an inline scheduler can run a child's cleanup, which may wake a sibling
    for (let index = this._children.length - 1; index >= 0; index--) {
      const child = this._children[index];
      if (child && !child.outcome) {
        child._cancelled = true;
        children.push(child);
      }
    }
    for (const child of children) child.requestCancel();
  }

  private _finalize(outcome: Outcome<OpHKT, unknown, A>): Op {
    if (!this._finalizing && (this._finalizers.length > 0 || this._children.length > 0)) {
      this._finalizing = true;
      this._stackTags = [];
      this._stackArgs = [];
      ++this._maskDepth;
    }

    // Like ZIO and Effect, children are cancelled only after every resource finalizer has run
    let next: Op | null = null;
    if (this._finalizers.length > 0) {
      next = this._finalizers.pop()!;
    } else if (this._children.length > 0) {
      if (!this._childrenCancelled) {
        this._childrenCancelled = true;
        next = { _tag: "Sync", _0: () => this._requestChildCancellation() };
      } else {
        // Trailing tombstones are trimmed on removal, so the tail is always live
        const child = this._children[this._children.length - 1]!;
        this._removeChild(child._parentChildIndex);
        next = child.await();
      }
    }

    if (next) {
      this._stackTags.push(/* FinalizationLoop */ 7);
      this._stackArgs.push(outcome);
      return next;
    }
    this._complete(outcome);
    return { _tag: "EndFiber" };
  }

  private _succeed(a: unknown): Op {
    while (true) {
      switch (this._stackTags.pop()!) {
        case /* Map */ 1:
          try {
            a = (this._stackArgs.pop() as (a: unknown) => unknown)(a);
          } catch (e) {
            return this._fail(e);
          }
          break;

        case /* As */ 2:
          a = this._stackArgs.pop();
          break;

        case /* Flatten */ 3:
          return a as Op;

        case /* FlatMap */ 4:
          try {
            return (this._stackArgs.pop() as (a: unknown) => Op)(a);
          } catch (e) {
            return this._fail(e);
          }

        case /* Then */ 5:
          return this._stackArgs.pop() as Op;

        case /* GenStep */ 6: {
          const iter = this._stackArgs.pop() as Iterator<Op, unknown, unknown>;
          let result: IteratorResult<Op, unknown>;
          try {
            result = iter.next(a);
          } catch (e) {
            return this._fail(e);
          }

          if (result.done) {
            a = result.value;
            break;
          }

          this._stackTags.push(/* GenStep */ 6);
          this._stackArgs.push(iter);
          return result.value;
        }

        case /* FinalizationLoop */ 7:
          return this._finalize(this._stackArgs.pop() as Outcome<OpHKT, unknown, A>);

        case /* RunTerminus */ 8:
          return this._finalize({ _tag: "Succeeded", _0: { _tag: "Pure", _0: a as A } });

        case /* Catch */ 9:
          this._stackArgs.pop();
          break;

        case /* OnCancel */ 10:
          this._finalizers.pop();
          break;

        case /* OnOutcome */ 11: {
          this._finalizers.pop();
          const finalizer = this._stackArgs.pop() as <X>(
            outcome: Outcome<OpHKT, unknown, X>,
          ) => Op<void>;
          ++this._maskDepth;
          this._stackTags.push(/* OnOutcomeSuccessFinalizer */ 12);
          this._stackArgs.push(a);
          try {
            return finalizer({ _tag: "Succeeded", _0: { _tag: "Pure", _0: a } });
          } catch (e) {
            return this._fail(e);
          }
        }

        case /* OnOutcomeSuccessFinalizer */ 12:
          a = this._stackArgs.pop();
          --this._maskDepth;
          break;

        case /* OnOutcomeFailureFinalizer */ 13: {
          const e = this._stackArgs.pop();
          --this._maskDepth;
          return this._fail(e);
        }

        case /* Uncancellable */ 14:
          --this._maskDepth;
          break;

        case /* Unmask */ 15:
          ++this._maskDepth;
          break;
      }
    }
  }

  private _fail(e: unknown): Op {
    while (true) {
      switch (this._stackTags.pop()!) {
        case /* Map */ 1:
        case /* As */ 2:
        case /* FlatMap */ 4:
        case /* Then */ 5:
        case /* GenStep */ 6:
          this._stackArgs.pop();
          break;

        case /* Flatten */ 3:
          break;

        case /* FinalizationLoop */ 7:
          return this._finalize(this._stackArgs.pop() as Outcome<OpHKT, unknown, A>);

        case /* RunTerminus */ 8:
          return this._finalize({ _tag: "Failed", _0: e });

        case /* Catch */ 9:
          try {
            return (this._stackArgs.pop() as (e: unknown) => Op)(e);
          } catch (err) {
            e = err;
          }
          break;

        case /* OnCancel */ 10:
          this._finalizers.pop();
          break;

        case /* OnOutcome */ 11: {
          this._finalizers.pop();
          const finalizer = this._stackArgs.pop() as <X>(
            outcome: Outcome<OpHKT, unknown, X>,
          ) => Op<void>;
          ++this._maskDepth;
          this._stackTags.push(/* OnOutcomeFailureFinalizer */ 13);
          this._stackArgs.push(e);
          try {
            return finalizer({ _tag: "Failed", _0: e });
          } catch (err) {
            return this._fail(err);
          }
        }

        case /* OnOutcomeSuccessFinalizer */ 12:
          this._stackArgs.pop();
          --this._maskDepth;
          break;

        case /* OnOutcomeFailureFinalizer */ 13:
          e = this._stackArgs.pop();
          --this._maskDepth;
          break;

        case /* Uncancellable */ 14:
          --this._maskDepth;
          break;

        case /* Unmask */ 15:
          ++this._maskDepth;
          break;
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Internal type utilities
// -----------------------------------------------------------------------------
type Writable<A> = { -readonly [K in keyof A]: A[K] };

type Narrow<A, Tag extends string> = Extract<A, { _tag: Tag }>;
