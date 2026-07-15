---
name: develop-interactive-module
description: Develop interactive LLM infrastructure visualization modules throughout their lifecycle. Use when creating a chapter, modifying or extending an existing module, refactoring an unfinished visualization, correcting algorithm or animation behavior, improving layout and visual encoding, revising formulas or engine pseudocode, or performing rendered interaction QA.
---

# Develop an Interactive Module

Build the teaching model before building the interface. Treat animation as an executable explanation of a real algorithm or system, not as decoration.

## 1. Inspect the project and define the teaching claim

Read `AGENTS.md`, neighboring modules, routing, shared math components, and the current QA template. For a refactor, play every existing mode before editing.

Write a short design brief containing:

- the one question the chapter answers;
- the baseline and proposed design, when a comparison is meaningful;
- the data structure or resource that changes;
- the real execution pipeline for each mode;
- the benefit, cost, and capability boundary;
- the visual evidence that will make each claim observable.

Do not start implementation while the core difference still requires a paragraph of prose to become visible.

## 2. Verify technical truth

Use primary papers, official documentation, or real engine implementations when algorithm details, kernel dispatch, cache behavior, or runtime state are uncertain. Distinguish training, prefill, and decode. Do not force different algorithms into identical stages merely to simplify the UI.

Record the authoritative formulas, state shapes, data dependencies, and resource scaling before writing the animation. Mark any simplification explicitly.

## 3. Design one canonical interaction model

Read [interaction-model.md](references/interaction-model.md). Define one canonical state containing mode, execution context, phase, token or chunk position, active stage, dimensions, and algorithm parameters. Derive canvases, metrics, formulas, pseudocode highlights, and explanatory copy from this state.

Show the complete pipeline in one canvas when the learning goal is sequential execution. Keep exactly one stage active; render completed, active, and pending as different states. Advance the token only after the current token's real pipeline completes.

## 4. Create the visual storyboard

Read [visual-grammar.md](references/visual-grammar.md). Map every important claim to a changing visual variable such as length, count, position, opacity, flow, reuse, or capacity. Prefer data movement and structural change over explanatory paragraphs.

Keep controls close to the view they affect. Allocate space by information density. Avoid oversized containers around tiny labels or values.

## 5. Integrate content, math, and implementation evidence

Read [content-and-math.md](references/content-and-math.md). Use shared KaTeX rendering for every mathematical expression and route all display prose through i18n. Pair complex formulas with variable meanings or a directly corresponding visualization.

Write engine-style pseudocode that exposes runtime concepts such as allocation, metadata, state lookup, kernel dispatch, chunking, cache writes, and final-state commits. Do not translate the displayed equation line by line and call it implementation pseudocode.

For a complex module, prefer separating pure model/state derivation, translated content, visual primitives, canvases, and inspector panels. Keep rendering as a pure state-to-UI mapping.

## 6. Validate the finished experience

Read [qa-checklist.md](references/qa-checklist.md). Run:

```bash
node .agents/skills/develop-interactive-module/scripts/check-module-conventions.mjs src/components/YourModule.jsx
npm run build
```

Then inspect rendered desktop, tablet, and mobile states. Play every mode from start to finish, scrub the timeline, change every parameter, and verify that all dependent views remain synchronized. Update `design-qa.md` with evidence, unresolved limitations, and the final result.

Do not declare completion from source inspection alone.
