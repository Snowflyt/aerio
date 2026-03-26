/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Call1, HKT } from "hkt-core";

import type { Ref } from "../core/Ref";
import { deriveModify as deriveModifyRef } from "../core/Ref";
import type { Schedule } from "../core/Schedule";
import { NoScheduledExecutionError, TimeoutError } from "../errors";
import type { Dual, PickRaw } from "../utils";

import type { Clock } from "./Clock";
import type { Concurrent } from "./Concurrent";

export interface Sleep<in out F extends HKT<unknown, unknown>, in out Err>
  extends Concurrent<F, Err>, Clock<F> {}

// ╔═══════╗
// ║ sleep ║
// ╚═══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Creates an effect that, when executed, will suspend the current fiber for at least the specified duration in milliseconds.
   * The fiber will resume after the specified duration has elapsed, allowing other fibers to execute during the sleep period.
   *
   * Note that the actual sleep duration may be longer than the specified duration due to scheduling and other factors.
   */
  readonly sleep: (ms: number) => Call1<F, void>;
}

// ╔═══════╗
// ║ delay ║
// ╚═══════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Delays the execution of an effect by a specified duration in milliseconds.
   */
  readonly delay: Dual<
    <A>(self: Call1<F, A>, ms: number) => Call1<F, A>,
    (ms: number) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveDelay = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Sleep<F, Err>, "productR" | "sleep">,
): Dual.First<Sleep<F, Err>["delay"]> =>
  function delay(self, ms) {
    return F.productR(F.sleep(ms), self);
  };

// ╔══════════╗
// ║ schedule ║
// ╚══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Runs an effect according to a schedule and returns the last successful value.
   *
   * If the schedule completes before the first execution, the resulting effect fails with {@linkcode NoScheduledExecutionError}.
   */
  readonly schedule: Dual<
    <A>(self: Call1<F, A>, schedule: Schedule) => Call1<F, A>,
    (schedule: Schedule) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveSchedule = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Sleep<F, Err>, "cede" | "flatMap" | "of" | "throw" | "ref" | "monotonic" | "sleep">,
): Dual.First<Sleep<F, Err>["schedule"]> => {
  const Ref = {
    modify: deriveModifyRef<F>(),
  } as const;

  return function schedule<A>(self: Call1<F, A>, schedule: Schedule): Call1<F, A> {
    const nextAttempt = (attemptsRef: Ref<F, number>): Call1<F, number> =>
      Ref.modify(attemptsRef, (attempts) => {
        const next = attempts + 1;
        return [next, next] as const;
      });

    return F.flatMap(F.monotonic(), (startedAt) =>
      F.flatMap(F.ref(0), (attemptsRef) => {
        const loop = (value: A): Call1<F, A> =>
          F.flatMap(nextAttempt(attemptsRef), (attempt) =>
            F.flatMap(F.monotonic(), (now) => {
              const delay = schedule(attempt, now - startedAt);

              if (delay === void 0) return F.of(value);

              return F.flatMap(delay > 0 ? F.sleep(delay) : F.cede(), () => F.flatMap(self, loop));
            }),
          );

        return F.flatMap(nextAttempt(attemptsRef), (attempt) =>
          F.flatMap(F.monotonic(), (now) => {
            const delay = schedule(attempt, now - startedAt);

            if (delay === void 0) return F.throw(new NoScheduledExecutionError() as Err);

            return F.flatMap(delay > 0 ? F.sleep(delay) : F.cede(), () => F.flatMap(self, loop));
          }),
        );
      }),
    );
  };
};

// ╔════════╗
// ║ repeat ║
// ╚════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Runs an effect once immediately and then repeats it according to a schedule, returning the last successful value.
   */
  readonly repeat: Dual<
    <A>(self: Call1<F, A>, schedule: Schedule) => Call1<F, A>,
    (schedule: Schedule) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveRepeat = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Sleep<F, Err>, "cede" | "flatMap" | "of" | "ref" | "monotonic" | "sleep">,
): Dual.First<Sleep<F, Err>["repeat"]> => {
  const Ref = {
    modify: deriveModifyRef<F>(),
  } as const;

  return function repeat<A>(self: Call1<F, A>, schedule: Schedule): Call1<F, A> {
    // eslint-disable-next-line sonarjs/no-identical-functions
    const nextAttempt = (attemptsRef: Ref<F, number>): Call1<F, number> =>
      Ref.modify(attemptsRef, (attempts) => {
        const next = attempts + 1;
        return [next, next] as const;
      });

    return F.flatMap(F.monotonic(), (startedAt) =>
      F.flatMap(F.ref(0), (attemptsRef) => {
        // eslint-disable-next-line sonarjs/no-identical-functions
        const loop = (value: A): Call1<F, A> =>
          F.flatMap(nextAttempt(attemptsRef), (attempt) =>
            F.flatMap(F.monotonic(), (now) => {
              const delay = schedule(attempt, now - startedAt);

              if (delay === void 0) return F.of(value);

              return F.flatMap(delay > 0 ? F.sleep(delay) : F.cede(), () => F.flatMap(self, loop));
            }),
          );

        return F.flatMap(self, loop);
      }),
    );
  };
};

// ╔═══════╗
// ║ retry ║
// ╚═══════╝
export interface RetryOptions {
  /**
   * Delay policy controlling when the next retry should happen.
   */
  readonly schedule?: Schedule;
  /**
   * Continue retrying while this predicate returns `true`.
   */
  readonly while?: (e: unknown) => boolean;
  /**
   * Stop retrying once this predicate returns `true`.
   */
  readonly until?: (e: unknown) => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Retries a failing effect according to a retry policy.
   */
  readonly retry: Dual<
    {
      <A>(self: Call1<F, A>, options: RetryOptions): Call1<F, A>;
      <A>(self: Call1<F, A>, schedule: Schedule): Call1<F, A>;
    },
    {
      (options: RetryOptions): <A>(self: Call1<F, A>) => Call1<F, A>;
      (schedule: Schedule): <A>(self: Call1<F, A>) => Call1<F, A>;
    }
  >;
}

export const deriveRetry = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<Sleep<F, Err>, "catch" | "cede" | "flatMap" | "throw" | "ref" | "monotonic" | "sleep">,
): Dual.First<Sleep<F, Err>["retry"]> => {
  const Ref = {
    modify: deriveModifyRef<F>(),
  } as const;

  return function retry<A>(
    self: Call1<F, A>,
    optionsOrSchedule: RetryOptions | Schedule,
  ): Call1<F, A> {
    const options =
      typeof optionsOrSchedule === "function" ? { schedule: optionsOrSchedule } : optionsOrSchedule;

    const increment = (retriesRef: Ref<F, number>): Call1<F, number> =>
      Ref.modify(retriesRef, (retries) => {
        const nextRetry = retries + 1;
        return [nextRetry, nextRetry] as const;
      });

    return F.flatMap(F.monotonic(), (startedAt) =>
      F.flatMap(F.ref(0), (retriesRef) => {
        const loop = (): Call1<F, A> =>
          F.catch(self, (e) => {
            if (options.while && !options.while(e)) return F.throw(e);
            if (options.until && options.until(e)) return F.throw(e);

            return F.flatMap(increment(retriesRef), (retry) => {
              if (options.schedule === void 0) return F.flatMap(F.cede(), loop);

              return F.flatMap(F.monotonic(), (now) => {
                const delay = options.schedule!(retry, now - startedAt);

                if (delay === void 0) return F.throw(e);

                return F.flatMap(delay > 0 ? F.sleep(delay) : F.cede(), loop);
              });
            });
          });

        return loop();
      }),
    );
  };
};

// ╔═════════╗
// ║ timeout ║
// ╚═════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Fails with a {@linkcode TimeoutError} if the effect does not complete in time.
   */
  readonly timeout: Dual<
    <A>(self: Call1<F, A>, ms: number) => Call1<F, A>,
    (ms: number) => <A>(self: Call1<F, A>) => Call1<F, A>
  >;
}

export const deriveTimeout = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Sleep<F, Err>,
    | "as"
    | "cancelled"
    | "flatMap"
    | "never"
    | "of"
    | "productR"
    | "throw"
    | "uncancellable"
    | "race2Outcome"
    | "sleep"
  >,
): Dual.First<Sleep<F, Err>["timeout"]> =>
  function timeout<A>(self: Call1<F, A>, ms: number): Call1<F, A> {
    const timeout = Symbol();

    return F.uncancellable((poll) =>
      F.flatMap(poll(F.race2Outcome(self, F.as(F.sleep(ms), timeout))), (outcome): Call1<F, A> =>
        outcome._tag === "Succeeded" ?
          F.flatMap(outcome._0, (value) =>
            Object.is(value, timeout) ?
              F.throw(new TimeoutError("Operation timed out after " + ms + "ms") as Err)
            : F.of(value as A),
          )
        : outcome._tag === "Failed" ? F.throw(outcome._0)
        : F.productR(poll(F.cancelled()), F.never()),
      ),
    );
  };

// ╔═══════════╗
// ║ timeoutTo ║
// ╚═══════════╝
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Sleep<F, Err> {
  /**
   * Returns the fallback effect if the original effect does not complete in time.
   */
  readonly timeoutTo: Dual<
    <A, B>(self: Call1<F, A>, ms: number, fallback: Call1<F, B>) => Call1<F, A | B>,
    <B>(ms: number, fallback: Call1<F, B>) => <A>(self: Call1<F, A>) => Call1<F, A | B>
  >;
}

export const deriveTimeoutTo = <F extends HKT<unknown, unknown>, Err>(
  F: PickRaw<
    Sleep<F, Err>,
    | "as"
    | "cancelled"
    | "flatMap"
    | "never"
    | "of"
    | "productR"
    | "throw"
    | "uncancellable"
    | "race2Outcome"
    | "sleep"
  >,
): Dual.First<Sleep<F, Err>["timeoutTo"]> =>
  function timeoutTo<A, B>(self: Call1<F, A>, ms: number, fallback: Call1<F, B>): Call1<F, A | B> {
    const timeout = Symbol();

    return F.uncancellable((poll) =>
      F.flatMap(
        poll(F.race2Outcome(self, F.as(F.sleep(ms), timeout))),
        (outcome): Call1<F, A | B> =>
          outcome._tag === "Succeeded" ?
            F.flatMap(outcome._0, (value) =>
              // Cats Effect runs the fallback masked, so a fallback that never ends can't be cancelled:
              // https://github.com/typelevel/cats-effect/blob/de84c01f76b2f42fcee9d43aba66c82992add103/kernel/shared/src/main/scala/cats/effect/kernel/GenTemporal.scala#L99-L107
              // We believe this is a bug, so instead of mirroring it we run the fallback under `poll`
              Object.is(value, timeout) ? poll(fallback) : F.of(value as A),
            )
          : outcome._tag === "Failed" ? F.throw(outcome._0)
          : F.productR(poll(F.cancelled()), F.never()),
      ),
    );
  };
