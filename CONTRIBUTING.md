# Contributing

Thanks for taking the time to contribute to aerio.

This guide covers the local workflow and the project-specific conventions that are easy to miss when you are new to the project.

## Local Setup

1. Install dependencies with `npm install`.
2. Make your change.
3. Run the narrowest checks that cover your change before opening a PR.

Common commands:

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run format`
- `npm run test test/some-file.test.ts`

## Runtime Compatibility Workflow

The README and compatibility document describe runtime support from a user perspective.
Use the commands in this section only when you are validating or extending the compatibility matrix itself.

- `npm run test:cov`: run the normal Vitest suite and automatically merge in runtime compatibility coverage before writing the final coverage report.
- `npm run test:compat:smoke`: run `npm run build`, then smoke the real built `dist/` on current Node.js ESM, current Node.js CJS, Node.js 6 CJS, Bellard QuickJS, and QuickJS-NG.

Notes:

- The regular runtime-compat coverage path is folded into `npm run test:cov`.
- The Node.js 6 runtime check downloads and runs the real `v6.17.1` binary under the repo-local `.tmp/runtime-compat` cache.
- The QuickJS checks are npm-only and do not require a locally installed `qjs` binary.

## Project Layout

- `src/` contains public modules and their implementations.
- `src/core/` contains generic `derive*` helpers for building custom effect APIs.
- `src/internal/` contains low-level runtime internals such as the fiber kernel and scheduler machinery.
- `src/typeclass/` contains typeclass interfaces and related abstractions.
- `test/` contains the automated test suite.
- `examples/` contains runnable examples and usage sketches.
- `docs/` contains documentation assets that ship with the package.
- `bench/` contains benchmarks.

## Code And Tests

- Add or update tests when behavior changes.
- For time-sensitive behavior tests, prefer `TestControl` and virtual time over real sleeps and tight timing assertions.
- Pure schedule math tests and low-level scheduler tests can stay direct when that is the clearer abstraction.

## Documentation And Examples

- Keep JSDoc clear and technical. Avoid colloquial or affective wording.
- Do not break a full sentence across multiple lines in JSDoc.
- If an API returns `IO`, describe errors as “fails with ...” rather than “throws”.
- In `src/core/`, attach JSDoc to the returned function rather than to the `deriveXxx` wrapper.
- Use explicit `**Example**` blocks, and add multiple example blocks when one example is not enough.
- Small ASCII timing or shape diagrams are fine when they clarify behavior; use fenced `plaintext` blocks.
- Prefer links that actually resolve. When a qualified link like `{@linkcode Outcome.Succeeded}` does not resolve in the current file, use the local symbol link such as `{@linkcode Succeeded}` instead.

For examples and inline comments:

- Prefer runnable expression examples with `// => ...` comments.
- When an example shows real output, use `IO.println(...)` or `console.log(...)` followed by `//> ...`.
- Avoid unnecessary `console.log` usage when a plain expression example is enough.
- For inline `//` comments in source, follow the Inline Code Comments rules in [docs/documentation-quality.md](docs/documentation-quality.md).

Public API docs in `src/` should use public names such as `Schedule.spaced(...)` and `.pipe(...)` where that is the natural style.

Core generic docs in `src/core/` should assume helpers are already in scope. Do not add `deriveXxx` setup boilerplate to examples, and refer to sibling helpers as plain code names like `spaced` and `fixed`.

Examples should be runnable snippets rather than partial test-style fragments.

## Pull Requests

- Small focused pull requests are easier to review.
- Mention the commands you ran to validate the change.
- Keep unrelated refactors out of the same PR.
