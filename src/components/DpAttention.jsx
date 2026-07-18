import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Database, Zap, Code, Layers, Info, Globe, AlertTriangle, Network, Scissors, ArrowDown, Cpu, GripHorizontal } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { deriveDpAttentionSnapshot, getMaxStep } from './dp-attention/model';

const i18n = {
  zh: {
    title: 'DP Attention 推理并行解析',
    subtitle: 'Decode 视角：MLA KV 归属与 MoE 通信桥接',
    langToggle: 'EN',
    standard: '标准 TP (Standard TP)',
    dp: 'DP Attention (混合并行)',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    completed: '已完成',
    replay: '重播',
    moeTopology: 'MoE 拓扑',
    tpMoe: 'TP-FFN',
    epMoe: 'EP-MoE',
    assumptionTp: '代表性配置：TP=4 · DP=1 · Attention TP=4',
    assumptionDpTp: '代表性配置：TP=4 · DP=4 · Attention TP=1 · MoE TP',
    assumptionDpEp: '代表性配置：TP=4 · DP=4 · Attention TP=1 · MoE EP',
    scrollHint: '横向滚动查看全部 4 个 Rank',
    cachePerRank: '单 Rank KV',
    cacheCluster: '集群总 KV',
    replication: '复制因子',
    mlaLayer: 'MLA 层',
    moeLayer: 'MoE 层',
    empty: '尚未生成',
    
    // 状态机提示
    statusIdle: '系统初始化完成，等待请求入列...',
    statusTpAttn: 'MLA 层：标准 TP 计算 (显存冗余报警)',
    statusTpMoe: 'MoE 层：标准张量并行计算',
    statusTpOut: '层最终输出完成',
    statusDpAttn: 'MLA 层：数据并行计算 (KV 零冗余)',
    statusDpGather: '集合通信: All-Gather 合并与分发',
    statusDpMoe: 'MoE 层：标准张量并行',
    statusDpSlice: '集合通信: Slice 截取本地子集',
    done: '单层 Transformer 计算完成',
    statusInput: '载入当前执行组的输入激活',
    statusAttention: 'MLA Decode：生成 Q，并读取/写入本地 KV',
    statusGather: 'DP 到 TP 桥接：Gather 本地 Attention 输出',
    statusReduceScatter: 'TP 到 DP 桥接：Reduce-Scatter 返回本地请求',
    statusExpertDispatch: 'Router：All-to-All Dispatch 到专家分片',
    statusExpertCombine: 'All-to-All Combine 返回原 Token 所属 Rank',
    statusMoeTp: 'TP-FFN：各 Rank 计算参数分片',
    statusMoeEp: 'EP-MoE：各 Rank 计算本地专家收到的 Token',

    modelView: 'Transformer 张量流水线',
    kvWaste: 'KV Cache 全局显存消耗',
    wasteAlert: '灾难性冗余 (4x 浪费)',
    wasteOptimal: '完美分割 (1x 零冗余)',
    
    dimLegend: '全局张量维度说明',
    dimB: '批次',
    dimS: '序列',
    dimH: '隐藏维',
    dimDc: 'KV 压缩维',
    rank: 'Rank',
    globalQueue: '全局输入请求队列 (Global Request Queue)',

    // 张量标签
    tInput: '输入激活',
    tLatent: 'KV 压缩投影',
    tKV: 'MLA KV Cache',
    tWQ: 'Q / 吸收投影',
    tAttnOut: 'Attention 输出',
    tGather: 'All-Gather (跨卡聚合)',
    tSlice: 'Slice (截取本地 Batch)',
    tReduceScatter: 'Reduce-Scatter',
    tDispatch: 'All-to-All Dispatch',
    tCombine: 'All-to-All Combine',
    tMoEIn: 'MoE 输入',
    tMoEUp: '专家 Up 投影',
    tMoEDown: '专家 Down 投影',
    tMoEOut: '层最终输出',
    tReturnedOutput: '返回本地矩阵',
    returnResult: '每个 Rank 取回',
    tRouter: 'Router / Top-k',
    tExperts: '本地专家',

    lblRowShardB4: 'Row Shard (B/4切块)',
    lblRepFull: 'Replicated (全量拷贝)',
    lblSharedFull: '全量权重',
    lblColShardHead: 'Col Shard (切头)',
    lblSharedNone: '完整权重',
    lblRepDisaster: 'TP 组 4 份',
    lblRowShardPerf: '本地请求 KV',
    lblRowShardLocal: '本地 Attention',
    lblFullReduce: 'TP 归约结果',
    lblFullBatchIn: '全局 Batch',
    lblColShard: '列切分',
    lblRowShard: '行切分',
    lblRowShardLoop: '本地请求输出',
    lblTokenShard: 'Routed Tokens (非均匀)',
    lblExpertShard: 'Expert Shard (EP)',

    // 代码注释
    pyTitle: 'Python伪代码',
    pyTp1: '# 标准TP: 接收全量全局 Batch 输入',
    pyTp2: '# MLA: 按注意力头纵向切分 (Col Shard)',
    pyTp3: '# ⚠️ OOM报警: 每张卡必须全量缓存完整的 c_t 隐向量',
    pyTp4: '# MoE: 执行标准专家张量并行计算',
    pyTp5: '# 返回完整的全量输出结果',

    pyDp1: '# DP模式: 仅接收属于当前 Rank 的局部子批次 (B/4)',
    pyDp2: '# MLA: 权重不切分，独立处理各自的请求',
    pyDp3: '# 💡 显存红利: 本地仅分配 1/4 的 KV Cache，实现真正 0 冗余',
    pyDp4: '# 通信桥梁1 (NVLink): 跨卡合并各节点的局部 Attention 输出',
    pyDp5: '# MoE: 使用重组后的全量数据，执行标准 TP 协同计算',
    pyDp6: '# 通信桥梁2: 丢弃无关数据，切片拿回属于自己的局部 Batch',
    pyQuerySource: '# Q 来自隐藏状态；不能从 KV latent 生成',
    pyKvState: '# 每个 Token 持久化压缩 KV latent 与 RoPE Key',
    pyGather: '# 非 EP 路径：DP 请求分片聚合为 TP-FFN 输入',
    pyReduceScatter: '# 归约 TP 局部结果，并直接返回请求所属 DP Rank',
    pyEpDispatch: '# Router 选择 Top-k 专家并执行 All-to-All Dispatch',
    pyEpCombine: '# All-to-All Combine 恢复原 Token 顺序与归属',
    pyMoeTp: '# TP-FFN：每个 Rank 持有参数分片',
    pyMoeEp: '# EP-MoE：每个 Rank 持有部分完整专家',
    pyCommit: '# 提交本地请求的层输出',

    // 原理解析
    analysis: '深度张量解析',
    idleDesc: '请点击播放，观察矩阵和张量在 4 个独立物理 Rank 中是如何被切块（Row/Col Shard）和合并分发的。初始化阶段仅预加载了模型权重。',
    tpProblemTitle: 'MLA 架构在标准 TP 下的灾难',
    tpProblemDesc: 'MLA 为每个 Token 缓存压缩 KV latent 与解耦 RoPE Key。在本页代表性的 Attention TP4 中，同一请求集合的缓存会出现在 4 个 Rank；单 Rank 都持有一份，集群合计四份。这不是所有 TP 后端的普遍定律，而是单 KV latent 在该拓扑中的复制结果。',
    dpSolutionTitle: '手术刀级别的重构：切数据，不切头',
    dpSolutionDesc: '本页 DPA 配置令 DP=TP=4，因此 Attention TP=1。每个 Rank 只处理自己的请求子集，并仅保存对应 KV；单 Rank 为全局工作集的四分之一，集群合计一份。若 DP 小于 TP，DP 组内仍可能存在 Attention TP 复制，不能笼统称为零冗余。',
    commTradeoffTitle: '动态合并与分发的 Trade-off',
    commTradeoffDesc: 'DPA 只决定 Attention 的请求与 KV 归属，不强制 MoE 使用某一种并行。TP-FFN 路径在专家计算前 Gather、之后 Reduce-Scatter；EP-MoE 路径由 Router 通过 All-to-All Dispatch/Combine 路由 Token。两者都以额外通信换取更合适的参数与 KV 布局。',
    boundaryTitle: '教学边界',
    boundaryDesc: '固定 4 Rank、Decode 阶段与代表性张量形状；不估算具体字节、带宽或延迟，也不把一种后端通信原语描述为所有实现的唯一选择。',
  },
  en: {
    title: 'DP Attention Inference Parallelism',
    subtitle: 'Decode view: MLA KV ownership and the MoE communication bridge',
    langToggle: '中文',
    standard: 'Standard TP',
    dp: 'DP Attention',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    completed: 'Completed',
    replay: 'Replay',
    moeTopology: 'MoE Topology',
    tpMoe: 'TP-FFN',
    epMoe: 'EP-MoE',
    assumptionTp: 'Representative: TP=4 · DP=1 · Attention TP=4',
    assumptionDpTp: 'Representative: TP=4 · DP=4 · Attention TP=1 · MoE TP',
    assumptionDpEp: 'Representative: TP=4 · DP=4 · Attention TP=1 · MoE EP',
    scrollHint: 'Scroll horizontally to inspect all four ranks',
    cachePerRank: 'Per-rank KV',
    cacheCluster: 'Cluster KV',
    replication: 'Replication',
    mlaLayer: 'MLA Layer',
    moeLayer: 'MoE Layer',
    empty: 'Not materialized',
    
    statusIdle: 'System Initialized. Awaiting Requests...',
    statusTpAttn: 'MLA Layer: TP Compute (Memory Alert)',
    statusTpMoe: 'MoE Layer: Standard TP Compute',
    statusTpOut: 'Layer Final Output Complete',
    statusDpAttn: 'MLA Layer: DP Compute (Zero KV Waste)',
    statusDpGather: 'Comm: All-Gather Merge & Distribute',
    statusDpMoe: 'MoE Layer: Standard TP',
    statusDpSlice: 'Comm: Slice local subset',
    done: 'Transformer Layer Complete',
    statusInput: 'Load activations owned by the current execution group',
    statusAttention: 'MLA decode: build Q and access the local KV state',
    statusGather: 'DP to TP bridge: gather local attention outputs',
    statusReduceScatter: 'TP to DP bridge: reduce-scatter back to request owners',
    statusExpertDispatch: 'Router: all-to-all dispatch to expert shards',
    statusExpertCombine: 'All-to-all combine back to each token owner',
    statusMoeTp: 'TP-FFN: each rank computes its parameter shard',
    statusMoeEp: 'EP-MoE: each rank computes tokens routed to local experts',

    modelView: 'Transformer Tensor Pipeline',
    kvWaste: 'Global KV Cache Memory Footprint',
    wasteAlert: 'Catastrophic (4x Waste)',
    wasteOptimal: 'Perfectly Sharded (1x)',

    dimLegend: 'Global Tensor Dimensions Legend',
    dimB: 'Batch',
    dimS: 'Sequence',
    dimH: 'Hidden',
    dimDc: 'KV latent',
    rank: 'Rank',
    globalQueue: 'Global Input Request Queue',

    tInput: 'Input Activation',
    tLatent: 'KV Compression',
    tKV: 'MLA KV Cache',
    tWQ: 'Q / Absorbed Proj',
    tAttnOut: 'Attention Output',
    tGather: 'All-Gather (Merge)',
    tSlice: 'Slice (Local Batch)',
    tReduceScatter: 'Reduce-Scatter',
    tDispatch: 'All-to-All Dispatch',
    tCombine: 'All-to-All Combine',
    tMoEIn: 'MoE Input',
    tMoEUp: 'Expert Up Proj',
    tMoEDown: 'Expert Down Proj',
    tMoEOut: 'Layer Final Output',
    tReturnedOutput: 'Returned Local Matrix',
    returnResult: 'Each rank receives',
    tRouter: 'Router / Top-k',
    tExperts: 'Local Experts',

    lblRowShardB4: 'Row Shard (B/4)',
    lblRepFull: 'Replicated (Full)',
    lblSharedFull: 'Full weights',
    lblColShardHead: 'Col Shard (Heads)',
    lblSharedNone: 'Full weights',
    lblRepDisaster: '4 TP copies',
    lblRowShardPerf: 'Local request KV',
    lblRowShardLocal: 'Local attention',
    lblFullReduce: 'TP reduced result',
    lblFullBatchIn: 'Global batch',
    lblColShard: 'Column shard',
    lblRowShard: 'Row shard',
    lblRowShardLoop: 'Local request output',
    lblTokenShard: 'Routed Tokens (Variable)',
    lblExpertShard: 'Expert Shard (EP)',

    pyTitle: 'Python Pseudocode',
    pyTp1: '# Standard TP: Receives full global Batch input',
    pyTp2: '# MLA: Col Shard by Attention Heads',
    pyTp3: '# ⚠️ OOM Alert: Every Rank MUST locally cache FULL c_t latent vector',
    pyTp4: '# MoE: Execute standard expert Tensor Parallelism',
    pyTp5: '# Returns complete full batch output',

    pyDp1: '# DP Mode: Receives ONLY local sub-batch for current Rank (B/4)',
    pyDp2: '# MLA: Weights NOT sharded, processes local requests independently',
    pyDp3: '# 💡 Memory Bonus: Allocates only 1/4 KV Cache locally. True 0 redundancy!',
    pyDp4: '# NVLink Bridge 1: Merge local Attention outputs across Ranks',
    pyDp5: '# MoE: Use rebuilt full global data to execute standard TP co-compute',
    pyDp6: '# Bridge 2: Discard irrelevant data, slice back initial local Batch',
    pyQuerySource: '# Q comes from hidden states, never from the KV latent',
    pyKvState: '# Persist compressed KV latent and RoPE key per token',
    pyGather: '# Non-EP path: gather DP request shards for the TP-FFN',
    pyReduceScatter: '# Reduce TP partials and return them to each DP owner',
    pyEpDispatch: '# Router selects top-k experts, then all-to-all dispatches tokens',
    pyEpCombine: '# All-to-all combine restores token order and ownership',
    pyMoeTp: '# TP-FFN: every rank owns a parameter shard',
    pyMoeEp: '# EP-MoE: every rank owns a subset of complete experts',
    pyCommit: '# Commit the layer output for locally owned requests',

    analysis: 'Deep Tensor Analysis',
    idleDesc: 'Click play to observe how tensors are sharded and merged. At initialization, only model weights are preloaded.',
    tpProblemTitle: 'The Disaster of MLA under Standard TP',
    tpProblemDesc: 'MLA stores a compressed KV latent and a decoupled RoPE key for every token. In this representative Attention-TP4 topology, the same request set is cached on four ranks: one copy per rank and four copies across the group. This is a topology-specific consequence, not a universal property of every TP backend.',
    dpSolutionTitle: 'Surgical Restructuring: Shard Data, Not Heads',
    dpSolutionDesc: 'This page uses DP=TP=4, so Attention TP is 1. Every rank handles its own requests and stores only their KV state: one quarter per rank and one copy across the cluster. If DP is smaller than TP, an Attention-TP group may still replicate that local KV state.',
    commTradeoffTitle: 'Dynamic Merge & Distribute Trade-off',
    commTradeoffDesc: 'DPA defines attention request and KV ownership; it does not force one MoE topology. TP-FFN gathers before expert compute and reduce-scatters afterward. EP-MoE uses router-driven all-to-all dispatch and combine. Both exchange communication for a more suitable parameter and KV layout.',
    boundaryTitle: 'Teaching boundary',
    boundaryDesc: 'Fixed four-rank decode example with representative tensor shapes. It does not estimate bytes, bandwidth, or latency, and it does not present one backend collective as universal.',
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const bColors = [
  'bg-rose-500', 
  'bg-sky-500', 
  'bg-amber-500', 
  'bg-purple-500'
];

// 注入动画样式 (流动虚线)
const FlowStyle = () => (
  <style>{`
    @keyframes flow-line {
      from { stroke-dashoffset: 16; }
      to { stroke-dashoffset: 0; }
    }
    .animate-flow {
      animation: flow-line 0.6s linear infinite;
    }
  `}</style>
);

// --- 可复用 UI 组件：权重与激活块 ---

// 权重矩阵块 (永远常驻显示)
const WeightBlock = ({ title, dims, splitDir, label, rankIndex = 0 }) => {
  const baseClass = "bg-indigo-50/40 border-indigo-100 shadow-sm";
  const innerClass = "bg-slate-200";
  const highlightClass = "bg-indigo-400 border border-indigo-300 shadow-sm";
  
  return (
    <div className={`rounded-md border p-1.5 flex flex-col items-center justify-between w-full min-w-0 transition-all duration-500 ${baseClass}`}>
      <div className="mb-1 flex min-h-[27px] w-full flex-col items-center justify-center text-center">
        <div className="max-w-full text-[10px] font-bold leading-[1.15] text-indigo-800 break-words">{title}</div>
        <div className="text-[9px] text-indigo-500/90"><MathFormula>{dims}</MathFormula></div>
      </div>
      
      <div className="flex-1 w-full flex items-center justify-center py-1">
        {splitDir === 'col' && (
          <div className="flex gap-[1px] w-[80%] h-[20px]">
            {[0, 1, 2, 3].map(i => <div key={i} className={`flex-1 rounded-[1px] ${i === rankIndex ? highlightClass : innerClass}`} />)}
          </div>
        )}
        {splitDir === 'row' && (
          <div className="flex flex-col gap-[1px] w-[35%] h-[20px]">
            {[0, 1, 2, 3].map(i => <div key={i} className={`flex-1 w-full rounded-[1px] ${i === rankIndex ? highlightClass : innerClass}`} />)}
          </div>
        )}
        {splitDir === 'full_square' && (
          <div className={`w-[35%] h-[20px] rounded-[2px] ${highlightClass}`} />
        )}
        {splitDir === 'full_col' && (
          <div className={`w-[80%] h-[20px] rounded-[2px] ${highlightClass}`} />
        )}
      </div>

      <div className="mt-0.5 max-w-full rounded border border-indigo-100 bg-indigo-100/50 px-1 text-center text-[8px] leading-tight text-indigo-700 break-words">
        {label}
      </div>
    </div>
  );
};

// 数据激活值块 (带有 isEmpty 判空逻辑)
const DataBlock = ({ title, dims, mode, label, emptyLabel = '—', isEmpty = false, isAlert = false, rankIndex = 0 }) => {
  if (isEmpty) {
    return (
      <div className="flex h-full min-h-[70px] w-full min-w-0 flex-col items-center justify-between rounded-md border-2 border-dashed border-slate-300 bg-slate-50/50 p-1.5">
         <div className="mb-1 flex min-h-[27px] w-full flex-col items-center justify-center text-center">
            <div className="max-w-full text-[10px] font-bold leading-[1.15] text-slate-400 break-words">{title}</div>
            <div className="text-[9px] text-slate-400/80"><MathFormula>{dims}</MathFormula></div>
         </div>
         <div className="flex-1 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-300 italic">{emptyLabel}</span>
         </div>
         <div className="text-[7px] font-mono mt-0.5 text-transparent select-none">-</div>
      </div>
    );
  }

  const baseClass = "bg-white border-slate-300 shadow-sm";
  
  return (
    <div className={`rounded-md border p-1.5 flex flex-col items-center justify-between w-full min-w-0 min-h-[70px] transition-all duration-300 ${baseClass} ${isAlert ? 'ring-2 ring-rose-500 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-[1.02]' : ''}`}>
      <div className="mb-1 flex min-h-[27px] w-full flex-col items-center justify-center text-center">
        <div className={`max-w-full text-[10px] font-bold ${isAlert ? 'text-rose-600' : 'text-slate-700'} leading-[1.15] break-words`}>{title}</div>
        <div className="text-[9px] text-slate-500"><MathFormula>{dims}</MathFormula></div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center py-1">
        
        {mode === 'full' && (
          <div className="flex flex-col w-[70%] h-[24px] rounded-[2px] border border-slate-300 overflow-hidden shadow-sm">
            {bColors.map((bg, i) => <div key={i} className={`flex-1 w-full ${bg} border-b border-black/10`} />)}
          </div>
        )}

        {mode === 'subset' && (
          <div className="flex flex-col w-[70%] h-[6px] rounded-[2px] border border-slate-300 overflow-hidden shadow-sm">
             <div className={`flex-1 w-full ${bColors[rankIndex]}`} />
          </div>
        )}

        {mode === 'localMatrix' && (
          <div className="grid h-[30px] w-[76%] grid-cols-4 grid-rows-3 gap-px overflow-hidden rounded-[3px] border border-slate-300 bg-slate-200 p-px shadow-sm">
            {Array.from({ length: 12 }, (_, cellIndex) => (
              <div
                key={cellIndex}
                className={`${bColors[rankIndex]} ${cellIndex % 3 === 0 ? 'opacity-100' : cellIndex % 3 === 1 ? 'opacity-80' : 'opacity-60'}`}
              />
            ))}
          </div>
        )}

        {mode === 'replicated' && (
           <div className="relative w-[50%] h-[28px]">
             {[3, 2, 1, 0].map(i => (
               <div key={i} className={`absolute w-[100%] h-[18px] rounded-[2px] border ${isAlert ? 'border-rose-400' : 'border-slate-400'} flex flex-col overflow-hidden shadow-md`} style={{ top: i*3, left: i*3, zIndex: 10-i }}>
                 {bColors.map((bg, j) => <div key={j} className={`flex-1 w-full ${bg} opacity-90`} />)}
               </div>
             ))}
           </div>
        )}

      </div>

      <div className={`mt-0.5 max-w-full text-center text-[8px] leading-tight break-words ${isAlert ? 'text-rose-600 font-bold bg-rose-50 px-1 rounded' : 'text-slate-600'}`}>
        {label}
      </div>
    </div>
  );
};

// --- 主应用组件 ---
const DpAttentionVisualizer = () => {
  const [modelType, setModelType] = useState('dp'); 
  const [moeTopology, setMoeTopology] = useState('tp');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;
  const snapshot = useMemo(
    () => deriveDpAttentionSnapshot({ mode: modelType, moeTopology, step }),
    [modelType, moeTopology, step],
  );
  const { phase, maxStep } = snapshot;

  const reset = useCallback(() => {
    setIsPlaying(false);
    setStep(0);
  }, []);

  const handleNextStep = useCallback(() => {
    setStep((current) => Math.min(current + 1, getMaxStep(modelType, moeTopology)));
  }, [modelType, moeTopology]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (phase === 'done') {
      setIsPlaying(false);
      return undefined;
    }
    const delay = step === 0 ? 900 : snapshot.communicationOperation ? 2200 : 1800;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [handleNextStep, isPlaying, phase, snapshot.communicationOperation, step]);

  const togglePlay = () => {
    if (phase === 'done') {
      setStep(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((playing) => !playing);
  };

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      reset();
    }
  };

  const handleMoeTopologyChange = (topology) => {
    if (topology !== moeTopology) {
      setMoeTopology(topology);
      reset();
    }
  };

  const getStatusText = () => {
    const statusByOperation = {
      idle: 'statusIdle',
      input: 'statusInput',
      attention: 'statusAttention',
      gather: 'statusGather',
      reduceScatter: 'statusReduceScatter',
      expertDispatch: 'statusExpertDispatch',
      expertCombine: 'statusExpertCombine',
      moe: snapshot.moeTopology === 'ep' ? 'statusMoeEp' : 'statusMoeTp',
      output: 'statusTpOut',
      done: 'done',
    };
    return t(statusByOperation[snapshot.operation] || 'done');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-6 lg:p-8 selection:bg-indigo-100">
      <FlowStyle />
      <div className="max-w-[100rem] mx-auto space-y-4 md:space-y-6">
        
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-indigo-900">
              <GridHorizontalIcon />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-[12px] md:text-sm mt-1">{t('subtitle')}</p>
          </div>
          
          <div className="flex max-w-4xl flex-wrap items-center justify-center gap-2.5">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <button aria-pressed={modelType === 'tp'} onClick={() => handleModelTypeChange('tp')} className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'tp' ? 'bg-white shadow-sm text-rose-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlertTriangle size={14} /> {t('standard')}
              </button>
              <button aria-pressed={modelType === 'dp'} onClick={() => handleModelTypeChange('dp')} className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'dp' ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
                <Zap size={14} /> {t('dp')}
              </button>
            </div>
            {modelType === 'dp' && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-inner" aria-label={t('moeTopology')}>
                <span className="hidden px-1 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:inline">{t('moeTopology')}</span>
                {['tp', 'ep'].map((topology) => (
                  <button
                    key={topology}
                    type="button"
                    aria-pressed={moeTopology === topology}
                    onClick={() => handleMoeTopologyChange(topology)}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${moeTopology === topology ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t(topology === 'ep' ? 'epMoe' : 'tpMoe')}
                  </button>
                ))}
              </div>
            )}
            <button aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'} onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="p-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5">
              <Globe size={16} />
              <span className="text-[11px] font-bold">{lang === 'zh' ? 'EN' : '中文'}</span>
            </button>
            <button type="button" aria-label={t('reset')} title={t('reset')} onClick={reset} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"><RotateCcw size={18} /></button>
            <button type="button" aria-label={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} title={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} onClick={togglePlay} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" aria-label={phase === 'done' ? t('completed') : t('next')} title={phase === 'done' ? t('completed') : t('next')} onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Main Workspace: 2-Column Grid (Flow vs Pseudocode) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch w-full">
          
          {/* Left Column: Flow Diagram (Tensor view) */}
          <div className="xl:col-span-7 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden h-full">
            
            {/* Status Bar inside the Viz */}
            <div className="relative z-20 mb-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
              <div className="flex min-w-0 flex-col items-start gap-2">
                <div className={`flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition-colors md:text-xs ${phase === 'idle' ? 'bg-slate-600' : modelType === 'tp' && snapshot.operation === 'attention' ? 'bg-rose-600' : phase === 'done' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                 {phase === 'idle' ? <Database size={14}/> : <ActivityIndicator />}
                 {getStatusText()}
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold leading-snug text-slate-500">
                  {t(snapshot.assumptionKey === 'assumption.tp' ? 'assumptionTp' : snapshot.assumptionKey === 'assumption.dpEp' ? 'assumptionDpEp' : 'assumptionDpTp')}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  [t('cachePerRank'), `${snapshot.cache.perRankPercent}%`],
                  [t('cacheCluster'), `${snapshot.cache.clusterPercent}%`],
                  [t('replication'), snapshot.cache.visible ? `${snapshot.cache.replicationFactor}x` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400">{label}</div>
                    <div className={`mt-0.5 text-sm font-black ${snapshot.cache.replicationFactor > 1 && snapshot.cache.visible ? 'text-rose-600' : 'text-emerald-600'}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative pb-4 flex flex-col items-start justify-start flex-1 overflow-x-auto overflow-y-hidden">
               <div className="mb-2 flex w-full items-center justify-end gap-1 text-[10px] font-semibold text-slate-400 xl:hidden">
                 <GripHorizontal size={13} /> {t('scrollHint')}
               </div>
               
               <div className="mb-4 grid w-full min-w-[520px] grid-cols-[minmax(150px,1fr)_auto] items-center gap-2 px-1">
                 <div className="flex min-w-0 items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
                   <Layers size={14} /> {t('modelView')}
                 </div>
                 
                 <div className="grid shrink-0 grid-cols-4 gap-1">
                   {[
                     [String.raw`B`, 'dimB'],
                     [String.raw`S`, 'dimS'],
                     [String.raw`H`, 'dimH'],
                     [String.raw`d_c`, 'dimDc'],
                   ].map(([symbol, labelKey]) => (
                     <span key={labelKey} className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[9px] text-slate-600 shadow-sm">
                       <MathFormula>{symbol}</MathFormula><span>{t(labelKey)}</span>
                     </span>
                   ))}
                 </div>
               </div>

               {/* Swimlanes Container */}
               <div className="w-full flex-1">
                 <div className="relative flex h-full min-w-[520px] flex-col gap-2 px-1">

                   {/* Global Request Queue */}
                   <div className="w-full flex flex-col items-center mb-2">
                      <div className="text-[10px] font-bold text-slate-600 mb-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
                        {t('globalQueue')}
                      </div>
                      <div className={`flex h-6 w-[220px] overflow-hidden rounded border shadow-md transition-all duration-500 ${phase === 'idle' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-300 opacity-40'}`}>
                        {bColors.map((c, i) => <div key={i} className={`flex-1 ${c} border-r border-black/10 last:border-0`} />)}
                      </div>
                   </div>

                   {/* Column Headers */}
                   <div className="grid grid-cols-4 gap-2 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="text-center bg-slate-800 text-white py-1.5 rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                          <Cpu size={12}/> {t('rank')} {i}
                        </div>
                      ))}
                   </div>

                   {/* Row 1: Input */}
                   <div className="grid grid-cols-4 gap-2 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex justify-center transition-all duration-500 h-full">
                           <DataBlock 
                              title={t('tInput')} dims={snapshot.tensors.inputShapeLatex}
                              mode={snapshot.isDp ? 'subset' : 'full'}
                              label={snapshot.isDp ? t('lblRowShardB4') : t('lblRepFull')}
                              emptyLabel={t('empty')} isEmpty={!snapshot.views.inputVisible} rankIndex={i}
                           />
                        </div>
                      ))}
                   </div>

                   {/* Inter-layer Arrow 1 */}
                   <div className="grid grid-cols-4 gap-2 w-full">
                     {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-4 items-center"><ArrowDown size={14} className={`transition-all duration-500 ${snapshot.views.inputVisible ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                   </div>

                   {/* Row 2: MLA Box */}
                   <div className="grid grid-cols-4 gap-2 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`border rounded-xl p-2 flex min-w-0 flex-col gap-2 transition-all duration-500 shadow-sm
                          ${snapshot.views.inputVisible ? (modelType === 'tp' ? 'border-rose-300 bg-rose-50/30' : 'border-indigo-300 bg-indigo-50/40') : 'border-slate-200 bg-slate-50/50'}`}>
                          
                          <div className="text-[10px] font-bold text-center text-slate-500 mb-0.5 border-b border-slate-200 pb-1">{t('mlaLayer')}</div>
                          
                          <WeightBlock title={t('tLatent')} dims={String.raw`H\times d_c`} splitDir="full_square" label={t('lblSharedFull')} rankIndex={i} />
                          
                          <WeightBlock 
                             title={t('tWQ')} 
                             dims={modelType === 'tp' ? String.raw`H\to d_q\to \frac{H_qd_h}{4}` : String.raw`H\to d_q\to H_qd_h`}
                             splitDir={modelType === 'tp' ? 'col' : 'full_col'} 
                             label={modelType === 'tp' ? t('lblColShardHead') : t('lblSharedNone')} 
                             rankIndex={i} 
                          />
                          
                          <div className="relative my-1">
                             {modelType === 'tp' && snapshot.cache.visible && <div className="absolute inset-0 bg-rose-500/10 animate-pulse rounded-lg border border-rose-300 z-0"></div>}
                             <DataBlock 
                                title={t('tKV')} dims={snapshot.cache.shapeLatex}
                                mode={modelType === 'tp' ? 'full' : 'subset'}
                                label={modelType === 'tp' ? t('lblRepDisaster') : t('lblRowShardPerf')}
                                emptyLabel={t('empty')} isEmpty={!snapshot.cache.visible} isAlert={modelType === 'tp' && snapshot.cache.visible} rankIndex={i}
                             />
                          </div>
                          
                          <DataBlock 
                             title={t('tAttnOut')} dims={snapshot.tensors.attentionOutputShapeLatex}
                             mode={modelType === 'dp' ? 'subset' : 'full'} 
                             label={modelType === 'dp' ? t('lblRowShardLocal') : t('lblFullReduce')}
                             emptyLabel={t('empty')} isEmpty={!snapshot.views.attentionVisible} rankIndex={i}
                          />
                        </div>
                      ))}
                   </div>

                   {/* Row 3: Inter-layer Comm (All Gather) / Arrows */}
                   <div className={`relative w-full flex items-center justify-center transition-all duration-500 ${modelType === 'dp' ? 'h-24 my-2' : 'h-8 my-1'}`}>
                      <div className="absolute inset-0 grid grid-cols-4 gap-2 w-full h-full opacity-10">
                        {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-full border-l-2 border-slate-500 border-dashed"></div>)}
                      </div>

                      {modelType === 'tp' && (
                         <div className="absolute inset-0 grid grid-cols-4 gap-2 w-full h-full">
                           {[0,1,2,3].map(i => <div key={i} className="flex justify-center items-center h-full"><ArrowDown size={20} className={`transition-all duration-500 ${snapshot.views.moeVisible ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                         </div>
                      )}

                      {modelType === 'dp' && snapshot.views.bridgeVisible && (
                         <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                           <defs>
                             <marker id="arrow-merge" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                               <polygon points="0 0, 8 4, 0 8" fill="#fbbf24" />
                             </marker>
                             <marker id="arrow-dist" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                               <polygon points="0 0, 8 4, 0 8" fill="#6366f1" />
                             </marker>
                           </defs>
                           {[12.5, 37.5, 62.5, 87.5].map((x, i) => (
                             <line key={`in-${i}`} x1={`${x}%`} y1="0%" x2="50%" y2="50%" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-merge)" className="animate-flow" />
                           ))}
                           {[12.5, 37.5, 62.5, 87.5].map((x, i) => (
                             <line key={`out-${i}`} x1="50%" y1="50%" x2={`${x}%`} y2="100%" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-dist)" className="animate-flow" style={{ animationDirection: 'reverse' }} />
                           ))}
                         </svg>
                      )}

                      {modelType === 'dp' && (
                        <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 z-20 w-[142px]
                          ${snapshot.views.bridgeVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                          <div className="bg-amber-50 border-2 border-amber-400 p-2.5 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] flex flex-col items-center">
                            <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5 mb-1 whitespace-nowrap">
                              <Network size={14} className={snapshot.communicationOperation ? "animate-spin-slow" : ""} /> {t(snapshot.moeTopology === 'ep' ? 'tDispatch' : 'tGather')}
                            </div>
                            <div className="text-[9px] text-amber-700 mb-1"><MathFormula>{snapshot.moeTopology === 'ep' ? String.raw`T_{local}\to T_{expert}` : String.raw`[B,S,H]`}</MathFormula></div>
                            <div className="w-[70%] max-w-[80px] h-[24px] flex flex-col rounded-[2px] border border-amber-400 overflow-hidden shadow-inner">
                              {bColors.map((bg, j) => <div key={j} className={`flex-1 w-full ${bg} border-b border-black/10 last:border-0`} />)}
                            </div>
                          </div>
                        </div>
                      )}
                   </div>

                   {/* Row 4: MoE Box */}
                   <div className="grid grid-cols-4 gap-2 w-full">
                      {[0, 1, 2, 3].map(i => {
                        const isMoEInActive = snapshot.views.moeVisible;
                        const isExpertParallel = snapshot.isDp && snapshot.moeTopology === 'ep';
                        
                        return (
                          <div key={i} className={`border rounded-xl p-2 flex min-w-0 flex-col gap-2 transition-all duration-500 shadow-sm
                            ${isMoEInActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            
                            <div className="text-[10px] font-bold text-center text-slate-500 mb-0.5 border-b border-slate-200 pb-1">{t('moeLayer')}</div>
                            
                            <DataBlock
                              title={isExpertParallel ? t('tRouter') : t('tMoEIn')}
                              dims={snapshot.tensors.moeInputShapeLatex}
                              mode={isExpertParallel ? 'subset' : 'full'}
                              label={isExpertParallel ? t('lblTokenShard') : t('lblFullBatchIn')}
                              emptyLabel={t('empty')}
                              isEmpty={!isMoEInActive}
                              rankIndex={i}
                            />
                            
                            <WeightBlock title={isExpertParallel ? t('tExperts') : t('tMoEUp')} dims={isExpertParallel ? String.raw`\frac{E}{4}\times(H\to H_E)` : String.raw`H\times\frac{EH}{4}`} splitDir={isExpertParallel ? 'full_col' : 'col'} label={isExpertParallel ? t('lblExpertShard') : t('lblColShard')} rankIndex={i} />
                            <WeightBlock title={t('tMoEDown')} dims={isExpertParallel ? String.raw`\frac{E}{4}\times(H_E\to H)` : String.raw`\frac{EH}{4}\times H`} splitDir={isExpertParallel ? 'full_col' : 'row'} label={isExpertParallel ? t('lblExpertShard') : t('lblRowShard')} rankIndex={i} />
                          </div>
                        );
                      })}
                   </div>

                   {/* Row 5: Inter-layer Comm (Slice) / Arrows */}
                   <div className={`relative w-full flex items-center justify-center transition-all duration-500 ${modelType === 'dp' ? 'h-20 my-2' : 'h-8 my-1'}`}>
                      <div className="absolute inset-0 grid grid-cols-4 gap-2 w-full h-full opacity-10">
                        {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-full border-l-2 border-slate-500 border-dashed"></div>)}
                      </div>

                      {modelType === 'tp' && (
                         <div className="absolute inset-0 grid grid-cols-4 gap-2 w-full h-full">
                           {[0,1,2,3].map(i => <div key={i} className="flex justify-center items-center h-full"><ArrowDown size={20} className={`transition-all duration-500 ${snapshot.views.outputVisible ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                         </div>
                      )}

                      {modelType === 'dp' && snapshot.views.returnVisible && (
                         <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                           <defs>
                             <marker id="arrow-slice" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                               <polygon points="0 0, 6 3, 0 6" fill="#10b981" />
                             </marker>
                           </defs>
                           {[12.5, 37.5, 62.5, 87.5].map((x, i) => snapshot.moeTopology === 'ep' ? (
                             <React.Fragment key={`combine-${i}`}>
                               <line x1={`${x}%`} y1="0%" x2="50%" y2="48%" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" className="animate-flow" />
                               <line x1="50%" y1="52%" x2={`${x}%`} y2="100%" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-slice)" className="animate-flow" />
                             </React.Fragment>
                           ) : (
                             <line key={`slice-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-slice)" className="animate-flow" />
                           ))}
                         </svg>
                      )}

                      {modelType === 'dp' && (
                        <div className={`absolute left-1/2 z-20 w-[150px] -translate-x-1/2 transition-all duration-500
                          ${snapshot.views.returnVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                          <div className="flex flex-col items-center rounded-xl border-2 border-emerald-400 bg-emerald-50 px-2 py-1.5 text-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            <div className="flex items-center justify-center gap-1 text-center text-[9px] font-bold leading-tight">
                              {snapshot.moeTopology === 'ep' ? <Network size={13} className={snapshot.communicationOperation === 'expertCombine' ? 'animate-pulse' : ''} /> : <Scissors size={13} className={snapshot.communicationOperation === 'reduceScatter' ? "animate-pulse" : ""} />}
                              {t(snapshot.moeTopology === 'ep' ? 'tCombine' : 'tReduceScatter')}
                            </div>
                            <div className="mt-0.5 text-[8px] font-semibold text-emerald-700">{t('returnResult')}</div>
                            <div className="text-[9px] text-emerald-900"><MathFormula>{snapshot.tensors.finalShapeLatex}</MathFormula></div>
                          </div>
                        </div>
                      )}
                   </div>

                   {/* Row 6: Final Output */}
                   <div className="grid grid-cols-4 gap-2 w-full pb-4">
                      {[0, 1, 2, 3].map(i => {
                        const isFinalOutActive = snapshot.views.outputVisible;
                        return (
                          <div key={i} className={`flex min-w-0 justify-center transition-all duration-700 ${isFinalOutActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                             <DataBlock 
                                title={t(modelType === 'dp' ? 'tReturnedOutput' : 'tMoEOut')} dims={snapshot.tensors.finalShapeLatex}
                                mode={modelType === 'dp' ? 'localMatrix' : 'full'}
                                label={modelType === 'dp' ? t('lblRowShardLoop') : t('lblRepFull')}
                                emptyLabel={t('empty')} isEmpty={!isFinalOutActive} rankIndex={i}
                             />
                          </div>
                        );
                      })}
                   </div>

                 </div>
               </div>
            </div>
          </div>

          {/* Right Column: Pseudocode Panel */}
          <div className="xl:col-span-5 bg-slate-900 rounded-2xl p-4 md:p-6 shadow-lg border border-slate-800 text-slate-300 flex flex-col relative overflow-hidden h-full">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Code size={120}/></div>
             <h2 className="text-base font-bold mb-4 text-white border-b border-slate-700 pb-2 flex items-center justify-between z-10 shrink-0">
               <div className="flex items-center gap-2"><Code className="text-emerald-400" size={18} /> {t('pyTitle')}</div>
               <span className="text-[10px] text-slate-400 font-mono border border-slate-700 px-2 py-0.5 rounded bg-slate-800 shadow-sm">Python</span>
             </h2>

             <div className="font-mono text-[11px] md:text-[12px] overflow-x-auto overflow-y-auto bg-[#0a0f18] p-4 rounded-xl border border-slate-800 flex-1 leading-relaxed z-10 shadow-inner custom-scrollbar">
               <div className="min-w-[430px] whitespace-pre">
                 <div><span className="text-purple-400">def</span> <span className="text-blue-400">forward_layer</span>(x, request_meta):</div>
                 <br/>
                 <div className={snapshot.operation === 'input' ? "bg-slate-800 text-slate-100 px-2 -mx-2 rounded border-l-2 border-slate-400 transition-all py-1" : "text-slate-500 py-1"}>
                   <div>  <span className="text-slate-600">{modelType === 'tp' ? t('pyTp1') : t('pyDp1')}</span></div>
                   <div>  x_owned = select_owned_requests(x, request_meta)</div>
                 </div>
                 <br/>
                 <div className={snapshot.operation === 'attention' ? `${modelType === 'tp' ? 'bg-rose-900/40 text-rose-100 border-rose-500' : 'bg-emerald-900/30 text-emerald-100 border-emerald-500'} px-2 -mx-2 rounded border-l-2 transition-all py-1` : "text-slate-500 py-1"}>
                   <div>  <span className="text-emerald-500">{t('pyQuerySource')}</span></div>
                   <div>  q = q_proj(x_owned)</div>
                   <div>  c_kv, k_rope = kv_proj(x_owned)</div>
                   <div>  <span className="text-emerald-500">{t('pyKvState')}</span></div>
                   <div>  kv_cache.write(request_meta.slots, c_kv, k_rope)</div>
                   <div>  attn_local = mla_decode(q, kv_cache.local_view(request_meta))</div>
                 </div>
                 {modelType === 'dp' && snapshot.moeTopology === 'tp' && (
                   <>
                     <br/>
                     <div className={snapshot.operation === 'gather' ? "bg-amber-900/40 text-amber-100 px-2 -mx-2 rounded border-l-2 border-amber-500 transition-all py-1" : "text-slate-500 py-1"}>
                       <div>  <span className="text-amber-500">{t('pyGather')}</span></div>
                       <div>  x_global = dp_gather(attn_local, request_meta.dp_sizes)</div>
                     </div>
                   </>
                 )}
                 {modelType === 'dp' && snapshot.moeTopology === 'ep' && (
                   <>
                     <br/>
                     <div className={snapshot.operation === 'expertDispatch' ? "bg-amber-900/40 text-amber-100 px-2 -mx-2 rounded border-l-2 border-amber-500 transition-all py-1" : "text-slate-500 py-1"}>
                       <div>  <span className="text-amber-500">{t('pyEpDispatch')}</span></div>
                       <div>  route = router.topk(attn_local)</div>
                       <div>  expert_in = all_to_all_dispatch(attn_local, route)</div>
                     </div>
                   </>
                 )}
                 <br/>
                 <div className={snapshot.operation === 'moe' ? "bg-indigo-900/40 text-indigo-100 px-2 -mx-2 rounded border-l-2 border-indigo-400 transition-all py-1" : "text-slate-500 py-1"}>
                   <div>  <span className="text-indigo-300">{t(snapshot.moeTopology === 'ep' ? 'pyMoeEp' : 'pyMoeTp')}</span></div>
                   <div>  expert_out = local_experts({modelType === 'tp' ? 'attn_local' : snapshot.moeTopology === 'ep' ? 'expert_in' : 'x_global'})</div>
                 </div>
                 {modelType === 'dp' && (
                   <>
                     <br/>
                     <div className={['reduceScatter', 'expertCombine'].includes(snapshot.operation) ? "bg-emerald-900/40 text-emerald-100 px-2 -mx-2 rounded border-l-2 border-emerald-400 transition-all py-1" : "text-slate-500 py-1"}>
                       <div>  <span className="text-emerald-500">{t(snapshot.moeTopology === 'ep' ? 'pyEpCombine' : 'pyReduceScatter')}</span></div>
                       <div>  x_local = {snapshot.moeTopology === 'ep' ? 'all_to_all_combine(expert_out, route)' : 'dp_reduce_scatter(expert_out)'}</div>
                     </div>
                   </>
                 )}
                 {modelType === 'tp' && (
                   <>
                     <br/>
                     <div className={snapshot.operation === 'output' ? "bg-purple-900/40 text-purple-100 px-2 -mx-2 rounded border-l-2 border-purple-400 transition-all py-1" : "text-slate-500 py-1"}>
                       <div>  x_local = tp_all_reduce(expert_out)</div>
                     </div>
                   </>
                 )}
                 <br/>
                 <div className={phase === 'done' ? "bg-slate-800 text-white px-2 -mx-2 rounded border-l-2 border-white transition-all py-1" : "text-slate-500 py-1"}>
                   <div>  <span className="text-slate-500">{t('pyCommit')}</span></div>
                   <div>  <span className="text-purple-400">return</span> x_local</div>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Bottom Panel: Analysis */}
        <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-5 md:p-6 shadow-xl border border-indigo-700 flex flex-col w-full">
          <h3 className="text-sm font-bold mb-4 text-white border-b border-indigo-600 pb-2 flex items-center gap-2 uppercase tracking-widest">
            <Info size={16} className="text-indigo-300"/> {t('analysis')}
          </h3>
          <div className="text-[13px] leading-relaxed flex-1 flex flex-col justify-center">
            {phase === 'idle' ? (
              <p className="opacity-70 italic text-center py-4">{t('idleDesc')}</p>
            ) : modelType === 'tp' ? (
               <div className="animate-fade-in p-5 bg-rose-950/40 border-2 border-rose-800 rounded-xl shadow-inner">
                 <h4 className="text-rose-300 text-base font-bold mb-3 flex items-center gap-2"><AlertTriangle size={18}/> {t('tpProblemTitle')}</h4>
                 <p className="opacity-90 leading-loose text-[14px]">{t('tpProblemDesc')}</p>
                 <div className="mt-4 grid gap-2 md:grid-cols-2">
                   <div className="overflow-x-auto rounded-lg border border-rose-700/70 bg-slate-950/60 p-2 text-center"><MathFormula>{snapshot.cache.formulaLatex}</MathFormula></div>
                   <div className="overflow-x-auto rounded-lg border border-rose-700/70 bg-slate-950/60 p-2 text-center"><MathFormula>{snapshot.cache.totalFormulaLatex}</MathFormula></div>
                 </div>
                 <div className="mt-3 rounded-lg border border-indigo-700 bg-indigo-950/60 p-3 text-[12px] leading-relaxed text-indigo-100"><span className="font-bold text-indigo-300">{t('boundaryTitle')}：</span>{t('boundaryDesc')}</div>
               </div>
            ) : (
               <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                 <div className={`p-5 bg-emerald-950/40 border border-emerald-800 rounded-xl transition-all duration-500 ${['input', 'attention'].includes(snapshot.operation) ? 'ring-2 ring-emerald-500/50 scale-[1.01] shadow-lg' : 'opacity-80'}`}>
                    <h4 className="text-emerald-300 font-bold mb-2.5 text-base flex items-center gap-2"><Zap size={16}/> {t('dpSolutionTitle')}</h4>
                    <p className="opacity-90 leading-relaxed text-[14px]">{t('dpSolutionDesc')}</p>
                    <div className="mt-3 space-y-2">
                      <div className="overflow-x-auto rounded-lg border border-emerald-800 bg-slate-950/60 p-2 text-center"><MathFormula>{snapshot.cache.formulaLatex}</MathFormula></div>
                      <div className="overflow-x-auto rounded-lg border border-emerald-800 bg-slate-950/60 p-2 text-center"><MathFormula>{snapshot.cache.totalFormulaLatex}</MathFormula></div>
                    </div>
                 </div>
                 <div className={`p-5 bg-amber-950/40 border border-amber-800 rounded-xl transition-all duration-500 ${snapshot.communicationOperation || snapshot.operation === 'moe' ? 'ring-2 ring-amber-500/50 scale-[1.01] shadow-lg' : 'opacity-80'}`}>
                    <h4 className="text-amber-300 font-bold mb-2.5 text-base flex items-center gap-2"><Network size={16}/> {t('commTradeoffTitle')}</h4>
                    <p className="opacity-90 leading-relaxed text-[14px]">{t('commTradeoffDesc')}</p>
                    <div className="mt-3 rounded-lg border border-indigo-700 bg-indigo-950/60 p-3 text-[12px] leading-relaxed text-indigo-100"><span className="font-bold text-indigo-300">{t('boundaryTitle')}：</span>{t('boundaryDesc')}</div>
                 </div>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const GridHorizontalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="8" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="16" y2="21"></line>
  </svg>
);

const ActivityIndicator = () => (
  <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
);

export default DpAttentionVisualizer;
