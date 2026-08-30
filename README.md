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

- 🖥️ **LLM Inference Panorama** — follow tensors from token embedding through Attention, Dense FFN or MoE experts, per-layer KV Cache, LM Head, and Temperature / Top-K / Top-P sampling
- 🔀 **Parallel Strategy Explorer** — compose DP / TP / PP / CP / EP / ETP, inspect matrix slicing and GPU rank mapping, and compare DP Attention, Wide-EP, P/D disaggregation, and runtime communication designs
- ⚡ **Flash Attention** — compare Standard Softmax with FlashAttention V1–V4 through forward/backward tiled pipelines, active SRAM tiles, HBM intermediates, and IO traffic
- 🚀 **Flash Decode** — contrast Unsplit and Split-K decode, Contiguous and Paged KV layouts, MHA/GQA/MQA head sharing, CTA scheduling, workspace writes, and final reduction
- ✨ **Speculative Decoding** — compare serial Target decoding with block verification, then explore EAGLE-2 dynamic draft trees and DSpark confidence-scheduled semi-autoregressive blocks
- 🧬 **Engram (DeepSeek)** — trace tokenizer compression, multi-head n-gram retrieval, context-aware gating, short convolution, and inference/training data movement
- 🌲 **Radix Cache** — explore radix-tree prefix reuse, per-request reference locks, capacity deficits, LRU leaf eviction, and paired K/V page allocation
- 📈 **Linear Attention** — move from Standard Softmax to kernelized linear Attention, recurrent state updates, and Gated Linear Attention (GLA)
- 🔁 **DP Attention** — compare standard TP Attention with MLA-oriented DP Attention, including KV ownership and TP-FFN or EP-MoE communication paths

---

## 🖼️ Preview

### LLM inference: tensors, KV Cache, and sampling

![LLM inference demo](./media/llm-inference.gif)

[Open video directly](./media/llm-inference.mp4)

### Parallel strategies: slicing, ranks, and runtime topology

![Parallel strategy demo](./media/parallel.gif)

[Open video directly](./media/parallel.mp4)

### Engram: retrieval, gating, and system data movement

![Engram demo](./media/engram.gif)

[Open video directly](./media/engram.mp4)

The animations show representative interaction paths. Open the [live demo](https://skyliulu.github.io/LLM-Infra-Explorer/) to explore every mode and parameter combination.

---

## 🧭 Roadmap

The next chapters will continue to connect algorithm-level tensor flows with runtime scheduling, memory ownership, and physical communication. The list below describes candidate directions rather than a fixed delivery order.

### Inference algorithms

- **Speculative Decoding Extensions** — benchmark-backed hardware profiles, EAGLE-3, native MTP, multi-round serving traces, and engine-specific batching/runtime boundaries
- **Quantization & Low-Precision Inference** — W8A8, W4A16, FP8, KV Cache quantization, scaling granularity, and dequantization/fused-kernel boundaries

### Serving runtime and memory

- **Continuous Batching & Scheduler** — request lifecycle, chunked prefill, decode batching, preemption, admission control, and latency/throughput trade-offs
- **KV Memory Hierarchy** — GPU/CPU/NVMe offload, tiered KV Cache, migration, prefix reuse, and disaggregated KV ownership

### Distributed systems

- **MoE Serving & Load Balancing** — expert placement, token dispatch, capacity pressure, Expert Parallelism, All-to-All, and dynamic expert rebalancing
- **Interconnect & Collective Communication** — NVLink, PCIe, InfiniBand/RDMA, NCCL collectives, hierarchical All-Reduce, Reduce-Scatter, and All-to-All
- **Inference Performance Model** — TTFT/TPOT decomposition, compute-vs-memory bottlenecks, Roofline intuition, utilization, and end-to-end profiling evidence

Suggestions and implementation references for these chapters are welcome through GitHub Issues.

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
