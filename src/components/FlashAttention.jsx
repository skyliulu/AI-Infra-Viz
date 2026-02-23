import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, Code, ArrowRight, Activity, Layers, RefreshCw, EyeOff, Wrench, Info, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [modelType, setModelType] = useState('flash'); 
  const [phase, setPhase] = useState('idle'); 
  const [activeModule, setActiveModule] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);

  // --- 全局硬核维度 ---
  const N = 192; // 总序列长度
  const d = 64;  // 头维度
  const Br = 64; // Q / O 切块 (192/64 = 3块)
  const Bc = 96; // K / V 切块 (192/96 = 2块)

  const colorMap = {
    indigo: { bg: 'bg-indigo-200', border: 'border-indigo-400', text: 'text-indigo-900' },
    amber: { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' },
    blue: { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-200', border: 'border-emerald-400', text: 'text-emerald-900' }
  };

  const getFlashState = (step) => {
    if (step === 1) return { i: 0, j: 0, state: 'setup', mask: null, deltaIo: 0 };
    if (step >= 2 && step <= 5) {
      if (step === 2) return { i: 1, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '0:64' };
      if (step === 3) return { i: 1, j: 1, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '0:64', rangeK: '0:96' }; 
      if (step === 4) return { i: 1, j: 2, state: 'skip', mask: 'skip', deltaIo: 0, rangeQ: '0:64', rangeK: '96:192' };    
      if (step === 5) return { i: 1, j: 0, state: 'write_o', mask: null, deltaIo: 1 };
    }
    if (step >= 6 && step <= 9) {
      if (step === 6) return { i: 2, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '64:128' };
      if (step === 7) return { i: 2, j: 1, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '64:128', rangeK: '0:96' }; 
      if (step === 8) return { i: 2, j: 2, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '64:128', rangeK: '96:192' }; 
      if (step === 9) return { i: 2, j: 0, state: 'write_o', mask: null, deltaIo: 1 };
    }
    if (step >= 10 && step <= 13) {
      if (step === 10) return { i: 3, j: 0, state: 'load_q', mask: null, deltaIo: 1, rangeQ: '128:192' };
      if (step === 11) return { i: 3, j: 1, state: 'compute', mask: 'none', deltaIo: 2, rangeQ: '128:192', rangeK: '0:96' }; 
      if (step === 12) return { i: 3, j: 2, state: 'compute', mask: 'partial', deltaIo: 2, rangeQ: '128:192', rangeK: '96:192' }; 
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
      if (activeModule === 1) return "分配显存地址";
      if (activeModule === 2) return "读 Q,K / 写 S";
      if (activeModule === 3) return "读 S / 写 P";
      if (activeModule >= 4) return "读 P,V / 写 O";
    } else {
      if (activeModule === 1) return "参数探测与切分";
      if (fs.state === 'load_q') return `读取 Q 块 (Br×d)`;
      if (fs.state === 'compute') return `加载 K,V 块 (d×Bc)`;
      if (fs.state === 'skip') return `拦截未来块 K`;
      if (fs.state === 'write_o') return `写回 O 归一化块`;
    }
    return "完成";
  };

  useEffect(() => {
    let timer;
    if (isPlaying && phase !== 'done') {
      let delay = 2200; 
      if (activeModule === 0) delay = 500;
      if (activeModule === 1) delay = 3000;
      if (modelType === 'flash' && fs.state === 'skip') delay = 1200; 
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
      name: 'Q', color: 'indigo', shape: 'vertical', 
      blocks: modelType === 'flash' ? 3 : 1, 
      labels: modelType === 'flash' ? ['0:64', '64:128', '128:192'] : ['N=192 (Full)'],
      isActive: (idx) => modelType === 'flash' ? (fs.i === idx + 1 && fs.state !== 'setup') : activeModule >= 2
    },
    { 
      name: 'K', color: 'amber', shape: 'horizontal', isTranspose: true,
      blocks: modelType === 'flash' ? 2 : 1, 
      labels: modelType === 'flash' ? ['0:96', '96:192'] : ['N=192 (Full)'],
      isActive: (idx) => modelType === 'flash' ? (fs.j === idx + 1 && fs.state !== 'skip') : activeModule >= 2
    },
    { 
      name: 'V', color: 'blue', shape: 'vertical', 
      blocks: modelType === 'flash' ? 2 : 1, 
      labels: modelType === 'flash' ? ['0:96', '96:192'] : ['N=192 (Full)'],
      isActive: (idx) => modelType === 'flash' ? (fs.j === idx + 1 && fs.state !== 'skip') : activeModule >= 4
    },
    { 
      name: 'O', color: 'emerald', shape: 'vertical', 
      blocks: modelType === 'flash' ? 3 : 1, 
      labels: modelType === 'flash' ? ['0:64', '64:128', '128:192'] : ['N=192 (Full)'],
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
      <div className="max-w-[90rem] mx-auto space-y-4 md:space-y-6">
        
        {/* 顶部控制栏 */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              Flash Attention 原理全景可视化
            </h1>
            <p className="text-slate-500 text-[12px] md:text-sm mt-1">
              绝对物理对齐：SRAM 切块大小严格匹配 HBM 局部映射，感受真实的内存 Tiling
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => handleModelTypeChange('standard')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'standard' ? 'bg-white shadow-sm text-rose-700' : 'text-slate-500 hover:text-slate-700'}`}>
                标准 Attention
              </button>
              <button onClick={() => handleModelTypeChange('flash')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'flash' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Zap size={14} /> Flash Attention
              </button>
            </div>
            <button onClick={reset} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title="重置"><RotateCcw size={18} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition shadow-sm ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isPlaying ? <><Pause size={16} /> 暂停</> : <><Play size={16} /> {phase === 'done' ? '重播' : '自动播放'}</>}
            </button>
            <button onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="flex items-center gap-2 px-4 py-2 w-32 md:w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-sm font-bold disabled:opacity-50 transition shadow-sm">
              <SkipForward size={16} /> <span className="truncate">下一阶段</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* 物理硬件视角 */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 relative flex flex-col gap-4">
              
              {/* 标题与参数看板 */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-semibold text-base md:text-lg text-slate-700">
                  <Database className="text-indigo-500" size={20} /> 物理层数据交换视图
                </div>
                <div className="flex items-center divide-x divide-indigo-200 bg-indigo-50 rounded-lg border border-indigo-100 shadow-inner px-2 py-1 text-[11px] md:text-xs text-indigo-800 font-mono">
                  <div className="px-3">N = <strong className="text-indigo-900 font-black">192</strong></div>
                  <div className="px-3">d = <strong className="text-indigo-900 font-black">64</strong></div>
                </div>
              </div>
              
              {/* IO 流量槽 */}
              <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs md:text-sm font-bold text-slate-600 flex items-center gap-1"><Activity size={16}/> 显存 IO 累计流量 (HBM)</span>
                  <div className="text-right">
                    <span className={`text-xl md:text-2xl font-black font-mono ${modelType === 'standard' ? 'text-rose-600' : 'text-emerald-600'}`}>{currentTraffic}</span>
                    <span className="text-slate-500 text-xs ml-1">MB</span>
                  </div>
                </div>
                <div className="w-full h-2.5 md:h-3 bg-slate-200 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-700 ease-out ${modelType === 'standard' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((currentTraffic / MAX_TRAFFIC) * 100, 100)}%` }}></div>
                </div>
              </div>

              {/* 紧凑化高度：调整 min-h，去除不必要的大空隙 */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 lg:gap-6 items-stretch justify-center min-h-[20rem] md:min-h-[22rem] mt-1 relative w-full">
                
                {/* HBM 模块 */}
                <div className="flex-[5] lg:flex-[6] bg-slate-100 rounded-2xl border-2 border-slate-300 p-3 md:p-4 flex flex-col items-center relative shadow-sm w-full">
                  <div className="font-bold text-slate-700 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm mb-2 border border-slate-200 text-[10px] md:text-xs z-10">
                    <Database size={14} className="text-blue-500"/> HBM (主显存)
                  </div>
                  
                  <div className="w-full flex-1 flex flex-col justify-start relative pt-2">
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4 lg:gap-6 z-10 w-full items-end">
                      {hbmMatrices.map((mat) => {
                         const styles = colorMap[mat.color];
                         return (
                           <div key={mat.name} className="flex flex-col items-center group relative">
                             <span className={`font-serif font-black mb-1 ${styles.text} text-sm`}>
                               {mat.isTranspose ? <>K<sup className="not-italic text-[9px]">T</sup></> : mat.name}
                             </span>
                             
                             <div 
                               className={`border-2 rounded shadow-md transition-all duration-500 bg-white flex relative border-slate-300 overflow-hidden
                                 ${mat.shape === 'horizontal' ? 'w-24 md:w-[120px] lg:w-36 flex-row' : 'w-8 md:w-10 lg:w-12 flex-col'} 
                               `}
                               style={{ aspectRatio: mat.shape === 'horizontal' ? '3 / 1' : '1 / 3' }}
                             >
                                {Array.from({ length: mat.blocks }).map((_, idx) => {
                                  const active = mat.isActive(idx);
                                  return (
                                    <div key={idx} className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 border-slate-200
                                      ${mat.shape === 'horizontal' && idx < mat.blocks-1 ? `border-r border-dashed` : ''} 
                                      ${mat.shape === 'vertical' && idx < mat.blocks-1 ? `border-b border-dashed` : ''} 
                                      ${active ? `${styles.bg} ${styles.border} ring-2 ring-inset ring-white/60 shadow-inner scale-[1.05] z-20` : 'bg-white grayscale opacity-20'}`}>
                                       <span className={`font-serif text-[8px] md:text-[10px] font-black ${active ? styles.text : 'text-slate-400'}`}>
                                         {mat.isTranspose ? <>K<sup className="not-italic">T</sup></> : mat.name}
                                         {modelType === 'flash' && <sub>{idx+1}</sub>}
                                       </span>
                                    </div>
                                  )
                                })}
                             </div>
                             <span className="text-[8px] md:text-[9px] text-slate-500 font-serif mt-1 font-bold italic">{mat.shape === 'horizontal' ? 'd×N' : 'N×d'}</span>
                           </div>
                         )
                      })}
                    </div>

                    {/* S, P 矩阵 (仅 Standard) */}
                    <div className="flex justify-center items-center gap-4 md:gap-8 lg:gap-10 w-full mt-6 md:mt-8 flex-1">
                      <div className={`transition-all duration-500 flex flex-col items-center ${modelType === 'standard' && activeModule >= 2 ? 'opacity-100 translate-y-0 scale-100 relative' : 'opacity-0 scale-50 translate-y-4 absolute pointer-events-none'}`}>
                        <div className="w-16 md:w-20 lg:w-28 aspect-square bg-rose-100 border-2 border-dashed border-rose-400 rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden">
                          {activeModule >= 2 && <div className="absolute top-0 right-0 w-full h-full border-t-[4rem] md:border-t-[5rem] lg:border-t-[7rem] border-t-slate-800/40 border-l-[4rem] md:border-l-[5rem] lg:border-l-[7rem] border-l-transparent z-0"></div>}
                          <span className="font-serif font-black text-rose-800 text-xl md:text-3xl italic z-10">S</span>
                        </div>
                        <span className="text-[8px] md:text-[9px] text-rose-600 font-mono mt-1 font-bold uppercase">N×N Memory</span>
                      </div>
                      <div className={`transition-all duration-500 flex flex-col items-center ${modelType === 'standard' && activeModule >= 3 ? 'opacity-100 translate-y-0 scale-100 relative' : 'opacity-0 scale-50 translate-y-4 absolute pointer-events-none'}`}>
                        <div className="w-16 md:w-20 lg:w-28 aspect-square bg-fuchsia-100 border-2 border-dashed border-fuchsia-400 rounded-xl shadow-xl flex items-center justify-center">
                          <span className="font-serif font-black text-fuchsia-800 text-xl md:text-3xl italic">P</span>
                        </div>
                        <span className="text-[8px] md:text-[9px] text-fuchsia-600 font-mono mt-1 font-bold uppercase">Softmax</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IO 箭头区 */}
                <div className="flex flex-col md:flex-col justify-center items-center gap-2 md:gap-4 relative z-50 shrink-0 min-w-[60px] md:min-w-[80px] py-2 md:py-0">
                   <div className="w-full text-center flex flex-row md:flex-col items-center justify-center gap-1.5 md:gap-2">
                     <div className="bg-slate-900 text-white text-[9px] md:text-[10px] px-2 md:px-3 py-1 rounded-full shadow-xl whitespace-nowrap flex items-center gap-1 border border-slate-700">
                        <Activity size={10} className="text-emerald-400 animate-pulse hidden md:block"/> {getIoText()}
                     </div>
                     {activeModule > 1 && phase === 'running' && fs.deltaIo !== 0 && (
                       <div className="bg-emerald-600 text-white text-[9px] md:text-[11px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-full animate-bounce shadow-xl border border-white whitespace-nowrap">
                         {modelType === 'standard' ? '+200MB!' : `+${fs.deltaIo}MB`}
                       </div>
                     )}
                   </div>
                   <div className="flex flex-row md:flex-col gap-4 md:gap-8 relative mt-1 md:mt-2">
                    <ArrowRight className={`transition-all duration-300 rotate-90 md:rotate-0 ${activeModule > 1 && fs.state !== 'skip' && fs.state !== 'write_o' && activeModule !== 4 ? 'text-indigo-500 scale-[1.2] md:scale-[1.5] lg:scale-[2] drop-shadow-md' : 'opacity-10 scale-100'}`} size={24}/>
                    <ArrowRight className={`transition-all duration-300 -rotate-90 md:rotate-180 ${modelType === 'standard' && (activeModule === 2 || activeModule === 3) ? 'text-rose-500 scale-[1.2] md:scale-[1.5] lg:scale-[2] drop-shadow-md' : (modelType === 'flash' && fs.state === 'write_o' ? 'text-emerald-500 scale-[1.2] md:scale-[1.5] lg:scale-[2] drop-shadow-md' : 'opacity-10 scale-100')}`} size={24}/>
                   </div>
                </div>

                {/* SRAM 模块：极致压缩高度 */}
                <div className="flex-[4] lg:flex-[5] bg-amber-50 rounded-2xl border-2 border-amber-300 p-2 md:p-4 flex flex-col items-center relative shadow-lg ring-1 ring-amber-100 w-full">
                  <div className="font-bold text-amber-800 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm mb-3 border border-amber-200 text-[10px] md:text-xs z-10">
                    <Cpu size={14} className="text-amber-500"/> SRAM (计算核心)
                  </div>
                  
                  <div className="flex-1 w-full flex flex-col items-center justify-center gap-2 md:gap-4">
                    {modelType === 'standard' ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-[9px] md:text-[10px] text-slate-400 font-black tracking-widest uppercase border-b border-slate-200 pb-1">Buffer</div>
                        <div className={`w-24 md:w-32 lg:w-40 aspect-[4/3] flex items-center justify-center rounded-3xl border-4 border-dashed transition-all duration-500 shadow-inner
                          ${activeModule === 2 ? 'bg-indigo-100 border-indigo-400 scale-110' : (activeModule === 3 ? 'bg-rose-100 border-rose-400 scale-110' : (activeModule >= 4 ? 'bg-fuchsia-100 border-fuchsia-400 scale-110' : 'bg-white border-slate-200'))}`}>
                          <span className="font-serif font-black text-xl md:text-3xl italic tracking-tighter">
                            {activeModule <= 1 ? 'IDLE' : (activeModule === 2 ? <>Q, K<sup className="not-italic text-lg">T</sup></> : (activeModule === 3 ? 'S' : 'P, V'))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col gap-2 md:gap-3 px-1 max-w-[280px] mx-auto">
                        {/* Q Tile */}
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-200 shadow-sm transition-all group">
                          <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] text-indigo-600 font-black uppercase">Q-Tile</span>
                            <span className="text-[7px] font-mono text-slate-400">Row Block</span>
                          </div>
                          <div className="flex flex-col items-center relative">
                            <div className={`w-10 md:w-12 lg:w-14 aspect-square rounded-lg flex items-center justify-center font-serif text-sm font-black transition-all ${fs.i > 0 ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-500 scale-110 shadow-md ring-2 ring-indigo-500/20' : 'bg-slate-50 text-slate-300 border border-slate-200 opacity-30'}`}>
                              {fs.i > 0 ? <>Q<sub className="not-italic">{fs.i}</sub></> : '-'}
                            </div>
                            <span className={`text-[7px] md:text-[8px] font-mono mt-1 ${fs.i > 0 ? 'text-indigo-600 font-bold' : 'text-transparent'}`}>{Br}×{d}</span>
                          </div>
                        </div>
                        {/* KV Tiles */}
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-sm relative transition-all">
                          <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] text-amber-600 font-black uppercase">KV-Tiles</span>
                            <span className="text-[7px] font-mono text-slate-400">Col Block</span>
                          </div>
                          {fs.state === 'skip' && <div className="absolute inset-0 bg-rose-600/90 text-white text-[10px] font-black rounded-xl flex flex-col items-center justify-center z-20 ring-2 ring-white ring-inset shadow-lg uppercase"><EyeOff size={16} className="mb-0.5"/> Skip</div>}
                          <div className={`flex gap-2 md:gap-3 items-end transition-all duration-300 ${fs.state === 'skip' ? 'opacity-20 blur-[1px]' : ''}`}>
                            <div className="flex flex-col items-center">
                              <div className={`w-12 md:w-[60px] lg:w-[66px] aspect-[3/2] rounded-lg flex items-center justify-center font-serif text-xs font-black transition-all ${fs.j > 0 ? 'bg-amber-100 text-amber-900 border-2 border-amber-500 scale-105 shadow-md' : 'bg-slate-50 text-slate-300 border border-slate-200 opacity-30'}`}>
                                {fs.j > 0 ? <>K<sup className="not-italic text-[8px]">T</sup><sub className="not-italic text-[8px]">{fs.j}</sub></> : '-'}
                              </div>
                              <span className={`text-[7px] md:text-[8px] font-mono mt-1 ${fs.j > 0 ? 'text-amber-600 font-bold' : 'text-transparent'}`}>{d}×{Bc}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`w-8 md:w-10 lg:w-11 aspect-[2/3] rounded-lg flex items-center justify-center font-serif text-xs font-black transition-all ${fs.j > 0 ? 'bg-blue-100 text-blue-900 border-2 border-blue-500 scale-105 shadow-md' : 'bg-slate-50 text-slate-300 border border-slate-200 opacity-30'}`}>
                                {fs.j > 0 ? <>V<sub className="not-italic">{fs.j}</sub></> : '-'}
                              </div>
                              <span className={`text-[7px] md:text-[8px] font-mono mt-1 ${fs.j > 0 ? 'text-blue-500 font-bold' : 'text-transparent'}`}>{Bc}×{d}</span>
                            </div>
                          </div>
                        </div>
                        {/* O-Accum */}
                        <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-inner group">
                          <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] text-emerald-800 font-black uppercase">O-Accum</span>
                            <span className="text-[7px] font-mono text-emerald-600/70">States</span>
                            <div className="flex items-center mt-1">
                              <span className={`text-[6px] font-mono px-1 rounded-sm border transition-colors ${fs.i > 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-30'}`}>m,l: Br×1</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center relative">
                            <div className={`w-10 md:w-12 lg:w-14 aspect-square rounded-lg flex items-center justify-center font-serif text-sm font-black transition-all ${fs.i > 0 ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-500 scale-110 shadow-md ring-2 ring-emerald-500/20' : 'bg-slate-50 text-slate-300 border border-slate-200 opacity-30'}`}>
                              {fs.i > 0 ? <>O<sub className="not-italic">{fs.i}</sub></> : '-'}
                            </div>
                            {fs.state === 'compute' && <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-emerald-200"><RefreshCw size={10} className="animate-spin-slow text-emerald-500"/></div>}
                            <span className={`text-[7px] md:text-[8px] font-mono mt-1 ${fs.i > 0 ? 'text-emerald-700 font-bold' : 'text-transparent'}`}>{Br}×{d}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 下方面板：微观流水线与 Python 代码并排 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* 微观流水线 */}
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col min-w-0">
                 <h2 className="text-base md:text-lg font-semibold mb-4 md:mb-6 flex items-center justify-between shrink-0 border-b pb-2 border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Layers size={20} className="text-indigo-500" /> 微观计算流水线
                  </div>
                </h2>

                <div className="relative p-3 md:p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 flex-1">
                  <div className="relative z-10 flex flex-col gap-3 md:gap-4">
                    {modelType === 'standard' ? (
                      <>
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${activeModule === 1 ? 'bg-slate-800 border-slate-900 text-white scale-105 shadow-xl' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'}`}>
                          <div className="font-bold text-xs uppercase mb-2 flex items-center gap-2"><Wrench size={14}/> 显存初始化</div>
                          <div className="font-mono text-[11px] opacity-80">allocate_hbm(N×N) // 分配庞大空间</div>
                        </div>
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${activeModule === 2 ? 'bg-blue-100 border-blue-400 text-blue-900 scale-105 shadow-md' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className="font-bold text-xs uppercase mb-2">1. 计算 Attention Scores</div>
                          <div className="font-serif italic font-black text-center text-sm md:text-base">S = QK<sup>T</sup> + Mask</div>
                        </div>
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${activeModule === 3 ? 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 scale-105 shadow-md' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className="font-bold text-xs uppercase mb-2">2. 全局 Softmax</div>
                          <div className="font-serif italic font-black text-center text-sm md:text-base">P = Softmax(S)</div>
                        </div>
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${activeModule >= 4 ? 'bg-purple-100 border-purple-400 text-purple-900 scale-105 shadow-md' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                          <div className="font-bold text-xs uppercase mb-2">3. 输出聚合</div>
                          <div className="font-serif italic font-black text-center text-sm md:text-base">O = PV</div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex flex-col gap-3">
                        {/* Setup */}
                        <div className={`p-3 rounded-xl border-2 transition-all duration-300 shadow-sm ${activeModule === 1 ? 'bg-slate-800 border-slate-900 text-white scale-[1.02] shadow-xl' : 'bg-white/60 border-slate-200 text-slate-500'}`}>
                          <div className="font-bold text-[11px] mb-1 flex items-center gap-2"><Wrench size={14}/> 硬件感知解耦计算</div>
                          <div className="flex flex-col gap-1 text-[10px] md:text-[11px] font-mono border-t border-slate-700 pt-1.5 mt-1">
                            <div className="flex justify-between">
                              <span className={`${activeModule === 1 ? 'text-amber-400' : ''}`}>Bc = ceil(M / (4*d))</span>
                              <span className="font-bold">= {Bc}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={`${activeModule === 1 ? 'text-indigo-400' : ''}`}>Br = min(Bc, d)</span>
                              <span className="font-bold">= {Br}</span>
                            </div>
                          </div>
                        </div>

                        {/* Outer Loop */}
                        <div className="border-2 border-rose-300 rounded-2xl p-3 md:p-4 bg-rose-50/50 relative shadow-inner">
                           <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-rose-600 border border-rose-200 rounded-full">Outer Loop (Q块)</div>
                           <div className="font-mono text-[11px] text-rose-800 mb-3 mt-1 flex flex-wrap gap-2">
                             {[1, 2, 3].map(idx => {
                               const isActive = fs.i === idx;
                               const ranges = ['0:64', '64:128', '128:192'];
                               return (
                               <span key={idx} className={`px-2 py-1 rounded-lg border-2 transition-all duration-300 ${isActive ? 'bg-rose-600 text-white font-bold scale-105 shadow-md border-rose-700' : 'bg-white border-rose-200 opacity-50'}`}>
                                 Q[{ranges[idx-1]}]
                               </span>
                             )})}
                           </div>

                           {/* Inner Loop */}
                           <div className={`border-2 border-amber-400 rounded-xl p-3 md:p-4 bg-amber-50/80 relative mt-4 transition-all duration-500 ${(fs.j > 0) ? 'opacity-100 shadow-md ring-4 ring-amber-500/10' : 'opacity-40 border-dashed blur-[0.5px]'}`}>
                              <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-amber-700 border border-amber-200 rounded-full">Inner Loop (KV块)</div>
                              <div className="font-mono text-[11px] text-amber-800 mb-3 mt-1 flex flex-wrap gap-2 md:gap-3 relative">
                               {[1, 2].map(idx => {
                                 const isActive = fs.j === idx;
                                 const ranges = ['0:96', '96:192'];
                                 return (
                                 <span key={idx} className={`px-2 py-1 rounded-lg border-2 transition-all duration-300 relative ${isActive ? 'bg-amber-600 text-white font-bold scale-105 shadow-md border-amber-700' : 'bg-white border-amber-200 opacity-50'}`}>
                                   KV[{ranges[idx-1]}]
                                   {isActive && fs.mask === 'skip' && <div className="absolute -top-8 left-0 bg-rose-600 text-white text-[9px] px-2 py-1 rounded-full font-sans font-black shadow-xl animate-bounce border border-white whitespace-nowrap z-20">🚫 SKIP</div>}
                                 </span>
                               )})}
                              </div>

                              {/* 真实索引验证面板 */}
                              {fs.j > 0 && (
                                <div className={`text-[10px] md:text-[11px] font-bold px-3 py-2 rounded-lg mb-3 border flex flex-col gap-1 shadow-sm transition-all duration-500
                                  ${fs.mask === 'skip' ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse' : 
                                    (fs.mask === 'partial' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')}`}>
                                  <div className="flex items-center gap-1.5 font-mono text-[9px] opacity-70">
                                    <span>Q:[{fs.rangeQ}]</span> vs <span>K:[{fs.rangeK}]</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {fs.mask === 'skip' ? <><EyeOff size={14}/> K完全在未来 → 物理拦截</> : 
                                     (fs.mask === 'partial' ? <><Info size={14}/> 索引有交集 → 应用局部掩码</> : 
                                     <><CheckCircle2 size={14}/> K完全在过去 → 全量计算</>)}
                                  </div>
                                </div>
                              )}

                              <div className={`bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 font-serif text-[11px] md:text-[12px] mt-2 transition-all duration-300 shadow-sm ${fs.state === 'skip' ? 'opacity-20 blur-[1px]' : 'opacity-100'}`}>
                                <div className="flex items-center justify-between font-bold text-slate-800 italic">
                                  <span>S<sub className="not-italic">ij</sub> = Q<sub className="not-italic">i</sub>K<sub className="not-italic">j</sub><sup>T</sup></span>
                                  {fs.mask === 'partial' && <span className="text-[8px] font-sans text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 font-bold">+ MASK</span>}
                                </div>
                                <div className="flex items-center justify-between text-emerald-700 font-bold">
                                  <span>m<sup className="not-italic">new</sup> = max(m, max(S<sub className="not-italic">ij</sub>))</span>
                                  <span className="text-[8px] font-sans opacity-60 bg-emerald-50 px-1 rounded uppercase tracking-tighter border border-emerald-100">Safe Exp</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold border-b pb-1.5 border-emerald-50">
                                  <span>l<sup className="not-italic">new</sup> = exp(m-m<sup>new</sup>)&middot;l + &sum;exp(S<sub className="not-italic">ij</sub>-m<sup>new</sup>)</span>
                                </div>
                                <div className="flex flex-col text-indigo-700 mt-1 bg-indigo-50/60 p-2 rounded-lg gap-1 border border-indigo-100">
                                  <div className="flex justify-between items-center italic">
                                    <span className="font-bold">O<sub className="not-italic">i</sub> &larr; O<sub className="not-italic">i</sub> &middot; exp(m-m<sup>new</sup>)</span>
                                  </div>
                                  <div className="flex justify-between items-center italic">
                                    <span className="font-bold">O<sub className="not-italic">i</sub> &larr; O<sub className="not-italic">i</sub> + exp(S<sub className="not-italic">ij</sub>-m<sup>new</sup>)V<sub className="not-italic">j</sub></span>
                                  </div>
                                </div>
                              </div>
                           </div>

                           <div className={`mt-4 flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-500 shadow-md ${fs.state === 'write_o' ? 'bg-emerald-600 border-emerald-700 scale-[1.02] text-white' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50'}`}>
                             <div className="text-center text-[9px] font-bold mb-1 font-mono">Normalize & Write-Back</div>
                             <div className={`font-serif text-[13px] font-black px-6 py-1 rounded-full border-2 transition-all ${fs.state === 'write_o' ? 'bg-white text-emerald-900' : 'bg-slate-200 border-slate-300'}`}>
                               O<sub className="not-italic">{fs.i || 'i'}</sub> = (1 / l) &middot; O<sub className="not-italic">{fs.i || 'i'}</sub>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Python 代码板 */}
              <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
                 <h2 className="text-base md:text-lg font-semibold mb-4 text-white border-b border-slate-700 pb-2 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Code className="text-emerald-400" size={20} /> 底层代码实现
                   </div>
                   <span className="text-[10px] text-slate-400 font-mono border border-slate-700 px-2 py-0.5 rounded bg-slate-800">Python</span>
                </h2>
                <div className="font-mono text-[10px] md:text-[11px] lg:text-[12px] overflow-x-auto bg-[#080c12] p-4 md:p-5 rounded-xl border border-slate-800 flex-1 leading-relaxed shadow-inner">
                  {modelType === 'standard' ? (
                    <div className="whitespace-pre block">
                      <div><span className="text-emerald-400">def</span> <span className="text-blue-400">standard_attention</span>(Q, K, V):</div>
                      <br/>
                      <div className={activeModule === 1 ? "bg-slate-800 text-slate-100 px-2 -mx-2 rounded border-l-2 border-slate-500 font-bold" : "text-slate-500"}>
                        <div>  <span className="text-slate-600"># 申请极大的 HBM 空间</span></div>
                        <div>  S_buf = allocate(N, N) <span className="text-rose-500"># O(N²)</span></div>
                        <div>  P_buf = allocate(N, N)</div>
                      </div>
                      <br/>
                      <div className={activeModule === 2 ? "bg-blue-900/60 text-blue-100 px-2 -mx-2 rounded border-l-2 border-blue-400" : "text-slate-500"}>
                        <div>  <span className="text-slate-600"># 暴力计算并写入 HBM</span></div>
                        <div>  S_buf = Q @ K.T + Mask</div>
                      </div>
                      <br/>
                      <div className={activeModule === 3 ? "bg-fuchsia-900/50 text-fuchsia-100 px-2 -mx-2 rounded border-l-2 border-fuchsia-400" : "text-slate-500"}>
                        <div>  <span className="text-slate-600"># 从 HBM 读出并计算 Softmax</span></div>
                        <div>  P_buf = softmax(S_buf)</div>
                      </div>
                      <br/>
                      <div className={activeModule >= 4 ? "bg-purple-900/60 text-purple-100 px-2 -mx-2 rounded border-l-2 border-purple-400" : "text-slate-500"}>
                        <div>  <span className="text-slate-600"># 最后一次低效读写</span></div>
                        <div>  O = P_buf @ V</div>
                        <div>  <span className="text-emerald-400">return</span> O</div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre block">
                      <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_attention</span>(Q, K, V):</div>
                      <br/>
                      <div className={activeModule === 1 ? "bg-slate-800 text-slate-100 px-2 -mx-2 rounded border-l-2 border-slate-500 font-bold" : "text-slate-500"}>
                        <div>  <span className="text-slate-600"># 硬件解耦切分</span></div>
                        <div>  Bc = ceil(M / (4*d)); Br = min(Bc, d)</div>
                      </div>
                      <br/>
                      <div className={fs.i > 0 ? "bg-rose-900/40 text-rose-100 px-2 -mx-2 rounded border-l-2 border-rose-500 font-bold" : "text-slate-500"}>
                        <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(N // Br): </div>
                        <div>      Qi = Q[i]; m, l = -inf, 0</div>
                      </div>
                      <div className={fs.j > 0 ? "bg-amber-900/40 text-amber-100 px-2 -mx-2 rounded border-l-2 border-amber-500 ml-4 mt-1" : "text-slate-500 ml-4 mt-1"}>
                        <div>      <span className="text-emerald-400">for</span> j <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(N // Bc):</div>
                        <div className={fs.state === 'skip' ? "bg-rose-600 text-white font-bold px-1 rounded inline-block" : ""}>          <span className="text-emerald-400">if</span> start(K[j]) &gt;= end(Q[i]): <span className="text-emerald-400">continue</span></div>
                        <br/>
                        <div>          Kj, Vj = K[j], V[j]</div>
                        <div>          S_ij = Qi @ Kj.T</div>
                        <div className={fs.mask === 'partial' ? "bg-amber-600 text-white font-bold px-1 rounded inline-block" : ""}>          <span className="text-emerald-400">if</span> is_intersect(Q[i], K[j]): </div>
                        <div className={fs.mask === 'partial' ? "bg-amber-600 text-white font-bold px-1 rounded inline-block" : ""}>              S_ij += Mask_ij</div>
                        <br/>
                        <div>          m_new = max(m, max(S_ij))</div>
                        <div>          l_new = exp(m-m_new)*l + sum(exp(S_ij-m_new))</div>
                        <div className="text-indigo-400 font-bold bg-indigo-500/10 px-1 rounded -ml-1">          O_i = O_i * exp(m-m_new) + exp(S_ij-m_new)@Vj</div>
                        <div>          m, l = m_new, l_new</div>
                      </div>
                      <div className={fs.state === 'write_o' ? "bg-emerald-900/60 text-emerald-100 px-2 -mx-2 rounded border-l-2 border-emerald-500 font-bold mt-1" : "text-slate-500 mt-1"}>
                        <div>      O[i] = (1 / l) * O_i <span className="text-slate-600"># 统一归一化写回</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 shadow-xl h-full flex flex-col border border-indigo-700">
              <h3 className="text-lg font-bold mb-4 text-white border-b border-indigo-600 pb-2 flex items-center gap-2">
                <Info size={18} className="text-indigo-300"/> 深度原理解析
              </h3>
              
              <div className="space-y-4 text-sm leading-relaxed flex-1 text-[13px]">
                {activeModule === 0 && (
                  <div className="text-center py-20 opacity-40">
                    <Database size={64} className="mx-auto mb-4 animate-pulse"/>
                    <p className="font-bold">算子待命中...</p>
                  </div>
                )}
                
                {modelType === 'standard' && activeModule >= 1 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="p-4 bg-rose-950/40 rounded-xl border border-rose-800 shadow-sm">
                      <h4 className="font-bold text-rose-300 text-base mb-1">显存墙的统治</h4>
                      <p className="opacity-90 leading-snug">
                        在 $N={N}$ 时，中间矩阵 S 有 {(N*N).toLocaleString()} 个元素。如果模型参数增大到 N=8K，单头显存即达惊人的 256MB。频繁的读写导致 GPU 带宽成为绝对瓶颈。
                      </p>
                    </div>
                  </div>
                )}

                {modelType === 'flash' && activeModule >= 1 && (
                  <div className="animate-fade-in space-y-4">
                    <div className="p-3 bg-indigo-950/50 rounded-xl border border-indigo-700">
                      <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-1.5"><Zap size={14}/> 1. 物理维度切分</h4>
                      <p className="opacity-80 leading-snug">
                        切块是在序列维度 $N$ 上进行的。由于引入了 $Br=64$ 和 $Bc=96$，内层循环每次只计算 $64 \times 96$ 的局部乘法，完美常驻在极快的 SRAM 中。
                      </p>
                    </div>

                    <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-800">
                      <h4 className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5"><RefreshCw size={14}/> 2. 动态指数修正</h4>
                      <p className="opacity-80 leading-snug">
                        Softmax 分母 l 在计算中累积。引入 exp(m - m<sub className="not-italic">new</sub>) 因子，使得旧有结果能按比例正确“缩减”，从而保证了数学上的完全等价。
                      </p>
                    </div>

                    <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-800">
                      <h4 className="font-bold text-rose-300 text-sm mb-1 flex items-center gap-1.5"><EyeOff size={14}/> 3. 因果掩码策略</h4>
                      <p className="opacity-80 leading-snug font-mono bg-black/20 p-2 rounded mt-1">
                        1. K 位于 Q 之前: 无需掩码<br/>
                        2. K 与 Q 交叉: 局部掩码<br/>
                        3. K 位于 Q 之后: 物理级跳过
                      </p>
                    </div>

                    {/* 修复点：将之前生硬的横幅改为了优雅的解释卡片 */}
                    {activeModule >= 13 && (
                      <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-700 shadow-sm mt-4 animate-fade-in">
                        <h4 className="font-bold text-emerald-400 text-sm mb-1 flex items-center gap-1.5">
                          <Zap size={14} className="text-amber-400"/> 4. 彻底打破内存墙
                        </h4>
                        <p className="opacity-90 leading-snug">
                          通过完美解耦的 Tiling 和 Online Softmax，显存读写复杂度从 O(N²) 断崖式降至 <strong className="text-white text-base">O(N)</strong>。庞大的注意力矩阵在 SRAM 中被“就地消化”，彻底释放了计算潜能！
                        </p>
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
