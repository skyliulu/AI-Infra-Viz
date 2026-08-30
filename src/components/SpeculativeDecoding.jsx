import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Boxes,
  BrainCircuit,
  Check,
  Cpu,
  FastForward,
  Gauge,
  GitBranch,
  Globe,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { deriveSpeculativeSnapshot, getNextLifecycle } from './speculative-decoding/model';

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const SPEEDUP_FORMULA = String.raw`S\approx\frac{A\,C_{\mathrm{decode}}}{C_{\mathrm{draft}}+C_{\mathrm{verify}}(V)+C_{\mathrm{runtime}}}`;
const ACCEPT_FORMULA = String.raw`a_i=\min\!\left(1,\frac{p_i(x_i)}{q_i(x_i)}\right),\qquad u_i\le a_i`;
const CORRECTION_FORMULA = String.raw`r_i(x)=\frac{[p_i(x)-q_i(x)]_+}{\sum_y[p_i(y)-q_i(y)]_+}`;
const EAGLE_VALUE_FORMULA = String.raw`V_i\approx\prod_{t_j\in\operatorname{Path}(\mathrm{root},t_i)}c_j`;
const DSPARK_MARKOV_FORMULA = String.raw`p_k(v)\propto\exp\!\left(U_k(v)+B(x_{k-1},v)\right)`;
const DSPARK_SURVIVAL_FORMULA = String.raw`a_j=\prod_{i\le j}c_i,\qquad \Theta=\tau\cdot\operatorname{SPS}(B)`;
const ATTENTION_WEIGHT_FORMULA = String.raw`W_Q,\,W_K,\,W_V,\,W_O`;
const MLP_WEIGHT_FORMULA = String.raw`W_{\mathrm{gate}},\,W_{\mathrm{up}},\,W_{\mathrm{down}}`;

const i18n = {
  zh: {
    title: '推测解码原理可视化',
    subtitle: '先看清加速来源，再比较 EAGLE-2 动态树与 DSpark 置信度调度',
    teachingQuestion: '为什么便宜的 Draft 工作能减少昂贵的 Target 串行 Decode？',
    eagle2: 'EAGLE-2', dspark: 'DSpark', representative: '代表性轨迹', lowAcceptance: '低接受率', scenario: '运行场景',
    langToggle: 'EN', switchEnglish: 'Switch to English', reset: '重置', play: '播放', pause: '暂停', replay: '重播', next: '下一步',
    ready: '准备开始', done: '本轮完成', stepProgress: '步骤 {current} / {total}',
    committedPrefix: '已提交上下文', sameOutput: '相同提交结果', whyFaster: '加速来自减少 Target 串行前向，而不是跳过 Target 验证。',
    baseline: '标准自回归', selectedAlgorithm: '当前推测方案', baselineSubtitle: '每次 Target Forward 只生成并提交一个 Token',
    speculativeSubtitle: 'Draft 先提出候选，Target 在一次块前向中并行评分多个位置', targetModel: '大型 Target Model', draftModel: '轻量 Drafter',
    targetForward: 'Target Forward', targetWeightStream: 'Target 权重流式读取轮次', serialDecode: '串行 Decode', blockVerify: '块验证',
    draftCandidates: 'Draft 候选', targetScores: 'Target 同时评分', committed: '提交', correction: '修正 Token', pass: '次', passes: '次', tokenUnit: 'Token', positions: '位置',
    raceTitle: '相同时间预算，谁输出更多 Token？', raceSubtitle: 'Baseline 每个 Target Forward 增加 1 个 Token；推测路径循环执行候选生成、一次 Target 块验证和批量提交，因此领先会保留到时间预算结束。',
    raceClock: '相同时间预算', raceNow: '当前', raceBaselineCount: 'Baseline 输出', raceSpeculativeCount: '推测路径输出', raceLead: '当前多输出', raceTie: '低接受率抵消了本轮收益', raceNoLead: '等待第一个提交周期',
    cheapProposal: '低成本候选', cheapProposalHint: '每个短周期都重复 Draft → Verify → Commit', oneBlockVerify: 'Target 块验证', commitBurst: '批量提交', baselineStillRunning: 'Baseline 继续逐 Token Decode',
    racePending: '等待开始', raceDrafting: '当前周期：生成候选', raceVerifying: '当前周期：Target 验证多个位置', raceCommitting: '当前周期：提交接受结果', raceFinished: '本轮时间预算已用完', raceAllDone: '时间预算结束',
    outputStream: '实时输出流', cycle: '周期', tokenGain: '本周期提交', localRaceControls: '顶层竞速控制', localTraceControls: '算法轨迹控制',
    comparisonTitle: '同一输出量的执行代价', normalizedCost: '归一化成本', estimatedSpeedup: '教学估算加速', teachingModel: '共享刻度教学模型，不是特定硬件 Benchmark。',
    architectureTitle: 'Transformer 静态权重与运行时关系', architectureSubtitle: '先分清磁盘/GPU 中长期存在的参数，再看一次请求中哪些参数在 Prefill、Draft、Verify 和 Commit 阶段被调用。',
    modelWeightCanvas: '① 两个真实模型：权重形状、层堆叠与连接', modelWeightCanvasHint: '矩形长宽编码矩阵形状，层叠卡片编码重复层。Target 与 Draft 是两个 checkpoint；箭头表示运行时张量与候选在两者之间流动。',
    targetTower: 'Target Transformer（完整原模型）', draftTower: 'Draft sidecar（额外小模型）', representativeLayer: '展开一个代表层', stackedLayers: '同构层堆叠', shapeLabel: '形状',
    inputTokenTensor: '输入 Token IDs', targetHiddenTensor: 'Target 隐状态', logitsTensor: 'Target logits', candidateTensor: '候选结构',
    matrixQuery: 'Query 投影', matrixKeyValue: 'Key / Value 投影', matrixOutput: '输出投影', matrixGateUp: 'Gate / Up 投影', matrixDown: 'Down 投影', matrixDraftQkv: 'Draft QKV 投影', matrixMarkovIn: '词表到低秩空间', matrixMarkovOut: '低秩空间到词表',
    targetKvPerLayer: '每个 Target Layer 的运行时 KV', targetKvState: 'KV 是请求状态，不是 checkpoint 权重', draftWorkspace: 'Draft 临时候选工作区',
    dimensionLegend: '符号维度', dimBatch: '批大小', dimSequence: '序列长度', dimVocab: '词表大小', dimHidden: '隐藏维度', dimFfn: 'MLP 中间维度', dimHeads: 'KV 头数 / 头维度', dimFeatureTaps: 'Target 特征层数', dimBlock: '候选块长度', dimRank: 'Markov 低秩维度',
    modelCoupling: '运行时耦合', targetFeatureToDraft: 'Target 特征 → Draft', draftCandidatesToTarget: '候选 → Target 全层验证', targetScoresToKv: 'Target 分数 → 接受 / KV 提交',
    liveRuntimeTitle: '② 同一画布的实时执行', liveRuntimeSubtitle: '播放下面的算法轨迹时，这里同步高亮当前真正运行的模型、张量与 KV 动作。', liveTensorTrace: '当前张量与候选', currentActivation: '送入 Draft 的 Target 激活', currentCandidates: '本轮候选', targetKvInside: 'Target 每层生成 / 读取自己的 KV；验证槽位只在接受后提交。', draftOffDuringPrefill: 'Prefill 只运行 Target；Draft 从 Decode 起点才参与。',
    relationOverview: '模型关系总览', relationOverviewHint: '只保留推测解码新增的接口；Transformer 内部细节已折叠。', targetCompactStructure: 'Embedding → Transformer 层堆叠 → LM Head', targetInputLabel: '输入：已提交前缀 / 待验证候选', targetOutputLabel: '输出：隐状态、logits、Target KV', draftInputLabel: '输入：Target 特征 + Token / 锚点', draftOutputLabel: '输出：候选树 / 候选块 + 置信度',
    draftStructureNow: '当前 Draft 结构', eagleCompactStructure: '共享 Embedding + Target 特征 → 融合投影 → 1 层 Draft Decoder → 共享 LM Head', dsparkCompactStructure: '多层 Target 特征 → 投影 → 块并行 Backbone → Markov / Confidence Heads', separateCheckpointBadge: '独立 Draft checkpoint', sharedWeightBadge: '复用 Target 冻结权重', runtimeInteraction: 'Decode 运行时闭环', interactionHidden: '① Target 特征送入 Draft', interactionCandidates: '② Draft 返回多步候选', interactionVerify: '③ Target 全层一次验证', interactionKv: '④ 接受前缀写入 KV，其余回收', algorithmWorkbench: '算法真实轨迹 + Draft 结构特征', algorithmWorkbenchHint: '右侧不再重复泛化架构，而是直接展示当前算法怎样生成候选、怎样调度并进入 Target 验证。',
    expandDraft: '展开 Draft 内部', collapseDraft: '收起 Draft 内部', draftInternalTitle: 'Draft 权重与张量流', draftInternalHint: '沿箭头读取：青色是请求张量，紫色是新增可训练权重，黄色是复用的 Target 冻结权重，虚线灰色是无参数运行时逻辑。', trainableWeightBadge: 'Draft 可训练权重', runtimeTensorBadge: '运行时张量', runtimeLogicBadge: '无参数控制逻辑', targetStagePorts: '当前由这些 Target 阶段调用', draftStagePorts: '当前由 Draft 候选阶段调用', kvStagePorts: 'Target 裁决后写入', targetFeaturePort: 'Target 特征 / Token 向下', candidateReturnPort: '候选向上返回 Target', targetVerdictPort: 'Target logits / 接受结果', internalMatrices: '内部权重矩阵',
    macroTitle: '静态权重在哪里，运行时何时激活？', macroSubtitle: 'Target 是原始完整 Transformer；推测解码额外加载一个独立 Draft checkpoint。两者不串成新的 Transformer Layer，而是在 Decode 时通过 Target 隐状态、共享输出层和验证循环协作。',
    staticWeightsTitle: '① 静态权重拓扑（模型加载后常驻）', staticWeightsSubtitle: '结构表示参数归属，不表示执行先后；卡片宽度不代表参数量。', targetCheckpoint: '原始 Target checkpoint', targetCheckpointHint: '完整、未经删减的 Transformer 权重', draftCheckpoint: '新增 Draft checkpoint', targetOwnWeights: 'Target 独占权重', sharedFrozenWeights: '复用 / 冻结 Target 权重', draftTrainableWeights: '新增可训练 Draft 权重', runtimeActivationOnly: '运行时激活，无静态参数', notToScale: '示意图不按参数量缩放；具体层数由 checkpoint 决定。',
    weightEmbedding: 'Token Embedding', weightDecoderStack: 'Transformer Decoder Stack', weightNormStage: 'RMSNorm', weightAttention: 'Causal Self-Attention', weightMlp: 'SwiGLU / MLP', weightFinalNorm: 'Final RMSNorm', weightLmHead: 'LM Head', weightFusionProjection: '特征 + Token 融合投影', weightEagleDecoder: '1 层 Draft Decoder', weightFeatureProjection: 'Target 特征投影', weightParallelBackbone: '块并行 Draft Backbone', weightMarkovHead: '低秩 Markov Head', weightConfidenceHead: 'Confidence Head', repeatedTargetLayers: '重复的 Target Layer', layerResidual: 'Residual + KV Cache', targetOwnerShort: 'Target', draftOwnerShort: 'Draft', kvOwnerShort: 'KV 管理器',
    activationEagleFeature: 'Target 顶层特征 / LM Head 输入', activationDsparkFeature: '选定的 Target 隐状态', activationTapHint: '这是每个请求产生的张量，不是另一份权重。', eagleDraftCheckpoint: 'EAGLE-2 Draft checkpoint', dsparkDraftCheckpoint: 'DSpark Draft checkpoint', sharedReuseHint: 'Embedding 与 LM Head 使用 Target 的冻结参数；逻辑共享，物理是否别名复用取决于引擎。', controllerEagle: '动态树 Top-k / Top-m + Tree Mask', controllerDspark: '存活率累计 + 硬件吞吐 Scheduler', noLearnedWeights: '运行时控制逻辑：没有学习参数',
    runtimeActivationTitle: '② 运行时激活顺序（单个请求）', runtimeActivationSubtitle: '上面的同一组权重按请求阶段被调用；播放下方算法轨迹时，这里同步高亮当前所有者。', runtimePrefill: 'Prefill', runtimePrefillHint: '只运行 Target 全部层，建立 Prefix KV；Draft 不参与。', runtimeSeed: 'Decode 起点', runtimeSeedEagleHint: 'Target 已有的 Token 与顶层特征成为 EAGLE 下一轮输入。', runtimeSeedDsparkHint: 'Target 先生成锚点 Token 和隐藏特征，作为 DSpark 块输入。', runtimeDraft: 'Draft 候选阶段', runtimeDraftEagleHint: '只运行 EAGLE 融合层和单层 Draft Decoder，多步扩展候选树。', runtimeDraftDsparkHint: '运行并行 Backbone、Markov Head 和 Confidence Head，产生候选块。', runtimeVerify: 'Target 块验证', runtimeVerifyHint: '候选重新穿过原 Target 的全部 Transformer 层；一次因果块前向评分多个位置。', runtimeCommit: '接受 / KV Commit', runtimeCommitHint: '保留接受前缀对应的 Target KV，回收其余槽位，再进入下一轮 Decode。', loopBack: '循环回到 Decode 起点', activeNow: '当前激活', inactiveNow: '本阶段不运行',
    promptInput: 'Prompt 输入', prefillOnce: 'Target Prefill（一次）', decodeOnly: '仅在 Decode 循环生效', targetTransformer: '原始 Target Transformer', targetUnchanged: '权重、训练与采样目标不变', baselineLoop: '原始路径：Target 每轮只提交 1 个 Token', targetOneToken: '提交 1 个 Token', speculativeLoop: '推测路径：Draft 提议 → Target 块验证 → 提交 / 修正', draftSidecar: 'Draft 旁路候选器', proposalNotAuthority: '只提议，不拥有最终决定权', targetAuthority: '同一个 Target 仍逐位置裁决',
    whyFastCard: '为什么更快', whyFastBody: 'Decode 常受 Target 权重带宽限制。一次因果块前向能在一次权重读取中评分多个候选位置，替代多次串行的单 Token 前向；收益必须覆盖 Draft 与调度开销。', whyExactCard: '为什么结果不被 Draft 改写', whyExactBody: 'Draft 只提供提议 q。Target 用自身概率 p 接受或拒绝；首拒后从正残差修正分布采样，因此经典修正拒绝采样仍返回 Target 分布。',
    prefixKv: 'Prefix / KV', drafter: '候选生成', candidateStructure: '候选结构与调度', targetVerifier: 'Target 验证', acceptCommit: '接受与 KV 提交',
    prefixKvHint: '读取已提交上下文', targetVerifierHint: '一次前向评分多个候选位置', acceptCommitHint: '仅提交有效前缀并回收其余槽位',
    draftArchitecture: 'Draft 架构', candidateTopology: '候选拓扑', verificationSchedule: '验证调度', mainTradeoff: '主要权衡',
    eagleDraftArchitecture: '利用 Target 倒数第二层特征，用轻量自回归头外推未来特征与 Token。',
    eagleTopology: '依据上下文置信度构建动态候选树，而不是固定长度单链。',
    eagleScheduling: 'Target 用祖先可见的 Tree Mask 一次验证整棵候选树。',
    eagleTradeoff: '树越宽，命中路径机会越多，但 Draft 与 Target 验证槽位也越多。',
    dsparkDraftArchitecture: '并行主干一次产生候选块，低秩 Markov Head 补回块内前一 Token 依赖。',
    dsparkTopology: '候选以半自回归块组织；位置间既保留并行性，也引入轻量顺序条件。',
    dsparkScheduling: 'Confidence Head 估计前缀存活率，并结合引擎负载决定实际验证长度。',
    dsparkTradeoff: '验证更长可能提交更多 Token，也可能占用批容量验证高拒绝风险后缀。',
    traceTitle: '真实机制轨迹', traceSubtitle: '沿原论文代表路径观察候选如何产生、调度并进入 Target；画面中的结构与数据依赖对应论文算法。',
    dynamicTree: '上下文感知动态树', treeHint: '实线为本轮接受路径，虚线分支在提交时回收。', maskPurpose: '树被压成一条序列后，普通因果 Mask 会让不同分支互相“偷看”。祖先 Mask 只开放当前节点自己的路径，因此 Target 能一次前向并行评分整棵树，同时保持各分支语义独立。', maskExample: '例：{query} 可见 {visible}；看不到兄弟分支 {blocked}。', maskSize: '{rows} 行 / {cols} 列', parallelBlock: '半自回归候选块',
    paperMechanism: '论文机制复现', nodeValue: '路径 Value', topKParents: '橙色：当前层 Top-k 扩展父节点', globalTopM: '蓝色：全树重排后 Top-m', flattenSequence: '压平后的 Target 输入', ancestorMask: '祖先可见 Mask', visible: '可见', blocked: '隔离',
    anchor: '锚点 Token', anchorProduced: 'Target 先从已提交前缀生成锚点', maskInputs: '待预测槽位', maskToken: '[待预测]', dsparkInput: 'DSpark 本轮输入', parallelStage: '重型并行 Backbone', baseLogits: '上下文基础猜测（全部位置同时产生）', baseMeaning: '每个位置的基础分数只看已提交上下文；此时还没看到块内前一个 Draft Token。', positionLabel: '位置 {index}', baseGuess: '基础猜测', previousDraft: '前一个 Draft Token', finalGuess: '修正后候选', confidenceHeadLabel: '置信度头', sequentialStage: '轻量 Markov Head（左到右）', transitionBias: '前一 Token → 低秩转移偏置', conditionalSurvival: '本位置仍会被接受', prefixSurvival: '从开头一路都被接受', hardwareCurve: '引擎吞吐曲线', keepPrefix: '保留前', dropSuffix: '丢弃后', schedulerExplanation: '累计存活率越往后越低；Scheduler 只保留还能提升预计吞吐的连续前缀。', correctionResult: 'Target 接受前缀，并修正首个错误', paperExample: '统一例子：Large models can → 锚点 predict；DSpark 提议 the / future / tokens / faster，Target 接受前两个，把 tokens 修正为 of。',
    confidence: '置信度', scheduled: '进入验证', notScheduled: '跳过验证', markovDependency: 'Markov Head 注入前一 Token 依赖', confidenceSchedule: 'Confidence Head 选择验证前缀',
    pending: '待生成', proposed: '候选', expanding: '本轮 Top-k 父节点', reranked: '全树 Top-m', pruned: '重排裁剪', masked: '已进入祖先 Mask', conditioned: '已注入顺序依赖', verifying: '验证中', accepted: '已接受', rejected: '拒绝', committedStatus: '已提交', discarded: '已回收', skipped: '未验证',
    selectedPath: '接受路径', otherBranch: '其他分支', output: '本轮提交',
    metricCommitted: '提交 Token', metricBaselinePasses: 'Baseline Target 前向', metricTargetPasses: '推测 Target 前向', metricVerified: '验证 / Draft 位置', metricWasted: '已验证但未采用',
    costBaseline: 'Baseline：逐 Token Decode', costSpeculative: 'Draft + 块验证 + Runtime', costBreakdown: '成本拆分', draftCost: 'Draft', verifyCost: 'Verify', runtimeCost: 'Runtime',
    lifecycleTitle: 'Target KV 生命周期', lifecycleSubtitle: '已有 Prefix KV 持续驻留；候选槽只在 Target 验证时临时写入，最终仅保留连续接受的 Draft Token KV。',
    kvPrefixResident: '已有 Prefix KV', kvCandidateSlots: '本轮候选槽', kvStatePrefix: '仅 Prefix 常驻', kvStateReserved: '槽位已预留', kvStateVerifying: '临时 KV 写入中', kvStateCommitting: '提交 / 回收中', kvStateStable: '新 Prefix 已稳定', kvHintPrefix: '候选尚未进入 Target，本轮 KV 槽未分配。', kvHintReserved: '已预留验证槽；它们还不是可复用历史。', kvHintVerifying: 'Target 块前向正在为验证位置生成临时 KV。', kvHintCommitting: '接受前缀转为常驻，其余临时槽回收。', kvHintCommittingCorrection: '接受前缀转为常驻；拒绝槽回收，修正 Token 的 KV 留到下一次 Target 前向。', kvHintStable: '接受的 Draft KV 已并入 Prefix；其余槽可复用。', kvHintStableCorrection: '接受的 Draft KV 已并入 Prefix；修正 Token 的 KV 将在下一次 Target 前向生成。', kvCorrectionPending: '修正 Token 的 KV 待下一轮',
    prefixSlot: '上下文', reservedSlot: '验证槽位', committedSlot: '提交', reclaimedSlot: '回收', skippedSlot: '未分配',
    currentStage: '当前执行阶段', mechanism: '核心机制', principleTitle: '为什么可能更快', exactnessTitle: '为什么仍由 Target 决定结果', formulaVariables: '变量含义',
    speedupExplanation: 'A 是本轮提交 Token 数，V 是 Target 实际评分位置数。只有当减少的串行 Target 成本大于 Draft、块验证和 Runtime 开销时才会加速。',
    acceptExplanation: '经典修正拒绝采样按位置顺序接受候选；首个拒绝后从修正分布采样，因此可以保持 Target 分布。具体树形或宽松策略是否无损取决于算法实现。',
    runtimeOps: 'Engine 风格伪代码', boundary: '适用边界',
    boundaryText: '这里演示 Decode 阶段、低到中等并发且 Target 受权重带宽限制的情形。高批量、低接受率、重 Drafter 或过长验证块都可能缩小甚至抵消收益。成本值用于展示依赖关系，不代表论文或硬件实测。',
    stageFeatureDraft: '特征级自回归 Draft', stageExpandTree: '按路径 Value 扩展 Top-k', stageRerankTree: '全树重排 Top-m', stageFlattenMask: '压平并构造祖先 Mask', stageTargetVerifyTree: 'Target 一次验证候选树', stageCommitTree: '接受路径并回收分支',
    stageParallelBackbone: '并行 Backbone 产生全部基础 Logits', stageSequentialMarkov: 'Markov Head 左到右修正', stageConfidenceHead: '预测逐位置条件存活率', stageScheduleVerify: '累计存活率与硬件曲线联合调度', stageTargetVerifyBlock: 'Target 验证保留前缀', stageCommitBlock: '提交接受前缀与修正 Token',
    descFeatureDraft: 'EAGLE 的轻量头在特征空间自回归外推，并结合提前一位的 Token 消除特征不确定性。',
    descExpandTree: 'EAGLE-2 用从根到节点的 Draft 置信度乘积近似全局接受概率，只扩展当前层 Value 最高的 Top-k 节点。',
    descRerankTree: '扩树结束后对全树所有节点重新按 Value 排序，选 Top-m；同值时浅层优先，因此选中节点仍组成连通树。',
    descFlattenMask: '把选中的连通树压成一维候选序列，并构造只能看见祖先的 Tree Attention Mask。',
    descTargetVerifyTree: 'Target 通过祖先可见的 Tree Attention Mask 同时评分树节点；并行评分不等于并行接受。',
    descCommitTree: 'KV 管理器提交接受路径；未选树节点对应的临时 Target KV 被回收。',
    descParallelBackbone: 'DSpark 的重型并行 Backbone 以 Anchor + Mask 块一次产生所有位置的 Hidden State 与基础 Logits。',
    descSequentialMarkov: '轻量低秩 Markov Head 使用已经采样的前一 Token 产生转移偏置，再与当前位置的基础 Logits 相加并左到右采样。',
    descConfidenceHead: 'Confidence Head 从 Backbone Hidden 与前一 Token 的 Markov Embedding 预测条件存活率，并校准累计前缀概率。',
    descScheduleVerify: 'Scheduler 累乘各位置条件存活率，再结合引擎吞吐曲线，只保留能提高预期吞吐的连续前缀。',
    descTargetVerifyBlock: 'Target 对调度后的多个候选位置执行一次因果块前向。',
    descCommitBlock: '提交连续接受前缀和修正 Token，释放已验证但未采用的后缀。',
    codeEagle1: 'draft_state = eagle_head.feature_autoregressive(target_cache.last_hidden(request_id))', codeEagle2: 'tree.expand(top_k(tree.latest_layer, key=path_confidence_product))', codeEagle3: 'selected = top_m(tree.all_nodes, key=path_value, tie_break=shallow_first)', codeEagle4: 'tokens, ancestor_mask = flatten_connected_tree(selected); slots = kv_cache.reserve_tree(selected.parents)', codeEagle5: 'scores = target.verify_tree(tokens, ancestor_mask, slots)', codeEagle6: 'kv_cache.commit_path(request_id, accept(scores)); kv_cache.reclaim_others(slots)',
    codeDspark1: 'hidden, base_logits = parallel_backbone(anchor_token, mask_block, target_context_kv)', codeDspark2: 'block = sample_left_to_right(base_logits + markov_head(previous_token))', codeDspark3: 'conditional_survival = confidence_head(hidden, markov_embedding(block.previous_tokens))', codeDspark4: 'verify_len = scheduler.argmax_expected_tokens_times_sps(conditional_survival, engine.profile)', codeDspark5: 'scores = target.verify_block(block[:verify_len], kv_cache.reserve(verify_len))', codeDspark6: 'kv_cache.commit_prefix(request_id, accept_and_correct(scores)); kv_cache.reclaim_suffix()',
  },
  en: {
    title: 'Speculative Decoding Visualization',
    subtitle: 'See the source of speedup first, then compare EAGLE-2 dynamic trees with DSpark confidence scheduling',
    teachingQuestion: 'How can cheap Draft work remove expensive serial Target decode steps?',
    eagle2: 'EAGLE-2', dspark: 'DSpark', representative: 'Representative trace', lowAcceptance: 'Low acceptance', scenario: 'Scenario',
    langToggle: '中文', switchEnglish: '切换到中文', reset: 'Reset', play: 'Play', pause: 'Pause', replay: 'Replay', next: 'Next step',
    ready: 'Ready', done: 'Cycle complete', stepProgress: 'Step {current} / {total}',
    committedPrefix: 'Committed prefix', sameOutput: 'Same committed output', whyFaster: 'Speedup comes from fewer serial Target forwards, not from skipping Target verification.',
    baseline: 'Autoregressive baseline', selectedAlgorithm: 'Selected speculative path', baselineSubtitle: 'Each Target forward generates and commits one token',
    speculativeSubtitle: 'A Drafter proposes candidates, then one Target block forward scores several positions', targetModel: 'Large Target Model', draftModel: 'Lightweight Drafter',
    targetForward: 'Target forward', targetWeightStream: 'Target weight-stream rounds', serialDecode: 'Serial decode', blockVerify: 'Block verification',
    draftCandidates: 'Draft candidates', targetScores: 'Target scores together', committed: 'commit', correction: 'correction token', pass: 'pass', passes: 'passes', tokenUnit: 'tokens', positions: 'positions',
    raceTitle: 'Same time budget: which path outputs more tokens?', raceSubtitle: 'The baseline adds one token per Target forward. The speculative path repeatedly drafts, verifies a block once, and commits a burst, so its lead remains visible when the shared time budget ends.',
    raceClock: 'Shared time budget', raceNow: 'now', raceBaselineCount: 'Baseline output', raceSpeculativeCount: 'Speculative output', raceLead: 'Extra output so far', raceTie: 'Low acceptance erased the gain in this cycle', raceNoLead: 'Waiting for the first commit cycle',
    cheapProposal: 'Cheap proposal', cheapProposalHint: 'Each short cycle repeats Draft → Verify → Commit', oneBlockVerify: 'Target block verify', commitBurst: 'Burst commit', baselineStillRunning: 'Baseline continues token by token',
    racePending: 'Waiting to start', raceDrafting: 'Current cycle: drafting candidates', raceVerifying: 'Current cycle: Target verifies several positions', raceCommitting: 'Current cycle: committing accepted results', raceFinished: 'The shared time budget is exhausted', raceAllDone: 'Time budget reached',
    outputStream: 'Live output stream', cycle: 'cycle', tokenGain: 'tokens committed this cycle', localRaceControls: 'Principle race controls', localTraceControls: 'Algorithm trace controls',
    comparisonTitle: 'Execution cost for the same output count', normalizedCost: 'Normalized cost', estimatedSpeedup: 'Teaching speedup estimate', teachingModel: 'Shared-scale teaching model, not a hardware benchmark.',
    architectureTitle: 'Transformer static weights and runtime relationship', architectureSubtitle: 'First separate long-lived parameters in storage/GPU memory, then see which weights execute during Prefill, Draft, Verify, and Commit for one request.',
    modelWeightCanvas: '① Two real models: matrix shapes, layer stacks, and links', modelWeightCanvasHint: 'Rectangle proportions encode matrix shape; stacked cards encode repeated layers. Target and Draft are separate checkpoints, while arrows show runtime tensors and candidates crossing between them.',
    targetTower: 'Target Transformer (complete original model)', draftTower: 'Draft sidecar (additional small model)', representativeLayer: 'one representative layer expanded', stackedLayers: 'repeated homogeneous layers', shapeLabel: 'shape',
    inputTokenTensor: 'Input token IDs', targetHiddenTensor: 'Target hidden state', logitsTensor: 'Target logits', candidateTensor: 'Candidate structure',
    matrixQuery: 'Query projection', matrixKeyValue: 'Key / Value projections', matrixOutput: 'output projection', matrixGateUp: 'Gate / Up projections', matrixDown: 'Down projection', matrixDraftQkv: 'Draft QKV projection', matrixMarkovIn: 'vocabulary to low-rank space', matrixMarkovOut: 'low-rank space to vocabulary',
    targetKvPerLayer: 'runtime KV for every Target layer', targetKvState: 'KV is request state, not checkpoint weight', draftWorkspace: 'temporary Draft candidate workspace',
    dimensionLegend: 'Dimension symbols', dimBatch: 'batch size', dimSequence: 'sequence length', dimVocab: 'vocabulary size', dimHidden: 'hidden width', dimFfn: 'MLP intermediate width', dimHeads: 'KV heads / head width', dimFeatureTaps: 'selected Target feature layers', dimBlock: 'candidate block length', dimRank: 'Markov low-rank width',
    modelCoupling: 'Runtime coupling', targetFeatureToDraft: 'Target features → Draft', draftCandidatesToTarget: 'candidates → all Target layers', targetScoresToKv: 'Target scores → accept / KV commit',
    liveRuntimeTitle: '② Live execution in the same canvas', liveRuntimeSubtitle: 'Playing the algorithm trace below highlights the model, tensors, and KV action that are actually active here.', liveTensorTrace: 'Current tensors and candidates', currentActivation: 'Target activation passed to Draft', currentCandidates: 'Candidates this cycle', targetKvInside: 'Every Target layer reads or produces its own KV; verification slots become permanent only after acceptance.', draftOffDuringPrefill: 'Prefill runs only the Target. The Draft joins at the Decode seed.',
    relationOverview: 'Model relationship overview', relationOverviewHint: 'Only speculative-decoding interfaces remain visible; internal Transformer details are collapsed.', targetCompactStructure: 'Embedding → Transformer layer stack → LM head', targetInputLabel: 'input: committed prefix / candidates to verify', targetOutputLabel: 'output: hidden states, logits, and Target KV', draftInputLabel: 'input: Target features + token / anchor', draftOutputLabel: 'output: candidate tree / block + confidence',
    draftStructureNow: 'Current Draft structure', eagleCompactStructure: 'shared embedding + Target feature → fusion projection → one Draft decoder → shared LM head', dsparkCompactStructure: 'multiple Target features → projection → block-parallel backbone → Markov / confidence heads', separateCheckpointBadge: 'separate Draft checkpoint', sharedWeightBadge: 'reused frozen Target weights', runtimeInteraction: 'Decode runtime loop', interactionHidden: '① Target features enter Draft', interactionCandidates: '② Draft returns multi-token candidates', interactionVerify: '③ the full Target verifies once', interactionKv: '④ commit accepted KV prefix; reclaim the rest', algorithmWorkbench: 'Concrete algorithm trace + Draft structure', algorithmWorkbenchHint: 'The right side skips another generic architecture and shows how this algorithm generates, schedules, and submits candidates to Target verification.',
    expandDraft: 'Expand Draft internals', collapseDraft: 'Collapse Draft internals', draftInternalTitle: 'Draft weights and tensor flow', draftInternalHint: 'Read along the arrows: cyan is per-request tensor data, violet is new trainable Draft weight, amber is reused frozen Target weight, and dashed gray is parameter-free runtime logic.', trainableWeightBadge: 'trainable Draft weight', runtimeTensorBadge: 'runtime tensor', runtimeLogicBadge: 'parameter-free control', targetStagePorts: 'invoked by these Target stages', draftStagePorts: 'invoked by the Draft proposal stage', kvStagePorts: 'written after the Target verdict', targetFeaturePort: 'Target features / token flow down', candidateReturnPort: 'candidates return up to Target', targetVerdictPort: 'Target logits / acceptance verdict', internalMatrices: 'internal weight matrices',
    macroTitle: 'Where are the static weights, and when do they activate?', macroSubtitle: 'The Target remains the original full Transformer. Speculative decoding loads a separate Draft checkpoint; it is not inserted as another Target layer. The two cooperate during Decode through Target hidden states, reused output weights, and the verification loop.',
    staticWeightsTitle: '① Static weight topology (resident after model load)', staticWeightsSubtitle: 'This view encodes parameter ownership, not execution order; card width is not parameter count.', targetCheckpoint: 'Original Target checkpoint', targetCheckpointHint: 'The complete, unmodified Transformer weights', draftCheckpoint: 'Additional Draft checkpoint', targetOwnWeights: 'Target-owned weights', sharedFrozenWeights: 'reused / frozen Target weights', draftTrainableWeights: 'new trainable Draft weights', runtimeActivationOnly: 'runtime activation, no static parameter', notToScale: 'Not scaled by parameter count; layer counts depend on the checkpoint.',
    weightEmbedding: 'Token embedding', weightDecoderStack: 'Transformer decoder stack', weightNormStage: 'RMSNorm', weightAttention: 'Causal self-attention', weightMlp: 'SwiGLU / MLP', weightFinalNorm: 'Final RMSNorm', weightLmHead: 'LM head', weightFusionProjection: 'feature + token fusion projection', weightEagleDecoder: 'one-layer Draft decoder', weightFeatureProjection: 'Target feature projection', weightParallelBackbone: 'block-parallel Draft backbone', weightMarkovHead: 'low-rank Markov head', weightConfidenceHead: 'confidence head', repeatedTargetLayers: 'repeated Target layer', layerResidual: 'Residual + KV cache', targetOwnerShort: 'Target', draftOwnerShort: 'Draft', kvOwnerShort: 'KV manager',
    activationEagleFeature: 'Target top feature / LM-head input', activationDsparkFeature: 'selected Target hidden states', activationTapHint: 'This is a per-request tensor, not another set of weights.', eagleDraftCheckpoint: 'EAGLE-2 Draft checkpoint', dsparkDraftCheckpoint: 'DSpark Draft checkpoint', sharedReuseHint: 'Embedding and LM head use frozen Target parameters. Logical sharing is fixed; physical aliasing depends on the serving engine.', controllerEagle: 'dynamic-tree Top-k / Top-m + Tree Mask', controllerDspark: 'prefix survival + hardware-throughput scheduler', noLearnedWeights: 'Runtime control logic: no learned parameters',
    runtimeActivationTitle: '② Runtime activation order (one request)', runtimeActivationSubtitle: 'The same weight objects above execute by request stage. Playing the algorithm trace below highlights the current owner here.', runtimePrefill: 'Prefill', runtimePrefillHint: 'Only the full Target runs and builds Prefix KV; the Draft is off.', runtimeSeed: 'Decode seed', runtimeSeedEagleHint: 'The existing Target token and top feature become the next EAGLE input.', runtimeSeedDsparkHint: 'The Target first emits an anchor token and hidden features for the DSpark block.', runtimeDraft: 'Draft proposal stage', runtimeDraftEagleHint: 'Only the EAGLE fusion and one-layer Draft decoder run repeatedly to expand a candidate tree.', runtimeDraftDsparkHint: 'The parallel backbone, Markov head, and confidence head produce a candidate block.', runtimeVerify: 'Target block verification', runtimeVerifyHint: 'Candidates pass through every original Target Transformer layer; one causal block forward scores several positions.', runtimeCommit: 'Accept / KV commit', runtimeCommitHint: 'Keep Target KV for the accepted prefix, reclaim the other slots, and start the next Decode round.', loopBack: 'loop back to Decode seed', activeNow: 'active now', inactiveNow: 'off in this stage',
    promptInput: 'Prompt input', prefillOnce: 'Target prefill (once)', decodeOnly: 'Active only in the decode loop', targetTransformer: 'Original Target Transformer', targetUnchanged: 'Weights, training, and sampling objective unchanged', baselineLoop: 'Original path: Target commits one token per round', targetOneToken: 'commit 1 token', speculativeLoop: 'Speculative path: Draft proposes → Target block-verifies → commit / correct', draftSidecar: 'Draft proposal sidecar', proposalNotAuthority: 'Proposes only; it has no final authority', targetAuthority: 'The same Target still judges every position',
    whyFastCard: 'Why it is faster', whyFastBody: 'Decode is often limited by streaming Target weights. One causal block forward can score several candidate positions during one weight read, replacing multiple serial one-token forwards; the gain must still exceed Draft and scheduling overhead.', whyExactCard: 'Why Draft does not change the result', whyExactBody: 'The Draft only proposes from q. The Target accepts or rejects using its own p; after the first rejection, sampling from the positive residual correction preserves the Target distribution in classical modified rejection sampling.',
    prefixKv: 'Prefix / KV', drafter: 'Candidate generation', candidateStructure: 'Candidate structure and schedule', targetVerifier: 'Target verification', acceptCommit: 'Acceptance and KV commit',
    prefixKvHint: 'Read committed context', targetVerifierHint: 'Score several candidate positions in one forward', acceptCommitHint: 'Commit only the valid prefix and reclaim the rest',
    draftArchitecture: 'Draft architecture', candidateTopology: 'Candidate topology', verificationSchedule: 'Verification schedule', mainTradeoff: 'Main tradeoff',
    eagleDraftArchitecture: 'Reuse the Target second-to-top-layer feature and extrapolate future features and tokens with a lightweight autoregressive head.',
    eagleTopology: 'Build a context-aware dynamic candidate tree instead of a fixed-length single chain.',
    eagleScheduling: 'Verify the whole tree once with an ancestor-visible Tree Mask.',
    eagleTradeoff: 'A wider tree raises the chance of finding a good path but consumes more Draft and Target verification slots.',
    dsparkDraftArchitecture: 'A parallel backbone produces a block at once; a low-rank Markov head restores previous-token dependence inside the block.',
    dsparkTopology: 'Candidates form a semi-autoregressive block that keeps parallelism while adding lightweight sequential conditioning.',
    dsparkScheduling: 'A confidence head estimates prefix survival and chooses verification length with the engine load profile.',
    dsparkTradeoff: 'A longer verification block may commit more tokens, but can waste batch capacity on a high-rejection-risk suffix.',
    traceTitle: 'Concrete mechanism trace', traceSubtitle: 'Follow paper-based representative paths from proposal through scheduling and Target verification; structure and dependencies mirror the algorithms.',
    dynamicTree: 'Context-aware dynamic tree', treeHint: 'Solid edges form the accepted path; dashed branches are reclaimed at commit.', maskPurpose: 'After the tree is flattened, a normal causal mask would let sibling branches peek at one another. The ancestor mask exposes only a node’s own path, so one Target forward can score the whole tree while branches remain semantically independent.', maskExample: 'Example: {query} can see {visible}; it cannot see sibling branch {blocked}.', maskSize: '{rows} rows / {cols} columns', parallelBlock: 'Semi-autoregressive candidate block',
    paperMechanism: 'Paper-faithful mechanism', nodeValue: 'path value', topKParents: 'Orange: Top-k expansion parents in the current layer', globalTopM: 'Blue: global Top-m after reranking', flattenSequence: 'Flattened Target input', ancestorMask: 'Ancestor-visible mask', visible: 'visible', blocked: 'isolated',
    anchor: 'Anchor token', anchorProduced: 'The Target first generates an anchor from the committed prefix', maskInputs: 'positions to predict', maskToken: '[MASK]', dsparkInput: 'DSpark input this round', parallelStage: 'Heavy parallel backbone', baseLogits: 'Context-only base guesses (all positions at once)', baseMeaning: 'Each position’s base score sees only committed context; it has not yet seen the previous Draft token inside this block.', positionLabel: 'Position {index}', baseGuess: 'base guess', previousDraft: 'previous Draft token', finalGuess: 'corrected candidate', confidenceHeadLabel: 'Confidence head', sequentialStage: 'Lightweight Markov head (left to right)', transitionBias: 'Previous token → low-rank transition bias', conditionalSurvival: 'this position survives', prefixSurvival: 'the whole prefix survives', hardwareCurve: 'engine throughput curve', keepPrefix: 'keep first', dropSuffix: 'drop last', schedulerExplanation: 'Prefix survival falls with depth. The scheduler retains only the continuous prefix that still raises expected throughput.', correctionResult: 'Target accepts the prefix and corrects the first error', paperExample: 'Unified example: Large models can → anchor predict. DSpark proposes the / future / tokens / faster; the Target accepts the first two and corrects tokens to of.',
    confidence: 'Confidence', scheduled: 'verified', notScheduled: 'not verified', markovDependency: 'Markov head injects previous-token dependence', confidenceSchedule: 'Confidence head chooses the verification prefix',
    pending: 'pending', proposed: 'candidate', expanding: 'Top-k parent this round', reranked: 'global Top-m', pruned: 'pruned by rerank', masked: 'in ancestor mask', conditioned: 'sequential dependency added', verifying: 'verifying', accepted: 'accepted', rejected: 'rejected', committedStatus: 'committed', discarded: 'reclaimed', skipped: 'not verified',
    selectedPath: 'accepted path', otherBranch: 'other branch', output: 'Cycle output',
    metricCommitted: 'Committed tokens', metricBaselinePasses: 'Baseline Target forwards', metricTargetPasses: 'Speculative Target forwards', metricVerified: 'Verified / drafted positions', metricWasted: 'Verified but unused',
    costBaseline: 'Baseline: token-by-token decode', costSpeculative: 'Draft + block verify + runtime', costBreakdown: 'Cost breakdown', draftCost: 'Draft', verifyCost: 'Verify', runtimeCost: 'Runtime',
    lifecycleTitle: 'Target KV lifecycle', lifecycleSubtitle: 'Existing Prefix KV stays resident. Candidate slots are written temporarily during Target verification, and only consecutive accepted Draft-token KV survives.',
    kvPrefixResident: 'resident Prefix KV', kvCandidateSlots: 'candidate slots this round', kvStatePrefix: 'Prefix only', kvStateReserved: 'slots reserved', kvStateVerifying: 'writing temporary KV', kvStateCommitting: 'commit / reclaim', kvStateStable: 'new Prefix stable', kvHintPrefix: 'Candidates have not entered the Target, so this round has no allocated KV slots yet.', kvHintReserved: 'Verification slots are reserved but are not reusable history yet.', kvHintVerifying: 'The Target block forward is generating temporary KV for every verified position.', kvHintCommitting: 'The accepted prefix becomes resident and the remaining temporary slots are reclaimed.', kvHintCommittingCorrection: 'Accepted Draft KV becomes resident; rejected slots are reclaimed, while correction-token KV waits for the next Target forward.', kvHintStable: 'Accepted Draft KV has joined the Prefix; the other slots are reusable.', kvHintStableCorrection: 'Accepted Draft KV has joined the Prefix; correction-token KV will be generated by the next Target forward.', kvCorrectionPending: 'correction-token KV waits for next round',
    prefixSlot: 'prefix', reservedSlot: 'verification slot', committedSlot: 'committed', reclaimedSlot: 'reclaimed', skippedSlot: 'unallocated',
    currentStage: 'Current execution stage', mechanism: 'Core mechanism', principleTitle: 'Why it can be faster', exactnessTitle: 'Why the Target still determines the result', formulaVariables: 'Variables',
    speedupExplanation: 'A is the number of tokens committed this cycle and V is the number of positions actually scored by the Target. Speedup exists only when removed serial Target work exceeds Draft, block verification, and runtime overhead.',
    acceptExplanation: 'Classical modified rejection sampling accepts candidates in order; after the first rejection it samples from a correction distribution, preserving the Target distribution. Whether a tree or relaxed policy is lossless depends on the concrete method.',
    runtimeOps: 'Engine-style pseudocode', boundary: 'Capability boundary',
    boundaryText: 'This view models decode at low-to-medium concurrency when the Target is weight-bandwidth-bound. High batching, poor acceptance, a heavy Drafter, or an oversized verification block can shrink or erase the gain. Cost values expose dependencies; they are not paper or hardware measurements.',
    stageFeatureDraft: 'Feature-level autoregressive Draft', stageExpandTree: 'Expand Top-k by path value', stageRerankTree: 'Rerank Top-m over the full tree', stageFlattenMask: 'Flatten and build ancestor mask', stageTargetVerifyTree: 'Target verifies the candidate tree once', stageCommitTree: 'Accept a path and reclaim branches',
    stageParallelBackbone: 'Parallel backbone produces all base logits', stageSequentialMarkov: 'Markov head corrects left to right', stageConfidenceHead: 'Predict per-position conditional survival', stageScheduleVerify: 'Schedule with survival and hardware curve', stageTargetVerifyBlock: 'Target verifies the retained prefix', stageCommitBlock: 'Commit accepted prefix and correction',
    descFeatureDraft: 'The lightweight EAGLE head extrapolates autoregressively in feature space and uses a one-step-ahead token to resolve feature uncertainty.',
    descExpandTree: 'EAGLE-2 approximates global acceptance with the product of Draft confidences from the root, then expands only the highest-value Top-k nodes in the current layer.',
    descRerankTree: 'After expansion, all nodes are reranked by value and the global Top-m are kept. Shallower nodes win ties, preserving a connected tree.',
    descFlattenMask: 'The connected tree is flattened into one candidate sequence with a Tree Attention Mask that exposes only ancestors.',
    descTargetVerifyTree: 'The Target scores tree nodes together with an ancestor-visible Tree Attention Mask. Parallel scoring does not make acceptance parallel.',
    descCommitTree: 'The KV manager commits the accepted path and reclaims temporary Target KV for unselected nodes.',
    descParallelBackbone: 'DSpark’s heavy parallel backbone consumes an anchor-plus-mask block and produces hidden states and base logits for every position in one pass.',
    descSequentialMarkov: 'A lightweight low-rank Markov head uses the sampled previous token to form a transition bias, adds it to the current base logits, and samples left to right.',
    descConfidenceHead: 'The confidence head combines backbone hidden state with the previous token’s Markov embedding to predict conditional survival and calibrate prefix survival.',
    descScheduleVerify: 'The scheduler multiplies conditional survival estimates along each prefix and combines them with the engine throughput curve, retaining only the continuous prefix that improves expected throughput.',
    descTargetVerifyBlock: 'The Target executes one causal block forward over the scheduled candidate positions.',
    descCommitBlock: 'Commit the continuous accepted prefix plus the correction token, then release the verified but unused suffix.',
    codeEagle1: 'draft_state = eagle_head.feature_autoregressive(target_cache.last_hidden(request_id))', codeEagle2: 'tree.expand(top_k(tree.latest_layer, key=path_confidence_product))', codeEagle3: 'selected = top_m(tree.all_nodes, key=path_value, tie_break=shallow_first)', codeEagle4: 'tokens, ancestor_mask = flatten_connected_tree(selected); slots = kv_cache.reserve_tree(selected.parents)', codeEagle5: 'scores = target.verify_tree(tokens, ancestor_mask, slots)', codeEagle6: 'kv_cache.commit_path(request_id, accept(scores)); kv_cache.reclaim_others(slots)',
    codeDspark1: 'hidden, base_logits = parallel_backbone(anchor_token, mask_block, target_context_kv)', codeDspark2: 'block = sample_left_to_right(base_logits + markov_head(previous_token))', codeDspark3: 'conditional_survival = confidence_head(hidden, markov_embedding(block.previous_tokens))', codeDspark4: 'verify_len = scheduler.argmax_expected_tokens_times_sps(conditional_survival, engine.profile)', codeDspark5: 'scores = target.verify_block(block[:verify_len], kv_cache.reserve(verify_len))', codeDspark6: 'kv_cache.commit_prefix(request_id, accept_and_correct(scores)); kv_cache.reclaim_suffix()',
  },
};

const candidateTone = {
  pending: 'border-slate-200 bg-slate-50 text-slate-400',
  proposed: 'border-violet-300 bg-violet-50 text-violet-800',
  expanding: 'border-orange-400 bg-orange-50 text-orange-800 ring-2 ring-orange-200',
  reranked: 'border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-100',
  pruned: 'border-dashed border-slate-300 bg-slate-100 text-slate-400 line-through',
  masked: 'border-cyan-400 bg-cyan-50 text-cyan-800 ring-2 ring-cyan-100',
  conditioned: 'border-violet-400 bg-violet-50 text-violet-800 ring-2 ring-violet-100',
  verifying: 'border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-200',
  accepted: 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200',
  rejected: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200',
  committed: 'border-emerald-500 bg-emerald-100 text-emerald-900',
  discarded: 'border-slate-300 bg-slate-100 text-slate-400 line-through',
  skipped: 'border-dashed border-slate-300 bg-white text-slate-400',
};

const stageTone = {
  pending: 'border-slate-200 bg-slate-50 text-slate-400',
  active: 'border-blue-400 bg-blue-50 text-blue-900 ring-2 ring-blue-100',
  passed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  done: 'border-emerald-400 bg-emerald-50 text-emerald-900',
};

const kvSlotTone = {
  empty: 'border-dashed border-slate-300 bg-white',
  reserved: 'border-dashed border-blue-400 bg-blue-50',
  temporary: 'animate-pulse border-cyan-500 bg-cyan-200 ring-1 ring-cyan-200',
  committing: 'border-emerald-500 bg-emerald-200 ring-1 ring-emerald-300',
  reclaiming: 'border-rose-400 bg-rose-50 bg-[linear-gradient(135deg,transparent_42%,#fda4af_43%,#fda4af_57%,transparent_58%)]',
  committed: 'border-emerald-500 bg-emerald-200',
  free: 'border-dashed border-slate-300 bg-slate-50',
};

function interpolate(text, vars = {}) {
  return Object.entries(vars).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), text);
}

function StatusHeader({ snapshot, t }) {
  const label = snapshot.phase === 'idle' ? t('ready') : snapshot.phase === 'done' ? t('done') : t(snapshot.activeOperation.stageKey);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${snapshot.phase === 'running' ? 'animate-pulse bg-blue-500' : snapshot.phase === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{t('stepProgress', { current: snapshot.phase === 'idle' ? 0 : snapshot.phase === 'done' ? snapshot.maxStep : snapshot.step + 1, total: snapshot.maxStep })}</span>
    </div>
  );
}

function TimelineControls({ isPlaying, isDone, onReset, onPlay, onNext, t, label }) {
  return (
    <div className="flex items-center gap-2" aria-label={t(label)}>
      <button type="button" onClick={onReset} aria-label={t('reset')} title={t('reset')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><RotateCcw size={15} /></button>
      <button type="button" onClick={onPlay} aria-label={isPlaying ? t('pause') : isDone ? t('replay') : t('play')} title={isPlaying ? t('pause') : isDone ? t('replay') : t('play')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700">{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
      <button type="button" onClick={onNext} disabled={isPlaying || isDone} aria-label={t('next')} title={t('next')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><SkipForward size={15} /></button>
    </div>
  );
}

function TokenChip({ token, status = 'proposed', t, confidence, value }) {
  return (
    <motion.div layout className={`min-w-[78px] rounded-lg border px-2 py-1.5 text-center shadow-sm ${candidateTone[status] || candidateTone.pending}`}>
      <div className="text-xs font-extrabold">{token}</div>
      <div className="mt-0.5 whitespace-nowrap text-[8px] opacity-75">{typeof confidence === 'number' ? `c ${confidence.toFixed(2)}` : ''}{typeof value === 'number' ? ` · V ${value.toFixed(2)}` : ''}</div>
      <div className="mt-0.5 text-[8px] font-semibold">{t(status === 'committed' ? 'committedStatus' : status)}</div>
    </motion.div>
  );
}

function WhyFaster({ snapshot, t, racePlaying, onRaceReset, onRacePlay, onRaceNext }) {
  const { race } = snapshot;
  const raceStatusKey = race.isDone
    ? 'raceAllDone'
    : race.speculativeStage === 'pending'
      ? 'racePending'
      : race.speculativeStage === 'drafting'
        ? 'raceDrafting'
        : race.speculativeStage === 'verifying'
          ? 'raceVerifying'
          : race.speculativeStage === 'committing'
            ? 'raceCommitting'
            : 'raceFinished';
  const timeTicks = Array.from({ length: race.timeBudget + 1 }, (_, index) => index);
  const outputTone = (index, frontier) => index >= frontier ? 'border-indigo-400 bg-indigo-100 text-indigo-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800';
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="speculative-why-faster">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{t('teachingQuestion')}</div><h2 className="mt-1 text-lg font-extrabold text-slate-900">{t('raceTitle')}</h2><p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500">{t('raceSubtitle')}</p></div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 lg:justify-end">
          <div><div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{t('raceClock')}</div><div className="mt-0.5 text-sm font-extrabold text-slate-800">t = {race.elapsed.toFixed(2)}</div></div>
          <TimelineControls isPlaying={racePlaying} isDone={race.isDone} onReset={onRaceReset} onPlay={onRacePlay} onNext={onRaceNext} t={t} label="localRaceControls" />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{t('committedPrefix')}</span>{snapshot.prefixTokens.map((token) => <span key={token} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">{token}</span>)}</div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="principle-race">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[150px_minmax(440px,1fr)_110px] items-end gap-3 text-[9px] text-slate-400">
            <div>{t('outputStream')}</div>
            <div className="relative h-8 border-b border-slate-300">
              {timeTicks.map((tick) => <div key={tick} className="absolute bottom-0 -translate-x-1/2" style={{ left: `${tick / race.timeBudget * 100}%` }}><div className="mx-auto h-2 w-px bg-slate-300" /><span>{tick}</span></div>)}
              <div className="absolute bottom-0 top-0 z-20 w-0.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.45)]" style={{ left: `${race.progress * 100}%` }}><span className="absolute -top-1 left-1 rounded bg-rose-100 px-1 text-[8px] font-bold text-rose-700">{t('raceNow')}</span></div>
            </div>
            <div className="text-right">0 → {race.timeBudget}</div>
          </div>

          <div className="mt-3 grid grid-cols-[150px_minmax(440px,1fr)_110px] items-center gap-3" data-testid="baseline-target-passes">
            <div><h3 className="text-xs font-extrabold text-slate-800">{t('baseline')}</h3><p className="mt-1 text-[9px] text-slate-500">{t('baselineSubtitle')}</p></div>
            <div>
              <div className="grid h-12 gap-1" style={{ gridTemplateColumns: `repeat(${race.timeBudget}, minmax(0, 1fr))` }}>
              {Array.from({ length: race.timeBudget }, (_, index) => {
                const complete = index < race.baselineCompleted;
                const active = index === race.baselineActivePass;
                return <motion.div key={index} animate={{ scale: active ? 1.03 : 1 }} className={`flex flex-col items-center justify-center rounded-lg border text-center ${complete ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : active ? 'border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-100' : 'border-slate-200 bg-white text-slate-400'}`}><Cpu size={14} /><span className="mt-0.5 text-[8px] font-bold">{t('targetForward')} #{index + 1}</span></motion.div>;
              })}
              </div>
              <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1"><span className="mr-1 text-[8px] font-bold uppercase text-slate-400">{t('outputStream')}</span>{race.baselineTokens.map((token, index) => <motion.span initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={`${token}-${index}`} className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-[8px] font-bold text-emerald-800">{token}</motion.span>)}</div>
            </div>
            <div className="rounded-lg bg-white p-2 text-right"><div className="text-[8px] uppercase text-slate-400">{t('raceBaselineCount')}</div><div className="text-lg font-extrabold text-slate-700">{race.baselineCompleted}</div><div className="text-[8px] text-slate-400">{t('tokenUnit')}</div></div>
          </div>

          <div className="mt-3 grid grid-cols-[150px_minmax(440px,1fr)_110px] items-center gap-3" data-testid="speculative-target-passes">
            <div><h3 className="text-xs font-extrabold text-indigo-900">{t('selectedAlgorithm')}</h3><p className="mt-1 text-[9px] text-indigo-600">{t('cheapProposalHint')}</p></div>
            <div>
              <div className="relative h-12 overflow-hidden rounded-lg border border-indigo-200 bg-white">
                {race.cycles.map((cycle) => {
                  const cycleWidth = Math.max(0.001, cycle.end - cycle.start);
                  const draftWidth = (cycle.draftEnd - cycle.start) / cycleWidth * 100;
                  const verifyWidth = (cycle.verifyEnd - cycle.draftEnd) / cycleWidth * 100;
                  const commitWidth = Math.max(0, 100 - draftWidth - verifyWidth);
                  return <div key={cycle.index} className={`absolute inset-y-1 rounded border ${cycle.completed ? 'border-emerald-300' : cycle.active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`} style={{ left: `${cycle.start / race.timeBudget * 100}%`, width: `${(cycle.end - cycle.start) / race.timeBudget * 100}%` }}><div className="absolute inset-y-0 left-0 bg-violet-100" style={{ width: `${draftWidth}%` }} title={t('cheapProposal')} /><div className="absolute inset-y-0 bg-blue-100" style={{ left: `${draftWidth}%`, width: `${verifyWidth}%` }} title={t('oneBlockVerify')} /><div className="absolute inset-y-0 bg-amber-100" style={{ left: `${draftWidth + verifyWidth}%`, width: `${commitWidth}%` }} title={t('commitBurst')} /><span className="absolute left-1 top-0.5 z-10 text-[7px] font-bold text-indigo-700">{t('cycle')} {cycle.index + 1}</span>{cycle.completed && <span className="absolute bottom-0.5 right-1 z-10 rounded bg-emerald-600 px-1 text-[7px] font-bold text-white">+{snapshot.committedCount}</span>}</div>;
                })}
                <div className="absolute inset-y-0 z-10 w-0.5 bg-rose-500" style={{ left: `${race.progress * 100}%` }} />
              </div>
              <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1"><span className="mr-1 text-[8px] font-bold uppercase text-indigo-400">{t('outputStream')}</span>{race.speculativeTokens.map((token, index) => <motion.span initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={`${token}-${index}`} className={`rounded border px-1.5 py-1 text-[8px] font-bold ${outputTone(index, race.baselineCompleted)}`}>{token}</motion.span>)}</div>
              <div className="mt-1 flex gap-2 text-[8px] font-semibold"><span className="text-violet-700">■ {t('cheapProposal')}</span><span className="text-blue-700">■ {t('oneBlockVerify')}</span><span className="text-amber-700">■ {t('commitBurst')}</span></div>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2 text-right"><div className="text-[8px] uppercase text-indigo-500">{t('raceSpeculativeCount')}</div><div className="text-lg font-extrabold text-indigo-800">{race.speculativeCommitted}</div><div className="text-[8px] text-indigo-400">{t('tokenUnit')}</div></div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"><span className={`h-2 w-2 rounded-full ${racePlaying ? 'animate-pulse bg-blue-500' : race.isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />{t(raceStatusKey)}</div><div className={`rounded-lg px-3 py-2 text-center text-xs font-extrabold ${race.lead > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{race.lead > 0 ? `${t('raceLead')} +${race.lead} ${t('tokenUnit')}` : race.isDone ? t('raceTie') : t('raceNoLead')}</div></div>
    </section>
  );
}

const matrixSize = {
  tall: 'h-12 w-8', wide: 'h-8 w-14', square: 'h-10 w-10', narrow: 'h-10 w-7', vector: 'h-12 w-3',
};

const matrixPalette = {
  target: { border: 'border-blue-400', fill: 'bg-blue-100', grid: 'rgba(37,99,235,0.22)', text: 'text-blue-950' },
  shared: { border: 'border-amber-400', fill: 'bg-amber-100', grid: 'rgba(217,119,6,0.22)', text: 'text-amber-950' },
  draft: { border: 'border-violet-400', fill: 'bg-violet-100', grid: 'rgba(124,58,237,0.22)', text: 'text-violet-950' },
};

function WeightMatrixGlyph({ matrix, tone = 'target', active = false, t }) {
  const palette = matrixPalette[tone];
  const gridStyle = {
    backgroundImage: `linear-gradient(to right, ${palette.grid} 1px, transparent 1px), linear-gradient(to bottom, ${palette.grid} 1px, transparent 1px)`,
    backgroundSize: '7px 7px',
  };
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-md border bg-white/80 p-2 transition ${palette.border} ${active ? 'ring-2 ring-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]' : ''}`}>
      <div aria-hidden="true" style={gridStyle} className={`shrink-0 rounded border ${matrixSize[matrix.aspect] || matrixSize.square} ${palette.border} ${palette.fill}`} />
      <div className="min-w-0 flex-1"><div className={`text-[8px] font-extrabold leading-tight ${palette.text}`}>{t(matrix.labelKey)}</div><div className="mt-0.5 overflow-x-auto text-[9px]"><MathFormula>{matrix.formula}</MathFormula></div><div className="mt-0.5 flex flex-wrap items-center gap-1 text-[7px] text-slate-500"><span>{t('shapeLabel')}</span><MathFormula>{matrix.shape}</MathFormula></div></div>
    </div>
  );
}

function SimpleWeightBlock({ group, tone, t }) {
  return <WeightMatrixGlyph matrix={group} tone={tone} active={group.active} t={t} />;
}

function StackedTransformerLayer({ group, tone, showKv = false, kvShape, t }) {
  const isTarget = tone === 'target';
  const isLayerStack = ['decoderStack', 'draftDecoder', 'parallelBackbone'].includes(group.id);
  return (
    <div className={`relative mb-2 mt-2 ${isLayerStack ? 'ml-2' : ''}`}>
      {isLayerStack && <><div className={`absolute inset-0 translate-x-2 translate-y-2 rounded-xl border ${isTarget ? 'border-blue-200 bg-blue-50' : 'border-violet-200 bg-violet-50'}`} /><div className={`absolute inset-0 translate-x-1 translate-y-1 rounded-xl border ${isTarget ? 'border-blue-300 bg-blue-50' : 'border-violet-300 bg-violet-50'}`} /></>}
      <div className={`relative rounded-xl border-2 bg-white p-2.5 transition ${isTarget ? 'border-blue-400' : 'border-violet-400'} ${group.active ? 'ring-2 ring-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.22)]' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-1"><div className={`text-[9px] font-extrabold ${isTarget ? 'text-blue-950' : 'text-violet-950'}`}>{t(group.labelKey)}</div><div className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-700"><MathFormula>{group.formula}</MathFormula></div></div>
        {isLayerStack && <div className="mt-1 text-[7px] font-semibold uppercase tracking-wide text-slate-400">{t('representativeLayer')} · {t('stackedLayers')}</div>}
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{group.matrices.map((matrix) => <WeightMatrixGlyph key={matrix.id} matrix={matrix} tone={tone} active={group.active} t={t} />)}</div>
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[8px] font-semibold text-slate-600">{t('weightNormStage')} → {t('weightAttention')} → {t('layerResidual')} → {t('weightNormStage')} → {t('weightMlp')}</div>
        {showKv && <div className={`mt-2 rounded-lg border border-dashed border-cyan-400 bg-cyan-50 p-2 ${group.active ? 'ring-2 ring-cyan-200' : ''}`}><div className="flex flex-wrap items-center justify-between gap-1 text-[8px] font-extrabold text-cyan-900"><span>{t('targetKvPerLayer')}</span><MathFormula>{String.raw`K^{(\ell)},V^{(\ell)}`}</MathFormula></div><div className="mt-1 text-[8px] text-cyan-800"><MathFormula>{kvShape}</MathFormula></div><div className="mt-1 text-[7px] text-cyan-700">{t('targetKvState')}</div></div>}
        {group.active && <div className="mt-2 text-[8px] font-bold uppercase tracking-wide text-rose-600">{t('activeNow')}</div>}
      </div>
    </div>
  );
}

function FlowArrow({ label, tone = 'slate' }) {
  const tones = { slate: 'text-slate-400', cyan: 'text-cyan-700', violet: 'text-violet-700', emerald: 'text-emerald-700' };
  return <div className={`flex items-center justify-center gap-1 py-1 text-center text-[8px] font-bold ${tones[tone]}`}><ArrowRight className="rotate-90" size={14} />{label}</div>;
}

function ArchitectureDetailedLegacy({ snapshot, t }) {
  const { architecture } = snapshot;
  const target = Object.fromEntries(architecture.targetWeights.map((group) => [group.id, group]));
  const draft = Object.fromEntries(architecture.draftWeights.map((group) => [group.id, group]));
  const shared = Object.fromEntries(architecture.sharedWeights.map((group) => [group.id, group]));
  const descriptionKey = {
    featureDraft: 'descFeatureDraft', expandTree: 'descExpandTree', rerankTree: 'descRerankTree', flattenMask: 'descFlattenMask', targetVerify: snapshot.algorithm === 'eagle2' ? 'descTargetVerifyTree' : 'descTargetVerifyBlock', commitKv: snapshot.algorithm === 'eagle2' ? 'descCommitTree' : 'descCommitBlock',
    parallelBackbone: 'descParallelBackbone', sequentialMarkov: 'descSequentialMarkov', confidenceHead: 'descConfidenceHead', scheduleVerify: 'descScheduleVerify',
  }[snapshot.activeOperation?.type];
  const stageKey = snapshot.phase === 'idle' ? 'ready' : snapshot.phase === 'done' ? 'done' : snapshot.activeOperation.stageKey;
  const liveCandidates = (snapshot.algorithm === 'eagle2' ? snapshot.flattenedCandidates : snapshot.candidates).slice(0, 8);
  const dimensionItems = [
    [String.raw`B`, 'dimBatch'], [String.raw`L`, 'dimSequence'], [String.raw`V`, 'dimVocab'], [String.raw`d`, 'dimHidden'], [String.raw`d_{ff}`, 'dimFfn'], [String.raw`H_{kv},d_h`, 'dimHeads'],
    ...(snapshot.algorithm === 'dspark' ? [[String.raw`M`, 'dimFeatureTaps'], [String.raw`\gamma`, 'dimBlock'], [String.raw`r`, 'dimRank']] : []),
  ];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="speculative-architecture">
      <div className="mb-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{t('architectureTitle')}</div><h2 className="mt-1 text-base font-extrabold text-slate-900">{t('macroTitle')}</h2><p className="mt-1 max-w-5xl text-xs leading-relaxed text-slate-500">{t('macroSubtitle')}</p></div>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(350px,0.75fr)]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="static-weight-topology">
          <div><h3 className="text-sm font-extrabold text-slate-900">{t('modelWeightCanvas')}</h3><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{t('modelWeightCanvasHint')}</p></div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-bold"><span className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-blue-800">■ {t('targetOwnWeights')}</span><span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">■ {t('sharedFrozenWeights')}</span><span className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-violet-800">■ {t('draftTrainableWeights')}</span><span className="rounded border border-dashed border-cyan-400 bg-cyan-50 px-2 py-1 text-cyan-800">□ {t('runtimeActivationOnly')}</span></div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2"><div className="text-[8px] font-bold uppercase tracking-wide text-slate-500">{t('dimensionLegend')}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{dimensionItems.map(([formula, key]) => <span key={key} className="inline-flex items-center gap-1 text-[8px] text-slate-600"><MathFormula>{formula}</MathFormula>= {t(key)}</span>)}</div></div>

          <div className="mt-3 grid items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_104px_minmax(0,1fr)]">
            <div className={`rounded-xl border-2 bg-white p-3 transition ${architecture.activeOwner === 'target' ? 'border-rose-400 ring-2 ring-rose-200' : 'border-blue-300'}`} data-testid="target-model-tower">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2 text-xs font-extrabold text-blue-950"><Cpu size={16} />{t('targetTower')}</div><p className="mt-0.5 text-[8px] text-blue-700">{t('targetCheckpointHint')}</p></div><div className="rounded bg-blue-50 px-2 py-1 text-[9px] text-blue-700"><MathFormula>{String.raw`\theta_T`}</MathFormula></div></div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 p-2 text-center text-[9px] font-bold text-white">{t('inputTokenTensor')} · <MathFormula>{architecture.tensorShapes.input}</MathFormula></div>
              <FlowArrow label={t('weightEmbedding')} />
              <SimpleWeightBlock group={target.embedding} tone="target" t={t} />
              <FlowArrow label={t('targetHiddenTensor')} tone="cyan" />
              <StackedTransformerLayer group={target.decoderStack} tone="target" showKv kvShape={architecture.tensorShapes.targetKv} t={t} />
              <FlowArrow label={t('weightFinalNorm')} />
              <SimpleWeightBlock group={target.finalNorm} tone="target" t={t} />
              <FlowArrow label={t('weightLmHead')} />
              <SimpleWeightBlock group={target.lmHead} tone="target" t={t} />
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-center text-[9px] font-bold text-blue-900">{t('logitsTensor')} · <MathFormula>{architecture.tensorShapes.logits}</MathFormula></div>
            </div>

            <div className="rounded-xl border border-dashed border-cyan-300 bg-cyan-50/60 p-2 2xl:mt-24" data-testid="model-coupling">
              <div className="text-center text-[8px] font-extrabold uppercase tracking-wide text-cyan-900">{t('modelCoupling')}</div>
              <div className="mt-2 space-y-3"><div className="text-center text-[8px] font-bold text-cyan-800"><ArrowRight className="mx-auto mb-1 rotate-90 2xl:rotate-0" size={16} />{t('targetFeatureToDraft')}</div><div className="text-center text-[8px] font-bold text-violet-800"><ArrowRight className="mx-auto mb-1 rotate-90 2xl:rotate-180" size={16} />{t('draftCandidatesToTarget')}</div><div className="text-center text-[8px] font-bold text-emerald-800"><ArrowRight className="mx-auto mb-1 rotate-90 2xl:rotate-180" size={16} />{t('targetScoresToKv')}</div></div>
            </div>

            <div className={`rounded-xl border-2 bg-white p-3 transition ${architecture.activeOwner === 'draft' ? 'border-rose-400 ring-2 ring-rose-200' : 'border-violet-300'}`} data-testid="draft-model-tower">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2 text-xs font-extrabold text-violet-950"><BrainCircuit size={16} />{t('draftTower')}</div><p className="mt-0.5 text-[8px] text-violet-700">{t(architecture.checkpointKey)}</p></div><div className="rounded bg-violet-50 px-2 py-1 text-[9px] text-violet-700"><MathFormula>{String.raw`\theta_D`}</MathFormula></div></div>
              <div className="mt-3 grid grid-cols-2 gap-1.5"><SimpleWeightBlock group={shared.sharedEmbedding} tone="shared" t={t} /><SimpleWeightBlock group={architecture.activationTap} tone="shared" t={t} /></div>
              <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-[7px] leading-relaxed text-amber-800">{t('activationTapHint')}</p>
              <FlowArrow label={snapshot.algorithm === 'eagle2' ? t('weightFusionProjection') : t('weightFeatureProjection')} tone="violet" />
              <SimpleWeightBlock group={snapshot.algorithm === 'eagle2' ? draft.fusionProjection : draft.featureProjection} tone="draft" t={t} />
              <FlowArrow label={snapshot.algorithm === 'eagle2' ? t('weightEagleDecoder') : t('weightParallelBackbone')} tone="violet" />
              <StackedTransformerLayer group={snapshot.algorithm === 'eagle2' ? draft.draftDecoder : draft.parallelBackbone} tone="draft" t={t} />
              {snapshot.algorithm === 'dspark' && <><FlowArrow label={t('weightMarkovHead')} tone="violet" /><StackedTransformerLayer group={draft.markovHead} tone="draft" t={t} /><FlowArrow label={t('weightConfidenceHead')} tone="violet" /><SimpleWeightBlock group={draft.confidenceHead} tone="draft" t={t} /></>}
              <FlowArrow label={t('sharedFrozenWeights')} tone="violet" />
              <SimpleWeightBlock group={shared.sharedLmHead} tone="shared" t={t} />
              <div className={`mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 transition ${architecture.controller.active ? 'ring-2 ring-rose-300' : ''}`}><div className="text-[8px] font-extrabold text-slate-800">{t(architecture.controller.labelKey)}</div><p className="mt-1 text-[7px] leading-relaxed text-slate-500">{t('noLearnedWeights')}</p></div>
              <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-2 text-center text-[9px] font-bold text-violet-900">{t('candidateTensor')} · <MathFormula>{architecture.tensorShapes.candidates}</MathFormula></div>
              <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[8px] leading-relaxed text-amber-800">{t('sharedReuseHint')}</p>
            </div>
          </div>
          <p className="mt-3 text-[8px] text-slate-400">{t('notToScale')}</p>
        </div>

        <aside className="space-y-3" data-testid="runtime-activation-order">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3"><h3 className="text-sm font-extrabold text-slate-900">{t('liveRuntimeTitle')}</h3><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{t('liveRuntimeSubtitle')}</p><div className="mt-3 rounded-lg border border-blue-200 bg-white p-3"><div className="text-[8px] font-bold uppercase tracking-wide text-blue-600">{t('currentStage')}</div><div className="mt-1 text-sm font-extrabold text-slate-900">{t(stageKey)}</div><p className="mt-1 text-[10px] leading-relaxed text-slate-600">{descriptionKey ? t(descriptionKey) : t('draftOffDuringPrefill')}</p></div>
            <div className="mt-2 space-y-1.5">{architecture.runtimeStages.map((stage) => { const Icon = stage.owner === 'target' ? Cpu : stage.owner === 'draft' ? BrainCircuit : ShieldCheck; const ownerKey = stage.owner === 'target' ? 'targetOwnerShort' : stage.owner === 'draft' ? 'draftOwnerShort' : 'kvOwnerShort'; return <div key={stage.id} className={`grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded-lg border px-2.5 py-2 transition ${stageTone[stage.status]}`}><Icon size={14} /><div><div className="text-[9px] font-extrabold">{t(stage.labelKey)}</div><div className="text-[7px] opacity-75">{t(stage.hintKey)}</div></div><span className="text-[7px] font-bold uppercase">{t(ownerKey)}</span></div>; })}</div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[8px] font-semibold text-slate-500"><RotateCcw size={12} />{t('loopBack')}</div>
          </div>

          <div className="rounded-xl border border-cyan-200 bg-white p-3"><h3 className="text-xs font-extrabold text-cyan-950">{t('liveTensorTrace')}</h3><div className="mt-2 rounded-lg border border-dashed border-cyan-300 bg-cyan-50 p-2"><div className="text-[8px] font-bold text-cyan-800">{t('currentActivation')}</div><div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[9px]"><MathFormula>{architecture.activationTap.formula}</MathFormula><MathFormula>{architecture.activationTap.shape}</MathFormula></div></div><div className="mt-2 text-[8px] font-bold text-slate-500">{t('currentCandidates')}</div><div className="mt-1 flex flex-wrap gap-1">{liveCandidates.map((candidate) => <span key={candidate.id} className={`rounded border px-1.5 py-1 text-[8px] font-bold ${candidateTone[candidate.status] || candidateTone.proposed}`}>{candidate.token}</span>)}</div><p className="mt-2 text-[8px] leading-relaxed text-cyan-800">{t('targetKvInside')}</p></div>

          <KvLifecycle snapshot={snapshot} t={t} />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3"><div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-900"><Gauge size={14} />{t('whyFastCard')}</div><div className="mt-2 overflow-x-auto rounded bg-white p-1 text-[8px]"><MathFormula block>{SPEEDUP_FORMULA}</MathFormula></div><p className="mt-2 text-[9px] leading-relaxed text-indigo-900">{t('whyFastBody')}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3"><div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-900"><ShieldCheck size={14} />{t('whyExactCard')}</div><div className="mt-2 overflow-x-auto rounded bg-white p-1 text-[8px]"><MathFormula block>{ACCEPT_FORMULA}</MathFormula></div><p className="mt-2 text-[9px] leading-relaxed text-emerald-900">{t('whyExactBody')}</p></div></div>
        </aside>
      </div>
    </section>
  );
}

const draftFlowTone = {
  activation: 'border-dashed border-cyan-400 bg-cyan-50 text-cyan-950',
  shared: 'border-amber-300 bg-amber-50 text-amber-950',
  draft: 'border-violet-300 bg-violet-50 text-violet-950',
  runtime: 'border-dashed border-slate-300 bg-slate-50 text-slate-700',
};

function DraftFlowNode({ group, t }) {
  const tone = draftFlowTone[group.kind] || draftFlowTone.draft;
  return (
    <div className={`min-w-0 rounded-md border p-1.5 transition ${tone} ${group.active ? 'ring-2 ring-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.16)]' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-1">
        <span className="min-w-0 text-[7px] font-extrabold leading-tight">{t(group.labelKey)}</span>
        {group.active && <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-label={t('activeNow')} title={t('activeNow')} />}
      </div>
      {(group.formula || group.shape) && <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[6px] leading-none opacity-75">{group.formula && <MathFormula>{group.formula}</MathFormula>}{group.shape && <MathFormula>{group.shape}</MathFormula>}</div>}
      {group.matrices && <div className="mt-1 grid grid-cols-2 gap-0.5">{group.matrices.map((matrix) => <div key={matrix.id} className="min-w-0 rounded border border-current/15 bg-white/70 px-1 py-0.5 text-center text-[6px] font-bold leading-none"><MathFormula>{matrix.formula}</MathFormula></div>)}</div>}
    </div>
  );
}

function DraftInternalFlow({ snapshot, t }) {
  const { architecture } = snapshot;
  const groups = Object.fromEntries(architecture.draftWeights.map((group) => [group.id, group]));
  const shared = Object.fromEntries(architecture.sharedWeights.map((group) => [group.id, group]));
  return (
    <div className="mt-2 space-y-1" data-testid="draft-internal-flow">
      <div className="grid grid-cols-2 gap-1"><DraftFlowNode group={architecture.activationTap} t={t} /><DraftFlowNode group={shared.sharedEmbedding} t={t} /></div>
      {snapshot.algorithm === 'eagle2' ? <>
        <div className="grid grid-cols-[0.72fr_1.28fr] gap-1"><DraftFlowNode group={groups.fusionProjection} t={t} /><DraftFlowNode group={groups.draftDecoder} t={t} /></div>
        <div className="grid grid-cols-2 gap-1"><DraftFlowNode group={shared.sharedLmHead} t={t} /><DraftFlowNode group={architecture.controller} t={t} /></div>
      </> : <>
        <div className="grid grid-cols-[0.72fr_1.28fr] gap-1"><DraftFlowNode group={groups.featureProjection} t={t} /><DraftFlowNode group={groups.parallelBackbone} t={t} /></div>
        <div className="grid grid-cols-2 gap-1"><DraftFlowNode group={shared.sharedLmHead} t={t} /><DraftFlowNode group={groups.markovHead} t={t} /></div>
        <div className="grid grid-cols-[0.8fr_1.2fr] gap-1"><DraftFlowNode group={groups.confidenceHead} t={t} /><DraftFlowNode group={architecture.controller} t={t} /></div>
      </>}
    </div>
  );
}

function Architecture({ snapshot, t, isPlaying, onReset, onPlay, onNext }) {
  const { architecture } = snapshot;
  const targetActive = architecture.activeOwner === 'target';
  const draftActive = architecture.activeOwner === 'draft';
  const kvActive = snapshot.kvLifecycle.isChanging;
  const targetStages = architecture.runtimeStages.filter((stage) => stage.owner === 'target');
  const draftStage = architecture.runtimeStages.find((stage) => stage.owner === 'draft');
  const metrics = [
    [t('metricCommitted'), `${snapshot.committedCount} ${t('tokenUnit')}`],
    [t('metricBaselinePasses'), `${snapshot.baselineTargetPasses} ${t('passes')}`],
    [t('metricTargetPasses'), `${snapshot.targetPasses} ${t('pass')}`],
    [t('metricVerified'), `${snapshot.verifiedCount} / ${snapshot.draftedCount}`],
    [t('metricWasted'), `${snapshot.wastedCount} ${t('positions')}`],
  ];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="speculative-architecture">
      <div className="mb-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{t('architectureTitle')}</div><h2 className="mt-1 text-base font-extrabold text-slate-900">{t('macroTitle')}</h2><p className="mt-1 max-w-5xl text-xs leading-relaxed text-slate-500">{t('macroSubtitle')}</p></div>
      <div className="mx-auto grid w-full max-w-[1240px] items-start gap-2.5 xl:grid-cols-[310px_minmax(0,920px)]">
        <aside className="space-y-3" data-testid="static-weight-topology">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5"><h3 className="text-sm font-extrabold text-slate-900">{t('relationOverview')}</h3><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{t('relationOverviewHint')}</p>
            <div className={`mt-2.5 rounded-xl border-2 bg-white p-2.5 transition ${targetActive ? 'border-rose-400 ring-2 ring-rose-200' : 'border-blue-300'}`} data-testid="target-model-tower">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-extrabold text-blue-950"><Cpu size={15} />{t('targetModel')}</div><span className="rounded bg-blue-50 px-2 py-1 text-[9px] text-blue-800"><MathFormula>{String.raw`\theta_T`}</MathFormula></span></div>
              <div className="mt-2 flex items-center gap-1" aria-label={t('targetCompactStructure')}><span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-800">E</span><ArrowRight size={11} className="text-blue-300" /><div className="relative flex-1 py-1"><div className="absolute inset-x-1 top-0 h-5 rounded border border-blue-200 bg-blue-50" /><div className="absolute inset-x-0 top-1 h-5 rounded border border-blue-300 bg-blue-100" /><div className="relative mt-2 rounded border border-blue-400 bg-white px-2 py-1 text-center text-[8px] font-bold text-blue-900">{t('weightDecoderStack')} <MathFormula>{String.raw`L_T`}</MathFormula></div></div><ArrowRight size={11} className="text-blue-300" /><span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-800">LM</span></div>
              <div className="mt-2 text-[8px] font-semibold text-blue-800">{t('targetCompactStructure')}</div><div className="mt-2 space-y-1 text-[8px] leading-relaxed text-slate-600"><div>→ {t('targetInputLabel')}</div><div>← {t('targetOutputLabel')}</div></div>
              <div className="mt-2 border-t border-blue-100 pt-2"><div className="text-[6px] font-bold uppercase tracking-wide text-blue-500">{t('targetStagePorts')}</div><div className="mt-1 flex flex-wrap gap-1">{targetStages.map((stage) => <span key={stage.id} className={`rounded border px-1.5 py-1 text-[7px] font-bold ${stageTone[stage.status]}`}>{t(stage.labelKey)}</span>)}</div></div>
            </div>

            <div className="my-1 grid grid-cols-2 gap-2"><div className={`flex items-center gap-1 rounded px-1 py-1 text-[7px] font-bold ${draftActive ? 'bg-cyan-100 text-cyan-900' : 'text-cyan-700'}`}><ArrowRight className="rotate-90" size={13} /><span>{t('targetFeaturePort')}</span></div><div className={`flex items-center justify-end gap-1 rounded px-1 py-1 text-right text-[7px] font-bold ${targetActive ? 'bg-violet-100 text-violet-900' : 'text-violet-700'}`}><span>{t('candidateReturnPort')}</span><ArrowRight className="-rotate-90" size={13} /></div></div>

            <div className={`rounded-xl border-2 bg-white p-2.5 transition ${draftActive ? 'border-rose-400 ring-2 ring-rose-200' : 'border-violet-300'}`} data-testid="draft-model-tower">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-extrabold text-violet-950"><BrainCircuit size={15} />{t(snapshot.algorithm)}</div><div className="flex items-center gap-1"><span className="rounded bg-violet-50 px-2 py-1 text-[9px] text-violet-800"><MathFormula>{String.raw`\theta_D`}</MathFormula></span>{draftStage && <span className={`rounded border px-1.5 py-1 text-[7px] font-bold ${stageTone[draftStage.status]}`}>{t(draftStage.labelKey)}</span>}</div></div>
              <DraftInternalFlow snapshot={snapshot} t={t} />
            </div>

            <div className={`my-1 grid grid-cols-[18px_1fr] items-center gap-2 rounded px-1 py-1 text-[8px] font-bold ${targetActive || kvActive ? 'bg-emerald-100 text-emerald-900' : 'text-emerald-700'}`}><ArrowRight className="rotate-90" size={15} /><span>{t('targetVerdictPort')} · {t('interactionVerify')}</span></div>

            <div
              className={`rounded-xl border p-2.5 transition ${snapshot.kvLifecycle.state === 'verifying' ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : snapshot.kvLifecycle.state === 'committing' ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200' : snapshot.kvLifecycle.state === 'stable' ? 'border-emerald-300 bg-emerald-50' : 'border-cyan-300 bg-cyan-50'}`}
              data-testid="compact-kv-relation"
              data-kv-state={snapshot.kvLifecycle.state}
            >
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] font-extrabold text-cyan-950"><Boxes size={14} />{t('lifecycleTitle')}</div><span className="rounded border border-current/15 bg-white/70 px-1.5 py-1 text-[7px] font-bold text-slate-700">{t(snapshot.kvLifecycle.statusKey)}</span></div>
              <div className="mt-2 flex items-center gap-1">
                <div className="flex h-5 w-16 shrink-0 items-center justify-center rounded border border-slate-400 bg-slate-300 px-1 text-[6px] font-bold text-slate-700">{t('kvPrefixResident')}</div>
                <ArrowRight size={10} className="shrink-0 text-cyan-500" />
                <div className="flex min-w-0 flex-1 gap-1">{snapshot.kvLifecycle.slots.map((slot) => <div key={slot.id} data-kv-slot-state={slot.state} aria-label={`${t('kvCandidateSlots')} ${slot.index + 1}`} className={`h-5 min-w-2 flex-1 rounded border transition ${kvSlotTone[slot.state]}`} />)}</div>
              </div>
              {snapshot.kvLifecycle.correctionPending && <div className="mt-1.5 flex items-center justify-between gap-2 rounded border border-orange-200 bg-orange-50 px-1.5 py-1 text-[7px] font-bold text-orange-800"><span>{t('kvCorrectionPending')}</span><span>{snapshot.kvLifecycle.correctionToken}</span></div>}
              <p className="mt-1.5 text-[8px] leading-relaxed text-cyan-900">{t(snapshot.kvLifecycle.hintKey)}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3"><div className="flex items-center gap-1 text-[9px] font-extrabold text-indigo-900"><Gauge size={13} />{t('whyFastCard')}</div><p className="mt-1 text-[8px] leading-relaxed text-indigo-900">{t('whyFastBody')}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-900"><ShieldCheck size={13} />{t('whyExactCard')}</div><p className="mt-1 text-[8px] leading-relaxed text-emerald-900">{t('whyExactBody')}</p></div></div>
        </aside>

        <div className="min-w-0 space-y-3" data-testid="algorithm-workbench">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-start"><div><h3 className="text-sm font-extrabold text-slate-900">{t('algorithmWorkbench')} · {t(snapshot.algorithm)}</h3><p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-500">{t('algorithmWorkbenchHint')}</p></div><div className="flex flex-wrap items-center justify-between gap-3"><StatusHeader snapshot={snapshot} t={t} /><TimelineControls isPlaying={isPlaying} isDone={snapshot.phase === 'done'} onReset={onReset} onPlay={onPlay} onNext={onNext} t={t} label="localTraceControls" /></div></div>
          <div className="grid gap-2 sm:grid-cols-3 2xl:grid-cols-6">{snapshot.stages.map((stage, index) => <div key={stage.type} className={`relative rounded-lg border p-2 text-[9px] font-bold ${stageTone[stage.status]}`}><span className="mr-1 opacity-60">{index + 1}.</span>{t(stage.stageKey)}{index < snapshot.stages.length - 1 && <FastForward className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 2xl:block" size={12} />}</div>)}</div>
          {snapshot.algorithm === 'eagle2' ? <EagleTrace snapshot={snapshot} t={t} /> : <DsparkTrace snapshot={snapshot} t={t} />}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><Check size={16} className="text-emerald-600" /><span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">{t('output')}</span>{snapshot.committedTokens.map((token, index) => <span key={`${token}-${index}`} className={`rounded px-2 py-1 text-[9px] font-bold ${index === snapshot.committedTokens.length - 1 && snapshot.hasCorrection ? 'bg-orange-100 text-orange-800' : 'bg-white text-emerald-800'}`}>{token}</span>)}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="text-[8px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-sm font-extrabold text-slate-800">{value}</div></div>)}</div>
        </div>
      </div>
    </section>
  );
}

function EagleTrace({ snapshot, t }) {
  const positions = Object.fromEntries(snapshot.candidates.map((node) => [node.id, { x: 8 + node.column * 13.5, y: 12 + node.level * 26 } ]));
  const candidateById = Object.fromEntries(snapshot.candidates.map((node) => [node.id, node]));
  const rerankVisible = snapshot.phase === 'done' || snapshot.operationIndex >= 2;
  const maskVisible = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 3;
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3" data-testid="eagle-tree">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-violet-800"><GitBranch size={15} />{t('paperMechanism')} · {t('dynamicTree')}</div><div className="rounded bg-white px-2 py-1 text-[10px] text-violet-800"><MathFormula>{EAGLE_VALUE_FORMULA}</MathFormula></div></div>
      <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(560px,1.35fr)_minmax(260px,0.65fr)]">
        <div className="self-start overflow-x-auto rounded-lg border border-violet-100 bg-white/70 p-2">
          <div className="relative h-[280px] min-w-[560px]">
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">{snapshot.edges.map((edge) => { const from = positions[edge.from]; const to = positions[edge.to]; const selected = candidateById[edge.from]?.selected && candidateById[edge.to]?.selected; const committedPath = snapshot.phase === 'done' && edge.accepted; return <line key={`${edge.from}-${edge.to}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} stroke={committedPath ? '#10b981' : rerankVisible && selected ? '#3b82f6' : '#cbd5e1'} strokeWidth={committedPath || selected ? 3 : 2} strokeDasharray={committedPath || selected ? undefined : '5 4'} />; })}</svg>
            {snapshot.candidates.map((node) => <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${positions[node.id].x}%`, top: `${positions[node.id].y}%` }}><TokenChip token={node.token} status={node.status} confidence={node.confidence} value={node.value} t={t} /></div>)}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-violet-100 pt-2 text-[9px]"><span className="text-orange-700">■ {t('topKParents')}</span><span className="text-blue-700">■ {t('globalTopM')}</span><span className="text-emerald-700">━━ {t('selectedPath')}</span></div>
        </div>
        <div className={`self-start space-y-2 transition ${maskVisible ? 'opacity-100' : 'opacity-45'}`}>
          <div className="rounded-lg border border-blue-200 bg-white p-3"><div className="text-[9px] font-bold uppercase tracking-wide text-blue-600">{t('flattenSequence')}</div><div className="mt-2 flex flex-wrap gap-1">{snapshot.flattenedCandidates.map((node, index) => <span key={node.id} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800">{index + 1}. {node.token}</span>)}</div></div>
          <div className="rounded-lg border border-cyan-200 bg-white p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-wide text-cyan-700">{t('ancestorMask')}</span><span className="text-[8px] text-slate-400">{t('maskSize', { rows: snapshot.attentionMask.length, cols: snapshot.attentionMask.length })}</span></div><div className="mx-auto grid w-fit gap-0.5" style={{ gridTemplateColumns: `repeat(${snapshot.attentionMask.length}, 20px)` }}>{snapshot.attentionMask.flatMap((row, rowIndex) => row.map((visible, columnIndex) => <div key={`${rowIndex}-${columnIndex}`} title={visible ? t('visible') : t('blocked')} className={`h-5 w-5 rounded-sm border ${visible ? 'border-cyan-400 bg-cyan-400' : 'border-slate-200 bg-slate-50'}`} />))}</div><div className="mt-2 flex justify-center gap-3 text-[8px] text-slate-500"><span className="text-cyan-700">■ {t('visible')}</span><span>□ {t('blocked')}</span></div></div>
          <p className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-[10px] leading-relaxed text-cyan-900">{t('maskPurpose')}</p>
          <p className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[9px] leading-relaxed text-violet-800">{t('maskExample', { query: snapshot.maskExample.queryToken, visible: snapshot.maskExample.visibleTokens.join(' → '), blocked: snapshot.maskExample.blockedTokens.join(' / ') })}</p>
        </div>
      </div>
    </div>
  );
}

function DsparkTrace({ snapshot, t }) {
  const revealBackbone = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 0;
  const revealMarkov = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 1;
  const revealConfidence = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 2;
  const revealSchedule = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 3;
  const revealVerify = snapshot.phase === 'idle' || snapshot.phase === 'done' || snapshot.operationIndex >= 4;
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3" data-testid="dspark-block">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-cyan-900"><Activity size={15} />{t('paperMechanism')} · {t('parallelBlock')}</div><p className="max-w-3xl text-[9px] text-cyan-800">{t('paperExample')}</p></div>
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{t('anchorProduced')}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">{snapshot.prefixTokens.map((token) => <span key={token} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{token}</span>)}<ArrowRight size={14} className="text-slate-300" /><span className="rounded bg-slate-800 px-2 py-1 text-[9px] font-bold text-white">{t('anchor')}: {snapshot.anchorToken}</span></div>
        </div>

        <div className={`rounded-lg border border-cyan-200 bg-white p-3 transition ${revealBackbone ? 'opacity-100' : 'opacity-40'}`}>
          <div className="grid items-center gap-2 md:grid-cols-[1fr_26px_170px]">
            <div><div className="text-[9px] font-bold uppercase text-cyan-700">{t('dsparkInput')}</div><div className="mt-2 flex flex-wrap gap-1"><span className="rounded bg-slate-800 px-2 py-1 text-[9px] font-bold text-white">{snapshot.anchorToken}</span>{snapshot.candidates.map((candidate) => <span key={candidate.id} className="rounded border border-dashed border-cyan-300 bg-cyan-50 px-2 py-1 text-[9px] text-cyan-700">{t('maskToken')}</span>)}</div></div>
            <ArrowRight className="m-auto rotate-90 text-cyan-400 md:rotate-0" size={18} />
            <div className={`rounded-lg border p-3 text-center ${snapshot.activeOperation?.type === 'parallelBackbone' ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-cyan-300 bg-cyan-50'}`}><BrainCircuit className="mx-auto text-cyan-700" size={18} /><div className="mt-1 text-[10px] font-extrabold text-cyan-900">{t('parallelStage')}</div></div>
          </div>
          <div className="mt-3 border-t border-cyan-100 pt-3"><div className="text-[9px] font-bold uppercase text-cyan-700">{t('baseLogits')}</div><p className="mt-1 text-[9px] leading-relaxed text-cyan-800">{t('baseMeaning')}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{snapshot.candidates.map((candidate, index) => <div key={candidate.id} className="rounded border border-cyan-200 bg-cyan-50 p-2 text-center"><div className="text-[8px] font-semibold text-cyan-600">{t('positionLabel', { index: index + 1 })}</div><div className="mt-1 text-[10px] text-cyan-900"><MathFormula>{String.raw`U_{${index + 1}}`}</MathFormula></div><div className="mt-1 text-[8px] text-slate-500">{t('baseGuess')}</div><div className="text-xs font-extrabold text-cyan-900">{candidate.baseToken}</div></div>)}</div></div>
        </div>

        <div className={`rounded-lg border border-violet-200 bg-white p-3 transition ${revealMarkov ? 'opacity-100' : 'opacity-40'}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="text-[9px] font-bold uppercase text-violet-700">{t('sequentialStage')} · {t('transitionBias')}</div><div className="rounded bg-violet-50 px-2 py-1 text-[10px] text-violet-900"><MathFormula>{DSPARK_MARKOV_FORMULA}</MathFormula></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{snapshot.candidates.map((candidate, index) => { const previous = index === 0 ? snapshot.anchorToken : snapshot.candidates[index - 1].token; return <div key={candidate.id} className={`relative rounded-lg border p-2 ${snapshot.activeOperation?.type === 'sequentialMarkov' ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}><div className="text-[8px] text-slate-400">{t('previousDraft')}</div><div className="mt-0.5 text-[10px] font-bold text-slate-700">{previous}</div><div className="my-1 flex items-center gap-1 text-[8px] text-violet-500"><ArrowRight size={12} /><span>{t('transitionBias')}</span></div><div className="text-[8px] text-slate-400">{t('finalGuess')}</div><div className="text-sm font-extrabold text-violet-800">{candidate.token}</div></div>; })}</div></div>

        <div className={`grid gap-3 transition lg:grid-cols-[1.2fr_0.8fr] ${revealConfidence ? 'opacity-100' : 'opacity-40'}`}>
          <div className="rounded-lg border border-blue-200 bg-white p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase text-blue-700">{t('confidenceHeadLabel')}</span><span className="rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-900"><MathFormula>{DSPARK_SURVIVAL_FORMULA}</MathFormula></span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{snapshot.candidates.map((candidate) => <div key={candidate.id} className={`rounded border p-2 ${candidate.scheduled || !revealSchedule ? 'border-blue-200 bg-blue-50' : 'border-dashed border-slate-300 bg-slate-50'}`}><div className="text-[9px] font-extrabold text-blue-900">{candidate.token}</div><div className="mt-1 flex justify-between text-[8px] text-slate-500"><span>{t('conditionalSurvival')}</span><strong>{Math.round(candidate.confidence * 100)}%</strong></div><div className="mt-1 flex justify-between text-[8px] text-slate-500"><span>{t('prefixSurvival')}</span><strong>{Math.round(candidate.survival * 100)}%</strong></div><div className="mt-1 h-1.5 rounded bg-white"><div className="h-full rounded bg-blue-500" style={{ width: `${candidate.survival * 100}%` }} /></div></div>)}</div></div>
          <div className={`rounded-lg border p-3 ${snapshot.activeOperation?.type === 'scheduleVerify' ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-orange-200 bg-white'}`}><div className="text-[9px] font-bold uppercase text-orange-700">{t('hardwareCurve')}</div><div className="mt-2 flex h-14 items-end gap-1">{[78, 92, 100, 88].map((height, index) => <div key={index} className={`flex-1 rounded-t ${index < snapshot.verifiedCount ? 'bg-orange-400' : 'bg-slate-200'}`} style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between text-[8px]"><span className="font-bold text-emerald-700">{t('keepPrefix')} {snapshot.verifiedCount}</span><span className="text-slate-400">{t('dropSuffix')} {snapshot.draftedCount - snapshot.verifiedCount}</span></div><p className="mt-2 text-[9px] leading-relaxed text-orange-800">{t('schedulerExplanation')}</p></div>
        </div>

        <div className={`rounded-lg border border-emerald-200 bg-white p-3 transition ${revealVerify ? 'opacity-100' : 'opacity-40'}`}><div className="mb-2 text-[9px] font-bold uppercase text-emerald-700">{t('targetVerifier')} → {t('correctionResult')}</div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white">{snapshot.anchorToken}</span><ArrowRight className="text-slate-300" size={15} />{snapshot.candidates.map((candidate) => <span key={candidate.id} className={`rounded border px-3 py-2 text-[10px] font-extrabold ${candidate.accepted && candidate.scheduled ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : candidate.scheduled ? 'border-rose-400 bg-rose-50 text-rose-800 line-through' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'}`}>{candidate.token}</span>)}<ArrowRight className="text-slate-300" size={15} /><span className="rounded border border-orange-400 bg-orange-100 px-3 py-2 text-[10px] font-extrabold text-orange-800">{snapshot.correctionToken}</span></div></div>
      </div>
    </div>
  );
}

function TraceAndMetrics({ snapshot, t, isPlaying, onReset, onPlay, onNext }) {
  const metrics = [
    [t('metricCommitted'), `${snapshot.committedCount} ${t('tokenUnit')}`],
    [t('metricBaselinePasses'), `${snapshot.baselineTargetPasses} ${t('passes')}`],
    [t('metricTargetPasses'), `${snapshot.targetPasses} ${t('pass')}`],
    [t('metricVerified'), `${snapshot.verifiedCount} / ${snapshot.draftedCount}`],
    [t('metricWasted'), `${snapshot.wastedCount} ${t('positions')}`],
  ];
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" data-testid="speculative-trace">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><h2 className="text-base font-extrabold text-slate-900">{t('traceTitle')} · {t(snapshot.algorithm)}</h2><p className="mt-1 text-xs text-slate-500">{t('traceSubtitle')}</p></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><StatusHeader snapshot={snapshot} t={t} /><TimelineControls isPlaying={isPlaying} isDone={snapshot.phase === 'done'} onReset={onReset} onPlay={onPlay} onNext={onNext} t={t} label="localTraceControls" /></div></div>
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{snapshot.stages.map((stage, index) => <div key={stage.type} className={`relative rounded-lg border p-3 text-[10px] font-bold ${stageTone[stage.status]}`}><span className="mr-1 opacity-60">{index + 1}.</span>{t(stage.stageKey)}{index < snapshot.stages.length - 1 && <FastForward className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 xl:block" size={14} />}</div>)}</div>
      {snapshot.algorithm === 'eagle2' ? <EagleTrace snapshot={snapshot} t={t} /> : <DsparkTrace snapshot={snapshot} t={t} />}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><Check size={17} className="text-emerald-600" /><span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{t('output')}</span>{snapshot.committedTokens.map((token, index) => <span key={`${token}-${index}`} className={`rounded px-2 py-1 text-[10px] font-bold ${index === snapshot.committedTokens.length - 1 && snapshot.hasCorrection ? 'bg-orange-100 text-orange-800' : 'bg-white text-emerald-800'}`}>{token}</span>)}</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-base font-extrabold text-slate-800">{value}</div></div>)}</div>
    </section>
  );
}

function KvLifecycle({ snapshot, t }) {
  const commitVisible = snapshot.phase === 'done' || snapshot.activeOperation?.type === 'commitKv';
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="speculative-kv-lifecycle">
      <div className="mb-3"><h2 className="text-sm font-extrabold text-slate-900">{t('lifecycleTitle')}</h2><p className="mt-1 text-[11px] text-slate-500">{t('lifecycleSubtitle')}</p></div>
      <div className="grid grid-cols-[80px_1fr] items-center gap-2"><span className="text-[10px] font-bold text-slate-600">{t('prefixSlot')}</span><div className="flex gap-1"><div className="h-7 w-20 rounded border border-slate-300 bg-slate-200" />{snapshot.candidates.map((candidate, index) => { const committed = commitVisible && index < snapshot.acceptedDraftCount; const reclaimed = commitVisible && candidate.scheduled && !committed; const skipped = !candidate.scheduled; return <div key={candidate.id} className={`h-7 min-w-4 flex-1 rounded border ${committed ? 'border-emerald-400 bg-emerald-200' : reclaimed ? 'border-rose-300 bg-rose-50 bg-[linear-gradient(135deg,transparent_45%,#fda4af_46%,#fda4af_54%,transparent_55%)]' : skipped ? 'border-dashed border-slate-300 bg-white' : 'border-dashed border-blue-300 bg-blue-50'}`} />; })}{snapshot.hasCorrection && <div title={t('correction')} className={`h-7 min-w-4 flex-1 rounded border ${commitVisible ? 'border-emerald-500 bg-emerald-200 ring-1 ring-orange-300' : 'border-dashed border-orange-300 bg-orange-50'}`} />}</div></div>
      <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-slate-500"><span>■ {t('prefixSlot')}</span><span className="text-blue-600">□ {t('reservedSlot')}</span><span className="text-emerald-600">■ {t('committedSlot')}</span><span className="text-rose-500">▧ {t('reclaimedSlot')}</span><span>□ {t('skippedSlot')}</span></div>
    </section>
  );
}

function PrincipleAndRuntime({ snapshot, t }) {
  const codeIndex = snapshot.phase === 'idle' ? -1 : snapshot.phase === 'done' ? snapshot.codeKeys.length - 1 : Math.min(snapshot.operationIndex, snapshot.codeKeys.length - 1);
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] text-slate-300"><div className="border-b border-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('runtimeOps')} · {t(snapshot.algorithm)}</div><div className="overflow-x-auto p-4 font-mono text-[11px] leading-6">{snapshot.codeKeys.map((key, index) => <div key={key} className={index === codeIndex ? 'rounded bg-blue-500/15 px-2 text-blue-200' : 'px-2'}>{t(key)}</div>)}</div></section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">{t('boundary')}</h3><p className="mt-2 text-xs leading-relaxed text-amber-900">{t('boundaryText')}</p></section>
    </div>
  );
}

export default function SpeculativeDecoding() {
  const [algorithm, setAlgorithm] = useState('eagle2');
  const [scenario, setScenario] = useState('representative');
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [raceStep, setRaceStep] = useState(0);
  const [racePlaying, setRacePlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const snapshot = useMemo(() => deriveSpeculativeSnapshot({ algorithm, scenario, phase, step, raceStep }), [algorithm, scenario, phase, step, raceStep]);
  const t = (key, vars) => interpolate(i18n[lang][key] ?? key, vars);

  const resetTrace = () => { setPhase('idle'); setStep(0); setIsPlaying(false); };
  const resetRace = () => { setRaceStep(0); setRacePlaying(false); };
  const resetAll = () => { resetTrace(); resetRace(); };
  const handleNextStep = () => {
    const next = getNextLifecycle(snapshot);
    setPhase(next.phase);
    setStep(next.step);
    if (next.phase === 'done') setIsPlaying(false);
  };
  const togglePlay = () => {
    if (snapshot.phase === 'idle' || snapshot.phase === 'done') { setPhase('running'); setStep(0); setIsPlaying(true); return; }
    setIsPlaying((value) => !value);
  };

  useEffect(() => {
    if (!isPlaying || snapshot.phase !== 'running') return undefined;
    const delay = snapshot.activeOperation?.type === 'targetVerify' ? 1150 : 820;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, snapshot.phase, snapshot.step, snapshot.algorithm, snapshot.scenario]);

  useEffect(() => {
    if (!racePlaying) return undefined;
    if (snapshot.race.isDone) { setRacePlaying(false); return undefined; }
    const timer = setTimeout(() => setRaceStep((value) => Math.min(value + 1, snapshot.race.maxStep)), 620);
    return () => clearTimeout(timer);
  }, [racePlaying, snapshot.race.step, snapshot.race.isDone, snapshot.algorithm, snapshot.scenario]);

  const handleRaceNext = () => {
    setRacePlaying(false);
    setRaceStep((value) => Math.min(value + 1, snapshot.race.maxStep));
  };
  const toggleRacePlay = () => {
    if (snapshot.race.isDone) { setRaceStep(0); setRacePlaying(true); return; }
    setRacePlaying((value) => !value);
  };

  const changeAlgorithm = (value) => { setAlgorithm(value); resetAll(); };
  const changeScenario = (value) => { setScenario(value); resetAll(); };

  return (
    <div className="min-h-full bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('title')}</h1><p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p></div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">{['eagle2', 'dspark'].map((item) => <button key={item} type="button" onClick={() => changeAlgorithm(item)} aria-pressed={algorithm === item} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${algorithm === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(item)}</button>)}</div>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">{['representative', 'lowAcceptance'].map((item) => <button key={item} type="button" onClick={() => changeScenario(item)} aria-pressed={scenario === item} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${scenario === item ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(item)}</button>)}</div>
            <button type="button" onClick={() => setLang((value) => value === 'zh' ? 'en' : 'zh')} aria-label={t('switchEnglish')} title={t('langToggle')} className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"><Globe size={16} />{t('langToggle')}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
        <WhyFaster snapshot={snapshot} t={t} racePlaying={racePlaying} onRaceReset={resetRace} onRacePlay={toggleRacePlay} onRaceNext={handleRaceNext} />
        <Architecture snapshot={snapshot} t={t} isPlaying={isPlaying} onReset={resetTrace} onPlay={togglePlay} onNext={() => { setIsPlaying(false); handleNextStep(); }} />
        <PrincipleAndRuntime snapshot={snapshot} t={t} />
      </main>
    </div>
  );
}
