// FlashAttention.jsx
// ─────────────────────────────────────────────────────────────────
// Paste your Flash Attention visualization logic here.
// The component is lazy-loaded by MainDashboard.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, Code, ArrowRight, ArrowDown, Activity, Layers, RefreshCw, EyeOff, Wrench, Info, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [modelType, setModelType] = useState('flash'); 
  const [phase, setPhase] = useState('idle'); 
  const [activeModule, setActiveModule] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);

  // Flash Attention 状态推导函数 (Q:3块, KV:2块)
  const getFlashState = (step) => {
    if (step === 1) return { i: 0, j: 0, state: 'setup', mask: null, deltaIo: 0 };
    // Q1 循环 (Index: 0-63)
    if (step >= 2 && step <= 5) {
      if (step === 2) return { i: 1, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '0:63' };
      if (step === 3) return { i: 1, j: 1, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '0:63', rangeK: '0:63' }; 
      if (step === 4) return { i: 1, j: 2, state: 'skip', mask: 'skip', deltaIo: 0, rangeQ: '0:63', rangeK: '64:127' };    
      if (step === 5) return { i: 1, j: 0, state: 'write_o', mask: null, deltaIo: 1 };
    }
    // Q2 循环 (Index: 64-127)
    if (step >= 6 && step <= 9) {
      if (step === 6) return { i: 2, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '64:127' };
      if (step === 7) return { i: 2, j: 1, state: 'compute', mask: 'none', deltaIo: 2, rangeQ: '64:127', rangeK: '0:63' }; 
      if (step === 8) return { i: 2, j: 2, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '64:127', rangeK: '64:127' }; 
      if (step === 9) return { i: 2, j: 0, state: 'write_o', mask: null, deltaIo: 1 };
    }
    // Q3 循环 (Index: 128-191)
    if (step >= 10 && step <= 13) {
      if (step === 10) return { i: 3, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '128:191' };
      if (step === 11) return { i: 3, j: 1, state: 'compute', mask: 'none', deltaIo: 2, rangeQ: '128:191', rangeK: '0:63' };
      if (step === 12) return { i: 3, j: 2, state: 'compute', mask: 'none', deltaIo: 2, rangeQ: '128:191', rangeK: '64:127' };
      if (step === 13) return { i: 3, j: 0, state: 'write_o', mask: null, deltaIo: 1 };
    }
    return { i: 0, j: 0, state: 'done', mask: null, deltaIo: 0 };
  };

  const fs = getFlashState(activeModule);

  const getMemoryTraffic = () => {
    if (phase === 'idle') return 0;
    if (modelType === 'standard') {
      if (activeModule === 1) return 0;
      if (activeModule === 2) return 210; 
      if (activeModule === 3) return 610; 
      if (activeModule >= 4) return 820;
      return 820;
    } else {
      let total = 0;
      for(let s=1; s<=activeModule; s++) total += getFlashState(s).deltaIo;
      return total;
    }
  };

  const currentTraffic = getMemoryTraffic();
  const MAX_TRAFFIC = 850; 

  const getIoText = () => {
    if (phase === 'idle') return "IO 闲置";
    if (modelType === 'standard') {
      if (activeModule === 1) return "分配 HBM 显存地址";
      if (activeModule === 2) return "搬运 Q,Kᵀ / 写回 S";
      if (activeModule === 3) return "搬运 S / 写回 P";
      if (activeModule >= 4) return "搬运 P,V / 写回 O";
    } else {
      if (activeModule === 1) return "SRAM 探测与切块对齐";
      if (fs.state === 'load_q') return `读取 Q${fs.i} [${fs.rangeQ}]`;
      if (fs.state === 'compute') return `读取 K${fs.j},V${fs.j} [${fs.rangeK}]`;
      if (fs.state === 'skip') return `跳过未来分块 K${fs.j}`;
      if (fs.state === 'write_o') return `写回 O${fs.i} 最终结果`;
    }
    return "计算结束";
  };

  useEffect(() => {
    let timer;
    if (isPlaying && phase !== 'done') {
      let delay = 2200; 
      if (activeModule === 0) delay = 500;
      if (activeModule === 1) delay = 3200;
      if (modelType === 'flash' && fs.state === 'skip') delay = 1000; 
      timer = setTimeout(() => handleNextStep(), delay); 
    }
    return () => clearTimeout(timer);
  }, [isPlaying, phase, activeModule, modelType]);

  const handleNextStep = () => {
    if (phase === 'idle') {
      setPhase('running');
      setActiveModule(1);
    } else if (phase === 'done') {
      // do nothing
    } else {
      const maxSteps = modelType === 'standard' ? 4 : 13;
      if (activeModule < maxSteps) {
        setActiveModule(activeModule + 1);
      } else {
        setPhase('done');
        setIsPlaying(false);
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setActiveModule(0);
  };

  const togglePlay = () => {
    if (phase === 'done') reset();
    setIsPlaying(!isPlaying);
  };

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      reset(); 
    }
  };

  const hbmMatrices = [
    { 
      name: 'Q', color: 'indigo', shape: 'vertical', blocks: 3, labels: ['0:63', '64:127', '128:191'],
      isActive: (idx) => modelType === 'flash' ? (fs.i === idx + 1 && fs.state !== 'setup') : activeModule >= 2
    },
    { 
      name: 'K', color: 'amber', shape: 'horizontal', blocks: 2, isTranspose: true, labels: ['0:63', '64:127'],
      isActive: (idx) => modelType === 'flash' ? (fs.j === idx + 1 && fs.state !== 'skip') : activeModule >= 2
    },
    { 
      name: 'V', color: 'blue', shape: 'vertical', blocks: 2, labels: ['0:63', '64:127'],
      isActive: (idx) => modelType === 'flash' ? (fs.j === idx + 1 && fs.state !== 'skip') : activeModule >= 4
    },
    { 
      name: 'O', color: 'emerald', shape: 'vertical', blocks: 3, labels: ['0:63', '64:127', '128:191'],
      isActive: (idx) => {
        if (modelType !== 'flash') return activeModule >= 4;
        if (idx === 0) return activeModule >= 5;
        if (idx === 1) return activeModule >= 9;
        if (idx === 2) return activeModule >= 13;
        return false;
      }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              Flash Attention 原理全景可视化
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              突破显存墙：切块解耦 (Tiling)、掩码三种物理状态 (Mask) 与在线 Softmax 修正机制
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button onClick={() => handleModelTypeChange('standard')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'standard' ? 'bg-white shadow-sm text-rose-700' : 'text-slate-500 hover:text-slate-700'}`}>
                标准 Attention (低效)
              </button>
              <button onClick={() => handleModelTypeChange('flash')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'flash' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Zap size={14} /> Flash Attention (高效)
              </button>
            </div>
            <button onClick={reset} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title="重置"><RotateCcw size={20} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition shadow-sm ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isPlaying ? <><Pause size={18} /> 暂停</> : <><Play size={18} /> {phase === 'done' ? '重播' : '自动播放'}</>}
            </button>
            <button onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="flex items-center gap-2 px-4 py-2 w-56 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm font-semibold">
              <SkipForward size={18} /> <span className="text-sm truncate">
                {phase === 'idle' ? '开始执行' : 
                 (modelType === 'standard' ? 
                   (activeModule === 1 ? '初始化 Setup' : 
                    activeModule === 2 ? '算 S 矩阵与掩码' : 
                    activeModule === 3 ? '算 P (Softmax)' : '输出 O 结果') : 
                   (activeModule === 1 ? '硬件感知 Setup' : 
                    fs.state === 'load_q' ? `载入 Q${fs.i}` : 
                    fs.state === 'compute' ? `计算 K${fs.j}V${fs.j}` : 
                    fs.state === 'skip' ? `掩码跳过` : `归一化写回 O${fs.i}`)
                 )
                }
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* 顶层可视化：显存架构 (HBM vs SRAM) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col gap-4">
              <h2 className="text-lg font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2"><Database className="text-indigo-500" size={20} /> 物理硬件：显存读写瓶颈可视化</div>
              </h2>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                {modelType === 'flash' && (
                  <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1">
                    <Activity size={10}/> GPU SM 并行中 (Parallel Mode)
                  </div>
                )}
                
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-slate-600 flex items-center gap-1"><Activity size={16}/> 累计显存 IO 流量</span>
                  <div className="text-right">
                    <span className={`text-2xl font-black font-mono ${modelType === 'standard' ? 'text-rose-600' : 'text-emerald-600'}`}>{currentTraffic}</span>
                    <span className="text-slate-500 text-sm ml-1">MB</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-700 ease-out ${modelType === 'standard' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((currentTraffic / MAX_TRAFFIC) * 100, 100)}%` }}></div>
                  {currentTraffic > 200 && <div className="absolute top-0 right-4 h-full text-[9px] text-rose-900 font-bold flex items-center">Memory Wall!</div>}
                </div>
              </div>

              {/* 物理层架构图 */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch justify-center min-h-[26rem] mt-2">
                
                {/* HBM (主显存) */}
                <div className="flex-[5] bg-slate-100 rounded-xl border-2 border-slate-300 p-4 flex flex-col items-center relative overflow-hidden">
                  <div className="font-bold text-slate-700 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm mb-2 z-10">
                    <Database size={14}/> HBM (容量大/读写慢)
                  </div>
                  
                  <div className="w-full flex-1 flex flex-col justify-start relative pt-2">
                    <div className="flex justify-center gap-2 md:gap-4 z-10 w-full items-end">
                      {hbmMatrices.map((mat) => (
                         <div key={mat.name} className="flex flex-col items-center group">
                           <span className={`font-serif font-bold mb-1 text-${mat.color}-800`}>{mat.isTranspose ? <>K<sup className="not-italic text-[10px]">T</sup></> : mat.name}</span>
                           <div className={`
                             ${mat.shape === 'horizontal' ? 'w-24 md:w-32 h-10 md:h-12 flex-row' : 'w-10 md:w-12 h-28 md:h-32 flex-col'} 
                             border-2 rounded flex relative overflow-hidden shadow-sm border-${mat.color}-300 transition-all duration-500
                           `}>
                              {Array.from({ length: mat.blocks }).map((_, idx) => (
                                <div key={idx} className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 
                                  ${mat.shape === 'horizontal' && idx < mat.blocks-1 ? `border-r border-dashed border-${mat.color}-300` : ''} 
                                  ${mat.shape === 'vertical' && idx < mat.blocks-1 ? `border-b border-dashed border-${mat.color}-300` : ''} 
                                  ${mat.isActive(idx) ? `bg-${mat.color}-200 ring-inset ring-2 ring-${mat.color}-400` : 'bg-white'}`}>
                                   <span className={`font-serif text-[9px] font-bold ${mat.isActive(idx) ? `text-${mat.color}-900` : 'text-slate-300'}`}>
                                     {mat.isTranspose ? <>K<sup className="not-italic">T</sup></> : mat.name}<sub>{idx+1}</sub>
                                   </span>
                                   <span className={`text-[7px] font-mono mt-0.5 opacity-60 ${mat.isActive(idx) ? 'text-black' : 'text-slate-300'}`}>[{mat.labels[idx]}]</span>
                                </div>
                              ))}
                           </div>
                           <span className="text-[9px] text-slate-500 font-serif mt-1 italic">{mat.shape === 'horizontal' ? 'd×N' : 'N×d'}</span>
                         </div>
                      ))}
                    </div>

                    <div className="flex justify-center items-center gap-4 w-full mt-4 flex-1">
                      <div className={`transition-all duration-500 flex flex-col items-center ${modelType === 'standard' && activeModule >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 scale-50 translate-y-4'}`}>
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-100 border-2 border-dashed border-rose-400 rounded shadow-sm flex items-center justify-center relative overflow-hidden">
                          {modelType === 'standard' && activeModule >= 2 && <div className="absolute top-0 right-0 w-0 h-0 border-t-[4rem] border-t-slate-800/40 border-l-[4rem] border-l-transparent z-0"></div>}
                          <span className="font-serif font-bold text-rose-800 text-xl italic z-10">S</span>
                        </div>
                        <span className="text-[9px] text-rose-600 font-serif mt-1 font-bold italic">N×N 中间矩阵</span>
                      </div>
                      <div className={`transition-all duration-500 flex flex-col items-center ${modelType === 'standard' && activeModule >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 scale-50 translate-y-4'}`}>
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-fuchsia-100 border-2 border-dashed border-fuchsia-400 rounded shadow-sm flex items-center justify-center relative overflow-hidden">
                          <span className="font-serif font-bold text-fuchsia-800 text-xl italic z-10">P</span>
                        </div>
                        <span className="text-[9px] text-fuchsia-600 font-serif mt-1 font-bold italic">Softmax 结果</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 传输总线 */}
                <div className="flex-[2] flex md:flex-col justify-center items-center gap-1 md:gap-2 text-slate-400 relative py-4 md:py-0">
                   <div className="absolute w-full text-center z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                     <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap hidden md:block">
                        {getIoText()}
                     </div>
                     {activeModule > 1 && phase === 'running' && (
                       <div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-bounce shadow-md">
                         {modelType === 'standard' ? '+200MB!' : `+${fs.deltaIo}MB`}
                       </div>
                     )}
                   </div>
                   <ArrowRight className={`hidden md:block transition-all duration-300 ${activeModule > 1 && fs.state !== 'skip' && fs.state !== 'write_o' && activeModule !== 4 ? 'text-indigo-500 scale-150' : ''}`} size={28}/>
                   <ArrowRight className={`hidden md:block transition-all duration-300 rotate-180 ${modelType === 'standard' && (activeModule === 2 || activeModule === 3) ? 'text-rose-500 scale-150' : (modelType === 'flash' && fs.state === 'write_o' ? 'text-emerald-500 scale-150' : '')}`} size={28}/>
                </div>

                {/* SRAM (片上缓存) */}
                <div className="flex-[4] bg-amber-50 rounded-xl border-2 border-amber-200 p-4 flex flex-col items-center relative shadow-inner">
                  <div className="font-bold text-amber-800 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm mb-4 border border-amber-200">
                    <Cpu size={14}/> SRAM (计算核心)
                  </div>
                  
                  <div className="flex-1 w-full flex flex-col items-center justify-center gap-4">
                    {modelType === 'standard' ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest">TRANSIENT ZONE</div>
                        <div className={`p-4 rounded border-2 border-dashed transition-all duration-500 
                          ${activeModule === 2 ? 'bg-indigo-100 border-indigo-400' : (activeModule === 3 ? 'bg-rose-100 border-rose-400' : (activeModule >= 4 ? 'bg-fuchsia-100 border-fuchsia-400' : 'bg-white border-slate-300'))}`}>
                          <span className="font-serif font-bold text-lg italic">
                            {activeModule <= 1 ? 'EMPTY' : (activeModule === 2 ? <>Q, K<sup className="not-italic">T</sup></> : (activeModule === 3 ? 'S' : 'P, V'))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col gap-3">
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-indigo-200 shadow-sm transition-all">
                          <span className="text-[10px] text-indigo-600 font-bold">Q-STATIC</span>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-8 md:w-12 md:h-10 rounded flex items-center justify-center font-serif text-sm font-bold transition-all ${fs.i > 0 ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-400 scale-110 shadow' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}>
                              {fs.i > 0 ? <>Q<sub className="not-italic">{fs.i}</sub></> : '-'}
                            </div>
                            <span className={`text-[7px] font-mono mt-0.5 ${fs.i > 0 ? 'text-indigo-500 font-bold' : 'text-transparent'}`}>Br×d</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-amber-200 shadow-sm relative transition-all">
                          <span className="text-[10px] text-amber-600 font-bold">KV-ROTATING</span>
                          {fs.state === 'skip' && <div className="absolute inset-0 bg-rose-500/80 text-white text-[9px] font-bold rounded flex items-center justify-center z-20 animate-pulse"><EyeOff size={10} className="mr-1"/> Causal Skip!</div>}
                          <div className={`flex gap-2 items-end transition-all duration-300 ${fs.state === 'skip' ? 'opacity-20 blur-[1px]' : ''}`}>
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-6 md:w-12 md:h-8 rounded flex items-center justify-center font-serif text-xs font-bold transition-all ${fs.j > 0 ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 shadow' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}>
                                {fs.j > 0 ? <>K<sup className="not-italic text-[7px]">T</sup><sub className="not-italic text-[7px]">{fs.j}</sub></> : '-'}
                              </div>
                              <span className={`text-[7px] font-mono mt-0.5 ${fs.j > 0 ? 'text-amber-600' : 'text-transparent'}`}>d×Bc</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center font-serif text-xs font-bold transition-all ${fs.j > 0 ? 'bg-blue-100 text-blue-800 border-2 border-blue-400 shadow' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}>
                                {fs.j > 0 ? <>V<sub className="not-italic">{fs.j}</sub></> : '-'}
                              </div>
                              <span className={`text-[7px] font-mono mt-0.5 ${fs.j > 0 ? 'text-blue-500' : 'text-transparent'}`}>Bc×d</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-emerald-50 p-2 rounded border border-emerald-200 shadow-inner">
                          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-tighter">On-Chip Stats</span>
                          <div className="flex flex-col items-end">
                            <div className={`flex items-center gap-2 text-xs font-serif italic font-bold transition-colors ${fs.i > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                              <span>O, m, l</span>
                              {fs.state === 'compute' && <RefreshCw size={12} className="animate-spin-slow"/>}
                            </div>
                            <span className={`text-[7px] font-mono ${fs.i > 0 ? 'text-emerald-600 font-bold' : 'text-transparent'}`}>O: Br×d</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 并排布局：流水线与代码 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full flex flex-col min-w-0">
                 <h2 className="text-lg font-semibold mb-6 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Layers className="text-indigo-500" size={20} /> 微观计算流水线
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${modelType === 'flash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                    {modelType === 'flash' ? 'Tiling (分块)' : 'Standard (标准)'}
                  </span>
                </h2>

                <div className="relative p-2 md:p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 flex-1 overflow-x-auto">
                  <div className="relative z-10 flex flex-col gap-3">
                    
                    {modelType === 'standard' ? (
                      <>
                        <div className={`p-3 rounded border transition-all duration-300 shadow-sm ${activeModule === 1 ? 'bg-slate-800 border-slate-900 text-white scale-105 shadow-lg' : 'bg-slate-100/50 border-slate-200 text-slate-500'}`}>
                          <div className="font-semibold text-sm text-center mb-2 flex items-center justify-center gap-2"><Wrench size={16}/> Setup 初始化</div>
                          <div className={`text-center font-mono p-2 rounded border text-xs ${activeModule === 1 ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-400'}`}>
                            分配 2 个 <span className={`${activeModule === 1 ? 'text-rose-400 font-black' : ''}`}>N×N</span> 显存矩阵
                          </div>
                        </div>
                        <div className={`p-3 rounded border transition-all duration-300 shadow-sm ${activeModule === 2 ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 scale-105' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className={`font-semibold text-sm text-center mb-2 ${activeModule === 2 ? 'text-blue-900' : ''}`}>1. 计算注意力分数 & 因果掩码</div>
                          <div className="text-center font-serif bg-white p-2 rounded border border-blue-100 text-sm">
                            <span className="italic">S</span> = <span className="italic">QK</span><sup className="not-italic">T</sup>
                            <div className={`text-[10px] font-sans mt-1 font-bold ${activeModule === 2 ? 'text-rose-500' : 'text-slate-400'}`}>
                              UpperTri &larr; -&infin; (屏蔽未来)
                            </div>
                          </div>
                        </div>
                        <div className={`p-3 rounded border transition-all duration-300 shadow-sm ${activeModule === 3 ? 'bg-fuchsia-50 border-fuchsia-400 ring-2 ring-fuchsia-200 scale-105' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className={`font-semibold text-sm text-center mb-2 ${activeModule === 3 ? 'text-fuchsia-900' : ''}`}>2. 计算 Softmax 概率矩阵</div>
                          <div className="text-center font-serif bg-white p-2 rounded border border-fuchsia-100 text-sm">
                            <span className="italic">P</span> = Softmax(<span className="italic">S</span>)
                          </div>
                        </div>
                        <div className={`p-3 rounded border transition-all duration-300 shadow-sm ${activeModule >= 4 ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200 scale-105' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className={`font-semibold text-sm text-center mb-2 ${activeModule >= 4 ? 'text-purple-900' : ''}`}>3. 计算输出 O 矩阵</div>
                          <div className="text-center font-serif bg-white p-2 rounded border border-purple-100 text-sm">
                            <span className="italic">O</span> = <span className="italic">PV</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex flex-col gap-2">
                        {/* 硬件感知 Setup */}
                        <div className={`p-3 rounded-xl border-2 transition-all duration-300 shadow-sm ${activeModule === 1 ? 'bg-slate-800 border-slate-900 text-white scale-105 z-10 shadow-lg' : 'bg-slate-100/50 border-slate-200 text-slate-500'}`}>
                          <div className="font-semibold text-sm text-center mb-2 flex items-center justify-center gap-2 tracking-widest uppercase font-mono"><Wrench size={16}/> Hardware-Aware Setup</div>
                          <div className={`text-center font-serif p-2 rounded border text-[11px] flex flex-col gap-1.5 ${activeModule === 1 ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-400'}`}>
                            <div className="flex justify-between px-2"><span>K/V 列块大小:</span> <span className="font-bold text-amber-400"><span className="italic">B</span><sub className="not-italic">c</sub> = &lceil; <span className="italic">M</span> / 4<span className="italic">d</span> &rceil;</span></div>
                            <div className="flex justify-between px-2 border-t border-slate-800 pt-1"><span>Q/O 行块大小:</span> <span className="font-bold text-indigo-400"><span className="italic">B</span><sub className="not-italic">r</sub> = min(<span className="italic">B</span><sub className="not-italic">c</sub>, <span className="italic">d</span>)</span></div>
                          </div>
                        </div>

                        <div className="border-2 border-rose-300 rounded-xl p-2 md:p-3 bg-rose-50/30 relative mt-2">
                           <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-rose-600 border border-rose-200 rounded shadow-sm flex items-center gap-1">Parallel Outer Loop (Q)</div>
                           <div className="font-serif text-[11px] text-rose-800 mb-2 mt-1 flex gap-1.5">
                             {[1, 2, 3].map(i_idx => (
                               <span key={i_idx} className={`px-2 py-0.5 rounded border transition-all duration-300 ${fs.i === i_idx ? 'bg-rose-200 border-rose-400 font-bold scale-105 shadow-sm' : 'bg-white/50 border-rose-100 opacity-50'}`}>
                                 <span className="italic">i</span>={i_idx}
                               </span>
                             ))}
                           </div>

                           <div className={`border-2 border-amber-400 rounded-lg p-2 md:p-3 bg-amber-50/50 relative mt-4 transition-all duration-500 ${(fs.j > 0) ? 'opacity-100 shadow-md ring-2 ring-amber-200' : 'opacity-40 border-dashed'}`}>
                              <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-amber-700 border border-amber-200 rounded shadow-sm">Inner Serial Loop (KV)</div>
                              <div className="font-serif text-[11px] text-amber-800 mb-2 mt-1 flex gap-2 relative">
                               {[1, 2].map(j_idx => (
                                 <span key={j_idx} className={`px-2 py-0.5 rounded border transition-all duration-300 relative ${fs.j === j_idx ? 'bg-amber-200 border-amber-500 font-bold scale-105 shadow-sm' : 'bg-white/50 border-amber-100 opacity-50'}`}>
                                   <span className="italic">j</span>={j_idx}
                                   {fs.j === j_idx && fs.mask === 'skip' && <div className="absolute -top-6 left-0 bg-rose-500 text-white text-[8px] px-1.5 rounded-full font-sans font-bold shadow animate-bounce">CAUSAL SKIP</div>}
                                 </span>
                               ))}
                              </div>

                              {fs.j > 0 && (
                                <div className={`text-[10px] font-bold px-2 py-1.5 rounded mb-2 border flex items-center gap-2 shadow-sm
                                  ${fs.mask === 'skip' ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' : 
                                    (fs.mask === 'partial' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')}`}>
                                  {fs.mask === 'skip' ? <><EyeOff size={12}/> 未来块: K 完全在 Q 之后</> : 
                                   (fs.mask === 'partial' ? <><Info size={12}/> 局部掩码: Q, K 对角线重叠</> : 
                                   <><CheckCircle2 size={12}/> 全量计算: K 完全属于过去</>)}
                                </div>
                              )}

                              <div className={`bg-white border border-slate-200 rounded p-2 flex flex-col gap-1 font-serif text-[10px] xl:text-[11px] mt-2 transition-all duration-300 ${fs.state === 'skip' ? 'opacity-30 blur-[0.5px]' : 'opacity-100'}`}>
                                <div className="text-slate-400 text-[8px] font-sans font-bold uppercase border-b border-slate-100 pb-0.5 mb-1">On-Chip Update (SRAM)</div>
                                <div className="flex items-center justify-between">
                                  <span>1. <span className="italic">S</span><sub className="not-italic">ij</sub> = <span className="italic">Q</span><sub className="not-italic">i</sub><span className="italic">K</span><sub className="not-italic">j</sub><sup className="not-italic">T</sup></span>
                                  {fs.mask === 'partial' && <span className="text-[8px] text-amber-600 font-bold bg-amber-50 px-1 rounded border border-amber-200">+ MASK</span>}
                                </div>
                                <div className="flex items-center justify-between text-emerald-700">
                                  <span>2. <span className="italic">m</span><sup className="not-italic">new</sup> = max(<span className="italic">m</span>, max(<span className="italic">S</span><sub className="not-italic">ij</sub>))</span>
                                  <span className="text-[7px] font-sans opacity-60">数值稳定</span>
                                </div>
                                <div className="flex justify-between text-emerald-700">
                                  <span>3. <span className="italic">l</span><sup className="not-italic">new</sup> = exp(<span className="italic">m-m</span><sup className="not-italic">new</sup>)&middot;<span className="italic">l</span> + &sum;exp(<span className="italic">S<sub className="not-italic">ij</sub>-m</span><sup className="not-italic">new</sup>)</span>
                                </div>
                                <div className="flex flex-col text-indigo-700 mt-1 bg-indigo-50/50 p-1.5 rounded gap-1 border border-indigo-100">
                                  <div className="flex justify-between items-center">
                                    <span>4a. <span className="italic">O</span><sub className="not-italic">i</sub> &larr; <span className="italic">O</span><sub className="not-italic">i</sub> &middot; exp(<span className="italic">m-m</span><sup className="not-italic">new</sup>)</span>
                                    <span className="text-[7px] italic opacity-60">历史纠正</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>4b. <span className="italic">O</span><sub className="not-italic">i</sub> &larr; <span className="italic">O</span><sub className="not-italic">i</sub> + exp(<span className="italic">S<sub className="not-italic">ij</sub>-m</span><sup className="not-italic">new</sup>)<span className="italic">V</span><sub className="not-italic">j</sub></span>
                                    <span className="text-[7px] italic opacity-60">增量累加</span>
                                  </div>
                                </div>
                              </div>
                           </div>

                           <div className={`mt-3 flex flex-col items-center p-2 rounded border transition-all duration-500 ${fs.state === 'write_o' ? 'bg-emerald-600 border-emerald-700 shadow-lg scale-[1.02] text-white' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                             <div className="text-center text-[9px] font-bold mb-1 uppercase tracking-widest font-mono">Normalize & Write-Back</div>
                             <div className={`font-serif text-[11px] md:text-[13px] font-bold px-4 py-1 rounded-full border transition-all ${fs.state === 'write_o' ? 'bg-white text-emerald-900 border-emerald-200 animate-pulse' : 'bg-slate-100 border-slate-200'}`}>
                               <span className="italic">O</span><sub className="not-italic">{fs.i || 'i'}</sub> = (1 / <span className="italic">l</span>) &middot; <span className="italic">O</span><sub className="not-italic">{fs.i || 'i'}</sub>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 底层代码 */}
              <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
                 <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
                   <div className="flex items-center gap-2">
                     <Code className="text-emerald-400" size={20} /> 底层代码 <span className="text-[10px] text-slate-500 font-mono tracking-wider">CUDA_KERNEL.CU</span>
                   </div>
                </h2>
                <div className="font-mono text-[10px] md:text-xs xl:text-[13px] overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed">
                  {modelType === 'standard' ? (
                    <div className="whitespace-pre block">
                      <div><span className="text-emerald-400">def</span> <span className="text-blue-400">standard_attention</span>(Q, K, V):</div>
                      <br/>
                      <div className={activeModule === 1 ? "bg-slate-800 text-slate-200 px-1 -mx-1 rounded border-l-2 border-slate-400 font-bold" : "text-slate-400"}>
                        <div>  <span className="text-slate-500 font-normal"># Setup: 向显存申请 O(N²) 极大空间</span></div>
                        <div>  S_buf = allocate_hbm(N, N)</div>
                        <div>  P_buf = allocate_hbm(N, N)</div>
                      </div>
                      <br/>
                      <div className={activeModule === 2 ? "bg-blue-900/60 text-blue-200 px-1 -mx-1 rounded border-l-2 border-blue-400" : "text-slate-400"}>
                        <div>  <span className="text-slate-500"># 1. 算 QKᵀ 并一次性写满 HBM 显存带宽</span></div>
                        <div>  S_buf = Q @ K.T + Mask</div>
                      </div>
                      <br/>
                      <div className={activeModule === 3 ? "bg-fuchsia-900/50 text-fuchsia-200 px-1 -mx-1 rounded border-l-2 border-fuchsia-400" : "text-slate-400"}>
                        <div>  <span className="text-slate-500"># 2. 从 HBM 读 S, 计算 Softmax, 再写回 P</span></div>
                        <div>  P_buf = softmax(S_buf)</div>
                      </div>
                      <br/>
                      <div className={activeModule >= 4 ? "bg-purple-900/60 text-purple-200 px-1 -mx-1 rounded border-l-2 border-purple-400" : "text-slate-400"}>
                        <div>  <span className="text-slate-500"># 3. 最后一次搬运写回最终 O</span></div>
                        <div>  O = P_buf @ V</div>
                        <div>  <span className="text-emerald-400">return</span> O</div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre block">
                      <div><span className="text-emerald-400">__global__</span> <span className="text-blue-400">flash_attn_kernel</span>(...):</div>
                      <br/>
                      <div className={activeModule === 1 ? "bg-slate-800 text-slate-200 px-1 -mx-1 rounded border-l-2 border-slate-400 font-bold" : "text-slate-400"}>
                        <div>  <span className="text-slate-500 font-normal">// 硬件感知 Setup: 计算切块大小时解耦 Q 与 KV</span></div>
                        <div>  Bc = ceil(M / (4*d)); Br = min(Bc, d);</div>
                      </div>
                      <br/>
                      <div className={fs.i > 0 ? "bg-rose-900/40 text-rose-200 px-1 -mx-1 rounded border-l-2 border-rose-400 font-bold" : "text-slate-400"}>
                        <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(Q_blocks): </div>
                        <div>      Qi = Q[i]; m, l = -inf, 0;</div>
                      </div>
                      <div className={fs.j > 0 ? "bg-amber-900/40 text-amber-200 px-1 -mx-1 rounded border-l-2 border-amber-400 ml-4 mt-1" : "text-slate-400 ml-4 mt-1"}>
                        <div>      <span className="text-emerald-400">for</span> j <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(KV_blocks):</div>
                        <div className={fs.state === 'skip' ? "bg-rose-600 text-white font-bold px-1 rounded inline-block" : ""}>          <span className="text-emerald-400">if</span> start(K[j]) &gt; end(Q[i]): <span className="text-emerald-400">continue</span></div>
                        <br/>
                        <div>          Kj, Vj = K[j], V[j]; S_ij = Qi @ Kj.T;</div>
                        <div className={fs.mask === 'partial' ? "bg-amber-600 text-white font-bold px-1 rounded inline-block" : ""}>          <span className="text-emerald-400">if</span> is_diagonal: S_ij += Mask_ij;</div>
                        <br/>
                        <div>          m_new = max(m, max(S_ij));</div>
                        <div>          l_new = exp(m-m_new)*l + sum(exp(S_ij-m_new));</div>
                        <div className="text-indigo-300 font-bold">          O_i = O_i * exp(m-m_new) + exp(S_ij-m_new)@Vj;</div>
                        <div>          m, l = m_new, l_new;</div>
                      </div>
                      <div className={fs.state === 'write_o' ? "bg-emerald-900/60 text-emerald-200 px-1 -mx-1 rounded font-bold mt-1" : "text-slate-400 mt-1"}>
                        <div>      O[i] = (1 / l) * O_i; <span className="text-slate-500 font-normal">// 仅在外层写回一次</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 shadow-xl h-full flex flex-col border border-indigo-700">
              <h3 className="text-lg font-bold mb-4 text-white border-b border-indigo-700 pb-2 flex items-center gap-2">
                <Info size={18} className="text-indigo-300"/> 原理深度解析
              </h3>
              
              <div className="space-y-4 text-sm leading-relaxed flex-1">
                {activeModule === 0 && (
                  <div className="text-center py-10 opacity-70">
                    <Database size={48} className="mx-auto mb-4 text-indigo-400 opacity-20"/>
                    <p>等待初始化...<br/>请选择模式并点击“开始执行”</p>
                  </div>
                )}
                
                {modelType === 'standard' && activeModule >= 1 && (
                  <div className="animate-fade-in space-y-3">
                    <h4 className="font-bold text-rose-300 text-base">内存墙：效率的杀手</h4>
                    <p className="opacity-90 text-[13px]">标准 Attention 在每一步中间计算后都必须将全量 $N \times N$ 矩阵写回 HBM。当 $N=8K$ 时，中间显存占用将超过 <strong className="text-rose-400">256MB 每头</strong>。</p>
                    <div className="bg-rose-950/50 p-3 rounded-lg border border-rose-800 text-xs text-rose-200 italic font-mono">
                      // IO Traffic &prop; N*d + N<sup>2</sup>
                    </div>
                  </div>
                )}

                {modelType === 'flash' && activeModule >= 1 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="p-3 bg-indigo-950/50 rounded-lg border border-indigo-700">
                      <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-2"><Zap size={14}/> 核心 1：硬件感知解耦</h4>
                      <p className="text-[12px] opacity-80">Flash 探测 SRAM 的物理大小 M。为了塞进计算核心，算法解耦计算出 <span className="font-serif italic">B<sub>c</sub></span> (KV块) 和 <span className="font-serif italic">B<sub>r</sub></span> (Q块)。</p>
                    </div>

                    <div className="p-3 bg-amber-950/50 rounded-lg border border-amber-800">
                      <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-2"><RefreshCw size={14}/> 核心 2：数值稳定性保护</h4>
                      <p className="text-[12px] opacity-80">Online Softmax 实时追踪最大值 <span className="font-mono text-amber-400">m</span>。这不仅是为了分块，更重要是防止指数项发生 <strong className="text-white">浮点溢出</strong>。通过指数差值因子，算法完美修正了历史结果。</p>
                    </div>

                    <div className="p-3 bg-rose-950/50 rounded-lg border border-rose-800">
                      <h4 className="font-bold text-rose-300 text-sm mb-1 flex items-center gap-2"><EyeOff size={14}/> 核心 3：掩码状态优化</h4>
                      <p className="text-[12px] opacity-80">这是 Flash 的性能杀器。判断分块索引：<br/>
                        1. <strong className="text-emerald-400">Past</strong>: 无掩码裸奔。<br/>
                        2. <strong className="text-amber-400">Intersect</strong>: 局部对角线 Mask。<br/>
                        3. <strong className="text-rose-400">Future</strong>: 整块跳过加载，大幅省电！
                      </p>
                    </div>

                    {activeModule >= 13 && (
                      <div className="mt-2 p-3 bg-emerald-600/20 border border-emerald-500 rounded-xl text-center">
                        <Zap className="inline mr-2 text-amber-400" size={16}/>
                        <span className="font-bold text-white text-[13px]">IO 复杂度从 $O(N^2)$ 降为 $O(N)$！</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
