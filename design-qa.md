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
- PP 原位增强：在原紫色 stage 分段下加入 4 个 microbatch 的真实流水时隙；`PP=4` 时 stage 层范围依次为 1-8、9-16、17-24、25-32，理想 stage 利用率由 `M/(M+P-1)` 动态计算。
- 执行态联动：同一 `getPipelineState()` 快照驱动时间表、左侧 stage 条和右侧 GPU 卡片。浏览器单步回归中，时隙 0 仅 `PP0` 显示 `MB0`；时隙 1 同时显示 `PP0/MB1` 与 `PP1/MB0`，其余 stage 明确标为流水气泡。DP>1 时只跟踪 replica 0，其他副本标记为独立请求流。
- 推理语义：增加 Prefill/Decode 局部切换。Prefill 输入按新 token chunk 表达；Decode 输入变为 `[B,1]`，KV 变为 `[B,T_cache,H_kv]`，并明确 vLLM DCP 可沿 KV 时间轴切分且复用 TP rank。DP 网格标明是全局请求工作负载，不是假装成跨副本 collective tensor。
- DCP Rank 复用：在原映射假设条内加入“正交沙盒 / DCP 复用 TP”切换。`TP=4, CP=4` 在正交模式使用 16 张示意卡，DCP 模式只生成 4 张卡，并依次派生 `(TP,CP)=(0,0)…(3,3)`；Prefill 被禁用。本页明确采用 MLA / 单 KV Head 的高复制教学场景，并把“DCP 整除 TP”标为本页均匀分组约束，而非通用恒等式。
- 通信语义：TP 显示 QKV 列并行与 Out Projection 行并行后的 All-Reduce/Reduce-Scatter；MoE 显示 Router → All-to-All Dispatch → Expert/ETP → All-to-All Combine，并注明 TensorRT-LLM 的 `MoE-TP × MoE-EP = TP` 运行时约束示例、纯 TP 的 MoE-TP 回退，以及本页正交沙盒的差异。
- 工程证据：convention checker 8/8，保留 1 条 Unicode 数学外观 warning；`npm run build` 通过。桌面浏览器完成 PP 预热并发、Decode+CP、DCP rank 复用、TP 通信、EP+ETP 和中英文回归，页面宽度 `1280px` 时无横向溢出。平板/移动端与后续 Wide-EP、PD 分离、Helix、DWDP 尚未完成，不报告整章最终通过。

### 2026-07-17 — ParallelStrategies：MoE TP 回退、PP 归属与通信图回归

- MoE 正确性：专家并行状态改为显式派生。`EP=1, ETP=1, TP>1` 时，Expert 权重回退到 TP 切分；`EP>1, ETP=1` 时，完整 Expert 分布到 EP rank；`ETP>1` 时才按 ETP 切单个 Expert。页面不再用 `ETP` 单一变量错误决定所有专家内部切分。
- PP 参数归属：Embedding 仅驻留 PP stage 0，LM Head 仅驻留最后一个 PP stage。锁定不持有该参数的 GPU 时，矩阵仍保留位置、shape 与虚线轮廓，并显示“仅驻留 PP Stage N”；切换到持有该参数的 stage 后恢复对应 TP 分片，避免把“未驻留”画成“组件消失”。
- 图形化通信：通信边改为依附原有组件，而不是另起一排重复节点。TP 在现有 RMSNorm、QKV、Out Proj 之间绘制本地 Attention 箭头，并从 Out Proj 引出 collective；PP 在相邻 Stage 时间行之间绘制 P2P 激活边；MoE 从真实 Router 卡片向四个真实 Expert 卡片扇出。纯 TP 使用本地虚线路由，并把分片归约贴在 Expert 卡内；EP/混合模式使用双向 All-to-All Dispatch/Combine 实线。锁定 GPU 后，仅对应 EP Rank 的 Expert 与连线保持强化。
- 容量与回归：示意 GPU 上限由 16 调整为 32。新增 `npm run check:parallel`，枚举 `3^6 × 2 = 1458` 个六维并行度/映射模型候选；553 个合法拓扑、11010 张 GPU 卡通过卡数、坐标范围、rank 唯一性、DCP 复用、PP 归属与 MoE 模式不变量检查。
- 浏览器证据：真实服务中复测 `TP2` 纯 TP（Expert 按 TP 切分、本地虚线路由、每个 Expert 显示分片归约）、`TP2×EP2`（完整 Expert 分布、Router 到 Expert 的双向 All-to-All）、`TP2×PP2×EP2` 锁定 GPU3（只强化 Expert 1/3 路径），以及 32 卡渲染。桌面和 `768×1024` 完成视觉检查；`390×844` 量测为 viewport/scrollWidth `390/390`，四个 Expert 卡均满足 `clientWidth=scrollWidth=64`，没有页面级或组件级横向溢出。中英文通信标签均未压住 Expert 卡，控制台无 warning/error。
- 工程证据：模块 convention checker 为 8/8，保留 1 条 Unicode 数学外观 warning；组合回归为 553/1458 个合法拓扑、11010 张 GPU 卡通过；`git diff --check` 通过；`npm run build` 通过（Vite 5.4.21，1889 modules transformed）。

### 2026-07-17 — ParallelStrategies 剩余推理并行模式设计简报

- 教学问题：相同 GPU mesh 为什么会在不同模型组件、Prefill/Decode 阶段和 MoE 传输方案中采用不同的并行组，而不能继续把所有方案当作互相独立相乘的“第七、第八维”？
- 技术轴拆分：Wide-EP 是组件级执行模板（Attention/稠密层与 Sparse FFN 使用不同并行组）；P/D 分离是服务池拓扑（独立 Prefill/Decode 实例与 KV 传输）；Helix 是 Decode 内的 rank 复用（Attention 做 KV 并行，FFN 做 TP 或 TP×EP）；DWDP 是 MoE 数据移动方向变化（DP 执行器按需异步拉取远端 Expert 权重，而不是对 Token 做同步 collective）。
- 第一批范围：先在现有顶部 degree、左侧模型切片、右侧 GPU 卡片结构内加入 Wide-EP 与对称 1:1 P/D 教学池；不增加新的乘法 degree。Wide-EP 让 Attention/稠密组件与 Expert 卡可见地使用不同 rank 角色；P/D 模式把相同并行模板复制到两个独立池，并显示 KV 从 Prefill 池传到 Decode 池。
- 后续范围：Helix 将沿用同一组 GPU 卡，在 Attention 与 FFN 区域切换 rank 解释；DWDP 将保留 DP 执行器和 Expert 所有权，改画远端权重预取方向及无 layer-wise collective 的边界。两者在第一批完成并回归后继续推进。
- 权威边界：Wide-EP/P-D 第一批以 SGLang 公开的大规模 EP 部署为依据；P/D 卡数采用对称 1:1 教学简化，并明确真实部署可使用不同 P:D 容量比和不同并行配置。

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

### 2026-07-17 — ParallelStrategies：Wide-EP、P/D、Helix 与 DWDP 收尾 QA

- 结构边界：保留上方六维 degree 控制、左侧模型/矩阵主画布、右侧 GPU 实例卡与锁卡联动。Wide-EP、Helix 作为组件执行模板，P/D 作为服务拓扑，DWDP 作为 MoE 组件内的数据移动方式；均未新增伪造的乘法并行维度。
- Wide-EP / P-D：Wide-EP 将 Attention/KV 的请求副本解释为 `DP×EP`，Sparse FFN 仍用 EP/ETP；P/D 复制为独立 Prefill/Decode 池，并在原画布内显示 KV Cache RDMA/NIXL 传输。真实页面验证 2 卡 Wide-EP、4 卡对称 P/D、Decode `[B,1]` 及池间切换。
- Helix：选择后进入 Decode-only、固定 CP=1/ETP=1，并把 EP 旋钮解释为 KVP 宽度。`TP2×KVP2` 生成 4 卡；每卡同时显示 Attention 的 `KVP×TP` 与 FFN 的 `EP×TP` 角色。画布验证 `KV Shard Attention → Partial O+LSE → All-to-All → exact Attention → Out Proj`，以及同 rank 池切换到 `TP×EP FFN`；GPU3 锁卡后 KVP1/TP1 与 EP1/TP1 联动正确。
- DWDP：作为 MoE 区域内的 Token All-to-All / 权重拉取切换。选中后配置到 P/D Context、TP=1、ETP=1、EP≥2；Router 与 Expert 保持原位置，通信改画为 `Peer Expert 权重所有者 → cudaMemcpyAsync P2P → Ping/Pong Prefetch Buffer → 本地 DP Executor`。锁定 Rank/Owner0 时 Expert0/2 标为本地驻留、Expert1/3 标为 Peer 预取；切到 Decode 池会自动退回 Token All-to-All，避免把当前产品化边界误画成通用 Decode 路径。
- 正确性边界：DWDP 文案明确限定当前 TensorRT-LLM 原型的 P/D Context Worker、组内 TP=1、CuteDSL+NVFP4 与 MNNVL/GB200 条件；不把论文中的收益写成普遍保证。Helix 明确为长 KV Decode 的 KVP/TP 与 FFN rank 复用，不额外增加卡数乘法项。
- 响应式证据：桌面 `1440×900`、移动端 `390×844` 完成中英文渲染；Helix 与 DWDP 均无页面级横向溢出。DWDP 移动端通信路径 `clientWidth=scrollWidth=259`，四个 Expert 卡均为 `clientWidth=scrollWidth=60`。
- 工程回归：`npm run check:parallel` 枚举 2916 个候选，721 个合法拓扑与 14884 张 GPU 卡通过；新增 Helix rank 复用与 DWDP 强制配置/Expert residency 不变量。模块 convention checker 8/8，通过且保留 1 条 Unicode 数学外观 warning；`git diff --check` 通过；`npm run build` 通过（Vite 5.4.21，1889 modules transformed）。

### 2026-07-18 — ParallelStrategies：DP Attention 显式化与附加控件归组

- DP Attention 不再只以 Wide-EP 隐含表达：组件模板改为 `DP Attention + Wide-EP`，Attention 组件直接显示 `DP Attention: DP×EP × TP`，右侧 GPU 卡显示独立 `DP ATTN Rank` 与 `MoE EP` 角色。该边界对应 SGLang 的组件级 DP Attention：不同 DP worker 独立处理请求/KV，再在 Sparse FFN 阶段使用 EP 通信。
- 将组件模板、服务拓扑与 Runtime 设计（Token All-to-All / DWDP）放入同一控制卡；MoE 画布只保留当前 Runtime badge 与真实通信路径，不再重复一套按钮。
- 真实页面验证：选择模板后 EP 自动扩到 2，生成 2 张 GPU 卡，Attention 标签为 `DP Attention: DP×EP(2) × TP(1)`，两卡分别显示 `DP ATTN Rank 0/1` 与 `MoE EP 0/1`。
- 响应式验证：桌面 `1280px` 与移动端 `390×844` 的中英文控制卡均无横向溢出；移动端三个组名保留可见，控制卡 `clientWidth=scrollWidth=341`，页面 `innerWidth/scrollWidth=390/375`。

### 2026-07-18 — ParallelStrategies：解除 DP Attention / EP 绑定并统一 Rank 控件

- 纠正上一版把 `DP Attention + Wide-EP` 合成单一模板的过窄建模。DP Attention 现在是独立 Attention Runtime，可与 DP、TP、CP、EP 分别组合；开启它不增加新的 GPU 乘法项。Wide-EP 恢复为特定 Rank 复用模板：只有选择该模板时，EP Rank 才额外充当更宽的 DP Attention worker。
- 组合证据：`DP2 + DP Attention + TP2 + EP1` 为 4 卡，Attention 标为 `DP(2)×TP(2) · EP 独立`；把 EP 单独改为 2 后为 8 卡，但同一 DP/TP 坐标上的 DP Attention 角色不变，只增加 `MoE EP 0/1` 所有权。选择 Wide-EP 后才显示 `DP×EP(4)×TP(2)` 的特定复用关系。
- CP/SP 边界：按 Megatron 语义，CP 切分网络输入和全部激活的序列维，Attention 需要跨 CP Rank 交换 KV；SP 主要在 TP 组内切分 LayerNorm/Dropout 等激活，不能替代长上下文 Attention/KV 切分。该说明已附在 CP 画布事实卡内。
- 控件顺序：Rank 映射、组件模板、Attention Runtime、服务拓扑、Runtime 设计全部归入统一选项卡；选项卡排在映射假设说明上方。Rank 映射不再单独嵌在说明行中。
- 响应式证据：桌面 `1280×900` 与移动端 `390×844` 的中英文均无横向溢出；统一选项卡和映射假设卡在移动端均为 `clientWidth=scrollWidth=341`，页面 `innerWidth/scrollWidth=390/375`。

### 2026-07-18 — ParallelStrategies：澄清 DP2×TP2 卡数与中宽度挤压

- 卡数语义：顶部 DP 明确改为“外层模型/模型分片组副本”，TP 是每个副本内的层切分。因此 `DP1+TP2+DP Attention` 为 2 卡；`DP2+TP2+DP Attention` 为两套 TP2，共 4 卡。DP Attention 只改变现有 TP Rank 在 Attention 中的执行角色，不额外增加卡数或并行度乘法项。
- 组件/GPU 证据：`DP1+TP2` 显示“1 个外层副本，每个复用 TP(2) Rank”，两张 GPU 卡分别为 `副本 DP0 · Attn Worker TP0/1`；切到 DP2 后显示两个外层副本并生成四张卡，角色为两个独立的 TP0/1 组。
- 响应式修复：统一选项区改为纵向结构，所有按钮组占第一块可换行区域，解释文案固定在下方全宽行，不再与组件模板、Attention Runtime 等按钮争抢横向空间。
- 中宽度回归：`1100px`、`900px`、`768px` 下按钮组与说明均无重叠，三者 `panel clientWidth=scrollWidth`，页面无横向溢出；说明行的 `top` 始终大于按钮组 `bottom`。`900px` 视觉检查中控件自然分成三行，右侧不再预留挤压空间。

### 2026-07-18 — ParallelStrategies：DP Attention 执行差异、Attention 类型与主次布局

- 可观察执行差异：标准 TP Attention 显示“同一请求的 Head/权重切分”；以 `TP2 + MLA` 为例，明确显示同一请求的压缩 KV 在两个 TP Rank 上复制。切换 DP Attention 后，同一位置改为 TP0/TP1 两条独立请求 Worker lane，每条 lane 在 Prefill 写入私有 KV、在 Decode 读取私有 KV，并显示 Attention 输出进入 MoE 前的 All-Gather 与 MoE 后重分发。
- KV 所有权同步：DP Attention 同时驱动 Input Token 请求网格、Q/KV 投影、Out Projection、Worker lane 和 KV Cache。KV Cache 的轴从标准模式的 `DP 请求 × CP Token × TP KV Head` 改为 `外层 DP × TP Attention Worker × CP Token`；Worker 之间不复制同一请求 KV。
- Attention 类型：增加 MHA/GQA/MLA 局部控件。MHA 显示 Q16/KV16 与按 Head TP 切分；GQA 显示 Q16/KV4，并注明 TP 超过 KV Head 数后的共享 KV 复制；MLA 显示 Q16/C_KV4 与压缩潜变量缓存。文案明确 DP Attention 最初针对 DeepSeek MLA，MHA/GQA 仅用于比较布局，实际支持取决于模型和后端。
- 信息层级：桌面主画布/实例映射从 `5/7` 调整为 `7/5`，超宽屏为 `8/4`；GPU 映射保持两列紧凑卡片，并减少装饰性空槽。`1280px` 实测主画布/映射宽度为 `591/286`，`1100px` 为 `449/316`；`900px` 自动上下堆叠为 `613/613`，三种宽度均无页面级横向溢出。
- 真实交互证据：浏览器验证标准 MLA TP2 为 `KV 复制 ×2`；DP Attention TP2 生成 2 个 Worker，Prefill/Decode 文案随阶段切换；MHA、GQA、MLA 三种结构摘要均随按钮更新。控制台无 error/warn。
- 工程回归：`npm run check:parallel` 通过（721/2916 合法拓扑、14884 GPU 卡）；新增 MLA 标准 TP 复制、DP Attention 私有 KV/All-Gather、GQA KV Head 切分断言。模块 convention checker 8/8 通过，保留既有 Unicode 数学外观 warning；Vite 5.4.21 生产构建通过（1889 modules transformed）。

### 2026-07-18 — ParallelStrategies：GPU 卡片高密度压缩

- 保留 GPU 卡的六个并行坐标和锁定联动，不改变右侧选择语义；卡片内边距、标题、Rank 数字与分片轨道均改为紧凑尺寸，长标签宽度从 48px 压至 20px，锁定态取消放大以避免侵占相邻卡片。
- DP Attention、Wide-EP、Helix 等双角色由横向两列改为纵向短行，避免三卡并排时每个角色只剩极窄文字列；P/D 池标签在卡片标题中缩写为 P/D，并保留完整 title。
- 删除 GPU 网格下方不承载额外信息的两张大号“可用槽位”占位卡，改成一行轻量容量提示，让多卡状态把空间集中用于真实 GPU 卡。
- 宽屏 `1920px`、`TP4 + DP Attention` 下，每卡宽 145px，一行稳定容纳 3 卡；4 卡为 `3+1`，8 卡为 `3+3+2`。8 卡全部 `clientWidth=scrollWidth`，六条 Rank 轨道均无内部溢出。
- `1280px` 下 8 卡保持双列，每卡 126px；`390×844` 下双列每卡 155px，页面、GPU 网格、卡片和 Rank 轨道均无横向溢出。锁定 GPU7 后仍正确显示 `DP1/TP3`、`Attn Worker TP3` 与 `MoE EP0`，控制台无 error/warn。
- 回归：并行拓扑检查通过（721/2916 合法拓扑、14884 GPU 卡）；模块 convention checker 8/8 通过，保留既有 Unicode 数学外观 warning；Vite 5.4.21 生产构建通过（1889 modules transformed）。

### 2026-07-18 — ParallelStrategies：去除 GPU 重复角色与强化 MHA/GQA/MLA 视觉差异

- GPU 卡不再在六个已有坐标下重复输出“副本 DP / TP / MoE EP”标签。普通卡只保留坐标；DP Attention 开启时仅增加一条 `DP Attention · Wn` 短条。Wide-EP 也只保留 Attention Worker，Helix 合并为一条 KVP↔FFN 复用提示。
- GPU 网格改为 `auto-fit + minmax(96px, 1fr)`。`1920px + TP4` 下四张卡单行排布，每卡 107px；`390×844` 下每卡 100px，排布为 `3+1`。宽屏和移动端的网格、卡片、Rank 轨道与页面均无横向溢出。
- Attention 投影不再复用同一个矩形：MHA 显示等宽 `W_Q/W_K/W_V`；GQA 显示 4:1:1 的宽 Q 与共享 K/V；MLA 显示 4:1:2 的 Q、`W_DKV` 压缩与 `W_UK/W_UV` 恢复路径。标准 TP 与 DP Attention 分别显示投影分片和 Worker 本地权重副本。
- KV Cache 增加统一标尺的单 Token 相对容量，并同步改变主体几何：MHA 为 32 单位、`176×48`；GQA 为 8 单位、`112×32`；MLA 为 4 单位、`64×24`。在 DP Attention 下三者仍保持各自权重/KV 结构，但 KV 所有权切为 Worker 私有。
- 真实页面验证 `TP4 + DP Attention`：MHA 三段等宽投影与 32 单位 KV；GQA 投影宽度约 `162/40/40` 与 8 单位 KV；MLA 投影宽度约 `139/35/69` 与 4 单位 KV。中英文均无投影、卡片、网格或页面溢出，控制台无 error/warn。
- 回归：并行拓扑检查加入 MHA/GQA/MLA KV 相对容量断言并通过（721/2916 合法拓扑、14884 GPU 卡）；模块 convention checker 8/8 通过；Vite 生产构建通过（1889 modules transformed）。
