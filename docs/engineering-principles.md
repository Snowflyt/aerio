# Engineering Principles

## Core Rule

Prefer clear, explicit runtime behavior over clever abstraction.
Keep runtime behavior portable and document what public APIs do on success, failure, and cancellation.

## Truth Rule

- Keep names, docs, and behavior aligned.
- If a path is partial, degraded, or unverified, say so directly.
- Do not optimize for the appearance of completeness over the current truth.

## Workflow Polish Rule

- When a task repeatedly requires manual correction, check whether its commands or documentation need to change.
- Automate repeatable checks, such as detecting broken documentation links, rather than relying only on reminders.
- Record reusable workflow guidance in docs or skills as part of the change.
- Keep shared validation commands in the repo rather than in personal checklists.

## Generalization Rule

- Check related docs, skills, validation commands, and code for the same mistake.
- Fix confirmed instances within the task’s scope together. For example, update both a renamed command and the skill that invokes it.
- Report known instances left outside the scope.

## Runtime And Kernel

- Keep scheduler boundaries explicit; async resume, cancel, and cede should cross a scheduler boundary instead of re-entering the run loop directly.
- Keep one scheduling state model instead of parallel overlapping flags.
- Keep keepalive policy behind `Scheduler.acquireKeepAlive()` rather than embedding host keepalive logic into the interpreter.
- Keep clock injection runtime-scoped through `FiberRuntimeOptions.scheduler`; do not move time control into `FiberLocal`.

## Typeclass And API Semantics

- Treat `Sleep` as the temporal abstraction for schedule, retry, timeout, and delay behavior.
- Keep `Schedule` documented as one contract across `schedule`, `repeat`, and `retry`.
- Prefer `Ref` over local mutable counters when default combinators need internal time or retry state.
- Avoid eager error allocation on success paths when timeout-style combinators can allocate lazily.

## Testing Philosophy

- Test public behavior before testing fallback branches.
- Put tests in the file for the relevant behavior rather than grouping unrelated cases as compatibility tests.
- Use `TestControl` and virtual time for schedule math and deterministic time-sensitive behavior when that is the clearest abstraction.
- Use real runtime tests only when runtime-specific behavior is the thing being validated.

## Tooling And Portability

- Prefer Node-native capabilities and TypeScript scripts before external CLIs.
- Repo-local automation should work on Windows, macOS, and Linux.
- Put durable workflow guidance into docs or skills rather than leaving it only in chat history.

## Documentation Quality

- Keep entry docs thin and actionable.
- Split noisy lists before they become one catch-all page.
- Keep API descriptions and workflow commands consistent across public, contributor, and agent docs.
