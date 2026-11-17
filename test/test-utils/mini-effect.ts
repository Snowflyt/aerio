/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * A minimal effect used to exercise typeclass-derived combinators
 * (e.g. {@linkcode MonadCancel.deriveGuaranteeCase}).
 *
 * It is built directly on the kernel's instruction set, wiring up the kernel primitives
 * (`of`/`throw`/`flatMap`/`catch`/`sync`, `cancelled`/`onCancel`/`uncancellable`, plus the
 * concurrency atoms `cont`/`fork`/`forkGlobal`/`never`/`racePair`); every other combinator
 * (`map`/`productR`/`suspend`/`guarantee`/`deferred`/`asyncCancellable`/`race2`/`both`/
 * `do`/`zipWith`/…) is derived from those atoms via the typeclass `derive*` functions —
 * including the ones under test. Execution reuses the kernel's own `FiberRuntime`, so
 * cancellation semantics (masking, polling, finalizers) and concurrency semantics
 * (supervision, racing) are the real ones, not stubs.
 */

import type { RawArg0, RawTArg, TypeLambdaG } from "hkt-core";
import { expect } from "vitest";

import * as Deferred from "../../src/core/Deferred";
import type { Outcome } from "../../src/core/Outcome";
import * as Ref from "../../src/core/Ref";
import { CancellationError } from "../../src/errors";
import * as kernel from "../../src/internal/kernel";
import * as Applicative from "../../src/typeclass/Applicative";
import * as ApplicativeThrow from "../../src/typeclass/ApplicativeThrow";
import * as Apply from "../../src/typeclass/Apply";
import * as Async from "../../src/typeclass/Async";
import * as Covariant from "../../src/typeclass/Covariant";
import * as Do from "../../src/typeclass/Do";
import * as FlatMap from "../../src/typeclass/FlatMap";
import * as Monad from "../../src/typeclass/Monad";
import * as MonadCancel from "../../src/typeclass/MonadCancel";
import * as MonadZip from "../../src/typeclass/MonadZip";
import * as Of from "../../src/typeclass/Of";
import * as Spawn from "../../src/typeclass/Spawn";
import * as Sync from "../../src/typeclass/Sync";

// -----------------------------------------------------------------------------
// Mini
// -----------------------------------------------------------------------------
/** The minimal effect type — the kernel {@linkcode Op} under a distinct brand. */
export interface Mini<out A> {
  readonly "~~kind/Mini": readonly [A];
}

export interface MiniHKT extends TypeLambdaG<["A"]> {
  signature: (A: RawTArg<this, "A">) => Mini<RawTArg<this, "A">>;
  return: Mini<RawArg0<this>>;
}

const of = kernel.deriveOf<MiniHKT>(Object.prototype);

const throw_ = kernel.deriveThrow<MiniHKT>(Object.prototype);

const sync = kernel.deriveSync<MiniHKT>(Object.prototype);

const cont = kernel.deriveCont<MiniHKT>(Object.prototype);

const flatMap = kernel.deriveFlatMap<MiniHKT>(Object.prototype);

const zip = kernel.deriveZip<MiniHKT>(Object.prototype);

const catch_ = kernel.deriveCatch<MiniHKT>(Object.prototype);

const cancelled = kernel.deriveCancelled<MiniHKT>(Object.prototype);

const onCancel = kernel.deriveOnCancel<MiniHKT>(Object.prototype);

const uncancellable = kernel.deriveUncancellable<MiniHKT>(Object.prototype);

const fork = kernel.deriveFork<MiniHKT>(Object.prototype);

const forkGlobal = kernel.deriveForkGlobal<MiniHKT>(Object.prototype);

const sleep = kernel.deriveSleep<MiniHKT>(Object.prototype);

const never = kernel.deriveNever<MiniHKT>(Object.prototype);

const cede = kernel.deriveCede<MiniHKT>(Object.prototype);

const racePair = kernel.deriveRacePair<MiniHKT>(Object.prototype);

const guaranteeCase = MonadCancel.deriveGuaranteeCase<MiniHKT, unknown>({
  as: Covariant.deriveAs<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  void: Of.deriveVoid<MiniHKT>({ of }),
  of,
  productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
  flatMap,
  throw: throw_,
  catch: catch_,
  uncancellable,
  onCancel,
});

export const Mini = {
  // Constructors
  of,
  void: Of.deriveVoid<MiniHKT>({ of }),
  throw: throw_,
  sync,
  suspend: Sync.deriveSuspend<MiniHKT>({
    flatten: FlatMap.deriveFlatten<MiniHKT>({ flatMap }),
    sync,
  }),
  cont,
  asyncUncancellable: Async.deriveAsyncUncancellable<MiniHKT>({
    productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
    flatMap,
    uncancellable,
    sync,
    cont,
  }),
  asyncCancellable: Async.deriveAsyncCancellable<MiniHKT>({
    flatMap,
    uncancellable,
    onCancel,
    sync,
    cont,
  }),
  promise: Async.derivePromise<MiniHKT>({
    productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
    flatMap,
    uncancellable,
    onCancel,
    sync,
    cont,
  }),
  cancelled,
  uncancellable,
  sleep,
  never,
  cede,
  racePair,
  race2Outcome: Spawn.deriveRace2Outcome<MiniHKT, unknown>({
    as: Covariant.deriveAs<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    }),
    flatMap,
    uncancellable,
    racePair,
  }),
  race2: Spawn.deriveRace2<MiniHKT, unknown>({
    product: FlatMap.deriveProduct<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
      flatMap,
    }),
    productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
    flatMap,
    throw: throw_,
    uncancellable,
    cancelled,
    onCancel,
    never,
    racePair,
  }),
  bothOutcome: Spawn.deriveBothOutcome<MiniHKT, unknown>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    flatMap,
    uncancellable,
    onCancel,
    racePair,
  }),
  both: Spawn.deriveBoth<MiniHKT, unknown>({
    product: FlatMap.deriveProduct<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
      flatMap,
    }),
    productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
    flatMap,
    throw: throw_,
    uncancellable,
    cancelled,
    onCancel,
    never,
    racePair,
  }),

  // Do notation
  do: Do.deriveDo<MiniHKT>({
    asVoid: Covariant.deriveAsVoid<MiniHKT>({
      as: Covariant.deriveAs<MiniHKT>({
        map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
      }),
    }),
    of,
  }),
  let: Do.deriveLet<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  letV: Do.deriveLetV<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  bind: Do.deriveBind<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    flatMap,
  }),
  bindV: Do.deriveBindV<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    flatMap,
  }),
  also: Do.deriveAlso<MiniHKT>({
    as: Covariant.deriveAs<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    }),
    flatMap,
  }),
  alsoV: Do.deriveAlsoV<MiniHKT>({
    as: Covariant.deriveAs<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    }),
    flatMap,
  }),
  return: Do.deriveReturn<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  returnM: Do.deriveReturnM<MiniHKT>({ flatMap }),

  // Control flow
  when: Applicative.deriveWhen<MiniHKT>({
    void: Of.deriveVoid<MiniHKT>({ of }),
  }),
  throwWhen: ApplicativeThrow.deriveThrowWhen<MiniHKT, unknown>({
    void: Of.deriveVoid<MiniHKT>({ of }),
    throw: throw_,
  }),
  unless: Applicative.deriveUnless<MiniHKT>({
    void: Of.deriveVoid<MiniHKT>({ of }),
  }),
  throwUnless: ApplicativeThrow.deriveThrowUnless<MiniHKT, unknown>({
    void: Of.deriveVoid<MiniHKT>({ of }),
    throw: throw_,
  }),

  // State management
  ref: Sync.deriveRef<MiniHKT>({ sync }),

  // Concurrency
  deferred: Async.deriveDeferred<MiniHKT>({
    of,
    flatten: FlatMap.deriveFlatten<MiniHKT>({ flatMap }),
    flatMap,
    uncancellable,
    onCancel,
    sync,
    suspend: Sync.deriveSuspend<MiniHKT>({
      flatten: FlatMap.deriveFlatten<MiniHKT>({ flatMap }),
      sync,
    }),
    cont,
  }),

  // Resource management
  acquireUseRelease: MonadCancel.deriveAcquireUseRelease<MiniHKT, unknown>({
    of,
    void: Of.deriveVoid<MiniHKT>({ of }),
    flatMap,
    uncancellable,
    guaranteeCase,
  }),

  // Methods
  fork,
  forkGlobal,
  imap: Covariant.deriveImap<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  tap: Covariant.deriveTap<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  as: Covariant.deriveAs<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
  }),
  asVoid: Covariant.deriveAsVoid<MiniHKT>({
    as: Covariant.deriveAs<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    }),
  }),
  ap: FlatMap.deriveAp<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    flatMap,
  }),
  product: FlatMap.deriveProduct<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    flatMap,
  }),
  productL: Apply.deriveProductL<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    product: FlatMap.deriveProduct<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
      flatMap,
    }),
  }),
  productR: FlatMap.deriveProductR<MiniHKT>({ flatMap }),
  flatten: FlatMap.deriveFlatten<MiniHKT>({ flatMap }),
  flatMap,
  flatTap: FlatMap.deriveFlatTap<MiniHKT>({
    as: Covariant.deriveAs<MiniHKT>({
      map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    }),
    flatMap,
  }),
  forever: FlatMap.deriveForever<MiniHKT>({ flatMap }),
  zip,
  zipWith: MonadZip.deriveZipWith<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    zip,
  }),
  zipL: MonadZip.deriveZipL<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    zip,
  }),
  zipR: MonadZip.deriveZipR<MiniHKT>({
    map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
    zip,
  }),
  catch: catch_,
  ignore: ApplicativeThrow.deriveIgnore<MiniHKT, unknown>({
    asVoid: Covariant.deriveAsVoid<MiniHKT>({
      as: Covariant.deriveAs<MiniHKT>({
        map: Monad.deriveMap<MiniHKT>({ of, flatMap }),
      }),
    }),
    void: Of.deriveVoid<MiniHKT>({ of }),
    catch: catch_,
  }),
  onCancel,
  guarantee: MonadCancel.deriveGuarantee<MiniHKT, unknown>({ guaranteeCase }),
  guaranteeCase,
} as const;

// -----------------------------------------------------------------------------
// MiniOutcome
// -----------------------------------------------------------------------------
/** The result of running a {@linkcode Mini}, reusing the kernel {@linkcode Outcome} shape. */
export type MiniOutcome<A> = Outcome<MiniHKT, unknown, A>;

export const MiniOutcome = {
  Succeeded: <A>(fa: Mini<A>): MiniOutcome<A> => ({ _tag: "Succeeded", _0: fa }),
  Failed: <A>(error: unknown): MiniOutcome<A> => ({ _tag: "Failed", _0: error }),
  Cancelled: <A>(): MiniOutcome<A> => ({ _tag: "Cancelled" }),
} as const;

// -----------------------------------------------------------------------------
// MiniRef
// -----------------------------------------------------------------------------
/** A {@linkcode Ref} specialized to the {@linkcode Mini} effect. */
export interface MiniRef<in out A> extends Ref.Ref<MiniHKT, A> {}

/** Creates a {@linkcode MiniRef} holding `a`, running the (synchronous) allocation effect. */
export const ref = <A>(a: A): MiniRef<A> => unsafeRunSync(Mini.ref(a));

export const MiniRef = {
  get: Ref.deriveGet<MiniHKT>(),
  set: Ref.deriveSet<MiniHKT>(),
  update: Ref.deriveUpdate<MiniHKT>(),
};

// -----------------------------------------------------------------------------
// MiniDeferred
// -----------------------------------------------------------------------------
/** A {@linkcode Deferred} specialized to the {@linkcode Mini} effect. */
export interface MiniDeferred<in out A> extends Deferred.Deferred<MiniHKT, A> {}

/** Creates a {@linkcode MiniDeferred}, running the (synchronous) allocation effect. */
export const deferred = <A>(): MiniDeferred<A> => unsafeRunSync(Mini.deferred<A>());

export const MiniDeferred = {
  get: Deferred.deriveGet<MiniHKT>(),
  complete: Deferred.deriveComplete<MiniHKT>(),
};

// -----------------------------------------------------------------------------
// Test utilities
// -----------------------------------------------------------------------------
/**
 * Runs a `Mini` to completion via the kernel's own fiber runtime and returns its
 * {@linkcode MiniOutcome}. Only valid for synchronous programs; an asynchronous `Mini`
 * never settles and `runSync` throws.
 */
export const runSync = <A>(self: Mini<A>): MiniOutcome<A> => {
  const fiber = new kernel.FiberRuntime<A>(
    {},
    self as unknown as kernel.Op<A>,
    null,
    null,
    null,
    true,
  );
  fiber.run();
  const outcome = fiber.outcome;
  if (!outcome) throw new TypeError("mini-effect: program did not complete synchronously");
  return outcome as unknown as MiniOutcome<A>;
};

/**
 * Runs a {@linkcode Mini} expecting success and returns its value in one step — the common case for assertions.
 * Throws if the program fails, is cancelled, or does not settle synchronously.
 */
export const unsafeRunSync = <A>(self: Mini<A>): A => {
  const outcome = runSync(self);
  expect(outcome._tag).toBe("Succeeded");
  if (outcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
  return (outcome._0 as unknown as { _0: A })._0;
};

/**
 * Runs a {@linkcode Mini} via the kernel's fiber runtime and resolves with its {@linkcode MiniOutcome}.
 * Unlike {@linkcode runSync}, this also works for asynchronous programs (`fork`/`cont`/`sleep`/`deferred`): the returned promise settles when the fiber does.
 */
export const runPromise = <A>(self: Mini<A>): Promise<MiniOutcome<A>> =>
  new Promise<MiniOutcome<A>>((resolve) => {
    new kernel.FiberRuntime<A>(
      {},
      self as unknown as kernel.Op<A>,
      null,
      null,
      resolve as (outcome: Outcome<kernel.OpHKT, unknown, A>) => void,
    ).run();
  });

/**
 * Runs a {@linkcode Mini} and resolves with its success value; rejects with the error on failure and with a {@linkcode CancellationError} on cancellation.
 * The async counterpart of {@linkcode unsafeRunSync}.
 */
export const unsafeRunPromise = <A>(self: Mini<A>): Promise<A> =>
  new Promise<A>((resolve, reject) => {
    new kernel.FiberRuntime<A>({}, self as unknown as kernel.Op<A>, null, null, (outcome) => {
      if (outcome._tag === "Succeeded") {
        resolve((outcome._0 as { _0: A })._0);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(outcome._tag === "Failed" ? outcome._0 : new CancellationError());
    }).run();
  });
