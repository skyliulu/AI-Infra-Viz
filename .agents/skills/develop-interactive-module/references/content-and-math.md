# Content, Math, and Implementation

## Maintain a claim ledger

Before polishing prose, record each important claim with:

- its authoritative basis;
- assumptions and execution context;
- the model fact that implements it;
- the visual evidence that demonstrates it;
- the limitation or version boundary that prevents overgeneralization.

Use the same terms for a concept across controls, canvases, formulas, metrics, and implementation evidence. Do not let user-facing copy become a second, conflicting technical model.

## Establish the chapter hierarchy

Keep titles concise and consistent with neighboring chapters. Separate two explanatory levels when useful:

- design or architecture: what representation, resource, or topology changes;
- execution: how one real token, chunk, request, or kernel step updates the system.

Use parallel heading grammar and typography across levels. Avoid internal engineering labels such as "single real decoder routine" in user-facing titles.

## Structure the inspector around the current selection or stage

Prefer this order:

1. current selection, state, or stage and its mechanism;
2. core problem;
3. difference from the comparison mode;
4. what to observe on the canvas;
5. core formula;
6. variable meanings and live dimensions;
7. engine-style pseudocode;
8. capability boundary.

Keep each block concise. Do not repeat the same paragraph in the canvas and inspector.

## Render mathematics consistently

- Author mathematical expressions as LaTeX.
- Render them with the shared `MathFormula` component.
- Keep language-independent LaTeX outside translation dictionaries.
- Do not fake subscripts, superscripts, tensors, or operators with Unicode or `font-mono` strings.
- Pair a complex equation with variable explanations or a visualization that shows the same operation.
- Derive displayed dimensions and sizes from current state.

## Write useful implementation evidence

When implementation detail contributes to the teaching claim, use primary implementation evidence and show the abstraction level of an inference engine rather than a literal transcription of the equation. Do not add pseudocode merely to fill a standard panel.

Depending on the topic, expose concepts such as:

- request and sequence metadata;
- allocation, slot mapping, block tables, or cache lookup;
- prefill/decode dispatch;
- tiled, chunked, recurrent, fused, or collective kernels;
- workspace and intermediate ownership;
- persistent state write-back or final-state commit;
- output projection and synchronization.

Highlight the block corresponding to the current visual stage. Preserve indentation and horizontal readability. Label deliberate simplifications.

## Keep algorithm relationships explicit

For every mode, state:

- what problem it solves;
- what structure it reuses from the baseline;
- the one structural difference that matters most;
- the resource or quality tradeoff;
- what it still cannot guarantee.

Do not describe an extension as an unrelated algorithm when it reuses the same backbone.
Do not present one implementation's constraint as a universal property. State version, backend, hardware, shape, or execution-context boundaries when they materially affect the claim.

## Maintain i18n

Route all visible prose through `t(key)` and keep Chinese and English keys identical. Keep mathematical source shared. Verify both languages after layout changes because translated lengths may alter wrapping and panel height.
