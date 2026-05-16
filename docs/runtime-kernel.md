# Runtime Kernel Notes

This document describes the fiber runtime’s control state, scheduler boundaries, and runtime compatibility tooling.

## Fiber Runtime

- The runtime currently prefers a thin IO-fiber state machine over a mailbox model.
- `resumeTag` remains the primary control state; do not add a second inbox-like control layer unless the runtime fully changes shape.
- Structured parent completion may still cancel a suspended child synchronously so parent completion does not become observable before child finalizers run.
- `Never` suspends until cancellation; it never produces a value or failure on its own.

## Scheduler

- A root run resolves its default scheduler once; derived fibers inherit it through runtime options, including global forks and cancellation helpers. Separate roots remain independent unless a scheduler is explicitly shared.
- `DefaultScheduler(maxOpCountBeforeAutoYield = 2048, maxTasksPerBatch = 64)` separates interpreter and drain budgets. The second argument replaces the unused microtask-count limit; remove old second arguments to retain the default batch size. `maxTasksPerBatch` must be a positive safe integer.
- Auto-yield and cede behavior should cross a small scheduled-run gate instead of calling back into `run()` directly.
- Keep one scheduled-state model with supersession rather than parallel normal/cede flags.
- QuickJS lazy host-timer fallback in `scheduleMacrotask` must schedule the current thunk after resolving `qjs:os`; rebinding only future calls is not enough.
- Host keepalive behavior belongs behind `Scheduler.acquireKeepAlive()`.
- Dequeue and clear callbacks before invoking them. A thrown scheduler callback still escapes to the host, but cleanup and scheduling of remaining work run in `finally`.
- A pending drain retains ownership while running. Clear its flag only at batch exit, then schedule remaining work; reentrant tasks stay outside the frozen batch.
- MessageChannel dispatch preserves uncalled callbacks ahead of reentrant work if a callback throws, without swallowing the original exception.

## TestControl

- Keep `TestControl` outside the interpreter as a controlled scheduler plus one root `FiberRuntime`.
- `execute` returns `IO<TestControl<A>>`. The program does not run before the first tick; the caller advances it through control operations on the outer `IO`.
- Use a plain object for the control API unless a class hierarchy is needed to express its behavior.

## Runtime Compatibility Tooling

- Keep runtime-compat artifacts under `.tmp/runtime-compat`.
- For Node 6 compat, generate CommonJS in-process with `typescript.transpileModule`.
- Remap compat coverage with source maps before merging it into Vitest coverage.
- Keep source-mode compat independent from prebuilt `dist/`; reserve built `dist/` validation for smoke workflows.
- Prefer real QuickJS and QuickJS-NG CLIs over mock shims for `qjs:std` and `qjs:os` behavior.
