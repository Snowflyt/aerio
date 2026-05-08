# Compatibility

This document explains which runtimes Aerio supports, which host APIs are optional, and what you may need to polyfill in older or minimal environments.

## Baseline

Aerio's core runtime targets ES2015.
In practice, that includes environments such as Node.js 6+, Chrome 51+, and other engines with comparable ES2015 support.

The core runtime does not require a DOM, a browser event loop, or Node.js-specific APIs.
What changes between hosts is which optional integrations are available out of the box.

## QuickJS

Aerio has dedicated QuickJS support.

- Bellard QuickJS is supported through the standard `std` and `os` modules.
- QuickJS-NG is supported through the `qjs:std` and `qjs:os` modules.
- The scheduler and input support adapt to the module naming scheme of each QuickJS family.
- QuickJS does not normally provide browser-style Web APIs such as `fetch` or `AbortController`, so APIs that depend on them require host-provided shims.

## Core Runtime Support

The core fiber runtime, scheduler, cancellation model, and most `IO` operations work on ES2015 runtimes.

- Promise support is required for asynchronous execution.
- The scheduler prefers modern host facilities when they exist, but it falls back across `queueMicrotask`, `Promise.resolve().then(...)`, `setImmediate`, `MessageChannel`, `setTimeout`, and QuickJS `os.setTimeout` as needed.
- Monotonic time prefers `performance.now()`, then `process.hrtime()`, and falls back to `Date.now()` when nothing better exists.
- Error aggregation uses the runtime’s native `AggregateError` when available. On pre-ES2021 runtimes, Aerio falls back to its internal `AggregateError` polyfill.

## Host-Specific APIs

The following integrations need host APIs in addition to the ES2015 core.

### `IO.promise`

- `IO.promise` works anywhere promises exist.
- When `AbortController` is available, Aerio creates an `AbortSignal` and aborts it on cancellation.
- When `AbortController` is not available, `IO.promise` still works, but the promise callback does not receive a cancellation signal.

### `IO.fetch`

- `IO.fetch` requires host-provided `fetch`, `URL`, `URLSearchParams`, `Request`, and `AbortController` support.
- Those APIs are built in on modern browsers and on Node.js 18+.
- On older Node.js versions or minimal runtimes such as plain QuickJS, you need host-specific polyfills or a custom HTTP layer.
- Aerio does not bundle a fetch polyfill for you.

### `IO.input`

- In browsers, `IO.input` uses `window.prompt`.
- In Node.js, `IO.input` uses the `readline` module.
- In QuickJS, `IO.input` uses `std.in` together with `os.setReadHandler`.
- Browser prompts are synchronous, so they block the main thread and are not cancellable while the dialog is open.

## What This Means In Practice

- Node.js 6 through 17 can run the Aerio core runtime, scheduler, and console input support, but `IO.fetch` needs polyfills.
- Node.js 18+ adds the built-in Web APIs that Aerio expects for `IO.fetch` and abort-aware promise integrations.
- Modern browsers can run the core runtime directly and usually provide the Web APIs needed by `IO.fetch`, but `IO.input` is limited to `window.prompt` semantics.
- Bellard QuickJS and QuickJS-NG can run the core runtime and QuickJS-specific input and timer paths, but they do not usually provide browser-style networking APIs by default.

## Contributor Notes

To validate or extend the compatibility matrix, see [CONTRIBUTING.md](../CONTRIBUTING.md) for commands and [runtime-compat-tooling.md](runtime-compat-tooling.md) for coverage and runtime setup.
