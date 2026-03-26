/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @module
 * @private
 * @internal
 */

interface AggregateError extends Error {
  errors: any[];
}

interface AggregateErrorConstructor {
  new (errors: Iterable<any>, message?: string): AggregateError;
  (errors: Iterable<any>, message?: string): AggregateError;
  readonly prototype: AggregateError;
}

/**
 * The `AggregateError` object represents an error when several errors need to be wrapped
 * in a single error. It is thrown when multiple errors need to be reported by an operation,
 * for example by `Promise.any()`, when all promises passed to it reject.
 */
const _AggregateError: typeof globalThis extends { AggregateErrorConstructor: infer R } ? R
: AggregateErrorConstructor = /* @__PURE__ */ (() =>
  // @ts-expect-error - `AggregateError` is only available in ES2021+
  typeof AggregateError === "function" ?
    // @ts-expect-error - `AggregateError` is only available in ES2021+
    AggregateError
    // Polyfill of AggregateError for environments that don't support it. Adapted from Radashi:
    // https://github.com/radashi-org/radashi/blob/5fbee15257070a0ad1bef2d9fb327b3fdb611fb0/src/oop/AggregateError.ts#L29-L38
  : class AggregateError extends Error {
      declare readonly errors: any[];
      constructor(errors: Iterable<any>, message?: string) {
        super();
        const errs = Array.isArray(errors) ? errors : Array.from(errors);
        let name = "";
        const namedError = errs.find((e) => e && e.name);
        if (namedError) name = namedError.name;
        this.name = "AggregateError(" + name + "...)";
        this.message = message || "AggregateError with " + errs.length + " errors";
        const stackedError = errs.find((e) => e && e.stack);
        if (stackedError) this.stack = stackedError.stack!;
        this.errors = errs;
      }
    })();
export { _AggregateError as AggregateError };
