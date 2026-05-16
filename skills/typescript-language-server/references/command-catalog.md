# TypeScript Language Server Command Catalog

Use this file for the full `typescript-language-server` command and flag list.
Keep the daemon running during an editing session so queries reuse it instead of starting it again.

The daemon prefers `typescript-go` by default and reports the active backend in `status` output.
The first cold `start` can install the managed `typescript-go` runtime under `.tmp/typescript-language-server/managed/typescript-go`.

## Daemon Lifecycle

```bash
node skills/typescript-language-server/scripts/cli/daemon.ts start
node skills/typescript-language-server/scripts/cli/daemon.ts status
node skills/typescript-language-server/scripts/cli/daemon.ts check
node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/IO.ts
node skills/typescript-language-server/scripts/cli/daemon.ts check --file src/IO.ts --file test/io-run.test.ts
node skills/typescript-language-server/scripts/cli/daemon.ts stop
```

Flags:

- `--project <path>`: resolve the owning repo or package root from an explicit path
- `--file <path>`: narrow `check` to one or more files
- `--timeout-ms <number>`: override the daemon request timeout
- `--json`: print structured JSON instead of key-value output
- `--help`: print usage text

Notes:

- default `check` reports diagnostics for the whole project and can be slower on larger projects
- focused `check --file ...` is the preferred edit loop
- `status` shows the active backend, daemon state paths, and fallback or tsserver-route counters

## Query Commands

Use `node skills/typescript-language-server/scripts/cli/query.ts <command> ...`.

Commands:

- `info`: quick info and symbol display text
- `definition`: definition locations and bound span
- `references`: read and write reference locations
- `rename-preview`: rename preview without writing
- `type-definition`: jump to the type definition
- `implementation`: find implementations
- `refactor-list`: list refactors available for a selected range
- `refactor-preview`: preview edits for one refactor action

Examples:

```bash
node skills/typescript-language-server/scripts/cli/query.ts info --file src/IO.ts --line 1 --offset 1
node skills/typescript-language-server/scripts/cli/query.ts definition --file src/IO.ts --line 1 --offset 1
node skills/typescript-language-server/scripts/cli/query.ts references --file src/IO.ts --line 1 --offset 1
node skills/typescript-language-server/scripts/cli/query.ts rename-preview --file src/IO.ts --line 1 --offset 14
node skills/typescript-language-server/scripts/cli/query.ts type-definition --file src/IO.ts --line 1 --offset 14
node skills/typescript-language-server/scripts/cli/query.ts implementation --file src/IO.ts --line 1 --offset 14
node skills/typescript-language-server/scripts/cli/query.ts refactor-list --file src/IO.ts --line 10 --offset 1 --end-line 20 --end-offset 2
node skills/typescript-language-server/scripts/cli/query.ts refactor-preview --file src/IO.ts --line 10 --offset 1 --end-line 20 --end-offset 2 --refactor "Extract Symbol" --action "function_scope_0"
```

Common flags:

- `--file <path>`
- `--line <number>`
- `--offset <number>`
- `--end-line <number>`
- `--end-offset <number>`
- `--refactor <name>`
- `--action <name>`
- `--find-in-comments`
- `--find-in-strings`
- `--project <path>`
- `--timeout-ms <number>`
- `--json`
- `--help`

## Apply Commands

Use `node skills/typescript-language-server/scripts/cli/apply.ts <command> ...`.

Commands:

- `rename`: preview or apply a rename
- `refactor`: preview or apply a refactor

Defaults:

- dry-run is on unless `--write` is present
- backups are created during real writes unless `--no-backup` is present

Examples:

```bash
node skills/typescript-language-server/scripts/cli/apply.ts rename --file src/IO.ts --line 1 --offset 14 --new-name IOx
node skills/typescript-language-server/scripts/cli/apply.ts rename --file src/IO.ts --line 1 --offset 14 --new-name IOx --write
node skills/typescript-language-server/scripts/cli/apply.ts refactor --file src/IO.ts --line 10 --offset 1 --end-line 20 --end-offset 2 --refactor "Extract Symbol" --action "function_scope_0"
node skills/typescript-language-server/scripts/cli/apply.ts refactor --file src/IO.ts --line 10 --offset 1 --end-line 20 --end-offset 2 --refactor "Extract Symbol" --action "function_scope_0" --write
```

Write flags:

- `--write`: opt into mutation
- `--no-backup`: skip backups during real writes
- `--project <path>`
- `--timeout-ms <number>`
- `--json`
- `--help`
