import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Layers, Grid, Boxes, SplitSquareHorizontal, BrainCircuit, Cpu, Network, RotateCcw, Info, ArrowDown, ArrowRight, Pin, Globe, Play, Pause, SkipForward } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import {
  MAX_GPUS,
  getAttentionArchitectureState,
  getComponentParallelState,
  getDeploymentGpuCoordinates,
  getDeploymentGpuCount,
  getDwdpDegrees,
  getDwdpExpertResidency,
  getMoeParallelState,
  getPipelineOwnership,
  isTopologyValid,
} from './parallel-strategies/topologyModel';

const TOTAL_LAYERS = 32;
const PIPELINE_MICROBATCHES = 4;

const STRATEGIES = [
  { id: 'dp', icon: Boxes, color: 'blue' },
  { id: 'tp', icon: Grid, color: 'amber' },
  { id: 'pp', icon: Layers, color: 'purple' },
  { id: 'cp', icon: SplitSquareHorizontal, color: 'emerald' },
  { id: 'ep', icon: BrainCircuit, color: 'pink' },
  { id: 'etp', icon: Grid, color: 'indigo' }
];

const i18n = {
  zh: {
    title: 'LLM 6D 并行策略交互式解析', subtitle: '拖动六大并行维度，实时观察切片结构与 GPU 资源映射', reset: '重置状态', langToggle: 'EN', empty: '可用槽位', expand: '调整上方并行策略以扩展集群使用量 (当前',
    dpName:'数据并行(DP · 副本)', dpDesc:'复制完整模型或模型分片组，把不同请求/批次分配给不同外层副本；它会与 TP 等组内切分相乘。',
    tpName:'张量并行(TP)', tpDesc:'切分层内权重与 Attention Head；每层需要 All-Reduce 或 Reduce-Scatter 等集合通信。',
    ppName:'流水线并行(PP)', ppDesc:'按模型深度切分层，相邻 Stage 通过 P2P 传递激活；Microbatch 用于填充流水线。',
    cpName:'上下文并行(CP)', cpDesc:'沿上下文长度切分激活或 KV；Prefill 与 Decode 的切分及通信方式不同于 SP。',
    epName:'专家并行(EP)', epDesc:'MoE Router 将 Top-K Token 通过 All-to-All 分发到持有目标专家的 Rank。',
    etpName:'专家张量并行(ETP)', etpDesc:'切分单个专家内部权重；通常与 TP/EP 共享或重组 Rank Mesh，并非普遍独立维度。',
    fullCopy: '全量复制',
    logicalTitle: 'LLM 数学架构与动态张量切片',
    executionContext: '推理阶段',
    prefill: 'Prefill',
    decode: 'Decode',
    inputData: 'Input Tokens Data',
    dpCpSplit: 'DP切B({dp}) × CP切S({cp})',
    wideEpDpCpSplit: 'DP×EP切B({dp}) × CP切S({cp})',
    dpAttentionInputSplit: '请求所有权：外层 DP({dp}) × Attention Worker TP({tp}) × CP({cp})',
    decodeInputSplit: 'DP 分配请求；DCP Rank 共享当前 Query',
    dpRequestFact: 'DP 表示不同副本拥有不同请求；这里的 B 网格是全局工作负载示意，不代表一次跨副本集合切分。',
    dpAttentionRequestFact: 'DP Attention 不新增并行度：每个外层 DP 副本复用现有 TP Rank 运行 Attention worker；EP Rank 只在 Sparse FFN 阶段决定 Expert 所有权。若顶部 DP=2、TP=2，物理上仍是两套 TP2，共 4 卡。',
    wideEpRequestFact: 'DP Attention + Wide-EP：Attention / KV 按 DP×EP 请求副本独立运行，同一批 Rank 在 Sparse FFN 中切换为 EP Expert 所有权；TP 仍表示每个副本内部的层内切分。',
    fullData: '完整数据 (无切分)',
    embedMatrix: 'Embedding Matrix',
    rowSplit: '横向切行(TP={tp})',
    colSplit: '纵向切列(TP={tp})',
    fullWeight: '完整权重',
    ppNotResident: '仅驻留 PP Stage {stage}',
    transLayers: 'L × Transformer Layers',
    ppSplit: '按层划分阶段: PP({pp})',
    ppStageTip: 'PP Stage {stage}: Transformer 层 {start}-{end}',
    ppSchedule: 'Microbatch 流水线',
    ppIdle: '等待执行',
    ppWarmup: '预热填充',
    ppSteady: '稳态并行',
    ppDrain: '排空阶段',
    ppDone: '执行完成',
    ppSlot: '时隙',
    ppPlay: '播放 PP 流水线',
    ppPause: '暂停 PP 流水线',
    ppNext: 'PP 下一时隙',
    ppReset: '重置 PP 流水线',
    ppExecuting: '执行 MB{microbatch}',
    ppReceive: 'S{stage} 接收 MB{microbatch} 激活',
    ppFirstStage: 'S0 读取 MB{microbatch}',
    ppUtilization: '理想 Stage 利用率',
    ppReplicaScope: '时间表跟踪 DP replica 0；同一 Stage 内的 TP/CP/EP/ETP Rank 共享该执行阶段，其他 DP 副本运行各自的请求流。',
    ppCardRunning: 'MB{microbatch} 执行中',
    ppCardBubble: '流水气泡',
    ppCardDone: 'Stage 完成',
    ppCardIndependent: '独立请求流',
    noPp: '未开启流水线并行',
    attnBlock: 'Attention Block',
    qkvFused: 'Q,K,V (Fused)',
    qkvTooltip: '物理实现中 Q,K,V 通常被拼接为 3H 长度的一个大矩阵进行计算',
    outProj: 'Out Proj',
    kvCache: 'KV Cache & Activations',
    split3D: 'KV 所有权: DP请求 × CP切Token × TP切KV Head',
    wideEpKvSplit: 'KV 所有权: DP×EP请求 × CP切Token × TP切KV Head',
    dpAttentionKvSplit: 'KV 所有权：{workers} 个请求 Worker × CP({cp}) Token；Worker 间不复制',
    workerLocalWeight: 'Worker 本地副本',
    kvMhaAssumption: '基础视图按 MHA 且 KV Head 可被 TP 整除绘制；GQA/MLA 在 TP 过大时可能复制 KV，可切换 DCP 或 Helix 查看 Decode 专用语义。',
    kvGqaAssumption: 'GQA 的 KV Head 少于 Q Head；TP 可先切分 KV Head，TP 宽度超过 KV Head 数后只能复制共享 KV 组。',
    kvMlaAssumption: 'MLA 每个 Token 只保存压缩 KV 潜变量；标准 TP 会复制该潜变量缓存，DP Attention 则按请求 Worker 独占。',
    kvDcpAssumption: 'DCP 复用模式按 MLA / 单 KV Head 的高复制场景绘制：CP Rank 由 TP Rank 派生，沿 KV 时间轴分片以减少 TP 引入的 KV 复制。',
    cpPrefillFact: 'Prefill CP：按新 Token 切分 Q/K/V；可选择聚合完整 K/V，或以 Ring P2P 分块交换 K/V。',
    cpDecodeFact: 'Decode DCP：当前 Query 很短，主要沿 KV 历史长度切分；vLLM 可复用 TP Rank，因此 DCP 不必增加 GPU 数。',
    cpVsSpFact: 'CP vs SP（Megatron 语义）：CP 切分网络输入与全部激活的序列维，并为 Attention 跨 Rank 交换 KV；SP 主要在 TP 组内切分 LayerNorm/Dropout 等激活，不能替代长上下文 Attention/KV 切分。',
    tpCommPath: 'TP 通信：QKV 列并行局部计算 → Attention → Out Projection 行并行 → All-Reduce / Reduce-Scatter',
    tpCommTitle: 'TP 层内通信图',
    qkvShardNode: 'QKV 权重分片',
    localAttentionNode: '本地 Attention',
    outProjShardNode: 'Out Proj 分片',
    collectiveNode: 'All-Reduce / RS',
    layerOutputNode: '层输出',
    noSplit: '无切分',
    moeLayer: 'MoE Layer (以 4 专家架构为例)',
    router: 'Router',
    routerDesc: 'Router 计算 Top-K，再把 Token 分发到目标 Expert',
    moeCommPath: 'MoE 通信：Router → All-to-All Dispatch → 本地 Expert / ETP → All-to-All Combine',
    moeCommTitle: 'MoE Token 通信图',
    routerTopKNode: 'Router Top-K',
    allTokensNode: '全部 Token',
    a2aDispatchNode: 'All-to-All Dispatch',
    localExpertNode: '本地 Expert / ETP',
    expertCollectiveNode: 'Expert All-Reduce / RS',
    a2aCombineNode: 'All-to-All Combine',
    tokenOutputNode: 'Token 输出',
    moeModeSingle: '单卡 Expert',
    moeModeTp: '纯 TP：每个 Expert 随 TP 切分',
    moeModeEp: '纯 EP：完整 Expert 分布到 EP Rank',
    moeModeEtp: 'ETP：Expert 内部切分',
    moeModeHybrid: '混合 EP × ETP',
    tpLocalAttentionEdge: '本地 Attention',
    tpCollectiveEdge: 'All-Reduce / RS → 层输出',
    moeA2AEdge: 'All-to-All：Dispatch ↓ / Combine ↑',
    moeLocalRouteEdge: '本地 Top-K 路由（各 TP Rank 已有全部 Token）',
    moeExpertCollectiveEdge: '分片归约 · AR/RS',
    moeExpertCollectiveTitle: 'Expert 分片之间执行 All-Reduce / Reduce-Scatter',
    moeRoutingAria: 'Router 与 Expert 的通信连线',
    moeTransport: 'Runtime 设计',
    tokenA2aTransport: 'Token All-to-All',
    dwdpTransport: 'DWDP 权重拉取',
    dwdpHint: 'Token 留在独立 DP 执行 Rank；本地未驻留的 Expert 权重由 Peer GPU 异步拉取到双缓冲区。',
    dwdpBoundary: '当前 TensorRT-LLM 原型面向 P/D 分离的 Context Worker，组内要求 TP=1；还依赖 CuteDSL、NVFP4 与 MNNVL/GB200 级 Peer 带宽。页面只演示通信语义。',
    dwdpWeightOwner: 'Peer Expert 权重所有者',
    dwdpPeerPull: 'cudaMemcpyAsync P2P · 预取下一层',
    dwdpBuffer: 'Ping/Pong Prefetch Buffer',
    dwdpExecutor: '本地 DP Executor 执行 Expert',
    dwdpNoTokenA2a: '无 Token All-to-All · 无逐层集合屏障',
    dwdpLocalWeight: '本地驻留',
    dwdpRemoteWeight: 'Peer 预取',
    dwdpGpuRole: 'DWDP Group {group} · Rank/Owner {rank}',
    ppCommTitle: 'PP Stage 激活通信',
    p2pActivation: 'P2P 激活',
    etpMeshBoundary: '运行时约束示例：TensorRT-LLM 要求 MoE-TP × MoE-EP = TP；纯 TP 模式下 MoE-TP 回退为 TP。本页 ETP 旋钮表示显式 Expert 内部切分，正交沙盒仍允许独立观察。',
    expert: 'Expert',
    w1w3: 'w1,w3 (Up)',
    w2: 'w2 (Down)',
    colSlice: '纵切({label})',
    rowSlice: '横切({label})',
    fullCalc: '整块计算',
    wholeBlock: '整块',
    lmHead: 'LM Head',
    locked: '已锁定',
    hovered: '悬浮',
    totalGpu: '示意 GPU:',
    cards: '张卡',
    pageDesc: '调整参数并悬浮在物理卡上，观察六维正交示意中的张量切片与 GPU 槽位映射。',
    clusterHintTitle: '映射假设:',
    clusterHintDesc: '为保持六个维度独立可调，本页采用不复用 rank 的正交示意，总槽位 = DP × PP × CP × TP × EP × ETP。真实运行时可能复用或重组 TP、EP、ETP 进程组，因此该数值不是通用 world size 恒等式。',
    mappingModel: 'Rank 映射',
    orthogonalMapping: '正交沙盒',
    dcpReuseMapping: 'DCP 复用 TP',
    dcpHintTitle: 'DCP Rank 复用:',
    dcpHintDesc: '按 vLLM Decode DCP 语义，DCP Rank 从 TP Rank 派生，不额外增加示意 GPU；本页为构造均匀子组要求 DCP 整除 TP。本模式仅修正 CP/TP 复用，其余 EP/ETP 仍使用正交沙盒。',
    dcpPrefillDisabled: 'DCP 复用模式只用于 Decode；切回正交沙盒后可选择 Prefill。',
    componentProfile: '组件模板',
    standardProfile: '通用 6D',
    wideEpProfile: 'Wide-EP',
    helixProfile: 'Helix',
    wideEpHint: 'Wide-EP 是特定 Rank 复用模板：把 EP Rank 也用作 DP Attention worker，Sparse FFN 再切回 EP Expert 所有权；它不是 DP Attention 的必要条件。',
    attentionRuntime: 'Attention 运行',
    attentionType: 'Attention 类型',
    mhaType: 'MHA',
    gqaType: 'GQA',
    mlaType: 'MLA',
    mhaProjection: 'Q/K/V 多头投影',
    gqaProjection: 'Q + 分组共享 K/V',
    mlaProjection: 'Q + KV 潜变量投影',
    mhaProjectionTooltip: 'MHA 的 Q、K、V 投影拥有相同的 Head 数，通常可融合为一次矩阵计算。',
    gqaProjectionTooltip: 'GQA 保留较多 Q Head，但让多个 Q Head 共享更少的 K/V Head。',
    mlaProjectionTooltip: 'MLA 将 K/V 压缩为低维潜变量缓存，并在计算 Attention 时恢复所需表示。',
    mhaWeightLayout: 'MHA 投影权重：Q / K / V 等宽',
    gqaWeightLayout: 'GQA 投影权重：宽 Q / 共享 K、V',
    mlaWeightLayout: 'MLA 投影权重：Q / KV 压缩 / K、V 恢复',
    tpProjectionShard: 'TP 沿投影输出与 Head 维切分',
    dpProjectionReplica: 'DP Attention：每个 Worker 使用本地 Attention 权重副本',
    mlaProjectionShard: 'Q 与 K/V 恢复路径按 TP 切分；KV 压缩保留单条潜变量路径',
    perTokenKvFootprint: '单 Token KV 相对容量（同一标尺）',
    mhaStructure: 'MHA：Q Head 与 KV Head 一一对应，TP 可沿 Head 维切分。',
    gqaStructure: 'GQA：多个 Q Head 共享较少的 KV Head；TP 超过 KV Head 数时会出现 KV 复制。',
    mlaStructure: 'MLA：KV 压缩成单个潜变量缓存；标准 TP 会在 Rank 间复制这份 KV，DP Attention 的收益最明显。',
    standardAttentionFlow: '同一请求 · TP Head/权重切分',
    standardKvShardFlow: 'KV Head 随 TP 切分',
    standardKvReplicaFlow: '同一请求的 KV 在 TP Rank 上复制 ×{count}',
    dpAttentionFlow: '不同请求分配给独立 Attention Worker',
    attentionWorker: 'TP{rank} · 请求 B{rank}',
    prefillWorkerTask: 'Prefill S_new · 写入私有 KV',
    decodeWorkerTask: 'Decode 1 Token · 读取私有 KV',
    dpAttentionGather: 'Attention 输出 All-Gather → MoE；MoE 后再按 Worker 重分发',
    dpAttentionKvOwnership: '每个 Worker 独占其请求 KV · 无 TP 间 KV 复制',
    attentionTypeBoundary: 'DP Attention 最初针对 DeepSeek MLA：MHA/GQA 在此用于比较数据布局，实际引擎支持范围取决于模型与后端。',
    standardAttention: '标准 TP Attention',
    dpAttention: 'DP Attention',
    dpAttentionHint: 'DP Attention 在每个外层 DP 副本内复用现有 TP Rank，不增加卡数。顶部 DP 与 TP 仍是正交部署轴：DP2+TP2 表示两套 TP2，因此需要 4 卡。',
    dpAttentionHelixBoundary: 'Helix 使用固定的 KVP×TP Attention Rank 复用，不能同时切换为 DP Attention。',
    wideEpCapacityLimit: 'Wide-EP 至少需要 EP=2；当前配置无法在 32 卡上限内扩展 EP。',
    helixHint: 'Decode 长 KV：Attention 用 KVP(EP)×TP，随后同一 Rank 池切换为 TP×EP FFN；不新增 GPU 乘法项。',
    helixCapacityLimit: 'Helix 教学模板至少需要 EP=2 作为 KVP；当前配置无法在 32 卡上限内扩展。',
    helixBoundary: '当前 Helix 教学模板是统一实例内的 Decode-only rank 复用，不与对称 P/D 或 DCP 复用同时开启。',
    helixDecodeOnly: 'Helix 面向长上下文 Decode；切回其他组件模板后可选择 Prefill。',
    servingTopology: '服务拓扑',
    unifiedServing: '统一实例',
    pdDisaggregated: 'P/D 分离',
    pdCapacityLimit: '对称 P/D 教学池会复制当前并行实例；当前配置超过 32 卡上限。',
    pdDcpBoundary: '当前 1:1 P/D 教学模式为两个池使用同一配置，不与 Decode-only DCP rank 复用组合。',
    pdTopologyTitle: 'Prefill / Decode 独立服务池',
    pdSymmetricHint: '1:1 对称教学配置；真实部署可为两个池选择不同容量与并行策略。',
    prefillPool: 'Prefill Pool',
    decodePool: 'Decode Pool',
    prefillShort: 'P',
    decodeShort: 'D',
    unifiedPool: 'Unified',
    kvTransfer: 'KV Cache RDMA / NIXL',
    prefillPoolRole: '计算 Prompt 与 KV',
    decodePoolRole: '读取 KV 并逐 Token 生成',
    otherPdPool: '另一阶段服务池',
    wideEpAttentionRole: 'Wide-EP DP Attention: DP×EP({dp}) × TP({tp})',
    dpAttentionRole: 'DP Attention: {dp} 个外层副本 · 每个复用 TP({tp}) Rank · EP 独立',
    wideEpMoeRole: 'Sparse FFN: EP({ep}) × ETP({etp})',
    wideEpLmHeadRole: 'LM Head: DP×EP({dp}) 请求副本 × TP({tp})',
    dpAttentionGpuRole: '副本 DP {dp} · Attn Worker TP {tp}',
    moeGpuRole: 'MoE EP {ep}',
    dpAttentionWorkerShort: 'DP Attention · W{worker}',
    helixGpuRoleCompact: 'Helix · KVP{kvp} ↔ FFN EP{ep}',
    helixDecodeFact: 'Helix Decode：每个 DP 副本内，EP Rank 在 Attention 阶段重解释为 KVP Rank；当前 Query 广播到全部 KVP Rank。',
    helixKvSplit: 'KV 所有权: KVP(EP={kvp}) 切序列 × TP({tp}) 切 KV Head',
    helixKvAssumption: 'Helix 以 EP 旋钮表示 KVP 宽度：KVP 沿 KV 序列切分，TP 只切 KV Head；避免 TP 超过 KV Head 后复制完整 KV。',
    helixAttentionRole: 'Helix Attention: KVP({kvp}) × TP({tp})',
    helixMoeRole: '同一 Rank 池 → TP({tp}) × EP({ep}) FFN',
    helixRankReuse: '同一 Rank 池重配置：KVP×TP Attention → TP×EP FFN',
    helixExactCombine: 'Partial O + LSE → All-to-All → 精确 Attention',
    helixKvShardNode: 'KV Shard Attention',
    helixOutProjNode: 'Out Proj TP/AR',
    helixGpuAttention: 'ATTN KVP {kvp} × TP {tp}',
    helixGpuFfn: 'FFN EP {ep} × TP {tp}',
    clusterHintBold: '点击右侧 GPU 卡片可将其固定锁定，方便对比观察。',
    physGpuMap: 'GPU 集群分片映射（正交示意）',
    physGpuMapDcp: 'GPU 集群分片映射（DCP 复用 TP）',
    physGpuMapPd: 'Prefill / Decode 双池 GPU 映射',
    singleCard: '单卡计算 (无切分)'
  },
  en: {
    title: 'Interactive LLM 6D Parallel Strategies', subtitle: 'Tune six parallel dimensions and observe tensor sharding + GPU mapping', reset: 'Reset', langToggle: '中文', empty: 'Available Slot', expand: 'Adjust strategies above to scale cluster usage (current',
    dpName:'Data Parallel (DP · Replicas)', dpDesc:'Replicate a full model or model-shard group and route different requests/batches to outer replicas; this multiplies with intra-replica axes such as TP.',
    tpName:'Tensor Parallel (TP)', tpDesc:'Shard intra-layer weights and attention heads; each layer requires collectives such as All-Reduce or Reduce-Scatter.',
    ppName:'Pipeline Parallel (PP)', ppDesc:'Partition model depth, pass activations between adjacent stages with P2P, and fill the pipeline with microbatches.',
    cpName:'Context Parallel (CP)', cpDesc:'Shard activations or KV along context length; prefill and decode use different layouts and communication than SP.',
    epName:'Expert Parallel (EP)', epDesc:'The MoE router dispatches Top-K tokens with All-to-All to ranks that host the selected experts.',
    etpName:'Expert Tensor Parallel (ETP)', etpDesc:'Shard weights inside one expert; it usually shares or reorganizes a TP/EP rank mesh rather than being universally independent.',
    fullCopy: 'Full Replicate',
    logicalTitle: 'LLM Math Arch & Dynamic Tensor Sharding',
    executionContext: 'Inference phase',
    prefill: 'Prefill',
    decode: 'Decode',
    inputData: 'Input Tokens Data',
    dpCpSplit: 'DP Shard B({dp}) × CP Shard S({cp})',
    wideEpDpCpSplit: 'DP×EP Shard B({dp}) × CP Shard S({cp})',
    dpAttentionInputSplit: 'Request ownership: outer DP({dp}) × Attention-worker TP({tp}) × CP({cp})',
    decodeInputSplit: 'DP routes requests; DCP ranks share the current query',
    dpRequestFact: 'DP replicas own different requests. The B grid is a global workload view, not one batch tensor collectively sharded across replicas.',
    dpAttentionRequestFact: 'DP Attention adds no new degree: each outer DP replica reuses its existing TP ranks as Attention workers, while EP only determines Sparse-FFN expert ownership. Top-level DP2 with TP2 is still two TP2 replicas, hence four GPUs.',
    wideEpRequestFact: 'DP Attention + Wide-EP runs Attention / KV independently over DP×EP request replicas, then reinterprets the same ranks as EP expert owners in Sparse FFN. TP remains the intra-replica layer shard.',
    fullData: 'Full Data (No Sharding)',
    embedMatrix: 'Embedding Matrix',
    rowSplit: 'Row Shard(TP={tp})',
    colSplit: 'Col Shard(TP={tp})',
    fullWeight: 'Full Weight',
    ppNotResident: 'Resident only on PP stage {stage}',
    transLayers: 'L × Transformer Layers',
    ppSplit: 'Layer Partition: PP({pp})',
    ppStageTip: 'PP Stage {stage}: Transformer layers {start}-{end}',
    ppSchedule: 'Microbatch Pipeline',
    ppIdle: 'Ready',
    ppWarmup: 'Pipeline Warmup',
    ppSteady: 'Steady State',
    ppDrain: 'Pipeline Drain',
    ppDone: 'Completed',
    ppSlot: 'Slot',
    ppPlay: 'Play PP pipeline',
    ppPause: 'Pause PP pipeline',
    ppNext: 'Next PP slot',
    ppReset: 'Reset PP pipeline',
    ppExecuting: 'Running MB{microbatch}',
    ppReceive: 'S{stage} receives MB{microbatch} activations',
    ppFirstStage: 'S0 loads MB{microbatch}',
    ppUtilization: 'Ideal stage utilization',
    ppReplicaScope: 'The schedule follows DP replica 0. TP/CP/EP/ETP ranks in the same stage share this execution phase; other DP replicas run independent request streams.',
    ppCardRunning: 'Running MB{microbatch}',
    ppCardBubble: 'Pipeline bubble',
    ppCardDone: 'Stage complete',
    ppCardIndependent: 'Independent stream',
    noPp: 'No Pipeline Parallelism',
    attnBlock: 'Attention Block',
    qkvFused: 'Q,K,V (Fused)',
    qkvTooltip: 'Physically Q, K, V are usually concatenated into a large 3H matrix.',
    outProj: 'Out Proj',
    kvCache: 'KV Cache & Activations',
    split3D: 'KV ownership: DP requests × CP tokens × TP KV heads',
    wideEpKvSplit: 'KV ownership: DP×EP requests × CP tokens × TP KV heads',
    dpAttentionKvSplit: 'KV ownership: {workers} request workers × CP({cp}) tokens; no cross-worker replication',
    workerLocalWeight: 'Worker-local replica',
    kvMhaAssumption: 'The base view assumes MHA with KV heads divisible by TP. GQA/MLA may replicate KV when TP is too large; switch to DCP or Helix for decode-specific semantics.',
    kvGqaAssumption: 'GQA has fewer KV heads than query heads. TP first shards KV heads, then must replicate shared KV groups once TP exceeds the KV-head count.',
    kvMlaAssumption: 'MLA stores one compressed KV latent per token. Standard TP replicates that latent cache, while DP Attention gives each request worker exclusive ownership.',
    kvDcpAssumption: 'DCP reuse uses an MLA / single-KV-head high-replication teaching case: CP ranks are derived from TP ranks and shard KV over time to reduce TP-induced KV replication.',
    cpPrefillFact: 'Prefill CP shards new-token Q/K/V. It may gather full K/V or exchange K/V chunks with Ring P2P.',
    cpDecodeFact: 'Decode DCP has a tiny current query and mainly shards KV history by time. vLLM can reuse TP ranks, so DCP need not increase GPU count.',
    cpVsSpFact: 'CP vs SP (Megatron semantics): CP shards the sequence dimension of network inputs and all activations, exchanging KV across ranks for Attention. SP mainly shards LayerNorm/Dropout activations inside a TP group and does not replace long-context Attention/KV partitioning.',
    tpCommPath: 'TP communication: column-parallel QKV → Attention → row-parallel output projection → All-Reduce / Reduce-Scatter',
    tpCommTitle: 'TP intra-layer communication',
    qkvShardNode: 'QKV weight shard',
    localAttentionNode: 'Local attention',
    outProjShardNode: 'Out Proj shard',
    collectiveNode: 'All-Reduce / RS',
    layerOutputNode: 'Layer output',
    noSplit: 'No Sharding',
    moeLayer: 'MoE Layer (4 Experts Example)',
    router: 'Router',
    routerDesc: 'The router computes Top-K, then dispatches tokens to target experts',
    moeCommPath: 'MoE communication: Router → All-to-All Dispatch → local Expert / ETP → All-to-All Combine',
    moeCommTitle: 'MoE token communication',
    routerTopKNode: 'Router Top-K',
    allTokensNode: 'All tokens',
    a2aDispatchNode: 'All-to-All Dispatch',
    localExpertNode: 'Local Expert / ETP',
    expertCollectiveNode: 'Expert All-Reduce / RS',
    a2aCombineNode: 'All-to-All Combine',
    tokenOutputNode: 'Token output',
    moeModeSingle: 'Single-GPU expert',
    moeModeTp: 'TP only: every expert follows TP',
    moeModeEp: 'EP only: full experts distributed by EP rank',
    moeModeEtp: 'ETP: intra-expert sharding',
    moeModeHybrid: 'Hybrid EP × ETP',
    tpLocalAttentionEdge: 'Local Attention',
    tpCollectiveEdge: 'All-Reduce / RS → layer output',
    moeA2AEdge: 'All-to-All: Dispatch ↓ / Combine ↑',
    moeLocalRouteEdge: 'Local Top-K routing (every TP rank already has all tokens)',
    moeExpertCollectiveEdge: 'Shard reduce · AR/RS',
    moeExpertCollectiveTitle: 'All-Reduce / Reduce-Scatter across expert shards',
    moeRoutingAria: 'Communication links between Router and Experts',
    moeTransport: 'Runtime design',
    tokenA2aTransport: 'Token All-to-All',
    dwdpTransport: 'DWDP weight pull',
    dwdpHint: 'Tokens stay on an independent DP executor; missing expert weights are pulled asynchronously from peer GPUs into a double buffer.',
    dwdpBoundary: 'The current TensorRT-LLM prototype targets context workers in P/D disaggregation and requires TP=1 within a group, plus CuteDSL, NVFP4, and MNNVL/GB200-class peer bandwidth. This page visualizes only the communication semantics.',
    dwdpWeightOwner: 'Peer expert-weight owners',
    dwdpPeerPull: 'cudaMemcpyAsync P2P · prefetch next layer',
    dwdpBuffer: 'Ping/Pong Prefetch Buffer',
    dwdpExecutor: 'Local DP executor runs experts',
    dwdpNoTokenA2a: 'No token All-to-All · no layer collective barrier',
    dwdpLocalWeight: 'Local resident',
    dwdpRemoteWeight: 'Peer prefetched',
    dwdpGpuRole: 'DWDP Group {group} · Rank/Owner {rank}',
    ppCommTitle: 'PP stage activation communication',
    p2pActivation: 'P2P activation',
    etpMeshBoundary: 'Runtime example: TensorRT-LLM requires MoE-TP × MoE-EP = TP; in TP-only mode, MoE-TP falls back to TP. The ETP control represents an explicit intra-expert shard in this orthogonal sandbox.',
    expert: 'Expert',
    w1w3: 'w1,w3 (Up)',
    w2: 'w2 (Down)',
    colSlice: 'Col Shard({label})',
    rowSlice: 'Row Shard({label})',
    fullCalc: 'Full Calc',
    wholeBlock: 'Whole',
    lmHead: 'LM Head',
    locked: 'Pinned',
    hovered: 'Hover',
    totalGpu: 'Illustrative GPU:',
    cards: 'Cards',
    pageDesc: 'Tune parameters and hover over GPU cards to inspect tensor shards in an orthogonal six-dimensional teaching map.',
    clusterHintTitle: 'Mapping assumption:',
    clusterHintDesc: 'To keep all six dimensions independently adjustable, this page uses an orthogonal no-rank-reuse sandbox: slots = DP × PP × CP × TP × EP × ETP. Real runtimes may reuse or reorganize TP, EP, and ETP process groups, so this is not a universal world-size identity. ',
    mappingModel: 'Rank mapping',
    orthogonalMapping: 'Orthogonal sandbox',
    dcpReuseMapping: 'DCP reuses TP',
    dcpHintTitle: 'DCP rank reuse:',
    dcpHintDesc: 'Following vLLM decode DCP semantics, DCP ranks are derived from TP ranks and add no illustrative GPUs. This page requires DCP to divide TP to form uniform subgroups. Only CP/TP reuse changes; EP/ETP remain orthogonal sandbox axes.',
    dcpPrefillDisabled: 'DCP reuse is decode-only. Switch back to the orthogonal sandbox to select Prefill.',
    componentProfile: 'Component profile',
    standardProfile: 'General 6D',
    wideEpProfile: 'Wide-EP',
    helixProfile: 'Helix',
    wideEpHint: 'Wide-EP is a specific rank-reuse template: EP ranks also act as DP Attention workers, then switch back to EP expert ownership in Sparse FFN. It is not required by DP Attention.',
    attentionRuntime: 'Attention runtime',
    attentionType: 'Attention type',
    mhaType: 'MHA',
    gqaType: 'GQA',
    mlaType: 'MLA',
    mhaProjection: 'Multi-head Q/K/V projection',
    gqaProjection: 'Q + grouped shared K/V',
    mlaProjection: 'Q + latent KV projection',
    mhaProjectionTooltip: 'MHA gives Q, K, and V the same head count and commonly fuses their projections into one matrix operation.',
    gqaProjectionTooltip: 'GQA keeps more query heads while groups of query heads share a smaller number of K/V heads.',
    mlaProjectionTooltip: 'MLA compresses K/V into a low-dimensional latent cache and reconstructs the required representation during Attention.',
    mhaWeightLayout: 'MHA projection weights: equal-width Q / K / V',
    gqaWeightLayout: 'GQA projection weights: wide Q / shared K and V',
    mlaWeightLayout: 'MLA projection weights: Q / KV compression / K,V reconstruction',
    tpProjectionShard: 'TP shards the projection output and head dimensions',
    dpProjectionReplica: 'DP Attention: every worker uses a local Attention-weight replica',
    mlaProjectionShard: 'Q and K/V reconstruction follow TP; KV compression keeps one latent path',
    perTokenKvFootprint: 'Relative per-token KV capacity (shared scale)',
    mhaStructure: 'MHA pairs every query head with a KV head, so TP can shard the head dimension.',
    gqaStructure: 'GQA shares fewer KV heads across query groups; TP beyond the KV-head count introduces KV replication.',
    mlaStructure: 'MLA compresses KV into one latent cache. Standard TP replicates this cache across ranks, so DP Attention has the clearest benefit.',
    standardAttentionFlow: 'One request · TP head/weight shards',
    standardKvShardFlow: 'KV heads sharded with TP',
    standardKvReplicaFlow: 'The same request KV is replicated across TP ranks ×{count}',
    dpAttentionFlow: 'Different requests are assigned to independent Attention workers',
    attentionWorker: 'TP{rank} · Request B{rank}',
    prefillWorkerTask: 'Prefill S_new · write private KV',
    decodeWorkerTask: 'Decode 1 token · read private KV',
    dpAttentionGather: 'All-Gather Attention outputs → MoE; redistribute them to workers after MoE',
    dpAttentionKvOwnership: 'Each worker exclusively owns its requests and KV · no TP KV replication',
    attentionTypeBoundary: 'DP Attention was introduced for DeepSeek MLA. MHA/GQA are included here to compare layouts; actual engine support depends on the model and backend.',
    standardAttention: 'Standard TP Attention',
    dpAttention: 'DP Attention',
    dpAttentionHint: 'DP Attention reuses the existing TP ranks inside each outer DP replica and adds no GPUs. Top-level DP and TP remain orthogonal deployment axes: DP2+TP2 means two TP2 replicas and therefore four GPUs.',
    dpAttentionHelixBoundary: 'Helix has a fixed KVP×TP Attention rank reuse and cannot switch to DP Attention at the same time.',
    wideEpCapacityLimit: 'Wide-EP requires EP≥2, but the current topology cannot expand EP within the 32-GPU cap.',
    helixHint: 'Long-KV decode uses KVP(EP)×TP for Attention, then reconfigures the same rank pool as a TP×EP FFN without another GPU multiplier.',
    helixCapacityLimit: 'The Helix teaching profile needs EP≥2 as KVP, but the current topology cannot expand within the 32-GPU cap.',
    helixBoundary: 'This Helix teaching profile models decode-only rank reuse inside one engine; it does not combine with symmetric P/D or DCP reuse.',
    helixDecodeOnly: 'Helix targets long-context decode. Switch to another component profile to select Prefill.',
    servingTopology: 'Serving topology',
    unifiedServing: 'Unified engine',
    pdDisaggregated: 'P/D disaggregated',
    pdCapacityLimit: 'The symmetric P/D teaching topology duplicates the current instance and would exceed the 32-GPU cap.',
    pdDcpBoundary: 'The current symmetric P/D teaching mode gives both pools one configuration, so it does not combine with decode-only DCP rank reuse.',
    pdTopologyTitle: 'Independent Prefill / Decode pools',
    pdSymmetricHint: 'Symmetric 1:1 teaching setup; real deployments may size and parallelize the pools differently.',
    prefillPool: 'Prefill Pool',
    decodePool: 'Decode Pool',
    prefillShort: 'P',
    decodeShort: 'D',
    unifiedPool: 'Unified',
    kvTransfer: 'KV Cache RDMA / NIXL',
    prefillPoolRole: 'Compute prompt and KV',
    decodePoolRole: 'Read KV and generate tokens',
    otherPdPool: 'Other phase pool',
    wideEpAttentionRole: 'Wide-EP DP Attention: DP×EP({dp}) × TP({tp})',
    dpAttentionRole: 'DP Attention: {dp} outer replicas · each reuses TP({tp}) ranks · EP independent',
    wideEpMoeRole: 'Sparse FFN: EP({ep}) × ETP({etp})',
    wideEpLmHeadRole: 'LM Head: DP×EP({dp}) request replicas × TP({tp})',
    dpAttentionGpuRole: 'Replica DP {dp} · Attn Worker TP {tp}',
    moeGpuRole: 'MoE EP {ep}',
    dpAttentionWorkerShort: 'DP Attention · W{worker}',
    helixGpuRoleCompact: 'Helix · KVP{kvp} ↔ FFN EP{ep}',
    helixDecodeFact: 'Helix decode reinterprets EP ranks inside each DP replica as KVP ranks during Attention; the current query is broadcast to all KVP ranks.',
    helixKvSplit: 'KV ownership: KVP(EP={kvp}) sequence shards × TP({tp}) KV-head shards',
    helixKvAssumption: 'The Helix profile uses the EP control as KVP width: KVP shards the KV sequence while TP only shards KV heads, avoiding full-KV duplication beyond the KV-head count.',
    helixAttentionRole: 'Helix Attention: KVP({kvp}) × TP({tp})',
    helixMoeRole: 'Same rank pool → TP({tp}) × EP({ep}) FFN',
    helixRankReuse: 'Same ranks reconfigure: KVP×TP Attention → TP×EP FFN',
    helixExactCombine: 'Partial O + LSE → All-to-All → exact Attention',
    helixKvShardNode: 'KV Shard Attention',
    helixOutProjNode: 'Out Proj TP/AR',
    helixGpuAttention: 'ATTN KVP {kvp} × TP {tp}',
    helixGpuFfn: 'FFN EP {ep} × TP {tp}',
    clusterHintBold: 'Click a GPU card on the right to pin it for comparison.',
    physGpuMap: 'GPU Shard Mapping (Orthogonal Sandbox)',
    physGpuMapDcp: 'GPU Shard Mapping (DCP Reuses TP)',
    physGpuMapPd: 'Prefill / Decode Pool GPU Mapping',
    singleCard: 'Single GPU (No Sharding)'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const getPipelineState = (ppDegree, phase, step) => {
  const stageCount = Math.max(1, ppDegree);
  const slotCount = PIPELINE_MICROBATCHES + stageCount - 1;
  const currentSlot = Math.min(Math.max(step, 0), slotCount - 1);
  const stages = Array.from({ length: stageCount }, (_, stage) => {
    const startLayer = Math.floor((stage * TOTAL_LAYERS) / stageCount) + 1;
    const endLayer = Math.floor(((stage + 1) * TOTAL_LAYERS) / stageCount);
    const cells = Array.from({ length: slotCount }, (_, slot) => {
      const microbatch = slot - stage;
      const hasWork = microbatch >= 0 && microbatch < PIPELINE_MICROBATCHES;
      const status = phase === 'idle'
        ? 'pending'
        : phase === 'done' || slot < currentSlot
          ? 'passed'
          : slot === currentSlot
            ? 'active'
            : 'pending';

      return { slot, microbatch, hasWork, status };
    });

    return { stage, startLayer, endLayer, cells };
  });
  const activeJobs = phase === 'running'
    ? stages
        .map(({ stage, cells }) => ({ stage, cell: cells[currentSlot] }))
        .filter(({ cell }) => cell.hasWork)
        .map(({ stage, cell }) => ({ stage, microbatch: cell.microbatch }))
    : [];
  const schedulePhase = phase === 'idle'
    ? 'idle'
    : phase === 'done'
      ? 'done'
      : activeJobs.length === stageCount
        ? 'steady'
        : currentSlot < stageCount - 1
          ? 'warmup'
          : 'drain';

  return {
    stageCount,
    slotCount,
    currentSlot,
    stages,
    activeJobs,
    schedulePhase,
    utilization: PIPELINE_MICROBATCHES / slotCount,
  };
};

// 重构为白昼模式 (Light Mode) 的颜色映射表
const getColorClass = (color, type) => {
  const colors = {
    blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600', softBg: 'bg-blue-50', active: 'bg-blue-500 text-white shadow-md shadow-blue-500/40' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600', softBg: 'bg-amber-50', active: 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/40' },
    purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600', softBg: 'bg-purple-50', active: 'bg-purple-500 text-white shadow-md shadow-purple-500/40' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600', softBg: 'bg-emerald-50', active: 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/40' },
    pink: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-600', softBg: 'bg-pink-50', active: 'bg-pink-500 text-white shadow-md shadow-pink-500/40' },
    cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-600', softBg: 'bg-cyan-50', active: 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/40' },
    slate: { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-600', softBg: 'bg-slate-50', active: 'bg-slate-500 text-white font-bold shadow-md shadow-slate-500/40' },
    indigo: { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-600', softBg: 'bg-indigo-50', active: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/40' },
  };
  return colors[color][type];
};

const ExpertConnectionOverlay = ({
  containerRef,
  sourceRef,
  targetRefs,
  activeExpertIndexes,
  crossRank,
  label,
  ariaLabel,
  layoutKey,
}) => {
  const [geometry, setGeometry] = useState(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const source = sourceRef.current;
    const targets = targetRefs.current.filter(Boolean);
    if (!container || !source || targets.length === 0) return undefined;

    const updateGeometry = () => {
      const containerRect = container.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      setGeometry({
        width: containerRect.width,
        height: containerRect.height,
        source: {
          x: sourceRect.left - containerRect.left + sourceRect.width / 2,
          y: sourceRect.bottom - containerRect.top,
        },
        targets: targets.map((target, index) => {
          const rect = target.getBoundingClientRect();
          return {
            index,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top,
          };
        }),
      });
    };

    const frame = requestAnimationFrame(updateGeometry);
    const observer = new ResizeObserver(updateGeometry);
    [container, source, ...targets].forEach((element) => observer.observe(element));
    window.addEventListener('resize', updateGeometry);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, [containerRef, sourceRef, targetRefs, layoutKey]);

  if (!geometry) return null;
  const firstTargetY = Math.min(...geometry.targets.map((target) => target.y));
  const labelTop = Math.max(geometry.source.y + 5, firstTargetY - 27);
  const stroke = crossRank ? '#f43f5e' : '#64748b';

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" role="img" aria-label={ariaLabel}>
      <svg width={geometry.width} height={geometry.height} className="absolute inset-0 overflow-visible" aria-hidden="true">
        <defs>
          <marker id="moe-link-end" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={stroke} />
          </marker>
          {crossRank && (
            <marker id="moe-link-start" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse" markerUnits="strokeWidth">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={stroke} />
            </marker>
          )}
        </defs>
        {geometry.targets.map((target) => {
          const active = activeExpertIndexes.includes(target.index);
          const delta = Math.max(20, (target.y - geometry.source.y) * 0.5);
          const path = `M ${geometry.source.x} ${geometry.source.y} C ${geometry.source.x} ${geometry.source.y + delta}, ${target.x} ${target.y - delta}, ${target.x} ${target.y}`;
          return (
            <path
              key={target.index}
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? 2 : 1.25}
              strokeDasharray={crossRank ? undefined : '4 3'}
              opacity={active ? 0.9 : 0.16}
              markerStart={crossRank ? 'url(#moe-link-start)' : undefined}
              markerEnd="url(#moe-link-end)"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <span
        className={`absolute max-w-[210px] -translate-x-1/2 rounded-full border bg-white/95 px-2 py-0.5 text-center text-[7px] font-bold leading-tight shadow-sm ${crossRank ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-600'}`}
        style={{ left: geometry.source.x, top: labelTop }}
      >
        {label}
      </span>
    </div>
  );
};

const App = () => {
  const [degrees, setDegrees] = useState({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
  const [hoveredGpu, setHoveredGpu] = useState(null);
  const [pinnedGpu, setPinnedGpu] = useState(null);
  const [lang, setLang] = useState(getInitialLang());
  const [contextMode, setContextMode] = useState('prefill');
  const [mappingModel, setMappingModel] = useState('orthogonal');
  const [componentProfile, setComponentProfile] = useState('standard');
  const [attentionMode, setAttentionMode] = useState('standard');
  const [attentionType, setAttentionType] = useState('mla');
  const [servingMode, setServingMode] = useState('unified');
  const [moeTransport, setMoeTransport] = useState('tokenA2a');
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const moeGraphRef = useRef(null);
  const moeRouterRef = useRef(null);
  const moeExpertRefs = useRef([]);
  
  // 支持插值的 t 函数
  const t = (k, vars = {}) => {
    let str = i18n[lang][k] ?? k;
    Object.keys(vars).forEach(key => {
      str = str.split(`{${key}}`).join(vars[key]);
    });
    return str;
  };

  // 核心状态：计算当前应该展示哪张卡的切片状态 (优先展示悬浮，其次是锁定)
  const activeGpu = hoveredGpu !== null ? hoveredGpu : pinnedGpu;

  const pipelineState = useMemo(
    () => getPipelineState(degrees.pp, phase, step),
    [degrees.pp, phase, step],
  );

  const totalGpus = useMemo(() => {
    return getDeploymentGpuCount(degrees, mappingModel, servingMode);
  }, [degrees, mappingModel, servingMode]);
  const instanceGpus = useMemo(
    () => getDeploymentGpuCount(degrees, mappingModel, 'unified'),
    [degrees, mappingModel],
  );
  const pdModeAvailable = useMemo(
    () => isTopologyValid(degrees, 'orthogonal', 'pdDisaggregated'),
    [degrees],
  );
  const wideEpModeAvailable = useMemo(
    () => degrees.ep > 1 || isTopologyValid({ ...degrees, ep: 2 }, mappingModel, servingMode),
    [degrees, mappingModel, servingMode],
  );
  const helixModeAvailable = useMemo(() => {
    const helixDegrees = { ...degrees, cp: 1, ep: Math.max(2, degrees.ep), etp: 1 };
    return isTopologyValid(helixDegrees, 'orthogonal', 'unified');
  }, [degrees]);
  const dwdpModeAvailable = useMemo(() => {
    const dwdpDegrees = getDwdpDegrees(degrees);
    return isTopologyValid(dwdpDegrees, 'orthogonal', 'pdDisaggregated');
  }, [degrees]);

  const checkConstraints = (newDegrees, nextMappingModel = mappingModel) => {
    return isTopologyValid(newDegrees, nextMappingModel, servingMode);
  };

  const handleSetDegree = (dim, val) => {
    const newDegrees = { ...degrees, [dim]: val };
    if (checkConstraints(newDegrees)) {
      setDegrees(newDegrees);
      if (componentProfile === 'wideEp' && dim === 'ep' && val === 1) setComponentProfile('standard');
      if (componentProfile === 'helix' && dim === 'ep' && val === 1) setComponentProfile('standard');
      if (moeTransport === 'dwdp' && ((dim === 'tp' && val !== 1) || (dim === 'etp' && val !== 1) || (dim === 'ep' && val === 1))) setMoeTransport('tokenA2a');
      setPinnedGpu(null); // 当修改拓扑时自动解除锁定
      setPhase('idle');
      setStep(0);
      setIsPlaying(false);
    }
  };

  const handleServingMode = (nextMode) => {
    if (componentProfile === 'helix' && nextMode === 'pdDisaggregated') return;
    const nextMappingModel = nextMode === 'pdDisaggregated' ? 'orthogonal' : mappingModel;
    if (!isTopologyValid(degrees, nextMappingModel, nextMode)) return;
    setMappingModel(nextMappingModel);
    setServingMode(nextMode);
    if (moeTransport === 'dwdp' && nextMode !== 'pdDisaggregated') setMoeTransport('tokenA2a');
    setPinnedGpu(null);
    setHoveredGpu(null);
    setPhase('idle');
    setStep(0);
    setIsPlaying(false);
  };

  const handleComponentProfile = (nextProfile) => {
    if (nextProfile === 'wideEp' && !wideEpModeAvailable) return;
    if (nextProfile === 'helix' && !helixModeAvailable) return;
    let nextDegrees = degrees;
    if (nextProfile === 'wideEp' && degrees.ep === 1) {
      const expandedEp = { ...degrees, ep: 2 };
      if (isTopologyValid(expandedEp, mappingModel, servingMode)) nextDegrees = expandedEp;
    }
    if (nextProfile === 'helix') {
      nextDegrees = { ...degrees, cp: 1, ep: Math.max(2, degrees.ep), etp: 1 };
      setContextMode('decode');
      setMappingModel('orthogonal');
      setServingMode('unified');
      resetPipeline();
    }
    if (nextProfile === 'wideEp') {
      setAttentionMode('dpAttention');
      setAttentionType('mla');
    }
    if (nextProfile === 'helix') {
      setAttentionMode('standard');
      setAttentionType('mla');
    }
    setDegrees(nextDegrees);
    setComponentProfile(nextProfile);
    if (moeTransport === 'dwdp' && nextProfile !== 'standard') setMoeTransport('tokenA2a');
    setPinnedGpu(null);
    setHoveredGpu(null);
  };

  const handleNextStep = () => {
    if (phase === 'done') {
      setStep(0);
      setPhase('running');
      return;
    }
    if (phase === 'idle') {
      setStep(0);
      setPhase('running');
      return;
    }
    if (step >= pipelineState.slotCount - 1) {
      setPhase('done');
      setIsPlaying(false);
      return;
    }
    setStep((current) => current + 1);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (phase === 'done') {
      setStep(0);
      setPhase('running');
    } else if (phase === 'idle') {
      setStep(0);
      setPhase('running');
    }
    setIsPlaying(true);
  };

  const resetPipeline = () => {
    setPhase('idle');
    setStep(0);
    setIsPlaying(false);
  };

  const handleContextMode = (nextMode) => {
    setContextMode(nextMode);
    if (moeTransport === 'dwdp' && nextMode !== 'prefill') setMoeTransport('tokenA2a');
    resetPipeline();
  };

  const handleAttentionMode = (nextMode) => {
    if (componentProfile === 'helix') return;
    setAttentionMode(nextMode);
    if (nextMode === 'standard' && componentProfile === 'wideEp') setComponentProfile('standard');
    setPinnedGpu(null);
    setHoveredGpu(null);
    resetPipeline();
  };

  const handleAttentionType = (nextType) => {
    setAttentionType(nextType);
    setPinnedGpu(null);
    setHoveredGpu(null);
    resetPipeline();
  };

  const handleMoeTransport = (nextTransport) => {
    if (nextTransport === 'tokenA2a') {
      setMoeTransport('tokenA2a');
      return;
    }
    if (!dwdpModeAvailable) return;
    const nextDegrees = getDwdpDegrees(degrees);
    setDegrees(nextDegrees);
    setMappingModel('orthogonal');
    setServingMode('pdDisaggregated');
    setComponentProfile('standard');
    setAttentionMode('standard');
    setAttentionType('mla');
    setContextMode('prefill');
    setMoeTransport('dwdp');
    setPinnedGpu(null);
    setHoveredGpu(null);
    resetPipeline();
  };

  const handleMappingModel = (nextModel) => {
    if (nextModel === mappingModel) return;
    if (componentProfile === 'helix' && nextModel === 'dcpReuse') return;
    if (servingMode === 'pdDisaggregated' && nextModel === 'dcpReuse') return;
    if (nextModel === 'dcpReuse') {
      const expandedTp = { ...degrees, tp: Math.max(degrees.tp, degrees.cp) };
      const nextDegrees = getDeploymentGpuCount(expandedTp, 'dcpReuse', servingMode) <= MAX_GPUS
        ? expandedTp
        : { ...degrees, cp: Math.min(degrees.cp, degrees.tp) };
      setDegrees(nextDegrees);
      setContextMode('decode');
      setMappingModel('dcpReuse');
    } else {
      const nextDegrees = getDeploymentGpuCount(degrees, 'orthogonal', servingMode) > MAX_GPUS
        ? { ...degrees, cp: 1 }
        : degrees;
      setDegrees(nextDegrees);
      setMappingModel('orthogonal');
    }
    setPinnedGpu(null);
    resetPipeline();
  };

  useEffect(() => {
    if (!isPlaying || phase === 'done') return undefined;
    const timer = setTimeout(handleNextStep, 900);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, step, degrees.pp]);

  const reset = () => {
    setDegrees({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
    setHoveredGpu(null);
    setPinnedGpu(null);
    setContextMode('prefill');
    setMappingModel('orthogonal');
    setComponentProfile('standard');
    setAttentionMode('standard');
    setAttentionType('mla');
    setServingMode('unified');
    setMoeTransport('tokenA2a');
    resetPipeline();
  };

  const getGpuCoords = (g) => getDeploymentGpuCoordinates(g, degrees, mappingModel, servingMode);

  const DimBadge = ({ text, tooltip }) => (
    <span title={tooltip} className="ml-1 text-[8px] lg:text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded cursor-help whitespace-nowrap">
      {text}
    </span>
  );

  // 1. 基础权重矩阵块 (白色主题)
  const MatrixBlock = ({ title, dims, sliceDir, splitLabel, isLayerActive, activeColorClass, degree = 1, activeChunkIndex = 0, mW, mH, tooltip, inactiveReason }) => {
    const inactiveColorClass = "bg-slate-100 border border-slate-200/60";
    const numChunks = sliceDir === 'rep' ? 1 : Math.max(1, degree);
    const isNotResident = activeGpu !== null && !isLayerActive && Boolean(inactiveReason);
    
    // 替换原本的 hoveredGpu 为 activeGpu
    const effectiveActive = (activeGpu === null) 
        ? Array.from({length: numChunks}).map((_, i) => i) 
        : (isLayerActive ? [activeChunkIndex] : []);

    return (
      <div className={`rounded flex flex-col items-center justify-between border p-1.5 md:p-2 h-full w-full shadow-sm transition-colors ${isNotResident ? 'border-dashed border-purple-200 bg-purple-50/40' : 'border-slate-200 bg-white'}`} title={tooltip}>
        <div className="flex flex-col items-center leading-tight mb-2 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-700 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-[2px]">{dims}</span>}
        </div>
        
        <div className="flex-1 flex items-center justify-center py-1">
          <div 
            className={`flex ${sliceDir === 'row' ? 'flex-col' : 'flex-row'} gap-[1px]`}
            style={{ width: `${mW}px`, height: `${mH}px` }}
          >
            {Array.from({length: numChunks}).map((_, i) => (
               <div key={i} className={`flex-1 rounded-[1px] transition-all duration-300 ${effectiveActive.includes(i) ? activeColorClass : inactiveColorClass}`} />
            ))}
          </div>
        </div>
        
        <div className={`text-[7px] md:text-[8px] whitespace-nowrap mt-1 text-center min-h-[14px] flex items-end justify-center ${isNotResident ? 'font-semibold text-purple-700' : 'text-slate-500'}`}>
          {isNotResident ? inactiveReason : sliceDir === 'rep' ? t('fullCopy') : splitLabel}
        </div>
      </div>
    );
  };

  // 2. 2D网格切分矩阵块
  const GridBlock = ({ title, dims, splitLabel, isLayerActive, activeColorClass, degreeX = 1, degreeY = 1, activeX = 0, activeY = 0, mW, mH }) => {
    const inactiveColorClass = "bg-slate-100 border border-slate-200/60";
    const effectiveActive = (activeGpu === null) ? true : isLayerActive;
    
    const dX = Math.max(1, degreeX);
    const dY = Math.max(1, degreeY);

    return (
      <div className="bg-white rounded flex flex-col items-center justify-between border border-slate-200 p-1.5 md:p-2 h-full w-full shadow-sm">
        <div className="flex flex-col items-center leading-tight mb-2 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-700 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-[2px]">{dims}</span>}
        </div>
        
        <div className="flex-1 flex items-center justify-center py-1">
          <div 
            className="grid gap-[1px]"
            style={{ 
              width: `${mW}px`, height: `${mH}px`,
              gridTemplateColumns: `repeat(${dX}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${dY}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: dX * dY }).map((_, i) => {
              const y = Math.floor(i / dX);
              const x = i % dX;
              const isActive = effectiveActive && (activeGpu === null || (activeY === y && activeX === x));
              return <div key={i} className={`rounded-[1px] transition-colors duration-300 ${isActive ? activeColorClass : inactiveColorClass}`} />
            })}
          </div>
        </div>
        
        <div className="text-[7px] md:text-[8px] text-slate-500 whitespace-nowrap mt-1 text-center h-[14px] flex items-end justify-center">
          {splitLabel}
        </div>
      </div>
    );
  };

  // 3. 重构版 3D 三维张量切片引擎 (Light Mode 优化投影)
  const Tensor3DBlock = ({ title, dims, splitLabel, isLayerActive, activeColorClass, degreeX = 1, degreeY = 1, degreeZ = 1, activeX = 0, activeY = 0, activeZ = 0, mW, mH }) => {
    const effectiveActive = (activeGpu === null) ? true : isLayerActive;

    const dX = Math.max(1, degreeX);
    const dY = Math.max(1, degreeY);
    const dZ = Math.max(1, degreeZ);

    return (
      <div className="bg-white rounded flex flex-col items-center justify-between border border-slate-200 p-1.5 md:p-2 h-full w-full shadow-sm">
        <div className="flex flex-col items-center leading-tight mb-4 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-700 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-[2px]">{dims}</span>}
        </div>
        
        <div className="flex-1 flex items-center justify-center py-4 w-full">
          <div className="relative" style={{ width: `${mW}px`, height: `${mH}px` }}>
            {Array.from({ length: dZ }).map((_, z) => {
              const actualZ = dZ - 1 - z; 
              const isZActive = effectiveActive && (activeGpu === null || activeZ === actualZ);
              
              const offsetStep = 14; 
              const totalOffset = (dZ - 1) * offsetStep;
              const offsetX = (actualZ * offsetStep) - (totalOffset / 2);
              const offsetY = -(actualZ * offsetStep) + (totalOffset / 2);

              const layerZIndex = (isZActive && activeGpu !== null) ? 50 : actualZ;
              const layerStyleClass = (!isZActive && activeGpu !== null) 
                  ? 'opacity-30 grayscale pointer-events-none' // 白色背景下的幽灵态调整
                  : 'opacity-100 shadow-md shadow-slate-300'; 

              return (
                <div 
                  key={actualZ} 
                  className={`absolute inset-0 transition-all duration-500 ${layerStyleClass} bg-white/95 rounded border border-slate-300 p-[1px]`}
                  style={{ 
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    zIndex: layerZIndex
                  }}
                >
                  <div className="w-full h-full grid gap-[1px]" style={{
                    gridTemplateColumns: `repeat(${dX}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${dY}, minmax(0, 1fr))`
                  }}>
                    {Array.from({ length: dX * dY }).map((_, i) => {
                      const y = Math.floor(i / dX);
                      const x = i % dX;
                      const isActive = isZActive && (activeGpu === null || (activeY === y && activeX === x));
                      
                      const blockClass = isActive 
                          ? activeColorClass 
                          : "bg-slate-100 border border-slate-200/60";

                      return (
                        <div 
                          key={i} 
                          className={`rounded-[1px] transition-colors duration-300 ${blockClass}`} 
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-[7px] md:text-[8px] text-slate-500 whitespace-nowrap mt-4 text-center h-[14px] flex items-end justify-center">
          {splitLabel}
        </div>
      </div>
    );
  };

  const AttentionProjectionVisual = ({ type, isDpMode, tpDegree, activeTp }) => {
    const layouts = {
      mha: [
        { id: 'q', latex: String.raw`W_Q`, flex: 1, tone: 'bg-amber-400' },
        { id: 'k', latex: String.raw`W_K`, flex: 1, tone: 'bg-emerald-400' },
        { id: 'v', latex: String.raw`W_V`, flex: 1, tone: 'bg-cyan-400' },
      ],
      gqa: [
        { id: 'q', latex: String.raw`W_Q`, flex: 4, tone: 'bg-amber-400' },
        { id: 'k', latex: String.raw`W_K`, flex: 1, tone: 'bg-emerald-400' },
        { id: 'v', latex: String.raw`W_V`, flex: 1, tone: 'bg-cyan-400' },
      ],
      mla: [
        { id: 'q', latex: String.raw`W_Q`, flex: 4, tone: 'bg-amber-400', followsTp: true },
        { id: 'down', latex: String.raw`W_{DKV}`, flex: 1, tone: 'bg-violet-400', followsTp: false },
        { id: 'up', latex: String.raw`W_{UK},W_{UV}`, flex: 2, tone: 'bg-blue-400', followsTp: true },
      ],
    };
    const bands = layouts[type] || layouts.mla;
    const titleKey = type === 'mha' ? 'mhaWeightLayout' : type === 'gqa' ? 'gqaWeightLayout' : 'mlaWeightLayout';
    const footerKey = isDpMode
      ? 'dpProjectionReplica'
      : type === 'mla' && tpDegree > 1
        ? 'mlaProjectionShard'
        : tpDegree > 1
          ? 'tpProjectionShard'
          : 'fullWeight';

    return (
      <div data-testid="attention-projection-visual" data-attention-type={type} className="flex h-full w-full flex-col rounded border border-slate-200 bg-white p-1.5 shadow-sm" role="img" aria-label={t(titleKey)}>
        <span className="mb-1 text-center text-[8px] font-semibold leading-tight text-slate-700">{t(titleKey)}</span>
        <div className="flex min-h-10 flex-1 items-stretch gap-1">
          {bands.map((band) => {
            const shardDegree = isDpMode || band.followsTp === false ? 1 : Math.max(1, tpDegree);
            const activeShard = shardDegree === 1 ? 0 : activeTp % shardDegree;
            return (
              <div key={band.id} data-testid={`projection-band-${band.id}`} data-shards={shardDegree} className="flex min-w-0 flex-col gap-0.5" style={{ flex: band.flex }}>
                <span className="truncate text-center text-[7px] text-slate-600"><MathFormula>{band.latex}</MathFormula></span>
                <div className="flex min-h-7 flex-1 gap-px rounded border border-slate-200 bg-slate-50 p-px">
                  {Array.from({ length: shardDegree }).map((_, shard) => {
                    const isActive = activeGpu === null || shard === activeShard;
                    return <span key={shard} className={`flex-1 rounded-[1px] transition ${isActive ? band.tone : 'bg-slate-200 opacity-40'}`} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <span className="mt-1 text-center text-[7px] leading-tight text-slate-500">{t(footerKey)}</span>
      </div>
    );
  };

  const renderPipelineSchedule = () => {
    if (degrees.pp === 1) return null;
    const phaseKey = {
      idle: 'ppIdle',
      warmup: 'ppWarmup',
      steady: 'ppSteady',
      drain: 'ppDrain',
      done: 'ppDone',
    }[pipelineState.schedulePhase];

    return (
      <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-800">{t('ppSchedule')}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
              pipelineState.schedulePhase === 'steady'
                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                : pipelineState.schedulePhase === 'done'
                  ? 'border-slate-300 bg-slate-100 text-slate-700'
                  : 'border-cyan-300 bg-cyan-50 text-cyan-800'
            }`}>{t(phaseKey)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetPipeline}
              className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50"
              aria-label={t('ppReset')}
              title={t('ppReset')}
            >
              <RotateCcw size={12} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded border border-purple-300 bg-white p-1 text-purple-700 hover:bg-purple-100"
              aria-label={isPlaying ? t('ppPause') : t('ppPlay')}
              title={isPlaying ? t('ppPause') : t('ppPlay')}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                handleNextStep();
              }}
              disabled={phase === 'done'}
              className="rounded border border-purple-300 bg-white p-1 text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('ppNext')}
              title={t('ppNext')}
            >
              <SkipForward size={12} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[330px]">
            <div
              className="mb-1 grid gap-1 pl-[62px]"
              style={{ gridTemplateColumns: `repeat(${pipelineState.slotCount}, minmax(28px, 1fr))` }}
            >
              {Array.from({ length: pipelineState.slotCount }, (_, slot) => (
                <div key={slot} className={`text-center text-[8px] font-semibold ${phase !== 'idle' && slot === pipelineState.currentSlot ? 'text-cyan-700' : 'text-slate-400'}`}>
                  {t('ppSlot')} {slot}
                </div>
              ))}
            </div>
            <div>
              {pipelineState.stages.map((stage, stageIndex) => {
                const currentCell = stage.cells[pipelineState.currentSlot];
                const connectorActive = phase === 'running' && currentCell?.status === 'active';
                const connectorPassed = phase === 'done' || currentCell?.status === 'passed';
                return (
                <React.Fragment key={stage.stage}>
                  {stageIndex > 0 && (
                    <div data-testid={`pp-link-${stageIndex - 1}-${stageIndex}`} className="grid h-5 grid-cols-[58px_1fr] items-center gap-1" aria-label={t('p2pActivation')}>
                      <div className={`flex h-full items-center justify-center gap-0.5 text-[7px] font-bold ${connectorActive ? 'text-cyan-700' : connectorPassed ? 'text-emerald-700' : 'text-purple-500'}`}>
                        <ArrowDown size={9} className={connectorActive ? 'animate-pulse' : ''} />
                        <span>{t('p2pActivation')}</span>
                      </div>
                      <div className={`h-px ${connectorActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.55)]' : connectorPassed ? 'bg-emerald-300' : 'bg-purple-200'}`} />
                    </div>
                  )}
                  <div className="grid grid-cols-[58px_1fr] items-center gap-1">
                  <div className="text-[8px] font-bold leading-tight text-purple-800">
                    S{stage.stage}
                    <span className="block font-normal text-slate-500">L{stage.startLayer}-{stage.endLayer}</span>
                  </div>
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${pipelineState.slotCount}, minmax(28px, 1fr))` }}
                  >
                    {stage.cells.map((cell) => {
                      const isCurrentColumn = phase !== 'idle' && cell.slot === pipelineState.currentSlot;
                      const cellClass = !cell.hasWork
                        ? `border-dashed border-slate-200 bg-white/60 text-slate-300 ${isCurrentColumn ? 'ring-1 ring-cyan-200' : ''}`
                        : cell.status === 'active'
                          ? 'border-cyan-500 bg-cyan-500 text-white shadow-sm ring-2 ring-cyan-200'
                          : cell.status === 'passed'
                            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                            : 'border-purple-200 bg-white text-purple-700';
                      return (
                        <div key={cell.slot} className={`flex h-6 items-center justify-center rounded border text-[8px] font-bold transition-all ${cellClass}`}>
                          {cell.hasWork ? `MB${cell.microbatch}` : '—'}
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </React.Fragment>
              )})}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-purple-100 pt-2 text-[8px] text-slate-600">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {pipelineState.activeJobs.length > 0
              ? pipelineState.activeJobs.map((job) => (
                  <span key={`${job.stage}-${job.microbatch}`} className="rounded bg-white px-1.5 py-0.5">
                    {job.stage === 0
                      ? t('ppFirstStage', { microbatch: job.microbatch })
                      : t('ppReceive', { stage: job.stage, microbatch: job.microbatch })}
                  </span>
                ))
              : <span>{t(phaseKey)}</span>}
          </div>
          <span className="flex items-center gap-1 whitespace-nowrap">
            {t('ppUtilization')}
            <MathFormula>{String.raw`\frac{M}{M+P-1}=\frac{${PIPELINE_MICROBATCHES}}{${pipelineState.slotCount}}=${Math.round(pipelineState.utilization * 100)}\%`}</MathFormula>
          </span>
        </div>
        <p className="mt-1.5 text-[8px] leading-relaxed text-slate-500">{t('ppReplicaScope')}</p>
      </div>
    );
  };

  const renderLogicalView = () => {
    const coords = activeGpu !== null ? getGpuCoords(activeGpu) : null;
    const componentParallel = getComponentParallelState(degrees, componentProfile, attentionMode);
    const attentionDpIndex = coords ? componentParallel.attentionDpIndex(coords) : 0;
    const ownership = coords
      ? getPipelineOwnership(degrees.pp, coords.pp_idx)
      : { ownsEmbedding: true, ownsLmHead: true };
    const isEmbeddingActive = ownership.ownsEmbedding;
    const isLmHeadActive = ownership.ownsLmHead;
    const moeParallel = getMoeParallelState(degrees);
    const expertTp = moeParallel.expertTp;
    const expertShardIndex = moeParallel.shardAxis === 'tp'
      ? coords?.tp_idx || 0
      : coords?.etp_idx || 0;
    const moeModeKey = {
      single: 'moeModeSingle',
      tp: 'moeModeTp',
      ep: 'moeModeEp',
      etp: 'moeModeEtp',
      hybrid: 'moeModeHybrid',
    }[moeParallel.mode];
    const moeUsesCrossRankRouting = moeParallel.mode === 'ep' || moeParallel.mode === 'hybrid';
    const activeExpertIndexes = coords
      ? Array.from({ length: 4 }, (_, expertIndex) => expertIndex).filter((expertIndex) => expertIndex % degrees.ep === coords.ep_idx)
      : [0, 1, 2, 3];
    const isPrefill = contextMode === 'prefill';
    const isHelix = componentProfile === 'helix';
    const isDpAttention = componentParallel.attentionMode === 'dpAttention';
    const attentionArchitecture = getAttentionArchitectureState(
      degrees,
      attentionType,
      componentParallel.attentionMode,
      contextMode,
    );
    const isDwdp = moeTransport === 'dwdp';
    const inputCpDegree = isPrefill ? degrees.cp : 1;
    const inputDims = isPrefill ? '[B, S_new]' : '[B, 1]';
    const kvDims = attentionType === 'mla'
      ? isPrefill ? '[B, S_new, C_KV]' : '[B, T_cache, C_KV]'
      : isPrefill ? '[B, S_new, H_KV]' : '[B, T_cache, H_KV]';
    const kvSequenceDegree = isHelix ? componentParallel.kvParallel : degrees.cp;
    const kvSequenceIndex = isHelix ? coords?.ep_idx || 0 : coords?.cp_idx || 0;
    const attentionRequestDegree = isDpAttention
      ? componentParallel.attentionDp * attentionArchitecture.workerCount
      : componentParallel.attentionDp;
    const attentionRequestIndex = isDpAttention
      ? attentionDpIndex * attentionArchitecture.workerCount + (coords?.tp_idx || 0)
      : attentionDpIndex;
    const inputSplitLabel = isDpAttention
      ? t('dpAttentionInputSplit', { dp: componentParallel.attentionDp, tp: attentionArchitecture.workerCount, cp: degrees.cp })
      : componentParallel.attentionDp > 1 || degrees.cp > 1
      ? isPrefill
        ? t(componentProfile === 'wideEp' ? 'wideEpDpCpSplit' : 'dpCpSplit', { dp: componentParallel.attentionDp, cp: degrees.cp })
        : t('decodeInputSplit')
      : t('fullData');
    const structureKey = attentionType === 'mha'
      ? 'mhaStructure'
      : attentionType === 'gqa'
        ? 'gqaStructure'
        : 'mlaStructure';
    const kvAssumptionKey = mappingModel === 'dcpReuse'
      ? 'kvDcpAssumption'
      : attentionType === 'mha'
        ? 'kvMhaAssumption'
        : attentionType === 'gqa'
          ? 'kvGqaAssumption'
          : 'kvMlaAssumption';
    const kvVisualConfig = attentionType === 'mha'
      ? { width: 176, height: 48, maxWidth: 300, tone: 'bg-emerald-500', latex: String.raw`2H_{KV}=32` }
      : attentionType === 'gqa'
        ? { width: 112, height: 32, maxWidth: 220, tone: 'bg-cyan-500', latex: String.raw`2H_{KV}=8` }
        : { width: 64, height: 24, maxWidth: 160, tone: 'bg-violet-500', latex: String.raw`C_{KV}=4` };

    return (
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 flex flex-col gap-2 relative overflow-hidden h-full">
        {/* 修复：移除 xl:flex-row 和 justify-between，始终保持 flex-col 上下排列 */}
        <div className="flex flex-col items-start border-b border-slate-200 pb-3 mb-2 gap-2.5">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800">
            <Network className="text-cyan-600" size={20} />
            {t('logicalTitle')}
          </h3>
          
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">B=Batch(32)</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">S=Seq(128)</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">H=Hidden(16)</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 shadow-sm">V=Vocab(64)</span>
              <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-200 shadow-sm">E=Experts(4)</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('attentionType')}>
              <span className="px-1 text-[9px] font-semibold text-slate-500">{t('attentionType')}</span>
              {['mha', 'gqa', 'mla'].map((type) => (
                <button
                  key={type}
                  data-testid={`attention-type-${type}`}
                  type="button"
                  aria-pressed={attentionType === type}
                  onClick={() => handleAttentionType(type)}
                  className={`rounded px-2 py-1 text-[9px] font-bold transition ${attentionType === type ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                >
                  {t(`${type}Type`)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('executionContext')}>
              <span className="px-1 text-[9px] font-semibold text-slate-500">{t('executionContext')}</span>
              {['prefill', 'decode'].map((mode) => (
                <button
                  key={mode}
                  data-testid={`context-${mode}`}
                  type="button"
                  disabled={(mappingModel === 'dcpReuse' || componentProfile === 'helix') && mode === 'prefill'}
                  aria-pressed={contextMode === mode}
                  onClick={() => handleContextMode(mode)}
                  title={mode === 'prefill' && componentProfile === 'helix' ? t('helixDecodeOnly') : mappingModel === 'dcpReuse' && mode === 'prefill' ? t('dcpPrefillDisabled') : undefined}
                  className={`rounded px-2 py-1 text-[9px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${contextMode === mode ? 'bg-cyan-500 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                >
                  {t(mode)}
                </button>
              ))}
            </div>
            </div>
          </div>
        </div>

        {servingMode === 'pdDisaggregated' && (
          <div className="mb-2 rounded-lg border border-cyan-200 bg-cyan-50/60 p-2" role="group" aria-label={t('pdTopologyTitle')}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[8px] font-bold text-cyan-900">
              <span>{t('pdTopologyTitle')}</span>
              <span className="font-normal text-cyan-700">{t('pdSymmetricHint')}</span>
            </div>
            <div className="grid grid-cols-[1fr_92px_1fr] items-center gap-1.5">
              <button type="button" aria-pressed={contextMode === 'prefill'} onClick={() => handleContextMode('prefill')} className={`rounded border px-2 py-1.5 text-center transition ${contextMode === 'prefill' ? 'border-cyan-400 bg-white text-cyan-800 shadow-sm ring-1 ring-cyan-200' : 'border-slate-200 bg-white/70 text-slate-500'}`}>
                <span className="block text-[9px] font-bold">{t('prefillPool')} · {instanceGpus} GPU</span>
                <span className="block text-[7px]">{t('prefillPoolRole')}</span>
              </button>
              <div className="flex flex-col items-center text-[7px] font-bold text-rose-700">
                <div className="flex w-full items-center"><div className="h-px flex-1 bg-rose-300"/><ArrowRight size={12}/></div>
                <span className="text-center leading-tight">{t('kvTransfer')}</span>
              </div>
              <button type="button" aria-pressed={contextMode === 'decode'} onClick={() => handleContextMode('decode')} className={`rounded border px-2 py-1.5 text-center transition ${contextMode === 'decode' ? 'border-cyan-400 bg-white text-cyan-800 shadow-sm ring-1 ring-cyan-200' : 'border-slate-200 bg-white/70 text-slate-500'}`}>
                <span className="block text-[9px] font-bold">{t('decodePool')} · {instanceGpus} GPU</span>
                <span className="block text-[7px]">{t('decodePoolRole')}</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Input Tokens [B, S] */}
        <div className="flex justify-center mt-1">
          <div className="w-64">
             <GridBlock
                title={t('inputData')} dims={inputDims}
                splitLabel={inputSplitLabel}
                degreeX={inputCpDegree} degreeY={attentionRequestDegree}
                activeX={isPrefill ? coords?.cp_idx || 0 : 0} activeY={attentionRequestIndex}
                isLayerActive={true} activeColorClass={getColorClass('cyan', 'active')}
                mW={128} mH={32}
             />
          </div>
        </div>
        {attentionRequestDegree > 1 && (
          <p className="mx-auto max-w-md rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-center text-[8px] leading-relaxed text-blue-800">
            {t(componentProfile === 'wideEp' ? 'wideEpRequestFact' : isDpAttention ? 'dpAttentionRequestFact' : 'dpRequestFact')}
          </p>
        )}
        {isHelix && (
          <p className="mx-auto max-w-md rounded border border-violet-200 bg-violet-50 px-2 py-1.5 text-center text-[8px] leading-relaxed text-violet-800">
            {t('helixDecodeFact')}
          </p>
        )}

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-400" size={14} /></div>

        {/* 2. Embedding [V, H] */}
        <div className="flex justify-center">
          <div className="w-32">
            <MatrixBlock 
              title={t('embedMatrix')} dims="[V, H]" sliceDir="row" 
              splitLabel={degrees.tp > 1 ? t('rowSplit', { tp: degrees.tp }) : t('fullWeight')}
              degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
              isLayerActive={isEmbeddingActive} activeColorClass={getColorClass('amber', 'active')}
              inactiveReason={t('ppNotResident', { stage: 0 })}
              mW={16} mH={64}
            />
          </div>
        </div>

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-400" size={14} /></div>

        {/* 3. Transformer Blocks (PP) */}
        <div className="relative mt-1 mb-1">
          <div className="absolute -left-2 md:-left-3 top-0 bottom-0 w-1 bg-purple-200 rounded-full"></div>
          <div className="pl-3 md:pl-4">
            <div className="flex items-center justify-between mb-2">
               <div className="text-xs font-bold text-purple-600">{t('transLayers')}</div>
               <div className="text-[10px] text-slate-500">{degrees.pp > 1 ? t('ppSplit', { pp: degrees.pp }) : t('noPp')}</div>
            </div>
            <div className="flex gap-1 h-1.5 w-full mb-3">
              {Array.from({ length: degrees.pp }).map((_, l) => {
                const isPpSelected = coords === null || coords.pp_idx === l;
                const currentCell = pipelineState.stages[l]?.cells[pipelineState.currentSlot];
                const isExecuting = phase === 'running' && currentCell?.hasWork;
                const isDone = phase === 'done';
                const start = Math.floor((l * TOTAL_LAYERS) / degrees.pp) + 1;
                const end = Math.floor(((l + 1) * TOTAL_LAYERS) / degrees.pp);
                const stageClass = isExecuting
                  ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50 ring-1 ring-cyan-200'
                  : isDone
                    ? 'bg-emerald-400'
                    : isPpSelected
                      ? 'bg-purple-500 shadow-sm shadow-purple-500/40'
                      : 'bg-slate-200';
                return <div key={l} title={t('ppStageTip', { stage: l, start, end })} className={`flex-1 rounded-sm transition-all duration-300 ${stageClass}`} />
              })}
            </div>

            {renderPipelineSchedule()}

            <div className="bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-200">
               
               {/* Attention Block */}
               <div className="bg-white p-2 md:p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-semibold text-slate-700">
                   <span className="flex items-center gap-1.5"><Grid size={14} className="text-amber-500"/> {t('attnBlock')}</span>
                   {componentProfile === 'wideEp' && (
                     <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[7px] font-bold text-blue-700">{t('wideEpAttentionRole', { dp: componentParallel.attentionDp, tp: componentParallel.attentionTp })}</span>
                   )}
                   {componentProfile !== 'wideEp' && isDpAttention && (
                     <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[7px] font-bold text-blue-700">{t('dpAttentionRole', { dp: componentParallel.attentionDp, tp: componentParallel.attentionTp })}</span>
                   )}
                   {isHelix && (
                     <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[7px] font-bold text-violet-700">{t('helixAttentionRole', { kvp: componentParallel.kvParallel, tp: componentParallel.attentionTp })}</span>
                   )}
                 </div>

                 <div data-testid="attention-architecture-summary" className="mb-2 grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-2 py-1.5">
                   <div className="flex items-center gap-1 text-[8px] font-bold text-violet-800">
                     <span className="rounded bg-white px-1.5 py-0.5 shadow-sm"><MathFormula>{String.raw`H_q=${attentionArchitecture.queryHeads}`}</MathFormula></span>
                     <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">
                       <MathFormula>{attentionType === 'mla' ? String.raw`C_{KV}=${attentionArchitecture.latentWidth}` : String.raw`H_{KV}=${attentionArchitecture.kvHeads}`}</MathFormula>
                     </span>
                   </div>
                   <p className="text-[8px] leading-relaxed text-violet-800">{t(structureKey)}</p>
                 </div>
                 
                 <div className="flex flex-col gap-1.5 md:gap-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_32px_minmax(0,1fr)] items-stretch gap-1">
                       <MatrixBlock 
                          title="RMSNorm" dims="[H]" sliceDir="rep" 
                          isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                          mW={16} mH={4}
                       />
                       <div className="flex items-center justify-center text-slate-400" aria-hidden="true">
                         <ArrowRight size={13} />
                       </div>
                       <AttentionProjectionVisual
                         type={attentionType}
                         isDpMode={isDpAttention}
                         tpDegree={degrees.tp}
                         activeTp={coords?.tp_idx || 0}
                       />
                       <div className="flex flex-col items-center justify-center gap-0.5 text-center text-[7px] font-bold leading-tight text-cyan-700" aria-label={t('tpLocalAttentionEdge')}>
                         <ArrowRight size={13} />
                         <span>{t('tpLocalAttentionEdge')}</span>
                       </div>
                       <MatrixBlock 
                          title={t('outProj')} dims="[H, H]" sliceDir="row" 
                          splitLabel={isDpAttention ? t('workerLocalWeight') : degrees.tp > 1 ? t('rowSplit', { tp: degrees.tp }) : t('fullWeight')}
                          degree={isDpAttention ? 1 : degrees.tp} activeChunkIndex={isDpAttention ? 0 : coords?.tp_idx || 0}
                          isLayerActive={true} activeColorClass={getColorClass('amber', 'active')}
                          mW={16} mH={16}
                       />
                    </div>
                    {isDpAttention ? (
                      <div data-testid="dp-attention-worker-flow" className="rounded-lg border border-blue-200 bg-blue-50/70 p-2" role="img" aria-label={t('dpAttentionFlow')}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[8px] font-bold text-blue-900">
                          <span>{t('dpAttentionFlow')}</span>
                          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[7px] text-blue-700">{t('dpAttentionKvOwnership')}</span>
                        </div>
                        <div className={`grid gap-1.5 ${attentionArchitecture.workerCount === 1 ? 'grid-cols-1' : attentionArchitecture.workerCount === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                          {Array.from({ length: attentionArchitecture.workerCount }).map((_, worker) => {
                            const isCurrentWorker = coords === null || coords.tp_idx === worker;
                            return (
                              <div key={worker} data-testid={`dp-attention-worker-${worker}`} className={`rounded border px-1.5 py-1 text-center transition ${isCurrentWorker ? 'border-blue-400 bg-white text-blue-900 shadow-sm ring-1 ring-blue-100' : 'border-blue-100 bg-blue-50 text-blue-400 opacity-70'}`}>
                                <span className="block text-[8px] font-bold">{t('attentionWorker', { rank: worker })}</span>
                                <span className="block text-[7px] leading-tight">{t(isPrefill ? 'prefillWorkerTask' : 'decodeWorkerTask')}</span>
                              </div>
                            );
                          })}
                        </div>
                        {attentionArchitecture.needsTokenGatherBeforeMoe && (
                          <div className="mt-1.5 flex items-center gap-1 text-[7px] font-bold text-rose-700">
                            <div className="h-px flex-1 bg-rose-300" />
                            <Network size={10} className="shrink-0" />
                            <span className="text-center leading-tight">{t('dpAttentionGather')}</span>
                            <ArrowDown size={10} className="shrink-0" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div data-testid="standard-attention-worker-flow" className="flex flex-wrap items-center justify-between gap-1.5 rounded border border-amber-100 bg-amber-50/60 px-2 py-1 text-[8px] text-amber-900">
                        <span className="font-bold">{t('standardAttentionFlow')}</span>
                        <span>{t(attentionArchitecture.kvReplication > 1 ? 'standardKvReplicaFlow' : 'standardKvShardFlow', { count: attentionArchitecture.kvReplication })}</span>
                      </div>
                    )}
                    {!isDpAttention && degrees.tp > 1 && (
                      <div data-testid="tp-collective-link" className="ml-auto flex w-[48%] items-center gap-1 py-1 text-[7px] font-bold text-rose-700" role="note" aria-label={t('tpCommTitle')}>
                        <div className="h-px flex-1 bg-rose-300" />
                        <Network size={10} className="shrink-0" />
                        <span className="leading-tight">{t('tpCollectiveEdge')}</span>
                        <ArrowDown size={10} className="shrink-0" />
                      </div>
                    )}
                    {isHelix && (
                      <div data-testid="helix-exact-attention-link" className="flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[7px] font-bold text-violet-800" role="note">
                        <span className="rounded bg-white px-1 py-0.5">{t('helixKvShardNode')}</span>
                        <ArrowRight size={10} className="shrink-0" />
                        <span className="min-w-0 flex-1 text-center leading-tight">{t('helixExactCombine')}</span>
                        <ArrowRight size={10} className="shrink-0" />
                        <span className="rounded bg-white px-1 py-0.5">{t('helixOutProjNode')}</span>
                      </div>
                    )}
                    
                    <div data-testid="kv-footprint-scale" data-attention-type={attentionType} data-footprint-units={attentionArchitecture.kvFootprintUnits} className="mx-auto mt-1 w-full max-w-sm rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[7px] text-slate-600">
                        <span>{t('perTokenKvFootprint')}</span>
                        <MathFormula>{kvVisualConfig.latex}</MathFormula>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <div className={`h-full rounded-full transition-all duration-300 ${kvVisualConfig.tone}`} style={{ width: `${(attentionArchitecture.kvFootprintUnits / 32) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-center mt-1 pb-1">
                       <div className="w-full transition-[max-width] duration-300" style={{ maxWidth: `${kvVisualConfig.maxWidth}px` }}>
                          <Tensor3DBlock 
                             title={t('kvCache')} dims={kvDims}
                             splitLabel={isHelix ? t('helixKvSplit', { kvp: componentParallel.kvParallel, tp: degrees.tp }) : isDpAttention ? t('dpAttentionKvSplit', { workers: attentionRequestDegree, cp: degrees.cp }) : componentParallel.attentionDp > 1 || degrees.cp > 1 || attentionArchitecture.kvHeadShardDegree > 1 ? t(componentProfile === 'wideEp' ? 'wideEpKvSplit' : 'split3D') : t('noSplit')}
                             degreeX={kvSequenceDegree} degreeY={isDpAttention ? attentionRequestDegree : componentParallel.attentionDp} degreeZ={isDpAttention ? 1 : attentionArchitecture.kvHeadShardDegree}
                             activeX={kvSequenceIndex} activeY={isDpAttention ? attentionRequestIndex : attentionDpIndex} activeZ={isDpAttention ? 0 : (coords?.tp_idx || 0) % attentionArchitecture.kvHeadShardDegree}
                             isLayerActive={true} activeColorClass={getColorClass('emerald', 'active')}
                             mW={kvVisualConfig.width} mH={kvVisualConfig.height}
                          />
                       </div>
                    </div>
                    {!isHelix && degrees.cp > 1 && (
                      <p className="mt-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[8px] leading-relaxed text-emerald-800">
                        {t(isPrefill ? 'cpPrefillFact' : 'cpDecodeFact')}
                        <span className="mt-1 block border-t border-emerald-200 pt-1 text-emerald-700">{t('cpVsSpFact')}</span>
                      </p>
                    )}
                    <p className="mt-1.5 text-center text-[8px] leading-relaxed text-slate-500">
                      {t(isHelix ? 'helixKvAssumption' : kvAssumptionKey)}
                    </p>
                    {isDpAttention && (
                      <p className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[7px] leading-relaxed text-blue-700">{t('attentionTypeBoundary')}</p>
                    )}
                 </div>
               </div>

               {/* MoE Layer */}
               <div className="bg-white p-2 md:p-3 rounded-lg border border-slate-200 shadow-sm mt-3">
                 {isHelix && (
                   <div className="mb-2 flex items-center justify-center gap-1 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[7px] font-bold text-violet-800" role="note" data-testid="helix-rank-reuse-link">
                     <Network size={10} />
                     <span>{t('helixRankReuse')}</span>
                     <ArrowDown size={10} />
                   </div>
                 )}
                 <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-semibold text-slate-700">
                   <span className="flex items-center gap-1.5"><BrainCircuit size={14} className="text-pink-500"/> {t('moeLayer')}</span>
                   <span className="flex flex-wrap justify-end gap-1">
                     {(degrees.tp > 1 || degrees.ep > 1 || degrees.etp > 1) && (
                       <span className="rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[8px] font-bold text-pink-700">{t(moeModeKey)}</span>
                     )}
                     {componentProfile === 'wideEp' && (
                       <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[7px] font-bold text-blue-700">{t('wideEpMoeRole', { ep: degrees.ep, etp: degrees.etp })}</span>
                     )}
                      {isHelix && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[7px] font-bold text-violet-700">{t('helixMoeRole', { tp: componentParallel.ffnTp, ep: componentParallel.ffnEp })}</span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-[7px] font-bold ${isDwdp ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {t(isDwdp ? 'dwdpTransport' : 'tokenA2aTransport')}
                      </span>
                     </span>
                   </div>
                  {isDwdp && (
                    <p className="mb-2 rounded border border-orange-200 bg-orange-50 px-2 py-1 text-[8px] leading-relaxed text-orange-800" data-testid="dwdp-hint">
                      {t('dwdpHint')}
                    </p>
                  )}

                  <div ref={moeGraphRef} data-testid="moe-graph" className="relative">
                 <div className="relative z-10 mb-1 grid grid-cols-4 gap-1.5 md:gap-2">
                    <MatrixBlock 
                       title="RMSNorm" dims="[H]" sliceDir="rep" 
                       isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                       mW={16} mH={4}
                    />
                    <div ref={moeRouterRef} data-testid="moe-router-node" className="h-full">
                    <MatrixBlock 
                       title={t('router')} dims="[H, E]" sliceDir="rep"
                       isLayerActive={true} activeColorClass="bg-pink-500 text-white shadow-md shadow-pink-500/40"
                       mW={8} mH={16}
                    />
                    </div>
                    <div className="col-span-2 flex items-center justify-center px-2">
                       <span className="text-[10px] text-slate-500 text-center leading-tight">{isDwdp ? t('dwdpExecutor') : t('routerDesc')}</span>
                    </div>
                  </div>

                  {isDwdp ? (
                    <div className="relative z-10 mb-2 rounded-lg border border-orange-200 bg-orange-50/70 p-2" data-testid="dwdp-weight-path" role="img" aria-label={t('dwdpHint')}>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-center text-[7px] font-bold leading-tight text-orange-900">
                        <span className="rounded border border-orange-200 bg-white px-1.5 py-1">{t('dwdpWeightOwner')}</span>
                        <ArrowRight size={12} className="text-orange-500" />
                        <span className="rounded border border-orange-300 bg-orange-100 px-1.5 py-1">{t('dwdpBuffer')}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1 text-[7px] font-semibold text-orange-700">
                        <span>{t('dwdpPeerPull')}</span>
                        <ArrowDown size={10} />
                        <span>{t('dwdpNoTokenA2a')}</span>
                      </div>
                    </div>
                  ) : (degrees.tp > 1 || degrees.ep > 1 || degrees.etp > 1) && <div className="h-10" aria-hidden="true" />}

                 {/* 专家池 */}
                 <div className="relative z-10 grid grid-cols-4 gap-1 md:gap-2">
                   {Array.from({ length: 4 }).map((_, e) => {
                      const isLocalExpert = coords === null || getDwdpExpertResidency(e, coords, degrees.ep) === 'local';
                      const isEpActive = isDwdp || isLocalExpert;
                      const expertActiveColor = moeParallel.shardAxis === 'etp' ? getColorClass('indigo', 'active') : getColorClass('amber', 'active');
                      const expertLabel = expertTp > 1
                        ? `${moeParallel.shardAxis === 'tp' ? 'TP' : 'ETP'}=${expertTp}`
                        : t('wholeBlock');

                      return (
                        <div
                          key={`exp-${e}`}
                          ref={(element) => { moeExpertRefs.current[e] = element; }}
                          data-testid={`moe-expert-${e}`}
                           className={`rounded border p-1 transition-all duration-300 md:p-1.5 ${isDwdp ? isLocalExpert ? 'border-orange-300 bg-orange-50' : 'border-amber-200 bg-amber-50/70' : isEpActive ? 'border-pink-300 bg-pink-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                         >
                           <div className={`text-[9px] font-bold text-center mb-1.5 transition-colors ${isEpActive ? 'text-pink-600' : 'text-slate-400'}`}>{t('expert')} {e}</div>
                           {isDwdp && coords && (
                             <div className={`mb-1 rounded border px-1 py-0.5 text-center text-[7px] font-bold ${isLocalExpert ? 'border-orange-200 bg-white text-orange-700' : 'border-amber-200 bg-white text-amber-700'}`}>
                               {t(isLocalExpert ? 'dwdpLocalWeight' : 'dwdpRemoteWeight')}
                             </div>
                           )}
                          <div className="flex flex-col gap-1.5 w-full">
                            <MatrixBlock 
                               title={t('w1w3')} dims="[H, 4H]" sliceDir="col" 
                               splitLabel={expertTp > 1 ? t('colSlice', { label: expertLabel }) : t('fullCalc')}
                               degree={expertTp} activeChunkIndex={expertShardIndex}
                               isLayerActive={isEpActive} activeColorClass={expertActiveColor}
                               mW={48} mH={16}
                            />
                            <MatrixBlock 
                               title={t('w2')} dims="[4H, H]" sliceDir="row" 
                               splitLabel={expertTp > 1 ? t('rowSlice', { label: expertLabel }) : t('fullCalc')}
                               degree={expertTp} activeChunkIndex={expertShardIndex}
                               isLayerActive={isEpActive} activeColorClass={expertActiveColor}
                               mW={16} mH={64}
                            />
                          </div>
                          {expertTp > 1 && (
                            <div title={t('moeExpertCollectiveTitle')} aria-label={t('moeExpertCollectiveTitle')} className={`mt-1 flex items-center justify-center gap-0.5 rounded border px-1 py-0.5 text-center text-[7px] font-bold leading-tight ${isEpActive ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                              <Network size={8} className="shrink-0" />
                              <span>{t('moeExpertCollectiveEdge')}</span>
                            </div>
                          )}
                        </div>
                      )
                   })}
                 </div>
                  {!isDwdp && (degrees.tp > 1 || degrees.ep > 1 || degrees.etp > 1) && (
                   <ExpertConnectionOverlay
                     containerRef={moeGraphRef}
                     sourceRef={moeRouterRef}
                     targetRefs={moeExpertRefs}
                     activeExpertIndexes={activeExpertIndexes}
                     crossRank={moeUsesCrossRankRouting}
                     label={t(moeUsesCrossRankRouting ? 'moeA2AEdge' : 'moeLocalRouteEdge')}
                     ariaLabel={t('moeRoutingAria')}
                     layoutKey={`${lang}-${degrees.tp}-${degrees.ep}-${degrees.etp}-${activeGpu ?? 'all'}`}
                   />
                 )}
                 </div>
                  {(degrees.ep > 1 || degrees.etp > 1) && (
                    <p className="mt-2 rounded border border-pink-100 bg-pink-50 px-2 py-1 text-[8px] leading-relaxed text-pink-700">
                      {t(isDwdp ? 'dwdpBoundary' : 'etpMeshBoundary')}
                    </p>
                 )}
               </div>

            </div>
          </div>
        </div>

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-400" size={14} /></div>

        {/* 4. LM Head [H, V] */}
        <div className="flex justify-center">
          <div className="w-48">
            <MatrixBlock 
              title={t('lmHead')} dims="[H, V]" sliceDir="col" 
              splitLabel={degrees.tp > 1 ? t('colSplit', { tp: degrees.tp }) : t('fullWeight')}
              degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
              isLayerActive={isLmHeadActive} activeColorClass={getColorClass('amber', 'active')}
              inactiveReason={t('ppNotResident', { stage: degrees.pp - 1 })}
              mW={64} mH={16}
            />
            {componentProfile === 'wideEp' && (
              <p className="mt-1 rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-center text-[7px] font-bold leading-tight text-blue-700">
                {t('wideEpLmHeadRole', { dp: componentParallel.lmHeadDp, tp: degrees.tp })}
              </p>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderMiniTrack = (dim, label, color, coords, customDegree = null) => {
    const degree = customDegree !== null ? customDegree : degrees[dim];
    const activeIdx = coords[`${dim}_idx`];
    const activeColor = getColorClass(color, 'bg');
    const textColor = getColorClass(color, 'text');

    return (
      <div key={dim} data-testid={`gpu-rank-${dim}`} className="flex min-w-0 items-center gap-1 text-[8px]" title={`${label} ${activeIdx}/${degree}`}>
        {/* Label */}
        <span className={`w-5 shrink-0 text-left font-bold ${textColor}`}>{label}</span>
        
        {/* Progress Bar */}
        <div className="flex h-1 min-w-0 flex-1 gap-px">
          {Array.from({ length: Math.max(1, degree) }).map((_, i) => (
            <div key={i} className={`flex-1 rounded-[1px] transition-colors duration-300 ${i === activeIdx ? activeColor : 'bg-slate-100'}`} />
          ))}
        </div>
        
        {/* Explicit Rank Number */}
        <div className="flex w-4 shrink-0 justify-end">
           <span className="min-w-4 rounded border border-slate-200 bg-slate-50 px-0.5 py-px text-center font-mono text-[7px] leading-none text-slate-500">
             {activeIdx}
           </span>
        </div>
      </div>
    );
  };

  const renderGpuCard = (g) => {
    const coords = getGpuCoords(g);
    const isPinned = pinnedGpu === g;
    const isHovered = hoveredGpu === g;
    const isActiveCard = isPinned || isHovered;
    const isCurrentPool = servingMode === 'unified' || coords.pool === contextMode;
    const followsPipeline = coords.dp_idx === 0 && isCurrentPool;
    const currentCell = pipelineState.stages[coords.pp_idx]?.cells[pipelineState.currentSlot];
    const isExecuting = followsPipeline && phase === 'running' && currentCell?.hasWork;
    const isBubble = followsPipeline && phase === 'running' && !currentCell?.hasWork;
    const isStageDone = followsPipeline && phase === 'done';
    const pipelineLabel = !isCurrentPool
      ? t('otherPdPool')
      : !followsPipeline
        ? t('ppCardIndependent')
      : isExecuting
        ? t('ppCardRunning', { microbatch: currentCell.microbatch })
        : isBubble
          ? t('ppCardBubble')
          : isStageDone
            ? t('ppCardDone')
            : t('ppIdle');
    const pipelineTone = isExecuting
      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
      : isStageDone
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : isBubble
          ? 'border-slate-200 bg-slate-100 text-slate-500'
          : followsPipeline
            ? 'border-purple-100 bg-purple-50 text-purple-700'
            : 'border-slate-200 bg-white text-slate-500';

    return (
      <div 
        key={g}
        data-testid="gpu-card"
        data-gpu-index={g}
        role="button"
        tabIndex={0}
        aria-pressed={isPinned}
        onClick={() => {
          if (servingMode === 'pdDisaggregated') handleContextMode(coords.pool);
          setPinnedGpu(isPinned ? null : g);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (servingMode === 'pdDisaggregated') handleContextMode(coords.pool);
            setPinnedGpu(isPinned ? null : g);
          }
        }}
        onMouseEnter={() => setHoveredGpu(g)}
        onMouseLeave={() => setHoveredGpu(null)}
        className={`min-w-0 rounded-lg border p-2 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          ${isExecuting ? 'border-cyan-500 bg-cyan-50/60 shadow-[0_0_18px_rgba(6,182,212,0.22)]' : isStageDone ? 'border-emerald-300 bg-emerald-50/40' : 'bg-white'}
          ${isActiveCard ? 'z-10 shadow-[0_6px_16px_rgba(6,182,212,0.15)]' : 'shadow-sm hover:border-slate-300 hover:shadow-md'}
          ${isPinned ? 'ring-2 ring-cyan-400 ring-offset-1' : ''}`}
      >
        <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1">
          <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-slate-800">
            <Cpu size={10} className={`shrink-0 ${isActiveCard ? 'text-cyan-500' : 'text-slate-400'}`} />
            GPU {g}
            {servingMode === 'pdDisaggregated' && (
              <span title={t(coords.pool === 'prefill' ? 'prefillPool' : 'decodePool')} className={`rounded border px-1 py-px text-[7px] ${coords.pool === 'prefill' ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                {t(coords.pool === 'prefill' ? 'prefillShort' : 'decodeShort')}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {isHovered && !isPinned && <span title={t('hovered')} className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />}
            {isPinned && <Pin size={9} title={t('locked')} className="fill-cyan-100 text-cyan-600" />}
          </div>
        </div>
        {degrees.pp > 1 && (
          <div className={`mb-1.5 flex items-center gap-1 rounded border px-1 py-0.5 text-[7px] font-semibold leading-tight ${pipelineTone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isExecuting ? 'bg-cyan-500 animate-pulse' : isStageDone ? 'bg-emerald-500' : isBubble ? 'bg-slate-400' : 'bg-purple-400'}`} />
            <span>{pipelineLabel}</span>
          </div>
        )}
        <div className="flex flex-col gap-1">
          {renderMiniTrack('dp', 'DP', 'blue', coords)}
          {renderMiniTrack('cp', 'CP', 'emerald', coords)}
          {renderMiniTrack('pp', 'PP', 'purple', coords)}
          {renderMiniTrack('tp', 'TP', 'amber', coords)}
          {renderMiniTrack('ep', 'EP', 'pink', coords)}
          {renderMiniTrack('etp', 'ETP', 'indigo', coords)}
        </div>
        {componentProfile === 'wideEp' && (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-center text-[7px] font-bold leading-tight">
            <span className="block rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-blue-700">{t('dpAttentionWorkerShort', { worker: (coords.dp_idx * degrees.ep + coords.ep_idx) * degrees.tp + coords.tp_idx })}</span>
          </div>
        )}
        {componentProfile !== 'wideEp' && attentionMode === 'dpAttention' && (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-center text-[7px] font-bold leading-tight">
            <span className="block rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-blue-700">{t('dpAttentionWorkerShort', { worker: coords.dp_idx * degrees.tp + coords.tp_idx })}</span>
          </div>
        )}
        {componentProfile === 'helix' && (
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-center text-[7px] font-bold leading-tight">
            <span className="block rounded border border-violet-200 bg-violet-50 px-1 py-0.5 text-violet-700">{t('helixGpuRoleCompact', { kvp: coords.ep_idx, ep: coords.ep_idx })}</span>
          </div>
        )}
        {moeTransport === 'dwdp' && coords.pool === 'prefill' && (
          <div className="mt-1.5 border-t border-orange-100 pt-1.5 text-center text-[7px] font-bold leading-tight">
            <span className="block rounded border border-orange-200 bg-orange-50 px-1 py-0.5 text-orange-700">
              {t('dwdpGpuRole', { group: coords.dp_idx, rank: coords.ep_idx })}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 2xl:px-32 overflow-x-hidden">
      <div className="max-w-[110rem] mx-auto space-y-6">
        
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Network className="text-cyan-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t('pageDesc')}</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold shadow-inner flex items-center gap-2 whitespace-nowrap text-slate-700">
               <Cpu size={18} className="text-slate-400"/>
               {t('totalGpu')} <span className={`text-lg ml-1 ${totalGpus === MAX_GPUS ? 'text-rose-500' : 'text-cyan-600'}`}>{totalGpus}</span> / {MAX_GPUS}
             </div>
             <button onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition shadow-sm flex items-center gap-1" title="Language"><Globe size={16}/> {t('langToggle')}</button>
             <button onClick={reset} className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition tooltip shadow-sm" title={t('reset')}>
                <RotateCcw size={18} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3">
          {STRATEGIES.map((strat) => {
            const currentVal = degrees[strat.id];
            const Icon = strat.icon;
            const active = currentVal > 1;
            
            return (
              <div key={strat.id} className={`p-3 lg:p-4 rounded-xl border transition-all duration-300 flex flex-col shadow-sm
                ${active ? `${getColorClass(strat.color, 'border')} ${getColorClass(strat.color, 'softBg')}` : 'border-slate-200 bg-white'}`}>
                
                <div className="flex items-center gap-1.5 lg:gap-2 mb-2">
                  <Icon size={16} className={`shrink-0 ${active ? getColorClass(strat.color, 'text') : 'text-slate-400'}`} />
                  <h3 className={`font-bold text-[12px] md:text-[13px] whitespace-nowrap tracking-tight ${active ? 'text-slate-900' : 'text-slate-600'}`}>{t(`${strat.id}Name`)}</h3>
                </div>
                
                <div className="flex gap-1 mb-2.5 lg:mb-3">
                  {[1, 2, 4].map(val => {
                    const isSelected = currentVal === val;
                    const tempDegrees = { ...degrees, [strat.id]: val };
                    const helixLocksAxis = componentProfile === 'helix' && (strat.id === 'cp' || strat.id === 'etp') && val > 1;
                    const isDisabled = !isSelected && (helixLocksAxis || !checkConstraints(tempDegrees));

                    return (
                      <button 
                        key={val}
                        data-testid={`degree-${strat.id}-${val}`}
                        disabled={isDisabled}
                        title={helixLocksAxis ? t('helixBoundary') : undefined}
                        onClick={() => handleSetDegree(strat.id, val)}
                        className={`flex-1 py-1 text-xs font-bold rounded transition-all
                          ${isSelected ? `${getColorClass(strat.color, 'bg')} text-white shadow-sm` : 
                            isDisabled ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-70' : 
                            'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                      >
                        {val}x
                      </button>
                    )
                  })}
                </div>
                <p className={`text-[9px] lg:text-[10px] leading-relaxed mt-auto hidden sm:block ${active ? 'text-slate-700' : 'text-slate-400'}`}>
                  {t(`${strat.id}Desc`)}
                </p>
              </div>
            )
          })}
          
          <div className="col-span-2 md:col-span-3 xl:col-span-6 flex flex-col items-stretch gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-500 shadow-sm" data-testid="runtime-control-panel">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('mappingModel')}>
                <span className="px-1 text-[8px] font-semibold text-slate-500 sm:text-[9px]">{t('mappingModel')}</span>
                {[
                  ['orthogonal', 'orthogonalMapping'],
                  ['dcpReuse', 'dcpReuseMapping'],
                ].map(([model, labelKey]) => (
                  <button
                    key={model}
                    data-testid={`mapping-model-${model}`}
                    type="button"
                    disabled={model === 'dcpReuse' && (servingMode === 'pdDisaggregated' || componentProfile === 'helix')}
                    title={model === 'dcpReuse' && componentProfile === 'helix' ? t('helixBoundary') : servingMode === 'pdDisaggregated' && model === 'dcpReuse' ? t('pdDcpBoundary') : undefined}
                    aria-pressed={mappingModel === model}
                    onClick={() => handleMappingModel(model)}
                    className={`rounded px-2 py-1 text-[9px] font-bold transition ${mappingModel === model ? 'bg-blue-500 text-white shadow-sm' : model === 'dcpReuse' && (servingMode === 'pdDisaggregated' || componentProfile === 'helix') ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('componentProfile')}>
                <span className="px-1 text-[8px] font-semibold text-slate-500 sm:text-[9px]">{t('componentProfile')}</span>
                {[
                  ['standard', 'standardProfile'],
                  ['wideEp', 'wideEpProfile'],
                  ['helix', 'helixProfile'],
                ].map(([profile, labelKey]) => (
                  <button key={profile} data-testid={`component-profile-${profile}`} type="button" disabled={profile === 'wideEp' ? !wideEpModeAvailable : profile === 'helix' && !helixModeAvailable} title={profile === 'wideEp' && !wideEpModeAvailable ? t('wideEpCapacityLimit') : profile === 'helix' && !helixModeAvailable ? t('helixCapacityLimit') : undefined} aria-pressed={componentProfile === profile} onClick={() => handleComponentProfile(profile)} className={`rounded px-2 py-1 text-[9px] font-bold transition ${componentProfile === profile ? 'bg-pink-500 text-white shadow-sm' : (profile === 'wideEp' && !wideEpModeAvailable) || (profile === 'helix' && !helixModeAvailable) ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('attentionRuntime')}>
                <span className="px-1 text-[8px] font-semibold text-slate-500 sm:text-[9px]">{t('attentionRuntime')}</span>
                {[
                  ['standard', 'standardAttention'],
                  ['dpAttention', 'dpAttention'],
                ].map(([mode, labelKey]) => {
                  const disabled = componentProfile === 'helix';
                  return (
                    <button
                      key={mode}
                      data-testid={`attention-mode-${mode}`}
                      type="button"
                      disabled={disabled}
                      title={disabled ? t('dpAttentionHelixBoundary') : undefined}
                      aria-pressed={attentionMode === mode}
                      onClick={() => handleAttentionMode(mode)}
                      className={`rounded px-2 py-1 text-[9px] font-bold transition ${attentionMode === mode ? 'bg-blue-500 text-white shadow-sm' : disabled ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('servingTopology')}>
                <span className="px-1 text-[8px] font-semibold text-slate-500 sm:text-[9px]">{t('servingTopology')}</span>
                {[
                  ['unified', 'unifiedServing'],
                  ['pdDisaggregated', 'pdDisaggregated'],
                ].map(([mode, labelKey]) => {
                  const disabled = mode === 'pdDisaggregated' && (!pdModeAvailable || componentProfile === 'helix');
                  return (
                    <button key={mode} data-testid={`serving-mode-${mode}`} type="button" disabled={disabled} title={disabled ? componentProfile === 'helix' ? t('helixBoundary') : t('pdCapacityLimit') : undefined} aria-pressed={servingMode === mode} onClick={() => handleServingMode(mode)} className={`rounded px-2 py-1 text-[9px] font-bold transition ${servingMode === mode ? 'bg-cyan-500 text-white shadow-sm' : disabled ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label={t('moeTransport')}>
                <span className="px-1 text-[8px] font-semibold text-slate-500 sm:text-[9px]">{t('moeTransport')}</span>
                {[
                  ['tokenA2a', 'tokenA2aTransport'],
                  ['dwdp', 'dwdpTransport'],
                ].map(([transport, labelKey]) => {
                  const disabled = transport === 'dwdp' && !dwdpModeAvailable;
                  return (
                    <button
                      key={transport}
                      data-testid={`moe-transport-${transport}`}
                      type="button"
                      disabled={disabled}
                      aria-pressed={moeTransport === transport}
                      title={disabled ? t('dwdpBoundary') : undefined}
                      onClick={() => handleMoeTransport(transport)}
                      className={`rounded px-2 py-1 text-[9px] font-bold transition ${moeTransport === transport ? transport === 'dwdp' ? 'bg-orange-500 text-white shadow-sm' : 'bg-pink-500 text-white shadow-sm' : disabled ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="w-full border-t border-slate-100 pt-2 text-left text-[9px] leading-relaxed text-slate-500" data-testid="runtime-control-hint">
              {t(moeTransport === 'dwdp' ? 'dwdpHint' : componentProfile === 'wideEp' ? 'wideEpHint' : componentProfile === 'helix' ? 'helixHint' : attentionMode === 'dpAttention' ? 'dpAttentionHint' : servingMode === 'pdDisaggregated' ? 'pdSymmetricHint' : 'clusterHintBold')}
            </span>
          </div>
          <div className="col-span-2 md:col-span-3 xl:col-span-6 flex items-start gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-500 shadow-sm" data-testid="mapping-assumption-panel">
            <Info size={14} className="shrink-0 text-blue-500" />
            <span>
              <strong>{t(mappingModel === 'dcpReuse' ? 'dcpHintTitle' : 'clusterHintTitle')}</strong>{' '}
              {t(mappingModel === 'dcpReuse' ? 'dcpHintDesc' : 'clusterHintDesc')}
              {' '}<strong>{t('clusterHintBold')}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2 lg:grid-cols-12 lg:items-stretch xl:gap-5">
          
          <div className="flex flex-col lg:col-span-7 xl:col-span-8" data-testid="logical-canvas-column">
             {renderLogicalView()}
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-5 xl:col-span-4" data-testid="gpu-map-column">
             <div className="mb-3 flex items-center justify-between gap-2">
               <h3 className="flex items-center gap-1.5 text-sm font-bold leading-tight text-slate-800 md:text-base">
                 <ServerIcon className="text-emerald-500" />
                 {t(servingMode === 'pdDisaggregated' ? 'physGpuMapPd' : mappingModel === 'dcpReuse' ? 'physGpuMapDcp' : 'physGpuMap')} ({totalGpus} {t('cards')})
               </h3>
               {totalGpus === 1 && <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">{t('singleCard')}</span>}
             </div>
             
             <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] place-content-start gap-2 align-top" data-testid="gpu-card-grid">
               {servingMode === 'pdDisaggregated' ? (
                 <>
                   <div className="col-span-full flex items-center gap-2 border-b border-cyan-100 pb-1 text-[9px] font-bold text-cyan-700">
                     <span>{t('prefillPool')}</span><span className="font-normal text-slate-400">{instanceGpus} GPU</span>
                   </div>
                   {Array.from({ length: instanceGpus }).map((_, i) => renderGpuCard(i))}
                   <div className="col-span-full mt-2 flex items-center gap-2 border-b border-purple-100 pb-1 text-[9px] font-bold text-purple-700">
                     <span>{t('decodePool')}</span><span className="font-normal text-slate-400">{instanceGpus} GPU</span>
                   </div>
                   {Array.from({ length: instanceGpus }).map((_, i) => renderGpuCard(instanceGpus + i))}
                 </>
               ) : (
                 Array.from({ length: totalGpus }).map((_, i) => renderGpuCard(i))
               )}
             </div>
             
             {totalGpus < MAX_GPUS && (
               <p className="mt-3 border-t border-dashed border-slate-200 pt-2 text-center text-[9px] text-slate-400">
                 {t('expand')} {totalGpus}/{MAX_GPUS})
               </p>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

const ServerIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

export default App;
