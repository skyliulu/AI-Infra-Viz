# Interactive Module Design QA

Use this file as the reusable rendered-QA record for the module currently being created or substantially refactored. Replace bracketed fields and remove irrelevant checks instead of reporting unverified success.

## Scope

- Module: `[component and chapter name]`
- Teaching question: `[one sentence]`
- Compared modes: `[mode list or not applicable]`
- Execution contexts: `[training / prefill / decode / other]`
- Reviewed states: `[early, middle, final, and important edge states]`
- Reviewed viewports: `desktop 1440×900, tablet 768×900, mobile 390×844`
- Technical references: `[paper, official docs, or implementation sources]`

## Technical truth

- [ ] Each mode follows its real pipeline and data dependencies.
- [ ] Training, prefill, and decode are distinguished when relevant.
- [ ] Formulas, tensor/state shapes, metrics, and resource scaling are correct.
- [ ] Simplifications and capability boundaries are visible.
- Evidence: `[notes]`

## Interaction synchronization

- [ ] One canonical state drives all canvases and panels.
- [ ] Exactly one pipeline stage appears active; passed and pending remain distinct.
- [ ] Token/chunk progress follows the real execution loop.
- [ ] Mode, parameter, scrubber, reset, step, and playback controls update every dependent view.
- [ ] Autoplay completes at a useful teaching pace and stops cleanly.
- Evidence: `[notes]`

## Visual explanation

- [ ] The core design difference is visible without reading long prose.
- [ ] Growth, fixed capacity, compression, recurrence, gating, movement, or parallelism has direct visual evidence.
- [ ] Resource comparisons use dynamic values and a shared quantitative scale.
- [ ] Matrices, tensors, cache blocks, labels, and whitespace have readable proportions.
- [ ] Controls sit near the view they affect.
- Evidence: `[notes]`

## Content and implementation

- [ ] Chinese and English content are complete and routed through i18n.
- [ ] Mathematical notation is LaTeX rendered through `MathFormula`.
- [ ] Complex formulas have variable meanings or matching visual operations.
- [ ] Pseudocode reflects engine/runtime operations rather than formula translation.
- [ ] Principle content explains problem, difference, canvas observation, and boundary.
- Evidence: `[notes]`

## Accessibility and responsive layout

- [ ] Selected controls, pale panels, formulas, matrix cells, lines, and sliders have readable contrast.
- [ ] Meaning does not depend on color alone.
- [ ] Keyboard controls have accessible names and reachable focus states.
- [ ] Desktop, tablet, and mobile preserve reading order without page-level overflow.
- Evidence: `[notes]`

## Automated checks

```text
Convention checker: [pass / warnings / fail]
Production build:    [pass / fail]
Browser console:     [clean / findings]
```

## Findings

- P0: `[blocking correctness or unusable interaction findings]`
- P1: `[major conceptual, synchronization, or accessibility findings]`
- P2: `[important clarity, layout, pacing, or content findings]`
- P3: `[minor polish findings]`

## Result

Final result: `[passed / passed with documented limitations / failed]`
