# LLM-Infra-Explorer 🚀

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **从 Token 到系统，真正理解大语言模型的运作方式。**

一个面向 **LLM 系统、推理工作流与 AI 基础设施**的**交互式探索项目**，通过可视化与动手实践帮助你建立深层理解。

🌐 在线体验：https://skyliulu.github.io/LLM-Infra-Explorer/

---

## ✨ 为什么做这个项目？

现代 LLM 系统**复杂、不透明，难以直观理解**：

- 推理过程中到底发生了什么？
- KV Cache 是如何随时间演化的？
- DP / TP / PP 对执行流程有什么影响？
- 为什么 Flash Attention 这类优化如此有效？

本项目帮助你**看见并亲手探索这些过程**，而不仅仅是阅读文字描述。

---

## 🧠 可以探索哪些内容

- 🖥️ **LLM 推理全景** — 从 Token Embedding 依次观察 Attention、Dense FFN 或 MoE Expert、逐层 KV Cache、LM Head，以及 Temperature / Top-K / Top-P 采样
- 🔀 **并行策略探索器** — 组合 DP / TP / PP / CP / EP / ETP，查看矩阵切分与 GPU Rank 映射，并对比 DP Attention、Wide-EP、P/D 分离和 Runtime 通信设计
- ⚡ **Flash Attention** — 对比 Standard Softmax 与 FlashAttention V1–V4 的前向/反向分块流水线、片上 SRAM Tile、HBM 中间产物和 IO 流量
- 🚀 **Flash Decode** — 对比 Unsplit / Split-K、Contiguous / Paged KV、MHA/GQA/MQA Head 共享、CTA 调度、Workspace 写入与最终归约
- ✨ **推测解码** — 同屏对比 Target 串行 Decode 与块验证，并探索 EAGLE-2 动态候选树和 DSpark 置信度调度的半自回归候选块
- 🧬 **Engram（DeepSeek）** — 追踪 Tokenizer Compression、多头 N-gram 检索、Context-aware Gating、Short Convolution，以及推理/训练的数据移动
- 🌲 **Radix Cache** — 探索基数树前缀复用、请求引用锁、容量缺口、LRU 叶节点驱逐和成对 K/V Page 分配
- 📈 **Linear Attention** — 从 Standard Softmax 推进到核函数 Linear Attention、递归状态更新与 Gated Linear Attention（GLA）
- 🔁 **DP Attention** — 对比标准 TP Attention 与面向 MLA 的 DP Attention，包括 KV 所有权和 TP-FFN / EP-MoE 通信路径

---

## 🖼️ 项目预览

### LLM 推理：张量、KV Cache 与采样

![LLM 推理演示](./media/llm-inference.gif)

[直接打开视频](./media/llm-inference.mp4)

### 并行策略：切分、Rank 与 Runtime 拓扑

![并行策略演示](./media/parallel.gif)

[直接打开视频](./media/parallel.mp4)

### Engram：检索、门控与系统数据移动

![Engram 演示](./media/engram.gif)

[直接打开视频](./media/engram.mp4)

以上动画展示代表性交互路径；完整模式与参数组合请进入[在线体验](https://skyliulu.github.io/LLM-Infra-Explorer/)探索。

---

## 🧭 后续计划

后续章节将继续把算法层的张量流，与 Runtime 调度、显存所有权和物理通信联系起来。以下是候选方向，不代表固定的开发顺序。

### 推理算法

- **推测解码扩展** — 增加有实测依据的硬件配置、EAGLE-3、原生 MTP、多轮 Serving 轨迹和不同引擎的批处理/运行时边界
- **量化与低精度推理** — 展示 W8A8、W4A16、FP8、KV Cache 量化、缩放粒度，以及反量化与融合 Kernel 的边界

### Serving Runtime 与显存

- **Continuous Batching 与 Scheduler** — 展示请求生命周期、Chunked Prefill、Decode Batching、抢占、准入控制和时延/吞吐权衡
- **KV 显存层级** — 展示 GPU/CPU/NVMe Offload、分层 KV Cache、迁移、前缀复用和 P/D 分离下的 KV 所有权

### 分布式系统

- **MoE Serving 与负载均衡** — 展示 Expert 放置、Token Dispatch、容量压力、Expert Parallelism、All-to-All 和动态 Expert 再平衡
- **互连拓扑与集合通信** — 展示 NVLink、PCIe、InfiniBand/RDMA、NCCL，以及分层 All-Reduce、Reduce-Scatter 和 All-to-All
- **推理性能模型** — 拆解 TTFT/TPOT、计算与访存瓶颈、Roofline 直觉、利用率和端到端 Profiling 证据

欢迎通过 GitHub Issues 提交章节建议和可参考的实现资料。

---

## 🚀 快速开始

```bash
git clone https://github.com/skyliulu/LLM-Infra-Explorer.git
cd LLM-Infra-Explorer
npm install
npm run dev
```

---

## 📄 开源协议

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) 协议开源。
商业使用须遵守本协议条款。任何以网络服务形式部署的修改版本，须同样开源。
