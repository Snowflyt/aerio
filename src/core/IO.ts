/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT, PartialApply, RawArg0, RawTArg, TypeLambdaG } from "hkt-core";

import { CancellationError } from "../errors";
import * as kernel from "../internal/kernel";
import * as Applicative from "../typeclass/Applicative";
import * as ApplicativeThrow from "../typeclass/ApplicativeThrow";
import * as Apply from "../typeclass/Apply";
import * as Async from "../typeclass/Async";
import * as Concurrent from "../typeclass/Concurrent";
import * as Covariant from "../typeclass/Covariant";
import * as Do from "../typeclass/Do";
import * as FlatMap from "../typeclass/FlatMap";
import * as MonadCancel from "../typeclass/MonadCancel";
import * as MonadZip from "../typeclass/MonadZip";
import * as Of from "../typeclass/Of";
import * as Sleep from "../typeclass/Sleep";
import * as Spawn from "../typeclass/Spawn";
import * as Sync from "../typeclass/Sync";

import type { Deferred, DeferredHKT } from "./Deferred";
import type { FiberHKT } from "./Fiber";
import type { FiberLocal, FiberLocalHKT } from "./FiberLocal";
import { deriveUnsafeCreate as deriveUnsafeCreateFiberLocal } from "./FiberLocal";
import type { Outcome, OutcomeHKT } from "./Outcome";
import type { Ref, RefHKT } from "./Ref";

export interface IO<out A> {
  readonly "~~kind/IO": readonly [A];
}

export interface IOHKT extends TypeLambdaG<["A"]> {
  signature: (A: RawTArg<this, "A">) => IO<RawTArg<this, "A">>;
  return: IO<RawArg0<this>>;
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------
export const deriveOf = kernel.deriveOf;

export const deriveVoid = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Of.deriveVoid<F>({
    of: kernel.deriveOf(IOProto),
  });

export const deriveThrow = kernel.deriveThrow;

export const deriveSync = kernel.deriveSync;

export const deriveSuspend = kernel.deriveSuspend;

export const deriveGen = kernel.deriveGen;

export const deriveCont = kernel.deriveCont;

export const deriveAsyncUncancellable = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Async.deriveAsyncUncancellable<F>({
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    sync: kernel.deriveSync(IOProto),
    cont: kernel.deriveCont(IOProto),
  });

export const deriveAsyncCancellable = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Async.deriveAsyncCancellable<F>({
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    sync: kernel.deriveSync(IOProto),
    cont: kernel.deriveCont(IOProto),
  });

export const derivePromise = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Async.derivePromise<F>({
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    sync: kernel.deriveSync(IOProto),
    cont: kernel.deriveCont(IOProto),
  });

export const deriveWithFiberRuntime = kernel.deriveWithFiberRuntime;

export const deriveCancelled = kernel.deriveCancelled;

export const deriveUncancellable = kernel.deriveUncancellable;

export const deriveMonotonic = kernel.deriveMonotonic;

export const deriveRealTime = kernel.deriveRealTime;

export const deriveSleep = kernel.deriveSleep;

export const deriveNever = kernel.deriveNever;

export const deriveCede = kernel.deriveCede;

export const deriveRacePair = kernel.deriveRacePair;

export const deriveRace2Outcome = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  IOProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) =>
  Spawn.deriveRace2Outcome<F, unknown, FF>({
    as: kernel.deriveAs(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    racePair: kernel.deriveRacePair<F, PartialApply<FiberHKT, [F, unknown]>, FF>(
      IOProto,
      Object.prototype,
      OutcomeProto,
    ),
  });

export const deriveRace2 = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Spawn.deriveRace2<F, unknown>({
    product: kernel.deriveProduct(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    never: kernel.deriveNever(IOProto),
    racePair: kernel.deriveRacePair(IOProto),
  });

export const deriveBothOutcome = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  IOProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
) =>
  Spawn.deriveBothOutcome<F, unknown, FF>({
    map: kernel.deriveMap(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    racePair: kernel.deriveRacePair<F, PartialApply<FiberHKT, [F, unknown]>, FF>(
      IOProto,
      Object.prototype,
      OutcomeProto,
    ),
  });

export const deriveBoth = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Spawn.deriveBoth<F, unknown>({
    product: kernel.deriveProduct(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    never: kernel.deriveNever(IOProto),
    racePair: kernel.deriveRacePair(IOProto),
  });

// -----------------------------------------------------------------------------
// Do notation
// -----------------------------------------------------------------------------
export const deriveDo = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveDo<F>({
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
  });

export const deriveLet = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveLet<F>({
    map: kernel.deriveMap(IOProto),
  });

export const deriveLetV = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveLetV<F>({
    map: kernel.deriveMap(IOProto),
  });

export const deriveBind = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveBind<F>({
    map: kernel.deriveMap(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveBindV = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveBindV<F>({
    map: kernel.deriveMap(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveAlso = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveAlso<F>({
    as: kernel.deriveAs(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveAlsoV = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveAlsoV<F>({
    as: kernel.deriveAs(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveReturn = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveReturn<F>({
    map: kernel.deriveMap(IOProto),
  });

export const deriveReturnM = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Do.deriveReturnM<F>({
    flatMap: kernel.deriveFlatMap(IOProto),
  });

// -----------------------------------------------------------------------------
// Control flow
// -----------------------------------------------------------------------------
export const deriveWhen = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Applicative.deriveWhen<F>({
    void: deriveVoid(IOProto),
  });

export const deriveThrowWhen = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  ApplicativeThrow.deriveThrowWhen<F, unknown>({
    throw: kernel.deriveThrow(IOProto),
    void: deriveVoid(IOProto),
  });

export const deriveUnless = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Applicative.deriveUnless<F>({
    void: deriveVoid(IOProto),
  });

export const deriveThrowUnless = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  ApplicativeThrow.deriveThrowUnless<F, unknown>({
    throw: kernel.deriveThrow(IOProto),
    void: deriveVoid(IOProto),
  });

// -----------------------------------------------------------------------------
// Scheduling
// -----------------------------------------------------------------------------
export const deriveSchedule = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveSchedule<F, unknown>({
    cede: kernel.deriveCede<F>(IOProto),
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    of: kernel.deriveOf<F>(IOProto),
    throw: kernel.deriveThrow<F>(IOProto),
    ref: deriveRef(IOProto),
    monotonic: kernel.deriveMonotonic<F>(IOProto),
    sleep: kernel.deriveSleep<F>(IOProto),
  });

export const deriveRepeat = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveRepeat<F, unknown>({
    cede: kernel.deriveCede<F>(IOProto),
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    of: kernel.deriveOf<F>(IOProto),
    ref: deriveRef(IOProto),
    monotonic: kernel.deriveMonotonic<F>(IOProto),
    sleep: kernel.deriveSleep<F>(IOProto),
  });

export const deriveRetry = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveRetry<F, unknown>({
    catch: kernel.deriveCatch<F>(IOProto),
    cede: kernel.deriveCede<F>(IOProto),
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    throw: kernel.deriveThrow<F>(IOProto),
    ref: deriveRef(IOProto),
    monotonic: kernel.deriveMonotonic<F>(IOProto),
    sleep: kernel.deriveSleep<F>(IOProto),
  });

export const deriveTimeout = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveTimeout<F, unknown>({
    as: kernel.deriveAs<F>(IOProto),
    cancelled: kernel.deriveCancelled<F>(IOProto),
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    never: kernel.deriveNever<F>(IOProto),
    of: kernel.deriveOf<F>(IOProto),
    productR: kernel.deriveProductR<F>(IOProto),
    throw: kernel.deriveThrow<F>(IOProto),
    uncancellable: kernel.deriveUncancellable<F>(IOProto),
    race2Outcome: deriveRace2Outcome<F>(IOProto),
    sleep: kernel.deriveSleep<F>(IOProto),
  });

export const deriveTimeoutTo = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveTimeoutTo<F, unknown>({
    as: kernel.deriveAs<F>(IOProto),
    cancelled: kernel.deriveCancelled<F>(IOProto),
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    never: kernel.deriveNever<F>(IOProto),
    of: kernel.deriveOf<F>(IOProto),
    productR: kernel.deriveProductR<F>(IOProto),
    throw: kernel.deriveThrow<F>(IOProto),
    uncancellable: kernel.deriveUncancellable<F>(IOProto),
    race2Outcome: deriveRace2Outcome<F>(IOProto),
    sleep: kernel.deriveSleep<F>(IOProto),
  });

// -----------------------------------------------------------------------------
// State management
// -----------------------------------------------------------------------------
export const deriveRef = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Ref<F, any>> = PartialApply<RefHKT, [F]>,
>(
  IOProto: object | null = Object.prototype,
  RefProto: object | null = Object.prototype,
) =>
  Sync.deriveRef<F, FF>(
    {
      sync: kernel.deriveSync(IOProto),
    },
    RefProto,
  );

export const deriveFiberLocal = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, FiberLocal<F, any>> = PartialApply<FiberLocalHKT, [F]>,
>(
  IOProto: object | null = Object.prototype,
  FiberLocalProto: object | null = Object.prototype,
): (<A>(initial: A) => Call1<F, Call1<FF, A>>) => {
  const unsafeCreateFiberLocal = deriveUnsafeCreateFiberLocal<F, FF>(FiberLocalProto);

  const F = {
    sync: kernel.deriveSync<F>(IOProto),
    unsafeModifyFiberLocal: kernel.deriveUnsafeModifyFiberLocal<F>(IOProto),
  } as const;

  return function fiberLocal<A>(initial: A): Call1<F, Call1<FF, A>> {
    return F.sync(() => {
      const key = Symbol();

      return unsafeCreateFiberLocal({
        slot: {
          _key: key,
          _initial: initial,
          _run: (f) => F.unsafeModifyFiberLocal(key, initial, f),
        },
      });
    });
  };
};

// -----------------------------------------------------------------------------
// Concurrency
// -----------------------------------------------------------------------------
export const deriveDeferred = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Deferred<F, any>> = PartialApply<DeferredHKT, [F]>,
>(
  IOProto: object | null = Object.prototype,
  DeferredProto: object | null = Object.prototype,
) =>
  Async.deriveDeferred<F, FF>(
    {
      of: kernel.deriveOf(IOProto),
      flatten: kernel.deriveFlatten(IOProto),
      flatMap: kernel.deriveFlatMap(IOProto),
      uncancellable: kernel.deriveUncancellable(IOProto),
      onCancel: kernel.deriveOnCancel(IOProto),
      sync: kernel.deriveSync(IOProto),
      suspend: kernel.deriveSuspend(IOProto),
      cont: kernel.deriveCont(IOProto),
    },
    DeferredProto,
  );

export const deriveMemoize = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<A>(fa: Call1<F, A>) => Call1<F, Call1<F, A>>) =>
  Concurrent.deriveMemoize<F, unknown>({
    map: kernel.deriveMap(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatten: kernel.deriveFlatten(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    catch: kernel.deriveCatch(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
    forkGlobal: kernel.deriveForkGlobal(IOProto),
    never: kernel.deriveNever(IOProto),
    ref: deriveRef(IOProto),
    deferred: deriveDeferred(IOProto),
  });

export const deriveAll = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<const IOS extends Iterable<Call1<F, unknown>>>(
  fas: IOS,
) => Call1<
  F,
  IOS extends readonly unknown[] ?
    { readonly [I in keyof IOS]: IOS[I] extends Call1<F, infer A> ? A : never }
  : IOS extends Iterable<Call1<F, infer A>> ? readonly A[]
  : never
>) =>
  Concurrent.deriveAll<F, unknown>({
    map: kernel.deriveMap(IOProto),
    as: kernel.deriveAs(IOProto),
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatten: kernel.deriveFlatten(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
    fork: kernel.deriveFork(IOProto),
    never: kernel.deriveNever(IOProto),
    deferred: deriveDeferred(IOProto),
  });

export const deriveAllKeyed = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<const FAS extends { readonly [K in string | symbol]: Call1<F, unknown> }>(
  fas: FAS,
) => Call1<F, { readonly [K in keyof FAS]: FAS[K] extends Call1<F, infer A> ? A : never }>) =>
  Concurrent.deriveAllKeyed<F, unknown>({
    map: kernel.deriveMap(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    void: deriveVoid(IOProto),
    throw: kernel.deriveThrow(IOProto),
    all: deriveAll(IOProto),
  });

export const deriveAllOutcome = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  IOProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
): (<const IOS extends Iterable<Call1<F, unknown>>>(
  fas: IOS,
) => Call1<
  F,
  IOS extends readonly unknown[] ?
    { readonly [I in keyof IOS]: IOS[I] extends Call1<F, infer A> ? Call1<FF, A> : never }
  : IOS extends Iterable<Call1<F, infer A>> ? readonly Call1<FF, A>[]
  : never
>) =>
  Concurrent.deriveAllOutcome<F, unknown>(
    {
      as: kernel.deriveAs(IOProto),
      asVoid: deriveAsVoid(IOProto),
      of: kernel.deriveOf(IOProto),
      void: deriveVoid(IOProto),
      productR: kernel.deriveProductR(IOProto),
      flatMap: kernel.deriveFlatMap(IOProto),
      throw: kernel.deriveThrow(IOProto),
      uncancellable: kernel.deriveUncancellable(IOProto),
      onCancel: kernel.deriveOnCancel(IOProto),
      guaranteeCase: kernel.deriveGuaranteeCase(IOProto, OutcomeProto),
      fork: kernel.deriveFork(IOProto),
      deferred: deriveDeferred(IOProto),
    },
    OutcomeProto,
  );

export const deriveAny = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<A>(ios: Iterable<Call1<F, A>>) => Call1<F, A>) =>
  Concurrent.deriveAny<F, unknown>({
    as: kernel.deriveAs(IOProto),
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
    fork: kernel.deriveFork(IOProto),
    never: kernel.deriveNever(IOProto),
    deferred: deriveDeferred(IOProto),
  });

export const deriveAnyOrdered = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<A>(ios: Iterable<Call1<F, A>>) => Call1<F, A>) =>
  Concurrent.deriveAnyOrdered<F, unknown>({
    as: kernel.deriveAs(IOProto),
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
    fork: kernel.deriveFork(IOProto),
    never: kernel.deriveNever(IOProto),
    deferred: deriveDeferred(IOProto),
  });

export const deriveRace = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
): (<A>(ios: Iterable<Call1<F, A>>) => Call1<F, A>) =>
  Concurrent.deriveRace<F, unknown>({
    as: kernel.deriveAs(IOProto),
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
    fork: kernel.deriveFork(IOProto),
    never: kernel.deriveNever(IOProto),
    deferred: deriveDeferred(IOProto),
  });

export const deriveRaceOutcome = <
  F extends HKT<unknown, unknown> = IOHKT,
  FF extends HKT<unknown, Outcome<F, unknown, unknown>> = PartialApply<OutcomeHKT, [F, unknown]>,
>(
  IOProto: object | null = Object.prototype,
  OutcomeProto: object | null = Object.prototype,
): (<A>(ios: Iterable<Call1<F, A>>) => Call1<F, Call1<FF, A>>) =>
  Concurrent.deriveRaceOutcome<F, unknown, FF>({
    as: kernel.deriveAs(IOProto),
    asVoid: deriveAsVoid(IOProto),
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    productR: kernel.deriveProductR(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    throw: kernel.deriveThrow(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    cancelled: kernel.deriveCancelled(IOProto),
    onCancel: kernel.deriveOnCancel(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto, OutcomeProto),
    fork: kernel.deriveFork(IOProto),
    never: kernel.deriveNever(IOProto),
    deferred: deriveDeferred(IOProto),
  });

// -----------------------------------------------------------------------------
// Resource management
// -----------------------------------------------------------------------------
export const deriveAcquireUseRelease = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  MonadCancel.deriveAcquireUseRelease<F, unknown>({
    of: kernel.deriveOf(IOProto),
    void: deriveVoid(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
    uncancellable: kernel.deriveUncancellable(IOProto),
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
  });

// -----------------------------------------------------------------------------
// Static methods
// -----------------------------------------------------------------------------
/**
 * Resolves a module from a list of module names (either CommonJS or ES Module),
 * calling the callback with the first successfully resolved module, or `null`
 * if none could be resolved.
 *
 * @param modules The list of module names to try to resolve.
 * @param callback The callback to call with the resolved module or `null`.
 */
const resolveModule = (
  modules: readonly string[],
  callback: (mod: Record<string, unknown> | null) => void,
): void => {
  let index = 0;
  function next() {
    if (index >= modules.length) {
      callback(null);
      return;
    }
    const modName = modules[index++]!;
    _resolveModule(modName, (mod) => {
      if (mod) callback(mod);
      else next();
    });
  }
  next();
};
const _resolveModule = (
  modName: string,
  callback: (mod: Record<string, unknown> | null) => void,
): void => {
  // @ts-expect-error - `require` exists only in CommonJS environment
  if (typeof require !== "undefined") {
    // CommonJS environment
    let mod = null;
    try {
      // @ts-expect-error - `require` exists only in CommonJS environment
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require(modName);
    } catch (e) {
      // Ignore require errors
    }
    callback(mod);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function("return import('" + modName + "')")().then(
      (mod: any) => callback(mod),
      () => callback(null),
    );
  }
};

export const deriveInput = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  // @ts-expect-error - `prompt` is only available in browsers
  if (typeof window === "object" && typeof window.prompt === "function") {
    const F = {
      sync: kernel.deriveSync<F>(IOProto),
    } as const;

    /**
     * Creates an effect that prompts the user for input.
     *
     * **Note**
     *
     * This function is only available in browser, Node.js-compatible environments (requires Node.js 6+), and QuickJS.
     * - In browser, it uses the `window.prompt` function to display a dialog box.
     * - In Node.js, it uses the `readline` module to read input from the console.
     * - In QuickJS, it uses the `os.setReadHandler` API to read input from `std.in`.
     *
     * Note that due to the synchronous nature of `window.prompt`, this function is not cancellable in browsers and will block the main thread until the user provides input.
     * In Node.js and QuickJS, it is cancellable and will not block the main thread.
     *
     * **Example**
     *
     * ```typescript
     * const program = flatMap(
     *   input("Enter your name: "),
     *   (name) => println(`Hello, ${name}!`),
     * );
     *
     * unsafeRun(program);
     * //> Enter your name: John
     * //> Hello, John!
     * ```
     */
    return function input(prompt?: string): Call1<F, string> {
      return F.sync(function input() {
        // @ts-expect-error - `prompt` is only available in browsers
        const input: string | null = window.prompt(prompt);
        if (input === null) throw new CancellationError("User cancelled prompt");
        return input;
      });
    };
  }

  // Try Node.js API
  const F = {
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    uncancellable: kernel.deriveUncancellable<F>(IOProto),
    onCancel: kernel.deriveOnCancel<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
    cont: kernel.deriveCont<F>(IOProto),
  } as const;

  /**
   * Creates an effect that prompts the user for input.
   *
   * **Note**
   *
   * This function is only available in browser, Node.js-compatible environments (requires Node.js 6+), and QuickJS.
   * - In browser, it uses the `window.prompt` function to display a dialog box.
   * - In Node.js, it uses the `readline` module to read input from the console.
   * - In QuickJS, it uses the `os.setReadHandler` API to read input from `std.in`.
   *
   * Note that due to the synchronous nature of `window.prompt`, this function is not cancellable in browsers and will block the main thread until the user provides input.
   * In Node.js and QuickJS, it is cancellable and will not block the main thread.
   *
   * **Example**
   *
   * ```typescript
   * const program = flatMap(
   *   input("Enter your name: "),
   *   (name) => println(`Hello, ${name}!`),
   * );
   *
   * unsafeRun(program);
   * //> Enter your name: John
   * //> Hello, John!
   * ```
   */
  return function input(prompt?: string): Call1<F, string> {
    return F.cont((succeed, fail, get) =>
      F.uncancellable((poll) =>
        F.flatMap(
          F.sync(function input() {
            let close: () => void = () => {};
            let done = false;

            const inputNode = (createInterface: any) => {
              if (done) return;
              const rl = createInterface({
                // @ts-expect-error - `process` is Node.js only
                input: process.stdin,
                // @ts-expect-error - `process` is Node.js only
                output: process.stdout,
                terminal: true,
              });
              close = () => rl.close();
              rl.question(prompt || "", (input: string) => {
                done = true;
                rl.close();
                if (input === "") fail(new CancellationError("User cancelled prompt"));
                else (succeed as (a: string) => void)(input);
              });
            };

            const inputQuickJS = (stdin: any, stdout: any, setReadHandler: any) => {
              if (done) return;
              if (prompt) {
                stdout.puts(prompt);
                stdout.flush();
              }
              close = () => setReadHandler(stdin, null);
              setReadHandler(stdin, () => {
                const input = stdin.getline();
                setReadHandler(stdin, null);
                if (!input) fail(new CancellationError("User cancelled prompt"));
                else (succeed as (a: string) => void)(input);
              });
            };

            resolveModule(["node:readline", "readline"], (readline) => {
              if (readline === null) {
                resolveModule(["qjs:std", "std"], (std) => {
                  if (
                    std === null ||
                    std.in === null ||
                    typeof std.in === "undefined" ||
                    typeof (std.in as any).getline !== "function" ||
                    std.out === null ||
                    typeof std.out === "undefined" ||
                    typeof (std.out as any).puts !== "function" ||
                    typeof (std.out as any).flush !== "function"
                  ) {
                    fail(new Error("Cannot load readline module"));
                    return;
                  }
                  // eslint-disable-next-line @typescript-eslint/no-implied-eval
                  new Function("return import('qjs:os')")()
                    // eslint-disable-next-line @typescript-eslint/no-implied-eval
                    .catch(new Function("return import('os')"))
                    .then(
                      (os: any) => {
                        if (!os || typeof os.setReadHandler !== "function") {
                          fail(new Error("Cannot load readline module"));
                          return;
                        }
                        inputQuickJS(std.in, std.out, os.setReadHandler);
                      },
                      () => {},
                    );
                });
                return;
              }
              inputNode(readline.createInterface);
            });

            return [close, () => done, () => (done = true)] as const;
          }),
          ([close, isDone, setDone]) =>
            F.onCancel(
              poll(get),
              F.sync(function cancel() {
                if (isDone()) return;
                setDone();
                close();
              }),
            ),
        ),
      ),
    );
  };
};

export const deriveNotify = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  // @ts-expect-error - `alert` is only available in browsers
  return typeof window === "object" && typeof window.alert === "function" ?
      /**
       * Creates an effect that notifies the user with a message.
       *
       * **Note**
       *
       * This function uses different APIs depending on the environment:
       * - In browser, it uses the `window.alert` function to display a dialog box.
       * - In other environments, it falls back to `console.log` to display the message.
       *
       * **Example**
       *
       * ```typescript
       * const program = notify("Hello, world!");
       *
       * unsafeRun(program);
       * //> Hello, world!
       * ```
       */
      function notify(message?: string): Call1<F, void> {
        return F.sync(function notify() {
          // @ts-expect-error - `alert` is only available in browsers
          window.alert(message);
        });
      }
      /**
       * Creates an effect that notifies the user with a message.
       *
       * **Note**
       *
       * This function uses different APIs depending on the environment:
       * - In browser, it uses the `window.alert` function to display a dialog box.
       * - In other environments, it falls back to `console.log` to display the message.
       *
       * **Example**
       *
       * ```typescript
       * const program = notify("Hello, world!");
       *
       * unsafeRun(program);
       * //> Hello, world!
       * ```
       */
    : function notify(message?: string): Call1<F, void> {
        return F.sync(function notify() {
          // @ts-expect-error - `console` may not be available in some environments
          console.log(message);
        });
      };
};

export const derivePrintln = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * Creates an effect that prints the given arguments to the console.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(println("Hello, world!")); //> Hello, world!
   * unsafeRun(println({ foo: "bar" }, 42n)); //> { foo: "bar" } 42n
   * ```
   */
  return function println(...args: unknown[]): Call1<F, void> {
    return F.sync(function println() {
      // @ts-expect-error - `console` may not be available in some environments
      console.log(...args);
    });
  };
};

export const deriveEprintln = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * Creates an effect that prints the given arguments to the console with {@linkcode console.error}.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(eprintln("Oops!")); //> Oops!
   * unsafeRun(eprintln({ foo: "bar" }, 42n)); //> { foo: "bar" } 42n
   * ```
   */
  return function eprintln(...args: unknown[]): Call1<F, void> {
    return F.sync(function eprintln() {
      // @ts-expect-error - `console` may not be available in some environments
      console.error(...args);
    });
  };
};

const stringifyDate = (date: Date) =>
  date.getFullYear() +
  "-" +
  ("0" + (date.getMonth() + 1)).slice(-2) +
  "-" +
  ("0" + date.getDate()).slice(-2) +
  " " +
  ("0" + date.getHours()).slice(-2) +
  ":" +
  ("0" + date.getMinutes()).slice(-2) +
  ":" +
  ("0" + date.getSeconds()).slice(-2) +
  "." +
  (date.getMilliseconds() + "00").slice(0, 3);

export const deriveLog = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    withFiberRuntime: kernel.deriveWithFiberRuntime<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * Creates an effect that logs the given arguments with timestamp, log level, and current fiber ID.
   *
   * The log level defaults to `info`. Use `logDebug`, `logInfo`, `logWarn`, `logError`, etc. for different log levels.
   *
   * **Example**
   *
   * ```typescript
   * IO.log("Hello, world!").unsafeRun();
   * //> [2025-11-09 13:58:00.000] [info] [fiber #0] Hello, world!
   * IO.log(Symbol("foo"), ["a"]).unsafeRun();
   * //> [2025-11-09 13:58:00.000] [info] [fiber #1] Symbol("foo") ["a"]
   * ```
   */
  return function log(...args: unknown[]): Call1<F, void> {
    return F.withFiberRuntime((fiber) =>
      F.sync(function log() {
        const logLevel =
          // @ts-expect-error - `process` belongs to Node.js environment
          typeof process !== "undefined" ? ["[\x1b[32minfo\x1b[0m]"]
            // @ts-expect-error - `document` belongs to browser environment
          : typeof document !== "undefined" ? ["[%cinfo%c]", "color: green", "color: unset"]
            // Fallback to ANSI escape codes
          : ["[\x1b[32minfo\x1b[0m]"];
        // @ts-expect-error - `console` may not be available in some environments
        console.log(
          "[" + stringifyDate(new Date()) + "] " + logLevel[0]! + " [fiber #" + fiber.id + "]",
          ...logLevel.slice(1),
          ...args,
        );
      }),
    );
  };
};

export const deriveLogDebug = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    withFiberRuntime: kernel.deriveWithFiberRuntime<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * The same as `log`, but sets the log level to `debug` and uses `console.debug` instead of `console.log`.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(logDebug("Hello, debug!"));
   * //> [2025-11-09 13:58:00.000] [debug] [fiber #0] Hello, debug!
   * ```
   */
  return function logDebug(...args: unknown[]): Call1<F, void> {
    return F.withFiberRuntime((fiber) =>
      F.sync(function logDebug() {
        const logLevel =
          // @ts-expect-error - `process` belongs to Node.js environment
          typeof process !== "undefined" ? ["[\x1b[34mdebug\x1b[0m]"]
            // @ts-expect-error - `document` belongs to browser environment
          : typeof document !== "undefined" ? ["[%cdebug%c]", "color: blue", "color: unset"]
            // Fallback to ANSI escape codes
          : ["[\x1b[34mdebug\x1b[0m]"];
        // @ts-expect-error - `console` may not be available in some environments
        (console.debug || console.log)(
          "[" + stringifyDate(new Date()) + "] " + logLevel[0]! + " [fiber #" + fiber.id + "]",
          ...logLevel.slice(1),
          ...args,
        );
      }),
    );
  };
};

export const deriveLogInfo = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    withFiberRuntime: kernel.deriveWithFiberRuntime<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * The same as `log`, but uses `console.info` instead of `console.log`.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(logInfo("Hello, info!"));
   * //> [2025-11-09 13:58:00.000] [info] [fiber #0] Hello, info!
   * ```
   */
  return function logInfo(...args: unknown[]): Call1<F, void> {
    return F.withFiberRuntime((fiber) =>
      F.sync(function logInfo() {
        const logLevel =
          // @ts-expect-error - `process` belongs to Node.js environment
          typeof process !== "undefined" ? ["[\x1b[32minfo\x1b[0m]"]
            // @ts-expect-error - `document` belongs to browser environment
          : typeof document !== "undefined" ? ["[%cinfo%c]", "color: green", "color: unset"]
            // Fallback to ANSI escape codes
          : ["[\x1b[32minfo\x1b[0m]"];
        // @ts-expect-error - `console` may not be available in some environments
        (console.info || console.log)(
          "[" + stringifyDate(new Date()) + "] " + logLevel[0]! + " [fiber #" + fiber.id + "]",
          ...logLevel.slice(1),
          ...args,
        );
      }),
    );
  };
};

export const deriveLogWarn = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    withFiberRuntime: kernel.deriveWithFiberRuntime<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * The same as `log`, but sets the log level to `warn` and uses `console.warn` instead of `console.log`.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(logWarn("Hello, warn!"));
   * //> [2025-11-09 13:58:00.000] [warn] [fiber #0] Hello, warn!
   * ```
   */
  return function logWarn(...args: unknown[]): Call1<F, void> {
    return F.withFiberRuntime((fiber) =>
      F.sync(function logWarn() {
        const logLevel =
          // @ts-expect-error - `process` belongs to Node.js environment
          typeof process !== "undefined" ? ["[\x1b[33mwarn\x1b[0m]"]
            // @ts-expect-error - `document` belongs to browser environment
          : typeof document !== "undefined" ? ["[%cwarn%c]", "color: orange", "color: unset"]
            // Fallback to ANSI escape codes
          : ["[\x1b[33mwarn\x1b[0m]"];
        // @ts-expect-error - `console` may not be available in some environments
        (console.warn || console.log)(
          "[" + stringifyDate(new Date()) + "] " + logLevel[0]! + " [fiber #" + fiber.id + "]",
          ...logLevel.slice(1),
          ...args,
        );
      }),
    );
  };
};

export const deriveLogError = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    withFiberRuntime: kernel.deriveWithFiberRuntime<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
  } as const;

  /**
   * The same as `log`, but sets the log level to `error` and uses `console.error` instead of `console.log`.
   *
   * **Example**
   *
   * ```typescript
   * unsafeRun(logError("Hello, error!"));
   * //> [2025-11-09 13:58:00.000] [error] [fiber #0] Hello, error!
   * ```
   */
  return function logError(...args: unknown[]): Call1<F, void> {
    return F.withFiberRuntime((fiber) =>
      F.sync(function logError() {
        const logLevel =
          // @ts-expect-error - `process` belongs to Node.js environment
          typeof process !== "undefined" ? ["[\x1b[31merror\x1b[0m]"]
            // @ts-expect-error - `document` belongs to browser environment
          : typeof document !== "undefined" ? ["[%cerror%c]", "color: red", "color: unset"]
            // Fallback to ANSI escape codes
          : ["[\x1b[31merror\x1b[0m]"];
        // @ts-expect-error - `console` may not be available in some environments
        (console.error || console.log)(
          "[" + stringifyDate(new Date()) + "] " + logLevel[0]! + " [fiber #" + fiber.id + "]",
          ...logLevel.slice(1),
          ...args,
        );
      }),
    );
  };
};

type Stringifiable = string | number | boolean | null | undefined;

type RequestInit =
  typeof globalThis extends (
    { fetch: (input: string, init?: infer RequestInit, ...args: never) => unknown }
  ) ?
    NonNullable<RequestInit>
  : never;
type Response =
  typeof globalThis extends { fetch: (...args: never) => Promise<infer R> } ? R : never;

export interface RequestOptions extends Omit<
  [RequestInit] extends [never] ? {} : RequestInit,
  "signal"
> {
  /**
   * Search parameters to append to the URL.
   *
   * If provided, {@linkcode URLSearchParams} will be used to append the parameters to the URL’s query string.
   *
   * NOTE: This will be merged with any existing search parameters in the URL.
   */
  params?:
    | Record<string, Stringifiable | readonly Stringifiable[]>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | (typeof globalThis extends { URLSearchParams: new (...args: never) => infer R } ? R : never);
  /**
   * JSON body to send with the request.
   *
   * If provided, the value will be serialized as JSON with {@linkcode JSON.stringify} and set as the request body, with the `Content-Type` header set to `application/json`.
   *
   * NOTE: This will override any existing `body` property in the options.
   */
  json?: unknown;
}

const buildURL = (
  input:
    | string
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | (typeof globalThis extends { fetch: (input: infer Input, ...args: never) => unknown } ? Input
      : never),
  params?:
    | Record<string, Stringifiable | readonly Stringifiable[]>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | (typeof globalThis extends { URLSearchParams: new (...args: never) => infer R } ? R : never),
):
  | string
  | (typeof globalThis extends { fetch: (input: infer Input, ...args: never) => unknown } ? Input
    : never) => {
  if (params === void 0) return input;

  const searchEntries: [string, Stringifiable | readonly Stringifiable[]][] = [];
  // @ts-expect-error - `URLSearchParams` belongs to WebAPI
  if (params instanceof URLSearchParams)
    (params as any).forEach((value: string, key: string) => searchEntries.push([key, value]));
  else Object.keys(params).forEach((key) => searchEntries.push([key, params[key as never]]));

  // @ts-expect-error - `URL` belongs to WebAPI
  const url = new URL(typeof input === "object" && "clone" in input ? input.url : input);
  for (const [key, value] of searchEntries) {
    if (Array.isArray(value)) for (const v of value) url.searchParams.append(key, String(v));
    else url.searchParams.append(key, String(value));
  }

  return typeof input === "object" && "clone" in input ?
      // @ts-expect-error - `Request` belongs to WebAPI
      new Request(url, input)
    : url;
};

export const deriveFetch = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) => {
  const F = {
    flatMap: kernel.deriveFlatMap<F>(IOProto),
    uncancellable: kernel.deriveUncancellable<F>(IOProto),
    onCancel: kernel.deriveOnCancel<F>(IOProto),
    sync: kernel.deriveSync<F>(IOProto),
    cont: kernel.deriveCont<F>(IOProto),
  } as const;

  /**
   * Creates an effect that performs a {@linkcode fetch} request.
   *
   * Aside from the standard {@linkcode fetch} options, you can also provide:
   * - `params`: Search parameters to append to the URL. If provided, {@linkcode URLSearchParams} will be used to append the parameters to the URL’s query string.
   * - `json`: JSON body to send with the request. If this option is provided, the value will be serialized as JSON with {@linkcode JSON.stringify} and set as the request body, with the `Content-Type` header set to `application/json`.
   *
   * **Note**
   *
   * This function assumes that {@linkcode fetch} is available in the global scope, along with the {@linkcode AbortController} API for cancellation.
   * This is the case in modern browsers and Node.js 18+. If you are using an older version of Node.js, you will need to use a polyfill with [node-fetch](https://github.com/node-fetch/node-fetch) or similar.
   *
   * **Example**
   *
   * ```typescript
   * const program = flatMap(
   *   flatMap(
   *     fetch("https://api.github.com/users/github"),
   *     (res) => promise(() => res.json()),
   *   ),
   *   println,
   * );
   *
   * unsafeRun(program);
   * //> { login: "github", id: 1, ... }
   * ```
   */
  return function fetch_(
    input:
      | string
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      | (typeof globalThis extends { fetch: (input: infer Input, ...args: never) => unknown } ?
          Input
        : never),
    options: RequestOptions = {},
  ): Call1<F, Response> {
    return F.cont<Response, Response>((succeed, fail, get) =>
      F.uncancellable((poll) =>
        F.flatMap(
          F.sync(() => {
            // @ts-expect-error - `AbortController` belongs to WebAPI
            const controller = new AbortController();
            const signal = controller.signal;

            const opts = Object.assign({}, options, { signal });
            if (opts.json !== void 0) {
              (opts as any).body = JSON.stringify(opts.json);
              (opts as any).headers = Object.assign(
                { "Content-Type": "application/json" },
                (opts as any).headers || {},
              );
              delete opts.json;
            }

            // @ts-expect-error - `fetch` belongs to WebAPI
            fetch(buildURL(input, opts.params), opts).then(succeed, (e: unknown) => {
              if (e instanceof Error && e.name === "AbortError")
                // Ignore the error since cancellation is already handled by the runtime
                return;
              fail(e);
            });

            return F.sync(function cancel() {
              controller.abort();
            });
          }),
          (finalizer) => F.onCancel(poll(get), finalizer),
        ),
      ),
    );
  };
};

// -----------------------------------------------------------------------------
// Methods
// -----------------------------------------------------------------------------
export const deriveFork = kernel.deriveFork;

export const deriveForkGlobal = kernel.deriveForkGlobal;

export const deriveImap = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Covariant.deriveImap<F>({
    map: kernel.deriveMap(IOProto),
  });

export const deriveMap = kernel.deriveMap;

export const deriveTap = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Covariant.deriveTap<F>({
    map: kernel.deriveMap(IOProto),
  });

export const deriveAs = kernel.deriveAs;

export const deriveAsVoid = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Covariant.deriveAsVoid<F>({
    as: kernel.deriveAs(IOProto),
  });

export const deriveAp = kernel.deriveAp;

export const deriveProduct = kernel.deriveProduct;

export const deriveProductL = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Apply.deriveProductL<F>({
    map: kernel.deriveMap(IOProto),
    product: kernel.deriveProduct(IOProto),
  });

export const deriveProductR = kernel.deriveProductR;

export const deriveFlatten = kernel.deriveFlatten;

export const deriveFlatMap = kernel.deriveFlatMap;

export const deriveFlatTap = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  FlatMap.deriveFlatTap<F>({
    as: kernel.deriveAs(IOProto),
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveForever = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  FlatMap.deriveForever<F>({
    flatMap: kernel.deriveFlatMap(IOProto),
  });

export const deriveZip = kernel.deriveZip;

export const deriveZipWith = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  MonadZip.deriveZipWith<F>({
    map: kernel.deriveMap(IOProto),
    zip: kernel.deriveZip(IOProto),
  });

export const deriveZipL = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  MonadZip.deriveZipL<F>({
    map: kernel.deriveMap(IOProto),
    zip: kernel.deriveZip(IOProto),
  });

export const deriveZipR = kernel.deriveZipR;

export const deriveCatch = kernel.deriveCatch;

export const deriveIgnore = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  ApplicativeThrow.deriveIgnore<F, unknown>({
    asVoid: deriveAsVoid(IOProto),
    void: deriveVoid(IOProto),
    catch: kernel.deriveCatch(IOProto),
  });

export const deriveOnCancel = kernel.deriveOnCancel;

export const deriveGuaranteeCase = kernel.deriveGuaranteeCase;

export const deriveGuarantee = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  MonadCancel.deriveGuarantee<F, unknown>({
    guaranteeCase: kernel.deriveGuaranteeCase(IOProto),
  });

export const deriveDelay = <F extends HKT<unknown, unknown> = IOHKT>(
  IOProto: object | null = Object.prototype,
) =>
  Sleep.deriveDelay<F, unknown>({
    productR: kernel.deriveProductR(IOProto),
    sleep: kernel.deriveSleep(IOProto),
  });

// -----------------------------------------------------------------------------
// Run functions
// -----------------------------------------------------------------------------
export const deriveUnsafeRunFork = kernel.deriveUnsafeRunFork;

export const deriveUnsafeRun = kernel.deriveUnsafeRun;

export const deriveUnsafeRunSync = kernel.deriveUnsafeRunSync;

export const deriveUnsafeRunAsync = kernel.deriveUnsafeRunAsync;

export const deriveUnsafeRunPromise = kernel.deriveUnsafeRunPromise;

export const deriveUnsafeRunPromiseCancellable = kernel.deriveUnsafeRunPromiseCancellable;
