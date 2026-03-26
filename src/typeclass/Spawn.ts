/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, PartialApply } from "hkt-core";

import type { Fiber } from "../core/Fiber";
import { deriveAwait as deriveAwaitFiber, deriveCancel as deriveCancelFiber } from "../core/Fiber";
import type { Outcome, OutcomeHKT } from "../core/Outcome";
import { deriveIsOutcome } from "../core/Outcome";
import type { PickRaw } from "../utils";

import type { MonadCancel } from "./MonadCancel";

export interface Spawn<in out F extends HKT<unknown, unknown>, in out Err> extends MonadCancel<
  F,
  Err
> {}

// ╔══════╗
// ║ fork ║
// ╚══════╝
export interface Spawn<F, Err> {
  /**
   * A low-level primitive for starting the concurrent evaluation of a fiber.
   * Returns a {@linkcode Fiber} that can be used to wait for a fiber or cancel it.
   *
   * There is no requirement that whether this primitive should inherit the parent fiber's cancellation behavior (i.e., the forked fiber should be automatically cancelled when the parent fiber is cancelled),
   * and it is up to the implementation to decide whether to inherit the parent fiber's cancellation behavior or not.
   * Many default implementations, such as `all` and `race`, uses this primitive to fork fibers, so whether this primitive inherits the parent fiber's cancellation behavior will affect the cancellation behavior of these default implementations as well.
   *
   * If you want to fork a fiber that is guaranteed to be independent of the parent fiber's cancellation behavior, you can use `forkGlobal` instead.
   * Note that the default implementation of `forkGlobal` is just an alias of `fork`, so if you decide to implement `fork` with inherited cancellation behavior, you must also override the default implementation of `forkGlobal` to ensure that it does not inherit the parent fiber's cancellation behavior.
   */
  readonly fork: <A>(self: Call1<F, A>) => Call1<F, Fiber<F, Err, A>>;
}

// ╔════════════╗
// ║ forkGlobal ║
// ╚════════════╝
export interface Spawn<F, Err> {
  /**
   * A low-level primitive for starting the concurrent evaluation of a fiber.
   * Returns a {@linkcode Fiber} that can be used to wait for a fiber or cancel it.
   *
   * This primitive is guaranteed to be independent of the parent fiber's cancellation behavior, meaning that the forked fiber will not be automatically cancelled when the parent fiber is cancelled.
   * This is useful for starting "background" fibers that should continue running even if the parent fiber is cancelled.
   *
   * The default implementation of this primitive is just an alias of `fork`, so if you decide to implement `fork` with inherited cancellation behavior, you must also override the default implementation of `forkGlobal` to ensure that it does not inherit the parent fiber's cancellation behavior.
   */
  readonly forkGlobal: <A>(self: Call1<F, A>) => Call1<F, Fiber<F, Err, A>>;
}

export const deriveForkGlobal = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Spawn<F, Err>, "fork">,
): Spawn<F, Err>["forkGlobal"] =>
  function forkGlobal<A>(self: Call1<F, A>) {
    return F.fork(self);
  };

// ╔═══════╗
// ║ never ║
// ╚═══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Spawn<F, Err> {
  /**
   * Creates a non-terminating effect that never completes, which causes a fiber to semantically block indefinitely.
   *
   * A fiber that is suspended in `never` can be cancelled if it is completely unmasked before it suspends:
   *
   * ```typescript
   * F.flatMap(F.fork(F.never()), Fiber.cancel) <-> F.void()
   * ```
   *
   * However, if the fiber is masked, cancellers will be semantically blocked forever:
   *
   * ```typescript
   * F.flatMap(F.fork(F.uncancellable(F.never())), Fiber.cancel) <-> F.never()
   * ```
   */
  readonly never: <A = never>() => Call1<F, A>;
}

// ╔══════╗
// ║ cede ║
// ╚══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Spawn<F, Err> {
  /**
   * Yields execution to the event loop (macrotask), improving fairness.
   * This helps long synchronous chains to cooperate with the runtime without monopolizing the current tick.
   */
  readonly cede: () => Call1<F, void>;
}

// ╔══════════╗
// ║ racePair ║
// ╚══════════╝
export interface Spawn<F, Err> {
  /**
   * A low-level primitive for racing two fibers against each other, returning the `Outcome` of the winner along with the `Fiber` of the loser.
   * The winner of the race is determined by which fiber completes first, regardless of whether it succeeds, fails, or is cancelled.
   *
   * **Important:** The losing fiber is _not_ automatically cancelled, and must be manually cancelled if it is no longer needed to avoid resource leaks.
   * It is recommended to use `race2` instead of `racePair` unless you need access to the losing fiber for some reason, as `race2` will automatically cancel the losing fibers for you.
   */
  readonly racePair: <A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ) => Call1<
    F,
    | readonly [Outcome<F, Err, A>, Fiber<F, Err, B>]
    | readonly [Fiber<F, Err, A>, Outcome<F, Err, B>]
  >;
}

// ╔══════════════╗
// ║ race2Outcome ║
// ╚══════════════╝
export interface Spawn<F, Err> {
  /**
   * Races two effects concurrently and returns the {@linkcode Outcome} of the winner.
   * The loser of the race is cancelled to avoid resource leaks.
   */
  readonly race2Outcome: <A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ) => Call1<F, Outcome<F, Err, A | B>>;
}

export const deriveRace2Outcome = <
  F extends HKT<unknown, unknown>,
  Err,
  FF extends HKT<unknown, Outcome<F, Err, unknown>> = PartialApply<OutcomeHKT, [F, Err]>,
>(
  F: PickRaw<Spawn<F, Err>, "as" | "flatMap" | "uncancellable" | "racePair">,
): (<A, B>(left: Call1<F, A>, right: Call1<F, B>) => Call1<F, Call1<FF, A | B>>) => {
  const Fiber = {
    await: deriveAwaitFiber<F, Err, FF>(),
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const isOutcome = deriveIsOutcome();

  return function race2Outcome<A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ): Call1<F, Call1<FF, A | B>> {
    return F.uncancellable((poll) =>
      F.flatMap(poll(F.racePair(left, right)), ([a, b]) =>
        isOutcome(a) ?
          F.as(Fiber.cancel(b as Fiber<F, Err, B>), a as Call1<FF, A>)
        : F.as(Fiber.cancel(a as Fiber<F, Err, A>), b as Call1<FF, B>),
      ),
    );
  };
};

// ╔═══════╗
// ║ race2 ║
// ╚═══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Spawn<F, Err> {
  /**
   * Races two effects concurrently and returns the value of the winner.
   *
   * 1. If the winner succeeds, the race returns the value of the winner, and the loser is cancelled.
   * 2. If the winner fails, the race fails with the error of the winner, and the loser is cancelled.
   * 3. If the winner is cancelled, the race returns the result of the loser, consistent with the first two cases.
   * 4. If both effects are cancelled and the resulting effect is not in an uncancellable region, the resulting effect is cancelled.
   * 5. If both effects are cancelled and the resulting effect is in an uncancellable region, the resulting effect blocks indefinitely.
   */
  readonly race2: <A, B>(left: Call1<F, A>, right: Call1<F, B>) => Call1<F, A | B>;
}

export const deriveRace2 = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Spawn<F, Err>,
    | "product"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "never"
    | "racePair"
  >,
): Spawn<F, Err>["race2"] => {
  const Fiber = {
    await: deriveAwaitFiber<F, Err>(),
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const isOutcome = deriveIsOutcome();

  return function race2<A, B>(left: Call1<F, A>, right: Call1<F, B>): Call1<F, A | B> {
    return F.uncancellable((poll) =>
      F.flatMap(poll(F.racePair(left, right)), ([a, b]) =>
        isOutcome(a) ?
          a._tag === "Succeeded" ? F.productR(Fiber.cancel(b as Fiber<F, Err, B>), a._0)
          : a._tag === "Failed" ? F.productR(Fiber.cancel(b as Fiber<F, Err, B>), F.throw(a._0))
          : F.flatMap(
              F.onCancel(
                poll(Fiber.await(b as Fiber<F, Err, B>)),
                Fiber.cancel(b as Fiber<F, Err, B>),
              ),
              (outcome) =>
                outcome._tag === "Succeeded" ? outcome._0
                : outcome._tag === "Failed" ? F.throw(outcome._0)
                : F.productR(poll(F.cancelled()), F.never()),
            )
        : (b as Outcome<F, Err, B>)._tag === "Succeeded" ?
          F.productR(
            Fiber.cancel(a as Fiber<F, Err, A>),
            (b as Extract<Outcome<F, Err, B>, { _tag: "Succeeded" }>)._0,
          )
        : (b as Outcome<F, Err, B>)._tag === "Failed" ?
          F.productR(
            Fiber.cancel(a as Fiber<F, Err, A>),
            F.throw((b as Extract<Outcome<F, Err, B>, { _tag: "Failed" }>)._0),
          )
        : F.flatMap(
            F.onCancel(
              poll(Fiber.await(a as Fiber<F, Err, A>)),
              Fiber.cancel(a as Fiber<F, Err, A>),
            ),
            (outcome) =>
              outcome._tag === "Succeeded" ? outcome._0
              : outcome._tag === "Failed" ? F.throw(outcome._0)
              : F.productR(poll(F.cancelled()), F.never()),
          ),
      ),
    );
  };
};

// ╔═════════════╗
// ║ bothOutcome ║
// ╚═════════════╝
export interface Spawn<F, Err> {
  /**
   * Runs two effects concurrently and returns a tuple of their {@linkcode Outcome}s.
   * If the resulting effect is cancelled before one or both effects complete, whichever effect that has not completed will be cancelled.
   */
  readonly bothOutcome: <A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ) => Call1<F, readonly [Outcome<F, Err, A>, Outcome<F, Err, B>]>;
}

export const deriveBothOutcome = <
  F extends HKT<unknown, unknown>,
  Err,
  FF extends HKT<unknown, Outcome<F, Err, unknown>> = PartialApply<OutcomeHKT, [F, Err]>,
>(
  F: PickRaw<Spawn<F, Err>, "map" | "flatMap" | "uncancellable" | "onCancel" | "racePair">,
): (<A, B>(
  left: Call1<F, A>,
  right: Call1<F, B>,
) => Call1<F, readonly [Call1<FF, A>, Call1<FF, B>]>) => {
  const Fiber = {
    await: deriveAwaitFiber<F, Err, FF>(),
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const isOutcome = deriveIsOutcome();

  return function bothOutcome<A, B>(
    left: Call1<F, A>,
    right: Call1<F, B>,
  ): Call1<F, readonly [Call1<FF, A>, Call1<FF, B>]> {
    return F.uncancellable((poll) =>
      F.flatMap(poll(F.racePair(left, right)), ([a, b]) =>
        isOutcome(a) ?
          F.map(
            F.onCancel(
              poll(Fiber.await(b as Fiber<F, Err, B>)),
              Fiber.cancel(b as Fiber<F, Err, B>),
            ),
            (outcome) => [a as Call1<FF, A>, outcome] as const,
          )
        : F.map(
            F.onCancel(
              poll(Fiber.await(a as Fiber<F, Err, A>)),
              Fiber.cancel(a as Fiber<F, Err, A>),
            ),
            (outcome) => [outcome, b as Call1<FF, B>] as const,
          ),
      ),
    );
  };
};

// ╔══════╗
// ║ both ║
// ╚══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Spawn<F, Err> {
  /**
   * Runs two effects concurrently and returns a tuple of their results.
   *
   * 1. If both effects succeed, the result will be a tuple of their values.
   * 2. If either effect fails, the result will be a failure with the error of the first effect that fails, and the other effect will be cancelled if it is still running.
   * 3. If either effect is cancelled and the resulting effect is not in an uncancellable region, the result will be a cancellation, and the other effect will be cancelled if it is still running.
   * 4. If either effect is cancelled and the resulting effect is in an uncancellable region, the result willing effect will block indefinitely, and the other effect will be cancelled if it is still running.
   */
  readonly both: <A, B>(left: Call1<F, A>, right: Call1<F, B>) => Call1<F, readonly [A, B]>;
}

export const deriveBoth = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Spawn<F, Err>,
    | "product"
    | "productR"
    | "flatMap"
    | "throw"
    | "uncancellable"
    | "cancelled"
    | "onCancel"
    | "never"
    | "racePair"
  >,
): Spawn<F, Err>["both"] => {
  const Fiber = {
    await: deriveAwaitFiber<F, Err>(),
    cancel: deriveCancelFiber<F, Err>(),
  } as const;

  const isOutcome = deriveIsOutcome();

  return function both<A, B>(left: Call1<F, A>, right: Call1<F, B>): Call1<F, readonly [A, B]> {
    return F.uncancellable((poll) =>
      F.flatMap(poll(F.racePair(left, right)), ([a, b]) =>
        isOutcome(a) ?
          a._tag === "Succeeded" ?
            F.flatMap(
              F.onCancel(
                poll(Fiber.await(b as Fiber<F, Err, B>)),
                Fiber.cancel(b as Fiber<F, Err, B>),
              ),
              (outcome) =>
                outcome._tag === "Succeeded" ? F.product(a._0, outcome._0)
                : outcome._tag === "Failed" ? F.throw(outcome._0)
                : F.productR(poll(F.cancelled()), F.never()),
            )
          : a._tag === "Failed" ? F.productR(Fiber.cancel(b as Fiber<F, Err, B>), F.throw(a._0))
          : F.productR(
              Fiber.cancel(b as Fiber<F, Err, B>),
              F.productR(poll(F.cancelled()), F.never()),
            )
        : (b as Outcome<F, Err, B>)._tag === "Succeeded" ?
          F.flatMap(
            F.onCancel(
              poll(Fiber.await(a as Fiber<F, Err, A>)),
              Fiber.cancel(a as Fiber<F, Err, A>),
            ),
            (outcome) =>
              outcome._tag === "Succeeded" ?
                F.product(outcome._0, (b as Extract<Outcome<F, Err, B>, { _tag: "Succeeded" }>)._0)
              : outcome._tag === "Failed" ? F.throw(outcome._0)
              : F.productR(poll(F.cancelled()), F.never()),
          )
        : (b as Outcome<F, Err, B>)._tag === "Failed" ?
          F.productR(
            Fiber.cancel(a as Fiber<F, Err, A>),
            F.throw((b as Extract<Outcome<F, Err, B>, { _tag: "Failed" }>)._0),
          )
        : F.productR(
            Fiber.cancel(a as Fiber<F, Err, A>),
            F.productR(poll(F.cancelled()), F.never()),
          ),
      ),
    );
  };
};
