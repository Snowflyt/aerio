/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, PartialApply } from "hkt-core";

import type { Deferred, DeferredHKT } from "../core/Deferred";
import { deriveUnsafeCreate as deriveUnsafeCreateDeferred } from "../core/Deferred";
import type { PickRaw } from "../utils";

import type { Sleep } from "./Sleep";
import type { Sync } from "./Sync";

export interface Async<in out F extends HKT<unknown, unknown>> extends Sync<F>, Sleep<F, unknown> {}

export const deriveDeferred = <
  F extends HKT<unknown, unknown>,
  FF extends HKT<unknown, Deferred<F, any>> = PartialApply<DeferredHKT, [F]>,
>(
  F: PickRaw<
    Async<F>,
    "of" | "flatten" | "flatMap" | "uncancellable" | "onCancel" | "sync" | "suspend" | "cont"
  >,
  DeferredProto: object | null = Object.prototype,
): (<A>() => Call1<F, Call1<FF, A>>) => {
  const unsafeCreateDeferred = deriveUnsafeCreateDeferred<F, FF>(DeferredProto);

  return function deferred<A>() {
    type State = {
      _readers: ((a: A) => void)[];
      _completed?: A;
    };

    return F.sync(() =>
      unsafeCreateDeferred({
        init() {
          this._readers = [];
        },

        get() {
          return F.suspend(() =>
            "_completed" in this ?
              F.of(this._completed)
            : F.cont((succeed, _fail, get) =>
                F.uncancellable((poll) =>
                  F.flatMap(
                    F.sync(() => {
                      // The outer completion check is only a fast path. Without this second check,
                      // completion can drain the readers before this fiber has registered:
                      //
                      // reader fiber                 completing fiber
                      // ------------                 ----------------
                      // observes an incomplete state
                      //                              stores the result and drains readers
                      // appends its reader too late  ← no future completion can wake it
                      //
                      // Rechecking completion and appending the reader must happen in the same
                      // synchronous step, so exactly one of them wins.
                      if ("_completed" in this) {
                        succeed(this._completed);
                        return true;
                      }
                      this._readers.push(succeed);
                      return false;
                    }),
                    (completed) =>
                      completed ?
                        poll(get)
                      : F.onCancel(
                          poll(get),
                          F.sync(() => {
                            const index = this._readers.indexOf(succeed);
                            if (index !== -1) this._readers.splice(index, 1);
                          }),
                        ),
                  ),
                ),
              ),
          );
        },

        complete(a: A) {
          return F.uncancellable(() =>
            F.sync(() => {
              if ("_completed" in this) return false;
              this._completed = a;
              this._readers.forEach((f) => f(a));
              this._readers.length = 0;
              return true;
            }),
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- ThisType supplies contextual this, not object members
      } satisfies ThisType<State>),
    );
  };
};

// ╔══════╗
// ║ cont ║
// ╚══════╝
export interface Async<F> {
  /**
   * Creates an effect from a continuation function.
   *
   * **Note:** This is a rather low-level primitive and not meant for end users.
   *
   * The continuation function accepts three parameters: `succeed`, `fail` and `get`.
   * - The `succeed` callback should be called with the result of the computation when it completes successfully.
   * - The `fail` callback should be called with an error if the computation fails.
   * - The `get` effect awaits the result passed to `succeed` or `fail` and can be cancelled.
   *   Use {@linkcode onCancel} to register a finalizer that runs if `get` is cancelled, or wrap it with {@linkcode uncancellable} to prevent cancellation.
   *
   * Note that only the **first** invocation of the `succeed` or `fail` callback will be considered,
   * and subsequent calls will be silently ignored.
   *
   * The continuation function **must** return an effect that represents the ongoing computation.
   * For example, `F.uncancellable((poll) => F.onCancel(poll(get), ...))` or `F.uncancellable(() => get)`.
   */
  readonly cont: <X, A>(
    cont: (succeed: (a: X) => void, fail: (e: unknown) => void, get: Call1<F, X>) => Call1<F, A>,
  ) => Call1<F, A>;
}

// ╔════════════════════╗
// ║ asyncUncancellable ║
// ╚════════════════════╝
export interface Async<F> {
  /**
   * Creates an asynchronous effect from a callback function that cannot be cancelled.
   *
   * The callback function accepts two parameters: `succeed` and `fail`.
   * - The `succeed` callback should be called with the result of the computation when it completes successfully.
   * - The `fail` callback should be called with an error if the computation fails.
   *
   * Note that only the **first** invocation of the `succeed` or `fail` callback will be considered,
   * and subsequent calls will be silently ignored.
   */
  readonly asyncUncancellable: <A>(
    callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => void,
  ) => Call1<F, A>;
}

export const deriveAsyncUncancellable = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Async<F>, "productR" | "flatMap" | "uncancellable" | "sync" | "cont">,
): Async<F>["asyncUncancellable"] =>
  function asyncUncancellable<A>(
    callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => void,
  ) {
    return F.cont<A, A>((succeed, fail, get) =>
      F.uncancellable(() =>
        F.productR(
          F.sync(() => callback(succeed, fail)),
          get,
        ),
      ),
    );
  };

// ╔══════════════════╗
// ║ asyncCancellable ║
// ╚══════════════════╝
export interface Async<F> {
  /**
   * Creates an asynchronous effect from a callback function that can be cancelled.
   *
   * The callback function accepts two parameters: `succeed` and `fail`.
   * - The `succeed` callback should be called with the result of the computation when it completes successfully.
   * - The `fail` callback should be called with an error if the computation fails.
   *
   * The callback function **must** return an effect that will be executed when the resulting effect is cancelled. This allows you to perform any necessary cleanup when cancellation occurs.
   *
   * Note that only the **first** invocation of the `succeed` or `fail` callback will be considered,
   * and subsequent calls will be silently ignored.
   */
  readonly asyncCancellable: <A>(
    callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => Call1<F, void>,
  ) => Call1<F, A>;
}

export const deriveAsyncCancellable = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Async<F>, "flatMap" | "uncancellable" | "onCancel" | "sync" | "cont">,
): Async<F>["asyncCancellable"] =>
  function asyncCancellable<A>(
    callback: (succeed: (a: A) => void, fail: (e: unknown) => void) => Call1<F, void>,
  ) {
    return F.cont<A, A>((succeed, fail, get) =>
      F.uncancellable((poll) =>
        F.flatMap(
          F.sync(() => callback(succeed, fail)),
          (finalizer) => F.onCancel(poll(get), finalizer),
        ),
      ),
    );
  };

// ╔═════════╗
// ║ promise ║
// ╚═════════╝
export interface Async<F> {
  /**
   * Creates an effect from a function that returns a promise.
   *
   * The function accepts no parameters and should return a promise that represents the asynchronous computation.
   * If the promise resolves, the effect will succeed with the resolved value. If the promise rejects, the effect will fail with the rejection reason.
   */
  readonly promise: <A>(
    f: (
      ...args: typeof globalThis extends { readonly AbortSignal: new () => infer AbortSignal } ?
        [signal: AbortSignal]
      : []
    ) => PromiseLike<A>,
  ) => Call1<F, A>;
}

export const derivePromise = <F extends HKT<unknown, unknown>>(
  F: PickRaw<Async<F>, "productR" | "flatMap" | "uncancellable" | "onCancel" | "sync" | "cont">,
): Async<F>["promise"] =>
  function promise<A>(
    f: (
      ...args: typeof globalThis extends { readonly AbortSignal: new () => infer AbortSignal } ?
        [signal: AbortSignal]
      : []
    ) => PromiseLike<A>,
  ) {
    return F.cont<A, A>((succeed, fail, get) =>
      F.uncancellable((poll) =>
        // @ts-expect-error - `AbortController` may be missing in some lib targets
        typeof AbortController !== "undefined" ?
          F.flatMap(
            F.sync(() => {
              // @ts-expect-error - `AbortController` may be missing in some lib targets
              const controller = new AbortController();
              const signal = controller.signal;
              (f as any)(signal).then(succeed, fail);
              return F.sync(() => controller.abort());
            }),
            (finalizer) => F.onCancel(poll(get), finalizer),
          )
        : F.productR(
            F.sync(() => {
              f().then(succeed, fail);
            }),
            get,
          ),
      ),
    );
  };
