import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Code,
  Cpu,
  Database,
  EyeOff,
  Globe,
  Info,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import {
  DEFAULT_FLASH_CONFIG,
  FLASH_VERSIONS,
  deriveFlashSnapshot,
  normalizeFlashConfig,
} from './flash-attention/model';

const i18n = {
  zh: {
    title: 'FlashAttention',
    subtitle: '从标准 Softmax 到 V1–V4：观察显存流量、片上分块与内核流水线',
    standard: '标准 Softmax',
    flash: 'FlashAttention',
    forward: '前向',
    backward: '反向',
    causal: '因果掩码',
    nonCausal: '双向 Attention',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    replay: '重播',
    next: '下一步',
    language: 'EN',
    versionFamily: '实现版本',
    execution: '执行方向',
    canvasTitle: '内存层级与分块执行',
    sequenceLength: '序列长度',
    headDim: '头维度',
    dtype: '数据类型',
    hardware: '目标硬件',
    architecture: '执行架构',
    hbm: 'HBM · 全局显存',
    onChip: '片上工作区与计算单元',
    transfer: '数据搬运',
    readTile: '读取 tile',
    writeBack: '写回结果',
    fullTensor: '完整张量',
    logicalIntermediate: '逻辑中间量',
    hbmAddressSpace: '全局显存地址空间',
    inputOutputTensors: '输入 / 输出张量',
    quadraticWorkspace: '二次方中间工作区',
    workspaceHint: '颜色块表示已经写入的显存区域；发光边框表示当前正在读写。',
    fullMatrixLegend: '统一颜色表示逻辑完整矩阵；底层 GEMM kernel 仍可能做物理分块。',
    tileColorLegend: '同色与相同编号表示同一个代表性 HBM tile；发光边框表示当前片上副本。',
    currentTile: '当前 tile',
    tileOnly: '只在片上短暂存在的 tile',
    noHbmAllocation: 'HBM 分配：0 B',
    hbmInputs: '完整输入张量',
    hbmOutputs: '输出与在线统计量',
    backwardInputs: '反向输入与前向保存量',
    gradientOutputs: '梯度输出',
    savedForwardIntermediates: '前向保存的二次方中间量',
    backwardTileLegend: 'Q 行相关张量使用 q tile；K/V 与对应梯度使用 kv tile。相同编号和颜色表示同一代表性分块。',
    noQuadraticWorkspace: '没有完整的二次方中间工作区',
    noQuadraticWorkspaceDesc: 'Score 与 probability 只作为当前 tile 在片上生成、使用并释放，不占用全局显存地址。',
    activeTilePair: '当前片上 tile 对',
    versionResources: '该版本的片上资源',
    stage_v1LoadKv: 'KV tile 进入 SMEM',
    stage_v1ReloadState: '重载 Q / O / 在线统计量',
    stage_v1Score: 'Tensor Core 计算 score tile',
    stage_v1OnlineUpdate: '在线 Softmax 与 O 累加',
    stage_v1WriteState: '写回 O / 在线统计量并推进 Q',
    stage_v2Assign: 'CTA 持有 Q 行',
    stage_v2Stream: 'KV tile 流式进入 CTA',
    stage_v2SplitQ: 'Split-Q warp 计算 score',
    stage_v2OnlineUpdate: '各 warp 独立更新 O 行',
    stage_v2Commit: '提交 O / LSE',
    stage_v2AssignKv: 'KV-column CTA 调度',
    stage_v3Producer: 'TMA producer 双缓冲预取',
    stage_v3Score: 'WGMMA score consumers',
    stage_v3Softmax: 'Softmax warpgroup',
    stage_v3Output: 'WGMMA output consumer',
    stage_v3Commit: 'TMA 提交 O / LSE',
    stage_v3ProducerBwd: 'TMA 预取反向 tile',
    stage_v4High: '高位 Q tile 流水线',
    stage_v4Low: '低位 Q tile 流水线',
    stage_v4Correction: '条件重缩放 correction WG',
    stage_v4Recompute: '转置布局重建 S / P',
    stage_v4Tmem: 'TMEM 别名工作区',
    stage_v4PreviousGrad: '前一 tile 梯度 MMA',
    stage_v4Cluster: '2-CTA MMA 与 DSMEM',
    stage_bwdLoad: '加载反向输入',
    stage_bwdRecompute: '重建 score / probability',
    stage_bwdGradMma: '梯度矩阵乘',
    stage_bwdSoftmax: 'Softmax 梯度',
    stage_bwdCommit: '归约并提交梯度',
    status_pending: '尚未生成',
    status_producing: '片上生成中',
    status_buffered: '等待写入 HBM',
    status_writing: '正在写入 HBM',
    status_ready: '完整驻留',
    status_reading: '正在从 HBM 读取',
    status_consumed: '已被下游读取',
    scoreKernel: 'Score GEMM kernel',
    softmaxKernel: '逐行 Softmax kernel',
    outputKernel: 'Output GEMM kernel',
    standardBwdLoad: '加载完整矩阵与保存量',
    standardBwdValueGrad: 'Value / probability 梯度',
    standardBwdSoftmax: '逐行 Softmax backward',
    standardBwdProjectionGrad: 'Q/K 梯度与 HBM 写回',
    scoreRow: '当前 S 行 · logits',
    probabilityRow: '当前 P 行 · 概率',
    softmaxMechanism: '从 HBM 读取一行 S，依次完成 max → exp → sum → normalize，再将一行 P 写回 HBM。',
    waitingForScores: '等待完整 S 写入 HBM',
    notMaterialized: '不在 HBM 物化',
    materialized: '在 HBM 物化',
    currentOperation: '当前操作',
    idle: '等待执行',
    done: '执行完成',
    maskNone: '完整计算',
    maskPartial: '局部因果掩码',
    maskSkip: '跳过未来 KV tile',
    representativeTile: '代表性 tile',
    outerLoop: '外循环',
    innerLoop: '内循环',
    outerKV: 'KV tile：K/V 只加载一次，遍历 Q tile',
    innerQ: 'Q tile：反复读取并更新输出与在线统计量',
    outerQ: 'Q tile / CTA：Q 与 O 在片上保持',
    innerKV: 'KV tile：K/V 依次流入',
    outerQPair: '高位 / 低位 Q tile 对：交替推进',
    innerAsync: 'KV stage：异步 MMA、Softmax 与修正重叠',
    standardLoop: '三个独立 kernel 顺序执行并经过 HBM',
    standardBackwardLoop: '从 HBM 读取前向保存量，依次执行 dV、dP、Softmax backward、dQ 与 dK kernel',
    bwdOuterV1: 'Q/KV tile 对：由 LSE 重算 score 与 probability',
    bwdInnerV1: '梯度 tile：分别累加 dQ、dK 与 dV',
    bwdOuterV2: 'KV tile / CTA：持有 dK、dV 局部累加器',
    bwdInnerV2: 'Q tile：流式进入并将局部 dQ 原子累加到 HBM',
    bwdOuterV3: 'TMA backward tile：双缓冲搬运输入与保存量',
    bwdInnerV3: 'WGMMA / Softmax warpgroups：重算并交错生成梯度',
    bwdOuterV4: '2-CTA cluster：协作处理一个反向 tile 对',
    bwdInnerV4: 'TMEM / DSMEM：复用转置中间量并归约梯度',
    trafficTitle: '前向 HBM 流量模型',
    trafficCurrent: '当前累计',
    trafficTotal: '全程估算',
    standardBaseline: '标准 Softmax',
    selectedImplementation: '当前实现',
    trafficAssumption: '模型假设：单个 batch/head，Q/K/V/O 为 2 字节；未融合标准实现的 S/P 以 FP32 物化。数值为算法级估算，不冒充特定 kernel profiler 结果。',
    materializedMetric: 'HBM 中的二次方中间量',
    onChipMetric: '代表性片上 live set',
    tilePairsMetric: '执行 / 跳过 tile 对',
    standardHbmPasses: 'S / P 的 HBM 读写阶段',
    standardHbmPassesDetail: '写 S、读 S、写 P、读 P',
    standardMmas: '矩阵乘 kernel',
    standardMmasDetail: 'Score GEMM 与 Output GEMM',
    bottleneckMetric: '这一代的主要矛盾',
    mmaMetric: '每个有效 tile 的 MMA',
    recomputeMetric: '反向重计算 S / P',
    savedMetric: '跨前反向保存',
    scheduleMetric: '反向组织方式',
    yes: '是',
    no: '否',
    savedStandard: 'P 与 Q/K/V；S 已物化但反向不依赖',
    savedFlash: 'O 与逐行 LSE，不保存完整 S/P',
    scheduleStandard: '独立梯度 kernel',
    scheduleV1: '分块重计算与梯度累加',
    scheduleV2: 'KV-column CTA + dQ 原子累加',
    scheduleV3: 'TMA / WGMMA warp specialization',
    scheduleV4: 'TMEM + 2-CTA MMA + DSMEM',
    pipelineTitle: '真实计算流水线',
    pipelineHint: '横向位置代表时间；不同泳道的重叠表示并行执行。当前步骤只高亮一个可检查操作。',
    implementationTitle: '内核级执行证据',
    implementationTag: 'engine pseudocode',
    inspectorTitle: '当前版本的设计差异',
    commonBackbone: '共同数学骨架',
    commonBackboneDesc: 'V1–V4 都计算精确 Attention。版本升级没有改变输出定义，改变的是循环顺序、工作划分、片上驻留和流水线调度。',
    observe: '画布观察点',
    boundary: '能力边界',
    currentStage: '当前阶段',
    variables: '实时维度',
    exactAttention: '精确 Attention，不是近似算法',
    standardBoundary: '这里的 Standard 是教学用未融合三-kernel 基线；现代框架可能自动选择融合 SDPA，因此不能把该流量当成所有标准 API 的实际表现。',
    v1Summary: 'V1：用分块与在线 Softmax 消除完整 S/P 的 HBM 物化。',
    v1Observe: '注意 KV 外循环：每个 K/V tile 只加载一次，但输出与在线统计量会随不同 KV tile 反复从 HBM 取回和写回。',
    v1Boundary: '展示前向 Algorithm 1 的数据依赖；具体 block size 与寄存器分配取决于 kernel 和 GPU。',
    v2Summary: 'V2：重排循环与 GPU 工作划分，让长序列也能产生足够 CTA，并以 split-Q 避免 warp 间归约。',
    v2Observe: 'Q tile 由 CTA 持有，K/V 逐块流入；每个 warp 拥有不同 Q 行和对应 O 行，不再合并 split-K 的部分输出。',
    v2Boundary: '核心优化面向 A100 级执行模型；流量接近 V1 并不意味着吞吐相同。V2 的主要收益来自占用率、非矩阵 FLOPs 与通信。',
    v3Summary: 'V3：利用 Hopper 的 TMA、WGMMA 与 warp specialization，把搬运、矩阵乘和 Softmax 交叠。',
    v3Observe: 'TMA 为下一 tile 预取时，WGMMA 与 Softmax 在其他 warpgroup 工作；流水线的重叠而非再次降低二次方中间内存构成主要提升。',
    v3Boundary: '默认显示 H100 BF16 路径；FP8 的 incoherent processing 是可选低精度路径，本画布不把它混入 BF16 主流程。',
    v4Summary: 'V4：针对 Blackwell 中 Tensor Core 快于指数单元和共享内存扩展的失衡，重新协同算法与 kernel 流水线。',
    v4Observe: '前向在高位/低位 Q tile 间 ping-pong，Softmax warpgroups 错峰使用指数单元，correction warpgroup 承担条件重缩放；反向使用 TMEM 与 2-CTA。',
    v4Boundary: '主流程锚定论文中的 B200 BF16 设计。官方 CuTeDSL 实现支持范围会演进，不能把这一张画布当作所有设备和 shape 的调度承诺。',
    bottleneck_v1: 'O / 统计量反复读写',
    bottleneck_v2: '占用率与非矩阵计算',
    bottleneck_v3: 'Softmax 与 WGMMA 的重叠',
    bottleneck_v4: '指数吞吐与共享内存流量',
    bottleneck_standard: '二次方中间量的 HBM 往返',
    storage_smem: '共享内存 tile',
    storage_register: '寄存器累加器',
    storage_tma: 'TMA producer',
    storage_wgmma: 'WGMMA consumer',
    storage_tmem: 'Tensor Memory',
    storage_umma: '全异步 UMMA',
    storage_correction: 'Correction warpgroup',
    storage_splitq: 'Split-Q warp slices',
    storage_fulls: '完整 Score S',
    storage_fullp: '完整 Probability P',
    storage_grad: '梯度累加工作区',
    lane_hbm: 'HBM / 搬运',
    lane_tensor: 'Tensor Core',
    lane_cuda: 'CUDA / Softmax',
    lane_cta: 'CTA 调度',
    lane_producer: 'TMA producer',
    lane_wgmmaA: 'WGMMA · QK',
    lane_softmax: 'Softmax warpgroup',
    lane_wgmmaB: 'WGMMA · PV/Grad',
    lane_umma: 'UMMA / TMEM',
    lane_softmaxH: 'Softmax · 高位 Q tile',
    lane_softmaxL: 'Softmax · 低位 Q tile',
    lane_correction: '条件修正',
    lane_tmem: 'TMEM',
    lane_cluster: 'CTA cluster / DSMEM',
    op_dispatch: '调度 Q/K/V',
    op_qk: 'Score GEMM',
    op_writeS: '写回 S',
    op_readS: '从 HBM 读取 S',
    op_softmax: '逐行计算 Softmax',
    op_writeP: '写回 P',
    op_readP: '从 HBM 读取 P',
    op_pv: 'PV GEMM',
    op_writeO: '写回 O',
    op_loadSaved: '读取保存的中间量',
    op_dv: 'dV GEMM',
    op_dp: 'dP GEMM',
    op_softmaxBwd: 'Softmax backward',
    op_dq: 'dQ GEMM',
    op_dk: 'dK GEMM',
    op_writeGrads: '写回梯度',
    op_loadKV: '加载当前 K / V tile',
    op_loadQState: '读取当前 Q / 输出 / 在线统计量',
    op_onlineSoftmax: '在线 Softmax 与重缩放',
    op_writeState: '写回输出与在线统计量',
    op_nextQ: '推进下一个 Q tile',
    op_loadBackward: '加载 Q/K/V/O/dO/LSE',
    op_recomputeS: '重计算 S',
    op_recomputeP: '由 LSE 重建 P',
    op_dvdk: '计算 dV / dK',
    op_atomicGrad: '累加并写回梯度',
    op_assignQ: '分配 Q-row CTA',
    op_splitQQK: 'Split-Q：各 warp 计算 score',
    op_leanSoftmax: '少重缩放的在线 Softmax',
    op_splitQPV: '各 warp 独立更新 O 行',
    op_nextKV: '流入下一个 KV tile',
    op_writeOLSE: '写回 O 与 LSE',
    op_assignKV: '分配 KV-column CTA',
    op_gradMma: '五个分块 MMA 链',
    op_atomicDQ: '原子累加 dQ',
    op_writeGrad: '写回 dK / dV',
    op_tmaKV0: 'TMA 预取 KV tile 0',
    op_wgmmaQK0: 'WGMMA score tile 0',
    op_tmaKV1: 'TMA 预取 KV tile 1',
    op_softmax0: 'Softmax tile 0',
    op_wgmmaPV0: 'WGMMA output tile 0',
    op_wgmmaQK1: 'WGMMA score tile 1',
    op_softmax1: 'Softmax tile 1',
    op_commitO: '提交 O / LSE',
    op_tmaBackward: 'TMA 预取反向输入',
    op_recomputeWgmma: 'WGMMA 重计算 S',
    op_recomputeSoftmax: '重建 P',
    op_gradWgmma0: '第一组梯度 WGMMA',
    op_gradSoftmax: '计算 dS',
    op_gradWgmma1: '第二组梯度 WGMMA',
    op_commitGrad: '提交梯度',
    op_ummaQKH: '高位 Q tile 的 score UMMA',
    op_softmaxH: '高位 Q tile Softmax / Exp',
    op_ummaQKL: '低位 Q tile 的 score UMMA',
    op_softmaxL: '低位 Q tile Softmax / Exp',
    op_ummaPVH: '高位 Q tile 的 output UMMA',
    op_correctH: '条件修正高位输出',
    op_ummaPVL: '低位 Q tile 的 output UMMA',
    op_correctL: '条件修正低位输出',
    op_recomputeTranspose: '重计算转置后的 S / P',
    op_storeTmem: 'S/P 写入 TMEM 布局',
    op_softmaxTile: '计算 P 与 dS 元素操作',
    op_gradPrevious: '发射前一 tile 的 dK/dQ MMA',
    op_twoCtaMma: '2-CTA 协作 MMA',
    op_dsmemExchange: 'DSMEM 交换 dS 分片',
    op_reduceGrad: 'TMEM 归约并提交梯度',
  },
  en: {
    title: 'FlashAttention',
    subtitle: 'From Standard Softmax to V1–V4: global-memory traffic, on-chip tiling, and kernel pipelines',
    standard: 'Standard Softmax',
    flash: 'FlashAttention',
    forward: 'Forward',
    backward: 'Backward',
    causal: 'Causal mask',
    nonCausal: 'Bidirectional attention',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    next: 'Next',
    language: '中文',
    versionFamily: 'Implementation version',
    execution: 'Execution direction',
    canvasTitle: 'Memory hierarchy and tiled execution',
    sequenceLength: 'Sequence length',
    headDim: 'Head dimension',
    dtype: 'Data type',
    hardware: 'Target hardware',
    architecture: 'Execution architecture',
    hbm: 'HBM · global memory',
    onChip: 'On-chip workspace and compute units',
    transfer: 'Data movement',
    readTile: 'Read tile',
    writeBack: 'Write result',
    fullTensor: 'Full tensor',
    logicalIntermediate: 'Logical intermediate',
    hbmAddressSpace: 'Global-memory address space',
    inputOutputTensors: 'Input / output tensors',
    quadraticWorkspace: 'Quadratic intermediate workspace',
    workspaceHint: 'Colored cells are written HBM regions; a glowing border marks the current read or write.',
    fullMatrixLegend: 'One color denotes one logical full matrix; the underlying GEMM kernel may still tile physically.',
    tileColorLegend: 'Matching color and index denote the same representative HBM tile; a glowing border marks its current on-chip copy.',
    currentTile: 'Current tile',
    tileOnly: 'Tile exists transiently on chip only',
    noHbmAllocation: 'HBM allocation: 0 B',
    hbmInputs: 'Full input tensors',
    hbmOutputs: 'Output and online statistics',
    backwardInputs: 'Backward inputs and saved forward state',
    gradientOutputs: 'Gradient outputs',
    savedForwardIntermediates: 'Quadratic intermediates saved from forward',
    backwardTileLegend: 'Q-row tensors use the q tile; K/V and their gradients use the kv tile. Matching index and color denote the same representative tile.',
    noQuadraticWorkspace: 'No full quadratic intermediate workspace',
    noQuadraticWorkspaceDesc: 'Score and probability exist only as the current on-chip tile; they are generated, consumed, and released without a global-memory address range.',
    activeTilePair: 'Current on-chip tile pair',
    versionResources: 'On-chip resources in this version',
    stage_v1LoadKv: 'Stage KV tile into SMEM',
    stage_v1ReloadState: 'Reload Q / O / online statistics',
    stage_v1Score: 'Tensor Core score tile',
    stage_v1OnlineUpdate: 'Online softmax and O accumulation',
    stage_v1WriteState: 'Store O / online stats and advance Q',
    stage_v2Assign: 'CTA owns Q rows',
    stage_v2Stream: 'Stream KV tiles through the CTA',
    stage_v2SplitQ: 'Split-Q warps compute scores',
    stage_v2OnlineUpdate: 'Each warp updates its O rows',
    stage_v2Commit: 'Commit O / LSE',
    stage_v2AssignKv: 'Schedule KV-column CTA',
    stage_v3Producer: 'TMA producer double-buffered prefetch',
    stage_v3Score: 'WGMMA score consumers',
    stage_v3Softmax: 'Softmax warpgroup',
    stage_v3Output: 'WGMMA output consumer',
    stage_v3Commit: 'TMA commit O / LSE',
    stage_v3ProducerBwd: 'TMA prefetch backward tiles',
    stage_v4High: 'High-Q tile pipeline',
    stage_v4Low: 'Low-Q tile pipeline',
    stage_v4Correction: 'Conditional rescale correction WG',
    stage_v4Recompute: 'Rebuild S / P in transposed layout',
    stage_v4Tmem: 'TMEM aliased workspace',
    stage_v4PreviousGrad: 'Previous-tile gradient MMA',
    stage_v4Cluster: '2-CTA MMA and DSMEM',
    stage_bwdLoad: 'Load backward inputs',
    stage_bwdRecompute: 'Rebuild scores / probabilities',
    stage_bwdGradMma: 'Gradient matrix multiplies',
    stage_bwdSoftmax: 'Softmax gradient',
    stage_bwdCommit: 'Reduce and commit gradients',
    status_pending: 'Not generated',
    status_producing: 'Producing on chip',
    status_buffered: 'Waiting for HBM store',
    status_writing: 'Writing to HBM',
    status_ready: 'Fully resident',
    status_reading: 'Reading from HBM',
    status_consumed: 'Consumed downstream',
    scoreKernel: 'Score GEMM kernel',
    softmaxKernel: 'Row-wise Softmax kernel',
    outputKernel: 'Output GEMM kernel',
    standardBwdLoad: 'Load full matrices and saved state',
    standardBwdValueGrad: 'Value / probability gradients',
    standardBwdSoftmax: 'Row-wise softmax backward',
    standardBwdProjectionGrad: 'Q/K gradients and HBM write-back',
    scoreRow: 'Current S row · logits',
    probabilityRow: 'Current P row · probabilities',
    softmaxMechanism: 'Read one row of S from HBM, run max → exp → sum → normalize, then write one row of P back to HBM.',
    waitingForScores: 'Waiting for the full S matrix in HBM',
    notMaterialized: 'Not materialized in HBM',
    materialized: 'Materialized in HBM',
    currentOperation: 'Current operation',
    idle: 'Ready',
    done: 'Execution complete',
    maskNone: 'Full compute',
    maskPartial: 'Partial causal mask',
    maskSkip: 'Skip future KV tile',
    representativeTile: 'Representative tile',
    outerLoop: 'Outer loop',
    innerLoop: 'Inner loop',
    outerKV: 'KV tile: load K/V once, then visit Q tiles',
    innerQ: 'Q tile: repeatedly reload and update output plus online statistics',
    outerQ: 'Q tile / CTA: keep Q and O on chip',
    innerKV: 'KV tile: stream K/V through the CTA',
    outerQPair: 'High / low Q tile pair: alternate progress',
    innerAsync: 'KV stage: overlap asynchronous MMA, softmax, and correction',
    standardLoop: 'Three separate kernels execute sequentially through HBM',
    standardBackwardLoop: 'Read forward-saved state from HBM, then run dV, dP, softmax-backward, dQ, and dK kernels in sequence',
    bwdOuterV1: 'Q/KV tile pair: recompute scores and probabilities from LSE',
    bwdInnerV1: 'Gradient tile: accumulate dQ, dK, and dV separately',
    bwdOuterV2: 'KV tile / CTA: retain local dK and dV accumulators',
    bwdInnerV2: 'Q tile: stream through and atomically accumulate partial dQ to HBM',
    bwdOuterV3: 'TMA backward tile: double-buffer inputs and saved state',
    bwdInnerV3: 'WGMMA / softmax warpgroups: overlap recomputation and gradient work',
    bwdOuterV4: '2-CTA cluster: cooperate on one backward tile pair',
    bwdInnerV4: 'TMEM / DSMEM: reuse transposed intermediates and reduce gradients',
    trafficTitle: 'Forward HBM traffic model',
    trafficCurrent: 'Current cumulative',
    trafficTotal: 'Full-run estimate',
    standardBaseline: 'Standard Softmax',
    selectedImplementation: 'Selected implementation',
    trafficAssumption: 'Model assumptions: one batch/head; Q/K/V/O use 2-byte elements; the unfused baseline materializes S/P in FP32. These are algorithm-level estimates, not profiler results for a specific kernel.',
    materializedMetric: 'Quadratic intermediates in HBM',
    onChipMetric: 'Representative on-chip live set',
    tilePairsMetric: 'Executed / skipped tile pairs',
    standardHbmPasses: 'HBM phases for S / P',
    standardHbmPassesDetail: 'write S, read S, write P, read P',
    standardMmas: 'Matrix-multiply kernels',
    standardMmasDetail: 'Score GEMM and output GEMM',
    bottleneckMetric: 'Primary issue in this generation',
    mmaMetric: 'MMAs per active tile',
    recomputeMetric: 'Recompute S / P in backward',
    savedMetric: 'Saved across forward/backward',
    scheduleMetric: 'Backward organization',
    yes: 'Yes',
    no: 'No',
    savedStandard: 'P and Q/K/V; S is materialized but not needed by backward',
    savedFlash: 'O and row-wise LSE; no full S/P',
    scheduleStandard: 'Separate gradient kernels',
    scheduleV1: 'Tiled recompute and gradient accumulation',
    scheduleV2: 'KV-column CTA + atomic dQ',
    scheduleV3: 'TMA / WGMMA warp specialization',
    scheduleV4: 'TMEM + 2-CTA MMA + DSMEM',
    pipelineTitle: 'Real compute pipeline',
    pipelineHint: 'Horizontal position is time; overlap across lanes means concurrent work. One inspectable operation is highlighted at each step.',
    implementationTitle: 'Kernel-level implementation evidence',
    implementationTag: 'engine pseudocode',
    inspectorTitle: 'Design difference in the selected version',
    commonBackbone: 'Shared mathematical backbone',
    commonBackboneDesc: 'V1–V4 all compute exact attention. The output definition is unchanged; loop order, work partitioning, on-chip residency, and pipeline scheduling evolve.',
    observe: 'What to observe',
    boundary: 'Capability boundary',
    currentStage: 'Current stage',
    variables: 'Live dimensions',
    exactAttention: 'Exact attention, not an approximation',
    standardBoundary: 'Standard here is an educational unfused three-kernel baseline. Modern frameworks may dispatch fused SDPA, so this traffic must not be read as the behavior of every standard API.',
    v1Summary: 'V1: tiling and online softmax remove full S/P materialization in HBM.',
    v1Observe: 'Notice the KV outer loop: each K/V tile is loaded once, while output and online statistics are repeatedly reloaded and written for different KV tiles.',
    v1Boundary: 'The canvas follows the forward Algorithm 1 dependency order. Exact block sizes and register allocation depend on the kernel and GPU.',
    v2Summary: 'V2: reordered loops and GPU work partitioning create enough CTAs for long sequences and use split-Q to avoid warp reductions.',
    v2Observe: 'A CTA owns a Q tile while K/V stream through it. Each warp owns distinct Q rows and matching O rows, so split-K partial outputs do not need merging.',
    v2Boundary: 'The key design targets an A100-class execution model. Similar HBM bytes do not imply similar throughput: occupancy, non-matmul FLOPs, and communication drive the gain.',
    v3Summary: 'V3: Hopper TMA, WGMMA, and warp specialization overlap movement, matmul, and softmax.',
    v3Observe: 'While TMA prefetches the next tile, WGMMA and softmax execute in other warpgroups. Pipeline overlap—not another reduction in quadratic intermediate memory—is the main advance.',
    v3Boundary: 'The default view is the H100 BF16 path. FP8 incoherent processing is an optional low-precision path and is not mixed into the BF16 main flow here.',
    v4Summary: 'V4: algorithm/kernel co-design addresses Blackwell scaling where tensor cores outpace exponent units and shared-memory bandwidth.',
    v4Observe: 'Forward ping-pongs high/low Q tiles, staggers softmax warpgroups on the exponent units, and delegates conditional rescaling to a correction warpgroup; backward uses TMEM and 2-CTA.',
    v4Boundary: 'The main flow is anchored to the paper’s B200 BF16 design. Official CuTeDSL support evolves, so this canvas is not a scheduling promise for every device and shape.',
    bottleneck_v1: 'Repeated O / statistics traffic',
    bottleneck_v2: 'Occupancy and non-matmul work',
    bottleneck_v3: 'Overlapping softmax with WGMMA',
    bottleneck_v4: 'Exponent throughput and SMEM traffic',
    bottleneck_standard: 'HBM round-trips for quadratic intermediates',
    storage_smem: 'Shared-memory tiles',
    storage_register: 'Register accumulators',
    storage_tma: 'TMA producer',
    storage_wgmma: 'WGMMA consumers',
    storage_tmem: 'Tensor Memory',
    storage_umma: 'Fully asynchronous UMMA',
    storage_correction: 'Correction warpgroup',
    storage_splitq: 'Split-Q warp slices',
    storage_fulls: 'Full score S',
    storage_fullp: 'Full probability P',
    storage_grad: 'Gradient accumulation workspace',
    lane_hbm: 'HBM / movement',
    lane_tensor: 'Tensor Core',
    lane_cuda: 'CUDA / softmax',
    lane_cta: 'CTA scheduler',
    lane_producer: 'TMA producer',
    lane_wgmmaA: 'WGMMA · QK',
    lane_softmax: 'Softmax warpgroup',
    lane_wgmmaB: 'WGMMA · PV/Grad',
    lane_umma: 'UMMA / TMEM',
    lane_softmaxH: 'Softmax · high Q tile',
    lane_softmaxL: 'Softmax · low Q tile',
    lane_correction: 'Conditional correction',
    lane_tmem: 'TMEM',
    lane_cluster: 'CTA cluster / DSMEM',
    op_dispatch: 'Dispatch Q/K/V',
    op_qk: 'Score GEMM',
    op_writeS: 'Write S',
    op_readS: 'Read S from HBM',
    op_softmax: 'Run row-wise Softmax',
    op_writeP: 'Write P',
    op_readP: 'Read P from HBM',
    op_pv: 'PV GEMM',
    op_writeO: 'Write O',
    op_loadSaved: 'Load saved intermediates',
    op_dv: 'dV GEMM',
    op_dp: 'dP GEMM',
    op_softmaxBwd: 'Softmax backward',
    op_dq: 'dQ GEMM',
    op_dk: 'dK GEMM',
    op_writeGrads: 'Write gradients',
    op_loadKV: 'Load current K / V tile',
    op_loadQState: 'Load current Q / output / online statistics',
    op_onlineSoftmax: 'Online softmax and rescale',
    op_writeState: 'Write output and online statistics',
    op_nextQ: 'Advance to next Q tile',
    op_loadBackward: 'Load Q/K/V/O/dO/LSE',
    op_recomputeS: 'Recompute S',
    op_recomputeP: 'Rebuild P from LSE',
    op_dvdk: 'Compute dV / dK',
    op_atomicGrad: 'Accumulate and write gradients',
    op_assignQ: 'Assign a Q-row CTA',
    op_splitQQK: 'Split-Q: warps compute scores',
    op_leanSoftmax: 'Online softmax with fewer rescales',
    op_splitQPV: 'Warps update independent O rows',
    op_nextKV: 'Stream the next KV tile',
    op_writeOLSE: 'Write O and LSE',
    op_assignKV: 'Assign a KV-column CTA',
    op_gradMma: 'Five tiled MMA chain',
    op_atomicDQ: 'Atomically accumulate dQ',
    op_writeGrad: 'Write dK / dV',
    op_tmaKV0: 'TMA prefetch KV tile 0',
    op_wgmmaQK0: 'WGMMA score tile 0',
    op_tmaKV1: 'TMA prefetch KV tile 1',
    op_softmax0: 'Softmax tile 0',
    op_wgmmaPV0: 'WGMMA output tile 0',
    op_wgmmaQK1: 'WGMMA score tile 1',
    op_softmax1: 'Softmax tile 1',
    op_commitO: 'Commit O / LSE',
    op_tmaBackward: 'TMA prefetch backward inputs',
    op_recomputeWgmma: 'WGMMA recompute S',
    op_recomputeSoftmax: 'Rebuild P',
    op_gradWgmma0: 'First gradient WGMMA group',
    op_gradSoftmax: 'Compute dS',
    op_gradWgmma1: 'Second gradient WGMMA group',
    op_commitGrad: 'Commit gradients',
    op_ummaQKH: 'Score UMMA for high Q tile',
    op_softmaxH: 'High Q tile softmax / exp',
    op_ummaQKL: 'Score UMMA for low Q tile',
    op_softmaxL: 'Low Q tile softmax / exp',
    op_ummaPVH: 'Output UMMA for high Q tile',
    op_correctH: 'Conditionally correct high output',
    op_ummaPVL: 'Output UMMA for low Q tile',
    op_correctL: 'Conditionally correct low output',
    op_recomputeTranspose: 'Recompute transposed S / P',
    op_storeTmem: 'Store S/P in TMEM layout',
    op_softmaxTile: 'Compute P and dS elementwise',
    op_gradPrevious: 'Issue dK/dQ MMA for prior tile',
    op_twoCtaMma: '2-CTA cooperative MMA',
    op_dsmemExchange: 'Exchange dS shards through DSMEM',
    op_reduceGrad: 'Reduce in TMEM and commit gradients',
  },
};

const CODE_BY_OPERATION = {
  dispatch: 'dispatch(q, k, v)', qk: 'S = gemm(Q, K.T)', writeS: 'hbm.store(S)', readS: 'S_row = hbm.load(S[row])', softmax: 'P_row = row_softmax(S_row)', writeP: 'hbm.store(P_row)', readP: 'P_tile = hbm.load(P[tile])', pv: 'O = gemm(P_tile, V)', writeO: 'hbm.store(O)',
  loadSaved: 'Q, K, V, P, dO = hbm.load(saved_inputs)', dv: 'dV = gemm(P.T, dO)', dp: 'dP = gemm(dO, V.T)', softmaxBwd: 'dS = softmax_backward(dP, P)', dq: 'dQ = gemm(dS, K)', dk: 'dK = gemm(dS.T, Q)', writeGrads: 'hbm.store(dQ, dK, dV)',
  loadKV: 'smem.stage(K[j], V[j])', loadQState: 'Q_i, O_i, m_i, l_i = hbm.load(i)', onlineSoftmax: 'O_i, m_i, l_i = online_softmax_update(...)', writeState: 'hbm.store(O_i, m_i, l_i)', nextQ: 'i = scheduler.next_q_tile()',
  loadBackward: 'stage(Q, K, V, O, dO, LSE)', recomputeS: 'S = mma(Q, K.T)', recomputeP: 'P = exp(S - LSE)', dvdk: 'dV, dK = tiled_grad_mma(P, dO, dS, Q)', atomicGrad: 'atomic_add(dQ); store(dK, dV)',
  assignQ: 'cta = grid[batch, head, q_tile]', splitQQK: 'warp_rows = mma(Q_warp, K.T)', leanSoftmax: 'O_tilde, LSE = online_update_unscaled(...)', splitQPV: 'O_warp += mma(P_warp, V)', nextKV: 'pipeline.advance(kv_stage)', writeOLSE: 'hbm.store(O, LSE)',
  assignKV: 'cta = grid[batch, head, kv_tile]', gradMma: 'recompute_QK_then_run_5_mmas()', atomicDQ: 'atomic_add(global_dQ, partial_dQ)', writeGrad: 'hbm.store(dK, dV)',
  tmaKV0: 'producer.tma_load(kv_stage[0])', wgmmaQK0: 'consumer.wgmma(Q, K0.T)', tmaKV1: 'producer.tma_load(kv_stage[1])', softmax0: 'softmax_wg.update(S0)', wgmmaPV0: 'consumer.wgmma(P0, V0)', wgmmaQK1: 'consumer.wgmma(Q, K1.T)', softmax1: 'softmax_wg.update(S1)', commitO: 'tma_store(O, LSE)',
  tmaBackward: 'producer.tma_load(backward_tiles)', recomputeWgmma: 'wgmma(Q, K.T)  // recompute S', recomputeSoftmax: 'P = exp(S - LSE)', gradWgmma0: 'wgmma_group.run(dV, dP)', gradSoftmax: 'cuda_core.compute(dS)', gradWgmma1: 'wgmma_group.run(dQ, dK)', commitGrad: 'tma_store(dQ, dK, dV)',
  ummaQKH: 'umma_async(Q_high, K.T, tmem.S_high)', softmaxH: 'softmax_wg_high.exp_and_reduce(tmem.S_high)', ummaQKL: 'umma_async(Q_low, K.T, tmem.S_low)', softmaxL: 'softmax_wg_low.exp_and_reduce(tmem.S_low)', ummaPVH: 'umma_async(tmem.P_high, V, tmem.O_high)', correctH: 'correction_wg.conditional_rescale(O_high)', ummaPVL: 'umma_async(tmem.P_low, V, tmem.O_low)', correctL: 'correction_wg.conditional_rescale(O_low)',
  recomputeTranspose: 'umma_async(K, Q.T, tmem.S_T)', storeTmem: 'tmem.alias(S_T, P_T, dP_T, dS_T)', softmaxTile: 'cuda_core.compute(P_T, dS_T)', gradPrevious: 'umma_async(dK_prev, dQ_prev)', twoCtaMma: 'cluster.umma_2cta(operand_A, operand_B)', dsmemExchange: 'cluster.dsmem_exchange(dS_shard)', reduceGrad: 'tmem.reduce_and_store(gradients)',
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const tensorFormula = (name, n, d) => String.raw`${name}\in\mathbb{R}^{${n}\times ${d}}`;

function MetricCard({ label, value, detail, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-65">{label}</div>
      <div className="mt-1 text-base font-black md:text-lg">{value}</div>
      {detail && <div className="mt-1 text-[10px] leading-snug opacity-75">{detail}</div>}
    </div>
  );
}

function HbmMatrixCard({ name, state, sequenceLength, causal, bytes, t }) {
  const active = state.access === 'read' || state.access === 'write';
  const cells = 36;
  const filledCells = Math.round(cells * state.fill);
  const statusTone = state.access === 'read'
    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-[0_0_16px_rgba(99,102,241,0.28)]'
    : state.access === 'write'
      ? 'border-rose-400 bg-rose-50 text-rose-800 shadow-[0_0_16px_rgba(244,63,94,0.28)]'
      : state.fill === 1
        ? 'border-slate-300 bg-white text-slate-700'
        : 'border-dashed border-slate-300 bg-slate-50 text-slate-500';

  return (
    <div data-hbm-matrix={name} className={`rounded-xl border-2 p-3 transition ${statusTone}`} aria-label={`${name}: ${t(`status_${state.status}`)}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-black"><MathFormula>{name}</MathFormula><span className="text-[9px] font-medium opacity-55">FP32</span></div>
          <div className="mt-0.5 text-[8px] font-medium opacity-60"><MathFormula>{String.raw`${sequenceLength}\times ${sequenceLength}`}</MathFormula> · {formatBytes(bytes)}</div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[8px] font-black ${active ? 'bg-white' : 'bg-slate-100'}`}>{t(`status_${state.status}`)}</span>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1.5">
        {Array.from({ length: cells }, (_, index) => {
          const row = Math.floor(index / 6);
          const column = index % 6;
          const filled = index < filledCells;
          const masked = causal && column > row;
          const readingRow = state.access === 'read' && row === 3;
          const baseColor = name === 'S' ? 'bg-rose-400' : 'bg-emerald-400';
          return (
            <div
              key={index}
              className={`h-3 rounded-sm border transition-all ${!filled ? 'border-slate-200 bg-white' : masked ? 'border-slate-300 bg-slate-300' : `border-white/40 ${baseColor}`} ${readingRow ? 'ring-1 ring-indigo-600 ring-offset-1' : ''}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[8px] font-bold opacity-70">
        <span>{Math.round(state.fill * 100)}%</span>
        <span>{state.access === 'read' ? 'HBM → CUDA' : state.access === 'write' ? 'CUDA → HBM' : 'HBM'}</span>
      </div>
    </div>
  );
}

function StandardSoftmaxFlow({ snapshot, config, t }) {
  const operationId = snapshot.operation?.id;
  const currentIndex = snapshot.operation?.index ?? (snapshot.phase === 'done' ? snapshot.maxStep : -1);
  const operationIndex = (id) => snapshot.pipeline.operations.findIndex((operation) => operation.id === id);
  const stageClass = (ids, lastId) => {
    const active = ids.includes(operationId);
    const passed = snapshot.phase === 'done' || currentIndex > operationIndex(lastId);
    return active
      ? 'border-amber-300 bg-amber-400/15 shadow-[0_0_18px_rgba(251,191,36,0.28)] ring-2 ring-amber-300'
      : passed
        ? 'border-emerald-600 bg-emerald-500/10'
        : 'border-indigo-700 bg-indigo-900/70';
  };
  const scoresAvailable = snapshot.phase === 'done' || currentIndex >= operationIndex('readS');
  const probabilitiesAvailable = snapshot.phase === 'done' || currentIndex >= operationIndex('softmax');
  const scoreRow = config.causal
    ? String.raw`S_i=[1.2,\ 0.4,\ {-0.6},\ {-\infty}]`
    : String.raw`S_i=[1.2,\ 0.4,\ {-0.6},\ {-0.2}]`;
  const probabilityRow = config.causal
    ? String.raw`P_i=[0.62,\ 0.28,\ 0.10,\ 0.00]`
    : String.raw`P_i=[0.54,\ 0.24,\ 0.09,\ 0.13]`;

  return (
    <div className="grid gap-1.5 xl:grid-cols-[0.78fr_1.45fr_0.78fr]">
      <div data-standard-forward-stage="score" className={`rounded-lg border p-2 transition ${stageClass(['dispatch', 'qk', 'writeS'], 'writeS')}`}>
        <div className="text-[9px] font-black text-indigo-200">1 · {t('scoreKernel')}</div>
        <div className="mt-1.5 overflow-x-auto rounded-md bg-slate-950/60 p-1.5 text-center text-[10px] text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><MathFormula>{String.raw`S=QK^{\top}/\sqrt d+M`}</MathFormula></div>
        <div className="mt-1.5 grid grid-cols-4 gap-0.5">{Array.from({ length: 12 }, (_, index) => <div key={index} className={`h-2 rounded-sm ${scoresAvailable ? 'bg-rose-400' : 'bg-indigo-950'}`} />)}</div>
      </div>

      <div data-standard-forward-stage="softmax" className={`rounded-lg border p-2 transition ${stageClass(['readS', 'softmax', 'writeP'], 'writeP')}`}>
        <div className="flex items-center justify-between gap-1"><div className="text-[9px] font-black text-amber-200">2 · {t('softmaxKernel')}</div><span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[7px] font-black text-fuchsia-100">CUDA cores</span></div>
        {scoresAvailable ? (
          <>
            <div className="mt-1.5 grid gap-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="overflow-x-auto rounded-md border border-rose-700/60 bg-slate-950/60 p-1.5 text-center text-[9px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="mb-0.5 text-[7px] font-bold text-rose-200">{t('scoreRow')}</div><MathFormula>{scoreRow}</MathFormula></div>
              <ArrowRight className={`mx-auto text-amber-300 ${operationId === 'softmax' ? 'animate-pulse' : ''}`} size={14} />
              <div className="overflow-x-auto rounded-md border border-emerald-700/60 bg-slate-950/60 p-1.5 text-center text-[9px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="mb-0.5 text-[7px] font-bold text-emerald-200">{t('probabilityRow')}</div>{probabilitiesAvailable ? <MathFormula>{probabilityRow}</MathFormula> : <div className="h-4 rounded bg-slate-800" />}</div>
            </div>
            <div className="mt-1.5 overflow-x-auto rounded-md bg-slate-950/60 p-1.5 text-center text-[9px] text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><MathFormula>{String.raw`m_i=\max_j S_{ij},\quad P_{ij}=\frac{e^{S_{ij}-m_i}}{\sum_k e^{S_{ik}-m_i}}`}</MathFormula></div>
            <p className="mt-1.5 text-[8px] leading-snug text-indigo-100">{t('softmaxMechanism')}</p>
          </>
        ) : <div className="mt-2 rounded-md border border-dashed border-indigo-600 p-3 text-center text-[8px] text-indigo-300">{t('waitingForScores')}</div>}
      </div>

      <div data-standard-forward-stage="output" className={`rounded-lg border p-2 transition ${stageClass(['readP', 'pv', 'writeO'], 'writeO')}`}>
        <div className="text-[9px] font-black text-indigo-200">3 · {t('outputKernel')}</div>
        <div className="mt-1.5 overflow-x-auto rounded-md bg-slate-950/60 p-1.5 text-center text-[10px] text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><MathFormula>{String.raw`O=PV`}</MathFormula></div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[8px] font-bold text-indigo-200"><span className="rounded bg-emerald-500/20 px-1.5 py-0.5">P</span><MathFormula>{String.raw`\times`}</MathFormula><span className="rounded bg-amber-500/20 px-1.5 py-0.5">V</span></div>
      </div>
    </div>
  );
}

function StandardBackwardFlow({ snapshot, t }) {
  const operationId = snapshot.operation?.id;
  const currentIndex = snapshot.operation?.index ?? (snapshot.phase === 'done' ? snapshot.maxStep : -1);
  const operationIndex = (id) => snapshot.pipeline.operations.findIndex((operation) => operation.id === id);
  const stages = [
    { id: 'load', label: t('standardBwdLoad'), operationIds: ['loadSaved'], lastId: 'loadSaved', formula: String.raw`P,Q,K,V,\mathrm{d}O\leftarrow\mathrm{HBM}` },
    { id: 'value', label: t('standardBwdValueGrad'), operationIds: ['dv', 'dp'], lastId: 'dp', formula: String.raw`\mathrm{d}V=P^{\top}\mathrm{d}O,\quad \mathrm{d}P=\mathrm{d}O\,V^{\top}` },
    { id: 'softmax', label: t('standardBwdSoftmax'), operationIds: ['softmaxBwd'], lastId: 'softmaxBwd', formula: String.raw`\mathrm{d}S=P\odot\left(\mathrm{d}P-\operatorname{rowsum}(\mathrm{d}P\odot P)\right)` },
    { id: 'projection', label: t('standardBwdProjectionGrad'), operationIds: ['dq', 'dk', 'writeGrads'], lastId: 'writeGrads', formula: String.raw`\mathrm{d}Q=\mathrm{d}S K,\quad \mathrm{d}K=\mathrm{d}S^{\top}Q` },
  ];

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {stages.map((stage, index) => {
        const active = stage.operationIds.includes(operationId);
        const passed = snapshot.phase === 'done' || currentIndex > operationIndex(stage.lastId);
        const tone = active
          ? 'border-amber-300 bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-300'
          : passed
            ? 'border-emerald-600 bg-emerald-500/10'
            : 'border-indigo-700 bg-indigo-900/70';
        return (
          <div key={stage.id} data-standard-backward-stage={stage.id} className={`min-w-0 rounded-lg border p-2 transition ${tone}`}>
            <div className="flex items-start gap-1.5"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-black ${active ? 'bg-amber-300 text-amber-950' : passed ? 'bg-emerald-500 text-white' : 'bg-indigo-800 text-indigo-300'}`}>{index + 1}</span><div className="min-w-0 text-[8px] font-black leading-tight text-white">{stage.label}</div></div>
            <div className="mt-1.5 overflow-x-auto rounded-md bg-slate-950/65 p-1.5 text-center text-[10px] leading-none text-white"><MathFormula>{stage.formula}</MathFormula></div>
            <div className="mt-1.5 grid grid-cols-4 gap-0.5">{Array.from({ length: 8 }, (_, cellIndex) => <div key={cellIndex} className={`h-1.5 rounded-sm ${active ? 'bg-amber-300' : passed ? 'bg-emerald-400' : 'bg-indigo-950'}`} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

const TILE_TONES = [
  { cell: 'border-indigo-300 bg-indigo-400', shell: 'border-indigo-400 bg-indigo-50', text: 'text-indigo-700', glow: 'ring-indigo-400' },
  { cell: 'border-cyan-300 bg-cyan-400', shell: 'border-cyan-400 bg-cyan-50', text: 'text-cyan-700', glow: 'ring-cyan-400' },
  { cell: 'border-amber-300 bg-amber-400', shell: 'border-amber-400 bg-amber-50', text: 'text-amber-700', glow: 'ring-amber-400' },
  { cell: 'border-fuchsia-300 bg-fuchsia-400', shell: 'border-fuchsia-400 bg-fuchsia-50', text: 'text-fuchsia-700', glow: 'ring-fuchsia-400' },
];

const STANDARD_TENSOR_TONES = {
  Q: 'border-indigo-200 bg-indigo-300',
  K: 'border-amber-200 bg-amber-300',
  V: 'border-emerald-200 bg-emerald-300',
  O: 'border-cyan-200 bg-cyan-300',
  dO: 'border-rose-200 bg-rose-300',
  dQ: 'border-indigo-200 bg-indigo-300',
  dK: 'border-amber-200 bg-amber-300',
  dV: 'border-emerald-200 bg-emerald-300',
};

function StandardDenseTensorCard({ name, label = name, state, shape, active, t }) {
  const filledCells = Math.ceil(state.fill * 24);
  return (
    <div
      data-standard-matrix={name}
      data-matrix-partition="uniform"
      className={`min-w-0 rounded-xl border bg-white p-2.5 transition ${active ? 'border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.22)]' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between gap-1 text-xs font-black text-slate-800">
        <MathFormula>{label}</MathFormula>
        <span className="text-[8px] font-medium text-slate-400"><MathFormula>{shape}</MathFormula></span>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-1">
        {Array.from({ length: 24 }, (_, index) => (
          <div
            key={index}
            data-matrix-cell={index}
            className={`h-2.5 rounded-[2px] border transition ${index < filledCells ? STANDARD_TENSOR_TONES[name] : 'border-slate-200 bg-white'}`}
          />
        ))}
      </div>
      <div className="mt-1.5 truncate text-[8px] font-bold text-slate-500">{t(`status_${state.status}`)}</div>
    </div>
  );
}

function FlashHbmTensorCard({ name, label = name, state, shape, activeTileIndex, tileCount = 4, current, t }) {
  const active = state.access === 'read' || state.access === 'write';
  const activeTone = state.access === 'read'
    ? 'border-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.28)]'
    : state.access === 'write'
      ? 'border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.28)]'
      : 'border-slate-200';
  return (
    <div data-hbm-object={name} className={`min-w-0 rounded-xl border bg-white p-2.5 transition ${activeTone}`} aria-label={`${name}: ${t(`status_${state.status}`)}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="text-sm font-black text-slate-800"><MathFormula>{label}</MathFormula></div>
        <span className="text-[8px] text-slate-400"><MathFormula>{shape}</MathFormula></span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {Array.from({ length: tileCount }, (_, index) => {
          const filled = index < Math.ceil(state.fill * tileCount);
          const highlighted = current && index === activeTileIndex;
          const tone = TILE_TONES[index % TILE_TONES.length];
          return (
            <div
              key={index}
              data-tile-index={index}
              data-current-tile={highlighted ? 'true' : 'false'}
              aria-label={highlighted ? `${t('currentTile')} t${index}` : `t${index}`}
              className={`min-w-0 rounded-md border p-1 transition ${filled ? tone.shell : 'border-slate-200 bg-slate-50'} ${highlighted ? `scale-[1.04] ring-2 ${tone.glow} ring-offset-1` : ''}`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                {Array.from({ length: 6 }, (_, cellIndex) => <div key={cellIndex} className={`h-1.5 rounded-[1px] border ${filled ? tone.cell : 'border-slate-200 bg-white'}`} />)}
              </div>
              <div className={`mt-1 text-center text-[7px] font-black ${filled ? tone.text : 'text-slate-400'}`}>t{index}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 text-[8px] font-bold text-slate-500"><span className="truncate">{t(`status_${state.status}`)}</span><span>{state.access === 'read' ? 'HBM →' : state.access === 'write' ? '→ HBM' : active ? 'GPU' : ''}</span></div>
    </div>
  );
}

const BACKWARD_TENSOR_LABELS = {
  Q: 'Q', K: 'K', V: 'V', O: 'O', dO: String.raw`\mathrm{d}O`, dQ: String.raw`\mathrm{d}Q`, dK: String.raw`\mathrm{d}K`, dV: String.raw`\mathrm{d}V`, LSE: String.raw`\mathrm{LSE}`,
};

function BackwardHbmCanvas({ snapshot, config, t }) {
  const hbm = snapshot.backwardHbm;
  const vectorShape = String.raw`${config.sequenceLength}\times${config.headDim}`;
  const inputKeys = config.modelType === 'standard' ? ['Q', 'K', 'V', 'dO'] : ['Q', 'K', 'V', 'O', 'dO', 'LSE'];
  const gradientKeys = ['dQ', 'dK', 'dV'];
  const tileIndexFor = (key) => ['K', 'V', 'dK', 'dV'].includes(key) ? snapshot.displayTiles.kv : snapshot.displayTiles.q;
  const shapeFor = (key) => key === 'LSE' ? String.raw`${config.sequenceLength}` : vectorShape;

  if (config.modelType === 'standard') {
    return (
      <>
        <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">{t('backwardInputs')}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {inputKeys.map((key) => <StandardDenseTensorCard key={key} name={key} label={BACKWARD_TENSOR_LABELS[key]} state={hbm[key]} shape={shapeFor(key)} active={hbm[key].access !== 'idle'} t={t} />)}
        </div>
        <p className="mt-2 text-[8px] leading-relaxed text-slate-500">{t('fullMatrixLegend')}</p>
        <div className="mt-3 flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{t('savedForwardIntermediates')}</div><p className="mt-1 text-[8px] leading-relaxed text-slate-500">{t('workspaceHint')}</p></div><span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-1 text-[8px] font-black text-rose-700">{formatBytes(hbm.quadraticWorkspaceBytes)}</span></div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <HbmMatrixCard name="S" state={hbm.S} sequenceLength={config.sequenceLength} causal={config.causal} bytes={hbm.quadraticWorkspaceBytes / 2} t={t} />
          <HbmMatrixCard name="P" state={hbm.P} sequenceLength={config.sequenceLength} causal={config.causal} bytes={hbm.quadraticWorkspaceBytes / 2} t={t} />
        </div>
        <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{t('gradientOutputs')}</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {gradientKeys.map((key) => <StandardDenseTensorCard key={key} name={key} label={BACKWARD_TENSOR_LABELS[key]} state={hbm[key]} shape={vectorShape} active={hbm[key].access !== 'idle'} t={t} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">{t('backwardInputs')}</div>
      <p className="mb-2 text-[8px] leading-relaxed text-slate-500">{t('backwardTileLegend')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {inputKeys.map((key) => <FlashHbmTensorCard key={key} name={key} label={BACKWARD_TENSOR_LABELS[key]} state={hbm[key]} shape={shapeFor(key)} activeTileIndex={tileIndexFor(key)} current={snapshot.displayTiles.active} t={t} />)}
      </div>
      <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{t('gradientOutputs')}</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {gradientKeys.map((key) => <FlashHbmTensorCard key={key} name={key} label={BACKWARD_TENSOR_LABELS[key]} state={hbm[key]} shape={vectorShape} activeTileIndex={tileIndexFor(key)} current={snapshot.displayTiles.active && ['compute', 'write'].includes(hbm[key].access)} t={t} />)}
      </div>
      <div className="mt-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-2.5">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-wider text-emerald-800">{t('noQuadraticWorkspace')}</div><p className="mt-1 text-[8px] leading-relaxed text-emerald-700">{t('noQuadraticWorkspaceDesc')}</p></div><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[8px] font-black text-emerald-700">{t('noHbmAllocation')}</span></div>
      </div>
    </>
  );
}

function FlashStageVisual({ visual }) {
  const formulas = {
    tiles: String.raw`Q_i,\ K_j,\ V_j\ \longrightarrow\ \mathrm{SMEM}`,
    state: String.raw`(O_i,m_i,\ell_i)\ \mathrm{resident}`,
    score: String.raw`S_{ij}=Q_iK_j^{\top}/\sqrt d+M_{ij}`,
    softmax: String.raw`(m_i,\ell_i,O_i)\leftarrow\operatorname{online\_update}(S_{ij},V_j)`,
    output: String.raw`O_i\leftarrow O_i+P_{ij}V_j`,
    commit: String.raw`\operatorname{store}_{\mathrm{HBM}}(O,\mathrm{LSE})`,
    scheduler: String.raw`\mathrm{CTA}_i\ \owns\ (Q_i,O_i)`,
    gradient: String.raw`dQ,\ dK,\ dV\leftarrow\mathrm{MMA}`,
    high: String.raw`Q_H\to S_H\to P_H\to O_H`,
    low: String.raw`Q_L\to S_L\to P_L\to O_L`,
    correction: String.raw`O_i\leftarrow\alpha_iO_i+\Delta O_i`,
    cluster: String.raw`\mathrm{CTA}_0\longleftrightarrow\mathrm{CTA}_1`,
  };
  const gridTone = visual === 'softmax' || visual === 'high' || visual === 'low'
    ? 'bg-fuchsia-400'
    : visual === 'score'
      ? 'bg-rose-400'
      : visual === 'output' || visual === 'commit' || visual === 'correction'
        ? 'bg-emerald-400'
        : 'bg-indigo-400';
  return (
    <>
      <div className="mt-1.5 overflow-x-auto rounded-md bg-slate-950/65 p-1.5 text-center text-[10px] leading-none text-white"><MathFormula>{formulas[visual] ?? formulas.tiles}</MathFormula></div>
      <div className="mt-1.5 grid grid-cols-6 gap-0.5">{Array.from({ length: 12 }, (_, index) => <div key={index} className={`h-1.5 rounded-sm ${index < 8 ? gridTone : 'bg-indigo-950'}`} />)}</div>
    </>
  );
}

function FlashOnChipFlow({ snapshot, config, onChipKeys, t }) {
  const currentIndex = snapshot.operation?.index ?? (snapshot.phase === 'done' ? snapshot.maxStep : -1);
  const tileGroups = config.direction === 'forward'
    ? [
      { role: 'q', name: 'Q_i', range: snapshot.tile.qRange, sourceTile: snapshot.displayTiles.q },
      { role: 'k', name: 'K_j', range: snapshot.tile.kvRange, sourceTile: snapshot.displayTiles.kv },
      { role: 'v', name: 'V_j', range: snapshot.tile.kvRange, sourceTile: snapshot.displayTiles.kv },
    ]
    : [
      { role: 'q', name: String.raw`Q_i,O_i,\mathrm{d}O_i,\mathrm{LSE}_i`, range: snapshot.tile.qRange, sourceTile: snapshot.displayTiles.q },
      { role: 'kv', name: String.raw`K_j,V_j`, range: snapshot.tile.kvRange, sourceTile: snapshot.displayTiles.kv },
      { role: 'grad', name: String.raw`\mathrm{d}Q_i\mid\mathrm{d}K_j,\mathrm{d}V_j`, range: null, sourceTile: null },
    ];
  return (
    <>
      <div className="rounded-xl border border-indigo-700 bg-indigo-950/45 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-indigo-200"><span>{t('activeTilePair')}</span><span className="rounded-full bg-indigo-900 px-2 py-1">{config.version.toUpperCase()} · {snapshot.profile.hardware}</span></div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {tileGroups.map(({ role, name, range, sourceTile }) => {
            const qTone = TILE_TONES[snapshot.displayTiles.q % TILE_TONES.length];
            const kvTone = TILE_TONES[snapshot.displayTiles.kv % TILE_TONES.length];
            const tone = sourceTile == null ? qTone : TILE_TONES[sourceTile % TILE_TONES.length];
            const isGradientGroup = role === 'grad';
            return (
              <div
                key={name}
                data-onchip-tile={role}
                data-source-tile={sourceTile ?? undefined}
                data-source-q-tile={isGradientGroup ? snapshot.displayTiles.q : undefined}
                data-source-kv-tile={isGradientGroup ? snapshot.displayTiles.kv : undefined}
                className={`min-w-0 rounded-lg border bg-indigo-900/80 p-1.5 transition ${snapshot.operation ? `border-white/70 ring-1 ${isGradientGroup ? 'ring-white/70' : tone.glow}` : 'border-indigo-700'}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-1 text-[8px] font-black text-white">
                  <span className="min-w-0 truncate"><MathFormula>{name}</MathFormula></span>
                  {isGradientGroup
                    ? <span className="flex shrink-0 gap-0.5"><span className={`rounded bg-white px-1 py-0.5 text-[6px] ${qTone.text}`}>t{snapshot.displayTiles.q}</span><span className={`rounded bg-white px-1 py-0.5 text-[6px] ${kvTone.text}`}>t{snapshot.displayTiles.kv}</span></span>
                    : <span className={`shrink-0 rounded bg-white px-1 py-0.5 text-[7px] ${tone.text}`}>t{sourceTile}</span>}
                </div>
                <div className="mt-0.5 truncate text-[7px] text-indigo-300">{range ? range.join(':') : `${snapshot.tile.qRange.join(':')} / ${snapshot.tile.kvRange.join(':')}`}</div>
                <div className="mt-1 grid grid-cols-4 gap-0.5">
                  {[0, 1, 2, 3].map((index) => <div key={index} className={`h-2.5 rounded-sm border ${isGradientGroup && index >= 2 ? kvTone.cell : tone.cell} ${snapshot.operation ? 'opacity-100' : 'opacity-25'}`} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`mt-2 grid gap-1.5 ${snapshot.onChipStages.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {snapshot.onChipStages.map((stage, index) => {
          const active = stage.operationIds.includes(snapshot.operation?.id);
          const passed = snapshot.phase === 'done' || currentIndex > stage.lastOperationIndex;
          return (
            <div key={stage.id} data-flash-stage={stage.id} className={`min-w-0 rounded-lg border p-2 transition ${active ? 'border-amber-300 bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-300' : passed ? 'border-emerald-600 bg-emerald-500/10' : 'border-indigo-700 bg-indigo-900/70'}`}>
              <div className="flex items-start gap-1.5"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-black ${active ? 'bg-amber-300 text-amber-950' : passed ? 'bg-emerald-500 text-white' : 'bg-indigo-800 text-indigo-300'}`}>{index + 1}</span><div className="min-w-0 text-[8px] font-black leading-tight text-white">{t(`stage_${stage.id}`)}</div></div>
              <FlashStageVisual visual={stage.visual} />
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-lg border border-indigo-700 bg-indigo-900/80 p-2"><div className="text-[7px] font-black uppercase tracking-wider text-indigo-300">{t('versionResources')}</div><div className="mt-1.5 flex flex-wrap gap-1">{onChipKeys.map((key) => <span key={key} className="rounded border border-indigo-600 bg-indigo-950/60 px-1.5 py-0.5 text-[7px] font-bold text-indigo-100">{t(key)}</span>)}</div></div>
    </>
  );
}

function FlashAttention() {
  const [config, setConfig] = useState(DEFAULT_FLASH_CONFIG);
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (key) => i18n[lang][key] ?? key;
  const snapshot = useMemo(() => deriveFlashSnapshot(config, { phase, step }), [config, phase, step]);

  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setStep(0);
  };

  const changeConfig = (patch) => {
    setConfig((current) => normalizeFlashConfig({ ...current, ...patch }));
    setIsPlaying(false);
    setPhase('idle');
    setStep(0);
  };

  const handleNextStep = () => {
    if (phase === 'idle') {
      setPhase('running');
      setStep(1);
      return;
    }
    if (phase === 'done') return;
    if (step < snapshot.maxStep) setStep((current) => current + 1);
    else {
      setPhase('done');
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (phase === 'done') {
      setPhase('running');
      setStep(1);
      setIsPlaying(true);
      return;
    }
    if (phase === 'idle') {
      setPhase('running');
      setStep(1);
    }
    setIsPlaying((current) => !current);
  };

  useEffect(() => {
    if (!isPlaying || phase === 'done') return undefined;
    const timer = setTimeout(handleNextStep, snapshot.operation?.id.includes('softmax') ? 1250 : 900);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, step, snapshot.maxStep]);

  const selectedVersion = config.modelType === 'standard' ? 'standard' : config.version;
  const currentLabel = phase === 'done' ? t('done') : snapshot.operation ? t(`op_${snapshot.operation.id}`) : t('idle');
  const maskLabel = phase === 'done'
    ? t('done')
    : !snapshot.operation
      ? t('idle')
      : snapshot.tile.mask === 'skip'
        ? t('maskSkip')
        : snapshot.tile.mask === 'partial'
          ? t('maskPartial')
          : t('maskNone');
  const loopCopy = config.direction === 'backward'
    ? config.modelType === 'standard'
      ? [t('standardBackwardLoop'), '']
      : [t(`bwdOuter${config.version.toUpperCase()}`), t(`bwdInner${config.version.toUpperCase()}`)]
    : config.modelType === 'standard'
      ? [t('standardLoop'), '']
      : snapshot.profile.outerLoop === 'kv'
        ? [t('outerKV'), t('innerQ')]
        : snapshot.profile.outerLoop === 'q-pair'
          ? [t('outerQPair'), t('innerAsync')]
          : [t('outerQ'), t('innerKV')];

  const onChipKeys = config.modelType === 'standard'
    ? (config.direction === 'forward' ? ['storage_fulls', 'storage_fullp', 'storage_register'] : ['storage_fullp', 'storage_grad', 'storage_register'])
    : config.version === 'v1'
      ? ['storage_smem', 'storage_register', 'storage_grad']
      : config.version === 'v2'
        ? ['storage_smem', 'storage_splitq', 'storage_register']
        : config.version === 'v3'
          ? ['storage_tma', 'storage_smem', 'storage_wgmma', 'storage_register']
          : ['storage_smem', 'storage_tmem', 'storage_umma', 'storage_correction'];

  const summaryKey = config.modelType === 'standard' ? 'standardBoundary' : `${config.version}Summary`;
  const observeKey = config.modelType === 'standard' ? 'trafficAssumption' : `${config.version}Observe`;
  const boundaryKey = config.modelType === 'standard' ? 'standardBoundary' : `${config.version}Boundary`;
  const scheduleKey = config.modelType === 'standard' ? 'scheduleStandard' : `schedule${config.version.toUpperCase()}`;
  const trafficMax = snapshot.resources.standardTrafficBytes;
  const selectedTraffic = config.modelType === 'standard' ? trafficMax : snapshot.resources.flashTrafficBytes;

  return (
    <div className="min-h-screen bg-slate-50 p-3 font-sans text-slate-800 selection:bg-indigo-100 md:p-5">
      <div className="mx-auto max-w-[96rem] space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Zap size={20} /></div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{t('title')}</h1>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">{t('subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 2xl:justify-end">
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                {['standard', 'flash'].map((mode) => (
                  <button key={mode} type="button" aria-pressed={config.modelType === mode} onClick={() => changeConfig({ modelType: mode })} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${config.modelType === mode ? 'bg-white text-indigo-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {t(mode)}
                  </button>
                ))}
              </div>
              {config.modelType === 'flash' && (
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" aria-label={t('versionFamily')}>
                  {FLASH_VERSIONS.map((version) => (
                    <button key={version} type="button" aria-pressed={config.version === version} onClick={() => changeConfig({ version })} className={`rounded-md px-2.5 py-1.5 text-[10px] font-black uppercase transition ${config.version === version ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}>
                      {version}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1" aria-label={t('execution')}>
                {['forward', 'backward'].map((direction) => (
                  <button key={direction} type="button" aria-pressed={config.direction === direction} onClick={() => changeConfig({ direction })} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${config.direction === direction ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {t(direction)}
                  </button>
                ))}
              </div>
              <button type="button" aria-pressed={config.causal} onClick={() => changeConfig({ causal: !config.causal })} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${config.causal ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                {config.causal ? t('causal') : t('nonCausal')}
              </button>
              <button type="button" onClick={() => setLang((current) => current === 'zh' ? 'en' : 'zh')} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" title={t('language')}>
                <Globe size={15} /> {t('language')}
              </button>
              <button type="button" onClick={reset} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" title={t('reset')}><RotateCcw size={16} /></button>
              <button type="button" onClick={togglePlay} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
                {isPlaying ? <Pause size={15} /> : <Play size={15} />} {isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')}
              </button>
              <button type="button" onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 disabled:opacity-40">
                <SkipForward size={15} /> {t('next')}
              </button>
            </div>
          </div>

        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 md:text-lg"><Database className="text-indigo-500" size={20} /> {t('canvasTitle')}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span><strong>{t('hardware')}:</strong> {config.modelType === 'standard' ? 'generic GPU' : snapshot.profile.hardware}</span>
                <span><strong>{t('architecture')}:</strong> {config.modelType === 'standard' ? 'separate GEMM / Softmax kernels' : snapshot.profile.architecture}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                {t('sequenceLength')}
                <select value={config.sequenceLength} onChange={(event) => changeConfig({ sequenceLength: Number(event.target.value) })} className="bg-transparent text-indigo-800 outline-none">
                  {[512, 2048, 8192].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                {t('headDim')}
                <select value={config.headDim} onChange={(event) => changeConfig({ headDim: Number(event.target.value) })} className="bg-transparent text-indigo-800 outline-none">
                  {[64, 128].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                {t('dtype')} <span className="text-indigo-800">BF16</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {config.direction === 'forward' ? (
              config.modelType === 'standard' ? (
                <>
                  <MetricCard label={t('materializedMetric')} value={formatBytes(snapshot.resources.standardMaterializedBytes)} detail={t('materialized')} tone="rose" />
                  <MetricCard label={t('standardHbmPasses')} value="4" detail={t('standardHbmPassesDetail')} tone="amber" />
                  <MetricCard label={t('standardMmas')} value="2" detail={t('standardMmasDetail')} tone="indigo" />
                  <MetricCard label={t('bottleneckMetric')} value={t('bottleneck_standard')} tone="rose" />
                </>
              ) : (
                <>
                  <MetricCard label={t('materializedMetric')} value="0 B" detail={t('notMaterialized')} tone="emerald" />
                  <MetricCard label={t('onChipMetric')} value={formatBytes(snapshot.resources.onChipLiveBytes)} detail={<MathFormula>{String.raw`${snapshot.profile.qTile}\times ${snapshot.profile.kvTile}`}</MathFormula>} tone="indigo" />
                  <MetricCard label={t('tilePairsMetric')} value={`${snapshot.grid.activePairs} / ${snapshot.grid.skippedPairs}`} detail={config.causal ? t('causal') : t('nonCausal')} tone="amber" />
                  <MetricCard label={t('bottleneckMetric')} value={t(`bottleneck_${selectedVersion}`)} tone="rose" />
                </>
              )
            ) : (
              <>
                <MetricCard label={t('mmaMetric')} value={snapshot.mmaPerTile} detail={config.modelType === 'flash' ? 'QK + dV + dP + dQ + dK' : 'dV + dP + dQ + dK'} tone="indigo" />
                <MetricCard label={t('recomputeMetric')} value={config.modelType === 'flash' ? t('yes') : t('no')} detail={config.modelType === 'flash' ? t('exactAttention') : undefined} tone={config.modelType === 'flash' ? 'amber' : 'emerald'} />
                <MetricCard label={t('savedMetric')} value={config.modelType === 'flash' ? 'O + LSE' : 'P + Q/K/V'} detail={config.modelType === 'flash' ? t('savedFlash') : t('savedStandard')} tone="emerald" />
                <MetricCard label={t('scheduleMetric')} value={t(scheduleKey)} tone="rose" />
              </>
            )}
          </div>

          {config.direction === 'forward' && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Activity size={16} /> {t('trafficTitle')}</div>
                <div className="text-right text-[10px] text-slate-500"><strong className="text-slate-800">{t('trafficCurrent')}:</strong> {formatBytes(snapshot.currentTrafficBytes)} / {formatBytes(snapshot.selectedTrafficBytes)}</div>
              </div>
              <div className="space-y-2">
                {[
                  [t('standardBaseline'), trafficMax, 'bg-rose-500'],
                  [config.modelType === 'standard' ? t('standardBaseline') : `${t('selectedImplementation')} · ${config.version.toUpperCase()}`, selectedTraffic, 'bg-emerald-500'],
                ].map(([label, bytes, color], index) => (
                  <div key={`${label}-${index}`} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-2 text-[10px] sm:grid-cols-[12rem_1fr_6rem]">
                    <span className="truncate font-bold text-slate-600">{label}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(1, bytes / trafficMax * 100)}%` }} /></div>
                    <span className="text-right font-mono font-bold text-slate-700">{formatBytes(bytes)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{t('trafficAssumption')}</p>
            </div>
          )}

          <div className="mt-5 grid min-h-[22rem] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.18fr)_5rem_minmax(0,1fr)]">
            <div data-memory-panel="hbm" className="min-w-0 rounded-2xl border-2 border-slate-300 bg-slate-100 p-3 md:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-700"><Database size={16} /> {t('hbm')}</h3>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-500">{config.modelType === 'standard' && config.direction === 'forward' ? t('hbmAddressSpace') : t('fullTensor')}</span>
              </div>
              {config.modelType === 'standard' && config.direction === 'forward' ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">{t('inputOutputTensors')}</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['Q', 'K', 'V', 'O'].map((tensor) => {
                      const inputOperationIds = tensor === 'V' ? ['readP', 'pv'] : ['dispatch', 'qk'];
                      const tensorState = tensor === 'O' ? snapshot.standardHbm.O : { status: 'ready', fill: 1, access: inputOperationIds.includes(snapshot.operation?.id) ? 'read' : 'idle' };
                      return <StandardDenseTensorCard key={tensor} name={tensor} state={tensorState} shape={String.raw`${config.sequenceLength}\times ${config.headDim}`} active={tensorState.access !== 'idle'} t={t} />;
                    })}
                  </div>
                  <p className="mt-2 text-[8px] leading-relaxed text-slate-500">{t('fullMatrixLegend')}</p>
                  <div className="mt-4 flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{t('quadraticWorkspace')}</div><p className="mt-1 text-[8px] leading-relaxed text-slate-500">{t('workspaceHint')}</p></div><span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-1 text-[8px] font-black text-rose-700">{formatBytes(snapshot.resources.standardMaterializedBytes)}</span></div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <HbmMatrixCard name="S" state={snapshot.standardHbm.S} sequenceLength={config.sequenceLength} causal={config.causal} bytes={snapshot.resources.standardMaterializedBytes / 2} t={t} />
                    <HbmMatrixCard name="P" state={snapshot.standardHbm.P} sequenceLength={config.sequenceLength} causal={config.causal} bytes={snapshot.resources.standardMaterializedBytes / 2} t={t} />
                  </div>
                </>
              ) : config.modelType === 'flash' && config.direction === 'forward' ? (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{t('hbmInputs')}</div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[8px] font-black text-indigo-700">BF16</span></div>
                  <p className="mb-2 text-[8px] leading-relaxed text-slate-500">{t('tileColorLegend')}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <FlashHbmTensorCard name="Q" state={snapshot.flashHbm.Q} shape={String.raw`${config.sequenceLength}\times${config.headDim}`} activeTileIndex={snapshot.displayTiles.q} current={snapshot.displayTiles.active} t={t} />
                    <FlashHbmTensorCard name="K" state={snapshot.flashHbm.K} shape={String.raw`${config.sequenceLength}\times${config.headDim}`} activeTileIndex={snapshot.displayTiles.kv} current={snapshot.displayTiles.active} t={t} />
                    <FlashHbmTensorCard name="V" state={snapshot.flashHbm.V} shape={String.raw`${config.sequenceLength}\times${config.headDim}`} activeTileIndex={snapshot.displayTiles.kv} current={snapshot.displayTiles.active} t={t} />
                  </div>
                  <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{t('hbmOutputs')}</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FlashHbmTensorCard name="O" state={snapshot.flashHbm.O} shape={String.raw`${config.sequenceLength}\times${config.headDim}`} activeTileIndex={snapshot.displayTiles.q} current={snapshot.displayTiles.active && snapshot.flashHbm.O.access === 'write'} t={t} />
                    <FlashHbmTensorCard name="\mathrm{LSE}" state={snapshot.flashHbm.LSE} shape={String.raw`${config.sequenceLength}`} activeTileIndex={snapshot.displayTiles.q} current={snapshot.displayTiles.active && snapshot.flashHbm.LSE.access === 'write'} t={t} />
                  </div>
                  <div className="relative mt-3 overflow-hidden rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-3">
                    <div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-wider text-emerald-800">{t('noQuadraticWorkspace')}</div><p className="mt-1 text-[8px] leading-relaxed text-emerald-700">{t('noQuadraticWorkspaceDesc')}</p></div><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[8px] font-black text-emerald-700">{t('noHbmAllocation')}</span></div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="grid grid-cols-5 gap-1 rounded-lg border border-dashed border-emerald-300 bg-white p-2 opacity-45">{Array.from({ length: 20 }, (_, index) => <div key={index} className="h-2 rounded-sm border border-slate-200 bg-slate-50" />)}</div>
                      <div className="rounded-lg bg-emerald-100 px-2 py-1 text-center text-emerald-800"><MathFormula>{String.raw`S,P\notin\mathrm{HBM}`}</MathFormula></div>
                      <div className="grid grid-cols-5 gap-1 rounded-lg border border-dashed border-emerald-300 bg-white p-2 opacity-45">{Array.from({ length: 20 }, (_, index) => <div key={index} className="h-2 rounded-sm border border-slate-200 bg-slate-50" />)}</div>
                    </div>
                  </div>
                </>
              ) : <BackwardHbmCanvas snapshot={snapshot} config={config} t={t} />}
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 text-center text-[9px] font-bold text-slate-500">
              <span>{t('readTile')}</span>
              <ArrowRight className="rotate-90 text-indigo-500 lg:rotate-0" />
              <span className={`max-w-full rounded-lg px-2 py-1 leading-tight ${snapshot.tile.mask === 'skip' ? 'bg-rose-100 text-rose-700' : snapshot.tile.mask === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{config.modelType === 'standard' ? currentLabel : maskLabel}</span>
              <ArrowRight className="rotate-90 text-emerald-500 lg:rotate-180" />
              <span>{t('writeBack')}</span>
            </div>

            <div data-memory-panel="onchip" className="min-w-0 overflow-hidden rounded-2xl border-2 border-indigo-300 bg-indigo-900 p-3 text-indigo-50 shadow-inner">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide"><Cpu size={16} className="text-amber-300" /> {t('onChip')}</h3>
                <span className="rounded-full border border-indigo-700 bg-indigo-900 px-2 py-1 text-[9px] font-bold text-indigo-200">{currentLabel}</span>
              </div>
              {config.modelType === 'standard' && config.direction === 'forward'
                ? <StandardSoftmaxFlow snapshot={snapshot} config={config} t={t} />
                : config.modelType === 'flash'
                  ? <FlashOnChipFlow snapshot={snapshot} config={config} onChipKeys={onChipKeys} t={t} />
                  : <StandardBackwardFlow snapshot={snapshot} t={t} />}
              <div className="mt-2 rounded-lg border border-indigo-700 bg-indigo-900/80 p-2">
                <div className="grid gap-1.5 text-[9px] sm:grid-cols-2">
                  <div><span className="font-black text-indigo-300">{t('outerLoop')}</span><p className="mt-1 text-indigo-50">{loopCopy[0]}</p></div>
                  {loopCopy[1] && <div><span className="font-black text-amber-300">{t('innerLoop')}</span><p className="mt-1 text-indigo-50">{loopCopy[1]}</p></div>}
                </div>
                {snapshot.operation && config.modelType === 'flash' && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-indigo-700 pt-2 text-[8px] text-indigo-200">
                    <span className="rounded bg-slate-900 px-2 py-1">Q [{snapshot.tile.qRange.join(':')}]</span>
                    <MathFormula>{String.raw`\times`}</MathFormula>
                    <span className="rounded bg-slate-900 px-2 py-1">KV [{snapshot.tile.kvRange.join(':')}]</span>
                    <span className="rounded bg-amber-400/20 px-2 py-1 font-bold text-amber-200">{maskLabel}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 overflow-x-auto rounded-lg border border-indigo-700 bg-white p-2 text-center text-xs text-slate-900">
                <MathFormula block>{config.direction === 'forward'
                  ? String.raw`O=\operatorname{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d}}+M\right)V`
                  : String.raw`dS=P\odot\left(dP-\operatorname{rowsum}(dP\odot P)\right)`}</MathFormula>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div><h2 className="flex items-center gap-2 text-base font-bold text-slate-800"><Layers className="text-fuchsia-500" size={19} /> {t('pipelineTitle')}</h2><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-500">{t('pipelineHint')}</p></div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{step} / {snapshot.maxStep}</span>
            </div>
            <div className="space-y-2 overflow-x-auto pb-2">
              {snapshot.pipeline.lanes.map((lane) => (
                <div key={lane} className="grid min-w-[34rem] grid-cols-[7rem_1fr] items-center gap-2">
                  <div className="truncate text-right text-[9px] font-black uppercase tracking-wide text-slate-500">{t(`lane_${lane}`)}</div>
                  <div className="grid h-10 grid-cols-[repeat(13,minmax(0,1fr))] items-center gap-px rounded-lg border border-slate-200 bg-slate-100 px-1">
                    {snapshot.pipeline.operations.filter((operation) => operation.lane === lane).map((operation) => {
                      const active = snapshot.operation?.id === operation.id;
                      const passed = snapshot.operation && operation.index < snapshot.operation.index || phase === 'done';
                      return (
                        <div key={operation.id} title={t(`op_${operation.id}`)} className={`flex h-7 items-center justify-center overflow-hidden rounded px-1 text-center text-[8px] font-bold leading-tight transition ${active ? 'z-10 bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(192,38,211,0.45)] ring-2 ring-fuchsia-300' : passed ? 'bg-emerald-200 text-emerald-900' : 'border border-slate-200 bg-white text-slate-400'}`} style={{ gridColumn: `${operation.start + 1} / span ${operation.duration}` }}>
                          <span className="truncate">{t(`op_${operation.id}`)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-[#0d1117] p-4 text-slate-300 shadow-lg md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-white"><Code className="text-emerald-400" size={19} /> {t('implementationTitle')}</h2>
              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[8px] font-bold text-slate-400">{t('implementationTag')}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080c12] p-3 font-mono text-[10px] leading-relaxed md:p-4">
              <div className="mb-3 text-slate-500">kernel {selectedVersion}_{config.direction}(metadata, Q, K, V):</div>
              {snapshot.pipeline.operations.map((operation, index) => (
                <div key={operation.id} className={`min-w-max rounded px-2 py-1 transition ${snapshot.operation?.id === operation.id ? 'bg-emerald-900/60 text-emerald-100 ring-1 ring-emerald-600' : operation.index < (snapshot.operation?.index ?? -1) || phase === 'done' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span className="mr-3 inline-block w-4 text-right text-slate-700">{index + 1}</span>{CODE_BY_OPERATION[operation.id]}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-700 bg-indigo-900 p-5 text-indigo-50 shadow-xl">
          <h2 className="flex items-center gap-2 border-b border-indigo-800 pb-3 text-sm font-black uppercase tracking-widest text-white"><Info className="text-indigo-300" size={18} /> {t('inspectorTitle')}</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
            <div className="rounded-xl border border-indigo-700 bg-indigo-900/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Sparkles size={15} /> {config.modelType === 'standard' ? t('standard') : config.version.toUpperCase()}</h3>
              <p className="mt-2 text-xs leading-relaxed text-indigo-100">{t(summaryKey)}</p>
              <div className="mt-3 rounded-lg bg-slate-900 p-2 text-center"><MathFormula>{String.raw`S=QK^{\top},\quad P=\operatorname{softmax}(S),\quad O=PV`}</MathFormula></div>
            </div>
            <div className="rounded-xl border border-amber-700/70 bg-amber-900/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-300"><EyeOff size={15} /> {t('observe')}</h3>
              <p className="mt-2 text-xs leading-relaxed text-amber-50/90">{t(observeKey)}</p>
              <div className="mt-3 text-[10px] text-amber-200"><strong>{t('currentStage')}:</strong> {currentLabel}</div>
            </div>
            <div className="rounded-xl border border-rose-800 bg-rose-900/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-rose-300"><CheckCircle2 size={15} /> {t('boundary')}</h3>
              <p className="mt-2 text-xs leading-relaxed text-rose-50/90">{t(boundaryKey)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-rose-100">
                <span className="rounded bg-rose-900 px-2 py-1"><MathFormula>{tensorFormula('Q,K,V,O', config.sequenceLength, config.headDim)}</MathFormula></span>
                <span className="rounded bg-rose-900 px-2 py-1">{config.causal ? t('causal') : t('nonCausal')}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-indigo-800 bg-indigo-900/50 p-3 text-center text-xs text-indigo-100"><strong className="text-white">{t('commonBackbone')}:</strong> {t('commonBackboneDesc')}</div>
        </section>
      </div>
    </div>
  );
}

export default FlashAttention;
