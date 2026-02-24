import React, { useState, useMemo } from 'react';
import { Layers, Grid, Boxes, SplitSquareHorizontal, BrainCircuit, Cpu, Network, RotateCcw, Info, ArrowDown } from 'lucide-react';

const MAX_GPUS = 16;

const STRATEGIES = [
  { id: 'dp', name: '数据并行(DP)', icon: Boxes, color: 'blue', desc: '复制模型，切分批次。最基础的并行方式，解决数据吞吐问题。' },
  { id: 'tp', name: '张量并行(TP)', icon: Grid, color: 'amber', desc: '切分基础权重矩阵。通信密集，通常限于单机 NVLink 内部。' },
  { id: 'pp', name: '流水线并行(PP)', icon: Layers, color: 'purple', desc: '按层切分模型。GPU接力计算，首层Embedding，末层LM Head。' },
  { id: 'cp', name: '上下文并行(CP)', icon: SplitSquareHorizontal, color: 'emerald', desc: '切分超长序列 (SeqLen)。解决单卡长序列显存爆炸(包含SP)。' },
  { id: 'ep', name: '专家并行(EP)', icon: BrainCircuit, color: 'pink', desc: 'MoE 特有。不同卡负责不同专家，与 TP 复用通信组。' },
  { id: 'etp', name: '专家张量并行(ETP)', icon: Grid, color: 'indigo', desc: 'MoE 专属。切分专家内部权重，常与 EP 组合切分。' }
];

// 获取维度对应的 Tailwind 颜色类
const getColorClass = (color, type) => {
  const colors = {
    blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', softBg: 'bg-blue-900/30', active: 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', softBg: 'bg-amber-900/30', active: 'bg-amber-500 text-amber-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.6)]' },
    purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', softBg: 'bg-purple-900/30', active: 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.6)]' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', softBg: 'bg-emerald-900/30', active: 'bg-emerald-500 text-emerald-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.6)]' },
    pink: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400', softBg: 'bg-pink-900/30', active: 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.6)]' },
    cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', softBg: 'bg-cyan-900/30', active: 'bg-cyan-500 text-cyan-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.6)]' },
    slate: { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-400', softBg: 'bg-slate-900/30', active: 'bg-slate-400 text-slate-900 font-bold shadow-[0_0_10px_rgba(148,163,184,0.4)]' },
    indigo: { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-400', softBg: 'bg-indigo-900/30', active: 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.6)]' },
  };
  return colors[color][type];
};

const App = () => {
  const [degrees, setDegrees] = useState({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
  const [hoveredGpu, setHoveredGpu] = useState(null);

  // 拓扑约束：TP 与 EP*ETP 复用通信域
  const totalGpus = useMemo(() => {
    return degrees.dp * degrees.pp * degrees.cp * Math.max(degrees.tp, degrees.ep * degrees.etp);
  }, [degrees]);

  const checkConstraints = (newDegrees) => {
    const total = newDegrees.dp * newDegrees.pp * newDegrees.cp * Math.max(newDegrees.tp, newDegrees.ep * newDegrees.etp);
    return total <= MAX_GPUS;
  };

  const handleSetDegree = (dim, val) => {
    const newDegrees = { ...degrees, [dim]: val };
    if (checkConstraints(newDegrees)) setDegrees(newDegrees);
  };

  const reset = () => {
    setDegrees({ dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 });
    setHoveredGpu(null);
  };

  // 核心逻辑重构：智能解析 GPU 坐标与 Fallback 继承关系
  const getGpuCoords = (g) => {
    let rem = g;
    const tp_ep_group = Math.max(degrees.tp, degrees.ep * degrees.etp);
    const tp_ep_idx = rem % tp_ep_group; rem = Math.floor(rem / tp_ep_group);
    const cp_idx = rem % degrees.cp; rem = Math.floor(rem / degrees.cp);
    const dp_idx = rem % degrees.dp; rem = Math.floor(rem / degrees.dp);
    const pp_idx = rem % degrees.pp;

    const tp_idx = tp_ep_idx % degrees.tp;
    
    // 如果没有显式设置 ETP(即ETP=1)，它会自动继承/吸收 TP 剩余的并行度
    const actual_etp = degrees.etp > 1 ? degrees.etp : Math.max(1, Math.floor(degrees.tp / degrees.ep));
    const actual_ep = degrees.ep;

    // 计算当前 GPU 对应的专家索引和专家切片索引
    const actual_etp_idx = degrees.etp > 1 ? (tp_ep_idx % degrees.etp) : (tp_ep_idx % actual_etp);
    const actual_ep_idx = degrees.etp > 1 ? (Math.floor(tp_ep_idx / degrees.etp) % actual_ep) : (Math.floor(tp_ep_idx / actual_etp) % actual_ep);

    return { tp_ep_idx, tp_idx, ep_idx: actual_ep_idx, etp_idx: actual_etp_idx, cp_idx, dp_idx, pp_idx, actual_etp };
  };

  const DimBadge = ({ text, tooltip }) => (
    <span title={tooltip} className="ml-1 text-[8px] lg:text-[9px] font-mono text-slate-400 bg-slate-900/80 border border-slate-700 px-1 py-0.5 rounded cursor-help whitespace-nowrap">
      {text}
    </span>
  );

  // 1. 基础权重矩阵块
  const MatrixBlock = ({ title, dims, sliceDir, splitLabel, isLayerActive, activeColorClass, degree = 1, activeChunkIndex = 0, mW, mH, tooltip }) => {
    const inactiveColorClass = "bg-slate-800/40 border border-slate-700/30";
    const numChunks = sliceDir === 'rep' ? 1 : Math.max(1, degree);
    
    const effectiveActive = (hoveredGpu === null) 
        ? Array.from({length: numChunks}).map((_, i) => i) 
        : (isLayerActive ? [activeChunkIndex] : []);

    return (
      <div className="bg-slate-900/60 rounded flex flex-col items-center justify-between border border-slate-700/50 p-1.5 md:p-2 h-full w-full" title={tooltip}>
        <div className="flex flex-col items-center leading-tight mb-2 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-300 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-500 mt-[2px]">{dims}</span>}
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
          {sliceDir === 'rep' ? '全量复制' : splitLabel}
        </div>
      </div>
    );
  };

  // 2. 2D网格切分矩阵块
  const GridBlock = ({ title, dims, splitLabel, isLayerActive, activeColorClass, degreeX = 1, degreeY = 1, activeX = 0, activeY = 0, mW, mH }) => {
    const inactiveColorClass = "bg-slate-800/40 border border-slate-700/30";
    const effectiveActive = (hoveredGpu === null) ? true : isLayerActive;
    
    const dX = Math.max(1, degreeX);
    const dY = Math.max(1, degreeY);

    return (
      <div className="bg-slate-900/60 rounded flex flex-col items-center justify-between border border-slate-700/50 p-1.5 md:p-2 h-full w-full">
        <div className="flex flex-col items-center leading-tight mb-2 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-300 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-500 mt-[2px]">{dims}</span>}
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
              const isActive = effectiveActive && (hoveredGpu === null || (activeY === y && activeX === x));
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

  // 3. 重构版 3D 三维张量切片引擎
  const Tensor3DBlock = ({ title, dims, splitLabel, isLayerActive, activeColorClass, degreeX = 1, degreeY = 1, degreeZ = 1, activeX = 0, activeY = 0, activeZ = 0, mW, mH }) => {
    const effectiveActive = (hoveredGpu === null) ? true : isLayerActive;

    const dX = Math.max(1, degreeX);
    const dY = Math.max(1, degreeY);
    const dZ = Math.max(1, degreeZ);

    return (
      <div className="bg-slate-900/60 rounded flex flex-col items-center justify-between border border-slate-700/50 p-1.5 md:p-2 h-full w-full">
        <div className="flex flex-col items-center leading-tight mb-4 h-[28px] justify-start w-full">
          <span className="text-[9px] md:text-[11px] font-semibold text-slate-300 text-center leading-tight break-words">{title}</span>
          {dims && <span className="text-[8px] md:text-[9px] font-mono text-slate-500 mt-[2px]">{dims}</span>}
        </div>
        
        <div className="flex-1 flex items-center justify-center py-4 w-full">
          <div className="relative" style={{ width: `${mW}px`, height: `${mH}px` }}>
            {Array.from({ length: dZ }).map((_, z) => {
              const actualZ = dZ - 1 - z; 
              const isZActive = effectiveActive && (hoveredGpu === null || activeZ === actualZ);
              
              const offsetStep = 14; 
              const totalOffset = (dZ - 1) * offsetStep;
              const offsetX = (actualZ * offsetStep) - (totalOffset / 2);
              const offsetY = -(actualZ * offsetStep) + (totalOffset / 2);

              const layerZIndex = (isZActive && hoveredGpu !== null) ? 50 : actualZ;
              const layerStyleClass = (!isZActive && hoveredGpu !== null) 
                  ? 'opacity-10 grayscale pointer-events-none' 
                  : 'opacity-100 shadow-md'; 

              return (
                <div 
                  key={actualZ} 
                  className={`absolute inset-0 transition-all duration-500 ${layerStyleClass} bg-slate-900/90 rounded border border-slate-700 p-[1px]`}
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
                      const isActive = isZActive && (hoveredGpu === null || (activeY === y && activeX === x));
                      
                      const blockClass = isActive 
                          ? activeColorClass 
                          : "bg-slate-800/80 border border-slate-900";

                      return (
                        <div 
                          key={i} 
                          className={`rounded-[1px] transition-colors duration-300 ${blockClass}`} 
                          style={isActive && hoveredGpu !== null ? { boxShadow: 'inset 0 0 6px rgba(255,255,255,0.3)' } : {}}
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

  const renderLogicalView = () => {
    const coords = hoveredGpu !== null ? getGpuCoords(hoveredGpu) : null;
    
    const isEmbeddingActive = coords ? coords.pp_idx === 0 : true;
    const isLmHeadActive = coords ? coords.pp_idx === degrees.pp - 1 : true;

    // 智能获取专家层的切割维度，如果不开ETP，TP会自动穿透生效
    const expertTp = coords ? coords.actual_etp : (degrees.etp > 1 ? degrees.etp : Math.max(1, Math.floor(degrees.tp / degrees.ep)));

    return (
      <div className="bg-slate-800/80 rounded-2xl p-4 md:p-5 shadow-xl border border-slate-700 flex flex-col gap-2 relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-slate-700 pb-3 mb-2 gap-2">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
            <Network className="text-cyan-400" size={20} />
            LLM 数学架构与动态张量切片
          </h3>
          
          <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50 shadow-sm">B=Batch(32)</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 shadow-sm">S=Seq(128)</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700/50 shadow-sm">H=Hidden(16)</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600 shadow-sm">V=Vocab(64)</span>
            <span className="px-1.5 py-0.5 rounded bg-pink-900/50 text-pink-300 border border-pink-700/50 shadow-sm">E=Experts(4)</span>
          </div>
        </div>

        {/* 1. Input Tokens [B, S] */}
        <div className="flex justify-center mt-1">
          <div className="w-64">
             <GridBlock
                title="Input Tokens Data" dims="[B, S]"
                splitLabel={degrees.dp > 1 || degrees.cp > 1 ? `DP切B(${degrees.dp}) × CP切S(${degrees.cp})` : '完整数据 (无切分)'}
                degreeX={degrees.cp} degreeY={degrees.dp}
                activeX={coords?.cp_idx || 0} activeY={coords?.dp_idx || 0}
                isLayerActive={true} activeColorClass={getColorClass('cyan', 'active')}
                mW={128} mH={32}
             />
          </div>
        </div>

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-600" size={14} /></div>

        {/* 2. Embedding [V, H] */}
        <div className="flex justify-center">
          <div className="w-32">
            <MatrixBlock 
              title="Embedding Matrix" dims="[V, H]" sliceDir="row" splitLabel={degrees.tp > 1 ? `横向切行(TP=${degrees.tp})` : '完整权重'}
              degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
              isLayerActive={isEmbeddingActive} activeColorClass={getColorClass('amber', 'active')}
              mW={16} mH={64}
            />
          </div>
        </div>

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-600" size={14} /></div>

        {/* 3. Transformer Blocks (PP) */}
        <div className="relative mt-1 mb-1">
          <div className="absolute -left-2 md:-left-3 top-0 bottom-0 w-1 bg-purple-500/30 rounded-full"></div>
          <div className="pl-3 md:pl-4">
            <div className="flex items-center justify-between mb-2">
               <div className="text-xs font-bold text-purple-400">L × Transformer Layers</div>
               <div className="text-[10px] text-slate-500">{degrees.pp > 1 ? `按层划分阶段: PP(${degrees.pp})` : '未开启流水线并行'}</div>
            </div>
            <div className="flex gap-1 h-1.5 w-full mb-3">
              {Array.from({ length: degrees.pp }).map((_, l) => {
                const isPpActive = coords === null || coords.pp_idx === l;
                return <div key={l} className={`flex-1 rounded-sm transition-all duration-300 ${isPpActive ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'bg-slate-700/50'}`} />
              })}
            </div>

            <div className="bg-slate-900/40 p-2 md:p-3 rounded-lg border border-slate-700/60">
               
               {/* Attention Block */}
               <div className="bg-slate-800/80 p-2 md:p-3 rounded-lg border border-slate-700/50">
                 <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                   <Grid size={14} className="text-amber-400"/> Attention Block
                 </div>
                 
                 <div className="flex flex-col gap-1.5 md:gap-2">
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                       <MatrixBlock 
                          title="RMSNorm" dims="[H]" sliceDir="rep" 
                          isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                          mW={16} mH={4}
                       />
                       <MatrixBlock 
                          title="Q,K,V (Fused)" dims="[H, 3H]" sliceDir="col" splitLabel={degrees.tp > 1 ? `纵切列(TP=${degrees.tp})` : '完整权重'}
                          degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
                          isLayerActive={true} activeColorClass={getColorClass('amber', 'active')}
                          mW={48} mH={16}
                          tooltip="物理实现中 Q,K,V 通常被拼接为 3H 长度的一个大矩阵进行计算"
                       />
                       <MatrixBlock 
                          title="Out Proj" dims="[H, H]" sliceDir="row" splitLabel={degrees.tp > 1 ? `横切行(TP=${degrees.tp})` : '完整权重'}
                          degree={degrees.tp} activeChunkIndex={coords?.tp_idx || 0}
                          isLayerActive={true} activeColorClass={getColorClass('amber', 'active')}
                          mW={16} mH={16}
                       />
                    </div>
                    
                    <div className="flex justify-center mt-2 pb-1">
                       <div className="w-full max-w-[240px]">
                          <Tensor3DBlock 
                             title="KV Cache & Activations" dims="[B, S, H]" 
                             splitLabel={degrees.dp > 1 || degrees.cp > 1 || degrees.tp > 1 ? `3D切分: DP切B × CP切S × TP切H` : `无切分`}
                             degreeX={degrees.cp} degreeY={degrees.dp} degreeZ={degrees.tp}
                             activeX={coords?.cp_idx || 0} activeY={coords?.dp_idx || 0} activeZ={coords?.tp_idx || 0}
                             isLayerActive={true} activeColorClass={getColorClass('emerald', 'active')}
                             mW={128} mH={32}
                          />
                       </div>
                    </div>
                 </div>
               </div>

               {/* MoE Layer */}
               <div className="bg-slate-800/80 p-2 md:p-3 rounded-lg border border-slate-700/50 mt-3">
                 <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                   <BrainCircuit size={14} className="text-pink-400"/> MoE Layer (以 4 专家架构为例)
                 </div>
                 
                 <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3">
                    <MatrixBlock 
                       title="RMSNorm" dims="[H]" sliceDir="rep" 
                       isLayerActive={true} activeColorClass={getColorClass('slate', 'active')}
                       mW={16} mH={4}
                    />
                    <MatrixBlock 
                       title="Router" dims="[H, E]" sliceDir="rep"
                       isLayerActive={true} activeColorClass="bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.5)]"
                       mW={8} mH={16}
                    />
                    <div className="col-span-2 flex items-center justify-center px-2">
                       <span className="text-[10px] text-slate-500 text-center leading-tight">计算后通过 Router 分发至目标 Expert</span>
                    </div>
                 </div>

                 {/* 专家池 */}
                 <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                   {Array.from({ length: 4 }).map((_, e) => {
                      const isEpActive = coords === null || (e % degrees.ep === coords.ep_idx);
                      // 动态决定显示的颜色，如果是隐式继承 TP 则用 amber，显式 ETP 则用 indigo
                      const expertActiveColor = degrees.etp > 1 ? getColorClass('indigo', 'active') : getColorClass('amber', 'active');
                      const expertLabel = expertTp > 1 ? (degrees.etp > 1 ? `ETP=${expertTp}` : `TP=${expertTp}`) : '整块';

                      return (
                        <div key={`exp-${e}`} className={`p-1.5 rounded border transition-all duration-300 ${isEpActive ? 'border-pink-500/50 bg-pink-900/20' : 'border-slate-700/50 bg-slate-800/30 opacity-40'}`}>
                          <div className={`text-[9px] font-bold text-center mb-1.5 transition-colors ${isEpActive ? 'text-pink-400' : 'text-slate-500'}`}>Expert {e}</div>
                          <div className="flex flex-col gap-1.5 w-full">
                            <MatrixBlock 
                               title="w1,w3 (Up)" dims="[H, 4H]" sliceDir="col" splitLabel={expertTp > 1 ? `纵切(${expertLabel})` : '整块计算'}
                               degree={expertTp} activeChunkIndex={coords?.etp_idx || 0}
                               isLayerActive={isEpActive} activeColorClass={expertActiveColor}
                               mW={64} mH={16}
                            />
                            <MatrixBlock 
                               title="w2 (Down)" dims="[4H, H]" sliceDir="row" splitLabel={expertTp > 1 ? `横切(${expertLabel})` : '整块计算'}
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

        <div className="flex justify-center my-0.5 relative z-10"><ArrowDown className="text-slate-600" size={14} /></div>

        {/* 4. LM Head [H, V] */}
        <div className="flex justify-center">
          <div className="w-48">
            <MatrixBlock 
              title="LM Head" dims="[H, V]" sliceDir="col" splitLabel={degrees.tp > 1 ? `纵向切列(TP=${degrees.tp})` : '完整权重'}
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
    return (
      <div key={dim} className="flex items-center gap-2 text-[10px]">
        <span className={`w-[42px] font-bold ${getColorClass(color, 'text')} text-right`}>{label}</span>
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: Math.max(1, degree) }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-sm transition-colors duration-300 ${i === activeIdx ? activeColor : 'bg-slate-700/40'}`} />
          ))}
        </div>
      </div>
    );
  };

  const renderGpuCard = (g) => {
    const coords = getGpuCoords(g);
    return (
      <div 
        key={g}
        onMouseEnter={() => setHoveredGpu(g)}
        onMouseLeave={() => setHoveredGpu(null)}
        className={`bg-slate-800 rounded-xl p-3 border cursor-pointer transition-all duration-200 
          ${hoveredGpu === g ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105 z-10' : 'border-slate-700 hover:border-slate-500'}`}
      >
        <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Cpu size={12} className={hoveredGpu === g ? 'text-cyan-400' : 'text-slate-500'} /> 
            GPU {g}
          </span>
          {hoveredGpu === g && <span className="text-[9px] text-cyan-400 animate-pulse">Hovering</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          {renderMiniTrack('dp', 'DP', 'blue', coords)}
          {renderMiniTrack('cp', 'CP', 'emerald', coords)}
          {renderMiniTrack('pp', 'PP', 'purple', coords)}
          {renderMiniTrack('tp', 'TP', 'amber', coords)}
          {renderMiniTrack('ep', 'EP', 'pink', coords)}
          {/* 智能指示：如果没有开明确的 ETP，但是继承了 TP，会在 UI 上指示出来 */}
          {renderMiniTrack('etp', degrees.etp > 1 ? 'ETP' : 'TP(Exp)', degrees.etp > 1 ? 'indigo' : 'amber', coords, coords.actual_etp)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 lg:p-6 overflow-x-hidden">
      <div className="max-w-[110rem] mx-auto space-y-6">
        
        <div className="bg-slate-800/60 rounded-2xl p-5 md:p-6 border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-sm">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white">
              <Network className="text-cyan-400" />
              LLM 6D 并行策略交互式解析
            </h1>
            <p className="text-slate-400 text-sm mt-1">调整参数并悬浮在物理卡上，直观观测模型张量在分布式集群中的严格数学映射。</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-bold shadow-inner flex items-center gap-2 whitespace-nowrap">
               <Cpu size={18} className="text-slate-400"/>
               总 GPU: <span className={`text-lg ml-1 ${totalGpus === MAX_GPUS ? 'text-rose-400' : 'text-cyan-400'}`}>{totalGpus}</span> / {MAX_GPUS}
             </div>
             <button onClick={reset} className="p-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition tooltip" title="重置状态">
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
              <div key={strat.id} className={`p-3 lg:p-4 rounded-xl border transition-all duration-300 flex flex-col
                ${active ? `${getColorClass(strat.color, 'border')} ${getColorClass(strat.color, 'softBg')}` : 'border-slate-700 bg-slate-800/40'}`}>
                
                <div className="flex items-center gap-1.5 lg:gap-2 mb-2">
                  <Icon size={16} className={`shrink-0 ${active ? getColorClass(strat.color, 'text') : 'text-slate-500'}`} />
                  <h3 className={`font-bold text-[12px] md:text-[13px] whitespace-nowrap tracking-tight ${active ? 'text-white' : 'text-slate-400'}`}>{strat.name}</h3>
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
                          ${isSelected ? `${getColorClass(strat.color, 'bg')} text-white shadow-md` : 
                            isDisabled ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' : 
                            'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >
                        {val}x
                      </button>
                    )
                  })}
                </div>
                <p className={`text-[9px] lg:text-[10px] leading-relaxed mt-auto hidden sm:block ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                  {strat.desc}
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
          
          <div className="lg:col-span-5 flex flex-col">
             {renderLogicalView()}
          </div>

          <div className="lg:col-span-7 bg-slate-800/40 rounded-2xl p-4 md:p-6 border border-slate-700 shadow-inner flex flex-col">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-white">
                 <ServerIcon className="text-emerald-400" />
                 物理 GPU 集群分片映射 ({totalGpus} Cards)
               </h3>
               {totalGpus === 1 && <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">单卡计算 (无切分)</span>}
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 align-top place-content-start">
               {Array.from({ length: totalGpus }).map((_, i) => renderGpuCard(i))}
             </div>
             
             {totalGpus < MAX_GPUS && (
               <div className="mt-8 border-t border-dashed border-slate-700 pt-6 flex flex-col items-center justify-center opacity-50">
                 <div className="grid grid-cols-4 gap-4 w-full px-4">
                   {Array.from({ length: Math.min(4, MAX_GPUS - totalGpus) }).map((_, i) => (
                     <div key={`empty-${i}`} className="h-24 md:h-28 rounded-xl border-2 border-dashed border-slate-700/50 flex items-center justify-center">
                       <span className="text-slate-600 text-xs">可用槽位</span>
                     </div>
                   ))}
                 </div>
                 <p className="text-xs text-slate-500 mt-4">调整上方并行策略以扩展集群使用量 (当前 {totalGpus}/{MAX_GPUS})</p>
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
