# Agent Start Here

Use this document before making non-trivial changes in Aerio.
Start with the files relevant to the task, then choose a check that covers the change.

## Default Loop

1. Run `git status --short`.
2. Read [README.md](../README.md) only if the task touches user-facing positioning or examples.
3. Read [CONTRIBUTING.md](../CONTRIBUTING.md) before editing public docs or contributor workflow text.
4. Start from the owning file, symbol, test, or failing command.
5. For a bug, state the suspected cause and choose a check that could disprove it.
6. Make the smallest edit that addresses the task.
7. Run the narrowest validation command that covers the changed files or behavior.

## Validation Order

- During TypeScript edits, use the file-level checks in [skills/typescript-language-server/SKILL.md](../skills/typescript-language-server/SKILL.md) before repo-wide checks.
- Run a focused test file before a full suite when a focused test exists.
- Run `npm run workflow:polish` when editing docs, skills, validation entrypoints, or public API JSDoc.
- Run `npm run typecheck` when edits affect public types or cross-file API wiring.
- Run `npm run lint` when editing docs-adjacent code patterns, scripts, or formatting-sensitive files.
- Run `npm run test:cov` only when you need the combined runtime-compat coverage path.
- Run `npm run test:smoke` only when you are intentionally validating the built `dist/` matrix.

## Editing Rules

- Update the existing implementation or workflow rather than adding a competing one.
- Do not add bash-only helper scripts for new agent tooling; prefer Node-run `.ts` files.
- Put agent state, logs, sockets, and caches under `.tmp/`.
- Do not auto-commit. Prepare a clean diff and validation notes for user review.
- Do not default to worktrees in this repo; use the current checkout unless the user explicitly asks for a separate worktree.

## Where To Branch Next

- Repo structure and edit ownership: [architecture.md](architecture.md)
- Runtime internals: [runtime-kernel.md](runtime-kernel.md)
- Schedule and retry semantics: [typeclass-conventions.md](typeclass-conventions.md)
- Validation and compatibility commands: [workflows/validation.md](workflows/validation.md)
- Organizing docs: [documentation-structure.md](documentation-structure.md)
- Workflow-quality rules: [workflow-polish.md](workflow-polish.md)
