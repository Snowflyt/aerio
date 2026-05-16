# Runtime Compatibility Tooling

This document covers contributor-facing runtime-compat tooling and coverage behavior.
For the user-facing runtime support matrix, see [runtime-compat.md](runtime-compat.md).

## Core Rule

Map compatibility coverage back to the original source before merging it with Vitest coverage. Reports must identify the source lines that ran.

## Coverage Merge Rules

- Remap compat runtime coverage with source maps before merging it into Vitest coverage.
- Do not merge raw compat coverage blobs before source-map remapping when different transpilation shapes are involved.
- In this repo, `SourceMapStore.transformCoverage` returns a `CoverageMap` directly; treating it as an object with a `.map` field drops compat coverage silently.

## Runtime-Specific Notes

- Node 6 compat transpilation emits CommonJS with source maps when compat coverage is enabled.
- Istanbul CommonJS coverage in Node 6 compat must use `coverageGlobalScope: "global"` with `coverageGlobalScopeFunc: true`.
- QuickJS compat tests should use the real Bellard and QuickJS-NG CLIs rather than inline mocks for `qjs:std` and `qjs:os`.
- Source-mode QuickJS compat should stay loadable by copying `src/`, emitting `.js`, and resolving aliases to real `.js` paths.

## Archive Extraction

- `extractZipArchive` prefers the system `unzip` on non-Windows and `Expand-Archive` on Windows, falling back to the `extract-zip` package only when `unzip` is absent.
- Bellard’s macOS `qjs` is a Cosmopolitan APE executable that also contains a ZIP archive. The release archive compresses it with DEFLATE. On this entry, yauzl 2.10’s inflate stream never emits `end`, so `extract-zip` hangs until the install lock times out.
- The symptom is a 300-second install-lock timeout and a partial download directory missing `qjs`.
- `extract-zip` extracts the same executable when the archive stores it without compression, but hangs on the shipped DEFLATE-compressed entry. The system `unzip` handles both.
- Test extraction with a downloaded Bellard release before changing the extractor.

## Build And Dist Boundaries

- Keep source-mode compat independent from prebuilt `dist/`.
- Use built `dist/` only for the dedicated smoke workflow.
- Keep runtime-compat artifacts under `.tmp/runtime-compat`.

## Validation Entry Points

- `npm run test:cov` for the normal suite plus runtime-compat coverage merge
- `npm run test:smoke` for the built-distribution runtime matrix
- [workflows/validation.md](workflows/validation.md) for the canonical validation path
