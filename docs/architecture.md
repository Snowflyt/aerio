# Architecture

Use this document when you need the current module boundaries before editing.
The sections below identify where to change public APIs, runtime behavior, typeclasses, tests, and workflow automation.

## First Rule

Public API names and JSDoc belong in `src/*.ts`, shared contracts belong in `src/core/`, runtime execution belongs in `src/internal/`, and algebraic semantics belong in `src/typeclass/`.

## Current Layout

- `src/index.js` and `src/index.d.ts` are the package entrypoints.
- `src/*.ts` exports public modules such as `IO`, `Ref`, `Deferred`, and `Schedule`.
- `src/core/*.ts` holds structural contracts and reusable definitions shared by public modules and the runtime.
- `src/internal/*.ts` holds concrete runtime behavior such as interpreters, mutable runtime state, scheduler integration, and host fallbacks.
- `src/typeclass/*.ts` holds the algebraic interfaces and helper combinators that define effect semantics.
- `test/*.test.ts` tests public behavior, with files grouped by behavior.
- `examples/` holds usage examples and `bench/` holds benchmark programs.
- `docs/` and `skills/` hold contributor workflow, validation guidance, and repo-local helper automation rather than library runtime code.

## Layer Relationship

- Users import public names from `src/*.ts` and the package entrypoints rather than from `src/core/` or `src/internal/`.
- Public modules assemble types from `src/core/`, implementations from `src/internal/`, and semantics from `src/typeclass/`.
- Expose runtime behavior through the owning public module, not through `src/internal/` imports.

## Canonical Edit Path

- Edit the owning file in `src/*.ts` when the change affects exported names, chainable methods, public JSDoc, or user-visible behavior.
- Edit the matching file in `src/core/` when the change affects a shared contract or structural type reused across layers.
- Edit the matching file in `src/internal/` when the change affects interpreter behavior, scheduling, fibers, refs, or host integration.
- Start at `src/internal/kernel.ts` when the change is about task scheduling, timers, or runtime execution order.
- Edit the matching file in `src/typeclass/` when the change affects concurrency, cancellation, sleep, retry, repeat, or scheduling semantics.
- Add or update the test file in `test/` that covers the changed behavior, rather than grouping unrelated tests as compatibility checks.

## Documentation And Validation

- Keep public API documentation on the exported name in `src/*.ts`, even when implementation details live elsewhere.
- Update the relevant doc in `docs/` when module responsibilities or workflow commands change.
- Run `npm run workflow:polish` after architecture or workflow doc changes.
