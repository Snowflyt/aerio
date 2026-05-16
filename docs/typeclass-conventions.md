# Typeclass Conventions

This document records the semantic rules that should stay aligned across the public API, core derivations, and docs.

## Temporal Semantics

- `Sleep` is the temporal abstraction in this repo.
- Time-based combinators such as `schedule`, `repeat`, `retry`, `timeout`, and `timeoutTo` should derive from `Sleep` rather than re-encoding their own timing model.
- Kernel time primitives stay runtime-scoped through `FiberRuntimeOptions.scheduler`.

## Schedule Contract

- `IO.schedule` consults the schedule before its first execution.
- The first schedule-controlled execution is attempt `1`, not attempt `0`.
- `IO.retry` follows the same schedule contract: the first failure consults the schedule at attempt `1`.
- Use the same attempt numbering when documenting `Schedule`, `retry`, and `schedule`.

## Repeat, Timeout, And Concurrency

- `Sleep.repeat` runs the effect once immediately before consulting the schedule for later repetitions.
- `Sleep.timeout` should allocate timeout errors lazily on the timeout path.
- `Spawn` owns concurrency primitives such as `racePair` and `race2Outcome`, but not APIs that also require sleep semantics.

For example, a schedule that stops at attempt `1` prevents `schedule` from running the effect. `repeat` has already run it once, and `retry` has already observed the first failure.

## Implementation Preferences

- Prefer `Ref` over local mutable counters inside default combinators.
- Keep runtime-scoped capabilities and startup-only run policies separate.
- Examples for APIs returning `IO` should use the same timing and attempt-numbering rules as their typeclass derivations.
