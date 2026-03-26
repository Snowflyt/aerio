/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Dual, PickRaw } from "../utils";

import type { Applicative } from "./Applicative";

export interface ApplicativeThrow<
  in out F extends HKT<unknown, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  in out Err,
> extends Applicative<F> {}

// ╔═══════╗
// ║ throw ║
// ╚═══════╝
export interface ApplicativeThrow<F, Err> {
  /**
   * Lifts an error into the context of the container type.
   */
  readonly throw: <A = never>(e: Err) => Call1<F, A>;
}

// ╔═══════╗
// ║ catch ║
// ╚═══════╝
export interface ApplicativeThrow<F, Err> {
  /**
   * Transforms the error inside the context of the container type using a function that returns a new container type, and then flattens the result.
   */
  readonly catch: Dual<
    <A, B>(self: Call1<F, A>, handler: (e: Err) => Call1<F, B>) => Call1<F, A | B>,
    <B>(handler: (e: Err) => Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, A | B>
  >;
}

// ╔════════╗
// ║ ignore ║
// ╚════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApplicativeThrow<F, Err> {
  /**
   * Discards the result of the effect, no matter if it succeeded or failed.
   * Useful when you only care about the side effects and do not need to handle the result or errors.
   */
  readonly ignore: <A>(self: Call1<F, A>) => Call1<F, void>;
}

export const deriveIgnore = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<ApplicativeThrow<F, Err>, "asVoid" | "void" | "catch">,
): ApplicativeThrow<F, Err>["ignore"] =>
  function ignore(self) {
    return F.catch(F.asVoid(self), () => F.void());
  };

// ╔═══════════╗
// ║ throwWhen ║
// ╚═══════════╝
export interface ApplicativeThrow<F, Err> {
  /**
   * Throws `e` if `cond` is `true`, otherwise returns `undefined` lifted into the context of the container type.
   */
  readonly throwWhen: (cond: boolean, e: Err) => Call1<F, void>;
}

export const deriveThrowWhen = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<ApplicativeThrow<F, Err>, "void" | "throw">,
): ApplicativeThrow<F, Err>["throwWhen"] =>
  function throwWhen(cond, e) {
    return cond ? F.throw(e) : F.void();
  };

// ╔═════════════╗
// ║ throwUnless ║
// ╚═════════════╝
export interface ApplicativeThrow<F, Err> {
  /**
   * Throws `e` if `cond` is `false`, otherwise returns `undefined` lifted into the context of the container type.
   */
  readonly throwUnless: (cond: boolean, e: Err) => Call1<F, void>;
}

export const deriveThrowUnless = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<ApplicativeThrow<F, Err>, "void" | "throw">,
): ApplicativeThrow<F, Err>["throwUnless"] =>
  function throwUnless(cond, e) {
    return cond ? F.void() : F.throw(e);
  };
