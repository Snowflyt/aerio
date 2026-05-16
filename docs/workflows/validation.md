# Validation Workflow

Start with a check for the changed behavior or file.
Run broader checks when the change affects other modules or the built package.

## Focused Loop

- Active TypeScript edits: `node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/some-file.ts`
- Single test file: `npm run test test/some-file.test.ts`
- Docs, skills, workflow scripts, or public API JSDoc: `npm run workflow:polish`
- Public type or cross-file API change: `npm run typecheck`
- Style or script edits: `npm run lint`
- Doc formatting pass: `npm run format`

## Broader Checks

- Regular suite: `npm run test`
- Coverage with runtime-compat merge: `npm run test:cov`
- Built-distribution smoke matrix: `npm run test:smoke`

## Runtime Compatibility Notes

- `npm run test:cov` already folds in runtime-compat coverage.
- Use [runtime-compat.md](../runtime-compat.md) for user-facing runtime support information.
- Use [CONTRIBUTING.md](../../CONTRIBUTING.md) for Node 6 and QuickJS validation commands.

## Documentation And Skill Changes

- Validate links and paths after adding new docs.
- Run `npm run workflow:polish` when documentation structure, workflow instructions, repo-specific JSDoc conventions, or skill scripts changed.
- `npm run workflow:polish` also runs ESLint over `skills/**/*.ts` so workflow automation does not bypass repo style rules.
- If you add new TypeScript helper scripts, run at least a file-level diagnostic check on those scripts.
- Prefer a focused validation command over a full suite when the change is docs-only or tooling-only.
