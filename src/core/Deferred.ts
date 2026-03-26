/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Arg0, Call1, HKT, PartialApply, RawArg1, RawTArg, TypeLambdaG } from "hkt-core";

import type { Covariant } from "../typeclass/Covariant";
import type { Invariant } from "../typeclass/Invariant";
import type { Dual, PickRaw } from "../utils";

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
 */
export interface Deferred<out F extends HKT<unknown, unknown>, in out A> {
  readonly "~~kind/Deferred": readonly [F, (_: A) => A];
}

export interface DeferredHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "A"]> {
  signature: (
    F: RawTArg<this, "F">,
    A: RawTArg<this, "A">,
  ) => Deferred<RawTArg<this, "F">, RawTArg<this, "A">>;
  return: Deferred<Arg0<this>, RawArg1<this>>;
}

interface DeferredState<F extends HKT<unknown, unknown>, A> extends Deferred<F, A> {
  _get: () => Call1<F, A>;
  _complete: (a: A) => Call1<F, boolean>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveUnsafeCreate = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Deferred<F, any>> = PartialApply<DeferredHKT, [F]>,
>(
  DeferredProto: object | null = Object.prototype,
) =>
  function unsafeCreate<A>({
    // eslint-disable-next-line @typescript-eslint/unbound-method
    complete,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    get,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    init,
  }: {
    init?(): void;
    get(): Call1<F, A>;
    complete(a: A): Call1<F, boolean>;
  }): Call1<FF, A> {
    const out = Object.create(DeferredProto) as DeferredState<F, A>;
    if (init) init.apply(out);
    out._get = get;
    out._complete = complete;
    return out as Call1<FF, A>;
  };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveImap = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Deferred<F, any>> = PartialApply<DeferredHKT, [F]>,
>(
  F: PickRaw<Covariant<F>, "map">,
  DeferredProto: object | null = Object.prototype,
): Dual.First<Invariant<FF>["imap"]> => {
  const unsafeCreate = deriveUnsafeCreate<F, FF>(DeferredProto);

  /**
   * Creates a transformed view of a `Deferred` by mapping values read from `get` with `to` and values passed to `complete` with `from`.
   *
   * **Example**
   *
   * ```typescript
   * const deferred = IO.unsafeRunSync(IO.deferred<number>());
   * const text = imap(deferred, String, Number);
   *
   * IO.unsafeRunSync(complete(text, "42")); // => true
   * IO.unsafeRunSync(get(text)); // => "42"
   * ```
   */
  return function imap<A, B>(
    self: Call1<FF, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ): Call1<FF, B> {
    return unsafeCreate<B>({
      get: () => F.map((self as DeferredState<F, A>)._get(), to),
      complete: (b) => (self as DeferredState<F, A>)._complete(from(b)),
    });
  };
};

export const deriveGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Gets the completed value of a `Deferred`, waiting if it is still empty.
   *
   * **Example**
   *
   * ```typescript
   * const deferred = IO.unsafeRunSync(IO.deferred<number>());
   * IO.unsafeRunSync(complete(deferred, 42)); // => true
   * IO.unsafeRunSync(get(deferred)); // => 42
   * ```
   */
  function get<A>(self: Deferred<F, A>): Call1<F, A> {
    return (self as DeferredState<F, A>)._get();
  };

export const deriveComplete = <F extends HKT<unknown, unknown>>() =>
  /**
   * Completes a `Deferred` with the given value if it is empty.
   *
   * Returns `true` if completion happened, and `false` if the `Deferred` was already completed.
   *
   * **Example**
   *
   * ```typescript
   * const deferred = IO.unsafeRunSync(IO.deferred<number>());
   *
   * IO.unsafeRunSync(complete(deferred, 1)); // => true
   * IO.unsafeRunSync(complete(deferred, 2)); // => false
   * ```
   */
  function complete<A>(self: Deferred<F, A>, a: A): Call1<F, boolean> {
    return (self as DeferredState<F, A>)._complete(a);
  };
