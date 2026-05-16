# Workflow Polish

Use this document when a workflow repeatedly causes mistakes, such as running an outdated validation command or missing a required check.

## Core Rule

Fix the command, documentation, or check that caused the mistake. Record instructions that future contributors will need in the repo rather than only in chat.

## Primary Rules

- Check related docs, skills, validation commands, and public API wording for the same mistake.
- State which checks have passed and which remain unrun.
- Automate repeatable checks rather than relying only on reminders.
- Update reusable workflow instructions as part of the fix.
- Keep entry docs short by linking to detailed procedures.
- Do not add worktree-first guidance or automatic commit behavior in this repo.

## Choosing a fix

1. Correct the code, docs, or command that caused the problem.
2. Document any instruction that future contributors will need.
3. Update a repo-local skill if the task requires a reusable sequence of steps.
4. Add an automated check if it can detect the mistake reliably.
5. Include the check in the normal validation command when it applies to routine edits.

## Validation commands

- Read [agent-start-here.md](agent-start-here.md) and [README.md](README.md) before non-trivial changes.
- Run the narrowest executable validation first.
- Run `npm run workflow:polish` when docs, skills, validation entrypoints, or public API JSDoc changed.
- `npm run workflow:polish` currently runs the doc-quality checks plus ESLint over `skills/**/*.ts`.
- Widen to `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:cov`, or `npm run test:smoke` only as the task justifies.

## What Belongs Here

- outdated entry docs, crowded lists, and missing cross-links
- stale names, stale labels, and mismatches between docs and behavior
- reusable instructions missing from the repo
- repeatable checks missing from validation commands
- repo-specific JSDoc conventions from [CONTRIBUTING.md](../CONTRIBUTING.md)
