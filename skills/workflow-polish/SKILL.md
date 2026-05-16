---
name: workflow-polish
description: Use this skill when repeated engineering friction in Aerio should be turned into clearer docs, repo-local skills, or small TypeScript automation instead of repeated one-off explanations.
---

# Workflow Polish

Use this skill when contributors repeatedly miss a check, follow outdated instructions, or need the same manual correction.

## Rule

Documentation:

- keep entry docs thin and move durable detail into child docs or skills
- record reusable instructions in repo-local docs or `skills/` rather than only in chat
- update the relevant docs and skills when commands or workflow requirements change

Automation and validation:

- new helper automation should be Node-run `.ts` files, not bash wrappers
- repo-local automation state, logs, sockets, backups, and managed runtimes belong under `.tmp/`
- automate repeatable checks rather than relying only on reminders
- use `npm run workflow:polish` as the canonical lightweight workflow/doc-quality gate
- keep skill scripts under ESLint; `npm run workflow:polish` runs ESLint over `skills/**/*.ts`

Repository workflow:

- do not add worktree-first guidance or automatic commit behavior in this repo
- check related docs, skills, and validation commands for the same mistake
- split entry-doc lists before they grow into long uninterrupted runs

## Workflow

1. Identify the recurring mistake or manual step.

2. Choose where the instructions belong:

- `AGENTS.md` for the thin quick index
- `docs/README.md` for links to the relevant docs
- `docs/workflows/*.md` for reusable command-level workflows
- `skills/<name>/SKILL.md` for step-by-step task instructions
- `skills/<name>/scripts/*.ts` for lightweight repo-local helpers

3. Keep the first screen actionable.

4. Update the existing instructions. If a workflow replaces an older one, remove the obsolete instructions and update links to them.

5. Update other docs or checks that depend on the changed workflow:

- add it to `skills/quality-gate` when it belongs in the normal validation loop
- add it to `docs/runtime-compat-tooling.md` when it affects the runtime matrix or compat tooling
- add it to `docs/documentation-quality.md` when it is about doc or JSDoc quality
- add it to `docs/workflow-polish.md` when contributors need the rule outside this skill

## Examples

- If contributors miss the docs check, add `npm run workflow:polish` to the relevant validation instructions in `quality-gate`.
- If a validation command changes, update its examples in the workflow doc and skill together.
- If a TypeScript query requires repeated manual setup, add a helper under `skills/typescript-language-server` and document its command.
