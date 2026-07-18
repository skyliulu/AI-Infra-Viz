# Interactive Module QA Checklist

Apply common checks to every module, then apply only the capability sections declared in the design brief.

## Contents

- Change-contract integrity
- Technical and interaction truth
- Visual, content, and responsive QA
- Regression and runtime verification
- Optional QA matrix

## Change-contract integrity

- [ ] The work is classified as repair, extension, or structural redesign.
- [ ] Existing controls, views, interactions, and responsive states were captured before editing.
- [ ] A rendered baseline exists for every major region that might be affected.
- [ ] Preserved behavior still works after the change.
- [ ] Any information-architecture change was explicitly in scope.
- [ ] Repairs and extensions preserve major-region order, relative prominence, control placement, split ratios, and responsive reading order unless the user explicitly authorized a redesign.
- [ ] New technical evidence was embedded in existing semantic regions before any new panel or page-wide composition was introduced.
- [ ] The affected dimensions, views, and preserved behavior were declared before editing.

## Technical and model truth

- [ ] The chapter states one clear learning question.
- [ ] Important claims have authoritative evidence, assumptions, and capability boundaries.
- [ ] Training, prefill, and decode are distinguished where relevant.
- [ ] Formulas, state shapes, dependencies, ownership, resource scaling, and limitations are correct.
- [ ] Simplifications are labeled and do not reverse the real conclusion.
- [ ] Controls are classified as independent, derived, constrained, mutually exclusive, or presentation-only.
- [ ] One canonical domain model drives all explanatory layers.
- [ ] Invalid inputs are rejected or normalized by explicit rules.

## Interaction truth

- [ ] Every control updates all and only the dependent views.
- [ ] Mode changes reset or remap incompatible state deterministically.
- [ ] Independent controls are not silently coupled.
- [ ] Locked, selected, hovered, and reset states remain mutually coherent.
- [ ] The interaction grammar matches the learning object.

### When `timeline` is declared

- [ ] Every mode has a verified execution pipeline.
- [ ] Exactly one operation appears active.
- [ ] Active, passed, pending, and done states are distinguishable.
- [ ] Token, chunk, layer, or event progress follows the real dependency order.
- [ ] Reset, play/pause, step, and scrub update every dependent view.
- [ ] Autoplay completes at a useful teaching pace and stops cleanly.

## Visual explanation

- [ ] The core difference is visible without reading long prose.
- [ ] Every important claim has a trigger, visible evidence, and representative or boundary snapshot.
- [ ] A mode switch changes every visual layer it claims to affect.
- [ ] Growth, fixed capacity, compression, recurrence, gating, movement, or parallelism use an appropriate visual variable.
- [ ] Resource comparisons share a quantitative scale.
- [ ] Matrices, tensors, and cache blocks have readable proportions.
- [ ] No major region is dominated by empty space or decorative text.
- [ ] Local controls are placed near their visible effect.
- [ ] Secondary annotations reuse the primary semantic objects instead of duplicating a disconnected explanation.

## Content and math

- [ ] All display prose uses i18n and both languages are complete.
- [ ] All mathematical notation uses LaTeX through `MathFormula`.
- [ ] Complex equations have variable meanings or a matching visual operation.
- [ ] When present, pseudocode reflects engine/runtime concepts rather than formula translation.
- [ ] Implementation evidence is included only when it advances the teaching claim.
- [ ] The inspector or equivalent explanation covers problem, difference, observation, and boundary.

## Accessibility and responsive layout

- [ ] Selected text, small formulas, matrix cells, sliders, and pale panels have readable contrast.
- [ ] Meaning does not rely on color alone.
- [ ] Desktop, tablet, and mobile preserve logical reading order.
- [ ] No page-level horizontal overflow appears.
- [ ] Dense components have no unintended internal overflow in sparse, representative, and maximum-content states.
- [ ] Both languages preserve readable proportions and control labels.
- [ ] Controls remain keyboard reachable and have labels.
- [ ] Important region proportions, unused space, wrapping, and overflow were compared against the baseline with measurable evidence.

## Regression and runtime verification

- [ ] Run the convention checker with the declared capabilities and review warnings.
- [ ] Pure-model tests cover formulas, constraints, invariants, and large legal state spaces where relevant.
- [ ] Browser tests cover single-control changes, important coupled controls, representative modes, and boundary states.
- [ ] Every value in each affected dimension is covered; coupled dimensions have explicit cross-product coverage.
- [ ] Run `npm run build` successfully.
- [ ] Inspect representative initial, intermediate, boundary, and final states where they exist.
- [ ] Check browser console output.
- [ ] Convert every confirmed defect into a model assertion, browser case, or checklist item.
- [ ] Record P0-P3 findings, current result, evidence, contract impact, and unresolved limitations in `design-qa.md`.

## Optional QA matrix

Use a module-owned JSON matrix when a change spans several values or coupled dimensions. Keep only affected dimensions in the file:

```json
{
  "dimensions": {
    "mode": ["baseline", "alternative"],
    "viewport": ["wide", "narrow"]
  },
  "requiredCrossProducts": [["mode", "viewport"]],
  "cases": [
    {
      "name": "baseline wide",
      "state": { "mode": "baseline", "viewport": "wide" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "baseline narrow",
      "state": { "mode": "baseline", "viewport": "narrow" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "alternative wide",
      "state": { "mode": "alternative", "viewport": "wide" },
      "checks": ["model invariant", "rendered evidence"]
    },
    {
      "name": "alternative narrow",
      "state": { "mode": "alternative", "viewport": "narrow" },
      "checks": ["model invariant", "rendered evidence"]
    }
  ]
}
```

Run `check-qa-matrix.mjs` to verify dimension values and required combinations are represented. The helper validates coverage structure; module tests and rendered QA still determine whether the assertions are true.
