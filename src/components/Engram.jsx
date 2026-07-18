import React, { useEffect, useMemo, useState } from 'react';
import { 
  Database, Cpu, Combine, Hash, ArrowRight, ArrowDown, ArrowUp, ArrowLeft,
  Layers, BrainCircuit, Play, Pause, SkipForward, RotateCcw, 
  Activity, SlidersHorizontal, BookOpen, Server, Network, 
  Clock, MemoryStick, HardDrive, Calculator, Boxes, Grid, SplitSquareHorizontal, FunctionSquare, FileCode2, Globe
} from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import {
  ENGRAM_DEMO_CONFIG,
  ENGRAM_MAX_STEP,
  ENGRAM_TOKENS,
  advanceEngramState,
  deriveEngramSnapshot,
} from './engram/model';

// --- 国际化双语字典 ---
const i18n = {
  zh: {
    title: "DeepSeek Engram 架构可视化",
    subtitle: "条件记忆检索、微观张量流与系统级数据移动过程演示",
    reset: "重置",
    play: "播放",
    pause: "暂停",
    next: "下一步",
    completed: "已完成",
    replay: "重新播放",
    langToggle: "EN",
    topoTitle: "网络拓扑结构",
    flowTitle: "Engram微观张量流图",
    codeTitle: "Demo 对齐",
    timelineTitle: "系统级内存访问与通信时间轴",
    mathTitle: "Engram 数学原理与维度推导",
    inferenceMode: "推理",
    trainingMode: "训练",
    demoConfig: "官方 Demo 示例：第 1 / 15 层",
    scrollHint: "左右滑动查看完整张量流",
    activeStatus: "当前",
    passedStatus: "已完成",
    pendingStatus: "待执行",
    // Steps
    step0: "等待输入",
    step1: "步骤 1: 滑动窗口提取 N-Gram",
    step2: "步骤 2: 位异或与哈希取模",
    step3: "步骤 3: 确定槽位并行查表",
    step4: "步骤 4: 提取多通道记忆向量",
    step5: "步骤 5: 维度展平为 E_t",
    step6: "步骤 6: 张量投影 K_t / V_t",
    step7: "步骤 7: 依赖建模与动态门控",
    step8: "步骤 8: 规范化卷积残差融合",
    step9: "步骤 9: 传递至后续 Block",
    // Glossary
    batchSize: "Batch Size",
    seqLen: "Seq Len",
    hiddenDim: "Hidden Dim",
    hyperConn: "Hyper-Conn",
    engramDim: "Engram Dim",
    headDim: "Head Dim",
    hashSize: "Hash Size",
    // Labels
    tokenizerCompression: "Tokenizer Compression & N-Gram Sliding Window",
    gramContext: "Context",
    gram: "Gram",
    multiHeadHash: "Multi-Head Hash Retrieval",
    channel: "Channel",
    flatten: "Flatten / Concat",
    gating: "Context-aware Gating",
    matmul: "MatMul",
    dotSign: "内积 → 带符号平方根 → Sigmoid",
    broadcast: "Broadcast",
    residual: "Residual",
    projectionBand: "分支 / 共享投影",
    gateBand: "依赖门控",
    fusionBand: "卷积融合与残差",
    mergedMemory: "多尺度记忆汇聚",
    vocabEmbedding: "词表嵌入",
    standardBlock0: "Block 0（标准）",
    engramBlock1: "Block 1（含 Engram）",
    standardBlock2: "Block 2（标准）",
    engramBlock15: "Block 15（含 Engram）",
    attention: "Attention",
    moe: "MoE",
    engramModules: "Engram 模块",
    embTable: "嵌入表",
    valueProj: "共享 W_V 投影",
    keyProjs: "分支 W_K 投影",
    convWeights: "短卷积权重",
    normParams: "RMSNorm 参数",
    rawForms: "原始形式",
    canonicalForm: "规范化 ID",
    normalizationNote: "示意：NFKC、去重音、转小写与空白归一化会把等价 token 折叠到同一规范形式。",
    moduleOutput: "Engram 增量",
    blockOutput: "Block 状态",
    // Timeline
    t0: "T0 序列输入",
    t1: "T1 异步并行预取",
    t2: "T2 通信与同步",
    t3: "T3 特征融合",
    t1Training: "T1 本地寻址",
    t2Training: "T2 All-to-All 取行",
    t3Training: "T3 融合与继续计算",
    dataPrep: "数据准备",
    calcHash: "计算 Hash 与并行查表 (T1)",
    pcieTx: "PCIe 异步传输",
    precedingBlock: "前置 Transformer Block 计算窗口",
    gatedFusion: "Engram 门控融合",
    subsequentComp: "后续计算",
    hostLane: "CPU / Host",
    deviceLane: "GPU / Device",
    requestingRank: "请求 Rank",
    tableShards: "GPU 表分片",
    trainingHash: "本地计算确定性索引",
    allToAllFetch: "All-to-All 获取活跃行",
    activeRows: "本地活跃嵌入行",
    gradientDispatch: "反向梯度分发（本时间轴外）",
    inferenceBoundary: "预取与前置计算重叠；仅当查表与 PCIe 延迟不超过计算窗口时，GPU 才无需等待。",
    trainingBoundary: "训练时嵌入表跨 GPU 分片，前向通过 All-to-All 获取活跃行；反向还需分发对应梯度。",
    // Code Comments
    c1: "# 1. 滑动窗口提取多尺度 N-Gram 上下文",
    c2: "# 2. 深度展开: 多头异或哈希计算",
    c3: "# 逐位异或混合 Token 与随机乘子",
    c4: "# 多头并行素数取模",
    c5: "# 3~4. 并行查表提取头向量",
    c6: "# 5. 维度展平汇聚",
    c7: "# 6~7. 依赖建模与动态门控",
    c8: "# 8. 跨时间步平滑与残差相加",
    c9: "# 9. 返回 Engram 增量，由 Block 完成外层残差",
    codeBoundary: "逻辑等价于官方 demo；分表查找在实现中可打包为带 offsets 的 MultiHeadEmbedding。",
    // Math
    p1Title: "Phase 1 记忆路由与特征检索",
    p1Desc: "获取后缀 N-Gram，并通过多头乘法异或定位内存槽位，直接展平无需线性层。",
    p2Title: "Phase 2 依赖建模与动态门控",
    p2Desc: "按 Hyper-Connection(HC) 切分。引入双侧 RMSNorm 与 sgn(x)√|x| 平方根缩放解决内积数值爆炸。",
    p2Where: "其中",
    p3Title: "Phase 3 时序平滑与状态融合",
    p3Desc: "门控后的特征序列再经过组内 RMSNorm 后，送入短上下文 1D 卷积进行平滑与残差相加。",
    phase1: "阶段 1",
    phase2: "阶段 2",
    phase3: "阶段 3",
  },
  en: {
    title: "DeepSeek Engram Architecture",
    subtitle: "Conditional Memory Retrieval, Micro Tensor Flow & System Data Movement",
    reset: "Reset",
    play: "Play",
    pause: "Pause",
    next: "Next",
    completed: "Completed",
    replay: "Replay",
    langToggle: "中文",
    topoTitle: "Network Topology",
    flowTitle: "Engram Micro Tensor Flow",
    codeTitle: "Demo-aligned",
    timelineTitle: "System Memory Access & Communication Timeline",
    mathTitle: "Engram Math Principles & Dimensions",
    inferenceMode: "Inference",
    trainingMode: "Training",
    demoConfig: "Official demo example: layers 1 / 15",
    scrollHint: "Scroll horizontally for the complete tensor flow",
    activeStatus: "Active",
    passedStatus: "Passed",
    pendingStatus: "Pending",
    // Steps
    step0: "Waiting for Input",
    step1: "Step 1: Sliding Window N-Gram Extraction",
    step2: "Step 2: Bitwise XOR & Hash Modulo",
    step3: "Step 3: Parallel Table Lookup",
    step4: "Step 4: Extract Multi-channel Memory",
    step5: "Step 5: Flatten Dimensions to E_t",
    step6: "Step 6: Tensor Projection K_t / V_t",
    step7: "Step 7: Dependency Modeling & Gating",
    step8: "Step 8: Norm Conv & Residual Fusion",
    step9: "Step 9: Pass to Subsequent Block",
    // Glossary
    batchSize: "Batch Size",
    seqLen: "Seq Len",
    hiddenDim: "Hidden Dim",
    hyperConn: "Hyper-Conn",
    engramDim: "Engram Dim",
    headDim: "Head Dim",
    hashSize: "Hash Size",
    // Labels
    tokenizerCompression: "Tokenizer Compression & N-Gram Sliding Window",
    gramContext: "Context",
    gram: "Gram",
    multiHeadHash: "Multi-Head Hash Retrieval",
    channel: "Channel",
    flatten: "Flatten / Concat",
    gating: "Context-aware Gating",
    matmul: "MatMul",
    dotSign: "Dot → signed square root → sigmoid",
    broadcast: "Broadcast",
    residual: "Residual",
    projectionBand: "Per-branch / Shared Projection",
    gateBand: "Dependency Gate",
    fusionBand: "Conv Fusion & Residual",
    mergedMemory: "Multi-scale memory merge",
    vocabEmbedding: "Vocab Embedding",
    standardBlock0: "Block 0 (Standard)",
    engramBlock1: "Block 1 (with Engram)",
    standardBlock2: "Block 2 (Standard)",
    engramBlock15: "Block 15 (with Engram)",
    attention: "Attention",
    moe: "MoE",
    engramModules: "Engram Modules",
    embTable: "Embedding Table",
    valueProj: "Shared W_V Projection",
    keyProjs: "Per-branch W_K Projections",
    convWeights: "Short-conv Weights",
    normParams: "RMSNorm Parameters",
    rawForms: "Raw forms",
    canonicalForm: "Canonical ID",
    normalizationNote: "Illustrative: NFKC, accent removal, lowercasing, and whitespace normalization collapse equivalent tokens to one canonical form.",
    moduleOutput: "Engram delta",
    blockOutput: "Block state",
    // Timeline
    t0: "T0 Sequence Input",
    t1: "T1 Async Parallel Prefetch",
    t2: "T2 Comm & Sync",
    t3: "T3 Feature Fusion",
    t1Training: "T1 Local Addressing",
    t2Training: "T2 All-to-All Row Fetch",
    t3Training: "T3 Fusion & Continue",
    dataPrep: "Data Prep",
    calcHash: "Hash Calc & Lookup (T1)",
    pcieTx: "PCIe Async Transfer",
    precedingBlock: "Preceding Transformer compute window",
    gatedFusion: "Engram Gated Fusion",
    subsequentComp: "Subsequent Comp",
    hostLane: "CPU / Host",
    deviceLane: "GPU / Device",
    requestingRank: "Requesting Rank",
    tableShards: "GPU Table Shards",
    trainingHash: "Compute deterministic indices locally",
    allToAllFetch: "All-to-All active-row fetch",
    activeRows: "Local active embedding rows",
    gradientDispatch: "Backward gradient dispatch (outside this timeline)",
    inferenceBoundary: "Prefetch overlaps preceding compute. The GPU avoids waiting only when lookup plus PCIe latency fits inside that compute window.",
    trainingBoundary: "During training, tables are sharded across GPUs and active rows are fetched with All-to-All; backward also dispatches the corresponding gradients.",
    // Code Comments
    c1: "# 1. Extract multi-scale N-Gram context via sliding window",
    c2: "# 2. Deep Expansion: Multi-head XOR hash calculation",
    c3: "# Bitwise XOR mixing of tokens and random multipliers",
    c4: "# Parallel prime modulo across heads",
    c5: "# 3~4. Parallel table lookup to extract head vectors",
    c6: "# 5. Dimensional flattening & concatenation",
    c7: "# 6~7. Dependency modeling & dynamic gating",
    c8: "# 8. Cross-timestep smoothing & residual addition",
    c9: "# 9. Return the Engram delta; the Block applies the outer residual",
    codeBoundary: "Logically aligned with the official demo; implementations may pack logical tables into one offset-based MultiHeadEmbedding.",
    // Math
    p1Title: "Phase 1 Memory Routing & Feature Retrieval",
    p1Desc: "Obtain suffix N-Grams, locate memory slots via multi-head multiplicative XOR, and flatten directly without linear layers.",
    p2Title: "Phase 2 Dependency Modeling & Dynamic Gating",
    p2Desc: "Sliced by Hyper-Connection (HC). Bilateral RMSNorm and sgn(x)√|x| scaling are introduced to solve dot product explosion.",
    p2Where: "Where",
    p3Title: "Phase 3 Temporal Smoothing & State Fusion",
    p3Desc: "The gated sequence passes through intra-group RMSNorm, then into a short-context 1D conv for smoothing and residual addition.",
    phase1: "Phase 1",
    phase2: "Phase 2",
    phase3: "Phase 3",
  }
};

// 获取系统默认语言
const getInitialLang = () => {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.toLowerCase().includes('zh') ? 'zh' : 'en';
  }
  return 'en';
};

// --- 样式映射助手 ---
const resolveVisualStatus = (status, active) => status || (active ? 'active' : 'pending');
const isReachedStatus = (status) => status === 'active' || status === 'passed' || status === 'done';

const getTensorColors = (color, status) => {
  const visualStatus = typeof status === 'boolean' ? (status ? 'active' : 'pending') : status;
  const map = {
    blue: { layer1: 'bg-blue-300', layer2: 'bg-blue-400', main: 'bg-blue-600', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]' },
    purple: { layer1: 'bg-purple-300', layer2: 'bg-purple-400', main: 'bg-purple-600', shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)]' },
    emerald: { layer1: 'bg-emerald-300', layer2: 'bg-emerald-400', main: 'bg-emerald-600', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' },
    rose: { layer1: 'bg-rose-300', layer2: 'bg-rose-400', main: 'bg-rose-600', shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]' },
    indigo: { layer1: 'bg-indigo-300', layer2: 'bg-indigo-400', main: 'bg-indigo-600', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]' },
    amber: { layer1: 'bg-amber-300', layer2: 'bg-amber-400', main: 'bg-amber-600', shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.5)]' },
    slate: { layer1: 'bg-slate-200', layer2: 'bg-slate-300', main: 'bg-slate-400', shadow: 'shadow-none' },
  };
  const colors = isReachedStatus(visualStatus) ? map[color] : map.slate;
  return visualStatus === 'active' ? colors : { ...colors, shadow: 'shadow-none' };
};

const getLineColors = (color, status) => {
  const visualStatus = typeof status === 'boolean' ? (status ? 'active' : 'pending') : status;
  const map = {
    blue: { bg: 'bg-blue-400', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-400', text: 'text-purple-500' },
    emerald: { bg: 'bg-emerald-400', text: 'text-emerald-500' },
    rose: { bg: 'bg-rose-400', text: 'text-rose-500' },
    indigo: { bg: 'bg-indigo-400', text: 'text-indigo-500' },
    amber: { bg: 'bg-amber-400', text: 'text-amber-500' },
    slate: { bg: 'bg-slate-200', text: 'text-slate-300' },
  };
  return isReachedStatus(visualStatus) ? map[color] : map.slate;
};

// --- 可视化组件库 ---
const DimBadge = ({ text, active, status, posClasses }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const visible = isReachedStatus(visualStatus);
  return (
  <div className={`absolute ${posClasses} text-[9px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded transition-all duration-500 z-50 pointer-events-none
    ${visible ? 'text-slate-600 bg-slate-50/90 backdrop-blur-sm border border-slate-200 shadow-sm scale-100' : 'text-slate-300 scale-90 opacity-0'}`}>
    {text}
  </div>
  );
};

const LayeredTensor = ({ label, dim, color, active, status, left, top, wClass="w-12", hClass="h-16", textClass="text-lg", badgePos, dataNode }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const c = getTensorColors(color, visualStatus);
  return (
    <div data-node={dataNode} className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${visualStatus === 'active' ? 'scale-110' : visualStatus === 'passed' || visualStatus === 'done' ? 'scale-100 opacity-75' : 'scale-90 opacity-45'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass}`}>
          <div className={`absolute inset-0 ${c.layer1} rounded-md translate-x-2 translate-y-2 opacity-40 transition-colors duration-500`}></div>
          <div className={`absolute inset-0 ${c.layer2} rounded-md translate-x-1 translate-y-1 opacity-70 transition-colors duration-500`}></div>
          <div className={`absolute inset-0 ${c.main} rounded-md flex items-center justify-center text-white font-serif ${textClass} ${c.shadow} transition-colors duration-500`}>
             {label}
          </div>
       </div>
       <DimBadge text={dim} status={visualStatus} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const FlatTensor = ({ label, dim, color, active, status, left, top, wClass="w-12", hClass="h-16", textClass="text-[15px]", badgePos, dataNode }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const c = getTensorColors(color, visualStatus);
  return (
    <div data-node={dataNode} className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${visualStatus === 'active' ? 'scale-110' : visualStatus === 'passed' || visualStatus === 'done' ? 'scale-100 opacity-75' : 'scale-90 opacity-45'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass} ${c.main} rounded-md flex items-center justify-center text-white font-serif ${textClass} ${c.shadow} transition-colors duration-500`}>
          {label}
       </div>
       <DimBadge text={dim} status={visualStatus} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const SplicedFlatTensor = ({ label, dim, active, status, left, top, wClass="w-24", hClass="h-16", textClass="text-[15px]", badgePos, dataNode }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const reached = isReachedStatus(visualStatus);
  return (
    <div data-node={dataNode} className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${visualStatus === 'active' ? 'scale-110' : reached ? 'scale-100 opacity-75' : 'scale-90 opacity-45'}`} style={{ left, top, transform: `translate(-50%, -50%)` }}>
       <div className={`relative ${wClass} ${hClass} rounded-md flex items-center justify-center text-white font-serif ${textClass} overflow-hidden shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all duration-500`}>
          <div className={`absolute inset-y-0 left-0 w-1/2 ${reached ? 'bg-indigo-600' : 'bg-slate-400'} transition-colors duration-500`}></div>
          <div className={`absolute inset-y-0 right-0 w-1/2 ${reached ? 'bg-purple-600' : 'bg-slate-400'} transition-colors duration-500 border-l border-white/20`}></div>
          <span className="relative z-10 drop-shadow-md">{label}</span>
       </div>
       <DimBadge text={dim} status={visualStatus} posClasses={badgePos || "-bottom-6"} />
    </div>
  );
};

const OpNode = ({ label, subLabel, active, status, color="slate", left, top, isCircle=false, textClass="text-base", sizeClass, subLabelPos="bottom", dataNode }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const c = getLineColors(color, visualStatus);
  const currentBg = visualStatus === 'active'
    ? `border-${color}-400 bg-${color}-50 ${c.text} shadow-[0_0_10px_currentColor]`
    : isReachedStatus(visualStatus)
      ? `border-${color}-300 bg-${color}-50 ${c.text} opacity-75`
      : 'border-slate-200 bg-slate-50 text-slate-400';
  let posClass = "absolute -bottom-4 whitespace-nowrap";
  if (subLabelPos === "right") posClass = "absolute -right-3 translate-x-full whitespace-nowrap top-1/2 -translate-y-1/2";
  if (subLabelPos === "left") posClass = "absolute -left-3 -translate-x-full whitespace-nowrap top-1/2 -translate-y-1/2";
  if (subLabelPos === "top") posClass = "absolute -top-5 whitespace-nowrap";

  return (
    <div data-node={dataNode} className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20`} style={{ left, top, transform: `translate(-50%, -50%) scale(${visualStatus === 'active' ? 1.1 : visualStatus === 'pending' ? 0.9 : 1})` }}>
       <div className={`${sizeClass || (isCircle ? 'w-10 h-10 rounded-full' : 'px-3 py-1.5 rounded-lg')} ${isCircle ? 'rounded-full' : 'rounded-lg'} border-2 flex items-center justify-center font-bold transition-all duration-500 ${currentBg} ${textClass}`}>
          {label}
       </div>
       {subLabel && <span className={`${posClass} text-[9px] font-bold mt-1 transition-colors ${isReachedStatus(visualStatus) ? c.text : 'text-slate-400'}`}>{subLabel}</span>}
    </div>
  );
};

const VLine = ({ left, top, bottom, height, active, status, color }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const c = getLineColors(color, visualStatus);
  return <div className={`absolute w-0.5 transition-all duration-500 z-0 ${isReachedStatus(visualStatus) ? `${c.bg} ${visualStatus === 'active' ? 'shadow-[0_0_5px_currentColor]' : 'opacity-60'}` : 'bg-slate-200'}`} style={{ left, top, bottom, height, transform: 'translateX(-50%)' }} />
};
const HLine = ({ left, right, top, width, active, status, color }) => {
  const visualStatus = resolveVisualStatus(status, active);
  const c = getLineColors(color, visualStatus);
  return <div className={`absolute h-0.5 transition-all duration-500 z-0 ${isReachedStatus(visualStatus) ? `${c.bg} ${visualStatus === 'active' ? 'shadow-[0_0_5px_currentColor]' : 'opacity-60'}` : 'bg-slate-200'}`} style={{ left, right, top, width, transform: 'translateY(-50%)' }} />
};
const Arrow = ({ left, top, dir, active, status, color }) => {
  const icons = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight };
  const Icon = icons[dir];
  const c = getLineColors(color, resolveVisualStatus(status, active));
  return <Icon size={16} className={`absolute z-10 transition-colors duration-500 ${c.text}`} style={{ left, top, transform: 'translate(-50%, -50%)' }} />
};

const CodeLine = ({ active, indent=0, children, num }) => (
  <div className={`font-mono text-[11px] md:text-[12px] leading-relaxed py-[2px] border-l-[3px] transition-colors duration-300 flex ${active ? 'bg-blue-500/20 border-blue-400 text-blue-100 shadow-[inset_0_0_10px_rgba(59,130,246,0.15)]' : 'border-transparent text-slate-400'}`}>
     <span className="text-slate-600 select-none w-6 text-right pr-2 shrink-0">{num}</span>
     <div style={{ paddingLeft: `${indent * 1.2}rem` }} className="flex-1 whitespace-pre-wrap">
       {children}
     </div>
  </div>
);

const stageClass = (status, activeClasses, passedClasses, pendingClasses) => {
  if (status === 'active') return activeClasses;
  if (status === 'passed' || status === 'done') return passedClasses;
  return pendingClasses;
};

const TIMELINE_COLORS = {
  slate: ['bg-slate-600 border-slate-500 text-white', 'bg-slate-100 border-slate-200 text-slate-400'],
  rose: ['bg-rose-500 border-rose-400 text-white', 'bg-rose-100 border-rose-200 text-rose-400'],
  purple: ['bg-purple-500 border-purple-400 text-white', 'bg-purple-100 border-purple-200 text-purple-400'],
  indigo: ['bg-indigo-500 border-indigo-400 text-white', 'bg-indigo-100 border-indigo-200 text-indigo-400'],
  amber: ['bg-amber-500 border-amber-400 text-white', 'bg-amber-100 border-amber-200 text-amber-500'],
  blue: ['bg-blue-500 border-blue-400 text-white', 'bg-blue-100 border-blue-200 text-blue-400'],
  emerald: ['bg-emerald-500 border-emerald-400 text-white', 'bg-emerald-100 border-emerald-200 text-emerald-500'],
};

const TimelineSegment = ({ status, color, grow, children }) => {
  const [activeClasses, passedClasses] = TIMELINE_COLORS[color];
  return (
    <div
      className={`rounded border flex items-center justify-center text-[10px] text-center px-1 font-bold transition-all duration-500 ${stageClass(
        status,
        `${activeClasses} shadow-[0_0_10px_rgba(59,130,246,0.25)] scale-[1.02] z-10`,
        `${passedClasses} opacity-80`,
        'bg-transparent border-dashed border-slate-200 text-transparent',
      )}`}
      style={{ flexGrow: grow, flexBasis: 0 }}
    >
      {children}
    </div>
  );
};

const App = () => {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideIdx, setSlideIdx] = useState(2);
  const [systemMode, setSystemMode] = useState('inference');
  const [lang, setLang] = useState(getInitialLang());
  
  const t = (key) => i18n[lang][key] || key;
  const snapshot = useMemo(
    () => deriveEngramSnapshot({ step, tokenIndex: slideIdx, systemMode }),
    [step, slideIdx, systemMode],
  );
  const { phase } = snapshot;
  const tokens = ENGRAM_TOKENS;

  useEffect(() => {
    if (phase === 'done') {
      if (isPlaying) setIsPlaying(false);
      return undefined;
    }
    if (!isPlaying) return undefined;
    const delays = [0, 1600, 1800, 1400, 1400, 1400, 1700, 1800, 1800, 2000];
    const timer = setTimeout(() => {
      const next = advanceEngramState({ step, tokenIndex: slideIdx, systemMode });
      setStep(next.step);
      setSlideIdx(next.tokenIndex);
      if (next.step === step && next.tokenIndex === slideIdx) setIsPlaying(false);
    }, delays[Math.min(step + 1, ENGRAM_MAX_STEP)] || 1600);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, step, slideIdx, systemMode]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (phase === 'done') {
      setSlideIdx(2);
      setStep(1);
    } else if (step === 0) {
      setStep(1);
    } else if (step === ENGRAM_MAX_STEP) {
      const next = advanceEngramState({ step, tokenIndex: slideIdx, systemMode });
      setStep(next.step);
      setSlideIdx(next.tokenIndex);
    }
    setIsPlaying(true);
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    if (phase === 'done') return;
    const next = advanceEngramState({ step, tokenIndex: slideIdx, systemMode });
    setStep(next.step);
    setSlideIdx(next.tokenIndex);
  };

  const reset = () => {
    setIsPlaying(false);
    setStep(0);
    setSlideIdx(2);
  };

  const getStepDesc = () => {
    return t(`step${step}`);
  };

  const toggleLang = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  const isEmbActive = snapshot.topology.embedding === 'active';
  const isProjActive = snapshot.topology.projections === 'active';
  const isNormActive = snapshot.topology.norms === 'active';
  const isConvActive = snapshot.topology.convolution === 'active';
  const isVocabActive = snapshot.topology.vocab === 'active';
  const isBlock0Active = snapshot.topology.precedingBlock === 'active';
  const isBlock1Active = snapshot.topology.engramBlock === 'active';
  const isBlock2Active = snapshot.topology.subsequentBlock === 'active';
  const isBlock15Active = snapshot.topology.subsequentBlock === 'active';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4 sm:px-6 md:px-8 overflow-x-hidden">
      <div className="max-w-[120rem] mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold flex items-start sm:items-center gap-2 text-slate-900 leading-tight">
              <Database className="text-purple-600 shrink-0" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto" data-testid="engram-global-controls">
             <button onClick={toggleLang} aria-label={t('langToggle')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition font-bold text-sm shadow-sm whitespace-nowrap">
                <Globe size={16} /> {t('langToggle')}
             </button>
             <button type="button" onClick={reset} aria-label={t('reset')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200" title={t('reset')}>
                <RotateCcw size={18} />
             </button>
             <button type="button" onClick={togglePlay} aria-label={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} title={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition hover:bg-blue-700">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
             </button>
             <button type="button" onClick={handleNextStep} disabled={phase === 'done'} aria-label={phase === 'done' ? t('completed') : t('next')} title={phase === 'done' ? t('completed') : t('next')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-700">
                <SkipForward size={18} />
             </button>
          </div>
        </div>

        {/* 第一行：并排三模块（拓扑 : 张量流 : 伪代码） */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* 1. 网络拓扑结构 (自上而下翻转) */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center mb-4 pb-3 border-b border-slate-100">
               <h2 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800 whitespace-nowrap">
                 <Network className="text-indigo-500 shrink-0" size={20}/> 
                 {t('topoTitle')}
               </h2>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-start w-full relative pt-2">
              
              {/* Input Tokens */}
              <div className="flex gap-1 justify-center w-full flex-wrap px-1">
                {tokens.map((t_str, i) => {
                  const isCurrentToken = step > 0 && i === slideIdx;
                  return (
                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded transition-all duration-300 border
                      ${isCurrentToken ? 'bg-rose-500 border-rose-600 text-white shadow-md scale-110 font-bold z-10' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {t_str === '[BOS]' ? 'BOS' : t_str}
                    </span>
                  )
                })}
              </div>

              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              <div className={`w-full text-[11px] font-bold py-2 rounded text-center transition-all duration-500 border
                 ${isVocabActive ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-[0_0_10px_rgba(244,63,94,0.4)] ring-1 ring-rose-300 scale-105 opacity-100' : 'bg-rose-50 border-rose-200 text-rose-700 opacity-80'}`}>
                {t('vocabEmbedding')}
              </div>
              
              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              {/* Block 0 (Standard) */}
              <div className={`w-full border rounded-xl p-2 mb-1.5 transition-all duration-500
                 ${isBlock0Active ? 'bg-slate-50 border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.4)] ring-1 ring-slate-300 scale-105 opacity-100' : 'bg-slate-50 border-slate-200 shadow-sm opacity-70'}`}>
                  <div className={`text-[10px] font-bold mb-1 text-center transition-colors ${isBlock0Active ? 'text-slate-700' : 'text-slate-500'}`}>{t('standardBlock0')}</div>
                  <div className="flex gap-1">
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock0Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>{t('attention')}</div>
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock0Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>{t('moe')}</div>
                  </div>
              </div>

              <ArrowDown className="text-slate-400 mb-1.5" size={14}/>

              {/* Block 1 (w/ Engram) */}
              <div className={`border-2 rounded-xl p-2.5 w-full relative transition-all duration-500
                 ${isBlock1Active ? 'border-purple-400 bg-purple-50 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-[1.02] opacity-100' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div className={`text-[11px] font-bold mb-2 text-center flex items-center justify-center gap-1 transition-colors whitespace-nowrap
                   ${isBlock1Active ? 'text-purple-800' : 'text-slate-500'}`}>
                   <Server size={12}/> {t('engramBlock1')}
                </div>

                <div className={`border rounded-lg p-2 shadow-inner transition-all duration-500 relative
                   ${isBlock1Active ? 'border-purple-300 bg-white' : 'border-slate-200 bg-slate-100/50'}`}>
                   <div className={`text-[10px] font-bold text-center mb-1.5 border-b pb-1 flex items-center justify-center gap-1 transition-colors whitespace-nowrap
                      ${isBlock1Active ? 'text-purple-700 border-purple-100' : 'text-slate-400 border-slate-200'}`}>
                     <BrainCircuit size={10}/> {t('engramModules')}
                   </div>
                   <div className="grid grid-cols-2 gap-1.5 text-[8px] xl:text-[8.5px] font-mono font-bold">
                      <div className={`transition-all duration-300 p-1 rounded text-center flex items-center justify-center whitespace-nowrap ${isEmbActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)] scale-105 z-10' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`} title="MultiHeadEmbedding">{t('embTable')}</div>
                      <div className={`transition-all duration-300 p-1 rounded text-center flex items-center justify-center whitespace-nowrap ${isProjActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-105 z-10' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`} title="value_proj">{t('valueProj')}</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center leading-tight whitespace-nowrap ${isProjActive ? 'bg-amber-600 text-white border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.5)] scale-105 z-10' : 'bg-amber-50 border border-amber-200 text-amber-700'}`} title="key_projs (ModuleList)">{t('keyProjs')}</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center leading-tight whitespace-nowrap ${isConvActive ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] scale-105 z-10' : 'bg-blue-50 border border-blue-200 text-blue-700'}`} title="short_conv">{t('convWeights')}</div>
                      <div className={`col-span-2 transition-all duration-300 p-1 rounded text-center flex items-center justify-center whitespace-nowrap ${isNormActive ? 'bg-slate-700 text-white border-slate-700 shadow-[0_0_10px_rgba(51,65,85,0.5)] scale-105 z-10' : 'bg-slate-50 border border-slate-200 text-slate-600'}`} title="norm1 & norm2">{t('normParams')}</div>
                   </div>
                </div>
                <ArrowDown className="text-purple-300 mx-auto my-1" size={12}/>
                <div className="flex gap-1">
                   <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center shadow-sm transition-colors ${isBlock1Active ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{t('attention')}</div>
                   <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center shadow-sm transition-colors ${isBlock1Active ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{t('moe')}</div>
                </div>
              </div>

              <ArrowDown className="text-slate-400 my-1.5" size={14}/>

              {/* Block 2 (Standard) */}
              <div className={`w-full border rounded-xl p-2 mb-1.5 transition-all duration-500
                 ${isBlock2Active ? 'bg-slate-50 border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.4)] ring-1 ring-slate-300 scale-105 opacity-100' : 'bg-slate-50 border-slate-200 shadow-sm opacity-70'}`}>
                  <div className={`text-[10px] font-bold mb-1 text-center transition-colors ${isBlock2Active ? 'text-slate-700' : 'text-slate-500'}`}>{t('standardBlock2')}</div>
                  <div className="flex gap-1">
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock2Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>{t('attention')}</div>
                      <div className={`flex-1 text-[9px] font-bold py-1 rounded text-center transition-colors ${isBlock2Active ? 'bg-amber-50 border border-amber-400 text-amber-800 shadow-sm' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>{t('moe')}</div>
                  </div>
              </div>

              <div className="text-slate-300 text-lg leading-none my-1">⋮</div>

              <div className={`w-full border border-dashed rounded-lg p-1.5 mb-1 transition-all duration-500
                 ${isBlock15Active ? 'bg-purple-50 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] ring-1 ring-purple-300 scale-105 opacity-100' : 'bg-purple-50/50 border-purple-200 opacity-80'}`}>
                <div className={`text-[10px] font-bold text-center transition-colors ${isBlock15Active ? 'text-purple-700' : 'text-purple-500'}`}>{t('engramBlock15')}</div>
              </div>
              <div className="mt-2 text-[9px] leading-snug text-center text-slate-400">{t('demoConfig')}</div>
            </div>
          </div>

          {/* 2. Engram微观张量流图 (自上而下翻转) */}
          <div
            className="xl:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-x-auto overflow-y-hidden"
            data-testid="engram-tensor-flow"
            data-operation={snapshot.operation}
            data-phase={phase}
          >
           <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 min-w-[700px]">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
               <BrainCircuit className="text-purple-600" size={20}/>
               {t('flowTitle')}
             </h2>
             <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full font-bold border border-purple-200 shadow-sm transition-all duration-300">
               {getStepDesc()}
             </span>
           </div>

           <div className="xl:hidden sticky left-0 w-fit mb-3 flex items-center gap-2 text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 z-50 shadow-sm">
             <ArrowRight size={13} className="text-purple-500"/> {t('scrollHint')}
           </div>

           {/* 全局维度图例 */}
           <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center bg-slate-100 p-2 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 mb-6 w-full max-w-4xl mx-auto shadow-inner min-w-[700px]">
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">B</span> {t('batchSize')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">L</span> {t('seqLen')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">D</span> {t('hiddenDim')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">HC</span> {t('hyperConn')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">E_D</span> {t('engramDim')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">D_h</span> {t('headDim')}</div>
             <div className="flex items-center gap-1.5"><span className="bg-slate-800 text-white px-1 rounded text-[9px]">Vocab</span> {t('hashSize')}</div>
           </div>

           <div className="flex-1 flex flex-col items-center relative w-full min-w-[700px]">
             
             {/* ======================================================= */}
             {/* [层层下落] 1：Tokenizer 压缩与滑动窗口 */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl p-4 transition-all duration-700 relative z-20 bg-white
                ${stageClass(snapshot.stageStatus.extract, 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.18)]', 'border-blue-200 shadow-sm opacity-80', 'border-slate-200 opacity-60')}`}>
                
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-40">
                  {t('tokenizerCompression')}
                </div>

                <div className="flex items-center justify-end mb-3">
                  {step >= 1 && <MathFormula className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 shadow-sm">{String.raw`g_{t,n}=(x'_{t-n+1},\ldots,x'_t)`}</MathFormula>}
                </div>

                <div className={`mb-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center rounded-xl border p-3 transition-all ${snapshot.stageStatus.extract === 'active' ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-50/70'}`} data-testid="tokenizer-compression-evidence">
                  <div>
                    <div className="text-[9px] uppercase tracking-wide font-bold text-slate-400 mb-1.5">{t('rawForms')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {snapshot.tokenizerExample.rawForms.map((form) => (
                        <span key={form} className="font-mono text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600">{JSON.stringify(form)}</span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-blue-500"/>
                  <div>
                    <div className="text-[9px] uppercase tracking-wide font-bold text-slate-400 mb-1.5">{t('canonicalForm')}</div>
                    <span className="inline-flex font-mono text-[10px] px-2 py-1 rounded bg-blue-600 text-white border border-blue-700 shadow-sm">{snapshot.tokenizerExample.normalizedToken}</span>
                  </div>
                  <p className="col-span-3 text-[9px] leading-relaxed text-slate-500 border-t border-slate-200 pt-2">{t('normalizationNote')}</p>
                </div>

                <div className="flex w-full max-w-3xl mx-auto relative px-2 pb-4">
                   {tokens.map((tok, i) => {
                     const isTarget = i === slideIdx;
                     const is2Gram = i > slideIdx - 2 && i <= slideIdx;
                     const is3Gram = i > slideIdx - 3 && i <= slideIdx;
                     return (
                        <div key={i} className="flex-1 flex flex-col items-center relative">
                           {/* 3-Gram Context Flowing ABOVE */}
                           <div className="h-6 w-full relative mb-1.5">
                              {is3Gram && (
                                <div className={`absolute bottom-0 w-full h-1.5 bg-indigo-200 ${i === slideIdx - 2 ? 'rounded-l-md' : ''} ${i === slideIdx ? 'rounded-r-md' : ''}`}></div>
                              )}
                              {i === slideIdx - 1 && is3Gram && (
                                <span className="absolute bottom-2 w-[200%] left-1/2 -translate-x-1/2 text-center text-[9px] font-bold text-indigo-600 whitespace-nowrap">3-{t('gramContext')}</span>
                              )}
                           </div>

                           <div className={`px-2 py-2 w-[95%] text-center rounded-lg border transition-all duration-300 font-mono text-[11px] md:text-xs z-10
                              ${isTarget ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold shadow-[0_0_10px_rgba(251,113,133,0.4)] scale-110' :
                                (is2Gram || is3Gram) ? 'bg-blue-50 border-indigo-300 text-slate-800 shadow-sm' :
                                'bg-slate-50 border-slate-200 text-slate-400'}`}>
                              {tok}
                              {isTarget && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] px-1.5 py-[1px] rounded shadow-sm">t</div>}
                           </div>
                           
                           {/* 2-Gram Context Flowing BELOW */}
                           <div className="h-6 w-full relative mt-1.5">
                              {is2Gram && (
                                <div className={`absolute top-0 w-full h-1.5 bg-purple-200 ${i === slideIdx - 1 ? 'rounded-l-md' : ''} ${i === slideIdx ? 'rounded-r-md' : ''}`}></div>
                              )}
                              {i === slideIdx && is2Gram && (
                                <span className="absolute top-2 w-[200%] right-1/2 translate-x-1/2 text-center text-[9px] font-bold text-purple-600">2-{t('gram')}</span>
                              )}
                           </div>
                        </div>
                     );
                   })}
                </div>
             </div>

             {/* BRIDGE 0：Tokenizer 向下输出 */}
             <div className="w-full max-w-4xl relative h-10 z-0">
                <VLine left="25%" top="0" height="100%" status={snapshot.stageStatus.hash} color="indigo" />
                <Arrow left="25%" top="20px" dir="down" status={snapshot.stageStatus.hash} color="indigo" />
                <DimBadge text="[B, L]" status={snapshot.stageStatus.hash} posClasses="left-[26%] top-1/2 -translate-y-1/2" />

                <VLine left="75%" top="0" height="100%" status={snapshot.stageStatus.hash} color="purple" />
                <Arrow left="75%" top="20px" dir="down" status={snapshot.stageStatus.hash} color="purple" />
                <DimBadge text="[B, L]" status={snapshot.stageStatus.hash} posClasses="left-[76%] top-1/2 -translate-y-1/2" />
             </div>

             {/* ======================================================= */}
             {/* [层层下落] 2：多头哈希稀疏检索 (倒置翻转) */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl px-2 py-5 transition-all duration-700 relative z-20
                ${step >= 2 ? 'bg-slate-50 border-indigo-200 shadow-md' : 'bg-slate-50/50 border-slate-200 opacity-50'}`}>
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-30">
                  {t('multiHeadHash')}
                </div>

                <div className="flex w-full mt-3">
                  {[
                    { title: `2-${t('gram')} ${t('channel')}`, n: 2, color: "indigo" },
                    { title: `3-${t('gram')} ${t('channel')}`, n: 3, color: "purple" },
                  ].map((item, idx) => {
                    const hashStatus = snapshot.stageStatus.hash;
                    const tableStatus = snapshot.stageStatus.lookup;
                    const vectorStatus = snapshot.stageStatus.retrieve;
                    const concatStatus = snapshot.stageStatus.concatenate;
                    const hashReached = isReachedStatus(hashStatus);
                    const tableReached = isReachedStatus(tableStatus);
                    const vectorReached = isReachedStatus(vectorStatus);
                    const concatReached = isReachedStatus(concatStatus);
                    const tColor = getTensorColors(item.color, vectorStatus);
                    const lColor = getLineColors(item.color, hashReached ? 'passed' : 'pending');

                    return (
                      <div key={idx} className={`w-1/2 rounded-xl p-3 mx-3 shadow-sm flex flex-col items-center transition-all duration-500
                        ${hashStatus === 'active' ? `bg-${item.color}-50 border border-${item.color}-400 shadow-[0_0_10px_rgba(99,102,241,0.12)]` : hashReached ? `bg-${item.color}-50 border border-${item.color}-200 opacity-85` : 'bg-white border border-slate-200 opacity-50'}`}>
                         <div className={`text-xs font-bold mb-3 transition-colors ${hashReached ? lColor.text : 'text-slate-500'}`}>{item.title}</div>
                         
                         {/* ====== 顶部：倒置重构的哈希管道层 ====== */}
                         <div className="w-full flex flex-col relative mt-1 mb-2">
                            {/* 1. H Index 层 (接受上面下来的输入) */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`h-${k}`} className={`relative flex-1 py-1 text-center rounded border text-[8px] font-bold transition-all duration-500 ${hashStatus === 'active' ? `bg-${item.color}-100 border-${item.color}-400 ${lColor.text} shadow-sm scale-110` : hashReached ? `bg-${item.color}-50 border-${item.color}-200 ${lColor.text} opacity-75` : 'bg-white border-slate-300 text-slate-400'}`}>
                                    H{k+1}
                                  </div>
                              ))}
                            </div>

                            {/* 2. 中间共用的 Hash 公式层 */}
                            <div className="relative w-full flex justify-center my-2 z-20">
                                <div className={`w-[95%] py-1 rounded flex items-center justify-center text-[9px] font-bold transition-all duration-500 border ${hashStatus === 'active' ? `bg-slate-800 text-${item.color}-200 border-${item.color}-400 shadow-[0_0_8px_rgba(0,0,0,0.6)] scale-105` : hashReached ? `bg-slate-800 text-${item.color}-200 border-${item.color}-300 opacity-75` : 'bg-slate-100 border-slate-300 text-slate-400 opacity-80'}`}>
                                   <MathFormula>{String.raw`h_{n,k}=\left(\bigoplus_{i=0}^{n-1}x'_{t-i}M_i\right)\bmod P_{n,k}`}</MathFormula>
                                </div>
                            </div>

                            {/* 3. Tabs 层 */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`tab-${k}`} className={`relative flex-1 py-1.5 text-center rounded border text-[6px] font-mono transition-all duration-500 ${tableStatus === 'active' ? `bg-slate-800 border-slate-700 text-${item.color}-200 shadow-[0_0_6px_rgba(0,0,0,0.5)] scale-105` : tableReached ? `bg-slate-700 border-slate-600 text-${item.color}-200 opacity-70` : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                                    T{k+1}
                                    {k === 0 && <DimBadge text="[Vocab,D_h]" status={tableStatus} posClasses="-left-[70px] top-1/2 -translate-y-1/2" />}
                                  </div>
                              ))}
                            </div>

                            {/* 连线 (向下至 Vector) */}
                            <div className="flex gap-1.5 w-full justify-between my-0.5">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`lv-${k}`} className="flex-1 flex justify-center">
                                     <div className={`h-2 w-0.5 transition-colors ${vectorReached ? tColor.main : 'bg-slate-300'} ${vectorStatus === 'passed' ? 'opacity-60' : ''}`}></div>
                                  </div>
                              ))}
                            </div>

                            {/* 4. Vectors 层 */}
                            <div className="flex gap-1.5 w-full justify-between z-10">
                              {Array.from({length: 8}).map((_, k) => (
                                  <div key={`vec-${k}`} className={`relative flex-1 h-6 rounded transition-all duration-500 ${vectorStatus === 'active' ? `${tColor.main} scale-110 shadow-sm` : vectorReached ? `${tColor.main} opacity-65` : 'bg-slate-300'}`}>
                                    {k === 0 && <DimBadge text="[B,L,D_h]" status={vectorStatus} posClasses="-left-[65px] top-1/2 -translate-y-1/2" />}
                                  </div>
                              ))}
                            </div>

                            {/* 连线 (向下至 Flatten) */}
                            <div className="flex w-[85%] justify-between mx-auto mt-2 relative">
                             {Array.from({length: 8}).map((_, k) => (
                               <ArrowDown key={k} size={12} className={`transition-colors duration-500 ${concatReached ? lColor.text : 'text-slate-300'} ${concatStatus === 'passed' ? 'opacity-60' : ''}`} />
                             ))}
                           </div>
                         </div>
                         
                         {/* ====== 底部：展平节点 (Flatten -> E_t) ====== */}
                         <div className="w-full flex flex-col items-center relative">
                           <div className={`relative w-[90%] flex items-center justify-center gap-1.5 bg-white border rounded py-1 shadow-sm z-10 transition-all duration-500 mb-0.5
                             ${concatStatus === 'active' ? `border-${item.color}-400 scale-105 shadow-[0_0_10px_currentColor] ${lColor.text}` : concatReached ? `border-${item.color}-200 ${lColor.text} opacity-70` : 'border-slate-300 text-slate-400'}`}>
                             <span className="text-[10px] font-bold"><FunctionSquare size={10} className="inline mr-1 -mt-0.5"/>{t('flatten')}</span>
                             <DimBadge text="[B, L, E_D]" status={concatStatus} posClasses="-right-16 top-1/2 -translate-y-1/2" />
                           </div>

                           <div className={`h-3 w-0.5 my-0.5 transition-colors ${concatReached ? getTensorColors(item.color, concatStatus).main : 'bg-slate-300'}`}></div>

                           <div className={`w-[80%] flex flex-col items-center transition-all duration-500 z-10 ${concatStatus === 'active' ? 'scale-110' : concatReached ? 'opacity-75' : 'opacity-45'}`}>
                             <div className={`flex gap-[2px] w-full h-4 shadow-sm p-[2px] border rounded transition-colors duration-500
                                ${concatReached ? `bg-white border-${item.color}-300` : 'bg-slate-100 border-slate-200'}`}>
                               {Array.from({length: 8}).map((_, i) => (
                                  <div key={i} className={`flex-1 rounded-[1px] transition-colors duration-500 ${concatReached ? getTensorColors(item.color, concatStatus).main : 'bg-slate-200'}`} />
                               ))}
                             </div>
                             <div className={`text-[12px] font-bold mt-1 transition-colors ${concatReached ? lColor.text : 'text-slate-400'}`}><MathFormula>{String.raw`E_{t,${item.n}}`}</MathFormula></div>
                           </div>
                         </div>
                      </div>
                    )
                  })}
                </div>
             </div>

             {/* BRIDGE 1：两个 N-Gram 通道先汇聚为同一个 E_t，再进入门控画布 */}
             <div className="w-full max-w-4xl relative h-20 z-40" data-testid="engram-retrieval-gate-bridge">
               <VLine left="25%" top="0" height="28px" status={snapshot.stageStatus.concatenate} color="indigo" />
               <HLine left="25%" width="25%" top="28px" status={snapshot.stageStatus.concatenate} color="indigo" />
               <VLine left="75%" top="0" height="28px" status={snapshot.stageStatus.concatenate} color="purple" />
               <HLine left="50%" width="25%" top="28px" status={snapshot.stageStatus.concatenate} color="purple" />
               <div
                 className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white px-3 py-1 text-center shadow-sm transition-all duration-500 ${snapshot.stageStatus.concatenate === 'active' ? 'border-purple-400 text-purple-700 scale-105' : isReachedStatus(snapshot.stageStatus.concatenate) ? 'border-purple-200 text-purple-600 opacity-80' : 'border-slate-200 text-slate-400 opacity-60'}`}
                 style={{ left: '50%', top: '36px' }}
                 data-node="memory-merge"
               >
                 <div className="text-[8px] font-bold leading-none mb-0.5">{t('mergedMemory')}</div>
                 <MathFormula>{String.raw`E_t=\operatorname{Concat}(E_{t,2},E_{t,3})`}</MathFormula>
               </div>
               <VLine left="50%" top="36px" height="44px" status={snapshot.stageStatus.concatenate} color="purple" />
               <Arrow left="50%" top="70px" dir="down" status={snapshot.stageStatus.concatenate} color="purple" />
             </div>

             {/* ======================================================= */}
             {/* [层层下落] 3: Context-aware Gating (翻转坐标系) */}
             {/* ======================================================= */}
             <div className={`w-full max-w-4xl border rounded-2xl px-2 py-6 transition-all duration-700 relative z-30
                ${stageClass(snapshot.stageStatus.project, 'bg-slate-50 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.16)]', 'bg-slate-50 border-blue-200 shadow-sm opacity-85', 'bg-slate-50/50 border-slate-200 opacity-40')}`}>
                
                <div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm z-40">
                  {t('gating')}
                </div>

                <div className="relative w-full h-[480px] mt-1" data-testid="engram-gating-canvas">
                    {/* 三条紧凑语义带：投影、门控、融合。背景只组织空间，不复制节点。 */}
                    <div className="absolute left-[2%] right-[2%] top-[76px] h-[142px] rounded-xl border border-dashed border-amber-200 bg-white/65 z-0" />
                    <div className="absolute left-[2%] right-[2%] top-[224px] h-[108px] rounded-xl border border-dashed border-rose-200 bg-white/65 z-0" />
                    <div className="absolute left-[2%] right-[2%] top-[338px] h-[104px] rounded-xl border border-dashed border-indigo-200 bg-white/65 z-0" />
                    <div className="absolute left-[4%] top-[82px] z-10 text-[8px] font-bold uppercase tracking-wide text-amber-600">{t('projectionBand')}</div>
                    <div className="absolute left-[4%] top-[230px] z-10 text-[8px] font-bold uppercase tracking-wide text-rose-600">{t('gateBand')}</div>
                    <div className="absolute left-[4%] top-[344px] z-10 text-[8px] font-bold uppercase tracking-wide text-indigo-600">{t('fusionBand')}</div>
                    <div data-node="gate-transform" className="absolute left-[60%] top-[229px] z-10 -translate-x-1/2 rounded bg-white px-2 py-0.5 text-rose-600 shadow-sm whitespace-nowrap">
                      <MathFormula>{String.raw`\operatorname{sgn}(x)\sqrt{|x|}\;\rightarrow\;\sigma`}</MathFormula>
                    </div>

                    {/* E_t 从上方 merge bus 连续进入；H_in 保持独立 residual trunk。 */}
                    <VLine left="50%" top="0" height="14px" status={snapshot.stageStatus.concatenate} color="purple" />
                    <Arrow left="50%" top="8px" dir="down" status={snapshot.stageStatus.concatenate} color="purple" />
                    <VLine left="12%" top="42px" height="330px" status={snapshot.stageStatus.integrate} color="blue" />
                    <Arrow left="12%" top="184px" dir="down" status={snapshot.stageStatus.integrate} color="blue" />

                    {/* E_t 扇出到 per-branch W_K 与 shared W_V。 */}
                    <VLine left="50%" top="42px" height="46px" status={snapshot.stageStatus.project} color="purple" />
                    <HLine left="42%" width="34%" top="88px" status={snapshot.stageStatus.project} color="purple" />
                    <VLine left="42%" top="88px" height="34px" status={snapshot.stageStatus.project} color="amber" />
                    <Arrow left="42%" top="106px" dir="down" status={snapshot.stageStatus.project} color="amber" />
                    <VLine left="76%" top="88px" height="34px" status={snapshot.stageStatus.project} color="emerald" />
                    <Arrow left="76%" top="106px" dir="down" status={snapshot.stageStatus.project} color="emerald" />
                    <HLine left="28%" width="14%" top="122px" status={snapshot.stageStatus.project} color="amber" />
                    <Arrow left="36%" top="122px" dir="right" status={snapshot.stageStatus.project} color="amber" />
                    <HLine left="76%" width="14%" top="122px" status={snapshot.stageStatus.project} color="emerald" />
                    <Arrow left="82%" top="122px" dir="left" status={snapshot.stageStatus.project} color="emerald" />
                    <VLine left="42%" top="122px" height="70px" status={snapshot.stageStatus.project} color="amber" />
                    <Arrow left="42%" top="160px" dir="down" status={snapshot.stageStatus.project} color="amber" />
                    <VLine left="76%" top="122px" height="70px" status={snapshot.stageStatus.project} color="emerald" />
                    <Arrow left="76%" top="160px" dir="down" status={snapshot.stageStatus.project} color="emerald" />

                    {/* H_in 与 K_t 双侧归一化后产生 alpha_t。 */}
                    <HLine left="12%" width="10%" top="252px" status={snapshot.stageStatus.gate} color="blue" />
                    <Arrow left="18%" top="252px" dir="right" status={snapshot.stageStatus.gate} color="blue" />
                    <VLine left="42%" top="192px" height="60px" status={snapshot.stageStatus.gate} color="amber" />
                    <Arrow left="42%" top="224px" dir="down" status={snapshot.stageStatus.gate} color="amber" />
                    <HLine left="22%" width="10%" top="252px" status={snapshot.stageStatus.gate} color="rose" />
                    <Arrow left="28%" top="252px" dir="right" status={snapshot.stageStatus.gate} color="rose" />
                    <HLine left="32%" width="10%" top="252px" status={snapshot.stageStatus.gate} color="rose" />
                    <Arrow left="36%" top="252px" dir="left" status={snapshot.stageStatus.gate} color="rose" />
                    <VLine left="32%" top="252px" height="58px" status={snapshot.stageStatus.gate} color="rose" />
                    <Arrow left="32%" top="282px" dir="down" status={snapshot.stageStatus.gate} color="rose" />

                    {/* alpha_t 广播到 V_t；门控输出再经过 Conv1D 并汇入 residual。 */}
                    <HLine left="32%" width="44%" top="310px" status={snapshot.stageStatus.gate} color="rose" />
                    <Arrow left="61%" top="310px" dir="right" status={snapshot.stageStatus.gate} color="rose" />
                    <VLine left="76%" top="192px" height="118px" status={snapshot.stageStatus.gate} color="emerald" />
                    <Arrow left="76%" top="258px" dir="down" status={snapshot.stageStatus.gate} color="emerald" />
                    <VLine left="76%" top="310px" height="62px" status={snapshot.stageStatus.gate} color="emerald" />
                    <Arrow left="76%" top="342px" dir="down" status={snapshot.stageStatus.gate} color="emerald" />
                    <HLine left="48%" width="28%" top="372px" status={snapshot.stageStatus.shortConv} color="emerald" />
                    <Arrow left="62%" top="372px" dir="left" status={snapshot.stageStatus.shortConv} color="emerald" />
                    <HLine left="12%" width="36%" top="372px" status={snapshot.stageStatus.integrate} color="indigo" />
                    <Arrow left="29%" top="372px" dir="left" status={snapshot.stageStatus.integrate} color="indigo" />
                    <VLine left="12%" top="372px" height="70px" status={snapshot.stageStatus.integrate} color="blue" />
                    <Arrow left="12%" top="408px" dir="down" status={snapshot.stageStatus.integrate} color="blue" />

                    {/* 张量实体与算子层 */}
                    <LayeredTensor dataNode="h-in" label={<MathFormula>{String.raw`H_{\mathrm{in}}`}</MathFormula>} dim="[B, L, HC, D]" color="blue" status={snapshot.stageStatus.project} left="12%" top="42px" wClass="w-10" hClass="h-12" textClass="text-sm" badgePos="-top-6 left-1/2 -translate-x-1/2" />
                    <SplicedFlatTensor dataNode="e-t" label={<MathFormula>{String.raw`E_t`}</MathFormula>} dim="[B, L, E_D]" status={snapshot.stageStatus.concatenate} left="50%" top="42px" wClass="w-24" hClass="h-12" textClass="text-[13px]" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />

                    <LayeredTensor dataNode="w-k" label={<MathFormula>{String.raw`W_K`}</MathFormula>} dim="[HC, E_D, D]" color="amber" status={snapshot.stageStatus.project} left="28%" top="122px" wClass="w-10" hClass="h-16" textClass="text-sm" badgePos="-left-[85px] top-1/2 -translate-y-1/2" />
                    <OpNode dataNode="matmul-k" label={<MathFormula>{String.raw`\otimes`}</MathFormula>} subLabel={t('matmul')} subLabelPos="right" isCircle sizeClass="w-8 h-8" status={snapshot.stageStatus.project} color="amber" left="42%" top="122px" textClass="text-base" />
                    <OpNode dataNode="matmul-v" label={<MathFormula>{String.raw`\otimes`}</MathFormula>} subLabel={t('matmul')} subLabelPos="left" isCircle sizeClass="w-8 h-8" status={snapshot.stageStatus.project} color="emerald" left="76%" top="122px" textClass="text-base" />
                    <FlatTensor dataNode="w-v" label={<MathFormula>{String.raw`W_V`}</MathFormula>} dim="[E_D, D]" color="emerald" status={snapshot.stageStatus.project} left="90%" top="122px" wClass="w-10" hClass="h-16" textClass="text-sm" badgePos="-right-[65px] top-1/2 -translate-y-1/2" />

                    <LayeredTensor dataNode="k-t" label={<MathFormula>{String.raw`K_t`}</MathFormula>} dim="[B, L, HC, D]" color="amber" status={snapshot.stageStatus.project} left="42%" top="192px" wClass="w-10" hClass="h-12" textClass="text-sm" badgePos="-left-[85px] top-1/2 -translate-y-1/2" />
                    <FlatTensor dataNode="v-t" label={<MathFormula>{String.raw`V_t`}</MathFormula>} dim="[B, L, D]" color="emerald" status={snapshot.stageStatus.project} left="76%" top="192px" wClass="w-10" hClass="h-12" textClass="text-sm" badgePos="-right-[65px] top-1/2 -translate-y-1/2" />

                    <OpNode dataNode="norm-h" label="RMSNorm" status={snapshot.stageStatus.gate} color="blue" left="22%" top="252px" sizeClass="px-2 py-1" textClass="text-[8px]" />
                    <OpNode dataNode="gate-score" label={<MathFormula>{String.raw`\sum`}</MathFormula>} isCircle sizeClass="w-8 h-8" status={snapshot.stageStatus.gate} color="rose" left="32%" top="252px" textClass="text-base" />
                    <OpNode dataNode="norm-k" label="RMSNorm" status={snapshot.stageStatus.gate} color="amber" left="42%" top="252px" sizeClass="px-2 py-1" textClass="text-[8px]" />

                    <LayeredTensor dataNode="alpha-t" label={<MathFormula>{String.raw`\alpha_t`}</MathFormula>} dim="[B, L, HC, 1]" color="rose" status={snapshot.stageStatus.gate} left="32%" top="310px" wClass="w-5" hClass="h-9" textClass="text-xs" badgePos="-left-[80px] top-1/2 -translate-y-1/2" />
                    <OpNode dataNode="broadcast-gate" label={<MathFormula>{String.raw`\times`}</MathFormula>} subLabel={t('broadcast')} subLabelPos="right" isCircle sizeClass="w-8 h-8" status={snapshot.stageStatus.gate} color="emerald" left="76%" top="310px" textClass="text-base" />

                    <LayeredTensor dataNode="v-tilde" label={<MathFormula>{String.raw`\widetilde{V}_t`}</MathFormula>} dim="[B, L, HC, D]" color="emerald" status={snapshot.stageStatus.gate} left="76%" top="372px" wClass="w-10" hClass="h-12" textClass="text-sm" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />

                    <div data-node="short-conv" className={`absolute flex flex-col items-center justify-center transition-all duration-500 z-20 ${snapshot.stageStatus.shortConv === 'active' ? 'scale-110' : isReachedStatus(snapshot.stageStatus.shortConv) ? 'scale-100 opacity-75' : 'scale-90 opacity-50'}`} style={{ left: '48%', top: '372px', transform: 'translate(-50%, -50%)' }}>
                       <div className={`w-28 h-10 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${snapshot.stageStatus.shortConv === 'active' ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : isReachedStatus(snapshot.stageStatus.shortConv) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-400 shadow-none'}`}>
                          <div className="flex gap-1 mb-0.5">
                             <span className={`text-[8px] px-1 py-0.5 rounded ${isReachedStatus(snapshot.stageStatus.shortConv) ? 'bg-indigo-400 text-white' : 'bg-slate-200 text-slate-500'}`}>RMSNorm</span>
                             <span className={`text-[8px] px-1 py-0.5 rounded ${isReachedStatus(snapshot.stageStatus.shortConv) ? 'bg-indigo-400 text-white' : 'bg-slate-200 text-slate-500'}`}>SiLU</span>
                          </div>
                          <span className="text-[10px] font-bold"><Activity size={9} className="inline mr-1 -mt-0.5"/>Conv1D</span>
                       </div>
                       <div className="absolute -top-5 text-[8px] font-bold whitespace-nowrap text-indigo-500">{t('moduleOutput')}</div>
                       <DimBadge text="[B, L, HC, D]" status={snapshot.stageStatus.shortConv} posClasses="-bottom-6 left-1/2 -translate-x-1/2" />
                    </div>

                    <OpNode dataNode="residual-add" label="+" subLabel={t('residual')} subLabelPos="left" isCircle sizeClass="w-8 h-8" status={snapshot.stageStatus.integrate} color="blue" left="12%" top="372px" textClass="text-base" />
                    <LayeredTensor dataNode="h-block" label={<MathFormula>{String.raw`H_{\mathrm{block}}`}</MathFormula>} dim="[B, L, HC, D]" color="blue" status={snapshot.stageStatus.integrate} left="12%" top="442px" wClass="w-10" hClass="h-12" textClass="text-sm" badgePos="-right-[85px] top-1/2 -translate-y-1/2" />
                    <div className="absolute text-[8px] font-bold text-blue-500 whitespace-nowrap" style={{ left: '12%', top: '474px', transform: 'translateX(-50%)' }}>{t('blockOutput')}</div>
                </div>
             </div>

           </div>
          </div>

          {/* 3. Engram 伪代码深度展开 */}
          <div className="xl:col-span-3 bg-[#1E1E1E] rounded-2xl border border-slate-700 shadow-xl flex flex-col overflow-hidden h-full min-h-[700px]" data-testid="engram-code-panel">
           <div className="bg-[#2D2D2D] px-4 py-3 flex items-center justify-between border-b border-slate-700">
             <div className="flex items-center gap-3">
               <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               </div>
               <span className="text-slate-300 text-xs font-mono flex items-center gap-1.5"><FileCode2 size={14} className="text-blue-400"/> engram_forward.py</span>
             </div>
             <span className="text-[9px] text-slate-500 font-mono">{t('codeTitle')}</span>
           </div>
           
           <div className="py-3 overflow-y-auto overflow-x-auto flex-1 custom-scrollbar">
              <CodeLine num="1" active={false} indent={0}>
                <span className="text-purple-400">def</span> <span className="text-blue-400">forward</span>(self, hidden_states, input_ids):
              </CodeLine>
              <CodeLine num="2" active={step === 1} indent={1}>
                <span className="text-slate-500 italic">{t('c1')}</span>
              </CodeLine>
              <CodeLine num="3" active={step === 1} indent={1}>
                input_ids = self.compressed_tokenizer(input_ids)
              </CodeLine>
              <CodeLine num="4" active={step === 1} indent={1}>
                g_t = <span className="text-blue-200">dict</span>()
              </CodeLine>
              <CodeLine num="5" active={step === 1} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="6" active={step === 1} indent={2}>
                g_t[n] = extract_ngram_window(input_ids, n)
              </CodeLine>
              
              <CodeLine num="7" active={step === 2} indent={1}>
                <span className="text-slate-500 italic">{t('c2')}</span>
              </CodeLine>
              <CodeLine num="8" active={step === 2} indent={1}>
                hash_idx = torch.<span className="text-amber-200">zeros</span>(B, L, max_n - 1, num_heads, dtype=torch.long)
              </CodeLine>
              <CodeLine num="9" active={step === 2} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="10" active={step === 2} indent={2}>
                ngram_idx = n - 2
              </CodeLine>
              <CodeLine num="11" active={step === 2} indent={2}>
                mix = g_t[n][0] * M[0]
              </CodeLine>
              <CodeLine num="12" active={step === 2} indent={2}>
                <span className="text-purple-400">for</span> i <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(1, n):
              </CodeLine>
              <CodeLine num="13" active={step === 2} indent={3}>
                mix = torch.<span className="text-amber-200">bitwise_xor</span>(mix, g_t[n][i] * M[i])
              </CodeLine>
              <CodeLine num="14" active={step === 2} indent={2}>
                <span className="text-slate-500 italic">{t('c4')}</span>
              </CodeLine>
              <CodeLine num="15" active={step === 2} indent={2}>
                <span className="text-purple-400">for</span> k <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(num_heads):
              </CodeLine>
              <CodeLine num="16" active={step === 2} indent={3}>
                hash_idx[:,:,ngram_idx,k] = mix % primes[ngram_idx][k]
              </CodeLine>
              <CodeLine num="17" active={false} indent={0}></CodeLine>

              <CodeLine num="18" active={step >= 3 && step <= 4} indent={1}>
                <span className="text-slate-500 italic">{t('c5')}</span>
              </CodeLine>
              <CodeLine num="19" active={step >= 3 && step <= 4} indent={1}>
                embeddings = []
              </CodeLine>
              <CodeLine num="20" active={step >= 3 && step <= 4} indent={1}>
                <span className="text-purple-400">for</span> n <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(2, max_n + 1):
              </CodeLine>
              <CodeLine num="21" active={step >= 3 && step <= 4} indent={2}>
                <span className="text-purple-400">for</span> k <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(num_heads):
              </CodeLine>
              <CodeLine num="22" active={step >= 3 && step <= 4} indent={3}>
                tab = self.embed_tables[n][k]
              </CodeLine>
              <CodeLine num="23" active={step >= 3 && step <= 4} indent={3}>
                embeddings.append(tab(hash_idx[...,n - 2,k]))
              </CodeLine>
              <CodeLine num="24" active={false} indent={0}></CodeLine>

              <CodeLine num="25" active={step === 5} indent={1}>
                <span className="text-slate-500 italic">{t('c6')}</span>
              </CodeLine>
              <CodeLine num="26" active={step === 5} indent={1}>
                E_t = torch.<span className="text-amber-200">cat</span>(embeddings, dim=-1)
              </CodeLine>
              <CodeLine num="27" active={false} indent={0}></CodeLine>

              <CodeLine num="28" active={step === 6 || step === 7} indent={1}>
                <span className="text-slate-500 italic">{t('c7')}</span>
              </CodeLine>
              <CodeLine num="29" active={step === 6} indent={1}>
                V_t = self.W_V(E_t)
              </CodeLine>
              <CodeLine num="30" active={step === 7} indent={1}>
                gates = []
              </CodeLine>
              <CodeLine num="31" active={step === 6 || step === 7} indent={1}>
                <span className="text-purple-400">for</span> hc <span className="text-purple-400">in</span> <span className="text-blue-200">range</span>(self.hc_mult):
              </CodeLine>
              <CodeLine num="32" active={step === 6} indent={2}>
                K_t = self.W_K[hc](E_t)
              </CodeLine>
              <CodeLine num="33" active={step === 7} indent={2}>
                norm_K = self.norm1[hc](K_t)
              </CodeLine>
              <CodeLine num="34" active={step === 7} indent={2}>
                norm_Q = self.norm2[hc](hidden[:,:,hc,:])
              </CodeLine>
              <CodeLine num="35" active={step === 7} indent={2}>
                gt = (norm_K * norm_Q).<span className="text-amber-200">sum</span>(-1) / <span className="text-amber-200">sqrt</span>(D)
              </CodeLine>
              <CodeLine num="36" active={step === 7} indent={2}>
                gt = gt.<span className="text-amber-200">abs</span>().clamp_min(1e-6).<span className="text-amber-200">sqrt</span>() * gt.<span className="text-amber-200">sign</span>()
              </CodeLine>
              <CodeLine num="37" active={step === 7} indent={2}>
                gates.append(gt.<span className="text-amber-200">sigmoid</span>().<span className="text-amber-200">unsqueeze</span>(-1))
              </CodeLine>
              <CodeLine num="38" active={step === 7} indent={1}>
                gates = torch.stack(gates, dim=2)
              </CodeLine>
              <CodeLine num="39" active={step === 7} indent={1}>
                V_tilde = gates * V_t.<span className="text-amber-200">unsqueeze</span>(2)
              </CodeLine>

              <CodeLine num="40" active={step === 8} indent={1}>
                <span className="text-slate-500 italic">{t('c8')}</span>
              </CodeLine>
              <CodeLine num="41" active={step === 8} indent={1}>
                Y = V_tilde + self.short_conv(V_tilde)
              </CodeLine>
              <CodeLine num="42" active={false} indent={0}></CodeLine>

              <CodeLine num="43" active={step === 9} indent={1}>
                <span className="text-slate-500 italic">{t('c9')}</span>
              </CodeLine>
              <CodeLine num="44" active={step === 9} indent={1}>
                <span className="text-purple-400">return</span> Y
              </CodeLine>
              <CodeLine num="45" active={step === 9} indent={0}>
                H_block = hidden_states + Y
              </CodeLine>
           </div>
           <div className="px-4 py-3 border-t border-slate-700 bg-[#181818] text-[9px] leading-relaxed text-slate-500">
             {t('codeBoundary')}
           </div>
          </div>

        </div>

        {/* ======================================================= */}
        {/* 第二行：时间轴 满宽 */}
        {/* ======================================================= */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative mt-6 overflow-x-auto" data-testid="engram-system-timeline">
            <div className="flex items-center justify-between gap-4 mb-6 pb-3 border-b border-slate-100 min-w-[700px]">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                 <Clock className="text-blue-500" size={20}/> 
                 {t('timelineTitle')}
               </h2>
               <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" data-testid="engram-system-mode">
                 {['inference', 'training'].map((mode) => (
                   <button
                     key={mode}
                     type="button"
                     aria-pressed={systemMode === mode}
                     onClick={() => { setIsPlaying(false); setSystemMode(mode); }}
                     className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${systemMode === mode ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 border border-transparent hover:text-slate-700'}`}
                   >
                     {t(mode === 'inference' ? 'inferenceMode' : 'trainingMode')}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="flex flex-col gap-5 w-full justify-center flex-1 min-w-[700px]">
               {/* Timeline markers */}
               <div className="flex justify-between text-[11px] font-bold text-slate-400 pl-[90px] pr-2">
                  <span className={`transition-colors duration-500 ${step >= 1 ? 'text-slate-700' : ''}`}>{t('t0')}</span>
                  <span className={`transition-colors duration-500 ${step >= 2 ? 'text-slate-700' : ''}`}>{t(systemMode === 'inference' ? 't1' : 't1Training')}</span>
                  <span className={`transition-colors duration-500 ${step >= 3 ? 'text-slate-700' : ''}`}>{t(systemMode === 'inference' ? 't2' : 't2Training')}</span>
                  <span className={`transition-colors duration-500 ${step >= 6 ? 'text-slate-700' : ''}`}>{t(systemMode === 'inference' ? 't3' : 't3Training')}</span>
               </div>
               
               {systemMode === 'inference' ? (
                 <>
                   <div className="flex items-center gap-3">
                     <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center"><HardDrive size={22} className="mb-1 text-slate-500"/><span>{t('hostLane')}</span></div>
                     <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                       <TimelineSegment status={snapshot.timeline.input} color="slate" grow={0.5}>{t('dataPrep')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.hostLookup} color="purple" grow={1.5}>{t('calcHash')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.pcieTransfer} color="indigo" grow={1.5}>{t('pcieTx')}</TimelineSegment>
                       <div className="grow-[2] basis-0 rounded border border-dashed border-slate-200"/>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center"><MemoryStick size={22} className="mb-1 text-blue-500"/><span>{t('deviceLane')}</span></div>
                     <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                       <TimelineSegment status={snapshot.timeline.input} color="rose" grow={0.5}>{t('standardBlock0')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.computeWindow} color="amber" grow={3}>{t('precedingBlock')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.fusion} color="blue" grow={1.5}>{t('gatedFusion')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.subsequent} color="slate" grow={0.5}>{t('subsequentComp')}</TimelineSegment>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="flex items-center gap-3">
                     <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center"><Cpu size={22} className="mb-1 text-blue-500"/><span>{t('requestingRank')}</span></div>
                     <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                       <TimelineSegment status={snapshot.timeline.input} color="slate" grow={0.5}>{t('dataPrep')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.localHash} color="purple" grow={1}>{t('trainingHash')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.allToAll} color="indigo" grow={1.5}>{t('allToAllFetch')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.fusion} color="blue" grow={1.5}>{t('gatedFusion')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.subsequent} color="slate" grow={0.5}>{t('subsequentComp')}</TimelineSegment>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="w-20 shrink-0 font-bold text-[11px] text-slate-600 flex flex-col items-center"><MemoryStick size={22} className="mb-1 text-emerald-500"/><span>{t('tableShards')}</span></div>
                     <div className="flex-1 flex gap-1 h-14 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
                       <div className="grow-[1.5] basis-0 rounded border border-dashed border-slate-200"/>
                       <TimelineSegment status={snapshot.timeline.tableShards} color="emerald" grow={2}>{t('tableShards')}</TimelineSegment>
                       <TimelineSegment status={snapshot.timeline.activeRows} color="amber" grow={1}>{t('activeRows')}</TimelineSegment>
                       <div className="grow basis-0 rounded border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-400 px-1 text-center">{t('gradientDispatch')}</div>
                     </div>
                   </div>
                 </>
               )}
               <div className={`ml-[92px] rounded-lg border px-3 py-2 text-[10px] leading-relaxed ${systemMode === 'inference' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`} data-testid="engram-system-boundary">
                 {t(systemMode === 'inference' ? 'inferenceBoundary' : 'trainingBoundary')}
               </div>
            </div>
        </div>

        {/* ======================================================= */}
        {/* 第三行：数学推导 满宽 */}
        {/* ======================================================= */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative mt-6" data-testid="engram-math-panel">
           <div className="flex items-center mb-6 pb-3 border-b border-slate-100">
             <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
               <Calculator className="text-emerald-600" size={20}/>
               {t('mathTitle')}
             </h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {/* 阶段 1 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{t('phase1')}</span> {t('p1Title').replace('Phase 1 ', '')}</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   {t('p1Desc')}
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs text-slate-700 space-y-2 shadow-sm mt-auto overflow-x-auto">
                    <MathFormula block className="text-slate-500 min-w-max">{String.raw`g_{t,n}=(x'_{t-n+1},\ldots,x'_t)`}</MathFormula>
                    <MathFormula block className="text-slate-500 min-w-max">{String.raw`h_{n,k}=\left(\bigoplus_{i=0}^{n-1}x'_{t-i}M_i\right)\bmod P_{n,k}`}</MathFormula>
                    <div className="pt-2 border-t border-slate-200 text-purple-700 font-bold min-w-max"><MathFormula block>{String.raw`E_t=\operatorname{Concat}_{n,k}\!\left(\mathcal{E}_{n,k}[h_{n,k}]\right)\in\mathbb{R}^{B\times L\times E_D}`}</MathFormula></div>
                 </div>
              </div>

              {/* 阶段 2 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{t('phase2')}</span> {t('p2Title').replace('Phase 2 ', '')}</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   {t('p2Desc')}
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] text-slate-700 space-y-2 shadow-sm mt-auto overflow-x-auto">
                    <MathFormula block className="text-slate-500 min-w-max">{String.raw`K_t^{(c)}=W_K^{(c)}E_t,\qquad V_t=W_VE_t`}</MathFormula>
                    <div className="text-[10px] text-slate-400 min-w-max flex items-center gap-2"><span>{t('p2Where')}</span><MathFormula>{String.raw`x=\langle\operatorname{RMSNorm}(H_{\mathrm{in}}^{(c)}),\operatorname{RMSNorm}(K_t^{(c)})\rangle/\sqrt{D}`}</MathFormula></div>
                    <MathFormula block className="text-rose-600 font-bold min-w-max">{String.raw`\alpha_t^{(c)}=\sigma\!\left(\operatorname{sgn}(x)\sqrt{|x|}\right)`}</MathFormula>
                    <div className="pt-2 border-t border-slate-200 text-emerald-700 font-bold text-xs min-w-max"><MathFormula block>{String.raw`\widetilde{V}_t^{(c)}=\alpha_t^{(c)}V_t\in\mathbb{R}^{B\times L\times HC\times D}`}</MathFormula></div>
                 </div>
              </div>

              {/* 阶段 3 */}
              <div className="flex flex-col gap-2">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">{t('phase3')}</span> {t('p3Title').replace('Phase 3 ', '')}</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   {t('p3Desc')}
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[12px] text-slate-700 space-y-2 shadow-sm mt-auto overflow-x-auto">
                    <MathFormula block className="text-slate-500 min-w-max">{String.raw`\widetilde{V}=[\widetilde{V}_1,\ldots,\widetilde{V}_T]`}</MathFormula>
                    <MathFormula block className="text-emerald-700 font-bold min-w-max">{String.raw`Y_{\mathrm{engram}}=\widetilde{V}+\operatorname{SiLU}\!\left(\operatorname{DWConv1D}(\operatorname{RMSNorm}(\widetilde{V}))\right)`}</MathFormula>
                    <div className="pt-2 border-t border-slate-200 text-blue-700 font-bold min-w-max"><MathFormula block>{String.raw`H_{\mathrm{block}}=H_{\mathrm{in}}+Y_{\mathrm{engram}}\in\mathbb{R}^{B\times L\times HC\times D}`}</MathFormula></div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
