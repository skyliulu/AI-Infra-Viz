# Linear Attention Design QA

## Scope

- Reference direction: Option 1, adapted to the repository's existing dark shell and light workbench.
- Reviewed states: Exact Softmax, Naive Linear, GLA; all five teaching stages.
- Reviewed viewports: desktop 1440×900, tablet 768×900, mobile 390×844.

## Functional checks

- Mode switching updates formulas, metrics, limitations, and pseudocode.
- Step rail, reset, play/pause, single-step, token scrubber, parameter selects, language switch, and side-panel tabs are reachable and responsive.
- Recurrent-state view includes both S and z, with an explicit outer-product construction.
- GLA view exposes a factorized retention gate and compares stale-state contamination.
- No browser console errors were observed.
- Production build completes successfully.

## Visual and content findings

- P0: none.
- P1: none.
- P2 fixed: replaced the ambiguous "state reduction" metric with directional state comparison.
- P2 fixed: added the missing φ(kₜ) × vₜ outer-product construction before the state update.
- P2 fixed: constrained recurrence matrices so the main canvas keeps the selected reference's information density.
- P2 fixed: verified that tablet and mobile layouts do not introduce page-level horizontal overflow.

## Result

final result: passed
