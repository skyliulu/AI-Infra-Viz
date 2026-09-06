# Quantization comprehension and density audit

Date: 2026-09-06. Baseline: `f0694db`. Scope: Chinese Quantization sections 02 and 04, current local page at 1287 × 911. Read-only application audit; redesign recommendations are not implemented.

## 1. Numeric representation — needs revision (P1)

Evidence: `01-numeric-default.png`, captured this run and reopened from disk. W4A16, group 8, symmetric mapping, full retained range, outlier input, selected weight 0.64.

- The heading “数值怎么变小” confuses numerical magnitude with storage. The displayed example is 0.64 → integer code 4 → reconstructed 0.703. Neither decimal digit count nor magnitude explains memory savings. Both 3 × 8 matrices correctly retain the same shape, but there is no visible 16-bit versus packed 4-bit representation.
- The main controls introduce feature distribution, grouping, clipping, and mapping before the user sees why a smaller code needs a scale. Existing prose defines terms but does not supply the missing causal visual.
- “输入特征分布” selects one of two deterministic 12 × 8 activation fixtures; the UI displays only the first row. It is not a probability-distribution visualization or token probability. In W4A16, changing X changes the output-error experiment, not W, its codes, scales, or weight storage. The control therefore distracts from the initial storage question.
- A scale converts a small code back into original units; for uniform integer quantization it also sets reconstructed-grid spacing. Grouping shares that scale across weights. Fewer groups reduce metadata, whereas smaller groups can fit local ranges better, without a universal monotonic error guarantee.
- The storage readout shows payload plus metadata but lacks the local 16-bit baseline. Current model diagnostics for 24 weights (48 B baseline), symmetric INT4, FP32 scales:

| Weights sharing one scale | Code payload | Scale metadata | Total |
| --- | ---: | ---: | ---: |
| 24 | 12 B | 4 B | 16 B |
| 8 | 12 B | 12 B | 24 B |
| 4 | 12 B | 24 B | 36 B |
| 2 | 12 B | 48 B | 60 B |

The finest group is larger than the baseline in this tiny example. This is an important tradeoff, not a universal quantization failure or representative production group size. Total compression must include scales (and zero points in the affine path). Current output MSE for tensor grouping is ~0.1976 versus ~0.2208 for group 8; do not claim monotonically better MSE with finer groups.

Recommended smallest coherent teaching repair: “用更少的 bit 存权重” → show the same weights as 16-bit storage versus packed 4-bit codes plus shared scales → click one weight to see encoding, reconstruction and error → change group size to expose storage/precision tradeoffs → introduce large input features as a separate output-error experiment. Preserve the surrounding four-section order. Keep clipping and affine controls available as secondary detail rather than front-loading them. Show consequences visually rather than adding another paragraph.

Primary technical reference: [NVIDIA TensorRT quantization schemes](https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/quantized-types-schemes.html). Reference supports scale, quantize/dequantize, and block-sharing concepts; it does not validate this toy model as a TensorRT/SGLang deployment format.

## 2. Runtime dataflow — relationships useful, density needs revision (P2)

Evidence: `02-engine-startup.png`, captured this run and reopened from disk. Load-time FP8, calibrated FP8 KV scale, startup 0/19. Also stepped via UI to Prefill 7/19 (QKV computed; Attention next) and restored startup 0/19. User's independent AWQ 2/4 state and other settings were preserved.

- The section is ~1005.5 px high at the current viewport. The main canvas is 690.1 × 500 px; the adjacent startup inspector is 307.9 × 293 px. In the inspected Prefill state, the inspector is 242 px high while the canvas stays 500 px. This produces a large unoccupied right-hand column even after data appears.
- `flow.css` fixes the canvas to 500 px and positions nodes with percentage heights, typically reserving 130–150 px for short labels, metrics and miniature tensors. The one-time checkpoint/preparation path occupies as much vertical emphasis as the recurring runtime path.
- Heading/hint, configuration selectors, phase navigation, operation navigation, canvas heading, and bottom current-operation status create several stacked bands. Phase and operation are legitimately different concepts, but repeated labels and excess band spacing can be consolidated.
- CSS sets an 800 px narrow-container canvas and stacks the inspector below at viewport widths ≤1150 px. That is a code-level density risk; narrow viewports were not rendered again in this focused audit.

Recommended repair: keep the persistent objects, honest dependencies and separate startup/Prefill/Decode semantics. Use a compact one-time weight-preparation strip, content-sized runtime nodes, nearby KV slots, and a compact selected-object explanation. Consolidate configuration/playback positioning without conflating phase with operation. Preserve legible fonts, focus states, error/scale detail and complete-matrix disclosure. Do not just scale down the entire diagram, remove KV, or animate artificial symmetric stages. A structural rearrangement requires implementation approval and fresh multi-state/responsive QA.

## Evidence limits

- This is a focused visual/conceptual audit, not a full engine-correctness, performance, keyboard, screen-reader or contrast audit.
- Current page screenshots and source/model diagnostics support the findings. No real GPU engine or checkpoint was run; no new build or full regression suite was claimed.
- Screenshots are exact native viewport captures. An initial unusable locator clip was rejected and replaced by the accepted full-viewport numeric capture.
- No application source files were edited, and nothing was committed or pushed.
