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

import type { Applicative } from "../typeclass/Applicative";
import type { ApplicativeThrow } from "../typeclass/ApplicativeThrow";
import type { Apply } from "../typeclass/Apply";
import type { Covariant } from "../typeclass/Covariant";
import type { Invariant } from "../typeclass/Invariant";
import type { Of } from "../typeclass/Of";
import type { Dual, PickRaw } from "../utils";

/**
 * Represents the terminal result of an effectful computation.
 *
 * An `Outcome` has three states: `Succeeded`, `Failed`, and `Cancelled`.
 * A successful outcome stores `F<A>` rather than plain `A`, so the surrounding effect type is preserved.
 *
 * **Example**
 *
 * ```typescript
 * const outcome = Succeeded(F.of(42));
 *
 * F.unsafeRunSync(outcome._0); // => 42
 * ```
 */
export type Outcome<F extends HKT<unknown, unknown>, E, A> =
  | { readonly _tag: "Succeeded"; readonly _0: Call1<F, A> }
  | { readonly _tag: "Failed"; readonly _0: E }
  | { readonly _tag: "Cancelled" };

export interface OutcomeHKT extends TypeLambdaG<[["F", HKT<unknown, unknown>], "E", "A"]> {
  signature: (
    F: RawTArg<this, "F">,
    E: RawTArg<this, "E">,
    A: RawTArg<this, "A">,
  ) => Outcome<RawTArg<this, "F">, RawTArg<this, "E">, RawTArg<this, "A">>;
  return: Outcome<Arg0<this>, RawArg1<this>, RawArg2<this>>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveSucceeded = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  OutcomeProto: object | null = Object.prototype,
) =>
  /**
   * Constructs a successful `Outcome`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = Succeeded(F.of(42));
   *
   * outcome._tag; // => "Succeeded"
   * F.unsafeRunSync(outcome._0); // => 42
   * ```
   */
  function Succeeded<A>(fa: Call1<F, A>): Call1<FF, A> {
    const out = Object.create(OutcomeProto) as Writable<
      Extract<Outcome<F, E, A>, { _tag: "Succeeded" }>
    >;
    out._tag = "Succeeded";
    out._0 = fa;
    return out as Call1<FF, A>;
  };

export const deriveFailed = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  OutcomeProto: object | null = Object.prototype,
) =>
  /**
   * Constructs a failed `Outcome`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = Failed("boom");
   *
   * outcome._tag; // => "Failed"
   * outcome._0; // => "boom"
   * ```
   */
  function Failed<A>(e: E): Call1<FF, A> {
    const out = Object.create(OutcomeProto) as Writable<
      Extract<Outcome<F, E, A>, { _tag: "Failed" }>
    >;
    out._tag = "Failed";
    out._0 = e;
    return out as Call1<FF, A>;
  };

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
export const deriveIsOutcome = <
  FF extends HKT3<HKT<unknown, unknown>, unknown, unknown> = OutcomeHKT,
>() =>
  /**
   * Checks whether a value has the runtime shape of an `Outcome`.
   *
   * **Example**
   *
   * ```typescript
   * isOutcome(Succeeded(F.of(1))); // => true
   * isOutcome({ _tag: "Succeeded" }); // => false
   * ```
   */
  function isOutcome(value: unknown): value is Call3<FF, HKT<unknown, unknown>, unknown, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      "_tag" in value &&
      ((value._tag === "Succeeded" && "_0" in value) ||
        (value._tag === "Failed" && "_0" in value) ||
        value._tag === "Cancelled")
    );
  };

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveImap = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Invariant<F>, "imap">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Invariant<FF>["imap"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Invariantly maps the successful value inside `Succeeded`.
   *
   * Failed and cancelled outcomes are preserved unchanged.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = imap(Succeeded(F.of("42")), Number, String);
   *
   * F.unsafeRunSync(outcome._0); // => 42
   * ```
   */
  return function imap<A, B>(
    self: Call1<FF, A>,
    to: (a: NoInfer<A>) => B,
    from: (b: NoInfer<B>) => A,
  ): Call1<FF, B> {
    return self._tag === "Succeeded" ?
        Succeeded(F.imap<A, B>(self._0, to, from))
      : (self as unknown as Call1<FF, B>);
  };
};

export const deriveMap = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Covariant<F>, "map">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Covariant<FF>["map"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Maps the successful value inside `Succeeded`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = map(Succeeded(F.of(1)), (n) => n + 1);
   *
   * F.unsafeRunSync(outcome._0); // => 2
   * ```
   */
  return function map<A, B>(self: Call1<FF, A>, f: (a: NoInfer<A>) => B): Call1<FF, B> {
    return self._tag === "Succeeded" ?
        Succeeded(F.map<A, B>(self._0, f))
      : (self as unknown as Call1<FF, B>);
  };
};

export const deriveTap = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Covariant<F>, "tap">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Covariant<FF>["tap"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Runs a callback on the successful value inside `Succeeded` and preserves that value.
   *
   * **Example**
   *
   * ```typescript
   * let seen = 0;
   * const outcome = tap(Succeeded(F.of(2)), (n) => { seen = n; });
   *
   * seen; // => 2
   * F.unsafeRunSync(outcome._0); // => 2
   * ```
   */
  return function tap<A>(self: Call1<FF, A>, f: (a: NoInfer<A>) => void): Call1<FF, A> {
    return self._tag === "Succeeded" ?
        Succeeded(F.tap<A>(self._0, f))
      : (self as unknown as Call1<FF, A>);
  };
};

export const deriveAs = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Covariant<F>, "as">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Covariant<FF>["as"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Replaces the successful value inside `Succeeded` with a constant value.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = as(Succeeded(F.of(1)), "done");
   *
   * F.unsafeRunSync(outcome._0); // => "done"
   * ```
   */
  return function as<A, B>(self: Call1<FF, A>, b: B): Call1<FF, B> {
    return self._tag === "Succeeded" ?
        Succeeded(F.as(self._0, b))
      : (self as unknown as Call1<FF, B>);
  };
};

export const deriveAsVoid = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Covariant<F>, "asVoid">,
  OutcomeProto: object | null = Object.prototype,
): Covariant<FF>["asVoid"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Replaces the successful value inside `Succeeded` with `void`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = asVoid(Succeeded(F.of(1)));
   *
   * F.unsafeRunSync(outcome._0); // => undefined
   * ```
   */
  return function asVoid<A>(self: Call1<FF, A>): Call1<FF, void> {
    return self._tag === "Succeeded" ?
        Succeeded(F.asVoid(self._0))
      : (self as unknown as Call1<FF, void>);
  };
};

export const deriveOf = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Of<F>, "of">,
  OutcomeProto: object | null = Object.prototype,
): Of<FF>["of"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Lifts a plain value into `Succeeded` using `F.of`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = of(42);
   *
   * F.unsafeRunSync(outcome._0); // => 42
   * ```
   */
  return function of<A>(a: A): Call1<FF, A> {
    return Succeeded(F.of(a));
  };
};

export const deriveVoid = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Of<F>, "void">,
  OutcomeProto: object | null = Object.prototype,
): Of<FF>["void"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Constructs a successful outcome containing `F.void()`.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = void_();
   *
   * F.unsafeRunSync(outcome._0); // => undefined
   * ```
   */
  return function void_(): Call1<FF, void> {
    return Succeeded(F.void());
  };
};

export const deriveAp = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Apply<F>, "ap">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Apply<FF>["ap"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Applies a successful function outcome to a successful value outcome.
   *
   * Failed and cancelled outcomes short-circuit.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = ap(Succeeded(F.of((n: number) => n + 1)), Succeeded(F.of(1)));
   *
   * F.unsafeRunSync(outcome._0); // => 2
   * ```
   */
  return function ap<A, B>(fab: Call1<FF, (a: A) => B>, fa: Call1<FF, A>): Call1<FF, B> {
    return (
      fab._tag === "Succeeded" && fa._tag === "Succeeded" ? Succeeded(F.ap(fab._0, fa._0))
      : fab._tag === "Succeeded" ? (fa as unknown as Call1<FF, B>)
      : (fab as unknown as Call1<FF, B>)
    );
  };
};

export const deriveProduct = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Apply<F>, "product">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Apply<FF>["product"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Combines two successful outcomes into a pair.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = product(Succeeded(F.of(1)), Succeeded(F.of("a")));
   *
   * F.unsafeRunSync(outcome._0); // => [1, "a"]
   * ```
   */
  return function product<A, B>(
    left: Call1<FF, A>,
    right: Call1<FF, B>,
  ): Call1<FF, readonly [A, B]> {
    return (
      left._tag === "Succeeded" && right._tag === "Succeeded" ?
        Succeeded(F.product(left._0, right._0))
      : left._tag === "Succeeded" ? (right as unknown as Call1<FF, readonly [A, B]>)
      : (left as unknown as Call1<FF, readonly [A, B]>)
    );
  };
};

export const deriveProductL = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Apply<F>, "productL">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Apply<FF>["productL"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Sequences two successful outcomes and keeps the left value.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = productL(Succeeded(F.of(1)), Succeeded(F.of("a")));
   *
   * F.unsafeRunSync(outcome._0); // => 1
   * ```
   */
  return function productL<A, B>(self: Call1<FF, A>, that: Call1<FF, B>): Call1<FF, A> {
    return (
      self._tag === "Succeeded" && that._tag === "Succeeded" ?
        Succeeded(F.productL(self._0, that._0))
      : self._tag === "Succeeded" ? (that as unknown as Call1<FF, A>)
      : (self as unknown as Call1<FF, A>)
    );
  };
};

export const deriveProductR = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Apply<F>, "productR">,
  OutcomeProto: object | null = Object.prototype,
): Dual.First<Apply<FF>["productR"]> => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Sequences two successful outcomes and keeps the right value.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = productR(Succeeded(F.of(1)), Succeeded(F.of("a")));
   *
   * F.unsafeRunSync(outcome._0); // => "a"
   * ```
   */
  return function productR<A, B>(self: Call1<FF, A>, that: Call1<FF, B>): Call1<FF, B> {
    return (
      self._tag === "Succeeded" && that._tag === "Succeeded" ?
        Succeeded(F.productR(self._0, that._0))
      : self._tag === "Succeeded" ? (that as unknown as Call1<FF, B>)
      : (self as unknown as Call1<FF, B>)
    );
  };
};

export const deriveWhen = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Applicative<F>, "void">,
  OutcomeProto: object | null = Object.prototype,
): Applicative<FF>["when"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Returns the given outcome when the condition is true.
   *
   * When the condition is false, this returns a successful void outcome.
   *
   * **Example**
   *
   * ```typescript
   * when(true, Succeeded(F.void()))._tag; // => "Succeeded"
   * when(false, Failed("boom"))._tag; // => "Succeeded"
   * ```
   */
  return function when(cond: boolean, then: Call1<FF, void>): Call1<FF, void> {
    return cond ? then : Succeeded(F.void());
  };
};

export const deriveUnless = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<Applicative<F>, "void">,
  OutcomeProto: object | null = Object.prototype,
): Applicative<FF>["unless"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Returns the given outcome when the condition is false.
   *
   * When the condition is true, this returns a successful void outcome.
   *
   * **Example**
   *
   * ```typescript
   * unless(false, Succeeded(F.void()))._tag; // => "Succeeded"
   * unless(true, Failed("boom"))._tag; // => "Succeeded"
   * ```
   */
  return function unless(cond: boolean, then: Call1<FF, void>): Call1<FF, void> {
    return cond ? Succeeded(F.void()) : then;
  };
};

export const deriveThrow = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  OutcomeProto: object | null = Object.prototype,
): ApplicativeThrow<FF, E>["throw"] => {
  const Failed = deriveFailed<F, E, FF>(OutcomeProto);

  /**
   * Constructs a failed outcome.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = throw_("boom");
   *
   * outcome._tag; // => "Failed"
   * ```
   */
  return function throw_<A = never>(e: E): Call1<FF, A> {
    return Failed(e);
  };
};

export const deriveCatch = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(): Dual.First<ApplicativeThrow<FF, E>["catch"]> => {
  /**
   * Recovers only failed outcomes.
   *
   * Successful and cancelled outcomes are preserved unchanged.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = catch_(Failed("boom"), (error) => Succeeded(F.of(error.length)));
   *
   * F.unsafeRunSync(outcome._0); // => 4
   * ```
   */
  return function catch_<A, B>(
    self: Call1<FF, A>,
    handler: (e: E) => Call1<FF, B>,
  ): Call1<FF, A | B> {
    return (
      self._tag === "Succeeded" ? self
      : self._tag === "Failed" ? handler(self._0)
      : self
    );
  };
};

export const deriveIgnore = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<ApplicativeThrow<F, E>, "asVoid" | "void">,
  OutcomeProto: object | null = Object.prototype,
): ApplicativeThrow<FF, E>["ignore"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);

  /**
   * Discards success values and failures, but preserves cancellation.
   *
   * **Example**
   *
   * ```typescript
   * const outcome = ignore(Succeeded(F.of(1)));
   *
   * F.unsafeRunSync(outcome._0); // => undefined
   * ```
   */
  return function ignore<A>(self: Call1<FF, A>): Call1<FF, void> {
    return (
      self._tag === "Succeeded" ? Succeeded(F.asVoid(self._0))
      : self._tag === "Failed" ? Succeeded(F.void())
      : (self as Call1<FF, void>)
    );
  };
};

export const deriveThrowWhen = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<ApplicativeThrow<F, E>, "void">,
  OutcomeProto: object | null = Object.prototype,
): ApplicativeThrow<FF, E>["throwWhen"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);
  const Failed = deriveFailed<F, E, FF>(OutcomeProto);

  /**
   * Fails when the condition is true and succeeds with `void` otherwise.
   *
   * **Example**
   *
   * ```typescript
   * throwWhen(true, "boom")._tag; // => "Failed"
   * throwWhen(false, "boom")._tag; // => "Succeeded"
   * ```
   */
  return function throwWhen(cond: boolean, e: E): Call1<FF, void> {
    return cond ? Failed(e) : Succeeded(F.void());
  };
};

export const deriveThrowUnless = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>(
  F: PickRaw<ApplicativeThrow<F, E>, "void">,
  OutcomeProto: object | null = Object.prototype,
): ApplicativeThrow<FF, E>["throwUnless"] => {
  const Succeeded = deriveSucceeded<F, E, FF>(OutcomeProto);
  const Failed = deriveFailed<F, E, FF>(OutcomeProto);

  /**
   * Fails when the condition is false and succeeds with `void` otherwise.
   *
   * **Example**
   *
   * ```typescript
   * throwUnless(true, "boom")._tag; // => "Succeeded"
   * throwUnless(false, "boom")._tag; // => "Failed"
   * ```
   */
  return function throwUnless(cond: boolean, e: E): Call1<FF, void> {
    return cond ? Succeeded(F.void()) : Failed(e);
  };
};

// TODO: Implement `Monad` and `MonadThrow`
// This requires `Traverse` to be implemented for `F`,
// but currently `Traverse` is not available in this library.
// PRs are welcome to add `Fold` and `Traverse` type classes.

export const deriveIsSucceeded = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>() =>
  /**
   * Checks whether an outcome is `Succeeded`.
   *
   * **Example**
   *
   * ```typescript
   * isSucceeded(Succeeded(F.of(1))); // => true
   * isSucceeded(Failed("boom")); // => false
   * ```
   */
  function isSucceeded<A>(
    self: Call1<FF, A>,
  ): self is Extract<Call1<FF, A>, { readonly _tag: "Succeeded" }> {
    return self._tag === "Succeeded";
  };

export const deriveIsFailed = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>() =>
  /**
   * Checks whether an outcome is `Failed`.
   *
   * **Example**
   *
   * ```typescript
   * isFailed(Failed("boom")); // => true
   * isFailed(Succeeded(F.of(1))); // => false
   * ```
   */
  function isFailed<A>(
    self: Call1<FF, A>,
  ): self is Extract<Call1<FF, A>, { readonly _tag: "Failed" }> {
    return self._tag === "Failed";
  };

export const deriveIsCancelled = <
  F extends HKT<unknown, unknown>,
  E,
  FF extends HKT<unknown, Outcome<F, E, unknown>> = PartialApply<OutcomeHKT, [F, E]>,
>() =>
  /**
   * Checks whether an outcome is `Cancelled`.
   *
   * **Example**
   *
   * ```typescript
   * isCancelled({ _tag: "Cancelled" }); // => true
   * isCancelled(Failed("boom")); // => false
   * ```
   */
  function isCancelled<A>(
    self: Call1<FF, A>,
  ): self is Extract<Call1<FF, A>, { readonly _tag: "Cancelled" }> {
    return self._tag === "Cancelled";
  };

// -----------------------------------------------------------------------------
// Internal type utilities
// -----------------------------------------------------------------------------
type Writable<T> = { -readonly [K in keyof T]: T[K] };
