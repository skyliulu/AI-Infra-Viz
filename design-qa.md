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
