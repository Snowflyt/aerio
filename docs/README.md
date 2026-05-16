# Docs Index

This directory is the canonical index for engineering, workflow, and agent-facing documentation.
Start here when the task is larger than a one-file change or when you need repo context before editing.

## Goal

Keep Aerio docs structured, navigable, and small enough that a new agent or maintainer can find the right document quickly.
Do not keep extending one doc or one list forever when the real fix is regrouping or a smaller child doc.

## Read Path

1. [agent-start-here.md](agent-start-here.md) for the cold-start loop and validation order.
2. [engineering-principles.md](engineering-principles.md) for durable design rules.
3. [architecture.md](architecture.md) for repo structure and canonical edit paths.
4. [documentation-structure.md](documentation-structure.md) for how docs and skills should grow.
5. [documentation-quality.md](documentation-quality.md) for doc and JSDoc quality expectations.
6. [workflow-polish.md](workflow-polish.md) for how repeated workflow friction should be promoted.
7. [workflows/validation.md](workflows/validation.md) for the command-level validation path.

## Architecture And Semantics

- [architecture.md](architecture.md)
- [runtime-kernel.md](runtime-kernel.md)
- [typeclass-conventions.md](typeclass-conventions.md)
- [runtime-compat.md](runtime-compat.md)
- [runtime-compat-tooling.md](runtime-compat-tooling.md)

## Workflow And Quality

- [workflow-polish.md](workflow-polish.md)
- [workflows/validation.md](workflows/validation.md)

## Skills

- [skills/typescript-language-server/SKILL.md](../skills/typescript-language-server/SKILL.md) for TypeScript edits
- [skills/quality-gate/SKILL.md](../skills/quality-gate/SKILL.md)
- [skills/workflow-polish/SKILL.md](../skills/workflow-polish/SKILL.md)

## Scope

- `README.md` stays user-facing.
- `CONTRIBUTING.md` stays contributor-facing.
- `AGENTS.md` stays a thin entry point.
- `docs/` holds durable detail and workflow guidance.

## Documentation Maintenance Rule

- Front-load the current rule, state, or next action.
- Split noisy sections before they grow into long uninterrupted lists.
- Keep `AGENTS.md` and `CONTRIBUTING.md` thin, and use this index to branch into focused child docs.
