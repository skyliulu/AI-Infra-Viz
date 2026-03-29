import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Database, Zap, Code, Layers, Info, Globe, AlertTriangle, Network, Scissors, ArrowDown, Cpu, GripHorizontal } from 'lucide-react';

const i18n = {
  zh: {
    title: 'DP Attention 混合并行原理解析',
    subtitle: '张量切片级视图：深入 MLA × MoE 的极致显存优化',
    langToggle: 'EN',
    standard: '标准 TP (Standard TP)',
    dp: 'DP Attention (混合并行)',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    
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

    modelView: 'Transformer 层张量切片流水线',
    kvWaste: 'KV Cache 全局显存消耗',
    wasteAlert: '灾难性冗余 (4x 浪费)',
    wasteOptimal: '完美分割 (1x 零冗余)',
    
    dimLegend: '全局张量维度说明',
    dimB: 'B = 批次大小 (Batch Size)',
    dimS: 'S = 序列长度 (Sequence Length)',
    dimH: 'H = 隐藏层维度 (Hidden Size)',
    dimDc: 'd_c = 压缩隐向量维度 (Latent Dim)',
    rank: 'Rank',
    globalQueue: '全局输入请求队列 (Global Request Queue)',

    // 张量标签
    tInput: '输入激活值 (Hidden States)',
    tLatent: 'Latent 投影 (KV 压缩)',
    tKV: 'KV Cache (c_t 隐向量)',
    tWQ: 'W_q, W_up (注意力权重)',
    tAttnOut: 'Attention 输出',
    tGather: 'All-Gather (跨卡聚合)',
    tSlice: 'Slice (截取本地 Batch)',
    tMoEIn: 'MoE 专家层输入',
    tMoEUp: 'W_1, W_3 (专家 Up Proj)',
    tMoEDown: 'W_2 (专家 Down Proj)',
    tMoEOut: '层最终输出',

    lblRowShardB4: 'Row Shard (B/4切块)',
    lblRepFull: 'Replicated (全量拷贝)',
    lblSharedFull: 'Shared (全拷贝)',
    lblColShardHead: 'Col Shard (切头)',
    lblSharedNone: 'Shared (不切分)',
    lblRepDisaster: 'Replicated × 4 (灾难复制)',
    lblRowShardPerf: 'Row Shard (完美切块)',
    lblRowShardLocal: 'Row Shard (局部结果)',
    lblFullReduce: 'Full (跨卡归约)',
    lblFullBatchIn: 'Full Batch (全量输入)',
    lblColShard: 'Col Shard (切分)',
    lblRowShard: 'Row Shard (切分)',
    lblRowShardLoop: 'Row Shard (本地闭环)',

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

    // 原理解析
    analysis: '深度张量解析',
    idleDesc: '请点击播放，观察矩阵和张量在 4 个独立物理 Rank 中是如何被切块（Row/Col Shard）和合并分发的。初始化阶段仅预加载了模型权重。',
    tpProblemTitle: 'MLA 架构在标准 TP 下的灾难',
    tpProblemDesc: '由于 MLA 将 KV Cache 压缩成了一个极小的全局共享隐向量 c_t。在标准张量并行下，模型按 Attention Head 被“纵切 (Col Shard)”。为了完成矩阵乘法，每一路 Rank 都必须在本地拷贝一份完整的 c_t 张量。如图中红色告警所示，KV Cache 被强制复制了 4 层，原本的压缩红利被 TP 的切分机制彻底抹平。',
    dpSolutionTitle: '手术刀级别的重构：切数据，不切头',
    dpSolutionDesc: 'DP Attention 选择在 MLA 层放弃 TP 切分：每个 Rank 保留完整的 Attention 权重矩阵，转而对 Batch 维度进行“横切 (Row Shard)”。4 个 Rank 各自只处理自己的子批次请求。因此，KV Cache 也被完美地切成了 4 块，物理隔离地分布在不同卡的显存中，实现了惊人的 0 冗余。',
    commTradeoffTitle: '动态合并与分发的 Trade-off',
    commTradeoffDesc: '如果一直用 DP 模式跑下去，就没法利用巨大的 MoE 专家层了（MoE 必须跨卡 TP 协同）。因此，在算完 Attention 后，系统插入了一次跨卡 All-Gather，如图中动态箭头所示，4 路局部数据合并成全量矩阵后再广播给所有人。虽然消耗了 NVLink 带宽，但省下的海量 KV 显存足以让并发吞吐翻数倍。',
  },
  en: {
    title: 'DP Attention Principle Visualization',
    subtitle: 'Tensor-Level View: Extreme Memory Optimization in MLA × MoE',
    langToggle: '中文',
    standard: 'Standard TP',
    dp: 'DP Attention',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    
    statusIdle: 'System Initialized. Awaiting Requests...',
    statusTpAttn: 'MLA Layer: TP Compute (Memory Alert)',
    statusTpMoe: 'MoE Layer: Standard TP Compute',
    statusTpOut: 'Layer Final Output Complete',
    statusDpAttn: 'MLA Layer: DP Compute (Zero KV Waste)',
    statusDpGather: 'Comm: All-Gather Merge & Distribute',
    statusDpMoe: 'MoE Layer: Standard TP',
    statusDpSlice: 'Comm: Slice local subset',
    done: 'Transformer Layer Complete',

    modelView: 'Transformer Tensor Sharding Pipeline',
    kvWaste: 'Global KV Cache Memory Footprint',
    wasteAlert: 'Catastrophic (4x Waste)',
    wasteOptimal: 'Perfectly Sharded (1x)',

    dimLegend: 'Global Tensor Dimensions Legend',
    dimB: 'B = Batch Size',
    dimS: 'S = Sequence Length',
    dimH: 'H = Hidden Size',
    dimDc: 'd_c = Latent Dim',
    rank: 'Rank',
    globalQueue: 'Global Input Request Queue',

    tInput: 'Input Activations',
    tLatent: 'Latent Proj (KV)',
    tKV: 'KV Cache (c_t vector)',
    tWQ: 'W_q, W_up (Attn Weights)',
    tAttnOut: 'Attention Output',
    tGather: 'All-Gather (Merge)',
    tSlice: 'Slice (Local Batch)',
    tMoEIn: 'MoE Expert Input',
    tMoEUp: 'W_1, W_3 (Up Proj)',
    tMoEDown: 'W_2 (Down Proj)',
    tMoEOut: 'Layer Final Output',

    lblRowShardB4: 'Row Shard (B/4)',
    lblRepFull: 'Replicated (Full)',
    lblSharedFull: 'Shared (Full Copy)',
    lblColShardHead: 'Col Shard (Heads)',
    lblSharedNone: 'Shared (No Shard)',
    lblRepDisaster: 'Replicated × 4 (Disaster)',
    lblRowShardPerf: 'Row Shard (Perfect)',
    lblRowShardLocal: 'Row Shard (Local)',
    lblFullReduce: 'Full (Cross-card Reduce)',
    lblFullBatchIn: 'Full Batch (Input)',
    lblColShard: 'Col Shard',
    lblRowShard: 'Row Shard',
    lblRowShardLoop: 'Row Shard (Local Loop)',

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

    analysis: 'Deep Tensor Analysis',
    idleDesc: 'Click play to observe how tensors are sharded and merged. At initialization, only model weights are preloaded.',
    tpProblemTitle: 'The Disaster of MLA under Standard TP',
    tpProblemDesc: 'MLA compresses KV Cache into a tiny global shared latent vector c_t. Under standard Tensor Parallelism, the model is "Col Sharded" by Attention Heads. To complete matrix multiplication, every Rank must locally copy the FULL c_t tensor. As shown by the red alert, the KV Cache is replicated 4 times, completely erasing MLA\'s compression benefits.',
    dpSolutionTitle: 'Surgical Restructuring: Shard Data, Not Heads',
    dpSolutionDesc: 'DP Attention Abandons TP sharding in the MLA layer: every Rank keeps Attention weight matrices whole and instead "Row Shards" the Batch dimension. The 4 Ranks each handle only their own subset of user requests. Consequently, the KV Cache is perfectly sliced into 4 physically isolated pieces, achieving zero redundancy.',
    commTradeoffTitle: 'Dynamic Merge & Distribute Trade-off',
    commTradeoffDesc: 'Remaining in DP mode would prevent utilizing the massive MoE expert layer (which requires cross-card TP). Thus, after Attention, an All-Gather merges the 4 local subsets into a full matrix and broadcasts it. While this consumes NVLink bandwidth, the saved KV memory enables massively larger batch sizes.',
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
    <div className={`rounded-md border p-1.5 flex flex-col items-center justify-between w-full transition-all duration-500 ${baseClass}`}>
      <div className="text-center mb-1">
        <div className="text-[9px] md:text-[10px] font-bold text-indigo-800 leading-tight whitespace-nowrap">{title}</div>
        <div className="text-[7px] md:text-[8px] font-mono text-indigo-400/80">{dims}</div>
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

      <div className="text-[7px] font-mono mt-0.5 px-1.5 rounded bg-indigo-100/50 text-indigo-600 border border-indigo-100">
        {label}
      </div>
    </div>
  );
};

// 数据激活值块 (带有 isEmpty 判空逻辑)
const DataBlock = ({ title, dims, mode, label, isEmpty = false, isAlert = false, rankIndex = 0 }) => {
  if (isEmpty) {
    return (
      <div className={`rounded-md border-2 border-dashed border-slate-300 bg-slate-50/50 p-1.5 flex flex-col items-center justify-between w-full h-full min-h-[64px]`}>
         <div className="text-center mb-1 w-full">
            <div className="text-[9px] md:text-[10px] font-bold text-slate-400 leading-tight whitespace-nowrap">{title}</div>
            <div className="text-[7px] md:text-[8px] font-mono text-slate-400/70">{dims}</div>
         </div>
         <div className="flex-1 flex items-center justify-center">
            <span className="text-[8px] font-bold text-slate-300 italic">Empty</span>
         </div>
         <div className="text-[7px] font-mono mt-0.5 text-transparent select-none">-</div>
      </div>
    );
  }

  const baseClass = "bg-white border-slate-300 shadow-sm";
  
  return (
    <div className={`rounded-md border p-1.5 flex flex-col items-center justify-between w-full min-h-[64px] transition-all duration-300 ${baseClass} ${isAlert ? 'ring-2 ring-rose-500 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-[1.02]' : ''}`}>
      <div className="text-center mb-1">
        <div className={`text-[9px] md:text-[10px] font-bold ${isAlert ? 'text-rose-600' : 'text-slate-700'} leading-tight whitespace-nowrap`}>{title}</div>
        <div className="text-[7px] md:text-[8px] font-mono text-slate-500">{dims}</div>
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

      <div className={`text-[7px] font-mono mt-0.5 whitespace-nowrap ${isAlert ? 'text-rose-600 font-bold bg-rose-50 px-1 rounded' : 'text-slate-500'}`}>
        {label}
      </div>
    </div>
  );
};

// --- 主应用组件 ---
const DpAttentionVisualizer = () => {
  const [modelType, setModelType] = useState('dp'); 
  const [activeStep, setActiveStep] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  const tpSteps = 4; // TP steps increased to 4 to separate MoE Input/Compute and Final Output
  const dpSteps = 5; 

  useEffect(() => {
    let timer;
    if (isPlaying) {
      const maxSteps = modelType === 'tp' ? tpSteps : dpSteps;
      if (activeStep < maxSteps) {
        let delay = 2500;
        if (activeStep === 0) delay = 1000;
        if (modelType === 'dp' && (activeStep === 3 || activeStep === 5)) delay = 2200; 
        if (modelType === 'tp' && (activeStep === 1 || activeStep === 3)) delay = 2200;
        timer = setTimeout(() => setActiveStep(prev => prev + 1), delay);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, activeStep, modelType]);

  const togglePlay = () => {
    if (activeStep >= (modelType === 'tp' ? tpSteps : dpSteps)) reset();
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setIsPlaying(false);
    setActiveStep(0);
  };

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      reset();
    }
  };

  const getStatusText = () => {
    if (activeStep === 0) return t('statusIdle');
    if (modelType === 'tp') {
      if (activeStep === 1 || activeStep === 2) return t('statusTpAttn');
      if (activeStep === 3) return t('statusTpMoe');
      if (activeStep === 4) return t('statusTpOut');
    } else {
      if (activeStep === 1 || activeStep === 2) return t('statusDpAttn');
      if (activeStep === 3) return t('statusDpGather');
      if (activeStep === 4) return t('statusDpMoe');
      if (activeStep === 5) return t('statusDpSlice');
    }
    return t('done');
  };

  const getMemoryUsage = () => {
    if (activeStep === 0) return 0;
    if (modelType === 'tp') return activeStep >= 2 ? 400 : 100;
    return activeStep >= 2 ? 100 : 25; 
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
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
              <button onClick={() => handleModelTypeChange('tp')} className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'tp' ? 'bg-white shadow-sm text-rose-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlertTriangle size={14} /> {t('standard')}
              </button>
              <button onClick={() => handleModelTypeChange('dp')} className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'dp' ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
                <Zap size={14} /> {t('dp')}
              </button>
            </div>
            <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="p-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm flex items-center gap-1.5" title="Language">
              <Globe size={16} />
              <span className="text-[11px] font-bold">{lang === 'zh' ? 'EN' : '中文'}</span>
            </button>
            <button onClick={reset} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm" title={t('reset')}><RotateCcw size={18} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition shadow-md ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? t('pause') : t('play')}
            </button>
            <button onClick={() => { setIsPlaying(false); setActiveStep(s => Math.min(s+1, modelType === 'tp' ? tpSteps : dpSteps)); }} disabled={isPlaying || activeStep >= (modelType==='tp'?tpSteps:dpSteps)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-bold disabled:opacity-50 transition shadow-sm">
              <SkipForward size={16} /> <span className="hidden md:inline">{t('next')}</span>
            </button>
          </div>
        </div>

        {/* Main Workspace: 2-Column Grid (Flow vs Pseudocode) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch w-full">
          
          {/* Left Column: Flow Diagram (Tensor view) */}
          <div className="xl:col-span-7 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden h-full">
            
            {/* Status Bar inside the Viz */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-20 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
              <div className={`flex items-center gap-2 text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-md transition-colors ${activeStep === 0 ? 'bg-slate-600' : (modelType === 'tp' && activeStep >= 1 && activeStep <=2 ? 'bg-rose-600' : 'bg-emerald-600')}`}>
                 {activeStep === 0 ? <Database size={14}/> : <ActivityIndicator />}
                 {getStatusText()}
              </div>

              <div className="flex-1 max-w-[280px] w-full flex flex-col gap-1">
                <div className="flex justify-between text-[10px] md:text-xs font-bold px-1">
                  <span className="text-slate-500 flex items-center gap-1"><Database size={12}/> {t('kvWaste')}</span>
                  <span className={getMemoryUsage() > 100 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}>
                    {getMemoryUsage()}% {getMemoryUsage() > 100 ? `(${t('wasteAlert')})` : `(${t('wasteOptimal')})`}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner relative">
                   <div className={`h-full transition-all duration-700 ease-out ${getMemoryUsage() > 100 ? 'bg-rose-500' : (activeStep === 0 ? 'bg-transparent' : 'bg-emerald-500')}`} style={{ width: `${Math.min(getMemoryUsage(), 100)}%` }}></div>
                   {getMemoryUsage() > 100 && (
                     <div className="absolute top-0 left-0 h-full bg-rose-700 opacity-80 animate-pulse transition-all duration-700" style={{ width: '100%' }}></div>
                   )}
                </div>
              </div>
            </div>

            <div className="relative pb-4 flex flex-col items-center justify-start flex-1 overflow-x-auto overflow-y-hidden">
               
               <div className="flex flex-col md:flex-row items-center justify-between w-full min-w-[700px] mb-4 gap-4 px-2">
                 <div className="text-xs font-bold text-slate-500 tracking-wider uppercase border border-slate-200 px-3 py-1 rounded bg-slate-50 shadow-sm flex items-center gap-1.5 shrink-0">
                   <Layers size={14} /> {t('modelView')}
                 </div>
                 
                 <div className="flex flex-wrap justify-end gap-2 shrink-0">
                   <span className="px-2 py-1 bg-white text-slate-600 text-[9px] md:text-[10px] rounded font-mono border border-slate-200 shadow-sm">{t('dimB')}</span>
                   <span className="px-2 py-1 bg-white text-slate-600 text-[9px] md:text-[10px] rounded font-mono border border-slate-200 shadow-sm">{t('dimS')}</span>
                   <span className="px-2 py-1 bg-white text-slate-600 text-[9px] md:text-[10px] rounded font-mono border border-slate-200 shadow-sm">{t('dimH')}</span>
                   <span className="px-2 py-1 bg-white text-slate-600 text-[9px] md:text-[10px] rounded font-mono border border-slate-200 shadow-sm">{t('dimDc')}</span>
                 </div>
               </div>

               {/* Swimlanes Container */}
               <div className="w-full flex-1">
                 <div className="min-w-[700px] flex flex-col relative gap-3 h-full px-2">

                   {/* Global Request Queue */}
                   <div className="w-full flex flex-col items-center mb-2">
                      <div className="text-[10px] font-bold text-slate-600 mb-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 shadow-sm">
                        {t('globalQueue')}
                      </div>
                      <div className={`w-[280px] h-6 flex rounded shadow-md overflow-hidden border transition-all duration-500 ${activeStep === 0 ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-300 opacity-40'}`}>
                        {bColors.map((c, i) => <div key={i} className={`flex-1 ${c} border-r border-black/10 last:border-0`} />)}
                      </div>
                   </div>

                   {/* Column Headers */}
                   <div className="grid grid-cols-4 gap-3 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="text-center bg-slate-800 text-white py-1.5 rounded-t-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                          <Cpu size={12}/> {t('rank')} {i}
                        </div>
                      ))}
                   </div>

                   {/* Row 1: Input */}
                   <div className="grid grid-cols-4 gap-3 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex justify-center transition-all duration-500 h-full">
                           <DataBlock 
                              title={t('tInput')} dims={modelType === 'dp' && activeStep >= 1 ? "[B/4, S, H]" : "[B, S, H]"}
                              mode={modelType === 'dp' && activeStep >= 1 ? 'subset' : 'full'}
                              label={modelType === 'dp' && activeStep >= 1 ? t('lblRowShardB4') : t('lblRepFull')}
                              isEmpty={activeStep < 1} rankIndex={i}
                           />
                        </div>
                      ))}
                   </div>

                   {/* Inter-layer Arrow 1 */}
                   <div className="grid grid-cols-4 gap-3 w-full">
                     {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-4 items-center"><ArrowDown size={14} className={`transition-all duration-500 ${activeStep >= 1 ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                   </div>

                   {/* Row 2: MLA Box */}
                   <div className="grid grid-cols-4 gap-3 w-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`border rounded-xl p-2.5 flex flex-col gap-2.5 transition-all duration-500 shadow-sm
                          ${activeStep >= 1 ? (modelType === 'tp' ? 'border-rose-300 bg-rose-50/30' : 'border-indigo-300 bg-indigo-50/40') : 'border-slate-200 bg-slate-50/50'}`}>
                          
                          <div className="text-[9px] font-bold text-center text-slate-500 mb-0.5 border-b border-slate-200 pb-1">MLA Layer</div>
                          
                          <WeightBlock title={t('tLatent')} dims="[H, d_c]" splitDir="full_square" label={t('lblSharedFull')} rankIndex={i} />
                          
                          <WeightBlock 
                             title={t('tWQ')} 
                             dims={modelType === 'tp' ? "[d_c, (H_a·d_h)/4]" : "[d_c, H_a·d_h]"} 
                             splitDir={modelType === 'tp' ? 'col' : 'full_col'} 
                             label={modelType === 'tp' ? t('lblColShardHead') : t('lblSharedNone')} 
                             rankIndex={i} 
                          />
                          
                          <div className="relative my-1">
                             {modelType === 'tp' && activeStep >= 2 && <div className="absolute inset-0 bg-rose-500/10 animate-pulse rounded-lg border border-rose-300 z-0"></div>}
                             <DataBlock 
                                title={t('tKV')} dims={modelType === 'tp' ? "[B, d_c]" : "[B/4, d_c]"}
                                mode={modelType === 'tp' ? 'replicated' : 'subset'} 
                                label={modelType === 'tp' ? t('lblRepDisaster') : t('lblRowShardPerf')}
                                isEmpty={activeStep < 1} isAlert={modelType === 'tp' && activeStep >= 2} rankIndex={i}
                             />
                          </div>
                          
                          <DataBlock 
                             title={t('tAttnOut')} dims={modelType === 'dp' ? "[B/4, S, H]" : "[B, S, H]"}
                             mode={modelType === 'dp' ? 'subset' : 'full'} 
                             label={modelType === 'dp' ? t('lblRowShardLocal') : t('lblFullReduce')}
                             isEmpty={activeStep < 2} rankIndex={i}
                          />
                        </div>
                      ))}
                   </div>

                   {/* Row 3: Inter-layer Comm (All Gather) / Arrows */}
                   <div className={`relative w-full flex items-center justify-center transition-all duration-500 ${modelType === 'dp' ? 'h-24 my-2' : 'h-8 my-1'}`}>
                      <div className="absolute inset-0 grid grid-cols-4 gap-3 w-full h-full opacity-10">
                        {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-full border-l-2 border-slate-500 border-dashed"></div>)}
                      </div>

                      {modelType === 'tp' && (
                         <div className="absolute inset-0 grid grid-cols-4 gap-3 w-full h-full">
                           {[0,1,2,3].map(i => <div key={i} className="flex justify-center items-center h-full"><ArrowDown size={20} className={`transition-all duration-500 ${activeStep >= 3 ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                         </div>
                      )}

                      {modelType === 'dp' && activeStep >= 3 && (
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
                        <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 z-20 w-[160px]
                          ${activeStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                          <div className="bg-amber-50 border-2 border-amber-400 p-2.5 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] flex flex-col items-center">
                            <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5 mb-1 whitespace-nowrap">
                              <Network size={14} className={activeStep === 3 ? "animate-spin-slow" : ""} /> {t('tGather')}
                            </div>
                            <div className="text-[7px] font-mono text-amber-600 mb-1">[B, S, H]</div>
                            <div className="w-[70%] max-w-[80px] h-[24px] flex flex-col rounded-[2px] border border-amber-400 overflow-hidden shadow-inner">
                              {bColors.map((bg, j) => <div key={j} className={`flex-1 w-full ${bg} border-b border-black/10 last:border-0`} />)}
                            </div>
                          </div>
                        </div>
                      )}
                   </div>

                   {/* Row 4: MoE Box */}
                   <div className="grid grid-cols-4 gap-3 w-full">
                      {[0, 1, 2, 3].map(i => {
                        const isMoEInActive = (modelType === 'tp' ? activeStep >= 3 : activeStep >= 4);
                        
                        return (
                          <div key={i} className={`border rounded-xl p-2.5 flex flex-col gap-2.5 transition-all duration-500 shadow-sm
                            ${isMoEInActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            
                            <div className="text-[9px] font-bold text-center text-slate-500 mb-0.5 border-b border-slate-200 pb-1">MoE Layer</div>
                            
                            <DataBlock title={t('tMoEIn')} dims="[B, S, H]" mode="full" label={t('lblFullBatchIn')} isEmpty={!isMoEInActive} rankIndex={i} />
                            
                            <WeightBlock title={t('tMoEUp')} dims="[H, E·H/4]" splitDir="col" label={t('lblColShard')} rankIndex={i} />
                            <WeightBlock title={t('tMoEDown')} dims="[E·H/4, H]" splitDir="row" label={t('lblRowShard')} rankIndex={i} />
                          </div>
                        );
                      })}
                   </div>

                   {/* Row 5: Inter-layer Comm (Slice) / Arrows */}
                   <div className={`relative w-full flex items-center justify-center transition-all duration-500 ${modelType === 'dp' ? 'h-16 my-2' : 'h-8 my-1'}`}>
                      <div className="absolute inset-0 grid grid-cols-4 gap-3 w-full h-full opacity-10">
                        {[0,1,2,3].map(i => <div key={i} className="flex justify-center h-full border-l-2 border-slate-500 border-dashed"></div>)}
                      </div>

                      {modelType === 'tp' && (
                         <div className="absolute inset-0 grid grid-cols-4 gap-3 w-full h-full">
                           {[0,1,2,3].map(i => <div key={i} className="flex justify-center items-center h-full"><ArrowDown size={20} className={`transition-all duration-500 ${activeStep >= 4 ? 'text-indigo-400' : 'text-slate-300 opacity-30'}`} /></div>)}
                         </div>
                      )}

                      {modelType === 'dp' && activeStep >= 5 && (
                         <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="none">
                           <defs>
                             <marker id="arrow-slice" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                               <polygon points="0 0, 6 3, 0 6" fill="#10b981" />
                             </marker>
                           </defs>
                           {[12.5, 37.5, 62.5, 87.5].map((x, i) => (
                             <line key={`slice-${i}`} x1={`${x}%`} y1="0%" x2={`${x}%`} y2="100%" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-slice)" className="animate-flow" style={{ animationDirection: 'reverse' }} />
                           ))}
                         </svg>
                      )}

                      {modelType === 'dp' && (
                        <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 z-20 w-[140px]
                          ${activeStep >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
                          <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-800 text-[11px] font-bold px-4 py-2 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2">
                            <Scissors size={14} className={activeStep === 5 ? "animate-pulse" : ""} /> {t('tSlice')}
                          </div>
                        </div>
                      )}
                   </div>

                   {/* Row 6: Final Output */}
                   <div className="grid grid-cols-4 gap-3 w-full pb-4">
                      {[0, 1, 2, 3].map(i => {
                        const isFinalOutActive = (modelType === 'tp' ? activeStep >= 4 : activeStep >= 5);
                        return (
                          <div key={i} className={`flex justify-center transition-all duration-700 ${isFinalOutActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                             <DataBlock 
                                title={t('tMoEOut')} dims={modelType === 'dp' ? "[B/4, S, H]" : "[B, S, H]"}
                                mode={modelType === 'dp' ? 'subset' : 'full'}
                                label={modelType === 'dp' ? t('lblRowShardLoop') : t('lblRepFull')}
                                isEmpty={!isFinalOutActive} rankIndex={i}
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

             <div className="font-mono text-[11px] md:text-[12px] overflow-y-auto bg-[#0a0f18] p-4 rounded-xl border border-slate-800 flex-1 leading-relaxed z-10 shadow-inner custom-scrollbar">
               {modelType === 'tp' ? (
                 <div className="whitespace-pre">
                   <div><span className="text-purple-400">def</span> <span className="text-blue-400">tp_mla_layer</span>(x_global_batch):</div>
                   <br/>
                   <div className={activeStep === 1 ? "bg-slate-800 text-slate-100 px-2 -mx-2 rounded border-l-2 border-slate-500 transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-slate-600">{t('pyTp1')}</span></div>
                     <div>  x_input = x_global_batch <span className="text-slate-600"># [B, S, H]</span></div>
                   </div>
                   <br/>
                   <div className={activeStep === 2 ? "bg-rose-900/40 text-rose-100 px-2 -mx-2 rounded border-l-2 border-rose-500 font-bold transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-rose-400">{t('pyTp2')}</span></div>
                     <div>  <span className="text-rose-400">{t('pyTp3')}</span></div>
                     <div>  <span className="text-rose-500">{t('pyTp4')}</span></div>
                     <div className="mt-1">  c_t = latent_proj(x_input)</div>
                     <div className="bg-rose-500/20 px-1 rounded inline-block mt-1">  kv_c_t = alloc_full_copy(c_t) <span className="text-rose-400"># ⚠️ OOM Alert!</span></div>
                     <div className="mt-1">  q_local = q_proj_local(c_t)</div>
                     <div>  attn_local = flash_attn(q_local, kv_c_t)</div>
                     <div>  attn_out = all_reduce(attn_local)</div>
                   </div>
                   <br/>
                   <div className={activeStep === 3 ? "bg-indigo-900/40 text-indigo-100 px-2 -mx-2 rounded border-l-2 border-indigo-400 transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-slate-600">{t('pyTp5')}</span></div>
                     <div>  expert_in = dispatch(attn_out, router(attn_out))</div>
                     <div>  moe_local = expert_w2(gelu(expert_w13(expert_in)))</div>
                     <div>  moe_out = all_reduce(moe_local) <span className="text-slate-600"># TP sync compute</span></div>
                   </div>
                   <br/>
                   <div className={activeStep === 4 ? "bg-purple-900/40 text-purple-100 px-2 -mx-2 rounded border-l-2 border-purple-400 transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-slate-600">{t('pyTp5')}</span></div>
                     <div>  <span className="text-purple-400">return</span> moe_out</div>
                   </div>
                 </div>
               ) : (
                 <div className="whitespace-pre">
                   <div><span className="text-purple-400">def</span> <span className="text-blue-400">dp_mla_layer</span>(x_local_subset):</div>
                   <br/>
                   <div className={activeStep === 1 || activeStep === 2 ? "bg-emerald-900/30 text-emerald-100 px-2 -mx-2 rounded border-l-2 border-emerald-500 transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-emerald-500">{t('pyDp1')}</span></div>
                     <div>  <span className="text-slate-600"># x_local_subset shape: [B/4, S, H]</span></div>
                     <br/>
                     <div>  <span className="text-emerald-500">{t('pyDp2')}</span></div>
                     <div>  <span className="text-emerald-400 font-bold">{t('pyDp3')}</span></div>
                     <div className="mt-1">  c_t_local = latent_proj(x_local_subset)</div>
                     <div className={activeStep === 2 ? "bg-emerald-500/20 px-1 rounded inline-block font-bold mt-1" : "mt-1"}>  kv_local = alloc_minimal(c_t_local) <span className="text-emerald-400"># [B/4, d_c]</span></div>
                     <div className={activeStep === 2 ? "font-bold mt-1" : "mt-1"}>  q_full = q_proj_full(c_t_local)</div>
                     <div className={activeStep === 2 ? "font-bold" : ""}>  attn_local = flash_attn(q_full, kv_local)</div>
                   </div>
                   <br/>
                   <div className={activeStep === 3 ? "bg-amber-900/40 text-amber-100 px-2 -mx-2 rounded border-l-2 border-amber-500 font-bold transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-amber-500">{t('pyDp4')}</span></div>
                     <div>  x_global = dist.all_gather(attn_local) <span className="text-amber-400"># 🌐 Network IO</span></div>
                     <div>  <span className="text-slate-600"># x_global rebuilt to [B, S, H]</span></div>
                   </div>
                   <br/>
                   <div className={activeStep === 4 ? "bg-indigo-900/40 text-indigo-100 px-2 -mx-2 rounded border-l-2 border-indigo-400 transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-slate-600">{t('pyDp5')}</span></div>
                     <div>  expert_in = dispatch(x_global, router(x_global))</div>
                     <div>  moe_local = expert_w2(gelu(expert_w13(expert_in)))</div>
                     <div>  moe_global = all_reduce(moe_local) <span className="text-slate-600"># TP sync compute</span></div>
                   </div>
                   <br/>
                   <div className={activeStep === 5 ? "bg-emerald-900/40 text-emerald-100 px-2 -mx-2 rounded border-l-2 border-emerald-400 font-bold transition-all py-1" : "text-slate-500 py-1"}>
                     <div>  <span className="text-emerald-500">{t('pyDp6')}</span></div>
                     <div>  x_out = dist.slice(moe_global, rank=my_rank)</div>
                     <div>  <span className="text-slate-600"># x_out returns to [B/4, S, H]</span></div>
                     <br/>
                     <div>  <span className="text-purple-400">return</span> x_out</div>
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Bottom Panel: Analysis */}
        <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-5 md:p-6 shadow-xl border border-indigo-700 flex flex-col w-full">
          <h3 className="text-sm font-bold mb-4 text-white border-b border-indigo-600 pb-2 flex items-center gap-2 uppercase tracking-widest">
            <Info size={16} className="text-indigo-300"/> {t('analysis')}
          </h3>
          <div className="text-[13px] leading-relaxed flex-1 flex flex-col justify-center">
            {activeStep === 0 ? (
              <p className="opacity-70 italic text-center py-4">{t('idleDesc')}</p>
            ) : modelType === 'tp' ? (
               <div className="animate-fade-in p-5 bg-rose-950/40 border-2 border-rose-800 rounded-xl shadow-inner">
                 <h4 className="text-rose-300 text-base font-bold mb-3 flex items-center gap-2"><AlertTriangle size={18}/> {t('tpProblemTitle')}</h4>
                 <p className="opacity-90 leading-loose text-[14px]">{t('tpProblemDesc')}</p>
               </div>
            ) : (
               <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                 <div className={`p-5 bg-emerald-950/40 border border-emerald-800 rounded-xl transition-all duration-500 ${activeStep === 1 || activeStep === 2 ? 'ring-2 ring-emerald-500/50 scale-[1.02] shadow-lg' : 'opacity-70'}`}>
                    <h4 className="text-emerald-300 font-bold mb-2.5 text-base flex items-center gap-2"><Zap size={16}/> {t('dpSolutionTitle')}</h4>
                    <p className="opacity-90 leading-relaxed text-[14px]">{t('dpSolutionDesc')}</p>
                 </div>
                 <div className={`p-5 bg-amber-950/40 border border-amber-800 rounded-xl transition-all duration-500 ${activeStep === 3 || activeStep === 4 ? 'ring-2 ring-amber-500/50 scale-[1.02] shadow-lg' : 'opacity-70'}`}>
                    <h4 className="text-amber-300 font-bold mb-2.5 text-base flex items-center gap-2"><Network size={16}/> {t('commTradeoffTitle')}</h4>
                    <p className="opacity-90 leading-relaxed text-[14px]">{t('commTradeoffDesc')}</p>
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
