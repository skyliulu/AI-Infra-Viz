# AI-Infra-Viz 🚀

> **Lift the hood on large model inference and intuitively understand the low-level art of AI infrastructure.**

`AI-Infra-Viz` is an interactive, panoramic visualization project designed to bridge the cognitive gap between "abstract algorithms" and "low-level operators".
It shows not only how LLMs think, but also how the hardware Memory Wall is shattered by techniques like Flash Attention.

### 🌟 Highlights
- **LLM End-to-End Inference**: Watch MoE routing, RoPE positional encoding, and the autoregressive loop in real time.
- **Parallel Strategies**: Interactive visualization of DP, TP, PP, CP, EP, and ETP parallelism — explore how large models are distributed across GPUs.
- **Flash Attention Deep Dive**: Physics-level simulation of data movement and tiling strategies between SRAM and HBM.
- **Flash Decode**: Visualize the optimized decoding process with efficient attention computation.
- **Zero-Dependency Components**: All visualization logic is encapsulated in standalone React components, ready to reuse.

### 🗂️ Modules

| Module | Description |
|---|---|
| LLM Inference | End-to-end LLM inference with MoE routing, RoPE, and autoregressive generation |
| Parallel Strategies | Interactive GPU parallelism explorer: DP / TP / PP / CP / EP / ETP |
| Flash Attention | Tiled SRAM/HBM data-movement simulation for Flash Attention |
| Flash Decode | Efficient attention decoding visualization |

### 🔗 Live Demo
Visit the [GitHub Pages](https://skyliulu.github.io/AI-Infra-Viz/) live demo.
