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
 * A fiber-local value of type `A`.
 *
 * Core methods like `get`, `set`, `modify`, `update`, and `getAndUpdate` are atomic within the current fiber.
 * On fork, child fibers inherit the current value snapshot and later updates remain local to that child.
 */
export interface FiberLocal<out F extends HKT<unknown, unknown>, in out A> {
  readonly "~~kind/FiberLocal": readonly [F, (_: A) => A];
}

export interface FiberLocalHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "A"]> {
  signature: (
    F: RawTArg<this, "F">,
    A: RawTArg<this, "A">,
  ) => FiberLocal<RawTArg<this, "F">, RawTArg<this, "A">>;
  return: FiberLocal<Arg0<this>, RawArg1<this>>;
}

interface FiberLocalState<F extends HKT<unknown, unknown>, A> extends FiberLocal<F, A> {
  _slot: FiberLocalSlot<F>;
  _decode: (a: unknown) => A;
  _encode: (a: A) => unknown;
}

interface FiberLocalSlot<F extends HKT<unknown, unknown>> {
  _key: string | symbol;
  _initial: unknown;
  _run: <B>(f: (a: unknown) => readonly [B, unknown]) => Call1<F, B>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveUnsafeCreate = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, FiberLocal<F, unknown>> = PartialApply<FiberLocalHKT, [F]>,
>(
  FiberLocalProto: object | null = Object.prototype,
) =>
  function unsafeCreate<A>({
    decode,
    encode,
    slot,
  }: {
    slot: FiberLocalSlot<F>;
    decode?: (a: unknown) => A;
    encode?: (a: A) => unknown;
  }): Call1<FF, A> {
    const out = Object.create(FiberLocalProto) as FiberLocalState<F, A>;
    out._slot = slot;
    out._decode = decode ? decode : (a: unknown) => a as A;
    out._encode = encode ? encode : (a: A) => a;
    return out as Call1<FF, A>;
  };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveImap = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, FiberLocal<F, any>> = PartialApply<FiberLocalHKT, [F]>,
>(
  FiberLocalProto: object | null = Object.prototype,
): Dual.First<Invariant<FF>["imap"]> => {
  const unsafeCreate = deriveUnsafeCreate<F, FF>(FiberLocalProto);

  /**
   * Creates a transformed view of a `FiberLocal` by mapping reads with `to` and writes with `from`.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(41));
   * const text = imap(local, String, Number);
   *
   * IO.unsafeRunSync(setAndGet(text, "42")); // => "42"
   * IO.unsafeRunSync(get(local)); // => 42
   * ```
   */
  return function imap<A, B>(
    self: Call1<FF, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ): Call1<FF, B> {
    return unsafeCreate<B>({
      slot: (self as FiberLocalState<F, A>)._slot,
      decode: (a) => to((self as FiberLocalState<F, A>)._decode(a)),
      encode: (b) => (self as FiberLocalState<F, A>)._encode(from(b)),
    });
  };
};

export const deriveGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Obtains the current value of a `FiberLocal` in the current fiber.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(1));
   *
   * IO.unsafeRunSync(get(local)); // => 1
   * ```
   */
  function get<A>(self: FiberLocal<F, A>): Call1<F, A> {
    return (self as FiberLocalState<F, A>)._slot._run((a) => [
      (self as FiberLocalState<F, A>)._decode(a),
      a,
    ]);
  };

export const deriveGetAndSet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value of a `FiberLocal` in the current fiber and returns the previous one.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(0));
   *
   * IO.unsafeRunSync(getAndSet(local, 1)); // => 0
   * ```
   */
  function getAndSet<A>(self: FiberLocal<F, A>, a: A): Call1<F, A> {
    return (self as FiberLocalState<F, A>)._slot._run((curr) => [
      (self as FiberLocalState<F, A>)._decode(curr),
      (self as FiberLocalState<F, A>)._encode(a),
    ]);
  };

export const deriveGetAndUpdate = <F extends HKT<unknown, unknown>>() =>
  /**
   * Applies an update function to a `FiberLocal` in the current fiber, stores the new value, and returns the previous one.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(0));
   *
   * IO.unsafeRunSync(getAndUpdate(local, (n) => n + 1)); // => 0
   * IO.unsafeRunSync(get(local)); // => 1
   * ```
   */
  function getAndUpdate<A>(self: FiberLocal<F, A>, f: (a: NoInfer<A>) => A): Call1<F, A> {
    return (self as FiberLocalState<F, A>)._slot._run((a) => {
      const curr = (self as FiberLocalState<F, A>)._decode(a);
      return [curr, (self as FiberLocalState<F, A>)._encode(f(curr))];
    });
  };

export const deriveSet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value of a `FiberLocal` in the current fiber.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(0));
   *
   * IO.unsafeRunSync(set(local, 2));
   * IO.unsafeRunSync(get(local)); // => 2
   * ```
   */
  function set<A>(self: FiberLocal<F, A>, a: NoInfer<A>): Call1<F, void> {
    return (self as FiberLocalState<F, A>)._slot._run(() => [
      void 0,
      (self as FiberLocalState<F, A>)._encode(a),
    ]);
  };

export const deriveSetAndGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Replaces the current value of a `FiberLocal` in the current fiber and returns the stored value after the update.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(0));
   *
   * IO.unsafeRunSync(setAndGet(local, 2)); // => 2
   * ```
   */
  function setAndGet<A>(self: FiberLocal<F, A>, a: NoInfer<A>): Call1<F, A> {
    return (self as FiberLocalState<F, A>)._slot._run(() => [
      a,
      (self as FiberLocalState<F, A>)._encode(a),
    ]);
  };

export const deriveModify = <F extends HKT<unknown, unknown>>() =>
  /**
   * Atomically computes a result and the next current value of a `FiberLocal` in the current fiber in one step.
   *
   * The callback returns `[result, nextValue]`.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(1));
   *
   * IO.unsafeRunSync(modify(local, (n) => [`before=${n}`, n + 1] as const)); // => "before=1"
   * IO.unsafeRunSync(get(local)); // => 2
   * ```
   */
  function modify<A, B>(
    self: FiberLocal<F, A>,
    f: (a: NoInfer<A>) => readonly [B, A],
  ): Call1<F, B> {
    return (self as FiberLocalState<F, A>)._slot._run((a) => {
      const [out, next] = f((self as FiberLocalState<F, A>)._decode(a));
      return [out, (self as FiberLocalState<F, A>)._encode(next)];
    });
  };

export const deriveUpdate = <F extends HKT<unknown, unknown>>() =>
  /**
   * Updates the current value of a `FiberLocal` in the current fiber with a pure function and discards the result.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(1));
   *
   * IO.unsafeRunSync(update(local, (n) => n + 1));
   * IO.unsafeRunSync(get(local)); // => 2
   * ```
   */
  function update<A>(self: FiberLocal<F, A>, f: (a: NoInfer<A>) => A): Call1<F, void> {
    return (self as FiberLocalState<F, A>)._slot._run((a) => [
      void 0,
      (self as FiberLocalState<F, A>)._encode(f((self as FiberLocalState<F, A>)._decode(a))),
    ]);
  };

export const deriveUpdateAndGet = <F extends HKT<unknown, unknown>>() =>
  /**
   * Updates the current value of a `FiberLocal` in the current fiber with a pure function and returns the new value.
   *
   * **Example**
   *
   * ```typescript
   * const local = IO.unsafeRunSync(IO.fiberLocal(1));
   *
   * IO.unsafeRunSync(updateAndGet(local, (n) => n + 1)); // => 2
   * ```
   */
  function updateAndGet<A>(self: FiberLocal<F, A>, f: (a: NoInfer<A>) => A): Call1<F, A> {
    return (self as FiberLocalState<F, A>)._slot._run((a) => {
      const updated = f((self as FiberLocalState<F, A>)._decode(a));
      return [updated, (self as FiberLocalState<F, A>)._encode(updated)];
    });
  };
