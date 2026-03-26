/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TestControl } from "./TestControl";

/**
 * Error thrown when an effect is cancelled.
 */
export class CancellationError extends Error {
  constructor(
    message = "",
    ...restArgs: ConstructorParameters<ErrorConstructor> extends [string?, ...infer RestArgs] ?
      RestArgs
    : []
  ) {
    super(message || "Operation cancelled", ...restArgs);
    this.name = "CancellationError";
  }
}

/**
 * Error thrown when a {@linkcode TestControl}-driven program deadlocks without producing a result.
 */
export class NonTerminationError extends Error {
  constructor(
    message = "",
    ...restArgs: ConstructorParameters<ErrorConstructor> extends [string?, ...infer RestArgs] ?
      RestArgs
    : []
  ) {
    super(message || "Operation did not terminate", ...restArgs);
    this.name = "NonTerminationError";
  }
}

/**
 * Error thrown when a schedule completes before allowing the first execution.
 */
export class NoScheduledExecutionError extends Error {
  constructor(
    message = "",
    ...restArgs: ConstructorParameters<ErrorConstructor> extends [string?, ...infer RestArgs] ?
      RestArgs
    : []
  ) {
    super(message || "Schedule completed before the first execution", ...restArgs);
    this.name = "NoScheduledExecutionError";
  }
}

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends Error {
  constructor(
    message = "",
    ...restArgs: ConstructorParameters<ErrorConstructor> extends [string?, ...infer RestArgs] ?
      RestArgs
    : []
  ) {
    super(message || "Operation timed out", ...restArgs);
    this.name = "TimeoutError";
  }
}
