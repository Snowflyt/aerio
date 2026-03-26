/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Outcome } from "../core/Outcome";
import type { Dual, PickRaw } from "../utils";

import type { MonadThrow } from "./MonadThrow";

export interface MonadCancel<in out F extends HKT<unknown, unknown>, in out Err> extends MonadThrow<
  F,
  Err
> {}

// ╔═══════════════╗
// ║ uncancellable ║
// ╚═══════════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MonadCancel<F, Err> {
  /**
   * Masks cancellation on the current fiber. The `poll` argument in `body` can be used to enable polling.
   * Polling causes a fiber to unmask within a masked region so that cancellation can be observed again.
   */
  readonly uncancellable: <A>(
    body: (poll: <X>(io: Call1<F, X>) => Call1<F, X>) => Call1<F, A>,
  ) => Call1<F, A>;
}

// ╔═══════════╗
// ║ cancelled ║
// ╚═══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MonadCancel<F, Err> {
  /**
   * Requests self-cancellation on the current fiber.
   */
  readonly cancelled: () => Call1<F, void>;
}

// ╔══════════╗
// ║ onCancel ║
// ╚══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MonadCancel<F, Err> {
  /**
   * Registers a finalizer that is invoked if cancellation is observed during the evaluation of `self`.
   * If the evaluation of `self` completes without encountering a cancellation, the finalizer is unregistered before proceeding.
   *
   * Note that if `self` is uncancellable (e.g. created via {@linkcode uncancellable}) then `finalizer` won’t be fired.
   */
  readonly onCancel: Dual<
    <A>(self: Call1<F, A>, finalizer: Call1<F, void>) => Call1<F, A>,
    (finalizer: Call1<F, void>) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

// ╔═══════════╗
// ║ guarantee ║
// ╚═══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MonadCancel<F, Err> {
  /**
   * Guarantees the execution of `finalizer` after the effect completes, regardless of success, failure, or cancellation.
   */
  readonly guarantee: Dual<
    <A>(self: Call1<F, A>, finalizer: Call1<F, void>) => Call1<F, A>,
    (finalizer: Call1<F, void>) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveGuarantee = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<MonadCancel<F, Err>, "guaranteeCase">,
): Dual.First<MonadCancel<F, Err>["guarantee"]> =>
  function guarantee(self, finalizer) {
    return F.guaranteeCase(self, () => finalizer);
  };

// ╔═══════════════╗
// ║ guaranteeCase ║
// ╚═══════════════╝
export interface MonadCancel<F, Err> {
  /**
   * Guarantees the execution of an outcome-aware finalizer after the effect completes.
   */
  readonly guaranteeCase: Dual<
    <A>(
      self: Call1<F, A>,
      finalizer: (outcome: Outcome<F, Err, A>) => Call1<F, void>,
    ) => Call1<F, A>,
    <A>(
      finalizer: (outcome: Outcome<F, Err, A>) => Call1<F, void>,
    ) => (self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveGuaranteeCase = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    MonadCancel<F, Err>,
    "as" | "of" | "void" | "productR" | "flatMap" | "throw" | "catch" | "uncancellable" | "onCancel"
  >,
): Dual.First<MonadCancel<F, Err>["guaranteeCase"]> =>
  function guaranteeCase(self, finalizer) {
    return F.uncancellable((poll) =>
      F.flatMap(
        F.catch(
          F.onCancel(
            poll(self),
            F.flatMap(F.void(), () => finalizer({ _tag: "Cancelled" })),
          ),
          (e) => F.productR(F.catch(finalizer({ _tag: "Failed", _0: e }), F.void), F.throw(e)),
        ),
        (a) => F.as(finalizer({ _tag: "Succeeded", _0: F.of(a) }), a),
      ),
    );
  };

// ╔═══════════════════╗
// ║ acquireUseRelease ║
// ╚═══════════════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MonadCancel<F, Err> {
  /**
   * Acquires a resource, uses it, and then releases it. Only the use phase is cancellable.
   *
   * The resource is guaranteed to be released after use, even if the use phase fails or is cancelled.
   */
  readonly acquireUseRelease: Dual<
    <R, A>(
      acquire: Call1<F, R>,
      use: (resource: NoInfer<R>) => Call1<F, A>,
      release: (resource: NoInfer<R>) => Call1<F, void>,
    ) => Call1<F, A>,
    <R, A>(
      use: (resource: NoInfer<R>) => Call1<F, A>,
      release: (resource: NoInfer<R>) => Call1<F, void>,
    ) => (acquire: Call1<F, R>) => Call1<F, A>
  >;
}

export const deriveAcquireUseRelease = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<MonadCancel<F, Err>, "of" | "void" | "flatMap" | "uncancellable" | "guaranteeCase">,
): Dual.First<MonadCancel<F, Err>["acquireUseRelease"]> =>
  function acquireUseRelease(acquire, use, release) {
    return F.uncancellable((poll) =>
      F.flatMap(acquire, (resource) =>
        F.guaranteeCase(
          // Deferred so that a `use` throwing synchronously is still released
          poll(F.flatMap(F.void(), () => use(resource))),
          () => release(resource),
        ),
      ),
    );
  };
