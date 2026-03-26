/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, PartialApply } from "hkt-core";

import type { Deferred } from "../core/Deferred";
import {
  deriveComplete as completeDeferred,
  deriveGet as deriveGetDeferred,
} from "../core/Deferred";
import type { Fiber } from "../core/Fiber";
import { deriveAwait as deriveAwaitFiber, deriveCancel as deriveCancelFiber } from "../core/Fiber";
import type { Outcome, OutcomeHKT } from "../core/Outcome";
import type { Ref } from "../core/Ref";
import {
  deriveGet as deriveGetRef,
  deriveModify as deriveModifyRef,
  deriveUpdate as deriveUpdateRef,
} from "../core/Ref";
import { CancellationError } from "../errors";
import { AggregateError } from "../internal/polyfill";
import type { PickRaw } from "../utils";

import type { Spawn } from "./Spawn";

export interface Concurrent<in out F extends HKT<unknown, unknown>, in out Err> extends Spawn<
  F,
  Err
> {}

// ╔═════╗
// ║ ref ║
// ╚═════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Creates a new mutable reference, which is a container for a value of type `A` that can be safely shared between fibers.
   * The value inside the reference can be updated atomically, and can be read by multiple fibers concurrently.
   */
  readonly ref: <A>(a: A) => Call1<F, Ref<F, A>>;
}

// ╔══════════╗
// ║ deferred ║
// ╚══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Creates a new deferred value, which is a placeholder for a value that may not yet be available.
   * Deferred values can be completed exactly once, and can be used to coordinate between fibers.
   */
  readonly deferred: <A>() => Call1<F, Deferred<F, A>>;
}

// ╔═════════╗
// ║ memoize ║
// ╚═════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Caches the result of an effect.
   *
   * The first time the returned effect is run, it will run the original effect and cache its result.
   * Subsequent runs will return the cached result or wait for the original effect to complete if it is still running.
   *
   * If all runs of the returned effect are cancelled before the original effect completes, the original effect will be cancelled and the cache will be cleared.
   */
  readonly memoize: <A>(fa: Call1<F, A>) => Call1<F, Call1<F, A>>;
}

// Adapted from the `GenConcurrent.memoize` implementation in Cats Effect 3:
// https://github.com/typelevel/cats-effect/blob/5d101154023e7d80095c63d6e057b6fbab0d5c88/kernel/shared/src/main/scala/cats/effect/kernel/GenConcurrent.scala#L43-L112
export const deriveMemoize = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "map"
    | "of"
    | "void"
    | "productR"
    | "flatten"
    | "flatMap"
    | "throw"
    | "catch"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "forkGlobal"
    | "never"
    | "ref"
    | "deferred"
  >,
): Concurrent<F, Err>["memoize"] => {
  const Fiber = {
    await: deriveAwaitFiber<F, Err>(),
    cancel: deriveCancelFiber<F, Err>(),
  };

  const Ref = {
    get: deriveGetRef<F>(),
    modify: deriveModifyRef<F>(),
    update: deriveUpdateRef<F>(),
  };

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  };

  return function memoize<A>(fa: Call1<F, A>): Call1<F, Call1<F, A>> {
    type State =
      | { readonly _tag: "Unevaluated" }
      | {
          readonly _tag: "Evaluating";
          readonly _0: Deferred<F, Fiber<F, Err, A>>;
          readonly _1: /* subscribers */ number;
        }
      | { readonly _tag: "Evaluated"; readonly _0: [Finished?: Call1<F, A>, Failed?: Err] };

    return F.map(F.ref<State>({ _tag: "Unevaluated" }), (stateRef) => {
      const unsubscribe = (expected: Deferred<F, Fiber<F, Err, A>>): Call1<F, void> =>
        F.flatten(
          Ref.modify<State, Call1<F, void>>(stateRef, (state) =>
            state._tag === "Evaluating" && state._0 === expected ?
              state._1 === 1 ?
                [F.flatMap(Deferred.get(state._0), Fiber.cancel), { _tag: "Unevaluated" }]
              : [F.void(), { _tag: "Evaluating", _0: state._0, _1: state._1 - 1 }]
            : [F.void(), state],
          ),
        );

      const evaluateOrSubscribe = F.flatMap(F.deferred<Fiber<F, Err, A>>(), (deferredFiber) =>
        F.uncancellable((poll) =>
          F.flatten(
            Ref.modify<State, Call1<F, A>>(stateRef, (state) => {
              switch (state._tag) {
                case "Unevaluated": {
                  const tryComplete = (result: State): Call1<F, void> =>
                    Ref.update<State>(stateRef, (state) =>
                      state._tag === "Evaluating" && state._0 === deferredFiber ? result : state,
                    );

                  const go = F.guaranteeCase(
                    // Hack around functor law breakage
                    F.catch(F.flatMap(fa, F.of), F.throw),
                    // End hack
                    (outcome) =>
                      tryComplete({
                        _tag: "Evaluated",
                        _0:
                          outcome._tag === "Succeeded" ? [outcome._0]
                            // eslint-disable-next-line no-sparse-arrays
                          : outcome._tag === "Failed" ? [, outcome._0]
                          : [F.productR(F.cancelled(), F.never())],
                      }),
                  );

                  const evaluate: Call1<F, A> = F.flatMap(F.forkGlobal(go), (fiber) =>
                    F.productR(
                      Deferred.complete(deferredFiber, fiber),
                      F.onCancel(
                        poll<A>(
                          F.flatMap(Fiber.await(fiber), (outcome) =>
                            outcome._tag === "Succeeded" ? outcome._0
                            : outcome._tag === "Failed" ? F.throw(outcome._0)
                            : F.productR(F.cancelled(), F.never()),
                          ),
                        ),
                        unsubscribe(deferredFiber),
                      ),
                    ),
                  );

                  return [evaluate, { _tag: "Evaluating", _0: deferredFiber, _1: 1 }];
                }

                case "Evaluating":
                  return [
                    F.onCancel(
                      poll<A>(
                        F.flatMap(F.flatMap(Deferred.get(state._0), Fiber.await), (outcome) =>
                          outcome._tag === "Succeeded" ? outcome._0
                          : outcome._tag === "Failed" ? F.throw(outcome._0)
                          : F.productR(F.cancelled(), F.never()),
                        ),
                      ),
                      unsubscribe(state._0),
                    ),
                    { _tag: "Evaluating", _0: state._0, _1: state._1 + 1 },
                  ];

                case "Evaluated":
                  return [0 in state._0 ? state._0[0] : F.throw(state._0[1]!), state];
              }
            }),
          ),
        ),
      );

      return F.flatMap(Ref.get(stateRef), (state) =>
        state._tag === "Evaluated" ?
          0 in state._0 ?
            state._0[0]
          : F.throw(state._0[1]!)
        : evaluateOrSubscribe,
      );
    });
  };
};

// ╔═════╗
// ║ all ║
// ╚═════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Runs a collection of effects concurrently and returns a tuple of their results.
   *
   * 1. If all effects succeed, the result will be a tuple of their values.
   * 2. If any effect fails, the result will be a failure with the error of the first effect that fails, and all other effects will be cancelled if they are still running.
   * 3. If any effect is cancelled and the resulting effect is not in an uncancellable region, the result will be a cancellation, and all other effects will be cancelled if they are still running.
   * 4. If any effect is cancelled and the resulting effect is in an uncancellable region, the resulting effect will block indefinitely, and all other effects will be cancelled if they are still running.
   */
  readonly all: <const FAS extends Iterable<Call1<F, any>>>(
    fas: FAS,
  ) => Call1<
    F,
    FAS extends readonly unknown[] ?
      { readonly [I in keyof FAS]: FAS[I] extends Call1<F, infer A> ? A : never }
    : FAS extends Iterable<Call1<F, infer A>> ? readonly A[]
    : never
  >;
}

/**
 * Recognizes a trusted direct-success effect by its representation tag.
 *
 * `Concurrent.all` (and its variants) fast-paths any input whose `_tag` is `"Pure"`:
 * its value is already known without executing user code, so the input fills its slot synchronously and skips forking a child fiber.
 * The check is a single property read; runtimes that do not use this tag degrade gracefully - every input simply forks as before.
 *
 * `null` and `undefined` are never `Pure`, so an iterable that yields them cannot crash the check.
 * See docs/performance.md "Immediate-Result Fast Path".
 */
const isPure = (u: unknown): u is { readonly _tag: "Pure"; readonly _0: unknown } =>
  u != null &&
  typeof u === "object" &&
  "_0" in u &&
  (u as { readonly _tag?: unknown })._tag === "Pure";

export const deriveAll = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "map"
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatten"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "never"
    | "deferred"
  >,
): Concurrent<F, Err>["all"] => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function all<A>(fas: Iterable<Call1<F, A>>): Call1<F, readonly A[]> {
    type Result = {
      readonly _0: /* inner effect */ Call1<F, readonly A[]>;
      readonly _1: /* should cancel pending fibers */ boolean;
    };

    const cancelPendingFibers = (
      slots: readonly (A | Fiber<F, Err, A> | undefined)[],
      statuses: number[],
    ): Call1<F, void> => {
      let out: Call1<F, void> = unit;
      for (let i = 0; i < statuses.length; i++) {
        const slot = slots[i];
        if (statuses[i] === 0 && slot !== undefined)
          out = F.productR(out, Fiber.cancel(slot as Fiber<F, Err, A>));
      }
      return out;
    };

    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every guaranteeCase callback and map function atomically
      const slots: (A | Fiber<F, Err, A> | undefined)[] = [];
      const statuses: number[] = [];

      return F.flatMap(F.deferred<Result>(), (deferredResult) => {
        const complete = (result: Result): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        // Pending children; -1 once the aggregate settles.
        // Assigned wholesale right after the producer loop, before the fork chain runs,
        // so no per-child registration step is needed and no fast child can observe a partially-registered ledger.
        let count: number;

        const collect = (): Result => {
          const results: A[] = [];
          for (let j = 0; j < slots.length; j++) results[j] = slots[j] as A;
          return { _0: F.of(results), _1: false };
        };

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        // Children actually forked. Immediate (direct-success) inputs are settled
        // synchronously and never enter this count, so `count` only tracks pending forks.
        let pending = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const input: Call1<F, A> = next.value;
            slots.length = i + 1;
            statuses.length = i + 1;
            statuses[i] = 0;

            // Immediate-result fast path:
            // a direct `Pure` success fills its slot synchronously and skips forking
            if (isPure(input)) {
              slots[i] = (input as { readonly _0: A })._0;
              statuses[i] = 1;
              continue;
            }

            ++pending;
            forkChain = F.productR(
              forkChain,
              F.map(
                F.fork(
                  F.guaranteeCase(input, (outcome) => {
                    switch (outcome._tag) {
                      case "Succeeded":
                        return F.flatMap(outcome._0, (a) => {
                          slots[i] = a;
                          statuses[i] = 1;
                          if (count < 0) return unit;
                          if (--count !== 0) return unit;
                          count = -1;
                          return complete(collect());
                        });
                      case "Failed":
                        slots[i] = void 0;
                        statuses[i] = 2;
                        if (count < 0) return unit;
                        count = -1;
                        return complete({ _0: F.throw(outcome._0), _1: true });
                      case "Cancelled":
                        slots[i] = void 0;
                        statuses[i] = 2;
                        if (count < 0) return unit;
                        count = -1;
                        return complete({
                          _0: F.productR(poll(F.cancelled()), F.never()),
                          _1: true,
                        });
                    }
                  }),
                ),
                (fiber) => {
                  if (statuses[i] === 0) slots[i] = fiber;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = pending;

        if (n === 0) return producerFailed ? F.throw(producerError!) : F.of([]);

        // Direct successes need no child fibers or deferred wait
        if (!producerFailed && count === 0) return collect()._0;

        // When iteration itself fails, already-forked children are still pending,
        // so route the error through the same ledger transition a child failure uses:
        // resolve with the failure, then let the normal result path cancel whatever is still running
        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatten(
              F.map(unit, () => {
                if (count < 0) return unit;
                count = -1;
                return complete({ _0: F.throw(producerError!), _1: true });
              }),
            )
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers(slots, statuses)),
            (result) =>
              result._1 ? F.productR(cancelPendingFibers(slots, statuses), result._0) : result._0,
          ),
        );
      });
    });
  } as never;
};

// ╔══════════╗
// ║ allKeyed ║
// ╚══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Runs a record of effects concurrently and returns an object with the same keys mapping to their results.
   *
   * 1. If all effects succeed, the result will be an object whose keys are the input keys and whose values are the corresponding success values.
   * 2. If any effect fails, the result will be a failure with the error of the first effect that fails, and all other effects will be cancelled if they are still running.
   * 3. If any effect is cancelled and the resulting effect is not in an uncancellable region, the result will be a cancellation, and all other effects will be cancelled if they are still running.
   * 4. If any effect is cancelled and the resulting effect is in an uncancellable region, the resulting effect will block indefinitely, and all other effects will be cancelled if they are still running.
   */
  readonly allKeyed: <const FAS extends { readonly [K in string | symbol]: Call1<F, any> }>(
    fas: FAS,
  ) => Call1<F, { readonly [K in keyof FAS]: FAS[K] extends Call1<F, infer A> ? A : never }>;
}

export const deriveAllKeyed = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Concurrent<F, Err>, "map" | "flatMap" | "void" | "throw" | "all">,
): Concurrent<F, Err>["allKeyed"] =>
  function allKeyed<A>(fas: { readonly [K in string | symbol]: Call1<F, A> }): Call1<
    F,
    { readonly [K in string | symbol]: A }
  > {
    return F.flatMap(F.void(), () => {
      try {
        const keys = Reflect.ownKeys(fas).filter((key) =>
          Object.prototype.propertyIsEnumerable.call(fas, key),
        );
        const inputs: Call1<F, A>[] = [];
        for (const key of keys) {
          const fa = fas[key] as Call1<F, A>;
          inputs.push(fa);
        }
        const gathered = F.all(inputs) as Call1<F, readonly A[]>;
        return F.map(gathered, (values) => {
          const out = Object.create(null) as Record<string | symbol, A>;
          for (let i = 0; i < keys.length; ++i) out[keys[i]!] = values[i]!;
          return out;
        });
      } catch (e) {
        return F.throw(e as Err);
      }
    });
  };

// ╔════════════╗
// ║ allOutcome ║
// ╚════════════╝
export interface Concurrent<F, Err> {
  /**
   * Runs a collection of effects concurrently and returns a tuple of their {@linkcode Outcome}s.
   *
   * Unlike {@linkcode all}, this method does not short-circuit on failure or cancellation.
   * Instead, it waits for all effects to **complete** and collects their {@linkcode Outcome}s.
   */
  readonly allOutcome: <const FAS extends Iterable<Call1<F, any>>>(
    fas: FAS,
  ) => Call1<
    F,
    FAS extends readonly unknown[] ?
      { readonly [I in keyof FAS]: FAS[I] extends Call1<F, infer A> ? Outcome<F, Err, A> : never }
    : FAS extends Iterable<Call1<F, infer A>> ? readonly Outcome<F, Err, A>[]
    : never
  >;
}

export const deriveAllOutcome = <
  F extends HKT<unknown, unknown>,
  Err,
  FF extends HKT<unknown, Outcome<F, Err, unknown>> = PartialApply<OutcomeHKT, [F, Err]>,
>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "deferred"
  >,
  OutcomeProto: object | null = Object.prototype,
): (<const FAS extends Iterable<Call1<F, any>>>(
  fas: FAS,
) => Call1<
  F,
  FAS extends readonly unknown[] ?
    { readonly [I in keyof FAS]: FAS[I] extends Call1<F, infer A> ? Call1<FF, A> : never }
  : FAS extends Iterable<Call1<F, infer A>> ? readonly Call1<FF, A>[]
  : never
>) => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function allOutcome<A>(fas: Iterable<Call1<F, A>>): Call1<F, readonly Call1<FF, A>[]> {
    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref — see `deriveAll`:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every child callback atomically
      const settled: boolean[] = [];
      const fibers: (Fiber<F, Err, void> | undefined)[] = [];
      const outcomes: Call1<FF, A>[] = [];

      const cancelPendingFibers = (): Call1<F, void> => {
        let out: Call1<F, void> = unit;
        for (let i = 0; i < fibers.length; i++) {
          const fiber = fibers[i];
          if (fiber !== undefined && !settled[i]) out = F.productR(out, Fiber.cancel(fiber));
        }
        return out;
      };

      return F.flatMap(F.deferred<Call1<F, readonly Call1<FF, A>[]>>(), (deferredResult) => {
        const complete = (result: Call1<F, readonly Call1<FF, A>[]>): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        let completed = 0;
        // -1 once the aggregate settles; assigned wholesale right after the producer loop,
        // before the fork chain runs — see `deriveAll`
        let count: number;

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const fa: Call1<F, A> = next.value;
            settled.push(false);

            // Immediate-result fast path - see `deriveAll`.
            // A direct `Pure` success always yields a `Succeeded` outcome whose
            // success IO is the `Pure` op itself, so the slot is filled synchronously.
            if (isPure(fa)) {
              settled[i] = true;
              outcomes[i] = Object.assign(Object.create(OutcomeProto), {
                _tag: "Succeeded",
                _0: fa,
              }) as Call1<FF, A>;
              completed++;
              continue;
            }

            const onCompleted = (outcome: Call1<FF, A>): Call1<F, void> => {
              settled[i] = true;
              outcomes[i] = outcome;
              if (count < 0) return unit;
              if (++completed !== count) return unit;
              count = -1;
              return complete(F.of(outcomes.slice()));
            };

            forkChain = F.productR(
              forkChain,
              F.flatMap(
                F.fork(
                  F.asVoid(
                    F.guaranteeCase(fa, (outcome) =>
                      onCompleted(
                        Object.assign(Object.create(OutcomeProto), outcome) as Call1<FF, A>,
                      ),
                    ),
                  ),
                ),
                (fiber) => {
                  if (!settled[i]) fibers[i] = fiber;
                  return unit;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = n;

        if (n === 0) return producerFailed ? F.throw(producerError!) : F.of([]);

        // Every input resolved immediately as a direct success: nothing to fork or
        // await - see `deriveAll`. `completed` already includes all immediate settlers.
        if (!producerFailed && completed === count) return F.of(outcomes.slice());

        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatMap(unit, () => {
              if (count < 0) return unit;
              count = -1;
              return complete(F.throw(producerError!));
            })
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers()),
            (inner) => F.productR(cancelPendingFibers(), inner),
          ),
        );
      });
    });
  } as never;
};

// ╔═════╗
// ║ any ║
// ╚═════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Runs multiple effects concurrently and returns the result of the first effect that **succeeds** (whichever comes first).
   * All other effects are cancelled when one succeeds.
   *
   * 1. If any effect **succeeds**, the result is the value of the first effect that succeeds, and all other effects are cancelled if they are still running.
   * 2. If all effects fail or are cancelled, and **at least one effect fails** (rather than being cancelled), the result is a failure with an `AggregateError` containing all failure and cancellation reasons. Cancelled effects contribute a {@linkcode CancellationError}.
   * 3. If all effects are cancelled and the resulting effect is not in an uncancellable region, the result is cancellation.
   * 4. If all effects are cancelled and the resulting effect is in an uncancellable region, the resulting effect blocks indefinitely.
   */
  readonly any: <A>(fas: Iterable<Call1<F, A>>) => Call1<F, A>;
}

export const deriveAny = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "never"
    | "deferred"
  >,
): Concurrent<F, Err>["any"] => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function any<A>(fas: Iterable<Call1<F, A>>): Call1<F, A> {
    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref — see `deriveAll`:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every child callback atomically
      const settled: boolean[] = [];
      const fibers: (Fiber<F, Err, void> | undefined)[] = [];
      const reasons: unknown[] = [];

      // eslint-disable-next-line sonarjs/no-identical-functions
      const cancelPendingFibers = (): Call1<F, void> => {
        let out: Call1<F, void> = unit;
        for (let i = 0; i < fibers.length; i++) {
          const fiber = fibers[i];
          if (fiber !== undefined && !settled[i]) out = F.productR(out, Fiber.cancel(fiber));
        }
        return out;
      };

      return F.flatMap(F.deferred<Call1<F, A>>(), (deferredResult) => {
        const complete = (result: Call1<F, A>): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        let failed = 0;
        let cancelled = 0;
        // -1 once the race settles; assigned wholesale right after the producer loop,
        // before the fork chain runs — see `deriveAll`
        let count: number;

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const fa: Call1<F, A> = next.value;
            settled.push(false);

            forkChain = F.productR(
              forkChain,
              F.flatMap(
                F.fork(
                  F.asVoid(
                    F.guaranteeCase(fa, (outcome) => {
                      switch (outcome._tag) {
                        case "Succeeded":
                          return F.flatMap(outcome._0, (a) => {
                            settled[i] = true;
                            if (count < 0) return unit;
                            count = -1;
                            return complete(F.of(a));
                          });
                        case "Failed":
                          settled[i] = true;
                          reasons[i] = outcome._0;
                          if (count < 0) return unit;
                          failed++;
                          if (failed + cancelled !== count) return unit;
                          count = -1;
                          return complete(
                            F.throw(
                              new AggregateError(
                                reasons.slice(),
                                "All effects were failed or cancelled",
                              ) as Err,
                            ),
                          );
                        case "Cancelled":
                          settled[i] = true;
                          reasons[i] = new CancellationError();
                          if (count < 0) return unit;
                          cancelled++;
                          if (failed + cancelled !== count) return unit;
                          count = -1;
                          // If at least one effect failed, fail with all reasons (treating cancellations as failures);
                          // If all effects were cancelled, cancel
                          return failed > 0 ?
                              complete(
                                F.throw(
                                  new AggregateError(
                                    reasons.slice(),
                                    "All effects were failed or cancelled",
                                  ) as Err,
                                ),
                              )
                            : complete(F.productR(poll(F.cancelled()), F.never()));
                      }
                    }),
                  ),
                ),
                (fiber) => {
                  if (!settled[i]) fibers[i] = fiber;
                  return unit;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = n;

        if (n === 0)
          return producerFailed ?
              F.throw(producerError!)
            : F.throw(new AggregateError([], "All effects were failed or cancelled") as Err);

        // When iteration itself fails, route the error through the same settle step a child completion uses — see `deriveAll`
        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatMap(unit, () => {
              if (count < 0) return unit;
              count = -1;
              return complete(F.throw(producerError!));
            })
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers()),
            (inner) => F.productR(cancelPendingFibers(), inner),
          ),
        );
      });
    });
  } as never;
};

// ╔════════════╗
// ║ anyOrdered ║
// ╚════════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Runs multiple effects concurrently and returns the _earliest_ successful result **according to input order**.
   *
   * 1. If a later effect succeeds while an earlier effect is still pending, that success is ignored and execution waits for the earlier effect to complete.
   * 2. If all earlier effects fail or are cancelled, the first succeeding result among the remaining effects is returned, and all other effects are cancelled if they are still running.
   * 3. If all effects fail or are cancelled, and **at least one effect fails** (rather than being cancelled), the result is a failure with an `AggregateError` containing all failure and cancellation reasons. Cancelled effects contribute a {@linkcode CancellationError}.
   * 4. If all effects are cancelled and the resulting effect is not in an uncancellable region, the result is cancellation.
   * 5. If all effects are cancelled and the resulting effect is in an uncancellable region, the resulting effect blocks indefinitely.
   */
  readonly anyOrdered: <A>(fas: Iterable<Call1<F, A>>) => Call1<F, A>;
}

export const deriveAnyOrdered = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "never"
    | "deferred"
  >,
): Concurrent<F, Err>["anyOrdered"] => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function anyOrdered<A>(fas: Iterable<Call1<F, A>>): Call1<F, A> {
    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref — see `deriveAll`:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every child callback atomically.
      // `results` and `reasons` are sparse by index: a child is pending iff its index is absent from both
      const fibers: (Fiber<F, Err, void> | undefined)[] = [];
      const results: unknown[] = [];
      const reasons: unknown[] = [];

      const cancelPendingFibers = (): Call1<F, void> => {
        let out: Call1<F, void> = unit;
        for (let i = 0; i < fibers.length; i++) {
          const fiber = fibers[i];
          if (fiber !== undefined && !(i in results) && !(i in reasons))
            out = F.productR(out, Fiber.cancel(fiber));
        }
        return out;
      };

      return F.flatMap(F.deferred<Call1<F, A>>(), (deferredResult) => {
        const complete = (result: Call1<F, A>): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        // Index of the earliest input that has neither succeeded nor failed/cancelled yet
        let pendingIdx = 0;
        let failed = 0;
        // -1 once the race settles; assigned wholesale right after the producer loop,
        // before the fork chain runs — see `deriveAll`
        let count: number;

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const fa: Call1<F, A> = next.value;

            forkChain = F.productR(
              forkChain,
              F.flatMap(
                F.fork(
                  F.asVoid(
                    F.guaranteeCase(fa, (outcome) => {
                      switch (outcome._tag) {
                        case "Succeeded":
                          return F.flatMap(outcome._0, (a) => {
                            if (count < 0) return unit;
                            if (pendingIdx === i) {
                              count = -1;
                              return complete(F.of(a));
                            }
                            results[i] = a;
                            return unit;
                          });
                        case "Failed":
                          reasons[i] = outcome._0;
                          if (count < 0) return unit;
                          failed++;
                          while (pendingIdx in reasons) ++pendingIdx;
                          if (pendingIdx in results) {
                            count = -1;
                            return complete(F.of(results[pendingIdx] as A));
                          }
                          if (pendingIdx !== count) return unit;
                          count = -1;
                          return complete(
                            F.throw(
                              new AggregateError(
                                reasons.slice(),
                                "All effects were failed or cancelled",
                              ) as Err,
                            ),
                          );
                        case "Cancelled":
                          reasons[i] = new CancellationError();
                          if (count < 0) return unit;
                          while (pendingIdx in reasons) ++pendingIdx;
                          if (pendingIdx in results) {
                            count = -1;
                            return complete(F.of(results[pendingIdx] as A));
                          }
                          if (pendingIdx !== count) return unit;
                          count = -1;
                          // If at least one effect failed, fail with all reasons (treating cancellations as failures);
                          // if all effects were cancelled, cancel
                          return failed > 0 ?
                              complete(
                                F.throw(
                                  new AggregateError(
                                    reasons.slice(),
                                    "All effects were failed or cancelled",
                                  ) as Err,
                                ),
                              )
                            : complete(F.productR(poll(F.cancelled()), F.never()));
                      }
                    }),
                  ),
                ),
                (fiber) => {
                  if (!(i in results) && !(i in reasons)) fibers[i] = fiber;
                  return unit;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = n;

        if (n === 0)
          return producerFailed ?
              F.throw(producerError!)
            : F.throw(new AggregateError([], "All effects were failed or cancelled") as Err);

        // When iteration itself fails, route the error through the same settle step a child completion uses — see `deriveAll`
        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatMap(unit, () => {
              if (count < 0) return unit;
              count = -1;
              return complete(F.throw(producerError!));
            })
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers()),
            (inner) => F.productR(cancelPendingFibers(), inner),
          ),
        );
      });
    });
  } as never;
};

// ╔══════╗
// ║ race ║
// ╚══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Concurrent<F, Err> {
  /**
   * Runs multiple effects concurrently and returns the result of the first effect that **succeeds or fails** (whichever comes first).
   * All other effects are cancelled when one **succeeds or fails**.
   *
   * 1. If a child effect succeeds first, the race succeeds with its value, and all other effects are cancelled if they are still running.
   * 2. If a child effect fails first, the race fails with its error, and all other effects are cancelled if they are still running.
   * 3. If a child effect is cancelled, it does not win the race and the race continues with the remaining effects.
   * 4. If all effects are cancelled and the resulting effect is not in an uncancellable region, the result is cancellation.
   * 5. If all effects are cancelled and the resulting effect is in an uncancellable region, the resulting effect blocks indefinitely.
   */
  readonly race: <A>(fas: Iterable<Call1<F, A>>) => Call1<F, A>;
}

export const deriveRace = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "never"
    | "deferred"
  >,
): Concurrent<F, Err>["race"] => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function race<A>(fas: Iterable<Call1<F, A>>): Call1<F, A> {
    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref — see `deriveAll`:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every child callback atomically
      const settled: boolean[] = [];
      const fibers: (Fiber<F, Err, void> | undefined)[] = [];

      // eslint-disable-next-line sonarjs/no-identical-functions
      const cancelPendingFibers = (): Call1<F, void> => {
        let out: Call1<F, void> = unit;
        for (let i = 0; i < fibers.length; i++) {
          const fiber = fibers[i];
          if (fiber !== undefined && !settled[i]) out = F.productR(out, Fiber.cancel(fiber));
        }
        return out;
      };

      return F.flatMap(F.deferred<Call1<F, A>>(), (deferredResult) => {
        const complete = (result: Call1<F, A>): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        let cancelled = 0;
        // -1 once the race settles; assigned wholesale right after the producer loop,
        // before the fork chain runs — see `deriveAll`
        let count: number;

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const fa: Call1<F, A> = next.value;
            settled.push(false);

            forkChain = F.productR(
              forkChain,
              F.flatMap(
                F.fork(
                  F.asVoid(
                    F.guaranteeCase(fa, (outcome) => {
                      switch (outcome._tag) {
                        case "Succeeded":
                          return F.flatMap(outcome._0, (a) => {
                            settled[i] = true;
                            if (count < 0) return unit;
                            count = -1;
                            return complete(F.of(a));
                          });
                        case "Failed":
                          settled[i] = true;
                          if (count < 0) return unit;
                          count = -1;
                          return complete(F.throw(outcome._0));
                        case "Cancelled":
                          settled[i] = true;
                          if (count < 0) return unit;
                          cancelled++;
                          if (cancelled !== count) return unit;
                          count = -1;
                          return complete(F.productR(poll(F.cancelled()), F.never()));
                      }
                    }),
                  ),
                ),
                (fiber) => {
                  if (!settled[i]) fibers[i] = fiber;
                  return unit;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = n;

        if (n === 0)
          return producerFailed ?
              F.throw(producerError!)
            : F.productR(poll(F.cancelled()), F.never());

        // When iteration itself fails, route the error through the same settle step a child completion uses — see `deriveAll`
        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatMap(unit, () => {
              if (count < 0) return unit;
              count = -1;
              return complete(F.throw(producerError!));
            })
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers()),
            (inner) => F.productR(cancelPendingFibers(), inner),
          ),
        );
      });
    });
  } as never;
};

// ╔═════════════╗
// ║ raceOutcome ║
// ╚═════════════╝
export interface Concurrent<F, Err> {
  /**
   * Runs multiple effects concurrently and returns the {@linkcode Outcome} of the first effect that **completes**.
   * All other effects are cancelled once the winning outcome is observed.
   *
   * 1. If a child effect completes, the race completes with its {@linkcode Outcome}, and all other effects are cancelled if they are still running.
   * 2. If the input is empty and the resulting effect is not in an uncancellable region, the result is cancellation.
   * 3. If the input is empty and the resulting effect is in an uncancellable region, the resulting effect blocks indefinitely.
   */
  readonly raceOutcome: <A>(fas: Iterable<Call1<F, A>>) => Call1<F, Outcome<F, Err, A>>;
}

export const deriveRaceOutcome = <
  F extends HKT<unknown, unknown>,
  Err,
  FF extends HKT<unknown, Outcome<F, Err, unknown>> = PartialApply<OutcomeHKT, [F, Err]>,
>(
  F: PickRaw<
    Concurrent<F, Err>,
    | "as"
    | "asVoid"
    | "of"
    | "void"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "guaranteeCase"
    | "fork"
    | "never"
    | "deferred"
  >,
): (<A>(fas: Iterable<Call1<F, A>>) => Call1<F, Call1<FF, A>>) => {
  const Fiber = {
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const Deferred = {
    get: deriveGetDeferred<F>(),
    complete: completeDeferred<F>(),
  } as const;

  const unit = F.void();

  return function raceOutcome<A>(fas: Iterable<Call1<F, A>>): Call1<F, Call1<FF, A>> {
    return F.uncancellable((poll) => {
      let iterator: Iterator<Call1<F, A>>;
      try {
        iterator = fas[Symbol.iterator]();
      } catch (e) {
        return F.throw(e as Err);
      }

      // Bookkeeping lives in plain closure variables, not Ref — see `deriveAll`:
      // the producer loop below runs as synchronous JS before any child is forked,
      // and the single-threaded interpreter executes every child callback atomically
      const settled: boolean[] = [];
      const fibers: (Fiber<F, Err, void> | undefined)[] = [];

      // eslint-disable-next-line sonarjs/no-identical-functions
      const cancelPendingFibers = (): Call1<F, void> => {
        let out: Call1<F, void> = unit;
        for (let i = 0; i < fibers.length; i++) {
          const fiber = fibers[i];
          if (fiber !== undefined && !settled[i]) out = F.productR(out, Fiber.cancel(fiber));
        }
        return out;
      };

      return F.flatMap(F.deferred<Call1<F, Call1<FF, A>>>(), (deferredResult) => {
        const complete = (result: Call1<F, Call1<FF, A>>): Call1<F, void> =>
          F.asVoid(Deferred.complete(deferredResult, result));

        // -1 once the race settles; assigned wholesale right after the producer loop,
        // before the fork chain runs — see `deriveAll`
        let count: number;

        let forkChain: Call1<F, void> = unit;
        let producerFailed = false;
        let producerError: Err | undefined;
        let n = 0;
        try {
          for (;;) {
            const next = iterator.next();
            if (next.done) break;

            const i = n++;
            const fa: Call1<F, A> = next.value;
            settled.push(false);

            const onCompleted = (outcome: Call1<FF, A>): Call1<F, void> => {
              settled[i] = true;
              if (count < 0) return unit;
              count = -1;
              return complete(F.of(outcome));
            };

            forkChain = F.productR(
              forkChain,
              F.flatMap(
                F.fork(
                  F.asVoid(F.guaranteeCase(fa, (outcome) => onCompleted(outcome as Call1<FF, A>))),
                ),
                (fiber) => {
                  if (!settled[i]) fibers[i] = fiber;
                  return unit;
                },
              ),
            );
          }
        } catch (e) {
          producerFailed = true;
          producerError = e as Err;
        }

        count = n;

        if (n === 0)
          return producerFailed ?
              F.throw(producerError!)
            : F.productR(poll(F.cancelled()), F.never());

        // When iteration itself fails, route the error through the same settle step a child completion uses — see `deriveAll`
        const producerSettled: Call1<F, void> =
          producerFailed ?
            F.flatMap(unit, () => {
              if (count < 0) return unit;
              count = -1;
              return complete(F.throw(producerError!));
            })
          : unit;

        return F.flatMap(F.productR(producerSettled, forkChain), () =>
          F.flatMap(
            F.onCancel(poll(Deferred.get(deferredResult)), cancelPendingFibers()),
            (inner) => F.productR(cancelPendingFibers(), inner),
          ),
        );
      });
    });
  } as never;
};
