# Documentation Quality

This document is the canonical quality bar for user-facing docs, contributor docs, agent docs, and public API JSDoc.
Use it together with [documentation-structure.md](documentation-structure.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

## Core Rule

Documentation should lower context load.
If a doc makes the reader scroll, infer, or reconcile conflicting rules before they can act, the doc needs refactoring.

## Entry Doc Quality

- Put the operative rule on the first screen.
- Keep entry docs thin and push detail into child docs.
- Split noisy sections before they grow into long unstructured lists.
- Treat more than 10 consecutive list items in an entry doc as a refactor signal.
- Prefer one canonical doc per concern.

## Prose Style

- In prose, prefer typographic apostrophes (`’`) over straight apostrophes (`'`).
- In prose, prefer typographic double quotation marks (`“...”`) over straight double quotes (`"..."`).
- Keep code samples, inline code, paths, commands, package names, and literal strings unchanged.

For agents editing prose, see [Editing documentation](editing-documentation.md) for examples and a review procedure.

## Public API JSDoc

- Keep JSDoc clear, technical, and written in full sentences on one line.
- If an API returns `IO`, describe errors as “fails with ...” rather than “throws”, unless the text is explicitly describing another function or callback that may throw before the `IO` is created; keep semantic exceptions in `THROWS_PHRASE_EXCEPTIONS` inside [skills/workflow-polish/scripts/check-doc-quality.ts](../skills/workflow-polish/scripts/check-doc-quality.ts).
- Attach docs to the public exported name, and in `src/core/` attach docs to the returned function rather than the `deriveXxx` wrapper.
- Use explicit `**Example**` blocks, and add more than one example when one example is not enough.
- Prefer runnable expressions with `// => ...` comments.
- Do not include `import ... from "aerio"` inside JSDoc examples; assume package exports are already in scope.
- When an example shows output, use `IO.println(...)` or `console.log(...)` followed by `//> ...`.
- Prefer links that actually resolve in the current file.
- When it helps readability, name `program`, `fiber`, or a similarly concrete value before `IO.unsafeRun...` calls in JSDoc examples, and leave a blank line before the run call. Inline runs are also fine when they are already clear.

## Inline Code Comments

Write for clarity first; treat line-wrapping as a readability optimization, never a reason to compress wording.

- Explain why, not what; the code already shows what.
- State the thought in full, then decide whether it is too long for one line. Past roughly 120–140 characters, consider a break; past 140, lean toward one. Neither is a hard limit — if breaking reads worse, keep it on one line.
- Beyond raw length, break where the sentence shifts direction: a comma before `so`, `then`, `and`, or a similar cause-and-effect or contrastive connector is a natural place to break for readability, even below the width threshold. Do not force a whole sentence onto one line when a break at one of these connectors makes it easier to follow.
- A short comment that expresses a single thought stays on one line and takes no trailing period.
- When a comment is broken into multiple lines but still reads as a single sentence, drop the trailing period. When it contains more than one sentence, keep the period on each sentence, including the last.
- Use a multi-line block only when one line genuinely cannot hold the idea, such as a subtle invariant or race-condition reasoning. Keep each sentence on its own line and end it with a period.
- When breaking, prefer to break at a period or colon so each line stays a complete thought; break at a comma only occasionally, and at a preposition only as a rare last resort.
- At key locations, prefer a terse note over a paragraph.
- Capitalize the first word of every comment line, except when the line starts with a term or backticked code.

## Workflow Quality

- Update docs in the same iteration when behavior, structure, or workflow truth changes.
- Promote repeated chat guidance into docs or skills when it becomes durable.
- Prefer a script or validation gate over prose-only advice when the rule is stable and measurable.
- When one doc drift is reported, inspect sibling docs, skills, and validation entrypoints for the same class of drift.

## Automated Checks

- `npm run workflow:polish` is the canonical lightweight check for workflow and documentation drift.
- The current gate enforces entry-doc and entry-skill list-run limits.
- The current gate also enforces a small set of repo-specific JSDoc rules from `CONTRIBUTING.md`, not ai-bridge-style complexity quotas.
- The current gate also runs ESLint over `skills/**/*.ts` so workflow scripts are held to the same repo style rules.
