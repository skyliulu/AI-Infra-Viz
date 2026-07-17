---
name: develop-interactive-module
description: Develop interactive LLM infrastructure visualization modules throughout their lifecycle. Use when creating a chapter, modifying or extending an existing module, correcting technical or interaction behavior, improving visual encoding or responsive layout, revising formulas or implementation evidence, or performing rendered interaction QA.
---

# Develop an Interactive Module

Build an explicit teaching model before building the interface. Choose interactions that fit the learning object; do not add animation, comparison, or architectural layers by default.

## 1. Capture the existing contract

Read `AGENTS.md`, neighboring modules, routing, shared components, and the current QA record. For an existing module, render every current mode and record:

- the teaching question and accepted interaction structure;
- the controls, canvases, inspectors, and cross-view interactions that must remain;
- the behavior that may change in this iteration;
- representative baseline states and responsive widths.

Classify the work as a repair, extension, or structural redesign. Default to the smallest change that satisfies the request. Do not replace the information architecture during a repair or extension unless the user authorizes that scope.

## 2. Declare the teaching capabilities

State which capabilities the module actually needs:

- `timeline`: ordered execution with play, pause, step, or scrub;
- `multiple-modes`: modes whose mechanisms or consequences differ;
- `resource-metrics`: quantitative capacity, traffic, latency, or utilization;
- `structural-comparison`: representations or architectures compared on shared dimensions;
- `data-movement`: ownership, transfer, routing, or communication paths;
- `dense-layout`: matrices, cards, lanes, or other high-density responsive content;
- `math`: mathematical notation that must use the shared renderer.

These capabilities select interaction and QA requirements; they are not a required feature list. A structural explorer does not need a global playback state, and a timeline should not be added merely to satisfy a convention.

## 3. Verify claims and boundaries

Use primary papers, official documentation, or real implementations when technical behavior is uncertain. Record a compact claim ledger with the claim, authoritative basis, assumptions, capability boundary, model consequence, and visible evidence.

Verify formulas, shapes, data dependencies, ownership, resource scaling, and execution context before implementing the UI. Distinguish training, prefill, and decode when relevant. Label deliberate simplifications and version-specific behavior; never let a simplification reverse the real conclusion.

## 4. Build one canonical domain model

Read [interaction-model.md](references/interaction-model.md). Classify each control as independent input, derived value, constrained input, mutually exclusive mode, or presentation-only preference. Normalize inputs before deriving a pure snapshot.

Store only user-controlled and lifecycle state. Derive every canvas, metric, formula, highlight, and explanation from the same model. Keep technical rules out of ad hoc JSX branches. Add module-level model regression when the legal state space is large or interactions have important invariants.

For `timeline`, model the real dependency order and keep exactly one operation active. For other capabilities, use the interaction grammar that best exposes structure, ownership, comparison, or parameter sensitivity.

## 5. Design claim-to-evidence interactions

Read [visual-grammar.md](references/visual-grammar.md). For each important claim, specify:

1. the user action or state that exposes it;
2. the visual variable or relationship that changes;
3. the expected early, representative, boundary, or final snapshot.

A mode switch must visibly change every layer it claims to affect. Reuse the primary visual objects when adding movement, ownership, or annotations instead of creating a second disconnected explanation. Allocate space by information density and preserve the existing visual hierarchy unless the change contract permits otherwise.

## 6. Implement the smallest coherent slice

Read [content-and-math.md](references/content-and-math.md). Implement or correct the pure model first, then connect the existing views to it, then refine visual encoding and prose. Route display prose through i18n and mathematical notation through the shared KaTeX renderer.

Keep rendering a pure model-to-UI mapping. Separate domain derivation, translated content, visual primitives, and panels when complexity justifies it. Avoid broad refactors that do not contribute to the accepted teaching claim or regression safety.

## 7. Validate in layers

Read [qa-checklist.md](references/qa-checklist.md). Run the common convention checks plus the declared capabilities:

```bash
node .agents/skills/develop-interactive-module/scripts/check-module-conventions.mjs src/components/YourModule.jsx --capabilities timeline,math,multiple-modes
npm run build
```

Use three complementary verification layers:

- pure-model tests for formulas, constraints, invariants, and large combination spaces;
- browser interaction tests for key controls, coupled state, and representative paths;
- rendered QA for visual evidence, responsive density, both languages, accessibility, and console output.

Turn every confirmed defect into a reusable regression assertion, browser case, or checklist item. Update `design-qa.md` with the current result, evidence, unresolved limitations, and change-contract impact. Do not declare completion from source inspection or a successful build alone.
