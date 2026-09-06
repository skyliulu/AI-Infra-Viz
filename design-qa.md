# 全章节交互模块设计与正确性 QA

审计日期：2026-07-15（更新至 2026-07-18）

审计范围：`LLMInference`、`ParallelStrategies`、`FlashAttention`、`FlashDecode`、`Engram`、`RadixCache`、`DpAttention`、`LinearAttention`

审计依据：`.agents/skills/develop-interactive-module/` 的交互模型、视觉语法、内容与数学、QA checklist，以及仓库根目录 `AGENTS.md`。

### 2026-07-18 — LinearAttention 语言控件与跨章节控制契约

- 变更分类：局部一致性修复。Linear Attention 的双选分段语言控件改为仓库通用的单按钮切换，不改变语言状态来源、算法状态、时间轴进度或标题栏区域顺序。
- 语言语义：中文界面按钮显示目标语言 `EN`，英文界面显示目标语言 `中文`；按钮带 Globe 图标、36px 高度、明确的 `aria-label` 与 `title`。真实点击验证标题、正文和时间轴动作标签同步切换，语言变化不重置算法状态。
- 响应式证据：1265px CSS 页面宽度下语言按钮位于时间轴组左侧且尺寸为约 65×36px，页面 `scrollWidth=clientWidth=1265`；390×844 英文视口下按钮为 72×36px，后接三枚 36×36px 时间轴按钮，页面 `scrollWidth=clientWidth=375`。
- Skill 影响：`develop-interactive-module` 新增通用顶层控件契约，要求修改前盘点相邻模块的顺序、分组、形态、标签语义、末端位置与响应式断点；优先复用共享控件或最小既有模式。QA checklist 同步增加语言目标语义、时间轴末端位置及跨章节控件一致性检查，不写入 Linear Attention 专属实现。
- 回归：模块 convention checker 9/9 通过，保留本次修改前已有的 Unicode 数学外观提示；Vite 5.4.21 生产构建通过（1894 modules transformed）；中英文桌面与窄屏真实页面均无控制台 warning/error。

### 2026-07-18 — LinearAttention 顶层控件右对齐

- 变更分类：局部布局修复。仅调整标题栏的响应式断点和顶层控件顺序；算法选择、语言切换、时间轴按钮、状态机、主画布及下层阅读顺序均保持不变。
- 一致性修复：标题与控件从 `2xl` 才并排改为仓库常用的 `xl` 并排；语言切换移到时间轴控制之前，使重置、播放/暂停和下一步稳定成为最右侧控件。
- 桌面证据：在 1265px CSS 页面宽度下，时间轴按钮从第二行的 `x=530/570/610, y=114` 移到标题同一行右端的 `x=1107/1147/1187, y=47`；语言切换位于其左侧，页面 `scrollWidth=clientWidth=1265`。
- 窄屏证据：390×844 视口下继续按原顺序自然换行，语言按钮位于 `x=56–134`，时间轴按钮位于其右侧 `x=152–268`；页面 `scrollWidth=clientWidth=375`，无横向溢出。中英文均完成真实页面复核，控制台无 warning/error。

### 2026-07-18 — 全仓时间轴控件统一为纯图标

- 变更分类：跨章节的一致性修复。保留各章节原有标题、模式选择、主画布布局、时间轴状态机和主题色，仅统一全局时间轴的重置、播放/暂停/重播、下一步三个控制按钮；`ParallelStrategies` 的局部 PP 步进控件原本已是纯图标，未重复改造。
- 视觉契约：`LLMInference`、`FlashAttention`、`FlashDecode`、`Engram`、`RadixCache`、`DpAttention`、`LinearAttention` 的时间轴按钮统一为 36×36px，图标为 18px，不再显示重复文字，以降低顶部控制区宽度压力。播放状态仍沿用各章节原有强调色，禁用态保留透明度与光标反馈。
- 可访问性：纯图标不依赖视觉猜测；每个按钮均保留或补充 `type="button"`、随状态变化的 `aria-label` 与 `title`。播放按钮在播放、暂停和完成后重播三种状态间同步更新语义；下一步完成后仍按原状态机禁用。
- 浏览器证据：逐页检查上述 7 个全局时间轴章节，每页均恰好得到 3 个控制按钮，按钮 `textContent` 为空、尺寸均为 36×36px，且 `aria-label`/`title` 非空。`FlashDecode` 在 390×844 移动端视口下三个按钮仍完整可见，页面无横向溢出；`DpAttention` 实测播放后标签由“播放”切换为“暂停”，下一步按既有规则禁用。控制台无 warning/error。
- 工程回归：Vite 5.4.21 生产构建通过（1894 modules transformed）；`check:dpa`、`check:flash`、`check:flashdecode`、`check:engram`、`check:radix`、`check:parallel` 全部通过。8 个时间轴模块均通过 convention checker；`LinearAttention` 与 `ParallelStrategies` 仅保留本次变更前已有的 Unicode 数学外观提示，与控制按钮改动无关。

## 结论

**最终结果：failed。** 八章均能完成生产构建并在桌面浏览器中打开，但目前不能把整站视为已经通过“设计语言一致性 + 技术正确性”验收。

- 未发现 P0（完全不可用或构建阻塞）。
- 当前剩余 2 项 P1；Linear Attention、LLMInference、ParallelStrategies、FlashAttention、FlashDecode 与 Engram 的已知 P1 正确性问题已修复。ParallelStrategies 仍保留原交互结构及其 convention 缺口，不报告为整章通过。
- `LinearAttention`、`LLMInference`、`FlashAttention`、`FlashDecode` 与 `Engram` 已使用共享 KaTeX `MathFormula`；其余 3 章仍有普通文本、`sub/sup` 或 HTML 拼接的公式。
- `LinearAttention` 与 `LLMInference` 已采用 skill 的完整交互范式；`ParallelStrategies` 与 `RadixCache` 的状态模型缺口最大。
- 已开始按项修复；每次修改的验证证据记录在“已修复记录”中。

## 核查方法与证据边界

- 静态检查：逐章阅读组件、状态机、i18n、公式、伪代码和动态指标来源。
- 自动检查：运行 skill 自带的 convention checker，随后运行 `npm run build`。
- 渲染检查：八章均在本地 Vite 页面完成桌面端首屏/代表性中间态检查；重点推进了 LLM、Flash Attention、Engram 与 Radix Cache 的状态。
- 关键可见证据：Radix Cache 第 7 步页面同时显示“显存告急”与 `6 / 10` 块占用；Linear Attention、LLMInference 与 FlashAttention 在 `390×844` 下无页面级横向溢出。
- 响应式边界：本轮完成桌面全章与 Linear Attention、LLMInference、FlashAttention、FlashDecode、Engram 移动端实测；其余章节的平板/移动端逐状态遍历未完成，因此不报告为通过。
- Linear Attention、LLMInference、FlashAttention、FlashDecode 与 Engram 浏览器控制台已复核为 clean；其余章节尚未逐章抓取日志，因此不报告整站为 clean。

## 自动检查

| 章节 | Convention checker | 主要缺口 |
|---|---:|---|
| LLMInference | 8/8 | 无告警；共享 KaTeX、i18n、canonical state 均通过 |
| ParallelStrategies | 2/8 | 缺 `MathFormula`、phase/step/playback/next/togglePlay |
| FlashAttention | 9/9 | 无告警；共享 KaTeX、版本化 canonical model、timeline 与资源指标均通过 |
| FlashDecode | 9/9 | 已接入 `MathFormula`、canonical snapshot、完整播放状态机与资源模型；0 warning |
| Engram | 9/9 | 共享 KaTeX、canonical snapshot、推理/训练系统模式与完整播放状态机均通过；0 warning |
| RadixCache | 4/8 | 缺 `MathFormula`、phase、next/togglePlay；硬编码 JSX 文案 |
| DpAttention | 4/8 | 缺 `MathFormula`、phase、规范 step/next；缺纯快照模型 |
| LinearAttention | 8/8 | 仅 Unicode 数学告警；KaTeX 实际渲染正常 |

```text
Convention checker: warnings / fail（LinearAttention 与 LLMInference 为 8/8）
Production build:    pass（Vite 5.4.21，1888 modules transformed）
Desktop rendering:   all 8 chapters opened successfully
Responsive rendering: LinearAttention, LLMInference and FlashAttention verified at desktop, tablet and 390×844; remaining chapters unverified
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

## 2026-07-18 — FlashAttention V1–V4 版本化流水线改造

- 变更分类：在原有 Standard/Flash 顶部控制、HBM↔片上主画布、流水线/伪代码和底部原理 inspector 的结构上做功能扩展；没有改造成另一套信息架构。
- 教学问题：V1–V4 都计算同一个精确 Attention 时，循环顺序、CTA/warp 分工、片上驻留与硬件流水线分别如何演进，性能收益为什么不能只用“减少 HBM”一条解释？
- 能力声明：`timeline`、`multiple-modes`、`resource-metrics`、`structural-comparison`、`data-movement`、`dense-layout`、`math`。

### Claim ledger

| Claim | 权威依据 | 领域模型与可见证据 | 边界 |
|---|---|---|---|
| V1 用 tiling + online softmax 避免完整 S/P 在 HBM 物化 | FlashAttention v1 论文 Algorithm 1 与 IO 分析 | `v1.outerLoop=kv`；画布显示 KV 外循环、Q/O/统计量反复读写；S/P 标为逻辑中间量 | tile shape 与寄存器/SMEM 分配是教学模型，不冒充某个编译产物 |
| V2 把前向工作沿 Q-row/序列维并行，并用 split-Q 降低 warp 通信 | FlashAttention-2 §3.1–3.3 | `v2.outerLoop=q`；CTA 调度 lane、split-Q warp slices、Q 常驻与 KV stream 同步变化 | 流量接近不代表吞吐接近；收益还来自 occupancy、非矩阵 FLOPs 和同步减少 |
| V3 在 Hopper 上通过 TMA/WGMMA/warp specialization 重叠搬运、GEMM 与 Softmax | FlashAttention-3 论文及作者技术说明 | H100 profile；TMA producer、WGMMA 与 Softmax lanes 的时间区间真实重叠 | 主画布锚定 BF16；FP8 incoherent processing 作为能力边界说明，不混入主流程 |
| V4 针对 Blackwell 的指数吞吐/SMEM 瓶颈重做前后向流水线 | FlashAttention-4 论文与作者 2026 技术说明 | B200 profile；前向 high/low Q ping-pong + correction，反向 TMEM + 2-CTA MMA + DSMEM | 画布锚定论文 B200 BF16 设计；官方 CuTeDSL 设备/shape 支持会继续变化 |
| Standard/Flash 流量必须在同一 byte model 下比较 | Q/K/V/O、S/P shape 与读写次数 | `estimateForwardResources()` 由 N、d、dtype width、causal tile count 与 tile shape 推导；共享比例尺同时显示基线和当前实现 | Standard 明确限定为未融合三-kernel 教学基线；数值不是 profiler benchmark |

### 已修复问题与交互证据

- 两项 P1 已关闭：删除“O(N) IO”和“上下文指数级扩展”错误结论；删除固定 `210/610/820 MB` 与 `deltaIo` 伪量纲，改为统一 bytes model。
- 发现并修复版本边界混淆：旧页面的 Q 外循环更接近 V2，现已把 V1 固定为 KV 外循环、V2 固定为 Q 外循环，并加入模型断言。
- 版本开关会同时改变目标硬件、片上组件、循环语义、流水 lane、engine pseudocode、bottleneck 和 inspector；不是只改颜色或文案。
- Forward/Backward 会改变 HBM 张量、资源指标和完整 stage map。Flash backward 显示 5 个分块 MMA 与 S/P 重计算；Standard backward 显示 4 个梯度 matmul 且使用保存的 S/P。
- Causal 开关会重新计算有效/跳过 tile pairs、HBM 流量与当前 mask；N/d 控件会同步改变矩阵维度、tile 数、live set 与流量。
- 公式全部通过共享 `MathFormula`/KaTeX；代码面板改为 tile scheduling、TMA/WGMMA/UMMA、barrier/cluster、TMEM/DSMEM 与 write-back 级别的 engine pseudocode。

### 回归证据

- 纯模型：`node scripts/check-flash-attention.mjs` 通过；覆盖 192 个 Standard/Flash × V1–V4 × Forward/Backward × N × d × causal 合法组合的 idle/mid/done 快照，以及 loop order、mask、bytes、pipeline overlap、V4 2-CTA/DSMEM 与 clean done-state 断言。
- 规范：convention checker 9/9，`timeline,math,multiple-modes,resource-metrics,structural-comparison,data-movement,dense-layout` 全部通过，0 warning。
- 构建：`npm run build` 通过（Vite 5.4.21，1890 modules transformed）。
- 浏览器：Standard、V1/V2/V3/V4、前后向、causal/non-causal、N=8192、d=64、中文/英文、单步、重置与自动播放完成态均通过；done 状态为 0 active / 全部 passed。
- 响应式：桌面 1265px 无页面级溢出；真实 768×900 与 390×844 iframe viewport 中 `documentElement/body scrollWidth == clientWidth`，主区域交互控件/标题均无越界；流水线仅在确有需要的窄宽下保留局部横向滚动。
- 运行时：浏览器日志无 error/warn；只存在 Vite connect/hot-update debug 与 React DevTools info。

## P1：优先修复

### 1. FlashAttention：错误宣称 O(N) IO 与“指数级扩展上下文” — 已修复（2026-07-18）

- 证据：中英文文案直接写“`O(N) IO Complexity`”及“上下文长度指数级扩展”（`src/components/FlashAttention.jsx:62-63,126`）。
- 问题：FlashAttention 是 exact attention，通过 tiling 降低 HBM 与 SRAM 间的读写并实现 IO-aware/IO-optimal；它没有把 attention 的一般 IO 或计算复杂度简单变成 O(N)，也不推出上下文长度“指数级扩展”。
- 修复结果：页面只宣称避免完整二次方 S/P 中间量的 HBM 物化、降低算法级 HBM traffic，并明确仍是 exact attention；不再推导计算复杂度变为 O(N) 或上下文指数扩展。

### 2. FlashAttention：HBM 流量指标没有量纲基础 — 已修复（2026-07-18）

- 证据：标准模式使用固定 `210/610/820 MB`，Flash 模式把每步 `deltaIo: 1/2` 直接累加成 MB（`src/components/FlashAttention.jsx:159-193`）。
- 问题：两种模式没有由 N、d、dtype、tile shape 推导到共同字节尺度，当前柱状/数字比较不具定量意义。
- 修复结果：`estimateForwardResources()` 用同一套 N、d、2-byte input、FP32 S/P baseline、tile shape 与 causal active-pair 规则推导两种实现的 bytes；页面把假设和非-profiler 边界直接显示在共享流量尺下。

### 3. FlashDecode：Simple 模式画布的归约公式缺少局部分母

- 证据：伪代码正确累积 `block_sum_exp[i] * exp(block_max[i]-global_max)`（`src/components/FlashDecode.jsx:233-244`），但画布显示 `O_final = Σ O_i w_i / Σ w_i`（`src/components/FlashDecode.jsx:536`）。
- 问题：Simple 模式中的 `O_i` 是未归一化分子，因此分母必须包含每块的 `l_i/block_sum_exp[i]`；画布公式与本章自己的伪代码矛盾。
- 修复方向：显示 `Σ O_i exp(m_i-m_g) / Σ l_i exp(m_i-m_g)`，或把 `O_i` 明确定义为已归一化局部输出并同步修改伪代码。

### 4. Engram：伪代码的 hash_idx 会越界 — 已修复（2026-07-18）

- 证据：分配 `zeros(B,L,max_n,num_heads)` 后，循环 `n=2..max_n` 并写 `hash_idx[:,:,n,k]`（`src/components/Engram.jsx:869,893`）。
- 问题：最后一次访问索引 `max_n`，超出长度为 `max_n` 的维度；展示的伪代码不可运行，也与官方 demo 的堆叠布局不一致。
- 修复结果：`hash_idx` 改为 `[B,L,max_n-1,num_heads]`，所有写入与查询统一使用 `ngram_idx=n-2`；独立模型回归覆盖官方 Demo 的 `max_n=3`、8 heads 和第 1/15 层配置。

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
- **FlashAttention**：已改为 V1–V4 canonical model、共享 KaTeX、算法级 bytes/live-set 推导和版本化前后向流水线；不再宣称固定 tile “完美驻留”。仍刻意不提供脱离具体 GPU/shape/kernel 的通用 TFLOPS benchmark。
- **FlashDecode**：核心“切 KV + 局部 attention + 二次归约”正确；“通常只用一个 SM”应改成示例实现，不要写成算法固有属性。
- **Engram**：英文控件、canonical phase/step、共享 KaTeX 与条件性 latency hiding 边界已修复；训练态额外显示 GPU 表分片、All-to-All 活跃行获取与反向梯度分发，不把推理 CPU offload 路径冒充通用实现。
- **RadixCache**：`hitRate = saved/(used+saved)` 更像累计块节省比例，不是请求级 prefix hit rate；“传统 KV 必须连续分配”和“零额外开销”都需要限定。`lock_ref` 在 B 复用前缀后的数值变化也缺少对应 acquire/release 事件。
- **DpAttention**：空闲态就显示 `0%（完美分割）`，而尚未分配 KV；百分比基线不清晰。应把“全局 footprint”“单卡占用”“相对 TP 冗余倍率”拆成不同指标。
- **LinearAttention**：设计语言、KaTeX、i18n、唯一 active stage、prefill/decode 区分和 runtime pseudocode 最完整；完成态的 Next 可进一步 disabled，并补充键盘/焦点验收。

## 响应式与无障碍

- 桌面端八章均无 body 级横向溢出；但 Parallel、Engram、DpAttention 使用高密度多列小字，视觉上“能放下”不等于可读。
- Linear Attention 与 LLMInference 已在桌面、平板与 `390×844` 下复核；均无页面级横向溢出，控制条在窄屏折行后仍保持清晰阅读顺序。
- FlashAttention、FlashDecode 与 Engram 也已在 `768×900` 与 `390×844` 检查早/中/末状态；其余章节仍需逐章检查，尤其关注固定 GPU/SM 列数、伪代码宽度和侧栏覆盖。
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

### 2026-07-18 — FlashAttention：恢复标准 Softmax 与 HBM 中间量生命周期

- 变更分类：针对标准模式可观察性回退的局部修复；保留 Standard/Flash 顶部模式、HBM↔片上主画布、流水线、伪代码和 inspector 的既有信息架构。
- Softmax 证据：标准前向明确显示 `Score GEMM → row-wise Softmax → Output GEMM` 三个 kernel。Softmax 卡复用主画布中的 HBM `S/P` 对象，逐行展示 logits、稳定化最大值、指数归一化和概率行；不是新增一张与主对象脱节的说明图。
- HBM 生命周期：纯模型新增 `S/P/O` 的 `pending → producing → writing → ready/reading → consumed` 状态。标准时间线分解为写 S、读 S、逐行 Softmax、写 P、读 P，HBM 矩阵通过已填充地址块、读写光晕、方向和容量显示动态生成与消费；Flash 模式继续显示 `Sᵢⱼ/Pᵢⱼ` 只在片上短暂存在且 HBM 分配为 0 B。
- 回归缺陷：浏览器初始态曾发现没有读取阶段的 `O` 因空 `readId` 被误判为“正在读取”；已修复为 `readId` 存在时才匹配，并增加空闲态 `O.status=pending`、`O.access=idle` 断言。
- 浏览器证据：逐步验证第 3 步 S 正在写入、第 4 步 S 正在读取、第 5 步 P 片上生成/逐行 Softmax、第 6 步 P 正在写入、第 7 步 P 正在读取；自动播放完成后 S/P 完整驻留、无 active timeline bar。Flash 对照仍为 0 B HBM 中间量。中英文无页面横向溢出；`390×844` 下页面 `clientWidth=scrollWidth=375`，S/P 工作区切为单列后各宽 289px。
- 工程回归：`npm run check:flash` 通过；模块 convention checker 9/9、0 warning；Vite 5.4.21 生产构建通过（1890 modules transformed）；浏览器控制台无 error/warn。

### 2026-07-18 — FlashAttention：统一标题与增强 Flash HBM / 片上工作区

- 命名与头部：模式名从“未融合标准实现 / Unfused Baseline”恢复为“标准 Softmax / Standard Softmax”；章节标题缩为 `FlashAttention`，副标题承担 V1–V4 教学范围。头部改用与 Linear Attention 相同的左侧图标块、左对齐标题/副标题和可换行全局控件，V1–V4 并入同一控制组，不再单独占据第二行。
- Flash HBM：主画布只保留一套 HBM 语义对象。Q/K/V 显示完整输入及当前读取 tile，O/LSE 显示 `pending / producing / writing / ready` 生命周期；独立的空地址网格明确显示完整 S/P 没有 HBM 分配，score/probability tile 转移到片上主对象中表达。
- 版本化片上阶段：纯模型为每个 Flash 版本和前/反向建立专属 stage map，并要求每个 pipeline operation 恰好归属一个片上阶段。V1 为 KV staging、Q/O 状态重载、score、在线更新和状态回写；V2 为 CTA ownership、KV streaming、split-Q、warp-local output update 和 O/LSE commit；V3 为 TMA producer、WGMMA score、Softmax warpgroup、WGMMA output 和提交；V4 为 high/low Q 双流水线与 correction warpgroup。反向同样覆盖重算、梯度 MMA、Softmax 梯度、TMEM/2-CTA/DSMEM 与提交。
- 浏览器证据：V1/V2/V3/V4 分别渲染 `5/5/5/3` 个不同 stage id，且每个版本仅有一套 Q/K/V/O/LSE HBM 对象和一个零二次方工作区。V3 第 4 步只激活 `v3Softmax`，O/LSE 同步为片上生成状态；标准模式仍显示逐行 Softmax 卡且 Flash stage 数为 0。
- 响应式与语言：桌面标题与副标题左边界一致，header 高 152px，页面无横向溢出。`390×844` 下 V4 三阶段和所有 HBM 卡均 `clientWidth=scrollWidth=287`，页面 `clientWidth=scrollWidth=375`；中英文的 Standard Softmax、零工作区和 V4 阶段文案均完整显示。浏览器控制台无 error/warn。

### 2026-07-18 — FlashAttention：区分完整矩阵与算法级 tile

- 变更分类：局部视觉语义修复；保留顶部控制、HBM↔片上三栏主画布、时间线与 inspector，不改变现有交互结构。
- 标准路径：Q/K/V/O 改为 6×4 连续微单元网格，同一矩阵的已驻留单元只使用一种填充样式，不再用三个大色块暗示 Flash 风格的算法级切分。画布同时注明这表示逻辑完整矩阵，底层 GEMM kernel 仍可能采用物理 tiling，避免把教学抽象泛化为实现断言。
- Flash 路径：Q/K/V/O/LSE 的 HBM 对象显示四个带 `t0–t3` 编号的代表性 tile；颜色由 tile 身份决定而非张量身份。片上 `Q_i/K_j/V_j` 直接读取 canonical snapshot 的 q/kv tile 索引，使用相同颜色、编号和发光边框，因此可以从 HBM 位置追踪到当前片上副本。K 与 V 始终共享同一个 kv tile 索引。
- 模型回归：`displayTiles` 由代表性 tile 坐标纯派生，并断言 idle/active 状态、索引范围及 q/kv 映射；全量合法配置检查通过。
- 浏览器证据：标准 Q/K/V 各有 24 个微单元、每个矩阵的 filled class 只有 1 种、内部 `data-tile-index=0`；Flash V1–V4 第 3 步均满足 HBM/片上 `Q=[0,0]`、`K=[2,2]`、`V=[2,2]`。V3 第 4 步激活 `v3Softmax`，HBM/片上 `Q=[1,1]`、`KV=[0,0]`，页面无 Vite error overlay 和横向溢出。中文与英文图例均完成渲染，密集对象没有内部溢出。
- 工程回归：`npm run check:flash` 通过；模块 convention checker 9/9、0 warning；中英文 i18n 253 个键一致；`git diff --check` 通过；Vite 5.4.21 生产构建通过（1890 modules transformed）。

### 2026-07-18 — FlashAttention：补齐反向 tile 语义并压缩片上区域

- 修复遗漏：上一轮 tile 身份编码只覆盖前向。反向现在由 canonical `backwardHbm` 快照驱动输入读取、梯度生成与写回；V1–V4 不再落回旧的三段色块。
- Flash 反向：HBM 显式显示 `Q/K/V/O/dO/LSE` 与 `dQ/dK/dV` 九个对象。Q 行相关张量和 dQ 使用 q tile，K/V/dK/dV 使用 kv tile；片上顶部同步显示 Q 行保存量、KV 输入以及带双 tile 身份的梯度组。S/P 仍只在片上重算，HBM 分配为 0 B。
- 标准反向：Q/K/V/O/dO 与 dQ/dK/dV 使用完整矩阵的统一编码；S/P 作为前向保存的二次方中间量继续驻留 HBM，不再错误显示“无完整二次方工作区”。反向循环文案也改为各版本真实的重算、CTA 所有权、warp specialization 或 2-CTA/TMEM 组织。
- 模型回归：全量合法状态断言 backward HBM 必须存在，dQ/dK/dV 在 done 状态完整驻留，且只有标准反向具有二次方 HBM 工作区。`npm run check:flash` 通过。
- 浏览器证据：Flash V1–V4 反向均渲染 9 个 HBM 张量，第 4 步均满足 HBM/片上 `q=[1,1]`、`kv=[0,0]`。V3 梯度阶段进一步验证 `dQ=[1,1]`、`dK/dV=[0,0]`；标准反向显示 Q/K/V/dO 与 dQ/dK/dV 七个完整矩阵及独立 S/P HBM 卡，完整矩阵内部没有 tile 边界。P 在加载保存量时被读取，S 保持驻留但不被误标为 backward 依赖。
- 比例修复：片上 tile 卡、stage 卡、公式、资源标签、循环说明与最终公式均做纵向压缩；五阶段在桌面改为三列两行。`1280px` 下 Flash 前向 HBM/片上内容高度为 `513/476px`，V4 反向为 `553/556px`；stage 卡、密集 HBM 卡和页面均无横向溢出。中英文均完成验证，无 Vite error overlay。
- 工程回归：模块 convention checker 9/9、0 warning；中英文 i18n 266 个键一致；`git diff --check` 与 Vite 生产构建通过（1890 modules transformed）。

### 2026-07-18 — FlashAttention：补齐标准 Softmax 前反向片上画布

- 修复遗漏：上一轮主要压缩了 Flash 路径，标准 Softmax 仍保留旧的纵向前向卡和反向资源条。本轮不改信息架构，只将同一批矩阵语义、真实阶段和比例要求落实到标准模式。
- 标准前向：Score GEMM、row-wise Softmax、Output GEMM 在桌面恢复为同一行的真实执行顺序；卡片、公式、矩阵格和间距采用紧凑尺寸。Softmax 阶段仍显示 S 行、稳定化 max/exp/sum/normalize 与 P 行，横向细节可滚动但隐藏装饰性滚动条。
- 标准反向：资源条替换为四个 canonical stage：加载 P/Q/K/V/dO、计算 dV/dP、逐行 Softmax backward、计算 dQ/dK 并写回 HBM。每个阶段由真实 pipeline operation 激活，不与 Flash 的 tile 流程混用。
- HBM 正确性：标准 backward 细分输入读取与梯度生命周期。dV 只在 `dv` 生成，dQ 只在 `dq` 生成，dK 只在 `dk` 生成；之前已生成但尚未写回的梯度显示 buffered，`writeGrads` 时三者统一显示 writing。P 在所需 kernel 中读取，S 保持驻留但不作为 backward 依赖。
- 浏览器证据：标准前向第 5 步仅激活 `softmax`，三阶段为单行 `97/180/97px`，HBM/片上内容高度为 `475/396px`。标准反向 `dv` 阶段显示 `dV=producing`、`dQ/dK=pending`；`dq` 阶段显示 `dQ=producing`、`dV=buffered`、K 正在读取；最终写回时 dQ/dK/dV 均为 writing。中英文卡片与页面无横向溢出，无 Vite error overlay。
- 工程回归：新增标准 backward 独立梯度状态断言；`npm run check:flash`、模块 convention checker、i18n 对称检查、`git diff --check` 与生产构建均通过。

### 2026-07-18 — FlashDecode：恢复原版布局并局部修正 Split-K 语义

- 范围纠正：上一版把修复任务扩大成未经授权的结构性重构，替换了挑战区、主画布、控制结构和底部 inspector；该方案已撤销。本版严格恢复原有“顶部控制栏 → 单一挑战横幅 → 左 7 / 右 5 数据流与伪代码 → 底部逐步解析”信息架构、区域顺序、相对比例与交互路径。
- 局部修改面：保留原有 6 个代表性 KV 分块、两批工作调度、HBM Workspace、两种顶部模式、六步单步/播放和逐步说明。只在原执行区域内把四张固定 `SM` 卡改为代表性 `CTA` 卡，并在同一区域底部增加一条独立归约 Kernel；没有增加新的页面级区域、指标带、阶段轨或配置面板。
- 执行正确性：逻辑 Split 明确为 KV view/metadata，不表示 HBM 数据复制；CTA 到物理 SM 的映射由运行时决定。第二个归约 Kernel 不再被画成固定 `SM3`，所有 Kernel 1 CTA 完成后才读取 Workspace。删除“无限长上下文”等过度断言，并标明六 Split / 四 CTA 仅是代表性教学调度。
- 数学正确性：累加器表示保存 `\widetilde O_i,m_i,ℓ_i`，按 `m=max_i m_i`、`ℓ=Σ_i exp(m_i-m)ℓ_i`、`O=Σ_i exp(m_i-m)\widetilde O_i/ℓ` 合并，补回原画布遗漏的局部分母；O+LSE 表示保存 `O_i,L_i`，按 `L=LSE_i(L_i)`、`O=Σ_i exp(L_i-L)O_i` 合并。两套公式均通过与直接 Softmax 的数值对照。
- canonical 状态：`flash-decode/model.js` 只建模原页面已有的 2 种 Workspace 表示与 7 个生命周期状态，纯派生两批 CTA 分配、Workspace 写入数、独立归约和最终写回；没有保留上一版新增的 Unsplit/Paged/GQA/Auto Split 等扩张范围。
- 浏览器证据：桌面恢复为两列主区且页面 `clientWidth=scrollWidth=1504`；O+LSE 与累加器模式均逐步验证到归约阶段，累加器 DOM 公式明确包含 `ℓ_i`。`768×900` 下主画布/伪代码按原阅读顺序上下堆叠、页面 `753/753`；`390×844` 下为 `375/375`，同样无页面横向溢出。中英文、播放/暂停、模式重置均通过；新建干净标签页无 Vite error overlay，控制台无 warning/error。
- 工程回归：`npm run check:flashdecode` 通过（2 algorithms × 7 lifecycle states，73 个 i18n 键一致）；QA matrix helper 通过（6 cases，3 个受影响维度）；模块 convention checker 9/9、0 warning；`git diff --check` 通过；Vite 5.4.21 生产构建通过（1891 modules transformed）。

### 2026-07-18 — FlashDecode：在原布局内补齐 Unsplit、Paged KV、GQA/MQA 与 Auto Split

- 变更分类与结构契约：本轮是原模块的扩展，不是结构性重构。继续保留“顶部全局控制 → 挑战横幅 → 左 7 / 右 5 主画布与伪代码 → 底部检查器”的区域顺序、相对比例和响应式阅读顺序；新增能力只进入原顶部卡、HBM 对象、CTA 区、伪代码和检查器，没有新增页面级面板。
- 独立控制边界：执行方式（Unsplit / Split-K）、KV 布局（Contiguous / Paged）、头配置（MHA / GQA / MQA）、Split 设置（Auto / 2 / 4 / 6 / 8）和 Workspace 表示均由一个 canonical snapshot 派生。Paged 不强制 Split-K，GQA/MQA 不改变序列是否切分；Unsplit 下 Split 数与 Workspace 表示保留但明确禁用。
- Unsplit / Split-K：Unsplit 只有 `resolve KV → fused online attention → write output`，不创建局部 Workspace 或归约 kernel；Split-K 继续显示局部结果和独立 LSE 归约。有效 Split≤4 时只派生一批 CTA 并直接进入归约，>4 时才出现第二批，避免手动选 2/4 后播放空批次。
- Paged KV：复用原 HBM K/V 对象，在其内部附加 Block Table。Contiguous 显示逻辑页与物理页顺序一致；Paged 使用代表性非连续 `L0→P4, L1→P1, …` 映射。页面明确把 KV page 与 Split-K 的逻辑 split 作为两种独立划分，不把 page 数等同于 split 数。
- GQA/MQA：Q/KV 形状改为 `Q[1,H_q,d]` 与 `K/V[N,H_kv,d]`；原 Query 行内显示八个 Q head 到 KV head 的分组映射。MHA 为 8→8、GQA 为 8→2、MQA 为 8→1，并动态更新每 KV head 的复用数和 KV 读取元素数；这些指标只表达元素规模，不冒充字节数或性能保证。
- Auto Split 边界：Auto 采用“目标约 2048 tokens/split，限制到 2–8 个偶数 split”的教学启发式，当前 `N=12288` 派生 6。界面和模型均明确真实后端会根据形状、批量和硬件选择 kernel / split 数，不把该规则描述为 FlashAttention、xFormers 或 vLLM 的固定实现。
- 技术依据：Flash-Decoding 原始说明确认沿 KV 序列增加并行维度、局部写入 O+LSE 并由第二个 kernel 合并；PagedAttention 论文/实现确认 Block Table 将逻辑 KV block 映射到非连续物理 block；GQA 原论文确认它使用介于 MHA 与 MQA 之间数量的 KV heads。对应参考为 Princeton Flash-Decoding、vLLM PagedAttention 论文/官方设计文档与 EMNLP 2023 GQA 论文。
- 模型回归：`npm run check:flashdecode` 枚举并通过 636 个合法生命周期状态，覆盖 2 Workspace × 2 execution × 2 KV layout × 3 head mode × 5 split setting 及派生步数；同时验证两种局部合并与直接 Softmax 数值一致、Paged/Contiguous 映射、MHA/GQA/MQA KV 读取规模和中英文 113 个 i18n 键一致。
- 浏览器证据：`Paged + MQA + 4 splits` 显示 1 个 CTA 批次、4 个 Workspace 条目和非连续 Block Table，第三步直接进入归约且没有空的第二批；`Unsplit + Paged + MQA` 禁用 Split/Workspace 控件、显示 1 个 active CTA 和“无局部 Workspace / 无归约 kernel”；英文移动端 `8 splits` 的第二批显示 4 个 active CTA。
- 响应式与契约影响：桌面主区仍为约 `597/420px` 的 7:5 两列；`768×900` 与 `390×844` 均按主画布→伪代码顺序堆叠。页面宽度分别为 `1265/1265`、`753/753`、`375/375`；中英文技术控件、派生指标与页面均无非预期横向溢出。密集 K/V、CTA 和 Block Table 在窄屏保留原画布内部的有意横向滚动；完成修改后新建干净标签页，无 Vite overlay，console warning/error 为空。
- 当前结论：未发现 P0/P1。保留的限制是固定代表性 `N=12288, H_q=8, d=128`、六个代表性 KV pages、最多八个教学 splits，以及不估算真实延迟/带宽。QA matrix helper 通过（7 cases、8 个受影响维度），模块 convention checker 9/9、0 warning；Vite 5.4.21 生产构建通过（1891 modules transformed）。

### 2026-07-18 — Engram：在原 2/7/3 结构内完成正确性与系统语义修复

- 变更分类与结构契约：本轮为局部修正与能力扩展。继续保留“顶部控制 → 左 2 网络拓扑 / 中 7 微观张量流 / 右 3 Demo 对齐伪代码 → 满宽系统时间轴 → 数学推导”的区域顺序、相对比例与响应式阅读顺序；没有替换原主画布或增加新的页面级信息架构。
- canonical 状态：新增纯 `normalizeEngramState()`、`deriveEngramSnapshot()` 与 `advanceEngramState()`。同一 `systemMode × tokenIndex × step` 快照驱动拓扑、张量流、伪代码、时间轴和完成态；操作严格按 `extract → hash → lookup → retrieve → concatenate → project → gate → shortConv → integrate` 推进，idle/done 为 0 active，其余状态恰好 1 active。
- 拓扑顺序：标准 Block 明确为 Attention → MoE；含 Engram 的 Block 为 Engram 模块 → Attention → MoE。页面使用官方 Demo 的代表性 `max_n=3`、8 个 hash heads、Engram 位于第 1/15 层配置，并将它标为示例而非通用层位约束。

#### Claim ledger

| Claim | 领域模型与可见证据 | 边界 |
|---|---|---|
| N-gram hash 的存储轴只有 `max_n-1` 个槽位 | `hash_idx[B,L,max_n-1,num_heads]`，以 `ngram_idx=n-2` 写入和查询；模型检查覆盖所有索引 | 展示使用官方 Demo 的 2-gram/3-gram 与 8 heads，不暗示任意部署都采用相同表数 |
| `W_V` 在 hyper-connection 分支间共享，`W_K` 按分支独立 | 张量流先生成共享 `V_t=W_VE_t`，再为各分支生成 `K_t^(c)=W_K^(c)E_t`；伪代码把共享投影移出分支循环 | 这是官方 Demo 对齐结构，不声称所有 Engram 后续实现必须保持相同参数化 |
| Engram 输出先经过门控与 short convolution，再进入 Block 残差 | gate、shortConv 和 integrate 是三个独立 canonical 操作；最终显示 `H_block=H_in+Y` | 画布使用代表性 shape，不展示某个编译器的真实 kernel fusion |
| 推理与训练的数据移动路径不同 | 推理显示 CPU Host lookup、PCIe transfer 与 GPU compute window；训练显示 GPU table shards、All-to-All active-row fetch 和 backward gradient dispatch | 推理侧只声明在足够前置计算、带宽与调度条件下可隐藏部分延迟，不承诺“完全掩盖” |
| Tokenizer compression 会让等价形式共享规范化 ID | 可见示例 `" Alexander"` / `"ALEXANDER"` → `alexander`，同时标注 NFKC、去重音、小写与空白归一化 | 示例用于解释压缩语义，不等同于复刻完整 tokenizer 词表或精确 ID |

- 伪代码正确性：修复原 `hash_idx[:,:,n,k]` 越界；引入 `ngram_idx=n-2`、逐头 prime 取模和共享/分支投影边界；门控归一化在开方前 clamp，并把 Engram 增量 `Y` 与外层 Block 残差 `H_block` 分开表示。
- 内容与数学：全部公式切换到共享 `MathFormula`/KaTeX；有符号平方根写为 `sign(x)√|x|`；中英文键完全对齐，Play/Next/Completed 语义一致。Tokenizer compression 增加直接可见的输入→规范化证据，不再只用说明文字暗示变化。
- 响应式：桌面保持 2/7/3 主结构；`768×900` 与 `390×844` 自动按原阅读顺序堆叠。三种宽度均无页面级横向溢出；窄屏张量流和系统时间轴仅保留带显式提示的局部横向滚动。移动端控制条可换行且标题、播放、重置、完成态均可见。
- 模型与工程回归：`npm run check:engram` 覆盖推理/训练 × 5 token × 10 step，共 100 个 canonical 生命周期状态；QA matrix 覆盖 2 system modes × 2 languages × 3 viewports 共 12 例。模块 convention checker 9/9、0 warning；`git diff --check` 与 Vite 5.4.21 生产构建通过（1892 modules transformed）。
- 浏览器证据：代表性单步依次得到 `extract/hash/lookup/retrieve/concatenate/project/gate/shortConv/integrate`；完整 45 次推进后为 `phase=done`、Next 显示 Completed 且禁用。推理/训练切换、中英文状态保持、1280+ 桌面、`768×900`、`390×844` 均通过；控制台仅有 Vite debug 与 React DevTools info，无 warning/error。
- 已知限制：页面固定使用代表性 token 序列、2/3-gram、8 heads 与第 1/15 层；逻辑嵌入表按 channel 分开展示，而官方 Demo 可通过 offset 打包底层表；训练反向只标注梯度分发边界，没有把参数更新过程扩展成第二条动画时间线。

### 2026-07-18 — Engram：压缩 Context-aware Gating 并修复 E_t 连线

- 变更契约：仅调整中间张量流内部 `Multi-Head Hash Retrieval → Context-aware Gating` 的桥接区和门控区；顶部控制、2/7/3 主结构、左右面板、时间轴、数学区、状态机与响应式阅读顺序均保持不变。
- 数据依赖：2-gram 与 3-gram 的 `E_{t,2}` / `E_{t,3}` 不再以两条重合线直接落入门控区，而是在现有两块 channel 卡下方汇聚成唯一 `E_t=Concat(E_{t,2},E_{t,3})`，随后由同一 `E_t` 扇出到 per-branch `W_K` 与 shared `W_V`。桥接公式、汇合节点与下行箭头在 concat 及后续状态保持连续可见。
- 信息密度：门控画布从 560px 压缩到 480px，并在同一画布内用“投影 / 依赖门控 / 卷积融合与残差”三条轻量语义带组织原有节点；没有复制第二套解释图。17 个核心张量/算子在桌面激活态的两两交叠数为 0。
- 标签与路由：长门控说明改成紧凑的 `〈·,·〉 → sgn(x)√|x| → σ` 公式，避开 `K_t`、RMSNorm 与 `α_t`；`E_t`、权重、门控、Conv1D、residual 与 `H_block` 的维度标签均贴近对应对象。桌面截图中从两个 channel 到 `E_t`、两路投影、门控广播和 residual 的方向均可连续追踪。
- 响应式：桌面无页面级横向溢出；`768×900` 与 `390×844` 的页面 `scrollWidth==clientWidth`，门控画布继续使用原张量流内部的有意横向滚动。移动端分别检查左侧 `H_in/W_K/K_t/α_t/residual` 和右侧 `E_t/W_V/V_t/广播/Ṽ_t` 路径，节点与标签无非预期重叠。
- 回归：`npm run check:engram` 增加 bridge、唯一 `E_t` 汇聚公式、紧凑画布及核心语义节点断言并通过；convention checker 9/9、0 warning，QA matrix 12/12，`git diff --check` 与 Vite 5.4.21 生产构建通过（1892 modules transformed）。

### 2026-07-18 — Engram：降低门控节点视觉重量并分离汇聚边缘

- 问题复核：上一版虽将门控画布从 560px 压到 480px 并消除节点几何相交，但继续沿用原大号张量框、40px 算子圆和 144×48px Conv1D，形成视觉拥挤；汇聚框顶边与上层 Hash Retrieval 卡底边实际重叠约 2.4px。
- 局部修复：画布高度、三条语义带、全部节点、连线与执行状态保持不变；只按内容缩小 `H_in/E_t/W_K/W_V/K_t/V_t/α_t/Ṽ_t/H_block`、矩阵乘/门控/广播/residual 算子及 Conv1D 的几何和符号字号。Conv1D 从 144×48px 调整为 112×40px，圆形算子从 40px 调整为 32px。
- 密度量测：18 个语义节点的桌面激活态占用面积从约 51,756px² 降至 37,698px²，减少约 27%；两两交叠仍为 0。技术对象、维度标签、三条语义带及数据依赖均未删除。
- 汇聚间距：桥接区由 64px 增至 80px，`E_t=Concat(E_{t,2},E_{t,3})` 汇聚框下移；其顶边与上层检索卡底边从 −2.4px 重叠改为 +13.6px 间隔，双 channel 连线仍从两侧汇入并连续下行至 `E_t`。
- 响应式与语言：`768×900` 和 `390×844` 页面均无页面级横向溢出；移动端分别检查左右半幅，内部滚动范围维持 399px，紧凑节点没有产生新的裁切或碰撞。中英文标题及语义带文案均完成复核。
- 回归：`check:engram` 增加 80px bridge、32px 核心算子和紧凑 Conv1D 的源断言；canonical 生命周期、convention checker、QA matrix、生产构建与浏览器 console 继续作为交付门槛。

### 2026-07-18 — RadixCache：修正容量淘汰、引用锁与前缀复用指标

- 变更分类与结构契约：本轮是局部修复与时间线扩展。保留“顶部控制 → Incoming Requests → 左侧逻辑树/线性布局与物理池 → 右侧运行时伪代码 → 底部原理解析”的区域顺序、3:2 主区比例、模式切换和响应式阅读顺序；新增请求 D、容量缺口和指标证据均嵌入原有区域，没有替换页面信息架构。
- canonical 模型：新增 `radix-cache/model.js`，统一派生两种模式的请求状态、树节点、成对 KV 槽位、`lock_ref`、容量缺口、累计复用率和伪代码高亮。标准模式使用 8 个生命周期状态；Radix 模式使用 13 个状态，把 match、split、insert/acquire、finish/release、capacity check、evict 和重新分配按依赖顺序分开。

#### Claim ledger

| Claim | 领域模型与可见证据 | 边界 |
|---|---|---|
| 淘汰由待分配需求产生，而不是必须等池占满 | 请求 D 需要 5 个槽位；Radix 压力态显示 `used=6, free=4, shortage=1`，标准对照显示 `used=8, free=2, shortage=3` | 固定 10 个成对 KV 槽位、`page_size=4 tokens` 仅是教学参数 |
| 活动请求保护最后节点及祖先，请求完成后释放 | A/B/C/D 分别在处理态显示 3/3/2/5 个锁定槽位，紧随的完成态均回到 0；树节点与物理池同步 | 表达 SGLang 核心 `inc_lock_ref/dec_lock_ref` 生命周期，不复刻所有调度器并发细节 |
| LRU 只能回收未锁定叶子，并按实际缺口回收 | 压力态把 A 后缀标为 `lock_ref=0` 的 LRU 候选；淘汰一步后 `used=5, free=5, shortage=0, evicted=1` | 只演示一个候选叶子与一次级联检查，不声称覆盖所有 eviction policy |
| 前缀命中率不应随物理淘汰虚增 | 指标改为 `reused prompt tokens / arrived prompt tokens`；淘汰前后均为 `8/52=15.4%` | 展示累计 Prompt Token 口径，不冒充请求吞吐或 KV byte 节省率 |
| 容量按 K/V 槽位对计数 | K/V 两行继续保留，但顶部明确每一列是同一 page 的 K/V 槽位对，容量按 10 列计数 | 不把 10 列误写成 20 个可独立分配的块 |

- 实现证据：伪代码增加分配前 deficit 计算、`cache_finished_req → dec_lock_ref`、未命中后缀分配以及未锁定叶子的 LRU 回收；中英文注释全部走 i18n。文案删除“零开销”“完全不搬运”和“传统缓存必然连续分配”等绝对化表述，明确 KV 不重算但树、索引与引用计数仍有元数据开销。
- 设计与可访问性：四个请求在原 Incoming Requests 中显示 Waiting/Matching/Running/Done/Capacity Check 等生命周期；容量缺口复用原主画布 KPI 区；物理池继续保留 K/V 两行和内部横向滚动。模式、语言、重置、播放与单步按钮补充 `aria-pressed/aria-label`，完成态 Next 禁用且 Play 变为 Replay。
- 模型回归：`npm run check:radix` 遍历两种模式的全部合法步骤，验证槽位上限、唯一 active 节点、D 的非连续分配引用、淘汰前后指标不变和完整锁生命周期。QA matrix helper 通过（6 cases，覆盖 mode/language/viewport/state 的指定交叉积）；模块 convention checker 9/9、0 warning。
- 浏览器证据：中文 Radix 压力态显示 `6/10、需要 5、空闲 4、缺口 1`，共享前缀/B/C 均为 `lock_ref=0`，A 后缀标为 LRU candidate；下一步显示 `5/10、空闲 5、缺口 0、已淘汰 1`；D 分配后为 `10/10`，最终请求和所有树节点解锁。标准模式最终显示 `8/10、需要 5、空闲 2、缺口 3`。英文 Radix/Standard 的请求、指标与伪代码均完成实页复核，无残留中文注释。
- 响应式限制：修改前原页面已在 390/768/1024 宽度验证无 body 级溢出；本轮新增请求行使用 `flex-col → sm:flex-row`，容量证据使用 `2 → 4` 列，主区和物理池仍沿用原断点与有意内部滚动。本轮浏览器的 viewport override 未实际改变 CSS viewport，因此没有把新的移动端状态误报为已渲染通过；后续人工确认时应重点检查四请求长 Token 行、三根树节点和成对槽位横向滚动。

### 2026-07-18 — DpAttention：统一 KV 口径并补齐 TP-FFN / EP-MoE 通信路径

- 变更分类与结构契约：本轮是现有章节内的正确性修复与能力扩展。保留顶部模式/播放控制、左侧四 Rank 张量切片主画布、右侧运行时伪代码和底部原理解析的区域顺序与 7:5 桌面比例；MoE 拓扑只作为 DPA 模式下的紧凑附加控件，没有重建页面信息架构。
- canonical 模型：新增 `dp-attention/model.js`，以 `mode × moeTopology × step` 派生阶段、通信原语、张量形状、KV 指标和所有画布可见性。标准 TP 使用 `input → attention → moe → output`；DPA + TP-FFN 使用 `attention → all-gather → moe → reduce-scatter`；DPA + EP-MoE 使用 `attention → all-to-all dispatch → moe → all-to-all combine`。idle/done 不保留伪 active 状态，播放、单步、重置、完成和重播共用同一时间线。

#### Claim ledger

| Claim | 领域模型与可见证据 | 边界 |
|---|---|---|
| MLA Decode 持久缓存包含压缩 KV latent 与解耦 RoPE key，Q 从当前隐藏状态生成 | 画布缓存标签、伪代码和公式统一显示 `c_kv + k_rope`；`q_proj(x_owned)` 与 `kv_proj(x_owned)` 同源于 hidden state | 固定表达 DeepSeek-V3 MLA 的教学形状，不展开吸收矩阵后的具体 kernel 布局 |
| 代表性 Attention-TP4 会在四个 Rank 保存同一请求集合的 KV | 标准 TP attention 态显示单 Rank 100%、集群 400%、复制因子 4，并由四张 Rank 卡分别展示一份完整缓存 | 不宣称所有 TP 后端都必然如此；这是单 KV head / latent 与本页固定拓扑的结果 |
| 代表性 DPA 配置 `TP=DP=4, Attention TP=1` 令每 Rank 只拥有四分之一请求 KV，集群合计一份 | DPA attention 态显示单 Rank 25%、集群 100%、复制因子 1；缓存形状为 `[B/4,S,d_c+d_h^R]` | 若 `DP<TP`，DP 组内仍可能保留 Attention-TP 复制，因此页面不使用“普遍零冗余”表述 |
| DPA 不强制 MoE 只能采用 TP | 同一 DPA 开关下提供 TP-FFN 与 EP-MoE 两条后半段；前者显示 Gather/Reduce-Scatter，后者显示 Router、Expert shard 与 All-to-All Dispatch/Combine | 通信原语是代表性执行图，不把某一后端的 fusion 或 collective 选择写成唯一实现 |

- 技术依据：DeepSeek-V3 技术报告的 MLA 定义明确给出 `c_t^KV` 与解耦 `k_t^R`；SGLang v0.4 官方说明确认标准 TP 下单 KV head 的缓存复制，以及 DPA attention 后进入 MoE 前的聚合和返回分发；SGLang 大规模 EP 官方说明进一步确认 DPA 可与混合 DP/TP 及 Router 驱动的 Expert Parallelism 组合。
- 内容与数学：矩阵/张量维度和 KV 内存公式全部经共享 `MathFormula`/KaTeX 渲染；公式明确区分单 Rank footprint、集群 footprint 和复制因子。文案删除“灾难复制”“完美切块”“MoE 必须 TP”等绝对结论，并显示固定四 Rank、Decode-only、非 profiler 的教学边界。
- 模型与工程回归：`npm run check:dpa` 遍历标准 TP、DPA+TP、DPA+EP 的全部合法步骤并验证 Q/KV 来源、阶段映射与 `100/400/4`、`25/100/1` 指标；QA matrix helper 通过（9 cases，5 个受影响维度）；模块 convention checker 9/9、0 warning。
- 浏览器证据：标准 TP 完整推进后显示四份 KV 和完成态；DPA+TP 依次出现 All-Gather、TP-FFN、Reduce-Scatter；DPA+EP 依次出现 Router + Top-k、Expert Shard、All-to-All Dispatch/Combine。中英文控制与指标完成实页切换；控制台仅有 Vite debug 和 React DevTools info，无 warning/error。
- 响应式证据：1280px 桌面保留 7:5 主结构；四 Rank 密集画布继续使用带显式提示的内部横向滚动，修复了 oversized 子画布居中导致左端不可达的问题。实际 `768×900` 与 `390×844` CSS viewport 下，页面 `scrollWidth == clientWidth`，顶栏控件交叠数为 0；390px 下图标版 Next 仍保留中文 `aria-label`。

### 2026-07-18 — DpAttention：压缩四 Rank 画布并显式展示通信后矩阵

- 结构契约：本轮仅修改左侧主画布内部的密度和状态证据；顶部控制、7:5 主区比例、四 Rank 泳道、右侧伪代码、底部解析以及既有时间线均保持不变。
- 宽度修复：四 Rank 内层最小宽度由 760px 降为 520px，列间距和卡片 padding 同步压缩；维度图例改为 KaTeX 符号加短说明，长标题改为允许两行的紧凑标签。1280px 下左画布 scroller 从 `clientWidth=538 / scrollWidth=941` 改为 `538 / 538`，Rank 0–3 各约 126px 并全部同时可见。
- 标签修复：`KV 压缩投影`、`Q / 吸收投影`、`MLA KV Cache`、MoE Up/Down 等名称改为画布级短标签；实现与边界说明仍保留在伪代码和解析区。中英文代表性 MLA/MoE 状态的叶节点 `scrollWidth > clientWidth` 数量均为 0。
- 输出证据：DPA 的 Reduce-Scatter 与 All-to-All Combine 阶段继续复用原通信连线和四 Rank 终点，但最终 `subset` 的 6px 色带改为每 Rank 一个 3×4 本地矩阵；操作节点同时显示“每个 Rank 取回”与 `[B/4,S,H]`。两条路径均验证存在 4 个矩阵、每个 12 个单元，颜色与请求归属 Rank 一致。
- 响应式：390×844 英文状态无页面级溢出、控制交叠数为 0；主画布 `clientWidth=309 / scrollWidth=520`，保留带文字提示的有意内部横向滚动。桌面不再显示不必要的滚动提示。
- 回归：`check:dpa` 增加 520px 密度契约、禁止 760px 回归、`localMatrix` 与返回语义标签断言；QA matrix 继续通过 9 cases / 5 dimensions，模块 convention checker 9/9、0 warning，Vite 生产构建通过（1894 modules）。
## 2026-07-18 — LLMInference：在既有全景结构内补充张量执行视角

- 变更分类与结构契约：本轮是功能扩展与正确性修复，不是结构重做。保留原顶部模式/采样/播放控件、Sequence 与 KV 区、左侧模型画布、右侧伪代码和底部状态说明的顺序与阅读路径；张量主画布已经覆盖执行证据，因此后续按用户要求移除了重复的折叠公式参考。
- 教学问题：同一个 Token/Prompt 在 Embedding、逐层 Attention、Dense/MoE FFN 和 LM Head 中，张量形状、数据依赖、KV 所有权与采样输入如何变化？
- 能力声明：`timeline`、`multiple-modes`、`data-movement`、`dense-layout`、`math`。

### Claim ledger

| Claim | 领域模型与可见证据 | 边界 |
|---|---|---|
| Prefill 同时处理 Prompt 多行并使用因果遮罩 | `deriveInferenceTensorSnapshot()` 派生 `L×d_h` Q/K/V、`L×L` Score/Probability；6-token 示例在页面中显示 36 个单元与 15 个上三角遮罩 | 只展示最多 6×8 个代表单元，真实形状由 KaTeX 标签保留 |
| Decode 是单行 Query 读取历史 KV，并在当前层追加一个 K/V | Decode 页面显示 `1×d_h` Q/K/V、`1×L_cache` Score；首个 Decode Attention 中 Layer 1 为 7 个槽，未来层仍为 6 个槽；RoPE 位置为 `p=6` | 固定 32 层教学配置，不展开 paged KV 的 block table 与具体 kernel 布局 |
| KV Cache 属于每一层，而不是一个全局扁平进度条 | 顶部 KV 区显示当前层 K/V 两行、32 层提交进度和代表层堆栈；Prefill Layer 1 Attention 为 `1/32`，首个 Decode LM Head 为 `32/32` | 代表层条只抽取 L1/L2/当前层/L31/L32，完整计数仍由 32 项模型数组派生 |
| Prefill MoE 必须按 Token 独立路由 | Router 使用 `L×E` 矩阵；6 行各自选择 Top-2，共 12 个选中单元，并在 Expert Bank 显示聚合负载 | 固定 8 Experts、Top-2 教学场景，不模拟容量因子、丢 Token 或跨设备 All-to-All |
| 下一 Token 采样只读取最后一个 Hidden State | LM Head 主画布固定显示 `1×d · d×|V| → 1×|V|`，温度/Top-K/Top-P 曲线与采样 Token 由同一阶段快照驱动 | 不展开词表全量单元，只显示代表候选 logits |

### 已修复问题与交互证据

- Attention 由单一含混公式拆成 Score、逐行 Softmax Probability 和 `PV` Context 三个真实中间对象；Prefill 显式遮罩，Decode 不画遮罩。
- Dense/MoE 切换会重置不兼容进度，并真实改变 FFN 结构：Dense 显示 `L×4d` 扩张和 `L×d` 回投影；MoE 显示逐 Token Router 与 Expert Bank，而不是只改标题或颜色。
- Decode 位置修正为 `promptLength + step - 1`；第一枚生成 Token 作为 Decode 输入时显示绝对位置 `p=6`，避免原先的 off-by-one。
- 初始阶段只在外层 Stage 降低透明度，内部矩阵不再二次叠加透明度；桌面测得 pending opacity 为 0.7，矩阵数值仍可辨认。
- 主区域保持左 3 / 右 2 的既有关系；右侧伪代码不再被高张量画布强制拉伸。1280px 下左画布约 1683px 高、代码区约 803px 高，不再产生大块空黑区。
- 浏览器回测确认删除公式参考后页面不再存在 `details`，且没有残留 `displayProbs` 或旧图标依赖；张量主画布、伪代码和底部状态说明继续保持原顺序。

### 回归证据与限制

- 纯模型：`npm run check:llm` 通过，覆盖 96 个 Prefill/Decode × Dense/MoE × 阶段 × 代表层状态，并检查因果遮罩、概率归一化、KV 层进度、逐行 Top-2、位置编号和 LM Head 行数。
- 规范与矩阵：module convention checker 9/9、0 warning；QA matrix 4 cases 覆盖 phase×model、language×viewport 与 sampling×viewport。
- 构建：Vite 5.4.21 生产构建通过，1896 modules transformed。
- 浏览器：桌面保持原主区比例；390×844 下顶部采样控件自动变为紧凑三行，模式/语言/播放控制均未裁切。中英文标题、阶段状态与控件均完成实页核查；公式参考已移除。
- 已知边界：矩阵值为确定性代表样本，目的是说明数据形状与依赖，不是数值精度验证或 profiler 输出；本章仍是宏观 decoder-only 教学视角，不覆盖多头物理布局、GQA/MQA 分组、paged KV 分配、量化或具体后端 fused kernel。

### 2026-07-18 — LLMInference：补齐 FFN 权重路径与 Top-K / Top-P 曲线

- Dense FFN 在原 Stage 内补齐 `Norm(X) → W_up[d,4d] → H[L,4d] → W_down[4d,d] → Y[L,d]`，MoE 则在原 Router/Expert Bank 下补齐 `W_gate[d,E]` 以及当前选中 Expert 的 Up/Hidden/Down 矩阵；没有增加页面级面板或改动左右主区结构。
- 采样由纯 `deriveSamplingDistribution()` 统一派生。温度被约束在 `0.1–0.9`；先进行温度重标定，再执行 Top-K，随后按累计质量执行 Top-P，最后只对保留候选重新归一化。曲线同时显示温度分布、筛选后的最终分布与累计概率/Top-P 阈值。
- 顶部控制保留原位置并扩展为温度、Top-K、Top-P 三个紧凑滑块；伪代码同步显示 `top_k_filter → top_p_filter → renormalize → sample`，避免控件与主画布语义脱节。
- 浏览器实测：MoE 画布存在 `router weight / router / expert up / expert hidden / expert down` 五个对象；Dense 切换后存在 `input / up weight / hidden / down weight / output` 五个对象。推进到 LM Head 后曲线出现；`T=0.9,K=3,P=1.0` 保留 3 个候选，切到 `K=1` 后立即只保留 1 个，证明曲线由控件实时驱动。
- 回归：`npm run check:llm` 通过 96 个代表状态，并新增 FFN/MoE 权重形状、温度上限、Top-K/Top-P 截断和概率归一化断言；convention checker 9/9、QA matrix 通过，Vite 5.4.21 生产构建通过（1896 modules transformed）。
## 2026-07-19 — SpeculativeDecoding：Draft–Verify、顺序接受与树形候选

- 变更分类与结构契约：新增独立章节，不改造既有章节。首页卡片和侧栏在 Flash Decode 后加入 Speculative Decoding；顶栏沿用仓库统一的标题/模式/局部参数/语言/重置/播放/下一步结构，主区采用 7:5 的执行画布与检查器关系。README/README.zh-CN 保持内容介绍后立即展示 Preview，再把 Roadmap 放在 Preview 之后。
- 教学问题：一次 Target Forward 为什么能够安全提交多个 Token；候选何时接受、拒绝、修正和回滚，何时 Draft 成本会抵消收益？
- 能力声明：`timeline`、`multiple-modes`、`resource-metrics`、`data-movement`、`dense-layout`、`math`。
- canonical model：`mode × profile × draftLength × phase × step` 统一派生真实操作序列、Draft/Target 概率、固定随机数、接受前缀、修正/Bonus Token、树形祖先 Mask、KV 槽位状态和共享成本指标。Baseline、Chain 与 Tree 使用各自真实 stage map；idle/done 无伪 active，running 始终只有一个 active operation。

### Claim ledger

| Claim | 依据与可视证据 | 边界 |
|---|---|---|
| 经典推测采样可以在不改变 Target 分布的前提下并行验证多个 Draft Token | Leviathan et al. ICML 2023 与 Chen et al. 2023；Chain 画布逐位置显示 `q_i(x_i)`、`p_i(x_i)`、固定 `u_i` 和 `min(1,p/q)`，检查器使用 KaTeX | 只对页面展示的经典修正拒绝采样声明精确分布，不泛化到宽松接受策略 |
| 接受判定必须按位置顺序进行；首拒后的 Draft 后缀不能提交 | canonical model 先定位 first rejected index，再只生成连续接受操作；浏览器 hard/K=4 场景最终提交 `the, future, technology`，原 `of` 与后续 `AI` 均保持 discarded | Target logits 可在一个因果块中并行产生，不等于接受决策可以乱序 |
| 首拒位置的替代 Token 来自归一化正残差，而不是直接重采样 Target | 修正阶段显示 `p'(x) ∝ max(0,p(x)-q(x))`，独立的 correction token 承担新语义身份 | 页面使用确定性代表样本解释机制，不是全词表数值模拟 |
| 全部 K 个候选通过时可以额外产生一个 Target Bonus Token | easy/K=4 浏览器路径完成后提交 5 个 Token，Bonus `is` 与四个 Draft Token 分开显示 | Bonus 只在 all-accepted 分支出现 |
| 树形候选需要祖先可见的注意力关系，并在验证后提交一条路径、裁剪其余分支 | Medusa 与 EAGLE-2；树图复用候选节点，8×8 Mask 由模型祖先关系派生，done 状态 3 个 selected 节点 committed、5 个非选节点 discarded | 本页展示代表性 tree verification，不把所有树构造/接受规则视为同一个算法 |
| 加速依赖接受率、Draft 成本和负载形态 | vLLM 0.17 官方边界；页面用同一刻度比较 baseline-equivalent cost 和教学估算 cost，并显式标注非硬件实测 | 不展示保证倍数；高 batch/低接受率/重 Draft 可能缩小收益 |

- 权威依据：[Fast Inference from Transformers via Speculative Decoding](https://proceedings.mlr.press/v202/leviathan23a.html)、[Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318)、[Medusa](https://arxiv.org/abs/2401.10774)、[EAGLE-2](https://arxiv.org/abs/2406.16858)、[vLLM Speculative Decoding](https://docs.vllm.ai/en/v0.17.0/features/speculative_decoding/)。
- 模型与规范回归：`npm run check:speculative` 覆盖 3 modes × 2 profiles × K={1,4,6} 的全部合法步骤，验证接受概率范围、首拒前缀、Bonus、Tree Mask 自可见与 selected-path commit；QA matrix 9 cases 覆盖 mode×outcome、mode×viewport、language×viewport；模块 convention checker 9/9、0 warning；Vite production build 通过（1898 modules）。
- 浏览器证据：1280×720 桌面中 Chain 初态、hard done、easy done 和 Tree done 均无 body overflow；hard 场景最初发现原拒绝 Token 被错误标成 committed，修正后新增断言要求 rejected token 与后缀都保持 discarded。Tree 在主区过早并排导致右分支滚动的问题已把并排断点推迟到 2xl，复核桌面 tree scroller `clientWidth == scrollWidth`。390×844 的中英文页面 body overflow 为 0、顶栏控制重叠为 0；Tree 保留明确的组件内横向 scroller 以维持节点可读尺寸。
- 已知边界：成本数值是固定 Draft-cost 系数的教学模型，不是 profiler；Tree 使用代表性静态节点与置信度，Roadmap 保留 EAGLE-family feature drafting、MTP、multi-round serving trace 和具体引擎调度作为后续扩展。

## 2026-08-30 — SpeculativeDecoding：从抽象 Chain/Tree 重构为 EAGLE-2 / DSpark 架构对照

- 变更分类与契约：用户明确授权结构性重构。顶层从 `baseline / chain / tree` 改为 `EAGLE-2 / DSpark`，Baseline 不再是隐藏的独立页，而是在第一教学区始终与当前算法同屏；语言、重置、播放、下一步、单一 active stage、浅色工作台和移动端阅读顺序保留。Chain、Tree 与 Block 退回候选拓扑/调度维度。
- 教学问题：为什么便宜的 Draft 工作能够减少昂贵的 Target 串行 Decode；EAGLE-2 与 DSpark 分别如何在 Draft 架构、候选拓扑和验证调度上实现这一共同骨架？
- 能力声明：`timeline`、`multiple-modes`、`resource-metrics`、`structural-comparison`、`data-movement`、`dense-layout`、`math`。
- canonical model：`algorithm × scenario × phase × step` 统一派生候选结构、验证预算、接受/修正结果、Baseline 与推测 Target 前向数、权重流式读取轮次、Draft/Verify/Runtime 成本、KV 提交/回收和伪代码高亮。`representative / lowAcceptance` 改变接受长度与 DSpark 验证前缀，切换算法或场景确定性重置时间线。

### Claim ledger

| Claim | 权威依据与可视证据 | 边界 |
|---|---|---|
| 推测解码以便宜 Draft 工作换取更少的 Target 串行 Decode | Leviathan et al. ICML 2023；第一教学区对同一提交 Token 数并排绘制 Baseline 的 N 次 Target Forward 与推测路径的 1 次 Target 块验证，并在共享成本刻度上拆出 Draft、Verify、Runtime | 块验证成本高于单 Token Decode；页面只建模权重带宽受限的低到中等并发 Decode |
| EAGLE-2 使用特征级 Drafter 与上下文感知动态候选树 | EAGLE 与 EAGLE-2 论文；EAGLE 模式显示 Target 倒数第二层特征复用、置信度扩树、祖先可见验证、接受路径和分支回收 | 页面是代表性确定轨迹，不复现论文训练、全词表采样或真实 kernel 时延 |
| DSpark 通过半自回归 Drafter 与置信度调度减少后缀衰减和无效验证 | DSpark 论文与 vLLM Speculators 官方实现文档；DSpark 模式显示并行候选块、低秩 Markov Head、Confidence Head、代表性 4/6 与低接受率 2/6 验证预算 | 验证长度使用教学化 engine profile，不声称复现 DeepSeek-V4 线上策略或 60–85% 实测数字 |
| Target 仍验证候选，经典修正拒绝采样可保持 Target 分布 | Leviathan et al. 与 Chen et al.；页面使用 KaTeX 显示 `min(1,p/q)`，并在 Target KV 条中分别编码接受前缀、修正 Token、已验证后缀与未分配槽位 | 只对经典修正拒绝采样声明精确分布；具体树形/宽松接受是否无损取决于实现 |
| 加速取决于接受长度、验证位置数与额外开销 | 纯模型使用 `A`、`V`、Draft、Verify、Runtime 共同派生估算；低接受率切换同步减少提交数、降低估算加速，并使 DSpark 缩短验证前缀 | 所有成本为归一化教学值，不是硬件 Benchmark |

- 权威依据：[Fast Inference from Transformers via Speculative Decoding](https://proceedings.mlr.press/v202/leviathan23a.html)、[Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318)、[EAGLE](https://arxiv.org/abs/2401.15077)、[EAGLE-2](https://arxiv.org/abs/2406.16858)、[DSpark](https://arxiv.org/abs/2607.05147)、[vLLM Speculators DSpark](https://github.com/vllm-project/speculators/blob/main/docs/user_guide/algorithms/dspark.md)。
- 自动验证：`npm run check:speculative` 覆盖 2 algorithms × 2 scenarios × 全部合法 timeline steps，并断言 Target 调用差异、EAGLE 接受路径、DSpark 验证裁剪、成本敏感性和 clean done；convention checker 9/9、0 warning；QA matrix 8 cases 覆盖 algorithm×scenario、algorithm×outcome、algorithm×viewport、language×viewport；Vite 5.4.21 production build 成功（1898 modules transformed）。
- 浏览器证据：1517×911 桌面首屏 Baseline/EAGLE-2 为 616px/616px 同屏列，推测子流程为 `192.5px / 24px / 357.5px`；body `clientWidth == scrollWidth == 1502`。DSpark 第 3 步只有一个 active stage，代表性场景 4/6 进入验证；低接受率切换重置到 0/6 并改为 2/6。完成态无 active stage。390×844 中英文 body overflow 均为 0，四个主区 `clientWidth == scrollWidth == 341`；EAGLE 树使用组件内 `307px / 584px` 横向 scroller，不产生页面级溢出。干净新标签页控制台 error/warn 为 0。
- QA 修正：首次 HMR 因删除后重建组件未重扫 Tailwind，重启 Vite 后桌面响应式类生效；DSpark 低接受率完成态最初只画接受候选 KV，补充修正 Token 槽后 Target KV committed 槽数从 1 与输出 2 不一致修正为 2。
- 已知边界：示例 Token、置信度与归一化成本为确定性教学轨迹；没有复现真实模型权重、硬件 profiler、连续批处理或多请求调度。后续可加入 EAGLE-3、原生 MTP 与有实测依据的硬件配置，但不应把论文倍数直接作为通用结论。

### 动态顶层竞速二次重构

- 信息架构：按用户反馈改成“共同加速原理竞速 → EAGLE-2 / DSpark 真实机制轨迹 → 算法架构 → 数学原理、KV 与伪代码”。原静态左右卡片被同一时间轴上的两条执行轨道替换；两条时间线各自使用就近的重置、播放和单步控制，算法/场景/语言仍保留在全局顶栏。
- canonical model：在原 `algorithm × scenario × phase × step` 上增加独立、受约束的 `raceStep∈[0,12]`。`deriveRaceModel` 统一派生归一化时间、Baseline 已提交数、当前 Target pass、候选可见数、Draft/Verify/Commit 阶段、推测提交数和实时领先 Token；渲染层不自行复制进度计算。
- 共同原理口径：首屏只抽象为“低成本候选工作 + 一次 Target 块验证 + 按序接受/提交”，没有宣称两种 Drafter 都一次前向完成多步。EAGLE-2 的特征级自回归扩树与 DSpark 的并行主干/Markov Head 继续只在下一节各自真实画面中呈现。该边界分别与 [EAGLE-2](https://arxiv.org/abs/2406.16858) 的 context-aware dynamic draft tree 和 [DSpark](https://arxiv.org/abs/2607.05147) 的 semi-autoregressive generation / confidence-scheduled verification 对齐。
- 可见证据：代表性 EAGLE-2 在 `t=2.00` 时推测轨道已经提交 `4/4`，Baseline 为 `2/4`，实时状态显示领先 `+2 Token`；DSpark 同一状态也为 `4/4 vs 2/4`。播放继续到 `t=4.00` 后两路以相同输出数收尾，避免把更早完成误画成不同生成结果。低接受率场景继续由更少提交 Token 和更低估算收益表达边界。
- 自动回归：`npm run check:speculative` 新增 2 algorithms × 2 scenarios × 13 race steps 的单调性、合法 active pass、候选增长、代表性提前完成和最终同输出断言；convention checker 9/9、0 warning；QA matrix 扩为 6 个受影响维度，并覆盖 `raceOutcome × viewport`；Vite production build 通过（1898 modules）。
- 浏览器 QA：1517px 中文 EAGLE-2 初态、`t=2.00` 领先态与最终态均完成实页检查；390×844 英文 DSpark 在 `t=2.00` 显示 `4/4 vs 2/4`。桌面 `bodyScrollWidth=1502 < innerWidth=1517`，移动端 `bodyScrollWidth=375 < innerWidth=390`；竞速画布在移动端保留 `307/744px` 的有意内部时间轴滚动，不产生页面级横向溢出。干净新标签页只有 Vite debug 和 React DevTools info，warning/error 为 0。
- 当前结果：P0–P3 未发现未解决问题。已知限制仍是归一化教学成本而非硬件实测；竞速展示代表性单请求 Decode，不外推到高 batch 连续调度。

### 固定时间预算竞速与论文机制复核

- 缺陷与改动范围：用户确认原“固定 4 Token 输出目标”会让 Baseline 在动画终点追平，最终“未拉开差距”与竞速心智模型冲突；静态执行代价框重复表达同一结论。此次属于顶层比较模型修复和两种算法主画布的正确性扩展，保留算法/场景/语言开关、两套局部时间线、公式、KV 与伪代码区域。
- 顶层模型：竞速改为固定 `6` 个归一化 Target 时间单位。Baseline 每单位完成一次 Target Forward 并提交 1 Token；推测路径按当前 Drafter/Verify/Runtime 成本重复多个周期，每个完成周期一次性追加该场景的 accepted output。代表性 EAGLE-2 与 DSpark 最终均显示 `12 vs 6`、多输出 `+6 Token`；EAGLE-2 低接受率边界显示 `6 vs 6`，并明确写成“低接受率抵消收益”，不再把追平伪装成加速。
- 冗余移除：删除 `CostBars` 与 `speculative-cost-bars`，第一教学区不再出现静态归一化成本条或孤立估算倍数；Draft/Verify/Commit 成本只作为每个循环在共享时间轴上的实际宽度，输出 Token 直接在两条轨道下增长。

#### 论文 Claim ledger

| Claim | 原论文依据 | canonical model 与可见证据 | 边界 |
|---|---|---|---|
| EAGLE-2 用路径上 Draft confidence 的乘积近似节点全局接受概率 | [EAGLE-2 §4.1](https://arxiv.org/html/2406.16858) | 每个节点派生 `value`，画布以 KaTeX 显示路径乘积公式和实时数值 | confidence 是 acceptance proxy，不是 Target 已验证概率 |
| 扩树选当前层 Top-k，但最终验证候选需要对全树 Top-m 重排 | [EAGLE-2 §4.1–4.2 / Figure 7](https://arxiv.org/html/2406.16858) | 论文 Figure 7 的 `It/is/has/a/the/good/nice/to/be/do` 代表树；第二阶段橙色标出两个扩展父节点，第三阶段全树选 8/10 并裁剪两个低 Value 节点 | 固定 Top-2/Top-8 是论文图示代表参数，不声称是所有部署配置 |
| Top-m 连通树需压平为一维序列，并用祖先可见 Mask 隔离不同分支 | [EAGLE-2 §4.2 / Figure 7](https://arxiv.org/html/2406.16858) | 模型派生 `flattenedCandidates` 与 8 by 8 Boolean mask；画布同步显示一维 Target 输入和 Mask | 不展开真实 kernel 的位置重映射与稀疏实现 |
| DSpark 先用重型并行 Backbone 一次产生整个块的 Hidden/Base Logits，再用轻量顺序模块注入块内依赖 | [DSpark §3.1 / Figure 1](https://arxiv.org/html/2607.05147) | 画布按 `D + Mask → Parallel Backbone → all base logits` 和 `previous token → low-rank Markov bias → left-to-right sample` 两行分开；KaTeX 显示二者相加后的条件分布 | 页面采用论文默认 Markov-head 代表变体，不展开 RNN-head |
| DSpark confidence 是给定前缀已接受时的条件存活率；Scheduler 使用累计乘积与硬件 SPS 曲线选择连续验证前缀 | [DSpark §3.2 / Algorithm 1](https://arxiv.org/html/2607.05147) | 模型为 E/F/G/H 派生 `0.91/0.75/0.41/0.13` 累计存活率；画布把 3 个位置保留、H 丢弃，并显示 throughput curve | SPS 曲线是确定性教学 profile，不复现 DeepSeek-V4 线上负载 |
| DSpark 论文 Figure 1 的本轮结果为接受 E、F，拒绝 G 并产生 G* | [DSpark Figure 1](https://arxiv.org/html/2607.05147) | Target Verify 行逐 Token 编码 E/F 绿色、G 红色、H 未验证、G* 橙色；KV 与 metrics 同步为 3/4 验证、3 Token 提交 | 字母 Token 保留论文抽象，目的是对应原图而非自然语言样本 |

- 自动回归：`check:speculative` 遍历 2 algorithms × 2 scenarios × 13 race steps，验证两路输出单调、周期边界、最终领先/边界追平、EAGLE path value 单调、Top-k/Top-m、8 by 8 ancestor mask 和 DSpark cumulative survival/3-of-4 scheduling；convention checker 9/9、0 warning；QA matrix 8 cases 覆盖 6 dimensions，并补齐 `raceOutcome × viewport` 的 idle/multi-cycle/final-lead/boundary-tie。
- 浏览器证据：1517px 中文 EAGLE-2 代表性终点显示 Baseline 6、推测 12、`+6 Token`，`CostBars` DOM 数为 0；EAGLE flatten 阶段显示 8 个一维候选和 8 by 8 Mask，主画布 `clientWidth == scrollWidth == 1242`。DSpark 完成态完整显示并行 Backbone、Markov 左到右链、累计 survival、硬件曲线、3/4 verify 和 G* correction，主画布同样无内部溢出。
- 响应式：390×844 英文 DSpark 主画布 `307/307px`，各结构按纵向阅读顺序重排；竞速保持有意的 `307/744px` 内部共享时间轴，页面 `bodyScrollWidth=375 < innerWidth=390`。代表性竞速终点仍显示 `12 vs 6`；EAGLE 低接受率终点显示明确边界解释。
- 当前结果：未发现 P0–P3 遗留问题。固定时间、成本和 SPS 曲线仍是确定性教学模型；算法结构与依赖按论文复现，但不声称对应某个真实权重或硬件 profiler。

### 统一示例、模型位置与机制可读性复核

- 教学连续性：顶层竞速、EAGLE-2 树与 DSpark 块统一使用 `Large models can predict the future of ...`。EAGLE-2 代表性路径提交 `predict / the / future / of`；DSpark 明示 Target 先产生锚点 `predict`，再接受 `the / future` 并把错误候选 `tokens` 修正为 `of`。低接受率分支也沿用同一句上下文。
- 宏观位置：在竞速和算法轨迹之间加入完整推理路径。画面明确区分一次性 Target Prefill 与 Decode 循环，并把 Draft 画成 Decode 外侧的 proposal sidecar；原 Target Transformer、权重、训练与采样目标保持不变。Baseline 与推测路径共用同一个 Target，后者只是把多次串行单 Token forward 改成候选生成、一次因果块验证和连续提交。
- 加速与精确性：同一区域并列解释权重带宽受限 Decode 下的 weight-stream amortization，以及经典修正拒绝采样的逐位置接受率和正残差修正分布。只对经典 modified rejection sampling 声明 Target 分布保持不变；树形或宽松接受策略仍以具体算法证明为准。
- EAGLE-2：候选树改用更宽的确定性节点位置，紧凑 Token chip 和 `items-start` 避免左右列等高造成空白；8 行 / 8 列 Mask 改为固定 20px 单元。用途文字明确说明压平后普通因果 Mask 会污染兄弟分支，而祖先可见 Mask 允许 `of` 只读取 `predict → the → future → of`，从而在一次 Target forward 中并行验证且保持分支隔离。
- DSpark：先画“已提交前缀 → Target 锚点”，再画 `anchor + [MASK]` 输入。基础分数卡把公式符号放在次级位置，主要文案先解释“只看已提交上下文的并行基础猜测”；Markov 行逐卡显示前一个 Draft Token 与修正后候选；Confidence 行同时显示条件存活率和累计前缀存活率，Scheduler 直接说明保留前三个、丢弃最后一个的吞吐理由。
- 初始态与动态：idle 状态完整显示机制，避免用户在未播放时只能看到低透明度结构；进入 running 后才按真实 stage map 逐步压暗未来阶段并高亮 active stage。底部删除重复的速度与精确性大卡，只保留当前阶段、Engine 伪代码、KV 生命周期和适用边界。
- 自动验证：`npm run check:speculative` 通过，并新增统一例子、EAGLE Mask 示例和 DSpark 锚点断言；convention checker 在 `timeline / multiple-modes / resource-metrics / structural-comparison / dense-layout / math` 能力下 9/9、0 warning；QA matrix 8 cases 覆盖 6 dimensions；Vite 5.4.21 production build 通过（1898 modules transformed）。
- 浏览器 QA：1517×902 中文桌面下宏观位置图、EAGLE 动态 Top-m 高亮、紧凑 Mask 和 DSpark 全链路均完成截图核查；390×844 下 DSpark 基础猜测与 Markov 卡变为两列，EAGLE 树保持组件内横向 scroller、Mask 无需横向滚动。两算法手机端均为 `bodyScrollWidth=375 == bodyClientWidth=375 < innerWidth=390`，英文新增文案无 i18n key 泄漏。最终恢复到 1517×902、中文、EAGLE-2、代表性轨迹、两条时间线 idle、页面顶部。

### 静态权重拓扑与运行时激活拆分

- 变更分类与契约：这是对既有“模型位置”区域的结构性修复，不改变顶层竞速、算法轨迹、KV、公式与伪代码的顺序和控制契约。受影响维度为 `algorithm × phase × language × viewport`；算法切换只改变 Draft checkpoint，Target checkpoint 必须保持完全相同；轨迹步骤同步改变静态参数和运行时阶段的激活态。
- Target 静态权重：画面展开原始完整 Decoder-only Transformer：`Token Embedding → L_T × [RMSNorm → Causal Self-Attention(W_Q,W_K,W_V,W_O) → RMSNorm → SwiGLU/MLP(W_gate,W_up,W_down)] → Final RMSNorm → LM Head`。该行属于 `θ_T`，推测解码不删除、不插入或重训练其中任何层。
- EAGLE-2 Draft 权重：单独的 `θ_D` 行读取每请求的 Target 顶层特征/LM-Head 输入和冻结 Token Embedding，新增可训练融合投影与一层 Draft Decoder，并复用冻结 LM Head；动态树 Top-k/Top-m 与 Tree Mask 被明确标成无学习参数的运行时控制逻辑。依据 [EAGLE 原论文 Figure 6](https://proceedings.mlr.press/v235/li24bt.html) 与 [EAGLE-2](https://arxiv.org/abs/2406.16858)。
- DSpark Draft 权重：单独显示冻结 Target `embed_tokens` / `lm_head`、每请求 Target 隐状态、可训练 Feature Projection、Block-parallel Backbone、低秩 Markov Head 和 Confidence Head；存活率累计与硬件吞吐 Scheduler 属于无学习参数的运行时逻辑。依据 [DSpark 原论文](https://arxiv.org/abs/2607.05147)、[vLLM Speculators DSpark 文档](https://docs.vllm.ai/projects/speculators/en/latest/user_guide/algorithms/dspark/) 与 [NVIDIA NeMo AutoModel DSpark 实现说明](https://github.com/NVIDIA-NeMo/Automodel/blob/main/docs/guides/speculative/dspark.mdx)。逻辑共享是固定事实，Embedding/LM Head 在具体引擎中是否物理别名复用标为实现边界。
- 运行时拓扑：单请求阶段被拆为 `Prefill(Target-only) → Decode seed(Target) → Draft proposal(θ_D) → Target block verification(全部 θ_T 层) → Target KV commit/reclaim → loop`。Prefill 明确关闭 Draft；进入 Draft 阶段时只高亮 Draft 行与运行时张量；进入 Verify 时高亮会从 Draft 行切换到 Target 的 Embedding、全部 Decoder Layers、Final Norm 与 LM Head。
- canonical model 与回归：`deriveArchitectureModel` 统一派生 Target/shared/Draft/runtime-only 权重组、算法特定 checkpoint、五阶段运行时状态及 active owner。模型测试新增 EAGLE 两组与 DSpark 四组可训练权重、共享权重身份、idle 无 active、Draft 阶段只激活 `θ_D`、Verify 阶段只激活全部 `θ_T` 的断言。
- 浏览器 QA：1517×902 中文桌面完成 EAGLE-2 与 DSpark 静态图对照；DSpark step 1 显示 Target 行不激活、Target 隐状态/冻结共享权重/四组 Draft 权重出现红色 active ring，step 5 切换为完整 Target 行 active、Draft 行静止，运行时阶段同步从 Draft 变为 Target Verify。390×844 下 Target 层内部 Attention/MLP 保持可读，DSpark 权重组按单列堆叠，`bodyScrollWidth=375 == bodyClientWidth=375 < innerWidth=390`；英文标题与新增键无泄漏。

### 模型关系总览与算法工作台收敛

- 用户反馈与修复：完整矩阵形状、代表层展开和多层权重卡虽然技术上正确，但把辅助背景提升成主任务，造成页面密度和高度失控。实际渲染已撤下该详细视图，左列压缩为约 330px 的关系总览，只保留 Target、算法特定 Draft sidecar、输入/输出接口、共享/独立 checkpoint 身份、Target 验证和 KV commit/reclaim 闭环。
- 教学主次：Target 仅用 `Embedding → Transformer layer stack → LM Head` 三段式轮廓提示用户已知架构；EAGLE-2 左卡强调 `Target feature + shared embedding → fusion → one Draft decoder → shared LM head`，DSpark 左卡强调 `selected Target features → projection → block-parallel backbone → Markov/confidence heads`。不再把 Q/K/V/MLP 矩阵维度作为主画面内容。
- 算法融合：右列直接承载算法真实轨迹和局部播放控制。EAGLE-2 把 feature-level Draft、Top-k/Top-m 动态树、flatten 与 ancestor mask 串成一条轨迹；DSpark 把 anchor、并行 base logits、低秩 Markov 顺序修正、confidence survival、硬件曲线与 Target correction 串成一条轨迹。左卡 active owner 与右列 active stage 均由同一 canonical snapshot 派生。
- 去重：原独立横向运行时大条、泛化权重矩阵塔、下方重复算法轨迹与重复 KV 卡均退出实际渲染。底部只保留 Engine 风格伪代码与适用边界。
- 自动验证：`npm run check:speculative` 通过；convention checker 9/9、0 warning；QA matrix 8 cases 覆盖 6 dimensions；Vite production build 通过（1898 modules transformed）。
- 浏览器 QA：1517px 中文桌面中左列 Target/EAGLE-2 或 Target/DSpark 保持紧凑，右列同屏显示局部控制、6 个真实阶段和算法主画布；EAGLE step 1 的 Draft 卡与特征级 Draft stage 同步出现 active ring。390×844 下左列关系卡和右列算法工作台按纵向顺序堆叠，DSpark 控制、阶段卡和机制标题均无重叠；顶层竞速仅保留已有的组件内横向时间轴滚动。最终恢复为桌面、中文、EAGLE-2、代表性轨迹、idle。

### Draft 渐进展开与三对象运行时交互

- 变更分类：在用户认可的左右分栏结构内做局部扩展，不改变顶层竞速、右侧算法工作台、控制位置或响应式阅读顺序。受影响维度是 `algorithm × phase × language × viewport × draftExpanded`。
- 信息架构：移除左侧单独占块的五阶段“Decode 运行时闭环”。Target、Draft、KV 三个既有语义对象现在直接承载自己的阶段状态；Target/Draft 之间用向下的特征/Token 端口与向上的候选端口表示双向依赖，Target verdict 到 KV 的提交线独立标注。
- 渐进披露：Draft 默认继续保持紧凑摘要；显式“展开 Draft 内部”后才显示权重与张量流。青色虚线表示每请求 Target activation，紫色表示新增可训练 Draft 权重，黄色表示复用的冻结 Target Embedding/LM Head，灰色虚线表示无学习参数的树或调度控制逻辑。
- EAGLE-2 可见路径：`h_t^T + E_T[x_t] → W_fuse[(2d)×d] → one Draft Decoder{W_QKV^D,W_O^D,W_gate/up^D,W_down^D} → W_vocab[d×V] → tree controller`。DSpark 可见路径：`selected Target hiddens + E_T → W_proj[(Md)×d] → L_D block-parallel backbone → {W_vocab, W_1[V×r]W_2[r×V]} → w_c[(d+r)×1] → scheduler`。
- 同步证据：EAGLE step 1 时 Draft 外框、Target→Draft 特征端口、activation、共享 Embedding、fusion、Draft Decoder 与共享 LM Head 同时出现 active ring；进入 Target verify 后这些 Draft 权重退出 active，Target 卡和候选返回端口接管状态。DSpark 使用同一 canonical ownership 状态。
- 验证：模型回归通过；convention checker 9/9、0 warning；QA matrix 8 cases 覆盖 6 dimensions；Vite production build 通过（1898 modules）。1517px 中文 EAGLE/DSpark 展开态与 step 1 高亮完成浏览器核查；390×844 英文 DSpark 展开态中长按钮、图例、内部矩阵与两路 head 均保持单列阅读，无可见页面级横向溢出。最终恢复到桌面、中文、EAGLE-2、代表性轨迹、idle、Draft 折叠态。

### Draft 默认展开与横向密度压缩

- 默认状态：Draft 内部由默认折叠改为默认展开，首次进入页面即可看到权重和张量流；“收起 Draft 内部”仍保留为 presentation-only 控制，不改变 canonical 技术状态。
- 宽度约束：模型关系与算法工作台的内部画布增加 `1240px` 最大宽度，桌面分栏收敛为 `310px + 920px`，不再随 1600px 外层容器无限拉宽。外层章节标题和顶层竞速保持原宽度，避免影响已经认可的页面层级。
- 密度调整：Draft 展开卡的外边距、内边距、图例高度和双列 gap 均缩小；Target、Draft 与 KV 主卡也同步减少内边距。公式字号和矩阵两列结构保持不变，没有用缩小核心证据换空间。
- EAGLE 主画布：树与 Mask 的桌面最小列宽由原 `600 + 320` 降为 `560 + 260`，间距降为 `10px`，因此在 920px 工作台内可并排且不需要宽横向滚动；树高从 300px 收敛为 280px，节点仍保持分层和可读间隔。
- 验证：模型回归、QA matrix 与 convention checker 全部通过，Vite production build 通过（1898 modules）。1517px 中文 EAGLE 初态确认 Draft 默认展开，树与 Mask 并排且宽度受限；390×844 中文默认展开态中图例、双输入、融合层、Decoder 矩阵与共享 LM Head 保持单列阅读。最终恢复为桌面、中文、EAGLE-2、代表性轨迹、idle、Draft 默认展开。

### Draft 内联化与纵向压缩（取代展开/收起方案）

- 反馈修正：用户所说的“默认展开”不是保留一个很长的详情抽屉并默认打开，而是让必要的 Draft 内部结构从一开始就属于主卡，同时删除会重复占高的辅助内容。本节取代上两节中关于 `draftExpanded` 和展开/收起按钮的交互结论。
- 去重：删除 Draft 的展开按钮、结构摘要、结构 chips、checkpoint badge、输入/输出复述、图例、逐节点纵向箭头、“内部权重矩阵”小标题、逐节点“当前激活”文字和候选输出副本。算法身份、`\theta_D`、当前 Draft stage、关键权重组、张量形状和运行时控制仍保留。
- 紧凑拓扑：EAGLE-2 固定为三排：`Target activation + shared embedding`、`fusion projection + one Draft decoder`、`shared LM head + tree controller`。DSpark 固定为四排：共同输入、`feature projection + parallel backbone`、`shared LM head + Markov head`、`confidence head + scheduler`。节点的激活态改用红色 ring 与小圆点，不再增加行高。
- 预期空间：Draft 卡不再因为披露状态改变高度；EAGLE-2 内部流从长单列压缩为三层网格，DSpark 为四层网格。移动端沿用同一双列微拓扑，信息顺序与桌面一致，不再出现“先读摘要、再读相同结构详情”的二次滚动。
- 自动验证：`npm run check:speculative`、convention checker（9/9、0 warning）、8-case QA matrix 与 Vite production build（1898 modules）全部通过。
- 浏览器证据：1517px 中文桌面下 EAGLE-2 Draft 卡为 `288×201px`、内部流 `264×147px`；DSpark Draft 卡为 `288×259px`、内部流 `264×205px`。展开/收起按钮 DOM 数为 0，内部流始终为 1。390×844 DSpark 保持 `287×259px`，`bodyScrollWidth=375 == clientWidth=375 < innerWidth=390`，无页面级横向溢出。最终恢复为 1517×911、中文、EAGLE-2、代表性轨迹、idle、页面顶部。

### Target KV 生命周期动态修复

- 确认缺陷：左侧 Target KV 卡直接读取候选的最终 `accepted` 布尔值，因此 idle 状态已经出现绿色“已接受”槽；右上角还始终写着“接受 / KV Commit”。它没有表达时间线，是结果预览而非真实生命周期。
- 正确边界：已有 Prefix KV 是请求的持久运行时状态，所以 Decode 期间持续存在；本轮候选 KV 不是。真实引擎会为 speculative/lookahead token 分配临时槽，并只把 finalized / verified token 变成可缓存状态，排除可能被拒绝的 non-committable draft token。依据 [vLLM KV cache manager](https://github.com/vllm-project/vllm/blob/main/vllm/v1/core/kv_cache_manager.py)。
- canonical model：新增 `kvLifecycle`，由 `algorithm × scenario × phase × activeOperation` 纯派生 `prefix → reserved → verifying → committing → stable`。EAGLE 在 flatten/mask 阶段预留 8 个槽，DSpark 在 scheduler 选定验证前缀后预留 2 或 3 个槽；Target verify 把它们标为 temporary；commit 阶段只把连续接受的 Draft Token KV 转为常驻，其余进入 reclaiming；done 后回收槽变为 reusable free。
- 修正 Token 边界：首拒位置采样出的 correction token 是最终输出 Token，但本次 Target verify 写入的是被拒 Draft token 对应的临时 KV；不能把该槽伪装成 correction token 的 KV。页面用独立橙色提示说明 correction-token KV 将在下一次 Target forward 生成。
- 可见编码：灰色实体块表示持续存在的 Prefix KV；灰色虚线为未分配/已释放，蓝色虚线为已预留，青色脉冲为 Target 临时写入，绿色为提交，红色斜线为回收。状态 badge 和说明文字与同一模型同步，不再固定显示 commit。
- 自动验证：模型回归逐算法、场景和 6 个 timeline step 断言 `prefix / reserved / verifying / committing / stable`、临时槽数、接受 KV 数、回收数与 correction pending；convention checker 9/9、0 warning，8-case QA matrix 和 Vite production build（1898 modules）通过。
- 浏览器证据：EAGLE-2 代表性轨迹从 idle 的 `8×empty`，到 step 4 的 `8×reserved`、step 5 的 `8×temporary`，再到 step 6 的 `4×committing + 4×reclaiming`，done 为 `4×committed + 4×free`。DSpark 代表性 commit 为 `2×committing + 1×reclaiming`，并显示 `of` 的 KV 待下一轮；done 为 `2×committed + 1×free`。390×844 英文 correction 状态卡为 `287×129px`，页面 `bodyScrollWidth=375 == clientWidth=375 < innerWidth=390`。干净新标签页只有 Vite debug 与 React DevTools info，error/warning 为 0；最终恢复为 1517×911、中文、EAGLE-2、代表性、idle、页面顶部。

### 章节标题与目录单行对齐

- 标题层级：章节主标题从泛化的“推测解码”调整为“推测解码原理可视化” / “Speculative Decoding Visualization”，与 `LLM 推理全景可视化`、`Flash Decoding 原理可视化`、`Radix Cache 原理全景可视化` 的仓库命名习惯一致；副标题继续承担 EAGLE-2 / DSpark 的具体范围说明，首页卡片仍保留完整概念名。
- 导航短标签：侧栏把可见标签从 `Speculative Decoding` 改为 `Spec Decode`，完整名称继续用于 `aria-label` 与 hover title。所有可见目录文本统一增加 `whitespace-nowrap`，图标固定不收缩，不扩大原 `176px` 侧栏。
- 渲染证据：1517px 桌面基线中该目录项原为 `159×60px`，其余条目均为 `159×40px`；修复后 9 个条目全部为 `159×40px`。中英章节标题在桌面 header 均无横向溢出；390×844 抽屉中 9 个条目也全部为 40px 单行，页面保持 `bodyScrollWidth=375 == clientWidth=375 < innerWidth=390`。
- 验证：模块模型回归、convention checker 9/9、QA matrix 与 Vite production build（1898 modules）通过。改动只涉及标题文案和导航呈现，不改变算法控制、时间线、主画布顺序或响应式阅读顺序。

### 2026-09-06 参数映射与教学目标审查（仅审查，未修复）

- 范围：保留现有竞速 → 模型关系/算法轨迹 → 伪代码结构；本次检查参数语义、执行真实性及可读性，不修改产品代码。以下发现更新此前“无遗留问题”的结论。
- 依据：SGLang 官方 speculative decoding 文档及 `python/sglang/srt/speculative/eagle_utils.py`；EAGLE-2 原论文 §4；DSpark 原论文 §3.1、§3.2.2、§5.2、附录 A。参数含义必须标注框架/算法；SGLang `num_steps` 为 Draft 自回归展开深度、`eagle_topk` 为展开宽度、`num_draft_tokens` 为验证容量（其树输入包括 bonus/root）。不能与本页六个教学阶段混用。
- 已复现 P1：idle/第一个 Draft 阶段，右侧仍显示最终“本轮提交”及已验证数量；DSpark 验证行在 idle 已着色为接受/拒绝。终态预设与当前执行状态未分离。
- 已确认 P1：DSpark 画了 anchor + 4 masks → 4 logits；原论文 §3.1 明确使用 anchor + (gamma - 1) masks → gamma logits。该输入沿用了 DFlash 描述，未体现 DSpark 的位置调整。
- 已确认 P1：DSpark `verifyBudget` 按场景固定为 3/2；两场景 confidence 完全相同，SPS 柱高 `[78,92,100,88]` 也相同，未参与调度计算。伪代码的 unrestricted argmax 还遗漏原论文的因果 early-stop；如采用生产异步版本，需解释历史容量与当前候选排序的区别。不能据此声称完整复现无损调度。
- 已确认 P1：EAGLE Target KV 仅按 `index < acceptedDraftCount` 将前四槽提交，槽没有 candidate ID 或 gather 映射。当前压平序列的接受位置实际为 0/1/3/5；若槽对应验证输入顺序，0/1/2/3 不正确；若意图表示压紧后槽，则缺少重排过程和语义标注。
- 已确认 P2：Draft 权重所有分组共用 `active: draftActive`，DSpark Markov/Confidence/调度阶段仍同时点亮 backbone；Markov 四位置同时变色，EAGLE 扩树一次显示全部节点，尚未呈现逐深度/逐位置依赖。动态 Top-k 选中的 level-2 父节点为 e3/e4，而固定树的 level-3 子节点来自 e3/e7，固定拓扑并非该选择过程的计算结果。
- 已确认 P2：上方竞速按固定周期成本/固定提交数量切 `OUTPUT_STREAM`，下方只演示一轮。低接受率 EAGLE 下方输出 predict/generate，上方仍输出 predict/the/future/of；不是同一条多轮轨迹。成本估计是教学假设，不能做算法性能排序依据。
- 已确认 P2：准确性仅有文字解释，接受/修正公式常量未在当前页面渲染；没有 p/q、随机数、首拒后的残差采样证据，也未明确 greedy 输出一致与 stochastic 分布一致的区别。
- 渲染证据：1280px 实际视口，EAGLE 工作台 clientWidth=687、scrollWidth=843；树卡 clientWidth=685、scrollWidth=842。截图中右侧 Mask/说明被裁出可见区域。外层 310px 列和内层 560px+260px 最小列宽同时在 xl 生效，内层未按可用容器宽度重排。Draft 核心文字使用 6–8px，压缩空间已损害可读性；Mask 没有行列 token 标签或节点联动。
- 验证：浏览器检查中文 EAGLE/DSpark 代表态与低接受率状态、单步及完成状态；EAGLE 低接受率竞速在 t=6 输出 6/6 后停止；页面 console error/warn 为空。`npm run check:speculative` 通过，但该脚本主要验证固定计数，不能排除以上教学/身份映射缺陷。本次未改产品代码，未重复生产构建；未复测移动端/英文，不将历史通过记录当成本轮证据。
- 建议下一轮验收：加入带框架口径的深度/宽度/验证预算控制，所有候选、Target 输入、接受路径、KV 和时间线由同一轮事件模型派生；DSpark 使用独立的块长与负载/调度语义。先修正生命周期、输入数量和槽位身份，再补参数交互和响应式可读性。

### 2026-09-06 参数、接受率与统一执行模型修复

- 变更契约：本节落实上一节审查与用户“接受率也体现出来、这些问题都改掉”的要求。保留竞速 → 左侧模型关系/右侧算法轨迹 → 原理/伪代码的区域顺序与左右关系；未恢复冗长架构抽屉。能力为 timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。
- 参数口径：EAGLE-2 的展开步数、Top-k、验证容量采用 SGLang 命名并标出 anchor 占位及 Top-k=1 约束；DSpark 独立展示块长。教学阶段不再冒充 Draft steps。改变参数会重建候选与事件、重置竞速及当前轮；语言切换不重置执行。
- 接受率：可调的是合成的预期单步匹配水平，并非部署中的直接验收阈值。实际采用率由已接受 Draft / 实际送验 Draft 派生，分母包含树旁支和首拒后后缀，排除 anchor 与 Target 补发。分别展示本轮、累计和平均新增长度；零送验为无定义，不伪装成 0%。高/低接受快捷设置与模型共用输入。
- 生命周期与跨视图：使用同一确定性多轮事件模型驱动上方计时与下方选择轮次，严格在 commit 完成后提交输出；idle 不揭示候选、最终 verdict 或输出。EAGLE 按深度展开，DSpark 按顺序位置执行轻量 Markov；仅对应权重/运行时组激活。下一轮以同一 Target 补发 token 为 anchor。
- 技术依据延续上节原始来源：EAGLE-2 §4 的动态 Top-k 与路径乘积选取；DSpark §3.1 的 anchor + gamma-1 masks → gamma base logits，及 §3.2.2 的非前瞻连续前缀停止。DSpark 三词 logits 切片展示前一 token → 转移偏置 → 当前 logits；confidence、生存概率、归一化 Target 成本与吞吐真正参与因果调度，首次不改善后不再读取未来行来反悔。
- KV 修复：临时槽绑定实际 candidate ID，保留 root + 接受路径，显示 gather → 新 Prefix 的压紧映射并回收其他槽。输入编号从 1 起算，目标索引从 0 起算，页面明示。Target 补发 token 不冒充当前槽 KV，下一轮验证才生成它的 KV；Draft 上下文明确与 Target KV 分离。
- 准确性证据：主轨迹为 greedy，所有输出与固定 Target 流一致。新增独立三词 p/q 拒绝采样实验，可调候选、接受随机数、残差随机数；显示正残差分布和最终概率质量守恒。它不声称复刻 EAGLE 树的随机采样实现。90% 示例 C 被拒后，残差抽样 0.37 输出 A、0.99 输出 B；quality=100 时无拒绝。
- 布局：移除遗留静态组件与 6–8px 核心文字。树/Mask 按真实容器宽度重排；Mask 标注行列与 token，节点联动高亮祖先路径。最大树采用逐层均匀排布，将宽度从 2808 收紧至 936px；窄屏初始居中根节点，树内部保留必要滚动。修正 KaTeX 容器 1–3px 溢出造成的小滚动条。
- 浏览器证据：1280×900 中英桌面，页面 body=1265px，工作台无横向溢出；最大树只在自身 683px 容器内滚动 936px 内容。390×844 英文 EAGLE/DSpark，body=375px；最大树容器 307px、根节点屏幕 x=140.5px，页面无外溢。KaTeX error 元素为 0。中文默认树节点 `future` 点击后 Mask 可见路径为 predict → the → future；完成后 KV 输入编号 1/2/4/7 对应新 Prefix 索引 3/4/5/6，Prefix 3→7，下一轮 anchor 为 language。
- 运行证据：默认 EAGLE 90%、steps=3、Top-k=2、容量=8、load=1，在归一化 8 时间单位后输出 12 vs baseline 8，累计 9/21=43%、每轮新增 4；此处 43% 是包含旁支的采用率，并非与 90% 参数相矛盾。最大树、0% 匹配输出 2 vs 8，采用 0/30；DSpark 0%、load=8 输出 5 vs 8，调度仅验证 anchor，接受率为 — (0/0)。DSpark 高接受第一轮送验 4、接受 4，输出 the/future/of/language + Target with。两侧计时到预算后停止，不继续扩大差距。
- 自动验证：`npm run check:speculative` 覆盖 180 组参数、逐事件/跨轮/KV 身份、因果 early-stop、输出一致、101 组采样概率及实际残差输出；全部通过。convention checker 9/9、0 warning，8-case/6-dimension QA matrix 通过。Vite production build 1899 modules 通过；沙箱内 esbuild 读配置权限不足，获准在外部运行构建后成功，仅有现有 Browserslist 数据过期提醒。`git diff --check` 无空白错误。
- 边界：合成 token、概率与归一化成本，不加载 checkpoint，不作为 EAGLE/DSpark 性能排行榜；confidence 使用教学近似，不是经训练校准的预测器；DSpark 仅模拟单请求因果调度，不包含生产异步队列与性能 profiling；不包括 prefill、训练和批处理收益。本轮未重新采集浏览器 console 日志，不沿用上一轮空日志作为新证据。已完成视觉与 DOM 交互检查、构建和模型回归；真实硬件/模型 benchmark 不在此次教学模块范围内。

### 2026-09-06 配置与运行结果分离、参数区精简

- 用户确认的修正：删除顶部预期接受率、引擎负载、高/低接受示例；EAGLE 只保留 steps / Top-k / 验证容量，DSpark 只保留 `block_size`。保留竞速、模型总览/算法工作台、原理/代码的区域顺序与控制位置；本次为 repair，不重做页面结构。按交互模块规范将派生结果与独立配置分离，并使用渐进披露压缩说明。
- 来源与边界：延续前一轮已核对的 SGLang speculative 文档；DSpark 英文名称来自 [DeepSpec 官方模型配置](https://github.com/deepseek-ai/DeepSpec/blob/main/config/dspark/dspark_qwen3_4b.py) 的 `model.block_size`，并非虚构的 SGLang 启动参数。顶部标注运行时配置/模型配置，DSpark 详情说明现有 checkpoint 的块长不能任意修改。调度保留固定教学成本曲线，不再把模拟 load 作为主页面输入。
- 固定样例：删除主模型 quality/load/scenario 输入及随机匹配生成；按绝对输出位置读取固定候选 rank 与独立 confidence 表。验证容量不能改写候选，DSpark 延长块不能改写已有位置。步数、宽度、容量仅改变展开/送验范围，实际接受数量、利用率与输出由验证派生。后续轮次沿同一 Target 序列继续，不因 round index 换一组“正确率”。独立拒绝采样实验使用固定 p/q，不再暗中依赖顶部参数。
- 指标：移除“预期 vs 实际”双条，只保留实际接受率（明确候选利用率口径）、已接受/已送验数量及动态条；累计利用率和平均每轮新增仍由实际完成轮次计算。模型回归确认：depth=3 时 Top-k=1 接受 2/3，Top-k=2、容量8 接受3/7——接受数量增加，比例却下降，不把比例当成唯一优化目标。
- 文案与披露：每项默认显示中文名、英文参数名、一句用途；原细节移入默认关闭的原生 details，可鼠标或 Enter 展开。仅展示当前算法的来源标签和内容；切换语言、展开说明不重置轨迹，改变配置重置两条播放及轮次。桌面基线参数区为208px/5个滑块，修复后163px/3个滑块（约缩短22%）；DSpark为163px/1个滑块。
- 浏览器证据：1287px中文及1280px英文桌面复核精简/展开态；390×844中英文EAGLE/DSpark复核，body=375px，无页面横向溢出。最大树936px仅在自身307px容器内滚动，工作台无外溢；桌面body=1265px。浏览器确认EAGLE单链完成后2/3=67%；DSpark block_size=2为2/2=100%，block_size=8生成8个候选、调度在第5个停止、实际送验4/接受2=50%，后续调度行显示未评估。默认EAGLE竞速到8单位后输出9 vs baseline8并停止，累计6/21=29%、每轮新增3。KaTeX error节点为0；本轮重新读取浏览器console error/warn为空。
- 回归：模型脚本更新为53组实际配置组合（45组EAGLE、8种DSpark块长），并新增旧quality/load输入无效、容量不改写候选、块长保留前缀、接受数量与利用率反向变化、仅结果展示、DSpark真实字段及默认折叠断言。逐事件/跨轮/KV身份、调度因果性、贪心输出一致、101组严格采样质量守恒继续通过。convention checker 9/9、0 warning；8-case/5-dimension QA matrix通过；Vite生产构建1899 modules通过，仅现有Browserslist数据过期提醒；git diff --check无空白错误。
- 限制：固定教学样例与计时，不是实测checkpoint性能或参数效果预测；DSpark confidence是固定合成模型证据，不是由实际接受结果反向生成。保留单请求因果调度范围，不扩展到生产异步队列。本节取代上一节可调接受水平/负载的产品设计与对应验收口径，历史结果仅作为改动前记录。

### 2026-09-06 标题、执行讲解与接受率可发现性

- 变更契约：修复用户提出的标题不清、伪代码难懂、来源说明冗长及接受率找不到。按 develop-interactive-module 保留竞速 → 左侧模型/右侧算法轨迹 → 左侧采样/右侧代码与参考的结构，不改候选、调度、计时和验证规则。影响维度为算法、执行阶段、披露状态、语言、视口；复用现有 reset/play/next 样式，在代码区域补充同一时间线的控制入口。
- 标题：三块改为“解码效率对比”“Draft–Target 协作与验证”“拒绝采样与分布一致性”，英文对应同步；副标题解释上下文，不再把多个教学问题堆进标题。
- 接受率：上方参数区下方显示累计接受率，下方轨迹控制下面显示本轮接受率；每处同时展示接受/送验 Draft 数量，明确竞速已完成轮次与当前选中轮次的不同范围。验证前用破折号，不预告结果。本轮新增 Token 仅在提交完成后出现；累计平均新增长度仍从已完成轮次派生。统计口径默认折叠，说明包含树旁支与拒绝后缀、排除 anchor 和 Target 补发，不把比例当速度指标。删除原树底部重复的微小百分比/利用率条。
- 代码讲解：默认只显示当前执行步骤、简短操作解释、多行伪代码及本步实际数据。原生步骤选择器可跳转同一 canonical timeline，并暂停两处播放；完整伪代码收在 details 中。模型派生 guide 而不存第二份代码阶段。EAGLE 展开逐深度、DSpark Markov 逐位置使用同一事件映射；DSpark 贪心路径使用 argmax，保持与画布一致。伪代码显式展示 KV reserve、Target dispatch、接受路径、gather/release、输出及 Draft 特征同步，但清楚标为不可直接运行的简化操作。
- 参考区：改为“演示边界与参考”，固定显示简短的合成数据/非 benchmark 边界。只显示当前算法论文、当前配置来源和严格采样论文，并逐项标明解释的是树构造/因果调度、配置约束或接受/残差规则。更多单请求调度及未覆盖训练、prefill、批处理/异步范围放入默认折叠说明。沿用前轮核对的权威来源，不增加新的算法性能结论。
- 浏览器行为证据：EAGLE 接受阶段的数据为 the/future/of，3/7=43%，新增输出仍为 —；commit 阶段仍不输出，完成后显示 the/future/of/language 共4个。DSpark Markov 首位置只显示 the，接受阶段为2/4=50%，完成后输出 the/future/of 共3个。切换算法清空接受结果，并切换代码、参考链接；切换语言和披露状态保留进度。手动选择 EAGLE 接受步骤后，两处播放的 Pause 按钮数量为0。默认竞速8单位停止，9 vs 8 Token，累计6/21=29%、每轮新增3.00，与选中第一轮43%分开呈现。
- 渲染证据：1287px中文、1280×900英文桌面和390×844中英文EAGLE/DSpark检查了新标题、接受率条、当前代码、完整代码及来源披露；桌面body=1265px，手机body=375px。所有代码块 scrollWidth 等于 clientWidth，未出现页面级横向外溢；KaTeX error=0。手机英文参考解释自然换行，不挤占链接；中文当前代码在窄屏自然换行。重新采集浏览器 warning/error 日志为空。
- 自动验证：53组参数及逐事件/跨轮/KV、调度因果性、输出一致性、101组采样质量守恒通过；新增 guide idle 不泄露未来、事件索引映射、逐深度候选、接受数据及提交前无输出断言。convention checker 9/9、0 warning；更新8-case/5-dimension QA matrix并通过。生产构建1899 modules成功（esbuild 沙箱读取父目录受限，获准外部构建后通过），仅现有 Browserslist 数据过期提醒。
- 限制：接受率是固定教学轨迹的实际统计，不是真实 checkpoint 实测；步骤选择是教学回放定位，不是在线执行模型。完整伪代码不声明复刻所有生产引擎细节。此次未提交或推送。

### 2026-09-06 按“效果 → 正确性 → 实现”重排

- 授权与范围：用户明确同意调整信息架构。本次属于限定范围的结构重排，取代上一节固定的三块阅读顺序；保留效率竞速、模型/KV与算法轨迹的左右结构、全部参数、接受率、节点选择和共享时间线。使用 develop-interactive-module 的分层与渲染检查规范，不改 canonical model 或任何算法结果。影响算法、执行状态、披露状态、语言与视口。
- 层级：页面只有三个主内容 h2，依次为“解码效率对比”“正确性原理”“协作验证与实现”。正确性先简述 Draft 提议、Target 决定，再区分相同贪心规则下的输出一致与严格随机采样的分布一致；原“拒绝采样与分布一致性”降为原理小标题，配合原有三词实验。说明明确主轨迹采用贪心验证、三词实验独立、不保证每次随机文本一致，沿用已有质量守恒模型和此前核对的论文依据。
- 实现归属：ExecutionGuide 从原理旁边移入 Workbench 内部，紧随模型/轨迹画布；保留步骤选择、播放、逐步、重置及实际数据联动。桌面把步骤说明与代码/数据分成两列，手机保持说明 → 代码 → 数据。资料单独放在页面最后，不再与原理平级并排；语义 DOM 顺序与视觉顺序一致，没有依赖 CSS order。
- 基线与空间：修改前1287px中英文结构为竞速 → 协作 → 采样与代码并排，捕获EAGLE完成态和DSpark idle底部截图；本次重排后1280px中文正确性块约446px，英文约480px，EAGLE英文接受步骤代码区约247px。代码不再与独立采样实验争夺同一行的阅读顺序。现有310px模型列未扩大，树/Mask内部分布与KV卡不变。
- 交互证据：DSpark手动定位接受阶段，轨迹显示10/11，代码数据the/future，接受率2/4=50%，提交完成才显示the/future/of。采样候选从C改A后阈值变为1.000并直接接受，算法阶段仍10/11；再切英文保留采样候选A。EAGLE接受步骤显示the/future/of，完成显示4个输出与3/7=43%。从代码启动播放再选择步骤，两处Pause按钮数归零，说明共享时间线仍正确暂停。
- 响应式与日志：1280×900桌面、820×1000平板、390×844手机检查，body分别1265/805/375px，无页面横向溢出。中英正确性说明、实验表、实现内代码、完整代码展开与末尾参考均保持顺序；检查的data-testid区域和pre无意外内部溢出，KaTeX error=0，浏览器warning/error日志为空。
- 回归：新增源码结构断言，约束Race → Principles → Workbench → References以及代码属于实现、正确性不混入代码。53组模型配置、逐事件/KV/调度/输出一致性和101组采样质量守恒继续通过；更新8-case/5-dimension QA matrix通过；convention checker 9/9、0 warning。Vite生产构建1899 modules成功，仅已有Browserslist数据过期提醒。
- 限制与交付：仅重新组织教学内容，未添加真实checkpoint推理或硬件benchmark；原有固定数据、归一化计时、DSpark单请求调度边界不变。保留此前未提交修改；本轮未提交或推送。

### 2026-09-06 正确性原理：先看具体例子，再看公式

- 变更契约：用户认可三块布局，但无法理解正确性文字。本次为局部教学修复，保持效率 → 正确性 → 实现顺序与正确性区域两列结构，只替换原理区的默认信息。能力仍为既有timeline、多模式、结构比较、指标、数据流、密集布局与数学；不增加自动播放时间线。独立的验证/概率纠正按钮是局部展示状态，候选、接受路径和概率全部从纯模型派生。
- 基线：1287px中文截图中，左列为贪心/随机采样段落及p/q、残差公式，右列为0.645/0.195/0.160概率表及两个随机数滑块。核心缺陷是读者在看到一次具体纠正前就必须理解数学术语。
- 贪心例子：复用主模型DSpark块长4的首轮固定数据，只用于共同原理示范。已有上下文Large models can predict；Draft猜the/future/many/different。初始不揭示判定，点击Target验证后前两个保留、many改为of、different划掉作废，最终输出the/future/of。文字解释后缀依赖错误前缀，不能留用；相同贪心规则下猜错影响工作量，不让错词进入输出。不是随当前算法切换的额外实测轨迹，页面明示独立示例。
- 随机例子：固定同一位置Target概率70/20/10与Draft概率60/20/20，用整数百分比和同一0–100%比例尺替代默认p/q表。纠正前显示直接采用60/20/20；点击后显示保留概率60/20/10加拒绝后补回10/0/0，最终70/20/10。C提议以50%概率保留，拒绝后从正残差抽样；本例只有A缺额，故补给A。页面明确概率一致不是每次词一致，也不是固定次数配额。来源沿用已有严格推测采样论文；没有引入近似配额算法。
- 模型与细节：抽取原有sampleDistributions供旧质量扫描与新整数例子共用，不更改竞速、主轨迹、KV或接受率。修正零测度随机边界为draw < threshold，与公式接受规则及页面“低于”一致，新增0.49/0.50边界回归。原生“试一次抽样”保留候选与接受随机数控制；本例拒绝后只有A，不保留无效的残差随机数滑块。接受/补采样公式、变量解释及非前瞻调度边界仍可展开，默认均收起。
- 浏览器证据：验证后状态match/match/reject/discarded、输出the/future/of；纠正表由60/20/20变70/20/10。单次C在draw=.75下阈值50%、拒绝后输出A；改选A阈值100%、直接接受。复位恢复pending且不改下方0/8时间线；语言及EAGLE/DSpark切换不破坏独立示例状态。1280/1287px桌面与390px中英文窄屏检查前后、抽样/公式展开与折叠；页面body为1265/1272/375px，无页面外溢；已有EAGLE树保持局部滚动，公式无KaTeX错误。修正窄屏表头中文拆字与Token列间距。
- 回归：53组主模型配置、逐事件/KV身份/调度/输出一致性、101组旧采样质量守恒继续通过，新增贪心显示生命周期、整数概率质量分解、C接受/拒绝边界、旧函数引用和公式默认折叠断言。新增correctness-qa-matrix.json，8case覆盖语言×视口、示例前后×视口、披露×视口；检查器通过。convention checker 9/9、0warning；生产构建1899modules成功，仅现有Browserslist提醒。
- 运行日志：分步编辑期间HMR曾命中尚未替换的旧deriveSamplingModel调用；最终组件已统一使用导入的deriveCorrectnessExample。完成后用独立新页面重新加载、验证、概率纠正及切换DSpark，warning/error日志为空，不把旧标签的历史日志当作当前错误或忽略不记。此次未提交或推送。

### 2026-09-06 补齐 Target 概率来源与接受判定

- 用户问题：probability是否是log probability、Draft概率较高是否一定拒绝，以及Target概率从哪里获得。本次遵循develop-interactive-module做局部补充，不更改已认可的章节顺序、正确性两列、原有纠正例子或下方实现与竞速模型。
- 证据依据：上轮回答已核对Leviathan等原论文§2.2、§2.3及Algorithm1：p/q是相同前缀下、按采样规则调整后的分布；q不高于p必收，q高于p按p/q保留；已给定候选前缀允许并行计算Target的多位置条件分布。页面新增明确的上下文/候选 → Target Transformer → LM Head logits → Softmax全词表概率 → 候选项 → log probability链路，不把概率说成Draft估计，不把一次前向说成不运行Target。
- 位置与因果关系：在左侧现有例子下补充四行映射，predict→the、predict the→future、predict the future→many、predict the future many→different。完整上下文由模型中的已有prefix与严格更早候选派生，不包含当前或未来候选。强调四行属于一次前向，各位置仍通过所有Target层；因果Mask限制可见范围。点击原有验证按钮后前三行保留用于验证/纠正，基于被拒many前缀的第四行划掉作废。此处展示预计算分布的可用性，不把它误当成候选接受标记。
- 概率与log对照：右侧新增可见候选选择器，与原有单次抽样选择器共享proposal状态；模型派生selectedP/Q、自然对数logP/Q、alwaysAccept与阈值。A显示70%/60%、-0.357/-0.511、100%；B显示20%/20%、相同-1.609、100%；C显示10%/20%、-2.303/-1.609、50%，明确不是直接拒绝。原始logits不可跨模型直接比较。Softmax/logsoftmax、概率接受式、log差接受式与残差式均用MathFormula，在已有数学详情内展示，并标注温度1/无截断及实际采样规则边界。
- 渲染与交互：1287px中文基线与新增内容截图、1280px英文桌面、390px中英手机核对。页面body分别1272/1265/375px；手机Target来源区域与位置表均309px、接受判定区283px，scrollWidth=clientWidth，无新增区域溢出。展开公式KaTeX error=0。C切B时单次抽样候选同步成B；概率为相等时接受100%；验证后最后一行data-usable=false，其余true。三个主h2与原有布局顺序未变。
- 自动验证：新增上下文排除当前/未来词、readout错位映射、首拒后分布失效、概率与自然对数往返、exp(logP-logQ)与原阈值一致、A/B/C三种比较分支回归。53组主模型配置与101组采样质量守恒继续通过；convention9/9、0warning；更新8-case/4-dimension正确性QA矩阵并通过。Vite生产构建1899modules成功，仅现有Browserslist提醒。旧标签仍含上一轮已记录的旧模块URL错误，独立新页面完整加载、验证、选B及切DSpark后warning/error为空。
- 边界：数值仍是固定三词教学分布，不声称运行真实checkpoint；句子位置映射用于解释同一机制，不把三词概率表伪装成该句的实测logits。竞速、算法结果、接受率口径和KV行为均未改；未提交推送。

### 2026-09-06 保留内容的纵向密度压缩

- 变更契约：用户明确要求内容保持不变、减少各块纵向占用。本次仅调整本模块排版：三章顺序、正确性两列、模型/算法左右关系、代码归属、所有文案/公式/控件/默认披露与运行模型均保持。按develop-interactive-module规范先固定1280px与390px测量基线并截图，再在相同参数、阶段、示例与披露状态下比较。
- 压缩方式：外层卡片padding16→12px、内部常见padding12→10px，12px段间距改8px、8px间距改6px，说明段落line-height从1.625改1.5；字体大小不变，播放按钮仍34×34px。页面侧边留白适度缩小，增加内容宽度、减少不必要换行。宽屏两条竞速改等宽并排，在同一时间预算下比较，手机保持上下排列；不改两条轨迹或计时。EAGLE层间距82→72px，节点仍56px高，留下16px间隔；树宽、节点身份、连接、Mask和局部滚动不变。
- 同态内容核对：浏览器保存修改前整个spec-page的textContent，修改后EAGLE桌面、DSpark桌面、DSpark手机三份逐字比较均true；不新增隐藏/折叠，也没有删除说明来制造变矮效果。此次产品文件仅修改JSX布局类、树的纵向坐标和模块CSS，未改模型或翻译。
- 高度证据：1280px中文EAGLE整页3485→3009px（约减少14%）；四区分别758→562、1026→901、1329→1229、188→172px。DSpark整页3480→3005px。390px中文DSpark整页6050→5462px（约减少10%）；四区883→812、1878→1669、2826→2586、227→190px。基线正确性示例已验证、概率示例与展开状态原样保留，不与别的状态混比。
- 密集态与响应式：1280px英文EAGLE steps5/top-k3/budget16完成态，最大树936px内容在707px容器内滚动，6层高度448px；节点56px、相邻层72px，截图未见重叠。390px英文最大EAGLE与DSpark block8检查完整代码及公式展开，代码scrollWidth未超过clientWidth，KaTeX error=0，body375px。DSpark表格保持原有局部滚动，block8完成仍2/4=50%、新增3Token；EAGLE默认完成仍3/7=43%、新增4Token。手机竞速单列325px；桌面两列等宽，章节顺序不变。
- 验证：原53组主模型/事件/KV/调度/输出一致性和采样回归通过；convention9/9、0warning；新增density-qa-matrix.json，6case覆盖算法×视口、语言×视口、默认/密集内容×视口，检查器通过；Vite生产构建1899modules成功，仅现有Browserslist数据过期提醒。未提交推送。
- 运行日志：独立新页面加载并进入推测解码模块后，浏览器warning/error为空；旧标签历史HMR记录不作为本次运行结果。

### 2026-09-06 新章节：量化与低精度推理

- 变更契约：用户批准四区大纲，并明确聚焦推理部署的离线权重量化、在线激活/KV量化。本次为新增章节，不重排已有模块；新增首页卡片、侧栏入口、README与模块目录记录。基线已核对首页/路由不存在量化页，并截图记录相邻推测解码工作台；工作区起始干净。遵循 develop-interactive-module 的全部四份参考，以微型真实数值计算驱动可视化，不以硬编码准确率或虚构速度驱动动画。
- 能力：timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。四区为作用位置/容量 → 数值表示/误差 → 离线算法 → 在线执行。全局格式影响容量、数值实验、线性运行路径；KV精度独立且两处控件同步；样例在数值/算法/运行时共享。算法模式、步骤与运行步骤是局部实验，离线算法实验不隐式替换在线RTN权重。页面对此边界明确标注。
- 控件契约：标题、主格式选择与目标语言按钮在顶栏；离线/在线重置、播放、单步各在本区标题尾部，与相邻模块34px图标按钮一致。单步执行高亮操作，矩阵显示已完成步骤结果；到末尾停止并禁用下一步，检查阶段会暂停。修改数据样例重置两个局部时间线；切换全局格式/KV精度重置在线轨迹；语言切换不改变数值状态。容量batch/context/阶段只影响本区。

| 教学主张 | 一手依据与边界 | 模型与可见证据 |
|---|---|---|
| 低精度表示有scale、舍入、饱和与元数据 | TensorRT Working with Quantized Types（2026-08页面）；对称示例使用窄范围整数码，FP8为E4M3FN；不声称覆盖所有后端编码 | quantize使用nearest-even，FP8枚举127个非负有限码含subnormal；选择格子、改变分组/裁剪/非对称映射，同步改变重建、数轴、scale、zero point、字节和MSE |
| AWQ通过激活感知的通道缩放控制权重误差 | AWQ arXiv:2306.00978v5；11点指数搜索，没有完整裁剪搜索 | 校准数据实际决定通道尺度；等价缩放前后输出相同，量化后计算误差，不保留所谓1% FP16权重 |
| GPTQ将量化误差补偿到未固定列 | IST-DASLab/gptq/gptq.py；固定列序、静态逐行scale、1%阻尼，小矩阵顺序Schur消元实现，非原仓库block优化 | 输入Gram矩阵加阻尼求逆；每步固定一列并更新剩余列；3行的已固定边框每步增加3个，已固定值后续不变 |
| SmoothQuant转移激活量化难度 | SmoothQuant arXiv:2211.10438v7；展示通道缩放+逐行INT8，不做算法质量排名 | alpha改变X/W尺度，两者乘积在量化前一致；之后实际量化两者，显示输出MSE；部署产物声明必要图变换 |
| 在线量化与动态scale不是同义词 | TensorRT quantization workflows 与 vLLM v0.20.1 Quantized KV Cache；本例KV每token/head FP32 scales，不泛化为引擎默认布局 | 切换固定/动态scale后仍有在线编码步骤；放大后续输入时固定scale保持不变并裁剪，动态scale变化；K/V只在commit后增长且旧slot的值与scale保持 |
| 位宽压缩不直接等于端到端加速 | 原论文均基于指定实现/硬件；没有在此运行GPU | 容量按字节计算；权重理想复用读量与batch/prefill联动但不作为实测速度。运行时区分W4 tile解包、INT8乘法/INT32累加、FP8乘法/FP32累加及高精度路径；JavaScript只模拟数值和依赖，不模拟累加硬件 |

- 数值与容量边界：12个8通道校准样本，3×8固定权重，输入离群通道为可切换合成数据；误差以全样本MSE计算，画面显示第一个样本。16位基线是JS高精度未量化参照，不模拟FP16舍入。容量示例为32层/4096hidden/11008FFN/GQA8×128，仅投影、MLP和已用KV，不含Embedding/Norm/Workspace/预分配；权重每128值FP32 scale、KV每token/head分别为K/V保存FP32 scale。微型矩阵的scale开销另行精确计数，不拿小样本元数据比例冒充实际大模型。
- 桌面交互证据：1280px中文默认W4权重+KV为3.06GiB，16位参照10.81GiB；数字格选择双向高亮，默认输出MSE约0.221。AWQ缩放后误差为数值浮点残差（UI显示0），完成后约0.019；GPTQ单步固定3格，自动播放到10/10固定24格、Replay可用且Next disabled；SmoothQuant完成约1.64e-4，alpha=1缩放后仍0。INT8固定scale约0.109，三次输入的裁剪数0/1/1，输出MSE约0.010/12.201/18.799。FP8 KV在write之前0槽、之后1槽24B，元数据与slot一起出现。
- 响应式与数学：已检查1280×900桌面、820×1000平板、390×844手机中英文，正文宽度分别1265/805/375px，无页面横向溢出。手机INT4分组2、非对称、30%裁剪、最后一格选择可用，payload12B+metadata60B，说明小矩阵元数据开销；平板16位误差为0且不出现量化配置滑块。FP8数轴为不均匀刻度，公式与整数路径分开；所有披露展开时KaTeX errors=0，检查的卡片、内部面板、格子和pre无意外溢出。公式超长时仅公式自身局部滚动。数值符号修复为真正的重建帽符号，防止JSX字面量双反斜杠被显示为hat字母。
- 自动验证：新增check:quantization，覆盖192个数值组合、1080个运行阶段快照，另含FP8可表示数往返与ties-to-even、无效group/scale保护、等价缩放、GPTQ已固定列不变、AWQ搜索包含RTN参照、KV提交身份/旧scale保持、容量独立性、语言键一致性和四区顺序。检查全部通过；原check:speculative回归通过。convention 9/9、0 warnings；6case/5dimension QA matrix通过。最终构建与干净浏览器日志见下方完成记录。
- 已知限制：此版本不执行真实checkpoint，不声称原论文全部复现，不输出任务准确率或硬件速度，不包含完整Attention算子/QAT/QLoRA。离线算法和在线算子为共享数据但独立的教学实验。源码与测试未提交推送。
- 完成记录：最终Vite构建1903 modules成功，仅已有Browserslist过期提醒；git diff --check无内容空白错误。独立新标签从首页进入量化，切FP8/KV并自动播放至6/6，提交1槽24B，warning/error日志为空。原标签的日志只包含此前已记录的旧SpeculativeDecoding HMR错误（2026-09-06 06:15、旧模块URL），未把它当作当前量化模块异常。原页面已重新进入量化，恢复默认参数/中文/收起公式/两个时间线待开始，未提交推送。

## 2026-09-06 量化：以 SGLang 为引擎主线

### 变更契约与能力

- 用户明确批准按 SGLang 改造引擎叙事。本轮是后半部分的授权结构调整：保留 01 容量与对象、02 数值实验、03 离线算法及已有控制/矩阵；用 04 SGLang 工作台替换无版本依据的通用在线时间线。03 增加产物与引擎格式的衔接说明，不冒称微型 AWQ/GPTQ/SmoothQuant 产物就是 FP8 checkpoint。
- 变更前在原浏览器记录了 1280px 的数值、离线、在线模块截图；原在线面板为两列、三个输入、独立线性/KV 场景。本轮保留紧凑两列工作台，窄屏纵向排列，启动/Prefill/Decode 共用一组局部播放控制。共用控件仅从主文件提取到 primitives.jsx，没有修改其他章节。
- 影响维度：四种部署路径、三种 KV 配置、共享离群输入样例、启动/Prefill/两次 Decode 的生命周期、语言、视口。部署/KV/输入变化重置轨迹；语言不改变模型；阶段定位暂停播放并确定性重建之前的提交状态。顶部精度明确只控制 01–02，SGLang 的部署配置独立。
- 能力：timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。唯一纯模型 deriveSGLangModel 驱动 resident weights、输入 scale、缓存地址、写入/读取、数值误差、代码与高亮；不存储重复指标。

### 主张、源码与可见证据

本轮固定 **SGLang v0.4.6.post5** 为可复核教学基线，不宣称最新版。上下文为普通文本 Llama、TP=1、page_size=1、SM90/CUDA 12+、原生 sgl-kernel（未强制 Marlin/vLLM 分支）、非 block FP8、FlashInfer。公开原始文件通过只读访问核对，不依赖二手概述。

| 主张 | 固定版本的权威依据 | 模型与画面证据 / 边界 |
|---|---|---|
| 量化绑定在线性层方法，而非额外模型 | [linear.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/linear.py)、[fp8.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/quantization/fp8.py) | 启动配置选择 Fp8LinearMethod / UnquantizedLinearMethod；BF16 路径没有激活转 FP8 操作 |
| BF16 权重可在加载后量化一次；已量化 checkpoint 则读取权重与 scale 后调整布局 | [loader.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/model_loader/loader.py)、fp8.py 的 create_weights / process_weights_after_loading | 加载时路径常驻样例由 48B 转为 24B 数据+12B scale，权重量化次数只变为 1；后续请求复用。已序列化路径本次权重量化次数为 0，显示转置后的算子布局 |
| 激活每次前向转换，动态逐行 scale 与 checkpoint 静态 scale 不同 | [fp8_utils.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/quantization/fp8_utils.py)、[fp8_kernel.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/quantization/fp8_kernel.py) | Prefill 显示四行，Decode 一行；动态逐行 scale，静态重复固定值。静态压力样例的最后一轮裁剪 1 个值、投影 MSE 约 136.448；仅为此微型输入，并非准确率 |
| 不应把 Prefill 与 Decode 强行画成相同步骤 | [flashinfer_backend.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/attention/flashinfer_backend.py) | 普通文本无前缀 Prefill 使用 ragged 包装器先对新高精度 Q/K/V 做因果 Attention，再写 KV；Decode 先写当前 KV，再 paged 读取所有已写前缀。Prefill 输出不受所选 KV 存储格式影响；源码其他 multimodal / 有前缀 / verify 路径不混入本例 |
| 缓存池预分配、地址分配、有效写入是三件事 | [model_runner.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/model_executor/model_runner.py)、[schedule_batch.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/managers/schedule_batch.py)、[memory_pool.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/mem_cache/memory_pool.py) | 固定 24B 可用数据预算，BF16 6 槽/FP8 12 槽；橙色 reserved、绿色 written、蓝框+地址文本提示当前读取。Prefill 分配4/写入0，写入后4；Decode 分配5/写入4，最后6/6 |
| KV scale 不在每个 Token 重新计算 | memory_pool.py 的 set_kv_buffer、[llama.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/models/llama.py) 的 load_kv_cache_scales、[server_args.py](https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/server_args.py) | 示例用文件加载的固定层 KV scale（同一个 K/V factor），跨 Decode 不变；未提供 factor 的路径为有效 scale=1，显示源码质量警告。未混用原通用实验 per-token scale 布局 |

### 修正与回归

- P1 已修复：初始设计错误选用 non-ragged Prefill 并假设所有阶段先写缓存；查完整分支后改为普通文本无前缀的真实时序。新增 Prefill-before-write / Decode-after-write、Prefill 输出与 KV dtype 独立的回归断言。
- P1 已修复：原微型 KV 校准范围无法覆盖刻意放大的 Decode 数据。PyTorch 的原始 FP8 cast 不等于饱和量化；将 KV 校准样例明确覆盖压力范围并留 25% 余量，所有当前 KV 值均处于有限范围，加入回归保护。不泛化为溢出可安全裁剪。
- P2 已修复：无 KV scale 文件时伪代码不再写除以可能为 None 的 layer.k_scale，而是直接 cast，说明有效 scale=1。Prefill 标题不再误写“读取 KV”。
- 页面操作：四种部署 × 三种 KV 组合共 12 条完成路径全部检查。基线 16/16，FP8 19/19；结束均为 6 个有效槽、0 个活动操作，下一步禁用。自动播放英文末轮到 Replay 状态并停止；阶段定位暂停、配置重置、之前写入的数据保持可复核。
- 视觉：1280×900 桌面中英文、820×1000 平板中英文、390×844 手机中英文检查。稀疏启动、Prefill 四行密集矩阵、Decode 完成态、展开启动命令/JSON/公式均已检查；无页面与卡片/代码的意外横向溢出，KaTeX errors=0。手机八列格子仍可读，配置选择器独占行；两列主区域按内容高度，不拉长短面板填白。
- 自动检查：check:quantization 保留 192 个数值组合、1080 个原数学模型快照，并增加 462 个 SGLang 快照；检查固定 scale、常驻权重、因果 Attention、地址分配/提交身份、代码路径及双语键。check:speculative 的 53 个参数配置回归通过。主模块 convention 9/9、0 warnings；保留区 6-case/4-dimension 与 SGLang 12-case/4-dimension QA matrix 均通过。
- 开发中提取共用控件的中间 HMR 状态短暂出现 Tabs 未导入的异常；最终导入已修复，需以最终独立加载结果判断运行状态，不把旧控制台记录抹去或当成当前通过证据。
- 范围边界：前两块数值实验、四种离线算法保留；引擎追踪本轮聚焦 BF16/非 block FP8，不虚构所有 INT4/INT8 算法共享同一 SGLang Kernel。QKV 仅一个 head、每个 Q/K/V 一维，JavaScript 计算不模拟 BF16 舍入/GPU 累加，也不满足实际 GPU GEMM 的形状要求。固定输入并非生成 Token；省略 RoPE、其余模型层、采样、并发竞争与前缀命中。24B 排除哨兵地址/元数据，非整卡用量，不测延迟或任务准确率，不声称加载峰值等于常驻内存。
- 最终完成验证：独立干净页面从首页进入量化，自动播放到 19/19，6 个写入槽及 6 个读取高亮、0 个活动步骤，重播可用；浏览器 warning/error 日志为空。最终 Vite 构建 1907 modules 成功，仅现有 Browserslist 数据过期提醒。原页面恢复中文、加载时 FP8 + 校准 KV scale，配置与公式收起。本轮没有提交或推送。

## 2026-09-06 量化：引擎数据流设计复查（未改应用）

- 根据用户最新反馈，本轮只审查第四块学习路径，未继续强化 SGLang 品牌、未修改应用代码。恢复本地 5174 预览服务。
- 当前页面截图及完整发现记录在 [quantization-review/review.md](artifacts/quantization-review/review.md)。1280×1100 中文桌面检查启动、Prefill QKV 投影、第二次 Decode 缓存读取三态；三个保存后的截图均已实际查看。
- 核心问题：纵向步骤高亮与右侧数值矩阵分离，缺少常驻权重、激活、Linear 和 KV/Attention 的共同数据流；缓存占用有真实变化，但旧数据保留、新增和读写方向不够显著。
- 建议保留原数值模型和引擎分支时序，第四块改为固定对象位置、动态数据连线、紧凑生命周期时间轴和次级对象检查器；实现品牌/源码作为可展开依据。前三块保持不变，等待后续改版决定。
- 审查边界：本轮非全配置回归、非移动端或完整无障碍检查；没有应用改动，因此没有将此前构建/测试记录当作本轮新验证。未提交推送。

## 2026-09-06 量化：固定数据流画布落地

### 授权范围与交互契约

- 用户明确要求直接实施上一轮建议。这次是第四块的结构重设计：保留 01–03 的布局、计算和交互，仅同步调整页面导语；保留第四块部署/KV 选择、四阶段定位、尾部播放控件与固定版本源码依据。
- 改版前实际查看加载时 FP8 启动、BF16 Prefill、已序列化动态 Decode、手机静态激活布局。上一轮三张完整基线截图仍在 artifacts/quantization-review/01–03；改版后对应画面为 04-redesign-startup.png、05-redesign-prefill.png、06-redesign-decode.png。
- 影响维度：四种部署路径、三种 KV 配置、共享离群输入、生命周期/播放、对象/激活行/KV 地址选择、中英文及视口。参数改变重置轨迹；对象选择暂停但不推进；行选择同步高亮转换前后同一行；语言仅改变呈现；播放/重置清理手动检查状态。
- 能力维持 timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。新增 deriveEngineFlow 从原 deriveSGLangModel 快照推导对象就绪/活动、可用连线、字节数、旧/新/目标 KV 地址；没有另存计数或数值。

### 主张到画面

| 原有技术契约 | 本轮可见证据 |
|---|---|
| 权重加载/准备后常驻，后续不重复转换 | Checkpoint → 加载准备 → 常驻权重固定在上排；后续权重到 GEMM 的复用连线激活，权重量化计数保持不变。磁盘矩阵与 GPU 转置布局分开检查。 |
| 每轮激活独立，静态 scale 也需运行时转换 | Prefill 四行、Decode 一行；BF16 64B → FP8 32B，Decode 16B → 8B，scale 元数据另计。行选择使两侧相同行同时加框，检查器展示原值、编码、重建值与实际 scale。 |
| BF16 基线没有激活转 FP8 的调用 | 步骤数量由 19 变 16，激活节点标明不转换，输入旁路进入 BF16 GEMM；KV 配置不被权重模式联动覆盖。 |
| 缓存池、预留、提交不同；旧缓存保留 | 固定预算下 6/12 槽；虚线预留、保留/新增文字、读边框并存；末轮只有地址 6 是新增，1–5 保留。点击地址检查该槽重建 K/V。 |
| Prefill/Decode 使用不同 K/V 来源 | 无前缀 Prefill 由 Linear 的新 Q/K/V 直接进入 Attention，随后写入；Decode 先写，再由 KV 池与本轮 Q 汇入 Attention。并未为了画面对称改变原分支时序。 |
| 框架源码是实现依据，不是首要学习内容 | 章节改名“量化在推理中如何生效”，主画布用对象和数据方向讲述；命令、JSON、当前调用、版本、硬件、数值边界收进次级披露。 |

所有技术来源、固定版本与简化边界沿用上一节已核对的 SGLang v0.4.6.post5 / FlashInfer 契约；本轮不增加未经核对的新后端，不声称实测性能。位宽条是数据载荷字节，不改变张量逻辑维度；减少动效偏好下停止流线动画。

### 验证与修正

- 纯模型：192 个数值组合、1080 个原生命周期快照、462 个引擎快照通过。新增断言覆盖单一活动对象、FP8/旁路连线、Prefill/Decode 来源切换、激活载荷、权重 payload+metadata、旧/新槽集合、地址不超过已分配、磁盘布局不被 GPU 转置改变、结束态无活动连线。
- 浏览器：四部署 × 三 KV 共 12 组均定位末轮并步进结束；最终 6 个写入、1 个本轮新增、6 个读边框、0 个活动节点，下一步禁用。验证自动播放到终点停止；共享输入切换后恢复 0/19 与空池；语言切换不改变进度；激活行 4 的高亮在两侧同步；KV 地址 6 可检查数值。
- 响应式：1280×1100、820×1000、390×844 中英文实际查看。修复手机英文和中等宽度英文的 prepare/weights/activation/linear 内容溢出，改为短标签和按内容需要的节点高度；再次测得页面无横向溢出，节点 scrollWidth/scrollHeight 不超过容器。源码、公式披露展开时 KaTeX errors=0。宽屏主数据图固定 500px 高，窄屏两列布线 800px；检查器不拉长填空。
- 交互可达性：使用原生 button/select/details、动态 aria-pressed/current、槽位状态文字和可见焦点样式；本轮未做完整键盘逐项或屏幕阅读器审计，不宣称无障碍合规认证。
- 回归：原推测解码 53 参数配置通过；module convention 9/9、0 warnings；原 12-case/4-dimension QA matrix 通过；最终生产构建 1910 modules 成功，仅既有 Browserslist 数据过期提示。构建首次被 Windows 沙箱拒绝读取父目录，正常权限重跑成功。
- 中间新增 CSS 尚未写入时产生一次 HMR reload error，已修复；另将非组件导出移到内容文件，避免组件热更新导出不兼容。最终独立页面初始/交互日志无 warning/error，不把旧 HMR 日志当成当前运行结果。
- 结果：前三块逻辑和布局保留，第四块按授权完成。当前仍是微型教学数值模型，不启动实际引擎、不运行真实 checkpoint 或 GPU kernel。未提交推送。

## 2026-09-06 首页英文索引与量化阅读性修正

### 最终变更契约

- 用户澄清：首页卡片与左侧索引使用原来的简短英文名，不随中文/英文切换，不使用正文的长标题。新增 MODULE_LABELS 单一来源，包含 LLM Inference、Parallel Strategy、Flash Attention、Flash Decode、Spec Decode、Quantization、Engram、Radix Cache、DP Attention、Linear Attention。正文标题和原来的语言初始化/切换行为保持不变；撤回中间误改的共享正文标题与全局语言方案。
- 量化保留四节顺序、前两节双列画布、后两节算法/引擎的执行逻辑。本轮只调整顶部精度控制、01 公式表达、02 分组与输入通道说明，以及 03 缩放柱的就地释义。未修改已有第四节数据流布局。
- 影响维度：四精度、四分组、两输入样例、选中权重、KV 精度/容量参数、语言和视口。指标与分组高亮来自 deriveCapacityModel / deriveNumericModel；没有增加重复计数状态。能力仍为 timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。

### 可见改进与验证

- 顶部四精度移到语言按钮旁；取消占满整行的灰色选项条。1280px 中文 header 高 100.5px、选项宽约 361px；英文高 120px。较窄空间自然换行，手机为紧凑两行选项。保留“仅作用于 01–02”的范围提示。
- KV 公式改为“元素数 → 位数换算字节”两步，用明确乘号、分数和变量表解释层数、batch、缓存 Token、KV heads、head dim、位宽。切换 KV16 → FP8，默认示例显示 128 MiB payload + 4 MiB scales = 132 MiB，变量位宽同步从 16 变 8；不混用第四节引擎的固定 scale 布局。
- 02 明确“输入通道是一列特征，输出通道是一行权重产生的一个输出”。第 3 输入通道用虚线框标出离群值；切回普通样例时框消失、原始权重不变、输出误差变化。Scale 解释为重建倍率/整数网格间距，保留范围解释为网格精度与截断误差的取舍。
- 同组权重底部连线随点击与分组改变；两张矩阵高亮总数依次为 48/16/8/4，对应每张矩阵 24/8/4/2 个权重。分组总数与元数据同步变化。16 位基线不再展示实际上未使用的 scale/zero-point 或分组提示，误差保持 0。
- 03 原来的缩放柱增加“输入列除以系数、对应权重列乘以系数”的简短说明，SmoothQuant 的迁移强度不被描述为越大越好。算法计算未改。
- 渲染检查：1280×1000、768×1000、390×844，中文/英文均实际查看。手机展开两条容量公式的 scrollWidth = clientWidth = 313px；KaTeX errors=0。两语言首页的 10 个标题逐项一致，与侧栏一致。截图为 artifacts/quantization-review/07–11；修正后的独立页面启动、切换语言和引擎单步 0/19 → 1/19 无 warning/error。语言切换保留当前进度。
- 自动验证：check-navigation 通过；量化 192 数值组合、1080 原生命周期和 462 引擎快照通过，新增选中组/成员数/容量变量与严格 KaTeX 渲染断言。module convention 9/9、0 warning。其余八个模块已有模型回归亦通过。refinement-qa-matrix.json 明确区分 32 个数值交叉组合与 6 个渲染尺寸/语言组合。
- 最终构建 1911 modules 通过；Windows 沙箱父目录解析限制使用经批准的构建权限重跑，仅既有 Browserslist 过期提醒。git diff --check 通过。未提交或推送；非真实模型准确率或 GPU 性能测试，未进行完整屏幕阅读器审计。

## 2026-09-06 量化第二、四节理解性与空间利用率复查（未实施）

- 范围：用户要求检查“为什么数据变小”、输入特征/共享 scale 的解释，以及运行时布局。按交互模块规范与截图审计流程核对当前页面和模型；本轮只诊断，不改应用代码。
- 当前截图：`artifacts/quantization-comprehension-audit/01-numeric-default.png`、`02-engine-startup.png`，1287×911 中文，均为本轮捕获并重新打开检查的原始视口图。详细发现、取舍和边界见同目录 `audit.md`。
- P1：第二节缺少 16-bit 存储 → 4-bit 编码 + scale 元数据的物理表示对比，标题“数值变小”也混淆数值大小和存储位宽。输入选择实际是教学激活样例，不是概率分布图；W4A16 下只改变输出误差实验，不改变权重编码/存储。参数先于因果解释出现。
- 当前纯模型复核：24 个权重的 16 位基线为 48 B；对称 INT4 载荷 12 B，分组 24/8/4/2 的 FP32 scale 元数据为 4/12/24/48 B，总量 16/24/36/60 B。最细分组反而大于基线，现有局部读数未直观对比。不得把精度/误差或总压缩收益写成无条件单调关系。
- P2：第四节当前高度 1005.5px；固定 500px 数据流画布对照启动检查器 293px、Prefill 检查器 242px，右侧明显留白。已在 UI 定位 Prefill 7/19 查看有数据状态，再恢复启动 0/19；保留原 AWQ 2/4 和参数。800px 窄容器画布仅做源码检查，本轮不冒充手机渲染验证。
- 建议契约（待授权）：第二节先展示位数/打包，再讲 scale 与分组，最后讲输入幅度如何放大误差；第四节保留真实数据流、KV 与阶段语义，压缩一次性加载区和多层控制条，按内容确定节点与检查区布局。不是通过更多文字或缩小字号解决。
- 本轮未运行新的生产构建/完整回归、真实引擎、完整键盘或读屏审计。只新增审计记录与截图，未提交推送。

## 2026-09-06 量化存储解释与运行时紧凑布局（已实施）

### 变更契约与能力

- 用户批准上一轮两项建议。本轮是第二、四节内部的局部结构调整；保留四节顺序、首页/侧栏英文索引、全局精度和语言控件，以及离线算法、部署路径、阶段跳转、播放、矩阵检查与 KV 槽位选择。未更换其他模块或更改真实引擎执行语义。
- 能力保持 timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。第二节不用虚构时间轴；用户选择位宽、分组、裁剪、映射、权重和输入样例后从 deriveNumericModel 同步派生结果。语言/披露/布局测量仅影响呈现；共享输入变化仍确定性重置下面两节进度。
- 第二节抽为 NumericWorkbench，移开最初的输入参数和完整矩阵；改为存储对比与单个数值还原并排，下面保留分组控制。完整矩阵/舍入设置、输入误差实验、公式均可展开，不删除对应能力。第四节将一次性权重加载压成窄条，检查区与 KV 在图下方并排；窄屏保持阶段与数据依赖的阅读顺序。

### 主张 → 模型 → 可见证据

| 主张 | 依据与边界 | 模型和可见结果 |
| --- | --- | --- |
| 省的是存储位数，不是权重数量或数值大小 | NVIDIA TensorRT Quantization Schemes；此处 16 位仅为容量参照，不伪造 FP16 舍入 | 同样 24 权重，用共同字节比例比较 48B 基线与编码 + scale + 可选 zero point；点击两条任意权重同步右侧值和二进制编码 |
| 低位编码需要 scale 才能回到原单位 | 对称整数、无符号 affine、E4M3FN 分开处理；不把 FP8 当 INT8 | 0.64 → 4（0100）→ 约 0.7029；动态数值公式、原值/重建点与误差。INT4 两个邻码装进一个 8-bit 容器；位序是教学布局，非某引擎文件格式 |
| 共用 scale 会改变元数据开销 | 每份 scale 按 FP32 4B；affine 另计每组 1B zero point。小矩阵元数据偏大 | 默认 12B 编码 + 12B scales = 24B；分组 24/8/4/2 总量 16/24/36/60B。分组 2 显示“反而多占 12B”；affine 同配置 72B。选中黄色 scale 与共享权重下划线同步 |
| 大输入可能放大相同权重误差 | 确定性 12×8 激活样例，非 Token 概率；图显示第一样本 | 共享刻度的输入幅度柱、可选通道、权重误差 × 对应输入 = 对该输出的贡献。W8A8 另外列出该输出的激活误差贡献；全部输出 MSE 仍由原模型计算 |
| 加载一次、激活逐轮变化、KV 保留/读写 | 原固定 SGLang v0.4.6.post5 / FlashInfer 教学路径未改变 | 数据流对象保持稳定；内容自适应 Grid + ResizeObserver 仅测量布局，纯 routeFlowEdges 将原依赖连到实际节点边界。没有为对称排版添加假阶段 |

主来源：https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/quantized-types-schemes.html 。加载、Prefill、Decode 的版本、形状与后端限制继续在第四节现有“实现依据、配置与边界”中披露。

### 渲染对比与回归

- 修改前查看四精度、四部署路径及手机基线；基线截图保存在 `artifacts/quantization-clarity/before-*`，同时沿用上一轮完整两节的当前基线。部署路径快速捕获中有渲染帧滞后的局部截图，不把这些局部图当作严格同态完整截图；关键高度比较使用明确状态的基线记录。
- 桌面 1287×911 中文默认：第二节 744 → 660.32px；第四节 1005.5 → 850.09px。第四节原 500px 固定主图 + 独立右栏，改为 417.59px 内容驱动画布（包含检查区）；加载节点 130 → 63.5px，检查区 167px，不再留一个半空右侧长栏。
- 手机 390×844 中文默认披露关闭：第二节约 1353.32 → 1089.32px；第四节约 1829.5 → 1562.17px。密集 Prefill 和英文文本按内容增高，未用固定小高度裁掉数值或缩小全部文字。768px 平板使用两列运行图，权重复用线经外侧进入 Linear，KV 写入/读回方向保持正确。
- 浏览器：四精度 × 中英文 × 390/768/1287 共 24 个组合核对模块仍在 Quantization、编码长度、页面/核心组件无溢出。一次快速跨断点循环被侧栏过渡干扰而离开模块，已通过可见导航恢复并分宽度重跑；该中断不记为通过用例。代表性图包括 `after-numeric-desktop-zh.png`、`after-numeric-mobile-zh.png`、`after-numeric-mobile-en.png`、`after-engine-startup-zh.png`、`after-engine-prefill-zh.png`、`after-engine-tablet-en.png`。最终桌面两图重新从本地打开确认。
- 浏览器：四分组的总量和 bit pattern 同步变化；affine 元数据单独计价；原始矩阵选择能定位输入柱及误差贡献；输入切换保留权重编码并重置下面进度；默认每条存储条仅一个 Tab 入口，并实现左右方向键选择（代码/焦点 DOM 检查，不宣称完整键盘审计）。
- 浏览器：四部署 × 三 KV 共 12 条路径均跳转最后 Decode 后逐步执行到终点：6 已写、6 读取、1 新槽、0 活跃节点，下一步禁用且节点/检查区无溢出。最后一轮自动播放结束后保持 19/19、Replay，无活跃节点。手机英文展开矩阵、源码与 scale 公式时页面/核心组件无溢出、KaTeX error=0。
- 模型：192 数值组合、1080 原生命周期快照、462 SGLang 快照通过。新增 INT4/INT8/FP8 bit pattern 往返、payload/scale/zero 总量、分组收益反转、输入不改权重存储、误差贡献分解和宽/窄布局边界连线断言。`clarity-qa-matrix.json` 的 55 用例 / 7 维度覆盖结构检查通过。
- 公共 convention 9/9、0 warning；推测解码 53 参数配置、并行策略模型和首页导航检查通过。最终生产构建 1914 modules 成功；Windows 沙箱父目录读取限制通过经批准的构建权限重跑。开发中两个 JSX 闭合错误已修复，最终独立检查页日志无 warning/error；仅构建存在既有 Browserslist 数据过期提醒。
- 局限：依然是教学数值模型，未运行实际 GPU 引擎、checkpoint、性能或模型准确率评测；不是完整屏幕阅读器/键盘/对比度审计。临时检查页关闭，恢复用户原页面。未提交、推送或部署。

## 2026-09-06 浮点表示基础与 KV 直连（修复 / 扩展）

### 契约与依据

- 本轮只扩展第二节数值表示、修复第四节 KV 路由，并按用户要求移除“实现依据、配置与边界”整个披露块。保留四节顺序、左右核心视图、全局精度/语言、分组/权重选择、离线算法、引擎配置、播放与缓存检查。页尾原始来源链接、算子 scale 公式以及一行版本/示例边界保留；不再显示被移除的配置与源码长面板。
- 受影响维度：FP16 参考的简单例子/当前权重（独立选择）、权重选择与全局精度（前者决定参考值，后者不改原值）、中英文、390/768/1517 宽度、Prefill/Decode 的读写路径。输入共享与执行进度的原有关系不变。能力仍为 timeline、multiple-modes、resource-metrics、structural-comparison、data-movement、dense-layout、math。
- 依据：[NVIDIA CUDA 浮点表示](https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/mathematical-functions.html#floating-point-format)、[CUDA half 类型](https://docs.nvidia.com/cuda/cuda-math-api/cuda_math_api/struct____half.html)、[Transformer Engine FP8 与 scale](https://archive.docs.nvidia.com/deeplearning/transformer-engine-releases/release-2.11/user-guide/examples/fp8_primer.html)。普通二进制浮点使用符号、带偏置的指数与显式尾数；外部量化 scale 不是每个浮点数内部的指数。公式限定有限正规数，未把正规数规则套用到零、非正规数或特殊值。

### 主张 → 模型 → 画面

| 主张 | 模型事实 | 可见证据 / 边界 |
| --- | --- | --- |
| FP16 的 16 bit 存储三个字段 | describeFP16 做最近偶数舍入并派生 1/5/10 bit 字段、偏置指数及还原值 | 默认 0.75 的字段为 0 / 01110 / 1000000000，直接显示二进制科学计数式；符号、指数、尾数分别标名，不只靠颜色 |
| 位数有限会产生舍入，但不等于整组量化 scale | 切到当前权重，参考输入跟随 selected；参考不进入 q、storage 或 output | 负权重 -0.37 显示负号与约 -0.370117 的 FP16 数值；原 INT4/INT8/FP8 重建实验保持原数据。额外说明这只是 FP16 编码参考，不将 JS 基线冒充硬件 FP16 运算 |
| 浮点内部指数与外部 scale 不同 | 指数存在每个值的 bit 中；量化元数据模型未改变 | 在同一存储视图内连接位字段与黄色 scale 的说明；一般公式和变量含义放在原“公式与变量”内。符号位用 b，避免与原量化公式里的 scale 符号 s 重名 |
| KV 读写无需中途折弯 | 宽/窄布局中 Cache 均覆盖 Linear 与 Attention 的水平中心 | write/read 使用单段竖直路径，保持方向与启用条件。Prefill 仍没有读缓存边；Decode 仍读历史及新 KV。短标签移到线右侧，不压线 |

### 验证结果

- 基准与结果：`artifacts/quantization-float-basics/` 下保存 `before-numeric.png`、`before-runtime.png`、`after-numeric-desktop-zh.png`、`after-runtime-desktop-zh.png`、`after-mobile-zh.png`、`after-mobile-en.png`、`after-cache-mobile-en.png`。实际截图检查了字段、负数公式、Cache 直线及标签。
- 1517×911 中文、W8A8 INT8、选中第一权重的同态比较：第二节 626.82 → 840.69px，其中新增浮点说明 227.19px；保留原双列，而未把全部矩阵/设置默认展开。第四节同为 load-fp8 / fp8-file / 19/19：839.48 → 802.48px。第二节增加的是用户本轮要求的基础知识，未声称它比之前更矮。
- 浏览器覆盖：四精度 × 双语在桌面与 390px 手机下检查位字段、公式与主实验保持独立，组件/页面无非预期横向溢出、KaTeX error 为 0；768px 双语和通用公式披露检查通过。简单例子与正负当前权重可切换，改变选中权重实时更新字段与表达式。英文手机发现指数表达式在等号后折行，已改为“字段值 / 扣除偏置 / 实际指数”的明确短行。
- KV：桌面四部署 × 三 KV 共 12 路径运行最后一轮到终点，下一步禁用、无活跃路径、节点/检查器无溢出；手机三种 KV 配置完成相同终点检查。390/768/1517 上 Prefill 的 read 边均不存在，write 保持竖直。手机发现旧长标签压线，改为 Write/Read 或 写入/读取 后截图确认。
- 自动回归：新增 61,440 个正负正规 FP16 编码往返、偶数舍入与指数进位断言；零/非正规/超范围/非有限输入明确拒绝。四精度 × 24 权重检查参考选择不改变 q、存储及误差，数值与二进制公式严格 KaTeX 解析。宽/窄布局 KV 路径断言只有 M/V，横坐标位于 Cache 内。
- 原 192 数值组合、1080 生命周期、462 SGLang 快照通过；`float-qa-matrix.json` 的 20 用例 / 5 维覆盖结构检查通过；公共规范 9/9、0 warning，生产构建 1914 modules 成功。最终独立检查页控制台 warning/error 为空。构建仍有既有 Browserslist 数据过期提示。
- 限制：FP16 参考只开放有限正规数例子，不是完整 IEEE-754 编辑器；未运行 GPU/真实 checkpoint/性能评测，也未做完整读屏与键盘审计。本轮未提交、推送或部署。
