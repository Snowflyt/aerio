---
name: typescript-language-server
description: Use the repo-local TypeScript language-server helper for fast incremental diagnostics, symbol lookup, and safe rename/refactor previews while editing TypeScript in this repository. Use when you want a local-node-modules-first inner loop instead of repeated full `tsc` runs.
---

# TypeScript Language Server

Use this skill during active TypeScript work in this repository.

The daemon prefers the repo's local `node_modules/typescript` install.
When available, it starts `typescript-go` first and keeps a managed runtime under `.tmp/typescript-language-server/managed/typescript-go`.
The helper uses `tsserver` for unsupported operations or when `typescript-go` fails.

## Rule

- start the daemon before repeated TypeScript edit-check cycles
- point the helper at the owning package or repo root with `--project ...` when the current shell is not already there
- prefer focused `check --file ...` during active edits
- use full-project `check` when a change may affect files beyond those edited
- use `query` to find definitions and references before changing a symbol
- use `apply` in dry-run mode first and add `--write` only after the preview looks correct
- real writes keep backups on by default under `.tmp/typescript-language-server/backups`
- if `typescript-go` falls back often, inspect `status` and treat that as a signal to investigate rather than assuming the fallback is the normal path
- this helper accelerates the local inner loop, but it does not replace package validation like `npm run typecheck`, focused tests, or `npm run lint`

## Workflow

Run these commands from the repository root unless you pass `--project` explicitly.

1. Start the daemon when you expect multiple edit-check cycles:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts start
```

2. After edits, prefer a focused check on the touched file or files:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/IO.ts
node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/IO.ts --file test/io-run.test.ts
```

Use a full-project check to find errors outside the edited files:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts check
```

3. Inspect daemon state when requests are slow or unexpectedly use `tsserver`:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts status
```

Healthy sessions should usually show `backend=typescript-go` after the managed runtime is installed.
`fallback_count` and `last_fallback_*` show when `typescript-go` retried through `tsserver`.
`tsserver_route_count` and `last_tsserver_route_*` show when an operation intentionally used `tsserver`.

4. Use query commands when you need editor-style symbol understanding before editing:

```bash
node skills/typescript-language-server/scripts/cli/query.ts info --file src/IO.ts --line 1 --offset 1
node skills/typescript-language-server/scripts/cli/query.ts definition --file src/IO.ts --line 1 --offset 1
node skills/typescript-language-server/scripts/cli/query.ts references --file src/IO.ts --line 1 --offset 1
```

5. Preview a rename or refactor, then add `--write` to apply it:

```bash
node skills/typescript-language-server/scripts/cli/apply.ts rename --file src/IO.ts --line 1 --offset 14 --new-name IOx
node skills/typescript-language-server/scripts/cli/apply.ts rename --file src/IO.ts --line 1 --offset 14 --new-name IOx --write
```

6. Stop the daemon when you are done:

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts stop
```

## Backend Resolution

- the helper prefers the nearest local `node_modules/typescript`
- ancestor `node_modules` directories are searched before broader workspace fallbacks
- `typescript-go` is managed under `.tmp/typescript-language-server/managed/typescript-go`
- `type-definition` tries `typescript-go` first and only falls back when it returns an incomplete result
- source-action refactors like organize imports, remove unused imports, and sort imports can use `typescript-go`
- classic extract-style refactors still route through `tsserver`

## Command Catalog

Load [references/command-catalog.md](./references/command-catalog.md) for the full command and flag list.

## Environment Override

- `TYPESCRIPT_LANGUAGE_SERVER_TIMEOUT_MS`
- `TYPESCRIPT_LANGUAGE_SERVER_CHECK_TIMEOUT_MS`
- `TYPESCRIPT_LANGUAGE_SERVER_TSSERVER_PATH`
- `TYPESCRIPT_LANGUAGE_SERVER_FALLBACK_TSCONFIG_PATH`
