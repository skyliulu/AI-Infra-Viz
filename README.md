# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **Understand how large language models really work — from tokens to systems.**

An **interactive playground** for exploring **LLM systems, inference workflows, and AI infrastructure** through visualization and hands-on interaction.

🌐 Live Demo: https://skyliulu.github.io/LLM-Infra-Explorer/

---

## ✨ Why this project?

Modern LLM systems are **complex, opaque, and hard to reason about**:

- What actually happens during inference?
- How does KV cache evolve over time?
- What do DP / TP / PP really change in execution?
- Why are optimizations like Flash Attention so effective?

This project helps you **see and interact with these processes**, instead of just reading about them.

---

## 🧠 What you can explore
- 🖥️ **LLM Inference Visualization** — step-by-step prefill/decode animation, KV cache lifecycle, MoE vs Dense architecture toggle, and temperature-controlled sampling
- 🔀 **6D Parallel Strategy Explorer** — interactive DP / TP / PP / CP / EP / ETP topology with real-time tensor slicing and GPU resource mapping
- ⚡ **Flash Attention Walkthrough** — Standard vs Flash Attention comparison, SRAM/HBM IO traffic tracking, and block-by-block tiled computation with causal mask skipping
- 🚀 **Flash Decode** — KV Cache splitting across SM compute units, parallel two-step reduction, and memory-wall-breaking decode optimization
- 🧬 **Engram (DeepSeek)** — n-gram conditional memory retrieval augmenting Transformer layers, with tensor flow visualization and hardware-level async prefetch timeline
- 🌲 **Radix Cache** — SGLang's radix-tree-based global KV cache sharing, with lazy prefix splitting, LRU eviction, and physical memory block reuse visualization
- 🔁 **DP Attention** — hybrid DP/TP attention flow, KV cache row-sharding strategy, and cross-rank communication trade-off visualization

---

## 🖼️ Preview

![Engram demo](./media/engram.gif)

[Open video directly](./media/engram.mp4)

![Parallel strategy demo](./media/parallel.gif)

[Open video directly](./media/parallel.mp4)

---

## 🚀 Getting Started

```bash
git clone https://github.com/skyliulu/LLM-Infra-Explorer.git
cd LLM-Infra-Explorer
npm install
npm run dev
```

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).
Commercial use is subject to the terms of this license. Any network-deployed modifications must also be open-sourced.
