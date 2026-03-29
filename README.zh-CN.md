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
- 🖥️ **LLM 推理可视化** — 逐步动画展示 Prefill/Decode 阶段、KV Cache 生命周期，支持 MoE 与 Dense 架构切换及温度采样控制
- 🔀 **6D 并行策略探索器** — 交互式 DP / TP / PP / CP / EP / ETP 拓扑，实时查看张量切分方式与 GPU 资源映射
- ⚡ **Flash Attention 深度讲解** — 标准 Attention 与 Flash Attention 对比，SRAM/HBM IO 流量追踪，以及带因果掩码跳过机制的分块计算可视化
- 🚀 **Flash Decode** — KV Cache 跨 SM 计算单元切分、并行两步归约，直观展示突破显存墙的解码优化路径
- 🧬 **Engram（DeepSeek）** — N-gram 条件记忆检索增强 Transformer 层，附微观张量流图与硬件级异步预取时间轴
- 🌲 **Radix Cache** — SGLang 基于基数树的全局 KV Cache 共享机制，可视化惰性前缀分裂、LRU 驱逐与物理显存块复用全流程
- 🔁 **DP Attention** — 可视化展示 DP/TP 混合并行 Attention 流程、KV Cache 按行切分策略与跨卡通信权衡

---

## 🖼️ 项目预览

![Engram 演示](./media/engram.gif)

[直接打开视频](./media/engram.mp4)

![并行策略演示](./media/parallel.gif)

[直接打开视频](./media/parallel.mp4)

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
