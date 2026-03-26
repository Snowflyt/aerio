/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
  Arg0,
  Call1,
  Call3,
  HKT,
  HKT3,
  PartialApply,
  RawArg1,
  RawArg2,
  RawTArg,
  TypeLambdaG,
} from "hkt-core";

import type { Outcome, OutcomeHKT } from "./Outcome";

/**
 * A handle to a running or completed computation.
 *
 * - `join` waits for the successful result.
 * - `await_` returns the terminal `Outcome`.
 * - `cancel` requests cancellation.
 */
export interface Fiber<out F extends HKT<unknown, unknown>, out E, out A> {
  readonly "~~kind/Fiber": readonly [F, E, A];
}

export interface FiberHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "E", "A"]> {
  signature: (
    F: RawTArg<this, "F">,
    E: RawTArg<this, "E">,
    A: RawTArg<this, "A">,
  ) => Fiber<RawTArg<this, "F">, RawTArg<this, "E">, RawTArg<this, "A">>;
  return: Fiber<Arg0<this>, RawArg1<this>, RawArg2<this>>;
}

interface FiberState<F extends HKT<unknown, unknown>, E, A> extends Fiber<F, E, A> {
  _join: () => Call1<F, A>;
  _await: () => Call1<F, Outcome<F, E, A>>;
  _cancel: () => Call1<F, void>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveUnsafeCreate = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Fiber<F, E, unknown>> = PartialApply<FiberHKT, [F, E]>,
>(
  FiberProto: object | null = Object.prototype,
) =>
  function unsafeCreate<A>({
    // eslint-disable-next-line @typescript-eslint/unbound-method
    await: await_,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    cancel,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    init,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    join,
  }: {
    init?(): void;
    join(): Call1<F, A>;
    await(): Call1<F, Outcome<F, E, A>>;
    cancel(): Call1<F, void>;
  }): Call1<FF, A> {
    const out = Object.create(FiberProto) as FiberState<F, E, A>;
    if (init) init.apply(out);
    out._join = join;
    out._await = await_;
    out._cancel = cancel;
    return out as Call1<FF, A>;
  };

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
export const deriveIsFiber = <
  FF extends HKT3<HKT<unknown, unknown>, unknown, unknown> = FiberHKT,
>() =>
  /**
   * Checks whether a value looks like a `Fiber` handle.
   *
   * **Example**
   *
   * ```typescript
   * const fiber = IO.unsafeRunSync(IO.of(42).pipe(IO.fork));
   *
   * isFiber(fiber); // => true
   * isFiber({}); // => false
   * ```
   */
  function isFiber(value: unknown): value is Call3<FF, HKT<unknown, unknown>, unknown, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      "_join" in value &&
      typeof value._join === "function" &&
      "_await" in value &&
      typeof value._await === "function" &&
      "_cancel" in value &&
      typeof value._cancel === "function"
    );
  };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveJoin = <F extends HKT<unknown, unknown>, E>() =>
  /**
   * Waits for a `Fiber` handle to complete and returns its successful value.
   *
   * **Example**
   *
   * ```typescript
   * const fiber = IO.unsafeRunSync(IO.of(42).pipe(IO.fork));
   *
   * IO.unsafeRunSync(join(fiber)); // => 42
   * ```
   */
  function join<A>(self: Fiber<F, E, A>): Call1<F, A> {
    return (self as FiberState<F, E, A>)._join();
  };

export const deriveAwait = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>() =>
  /**
   * Waits for a `Fiber` handle to complete and returns its terminal `Outcome`.
   *
   * **Example**
   *
   * ```typescript
   * const fiber = IO.unsafeRunSync(IO.cancelled().pipe(IO.fork));
   *
   * IO.unsafeRunSync(await_(fiber)).isCancelled(); // => true
   * ```
   */
  function await_<A>(self: Fiber<F, E, A>): Call1<F, Call1<FF, A>> {
    return (self as FiberState<F, E, A>)._await();
  };

export const deriveCancel = <F extends HKT<unknown, unknown>, E>() =>
  /**
   * Requests cancellation of a `Fiber` handle.
   *
   * **Example**
   *
   * ```typescript
   * const fiber = IO.unsafeRunSync(IO.never().pipe(IO.fork));
   *
   * IO.unsafeRunSync(cancel(fiber));
   * IO.unsafeRunSync(await_(fiber)).isCancelled(); // => true
   * ```
   */
  function cancel<A>(self: Fiber<F, E, A>): Call1<F, void> {
    return (self as FiberState<F, E, A>)._cancel();
  };
