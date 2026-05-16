---
name: quality-gate
description: Use this skill when you need the narrowest useful validation path for a change in Aerio, from focused diagnostics through broader repo checks.
---

# Quality Gate

Start with a check for the changed behavior or file. Run broader checks when the change affects other modules or the built package.

## Rule

- validate the changed behavior or file first
- run `npm run workflow:polish` when docs, skills, validation entrypoints, workflow scripts, or public API JSDoc changed
- prefer focused tests over repo-wide runs
- use the repo-local TypeScript language-server helper for fast preflight diagnostics when the change is TypeScript-heavy
- run `npm run typecheck` when public types or cross-file API wiring changed
- run `npm run lint` when formatting-sensitive code, scripts, or docs-adjacent code changed
- run `npm run test:cov` only when you intentionally need the runtime-compat coverage path
- run `npm run test:smoke` only when you want to validate the built `dist/` compatibility matrix

## Workflow

1. Start with the smallest executable check that directly covers the changed behavior.

```bash
npm run test -- test/io-run.test.ts
```

2. For incremental TypeScript diagnostics, use the repo-local helper:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/IO.ts --file test/io-run.test.ts
```

3. If the change touched docs, skills, validation entrypoints, workflow scripts, or public API JSDoc, run the workflow gate:

```bash
npm run workflow:polish
```

This gate also runs ESLint over `skills/**/*.ts`.

4. Run type checks for public type or cross-file API changes, and lint for code or script changes:

```bash
npm run typecheck
npm run lint
```

5. Run broader compatibility checks only when the task is actually about runtime coverage or shipped `dist/` behavior:

```bash
npm run test:cov
npm run test:smoke
```

## Escalation

- if a focused test exists, do not skip straight to a full suite
- update the relevant docs when commands or workflow requirements change
- if validation reveals unrelated failures, note them separately instead of folding them into the current change unless they block the task
