# Documentation Structure

## Core Rule

Keep entry docs short. Put the main instruction on the first screen and link to child docs for detailed procedures.

## Audience Split

- `README.md`: user-facing product entry
- `CONTRIBUTING.md`: contributor and maintainer entry
- `AGENTS.md`: thin AI and maintainer quick index
- `docs/README.md`: canonical docs index
- `docs/`: durable engineering, architecture, and workflow material
- `skills/`: focused task workflows and helper tooling

## First Screen Rule

- Put the current behavior or next action before background.
- Put the main instruction before long examples or historical context.
- Entry docs should point to child docs rather than restating them in full.

## Refactor Rule

- Do not keep appending bullets to one crowded section.
- Merge duplicates first.
- Add a clearer subheading second.
- Move a section into a child doc when it covers a separate task or audience.
- More than 10 consecutive list items in an entry doc should trigger regrouping or a split.

## Maintenance Rule

- Update docs alongside changes to code structure or workflow commands.
- Prefer one canonical doc per concern.
- Record reusable workflow guidance in the relevant doc or skill rather than leaving it in chat.
