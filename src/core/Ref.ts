/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Arg0, Call1, HKT, PartialApply, RawArg1, RawTArg, TypeLambdaG } from "hkt-core";

import type { Invariant } from "../typeclass/Invariant";
import type { Dual } from "../utils";

/**
 * A mutable reference to a value of type `A`.
 *
 * Core methods like `get`, `set`, `modify`, `update`, and `getAndUpdate` are atomic.
 */
export interface Ref<out F extends HKT<unknown, unknown>, in out A> {
  readonly "~~kind/Ref": readonly [F, (_: A) => A];
}

export interface RefHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "A"]> {
  signature: (
    F: RawTArg<this, "F">,
    A: RawTArg<this, "A">,
  ) => Ref<RawTArg<this, "F">, RawTArg<this, "A">>;
  return: Ref<Arg0<this>, RawArg1<this>>;
}

interface RefState<F extends HKT<unknown, unknown>, A> extends Ref<F, A> {
  _modify: <B>(f: (a: A) => readonly [B, A]) => Call1<F, B>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveUnsafeCreate = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Ref<F, unknown>> = PartialApply<RefHKT, [F]>,
>(
  RefProto: object | null = Object.prototype,
) =>
  function unsafeCreate<A>({
    // eslint-disable-next-line @typescript-eslint/unbound-method
    init,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    modify,
  }: {
    init?(): void;
    modify<B>(f: (a: A) => readonly [B, A]): Call1<F, B>;
  }): Call1<FF, A> {
    const out = Object.create(RefProto) as RefState<F, A>;
    if (init) init.apply(out);
    out._modify = modify;
    return out as Call1<FF, A>;
  };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveImap = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Ref<F, any>> = PartialApply<RefHKT, [F]>,
>(
  RefProto: object | null = Object.prototype,
): Dual.First<Invariant<FF>["imap"]> => {
  const unsafeCreate = deriveUnsafeCreate<F, FF>(RefProto);

  /**
   * Creates a transformed view of a `Ref` by mapping reads with `to` and writes with `from`.
   *
   * **Example**
   *
   * ```typescript
   * const ref = IO.unsafeRunSync(IO.ref({ count: 1 }));
   * const countRef = imap(
   *   ref,
   *   (s) => s.count,
   *   (count) => ({ count }),
   * );
   *
   * IO.unsafeRunSync(updateAndGet(countRef, (n) => n + 1)); // => 2
   * ```
   */
  return function imap<A, B>(
    self: Call1<FF, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ): Call1<FF, B> {
    return unsafeCreate<B>({
      modify: (f) =>
        (self as RefState<F, A>)._modify((a) => {
          const [b, a1] = f(to(a));
          return [b, from(a1)];
        }),
    });
  };
};

export const deriveGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Obtains the current value.
   */
  function get<A>(self: Ref<F, A>): Call1<F, A> {
    return (self as RefState<F, A>)._modify((a) => [a, a]);
  };

export const deriveGetAndSet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value and returns the previous one.
   */
  function getAndSet<A>(self: Ref<F, A>, a: A): Call1<F, A> {
    return (self as RefState<F, A>)._modify((curr) => [curr, a]);
  };

export const deriveGetAndUpdate = <F extends HKT<unknown, unknown>>() =>
  /**
   * Applies an update function, stores the new value, and returns the previous one.
   */
  function getAndUpdate<A>(self: Ref<F, A>, f: (a: NoInfer<A>) => A): Call1<F, A> {
    return (self as RefState<F, A>)._modify((a) => [a, f(a)]);
  };

export const deriveSet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value.
   */
  function set<A>(self: Ref<F, A>, a: NoInfer<A>): Call1<F, void> {
    return (self as RefState<F, A>)._modify(() => [void 0, a]);
  };

export const deriveSetAndGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value and returns the stored value after the update.
   */
  function setAndGet<A>(self: Ref<F, A>, a: NoInfer<A>): Call1<F, A> {
    return (self as RefState<F, A>)._modify(() => [a, a]);
  };

export const deriveModify = <F extends HKT<unknown, unknown>>() =>
  /**
   * Atomically computes a result and the next stored value in one step.
   *
   * The callback returns `[result, nextValue]`.
   *
   * **Example**
   *
   * ```typescript
   * const ref = IO.unsafeRunSync(IO.ref(1));
   *
   * IO.unsafeRunSync(
   *   modify(ref, (n) => [`before=${n}`, n + 1] as const),
   * ); // => "before=1"
   * ```
   */
  function modify<A, B>(self: Ref<F, A>, f: (a: NoInfer<A>) => readonly [B, A]): Call1<F, B> {
    return (self as RefState<F, A>)._modify(f);
  };

export const deriveUpdate = <F extends HKT<unknown, unknown>>() =>
  /**
   * Updates the current value with a pure function and discards the result.
   */
  function update<A>(self: Ref<F, A>, f: (a: NoInfer<A>) => A): Call1<F, void> {
    return (self as RefState<F, A>)._modify((a) => [void 0, f(a)]);
  };

export const deriveUpdateAndGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Updates the current value with a pure function and returns the new value.
   */
  function updateAndGet<A>(self: Ref<F, A>, f: (a: NoInfer<A>) => A): Call1<F, A> {
    return (self as RefState<F, A>)._modify((a) => {
      const updated = f(a);
      return [updated, updated];
    });
  };
