# Editing documentation

This guide is for agents reviewing or changing Aerio documentation.
Follow [Documentation Quality](documentation-quality.md) for repository conventions.
Judge an edit by what readers can understand or do afterward.

## Review the content before the wording

Read the whole section and identify its audience and purpose.
A setup guide needs working steps; an architecture explanation needs mechanisms and reasons; a design archive needs the evidence available when a decision was made.

For each passage, choose an action:

- Keep it when it answers a reader’s question clearly.
- Rewrite it when the information matters but the wording obscures it.
- Move it when another section needs that detail.
- Delete it when it repeats information or only explains the editor’s intentions.

A small code change may need no documentation change.
Do not invent a paragraph to prove that documentation was considered.

## Match the edit to the document

Human-facing guides and agent instructions serve different purposes.
A contributor welcome can be warm; a README tutorial can introduce an idea gradually; an agent procedure may need direct commands.
Use unslop to fix a reading problem, not to make every document terse.

### Keep useful warmth and teaching

“Thanks for taking the time to contribute to aerio” welcomes contributors.
It does not need to become “Install dependencies, make a focused change, and run the checks that cover it.”
The replacement removes the welcome and adds a summary before readers need one.

In a README, an introduction or transition can help readers follow an unfamiliar concept.
Keep it when it helps the explanation progress, even if it adds no new technical fact.

### Let broad guidance stay broad when it works

“Keep JSDoc clear and technical. Avoid colloquial or affective wording” sets a style expectation in a contributor guide.
Replacing it with “Describe what the API does, returns, and requires. For example, say whether cancellation waits for cleanup” changes the subject from tone to content.
The example also adds detail that may belong in a dedicated writing guide.
Before expanding a general instruction, identify what readers would otherwise misunderstand.

### Preserve the meaning of a principle

“Do not optimize for the appearance of completeness over the current truth” covers more than testing.
It also applies to unfinished implementations, missing evidence, and misleading documentation.
“Distinguish tested behavior from expected behavior” covers only one part of that principle and is not an equivalent replacement.

An example can illustrate a principle without replacing it.
Compare the original and revised scope before accepting a more concrete sentence.

## Patterns to investigate

These are editing prompts, not tests for who wrote a sentence.
The examples below illustrate revisions; they are not new API guarantees.

### Abstract words without a mechanism

> Validate the touched slice against the canonical workflow surface.

Write what to check:

> Run the test for the changed function, then check that file’s diagnostics.

Words such as “surface”, “seam”, “contract”, and “invariant” can have precise technical meanings.
Name the function, boundary, or condition they refer to.
If an unfamiliar concept matters, show it in use rather than replacing one abstract noun with another.
For example, “a missing array index differs from a stored `undefined`” becomes concrete with:

```javascript
const pending = new Array(1);
const completed = [undefined];
0 in pending; // => false
0 in completed; // => true
```

### Reassurance addressed to an absent reviewer

> This preserves the architecture without introducing unnecessary specialization or changing unrelated behavior.

Delete this when it merely reports compliance with review instructions.
If readers need an architectural fact, state that fact where the architecture is explained.
A warning is useful when it identifies a plausible mistake and its consequence, such as overwriting a file containing unsaved work.
A list of unrelated mistakes the editor avoided is not useful.

### Patch narration presented as explanation

Consider this paragraph from an array-write optimization:

> Producer-side bookkeeping appends with `push`: result slots and status entries in `all`, and settled flags in `allOutcome`, `any`, `race`, and `raceOutcome`.
> This avoids extending array length into holes before filling each new entry.
> Completion still writes by input index, so out-of-order completion does not reorder results.
> `anyOrdered` deliberately keeps sparse result and reason arrays: a missing index means pending, whereas a present `undefined` can be a completed value or failure reason.
> Do not prefill those arrays or replace indexed completion writes with appends.

Delete it from a performance overview.
The list of writes is visible in the patch, and the last sentence warns against an unrelated bug.
The sparse-array distinction may belong beside code that depends on it.
A benchmark report would instead need the workload, measured difference, and test conditions.
Those are different reader needs; combining them does not make the paragraph more informative.

### Qualifications unrelated to the change

An array optimization prompted this replacement:

> It does not depend on the concrete `IO` representation.

became:

> Child coordination stays in the typeclass layer; the direct-success check uses the existing `Pure` representation convention described below.

The optimization had not changed that architectural boundary, and the fast-path section already described the convention.
Leave the existing sentence alone in that edit.
If its accuracy is in question, check the implementation and address the claim separately.
Do not use a wording cleanup to settle an architectural question.

### Importance claims without evidence

> This robust mechanism significantly improves performance, highlighting the flexibility of the design.

Remove the praise and the unsupported conclusion.
Explain the mechanism, or give a measured result with its workload and conditions.
Do not replace “significantly” with a guessed number.
Likewise, “sources confirm” is not evidence unless the cited source supports the specific claim.

### Repetition disguised as structure

Look for a heading, an opening sentence, several bold labels, and a conclusion all repeating the same point.
Keep the information once.
Use a table for comparisons, a list for distinct items, and prose for an explanation.
Do not force three benefits, three risks, or a “challenges and future prospects” section when the material does not call for them.

Keep a technical term consistent instead of cycling through synonyms for variety.
For example, replacing “fiber” with “execution unit” and then “worker” can suggest three different things.

### Missing context and false certainty

Replace “as discussed”, “the approved approach”, and “the current direction” with the actual decision or a link to it when readers need that history.
Remove them otherwise.
Do not add personal machine paths, chat citation tokens, placeholders, or instructions to consult an unavailable skill.

Keep uncertainty that affects interpretation.
“No leak was observed in these workloads” says something different from “there are no leaks”.
When editing a historical result, retain its date, versions, conditions, and unresolved questions.
Smoother prose must not turn a proposal into an implementation or a local measurement into a general guarantee.

## Examples should answer the hard part

When a paragraph introduces an unfamiliar behavior, show the smallest case that distinguishes it from the likely misunderstanding.
Include the input and observable result.
A cancellation explanation may need a sequence of events rather than a code sample.
An API example should use real names and runnable expressions.
Verify it against the implementation or tests before publishing it.

Keep setup that the reader needs to reproduce the result.
Remove scaffolding that hides the behavior being explained.
Do not add a trivial example to every paragraph merely to satisfy a checklist.

## Editing and validation

1. Read the current files and check existing changes before editing. Preserve commands, identifiers, measurements, and source references unless the task includes correcting them.
2. Edit related passages together. Check each replacement for lost conditions or altered meaning.
3. Read the result without the conversation. Remove sentences that need the review exchange to make sense. Follow the repository’s typography conventions rather than a generic punctuation blacklist.
4. Inspect VS Code Problems after each batch and fix Markdown diagnostics in the edited files. Use headings at the correct levels instead of bold text pretending to be a heading.
5. Run `npm run workflow:polish` and `git diff --check`. Check links and examples separately; a clean lint result does not establish their correctness.

## Sources and how to use them

- [Wikipedia’s Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) is an observational guide, not a writing standard or proof of authorship. Its examples of inflated significance, formulaic contrasts, conversation residue, and citation problems are useful prompts for inspection. Wikipedia-specific formatting advice is not a rule for this repository.
- [Google: Audience](https://developers.google.com/tech-writing/one/audience) explains how to choose material based on what readers need and already know. [Documents](https://developers.google.com/tech-writing/one/documents) also explains when scope exclusions help readers.
- [Google: Creating sample code](https://developers.google.com/tech-writing/two/sample-code) describes focused, correct examples with enough context and expected results.
- [Microsoft’s style and voice guidance](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) demonstrates direct wording and removal of unnecessary jargon.
- [Diátaxis: How-to guides](https://diataxis.fr/how-to-guides/) organizes instructions around the reader’s task. Its advice to separate explanation from steps applies to how-to guides, not to every kind of document.

The examples and editing decisions above apply these ideas to Aerio.
Use them to improve information and readability, not to optimize an AI-detector score.
