# Interactive Module QA Checklist

Apply common checks to every module, then apply only the capability sections declared in the design brief.

## Change-contract integrity

- [ ] The work is classified as repair, extension, or structural redesign.
- [ ] Existing controls, views, interactions, and responsive states were captured before editing.
- [ ] Preserved behavior still works after the change.
- [ ] Any information-architecture change was explicitly in scope.

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

## Regression and runtime verification

- [ ] Run the convention checker with the declared capabilities and review warnings.
- [ ] Pure-model tests cover formulas, constraints, invariants, and large legal state spaces where relevant.
- [ ] Browser tests cover single-control changes, important coupled controls, representative modes, and boundary states.
- [ ] Run `npm run build` successfully.
- [ ] Inspect representative initial, intermediate, boundary, and final states where they exist.
- [ ] Check browser console output.
- [ ] Convert every confirmed defect into a model assertion, browser case, or checklist item.
- [ ] Record P0-P3 findings, current result, evidence, contract impact, and unresolved limitations in `design-qa.md`.
