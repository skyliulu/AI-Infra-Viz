import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Grid, Boxes, SplitSquareHorizontal, BrainCircuit, Cpu, Network, RotateCcw, Info, ArrowDown, Pin, Globe, Play, Pause, SkipForward } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';

const MAX_GPUS = 16;
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
    dpName:'数据并行(DP)', dpDesc:'复制模型或模型分片组，把不同请求/批次分配给不同副本以扩展推理吞吐。',
    tpName:'张量并行(TP)', tpDesc:'切分层内权重与 Attention Head；每层需要 All-Reduce 或 Reduce-Scatter 等集合通信。',
    ppName:'流水线并行(PP)', ppDesc:'按模型深度切分层，相邻 Stage 通过 P2P 传递激活；Microbatch 用于填充流水线。',
    cpName:'上下文并行(CP)', cpDesc:'沿上下文长度切分激活或 KV；Prefill 与 Decode 的切分及通信方式不同于 SP。',
    epName:'专家并行(EP)', epDesc:'MoE Router 将 Top-K Token 通过 All-to-All 分发到持有目标专家的 Rank。',
    etpName:'专家张量并行(ETP)', etpDesc:'切分单个专家内部权重；通常与 TP/EP 共享或重组 Rank Mesh，并非普遍独立维度。',
    fullCopy: '全量复制',
    logicalTitle: 'LLM 数学架构与动态张量切片',
    inputData: 'Input Tokens Data',
    dpCpSplit: 'DP切B({dp}) × CP切S({cp})',
    fullData: '完整数据 (无切分)',
    embedMatrix: 'Embedding Matrix',
    rowSplit: '横向切行(TP={tp})',
    colSplit: '纵向切列(TP={tp})',
    fullWeight: '完整权重',
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
    noPp: '未开启流水线并行',
    attnBlock: 'Attention Block',
    qkvFused: 'Q,K,V (Fused)',
    qkvTooltip: '物理实现中 Q,K,V 通常被拼接为 3H 长度的一个大矩阵进行计算',
    outProj: 'Out Proj',
    kvCache: 'KV Cache & Activations',
    split3D: '3D切分: DP切B × CP切S × TP切H',
    kvMhaAssumption: '基础视图按 MHA 且 KV Head 可被 TP 整除绘制；GQA/MLA 在 TP 过大时可能复制 KV，后续由 DCP/Helix 模式表达。',
    noSplit: '无切分',
    moeLayer: 'MoE Layer (以 4 专家架构为例)',
    router: 'Router',
    routerDesc: '计算后通过 Router 分发至目标 Expert',
    expert: 'Expert',
    w1w3: 'w1,w3 (Up)',
    w2: 'w2 (Down)',
    colSlice: '纵切({label})',
    rowSlice: '横切({label})',
    fullCalc: '整块计算',
    wholeBlock: '整块',
    lmHead: 'LM Head',
    locked: '已锁定',
    totalGpu: '示意 GPU:',
    pageDesc: '调整参数并悬浮在物理卡上，观察六维正交示意中的张量切片与 GPU 槽位映射。',
    clusterHintTitle: '映射假设:',
    clusterHintDesc: '为保持六个维度独立可调，本页采用不复用 rank 的正交示意，总槽位 = DP × PP × CP × TP × EP × ETP。真实运行时可能复用或重组 TP、EP、ETP 进程组，因此该数值不是通用 world size 恒等式。',
    clusterHintBold: '点击右侧 GPU 卡片可将其固定锁定，方便对比观察。',
    physGpuMap: 'GPU 集群分片映射（正交示意）',
    singleCard: '单卡计算 (无切分)'
  },
  en: {
    title: 'Interactive LLM 6D Parallel Strategies', subtitle: 'Tune six parallel dimensions and observe tensor sharding + GPU mapping', reset: 'Reset', langToggle: '中文', empty: 'Available Slot', expand: 'Adjust strategies above to scale cluster usage (current',
    dpName:'Data Parallel (DP)', dpDesc:'Replicate a model or model-shard group and route different requests or batches to different replicas.',
    tpName:'Tensor Parallel (TP)', tpDesc:'Shard intra-layer weights and attention heads; each layer requires collectives such as All-Reduce or Reduce-Scatter.',
    ppName:'Pipeline Parallel (PP)', ppDesc:'Partition model depth, pass activations between adjacent stages with P2P, and fill the pipeline with microbatches.',
    cpName:'Context Parallel (CP)', cpDesc:'Shard activations or KV along context length; prefill and decode use different layouts and communication than SP.',
    epName:'Expert Parallel (EP)', epDesc:'The MoE router dispatches Top-K tokens with All-to-All to ranks that host the selected experts.',
    etpName:'Expert Tensor Parallel (ETP)', etpDesc:'Shard weights inside one expert; it usually shares or reorganizes a TP/EP rank mesh rather than being universally independent.',
    fullCopy: 'Full Replicate',
    logicalTitle: 'LLM Math Arch & Dynamic Tensor Sharding',
    inputData: 'Input Tokens Data',
    dpCpSplit: 'DP Shard B({dp}) × CP Shard S({cp})',
    fullData: 'Full Data (No Sharding)',
    embedMatrix: 'Embedding Matrix',
    rowSplit: 'Row Shard(TP={tp})',
    colSplit: 'Col Shard(TP={tp})',
    fullWeight: 'Full Weight',
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
    noPp: 'No Pipeline Parallelism',
    attnBlock: 'Attention Block',
    qkvFused: 'Q,K,V (Fused)',
    qkvTooltip: 'Physically Q, K, V are usually concatenated into a large 3H matrix.',
    outProj: 'Out Proj',
    kvCache: 'KV Cache & Activations',
    split3D: '3D Shard: DP(B) × CP(S) × TP(H)',
    kvMhaAssumption: 'The base view assumes MHA with KV heads divisible by TP. GQA/MLA may replicate KV when TP is too large; DCP/Helix modes will model that case.',
    noSplit: 'No Sharding',
    moeLayer: 'MoE Layer (4 Experts Example)',
    router: 'Router',
    routerDesc: 'Dispatched to target Expert via Router after calculation',
    expert: 'Expert',
    w1w3: 'w1,w3 (Up)',
    w2: 'w2 (Down)',
    colSlice: 'Col Shard({label})',
    rowSlice: 'Row Shard({label})',
    fullCalc: 'Full Calc',
    wholeBlock: 'Whole',
    lmHead: 'LM Head',
    locked: 'Pinned',
    totalGpu: 'Illustrative GPU:',
    pageDesc: 'Tune parameters and hover over GPU cards to inspect tensor shards in an orthogonal six-dimensional teaching map.',
    clusterHintTitle: 'Mapping assumption:',
    clusterHintDesc: 'To keep all six dimensions independently adjustable, this page uses an orthogonal no-rank-reuse sandbox: slots = DP × PP × CP × TP × EP × ETP. Real runtimes may reuse or reorganize TP, EP, and ETP process groups, so this is not a universal world-size identity. ',
    clusterHintBold: 'Click a GPU card on the right to pin it for comparison.',
    physGpuMap: 'GPU Shard Mapping (Orthogonal Sandbox)',
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

const App = () => {
  const [degrees, setDegrees] = useState({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
  const [hoveredGpu, setHoveredGpu] = useState(null);
  const [pinnedGpu, setPinnedGpu] = useState(null);
  const [lang, setLang] = useState(getInitialLang());
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 支持插值的 t 函数
  const t = (k, vars = {}) => {
    let str = i18n[lang][k] ?? k;
    Object.keys(vars).forEach(key => {
      str = str.replace(`{${key}}`, vars[key]);
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
    return degrees.dp * degrees.pp * degrees.cp * degrees.tp * degrees.ep * degrees.etp;
  }, [degrees]);

  const checkConstraints = (newDegrees) => {
    const total = newDegrees.dp * newDegrees.pp * newDegrees.cp * newDegrees.tp * newDegrees.ep * newDegrees.etp;
    return total <= MAX_GPUS;
  };

  const handleSetDegree = (dim, val) => {
    const newDegrees = { ...degrees, [dim]: val };
    if (checkConstraints(newDegrees)) {
      setDegrees(newDegrees);
      setPinnedGpu(null); // 当修改拓扑时自动解除锁定
      setPhase('idle');
      setStep(0);
      setIsPlaying(false);
    }
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

  useEffect(() => {
    if (!isPlaying || phase === 'done') return undefined;
    const timer = setTimeout(handleNextStep, 900);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, step, degrees.pp]);

  const reset = () => {
    setDegrees({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
    setHoveredGpu(null);
    setPinnedGpu(null);
    resetPipeline();
  };

  const getGpuCoords = (g) => {
    let rem = g;
    const etp_idx = rem % degrees.etp; rem = Math.floor(rem / degrees.etp);
    const ep_idx = rem % degrees.ep; rem = Math.floor(rem / degrees.ep);
    const tp_idx = rem % degrees.tp; rem = Math.floor(rem / degrees.tp);
    const cp_idx = rem % degrees.cp; rem = Math.floor(rem / degrees.cp);
    const dp_idx = rem % degrees.dp; rem = Math.floor(rem / degrees.dp);
    const pp_idx = rem % degrees.pp;

    return { tp_idx, ep_idx, etp_idx, cp_idx, dp_idx, pp_idx };
  };

  const DimBadge = ({ text, tooltip }) => (
    <span title={tooltip} className="ml-1 text-[8px] lg:text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded cursor-help whitespace-nowrap">
      {text}
    </span>
  );

  // 1. 基础权重矩阵块 (白色主题)
  const MatrixBlock = ({ title, dims, sliceDir, splitLabel, isLayerActive, activeColorClass, degree = 1, activeChunkIndex = 0, mW, mH, tooltip }) => {
    const inactiveColorClass = "bg-slate-100 border border-slate-200/60";
    const numChunks = sliceDir === 'rep' ? 1 : Math.max(1, degree);
    
    // 替换原本的 hoveredGpu 为 activeGpu
    const effectiveActive = (activeGpu === null) 
        ? Array.from({length: numChunks}).map((_, i) => i) 
        : (isLayerActive ? [activeChunkIndex] : []);

    return (
      <div className="bg-white rounded flex flex-col items-center justify-between border border-slate-200 p-1.5 md:p-2 h-full w-full shadow-sm" title={tooltip}>
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
        
        <div className="text-[7px] md:text-[8px] text-slate-500 whitespace-nowrap mt-1 text-center h-[14px] flex items-end justify-center">
          {sliceDir === 'rep' ? t('fullCopy') : splitLabel}
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
            <div className="space-y-1">
              {pipelineState.stages.map((stage) => (
                <div key={stage.stage} className="grid grid-cols-[58px_1fr] items-center gap-1">
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
              ))}
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
      </div>
    );
  };

  const renderLogicalView = () => {
    const coords = activeGpu !== null ? getGpuCoords(activeGpu) : null;
    
    const isEmbeddingActive = coords ? coords.pp_idx === 0 : true;
    const isLmHeadActive = coords ? coords.pp_idx === degrees.pp - 1 : true;

    const expertTp = degrees.etp;

    return (
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 flex flex-col gap-2 relative overflow-hidden h-full">
        {/* 修复：移除 xl:flex-row 和 justify-between，始终保持 flex-col 上下排列 */}
        <div className="flex flex-col items-start border-b border-slate-200 pb-3 mb-2 gap-2.5">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800">
            <Network className="text-cyan-600" size={20} />
            {t('logicalTitle')}
          </h3>
          
          <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">B=Batch(32)</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">S=Seq(128)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">H=Hidden(16)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 shadow-sm">V=Vocab(64)</span>
            <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-200 shadow-sm">E=Experts(4)</span>
          </div>
        </div>

        {/* 1. Input Tokens [B, S] */}
        <div className="flex justify-center mt-1">
          <div className="w-64">
             <GridBlock
                title={t('inputData')} dims="[B, S]"
                splitLabel={degrees.dp > 1 || degrees.cp > 1 ? t('dpCpSplit', { dp: degrees.dp, cp: degrees.cp }) : t('fullData')}
                degreeX={degrees.cp} degreeY={degrees.dp}
                activeX={coords?.cp_idx || 0} activeY={coords?.dp_idx || 0}
                isLayerActive={true} activeColorClass={getColorClass('cyan', 'active')}
                mW={128} mH={32}
             />
          </div>
        </div>

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-400" size={14} /></div>

        {/* 2. Embedding [V, H] */}
        <div className="flex justify-center">
          <div className="w-32">
            <MatrixBlock 
              title={t('embedMatrix')} dims="[V, H]" sliceDir="row" 
              splitLabel={degrees.tp > 1 ? t('rowSplit', { tp: degrees.tp }) : t('fullWeight')}
              degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
              isLayerActive={isEmbeddingActive} activeColorClass={getColorClass('amber', 'active')}
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
                const isPpActive = coords === null || coords.pp_idx === l;
                const start = Math.floor((l * TOTAL_LAYERS) / degrees.pp) + 1;
                const end = Math.floor(((l + 1) * TOTAL_LAYERS) / degrees.pp);
                return <div key={l} title={t('ppStageTip', { stage: l, start, end })} className={`flex-1 rounded-sm transition-all duration-300 ${isPpActive ? 'bg-purple-500 shadow-sm shadow-purple-500/40' : 'bg-slate-200'}`} />
              })}
            </div>

            {renderPipelineSchedule()}

            <div className="bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-200">
               
               {/* Attention Block */}
               <div className="bg-white p-2 md:p-3 rounded-lg border border-slate-200 shadow-sm">
                 <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
                   <Grid size={14} className="text-amber-500"/> {t('attnBlock')}
                 </div>
                 
                 <div className="flex flex-col gap-1.5 md:gap-2">
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                       <MatrixBlock 
                          title="RMSNorm" dims="[H]" sliceDir="rep" 
                          isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                          mW={16} mH={4}
                       />
                       <MatrixBlock 
                          title={t('qkvFused')} dims="[H, 3H]" sliceDir="col" 
                          splitLabel={degrees.tp > 1 ? t('colSplit', { tp: degrees.tp }) : t('fullWeight')}
                          degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
                          isLayerActive={true} activeColorClass={getColorClass('amber', 'active')}
                          mW={48} mH={16}
                          tooltip={t('qkvTooltip')}
                       />
                       <MatrixBlock 
                          title={t('outProj')} dims="[H, H]" sliceDir="row" 
                          splitLabel={degrees.tp > 1 ? t('rowSplit', { tp: degrees.tp }) : t('fullWeight')}
                          degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
                          isLayerActive={true} activeColorClass={getColorClass('amber', 'active')}
                          mW={16} mH={16}
                       />
                    </div>
                    
                    <div className="flex justify-center mt-2 pb-1">
                       <div className="w-full max-w-[240px]">
                          <Tensor3DBlock 
                             title={t('kvCache')} dims="[B, S, H]" 
                             splitLabel={degrees.dp > 1 || degrees.cp > 1 || degrees.tp > 1 ? t('split3D') : t('noSplit')}
                             degreeX={degrees.cp} degreeY={degrees.dp} degreeZ={degrees.tp}
                             activeX={coords?.cp_idx || 0} activeY={coords?.dp_idx || 0} activeZ={coords?.tp_idx || 0}
                             isLayerActive={true} activeColorClass={getColorClass('emerald', 'active')}
                             mW={128} mH={32}
                          />
                       </div>
                    </div>
                    <p className="mt-1.5 text-center text-[8px] leading-relaxed text-slate-500">{t('kvMhaAssumption')}</p>
                 </div>
               </div>

               {/* MoE Layer */}
               <div className="bg-white p-2 md:p-3 rounded-lg border border-slate-200 shadow-sm mt-3">
                 <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center gap-1.5">
                   <BrainCircuit size={14} className="text-pink-500"/> {t('moeLayer')}
                 </div>
                 
                 <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3">
                    <MatrixBlock 
                       title="RMSNorm" dims="[H]" sliceDir="rep" 
                       isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                       mW={16} mH={4}
                    />
                    <MatrixBlock 
                       title={t('router')} dims="[H, E]" sliceDir="rep"
                       isLayerActive={true} activeColorClass="bg-pink-500 text-white shadow-md shadow-pink-500/40"
                       mW={8} mH={16}
                    />
                    <div className="col-span-2 flex items-center justify-center px-2">
                       <span className="text-[10px] text-slate-500 text-center leading-tight">{t('routerDesc')}</span>
                    </div>
                 </div>

                 {/* 专家池 */}
                 <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                   {Array.from({ length: 4 }).map((_, e) => {
                      const isEpActive = coords === null || (e % degrees.ep === coords.ep_idx);
                      const expertActiveColor = degrees.etp > 1 ? getColorClass('indigo', 'active') : getColorClass('amber', 'active');
                      const expertLabel = expertTp > 1 ? `ETP=${expertTp}` : t('wholeBlock');

                      return (
                        <div key={`exp-${e}`} className={`p-1.5 rounded border transition-all duration-300 ${isEpActive ? 'border-pink-300 bg-pink-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                          <div className={`text-[9px] font-bold text-center mb-1.5 transition-colors ${isEpActive ? 'text-pink-600' : 'text-slate-400'}`}>{t('expert')} {e}</div>
                          <div className="flex flex-col gap-1.5 w-full">
                            <MatrixBlock 
                               title={t('w1w3')} dims="[H, 4H]" sliceDir="col" 
                               splitLabel={expertTp > 1 ? t('colSlice', { label: expertLabel }) : t('fullCalc')}
                               degree={expertTp} activeChunkIndex={coords?.etp_idx || 0}
                               isLayerActive={isEpActive} activeColorClass={expertActiveColor}
                               mW={64} mH={16}
                            />
                            <MatrixBlock 
                               title={t('w2')} dims="[4H, H]" sliceDir="row" 
                               splitLabel={expertTp > 1 ? t('rowSlice', { label: expertLabel }) : t('fullCalc')}
                               degree={expertTp} activeChunkIndex={coords?.etp_idx || 0}
                               isLayerActive={isEpActive} activeColorClass={expertActiveColor}
                               mW={16} mH={64}
                            />
                          </div>
                        </div>
                      )
                   })}
                 </div>
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
              mW={64} mH={16}
            />
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
      <div key={dim} className="flex items-center text-[10px]">
        {/* Label */}
        <span className={`w-[48px] font-bold ${textColor} text-right shrink-0 mr-1.5`}>{label}</span>
        
        {/* Progress Bar */}
        <div className="flex gap-[1px] flex-1 h-1.5 mr-2">
          {Array.from({ length: Math.max(1, degree) }).map((_, i) => (
            <div key={i} className={`flex-1 rounded-[1px] transition-colors duration-300 ${i === activeIdx ? activeColor : 'bg-slate-100'}`} />
          ))}
        </div>
        
        {/* Explicit Rank Number */}
        <div className="w-6 shrink-0 flex justify-end">
           <span className="font-mono text-[9px] text-slate-500 bg-slate-50 px-1.5 py-[1px] rounded border border-slate-200">
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

    return (
      <div 
        key={g}
        onClick={() => setPinnedGpu(isPinned ? null : g)}
        onMouseEnter={() => setHoveredGpu(g)}
        onMouseLeave={() => setHoveredGpu(null)}
        className={`bg-white rounded-xl p-3 border cursor-pointer transition-all duration-200 
          ${isActiveCard ? 'border-cyan-400 shadow-[0_8px_20px_rgba(6,182,212,0.15)] scale-105 z-10' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'}
          ${isPinned ? 'ring-2 ring-cyan-400 ring-offset-1' : ''}`}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <Cpu size={12} className={isActiveCard ? 'text-cyan-500' : 'text-slate-400'} /> 
            GPU {g}
          </span>
          <div className="flex items-center gap-1">
            {isPinned && <Pin size={10} className="text-cyan-600 fill-cyan-100" />}
            {isHovered && !isPinned && <span className="text-[9px] text-cyan-500 font-semibold animate-pulse">Hover</span>}
            {isPinned && <span className="text-[9px] text-cyan-600 font-semibold">{t('locked')}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {renderMiniTrack('dp', 'DP', 'blue', coords)}
          {renderMiniTrack('cp', 'CP', 'emerald', coords)}
          {renderMiniTrack('pp', 'PP', 'purple', coords)}
          {renderMiniTrack('tp', 'TP', 'amber', coords)}
          {renderMiniTrack('ep', 'EP', 'pink', coords)}
          {renderMiniTrack('etp', 'ETP', 'indigo', coords)}
        </div>
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
                    const isDisabled = !isSelected && !checkConstraints(tempDegrees);

                    return (
                      <button 
                        key={val}
                        disabled={isDisabled}
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
          
          <div className="col-span-2 md:col-span-3 xl:col-span-6 flex items-center justify-between text-[11px] text-slate-500 mt-1 bg-white shadow-sm p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5">
              <Info size={14} className="text-blue-500 shrink-0" />
              <span><strong>{t('clusterHintTitle')}</strong> {t('clusterHintDesc')}<strong>{t('clusterHintBold')}</strong></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
          
          <div className="lg:col-span-5 flex flex-col">
             {renderLogicalView()}
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm flex flex-col h-full">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800">
                 <ServerIcon className="text-emerald-500" />
                 {t('physGpuMap')} ({totalGpus} Cards)
               </h3>
               {totalGpus === 1 && <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">{t('singleCard')}</span>}
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 align-top place-content-start">
               {Array.from({ length: totalGpus }).map((_, i) => renderGpuCard(i))}
             </div>
             
             {totalGpus < MAX_GPUS && (
               <div className="mt-8 border-t border-dashed border-slate-200 pt-6 flex flex-col items-center justify-center opacity-70">
                 <div className="grid grid-cols-4 gap-4 w-full px-4">
                   {Array.from({ length: Math.min(4, MAX_GPUS - totalGpus) }).map((_, i) => (
                     <div key={`empty-${i}`} className="h-24 md:h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center">
                       <span className="text-slate-400 text-xs">{t('empty')}</span>
                     </div>
                   ))}
                 </div>
                 <p className="text-xs text-slate-400 mt-4">{t('expand')} {totalGpus}/{MAX_GPUS})</p>
               </div>
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
