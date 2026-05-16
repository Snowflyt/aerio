# Aerio Agent Guide

## Start Here

Before making any non-trivial change:

1. Read [docs/agent-start-here.md](docs/agent-start-here.md).
2. Read [docs/README.md](docs/README.md) and branch into the relevant child docs.
3. Run `git status --short`.
4. Start from the owning file, symbol, test, or command rather than broad repo exploration.
5. Run the smallest check that covers the changed behavior.

This repo does not default to worktrees and does not default to automatic commits.
Keep commits user-controlled unless the user explicitly asks for one.

## Operating Mode

- Keep one implementation or workflow for each task; remove obsolete paths when replacing them.
- Prefer clean replacement over compatibility wrappers when a path is clearly obsolete.
- Record reusable workflow guidance in the relevant doc or skill.
- Keep entry docs short and link to child docs for detail.
- Write new automation in Node + TypeScript so it runs on Windows, macOS, and Linux.

## Fast Path

### Repo Map

- Repository overview: [docs/README.md](docs/README.md)
- Repository architecture: [docs/architecture.md](docs/architecture.md)
- Getting started and validation: [docs/agent-start-here.md](docs/agent-start-here.md)
- Engineering rules: [docs/engineering-principles.md](docs/engineering-principles.md)

### Workflow

- Documentation rules: [docs/documentation-structure.md](docs/documentation-structure.md) and [docs/documentation-quality.md](docs/documentation-quality.md)
- Workflow polish: [docs/workflow-polish.md](docs/workflow-polish.md) and [skills/workflow-polish/SKILL.md](skills/workflow-polish/SKILL.md)
- Validation workflow: [docs/workflows/validation.md](docs/workflows/validation.md) and [skills/quality-gate/SKILL.md](skills/quality-gate/SKILL.md)

### Runtime

- Runtime/kernel notes: [docs/runtime-kernel.md](docs/runtime-kernel.md)
- Typeclass semantics: [docs/typeclass-conventions.md](docs/typeclass-conventions.md)
- Runtime docs: [docs/runtime-compat.md](docs/runtime-compat.md) and [docs/runtime-compat-tooling.md](docs/runtime-compat-tooling.md)

### Tooling

- TypeScript inner loop: [skills/typescript-language-server/SKILL.md](skills/typescript-language-server/SKILL.md)

## Read Order

1. [docs/agent-start-here.md](docs/agent-start-here.md)
2. [docs/engineering-principles.md](docs/engineering-principles.md)
3. [docs/README.md](docs/README.md)
4. [docs/architecture.md](docs/architecture.md)
5. [docs/documentation-structure.md](docs/documentation-structure.md)

## Change Rules

- Do not auto-commit or rewrite history unless the user explicitly asks.
- Keep diffs focused; do not fold unrelated refactors into the same change.
- Update code, tests, docs, and skills together when their shared assumptions change.
- When public behavior changes, update the nearest tests and the nearest docs in the same iteration.
- Prefer repo-local state under `.tmp/` for automation artifacts.
- New agent helper scripts should be `.ts` files runnable with Node directly.
