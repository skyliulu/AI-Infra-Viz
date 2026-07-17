# 全章节交互模块设计与正确性 QA

审计日期：2026-07-15（更新至 2026-07-16）

审计范围：`LLMInference`、`ParallelStrategies`、`FlashAttention`、`FlashDecode`、`Engram`、`RadixCache`、`DpAttention`、`LinearAttention`

审计依据：`.agents/skills/develop-interactive-module/` 的交互模型、视觉语法、内容与数学、QA checklist，以及仓库根目录 `AGENTS.md`。

## 结论

**最终结果：failed。** 八章均能完成生产构建并在桌面浏览器中打开，但目前不能把整站视为已经通过“设计语言一致性 + 技术正确性”验收。

- 未发现 P0（完全不可用或构建阻塞）。
- 当前剩余 6 项 P1；Linear Attention、LLMInference 与 ParallelStrategies 的已知 P1 正确性问题已修复。ParallelStrategies 仍保留原交互结构及其 convention 缺口，不报告为整章通过。
- 除 `LinearAttention` 与 `LLMInference` 外，其余 6 章没有使用共享 KaTeX `MathFormula`；大量公式仍由普通文本、`sub/sup` 或 HTML 拼接。
- `LinearAttention` 与 `LLMInference` 已采用 skill 的完整交互范式；`ParallelStrategies` 与 `RadixCache` 的状态模型缺口最大。
- 已开始按项修复；每次修改的验证证据记录在“已修复记录”中。

## 核查方法与证据边界

- 静态检查：逐章阅读组件、状态机、i18n、公式、伪代码和动态指标来源。
- 自动检查：运行 skill 自带的 convention checker，随后运行 `npm run build`。
- 渲染检查：八章均在本地 Vite 页面完成桌面端首屏/代表性中间态检查；重点推进了 LLM、Flash Attention、Engram 与 Radix Cache 的状态。
- 关键可见证据：Radix Cache 第 7 步页面同时显示“显存告急”与 `6 / 10` 块占用；Linear Attention 与 LLMInference 在 `390×844` 下无页面级横向溢出。
- 响应式边界：本轮完成桌面全章与 Linear Attention、LLMInference 移动端实测；其余章节的平板/移动端逐状态遍历未完成，因此不报告为通过。
- Linear Attention 与 LLMInference 浏览器控制台已复核为 clean；其余章节尚未逐章抓取日志，因此不报告整站为 clean。

## 自动检查

| 章节 | Convention checker | 主要缺口 |
|---|---:|---|
| LLMInference | 8/8 | 无告警；共享 KaTeX、i18n、canonical state 均通过 |
| ParallelStrategies | 2/8 | 缺 `MathFormula`、phase/step/playback/next/togglePlay |
| FlashAttention | 7/8 | 缺 `MathFormula`；Unicode 数学告警 |
| FlashDecode | 6/8 | 缺 `MathFormula`、`handleNextStep`；缺纯快照模型 |
| Engram | 6/8 | 缺 `MathFormula`、phase；缺纯快照模型 |
| RadixCache | 4/8 | 缺 `MathFormula`、phase、next/togglePlay；硬编码 JSX 文案 |
| DpAttention | 4/8 | 缺 `MathFormula`、phase、规范 step/next；缺纯快照模型 |
| LinearAttention | 8/8 | 仅 Unicode 数学告警；KaTeX 实际渲染正常 |

```text
Convention checker: warnings / fail（LinearAttention 与 LLMInference 为 8/8）
Production build:    pass（Vite 5.4.21，1888 modules transformed）
Desktop rendering:   all 8 chapters opened successfully
Responsive rendering: LinearAttention and LLMInference verified at desktop, tablet and 390×844; remaining chapters unverified
Browser console:     LinearAttention and LLMInference clean; remaining chapters unverified
```

## 已修复记录

### 2026-07-15 — LinearAttention：可调 dᵥ 时 Softmax KV 容量计算错误

- 原问题：Decode 的 KV 元素数写成 `2n_td_k` / `2 * currentTokens * dk`，隐含假设 `d_k=d_v`；当用户选择不同的 dᵥ 时，数值、比例与共享标尺均失真。
- 修改：公式改为 `n_t(d_k+d_v)`；当前值改为 `currentTokens * (dk + dv)`；满上下文标尺改为 `contextLength * (dk + dv)`。
- 数值回归：`N=1024, d_k=32, d_v=64` 时，t1 为 Softmax `12K`、固定状态 `2.1K`、`5.9×`；t8 为 `98K`、`2.1K`、`47.3×`。
- 模式回归：朴素 Linear 与 GLA 的 Decode 对照均使用新公式；Prefill 仍显示逻辑 `N^2` 比较面。
- 工程回归：convention checker 8/8；`npm run build` 通过；桌面、`768×900`、`390×844` 均无页面级横向溢出；浏览器控制台无 warning/error。

### 2026-07-15 — LinearAttention：GLA 改为论文中的门控矩阵递推

- 原问题：GLA 复用了朴素核 Linear 的 ELU 特征映射、`z_t` 归一化状态和除法读取，因此实际是带门控的归一化核 Linear 教学变体，却无条件标成 canonical GLA。
- 修改：引入键轴门 `α_t`、值轴门 `β_t` 及逐单元门控矩阵 `G_t=α_t^Tβ_t`；状态改为 `S_t=G_t⊙S_{t-1}+k_t^Tv_t`，输出改为 `o_t=q_tS_t`；GLA 不再创建或展示 `φ(·)`、`z_t` 与归一化除法。
- 设计同步：Decode 四阶段改为投影与双轴门控、逐单元衰减、外积写入、直接读取；Prefill 改为 gate projection、chunk 内递推、跨 chunk 状态组合和并行 `qS` 读取；中英文公式、变量说明、边界与引擎伪代码同步更新。
- 指标回归：GLA 持久状态按 `d_kd_v` 计算，不再错误计入 `z`；`d_k=d_v=32` 时页面显示 1.0K 元素。
- 工程回归：convention checker 8/8；`npm run build` 通过；GLA Decode/Prefill、中英文、门控滑杆和 t1/t2 状态均完成浏览器复核；桌面、平板和 `390×844` 无横向溢出，控制台无 warning/error。

### 2026-07-16 — LLMInference：修正逐层执行顺序与暂停状态机

- 原问题：RoPE 被画成 Embedding 后的一次性全局阶段；Attention/FFN 先独立执行一次，随后 `activeModule === 4` 又把二者同时点亮并快速遍历 32 层，导致第 1 层视觉上重复执行。该层计时器也不依赖 `isPlaying`，暂停后层号仍会推进。
- 修改：Embedding 只执行一次；之后每层严格按 Attention（本层 QKV 投影、Q/K RoPE、KV Cache 写入与读取）→ FFN/MoE 推进，第 32 层完成后才进入 LM Head。所有自动推进与手动单步统一经过 `handleNextStep()`，删除独立层计时器。
- canonical state：`phase`、token `step`、`currentLayer`、`activeModule` 与 `isPlaying` 共同驱动纯 `getInferenceState()` 快照；Embedding、Attention、FFN/MoE、LM Head 四阶段始终至多一个 active，并明确区分 passed/pending。
- 内容与实现：接入共享 `MathFormula`；93 个中英文键完全对齐；可见标签、控件 aria-label 与公式同步整理；伪代码改为 scheduler metadata、逐层 cache lookup、RoPE、slot reserve/write、backend dispatch、残差与最终采样。
- 额外正确性：Top-2 示例权重归一化为和 1；完成态保留最终 `<EOS>`；温度滑杆同时处理 input/change，`T=1.8` 时最终分布由 `99%/1%` 重算为 `93%/7%`。
- 浏览器回归：基线中暂停状态从 `8/32` 自动跳到 `18/32`；修复后暂停前后均保持 `17/32`。手动单步状态依次为 `[active,pending,pending,pending]`、`[passed,active,pending,pending]`、`[passed,passed,active,pending]`，随后进入下一层 Attention。Dense 与 MoE 均完整播放到 `<EOS>` 并自动停止。
- 工程回归：convention checker 8/8 且 0 warning；`npm run build` 通过；桌面、平板、`390×844` 均无页面级横向溢出；浏览器控制台无 warning/error。

### 2026-07-16 — ParallelStrategies：在原布局内修正拓扑假设与 ETP 映射

- 原问题：页面把 `DP × PP × CP × max(TP, EP×ETP)` 写成通用卡数恒等式，并在 `ETP=1` 时根据 TP/EP 静默推导 `actual_etp`；例如 `TP=4, EP=2, ETP=1` 会把专家切片暗中显示为 `TP(Exp)=2`。
- 范围纠正：保留原有顶部六维控制卡、左侧张量/矩阵切片、右侧 GPU 卡片、悬浮优先与点击固定联动；撤销替换整章信息架构的方案。
- 修改：明确把当前页面降级为“六维正交示意”，六个维度不复用 rank，示意槽位按 `DP × PP × CP × TP × EP × ETP` 计算；文案明确该结果不是任意运行时的通用 world size 恒等式。
- ETP 回归：删除 `actual_etp` 隐式推导；Expert 权重只由用户选择的 ETP 切分，GPU 卡始终显示 ETP rank。`TP=4, EP=2, ETP=1` 时页面生成 8 个正交示意槽位，所有卡的 ETP rank 均为 0，不再出现 `TP(Exp)`。
- PP 原位增强：不新增面板，只在原紫色 stage 分段上补充层范围 tooltip；`PP=4` 时依次为 1-8、9-16、17-24、25-32。
- 工程边界：`npm run build` 通过；桌面端原布局、PP=4、TP/EP/ETP 映射及 GPU 固定联动完成浏览器复核。Convention checker 仍为原有 2/8，本次未把静态拓扑章强行改造成播放状态机。

## P1：优先修复

### 1. FlashAttention：错误宣称 O(N) IO 与“指数级扩展上下文”

- 证据：中英文文案直接写“`O(N) IO Complexity`”及“上下文长度指数级扩展”（`src/components/FlashAttention.jsx:62-63,126`）。
- 问题：FlashAttention 是 exact attention，通过 tiling 降低 HBM 与 SRAM 间的读写并实现 IO-aware/IO-optimal；它没有把 attention 的一般 IO 或计算复杂度简单变成 O(N)，也不推出上下文长度“指数级扩展”。
- 修复方向：改为“避免物化 N×N 中间矩阵、按 SRAM 容量降低 HBM accesses”，并把计算复杂度与额外显存复杂度分开说明。

### 2. FlashAttention：HBM 流量指标没有量纲基础

- 证据：标准模式使用固定 `210/610/820 MB`，Flash 模式把每步 `deltaIo: 1/2` 直接累加成 MB（`src/components/FlashAttention.jsx:159-193`）。
- 问题：两种模式没有由 N、d、dtype、tile shape 推导到共同字节尺度，当前柱状/数字比较不具定量意义。
- 修复方向：用同一个 bytes model 计算 Q/K/V/O、S/P 与重读写流量；若只表达事件数，单位改成“tile transfers”，不要标 MB。

### 3. FlashDecode：Simple 模式画布的归约公式缺少局部分母

- 证据：伪代码正确累积 `block_sum_exp[i] * exp(block_max[i]-global_max)`（`src/components/FlashDecode.jsx:233-244`），但画布显示 `O_final = Σ O_i w_i / Σ w_i`（`src/components/FlashDecode.jsx:536`）。
- 问题：Simple 模式中的 `O_i` 是未归一化分子，因此分母必须包含每块的 `l_i/block_sum_exp[i]`；画布公式与本章自己的伪代码矛盾。
- 修复方向：显示 `Σ O_i exp(m_i-m_g) / Σ l_i exp(m_i-m_g)`，或把 `O_i` 明确定义为已归一化局部输出并同步修改伪代码。

### 4. Engram：伪代码的 hash_idx 会越界

- 证据：分配 `zeros(B,L,max_n,num_heads)` 后，循环 `n=2..max_n` 并写 `hash_idx[:,:,n,k]`（`src/components/Engram.jsx:869,893`）。
- 问题：最后一次访问索引 `max_n`，超出长度为 `max_n` 的维度；展示的伪代码不可运行，也与官方 demo 的堆叠布局不一致。
- 修复方向：使用 `n-2` 索引或按 `(max_n-1)×num_heads` 展平/堆叠，并让表索引和张量 shape 一致。

### 5. RadixCache：未满容量却触发 Evict

- 证据：容量常量为 10（`src/components/RadixCache.jsx:148`）；渲染到第 7 步时页面同时显示“显存告急”和 `6 / 10` 块占用。
- 问题：可视状态仍有 40% 空闲块，LRU eviction 没有触发条件；这是演示状态机与缓存策略真值的直接冲突。
- 修复方向：增加真实会超过容量的新分配请求，或把容量调整到 6，并由 `requiredBlocks > freeBlocks` 动态决定是否进入 eviction。

### 6. DpAttention：把历史实现路径写成 MoE 的普遍必要条件

- 证据：伪代码和原理文案把重组后的 MoE 固定为“标准 TP 协同计算”（`src/components/DpAttention.jsx:79`），并以此解释必须 All-Gather。
- 问题：这可描述 SGLang v0.4/特定 TP-FFN 路径，但不是现代 MoE 的普遍约束；EP/DeepEP/all-to-all 是重要替代执行图。
- 修复方向：标题和边界明确限定到具体版本/配置，或增加 TP-FFN 与 EP-FFN 两种后半段路径。

## P2：设计语言与内容一致性

### 全局

- 6/8 章没有共享 `MathFormula`，公式靠普通字符串、Unicode、`sub/sup` 拼接；变量语义、缩放与换行在中英/移动端不稳定。
- 多章把组件名、矩阵名、Block/Rank、伪代码注释直接硬编码在 JSX，未完全经过 `t(key)`；语言切换只能翻译部分页面。
- 顶部控制条风格大体统一，但 canonical state 不统一：有的用 `activeModule`，有的用 `activeStep`，有的没有 phase，导致播放/暂停/完成语义不一致。
- 除 Linear Attention 与 LLMInference 外，多数伪代码偏“公式逐行翻译”，缺少 allocator、workspace、metadata、kernel dispatch、collective、write-back 等运行时操作。
- 多章使用绝对化词汇（“完美”“零开销”“完全掩盖”“无限上下文”）；这些应改成带硬件、shape、并发和实现条件的边界描述。

### 分章

- **LLMInference**：已完成 KaTeX、i18n、可访问控件标签、唯一 active stage 与逐层 canonical state；后续可补充 reduced-motion 偏好和屏幕阅读器 live-region。
- **ParallelStrategies**：是静态配置浏览器而非执行流水线；没有通信事件、训练 microbatch、all-reduce/all-to-all 或 prefill/decode 上下文。桌面首屏右侧 GPU 区在低卡数时留有大面积空白，教学主次失衡。
- **FlashAttention**：tile 因果跳过逻辑基本正确，但 `Br=64/Bc=96` 能否驻留 SRAM 没有按 dtype 和工作集字节证明。
- **FlashDecode**：核心“切 KV + 局部 attention + 二次归约”正确；“通常只用一个 SM”应改成示例实现，不要写成算法固有属性。
- **Engram**：英文词典中的 `play`、`next` 仍为中文（`src/components/Engram.jsx:92,94`）；“前置 Block 完全掩盖 PCIe 延迟”应改成可重叠/在条件满足时隐藏。
- **RadixCache**：`hitRate = saved/(used+saved)` 更像累计块节省比例，不是请求级 prefix hit rate；“传统 KV 必须连续分配”和“零额外开销”都需要限定。`lock_ref` 在 B 复用前缀后的数值变化也缺少对应 acquire/release 事件。
- **DpAttention**：空闲态就显示 `0%（完美分割）`，而尚未分配 KV；百分比基线不清晰。应把“全局 footprint”“单卡占用”“相对 TP 冗余倍率”拆成不同指标。
- **LinearAttention**：设计语言、KaTeX、i18n、唯一 active stage、prefill/decode 区分和 runtime pseudocode 最完整；完成态的 Next 可进一步 disabled，并补充键盘/焦点验收。

## 响应式与无障碍

- 桌面端八章均无 body 级横向溢出；但 Parallel、Engram、DpAttention 使用高密度多列小字，视觉上“能放下”不等于可读。
- Linear Attention 与 LLMInference 已在桌面、平板与 `390×844` 下复核；均无页面级横向溢出，控制条在窄屏折行后仍保持清晰阅读顺序。
- 其余章节仍需在 `768×900` 与 `390×844` 逐章检查早/中/末状态；尤其关注 `min-w-*`、固定 GPU/SM 列数、伪代码宽度和侧栏覆盖。
- 图标按钮应统一提供稳定 aria-label；当前多章依赖 `title` 或视觉图标。
- 颜色大体遵循算法身份色与 active/done/alert 色，但多个阶段同时使用同一 active 光晕，不能仅靠颜色区分“active”与“passed”。

## 技术参考

- RoFormer / RoPE: https://arxiv.org/abs/2104.09864
- Meta Llama reference implementation: https://github.com/meta-llama/llama/blob/main/llama/model.py
- FlashAttention: https://arxiv.org/abs/2205.14135
- Flash-Decoding: https://crfm.stanford.edu/2023/10/12/flashdecoding.html
- Megatron Core parallelism guide: https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html
- Megatron process groups: https://github.com/NVIDIA/Megatron-LM/blob/main/megatron/core/parallel_state.py
- DeepSeek-V3 technical report: https://arxiv.org/abs/2412.19437
- Engram paper and official demo: https://arxiv.org/abs/2601.07372 ; https://github.com/deepseek-ai/Engram/blob/main/engram_demo_v1.py
- SGLang RadixAttention: https://www.lmsys.org/blog/2024-01-17-sglang/
- SGLang v0.4 DP Attention: https://www.lmsys.org/blog/2024-12-04-sglang-v0-4/
- SGLang large-scale EP: https://www.lmsys.org/blog/2025-05-05-large-scale-ep/
- Linear Attention: https://arxiv.org/abs/2006.16236
- Gated Linear Attention: https://arxiv.org/abs/2312.06635

## 建议修复顺序

1. 继续修复其余 5 个章节的 6 项 P1 技术真值与状态机错误；不要先做视觉抛光。
2. 统一 `MathFormula`、i18n、canonical state 与动态指标单位。
3. 补全 runtime pseudocode 和技术边界说明。
4. 最后进行全章桌面/平板/移动端、中文/英文、所有模式从 idle 到 done 的回归，并把本报告中的未验证项逐一勾销。
