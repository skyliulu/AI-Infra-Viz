# Interactive Module QA Checklist

## Technical truth

- [ ] The chapter states one clear learning question.
- [ ] Every mode has a verified execution pipeline.
- [ ] Training, prefill, and decode are distinguished where relevant.
- [ ] Formulas, state shapes, resource scaling, and limitations are correct.
- [ ] Simplifications are labeled and do not reverse the real conclusion.

## Interaction model

- [ ] One canonical state drives all explanatory layers.
- [ ] Exactly one pipeline stage appears active.
- [ ] Active, passed, pending, and done states are distinguishable.
- [ ] Token or chunk progress follows the real dependency order.
- [ ] Mode, parameter, token, reset, step, and playback controls update every dependent view.
- [ ] Autoplay completes at a useful teaching pace.

## Visual explanation

- [ ] The core difference is visible without reading long prose.
- [ ] Growth, fixed capacity, compression, recurrence, gating, movement, or parallelism use an appropriate visual variable.
- [ ] Resource comparisons share a quantitative scale.
- [ ] Matrices, tensors, and cache blocks have readable proportions.
- [ ] No major region is dominated by empty space or decorative text.
- [ ] Local controls are placed near their visible effect.

## Content and math

- [ ] All display prose uses i18n and both languages are complete.
- [ ] All mathematical notation uses LaTeX through `MathFormula`.
- [ ] Complex equations have variable meanings or a matching visual operation.
- [ ] Pseudocode reflects engine/runtime concepts rather than formula translation.
- [ ] The principle panel explains problem, difference, observation, and boundary.

## Accessibility and responsive layout

- [ ] Selected text, small formulas, matrix cells, sliders, and pale panels have readable contrast.
- [ ] Meaning does not rely on color alone.
- [ ] Desktop, tablet, and mobile preserve logical reading order.
- [ ] No page-level horizontal overflow appears.
- [ ] Controls remain keyboard reachable and have labels.

## Runtime verification

- [ ] Run the convention checker and review warnings.
- [ ] Run `npm run build` successfully.
- [ ] Play every mode from start to done.
- [ ] Inspect representative early, middle, and final snapshots.
- [ ] Check browser console output.
- [ ] Record P0-P3 findings and the final result in `design-qa.md`.

