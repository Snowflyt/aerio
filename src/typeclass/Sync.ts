/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, PartialApply } from "hkt-core";

import type { Ref, RefHKT } from "../core/Ref";
import { deriveUnsafeCreate as deriveUnsafeCreateRef } from "../core/Ref";
import type { PickRaw } from "../utils";

import type { MonadCancel } from "./MonadCancel";

export interface Sync<in out F extends HKT<unknown, unknown>> extends MonadCancel<F, unknown> {}

export const deriveRef = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Ref<F, any>> = PartialApply<RefHKT, [F]>,
>(
  F: PickRaw<Sync<F>, "sync">,
  RefProto: object | null = Object.prototype,
): (<A>(a: A) => Call1<F, Call1<FF, A>>) => {
  const unsafeCreateRef = deriveUnsafeCreateRef<F, FF>(RefProto);

  return function ref<A>(a: A) {
    type State = {
      _current: A;
    };

    return F.sync(() =>
      unsafeCreateRef({
        init() {
          this._current = a;
        },

        modify<B>(f: (a: A) => readonly [B, A]) {
          return F.sync(() => {
            const curr = this._current;
            const [out, a] = f(curr);
            if (curr !== a) this._current = a;
            return out;
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- ThisType supplies contextual this, not object members
      } satisfies ThisType<State>),
    );
  };
};

// ╔══════╗
// ║ sync ║
// ╚══════╝
export interface Sync<F> {
  /**
   * Creates a new effect that, when executed, will run the provided thunk and produce its result.
   * If the thunk throws an error, the effect will fail with that error.
   */
  readonly sync: <A>(thunk: () => A) => Call1<F, A>;
}

// ╔═════════╗
// ║ suspend ║
// ╚═════════╝
export interface Sync<F> {
  /**
   * Suspends the execution of an effect until the provided thunk is executed.
   * This is useful for deferring the creation of an effect until it is actually needed, which can help with performance and memory management.
   */
  readonly suspend: <A>(thunk: () => Call1<F, A>) => Call1<F, A>;
}

export const deriveSuspend = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Sync<F>, "flatten" | "sync">,
): Sync<F>["suspend"] =>
  function suspend(thunk) {
    return F.flatten(F.sync(thunk));
  };

// ╔═════╗
// ║ gen ║
// ╚═════╝
export interface Sync<F> {
  /**
   * Creates a new effect from a generator function. The generator can yield effects wrapped in the `$` function (adaptor).
   * This allows for writing complex effectful computations in a more imperative style, while still maintaining the benefits of functional programming.
   *
   * Some effect types might already provide a `[Symbol.iterator]()` method, and in such cases, the generator can yield effects directly without needing to wrap them with the `$` function.
   */
  readonly gen: <A>(
    f: (
      $: <X>(fa: Call1<F, X>) => Iterable<Call1<F, X>, X, unknown>,
    ) => Iterable<Call1<F, unknown>, A, unknown>,
  ) => Call1<F, A>;
}

export namespace Sync {
  export type GenAdapter<F extends HKT<unknown, unknown>> = Parameters<
    Parameters<Sync<F>["gen"]>[0]
  >[0];
}

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

export const deriveGen = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Sync<F>, "of" | "flatMap" | "sync">,
): Sync<F>["gen"] =>
  function gen(f) {
    return F.flatMap(
      F.sync(() => f($)[Symbol.iterator]()),
      (iter) => {
        const step = (sent: unknown): Call1<F, unknown> =>
          F.flatMap(
            F.sync(() => iter.next(sent)),
            (result) => (result.done ? F.of(result.value) : F.flatMap(result.value, step)),
          );
        return (step as (sent: void) => Call1<F, unknown>)();
      },
    );
  };
