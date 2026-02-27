import React, { useState, useEffect } from 'react';
import { 
  Database, Cpu, Combine, Hash, ArrowRight, ArrowDown, ArrowUp,
  Layers, BrainCircuit, Play, Pause, SkipForward, RotateCcw, 
  Activity, SlidersHorizontal, BookOpen, Server, Network, 
  Clock, MemoryStick, HardDrive, Calculator
} from 'lucide-react';

const App = () => {
  // 核心执行流状态 (0: 初始, 1: N-Gram提取, 2: 异步查表与哈希, 3: 动态门控, 4: 卷积与融合)
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 稀疏容量分配状态
  const [moeRatio, setMoeRatio] = useState(75);

  useEffect(() => {
    let timer;
    if (isPlaying && step < 4) {
      timer = setTimeout(() => setStep(s => s + 1), 3500); // 稍微放慢节奏以便观察
    } else if (step >= 4) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step]);

  const togglePlay = () => {
    if (step >= 4) {
      setStep(0);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const getStepDesc = () => {
    switch(step) {
      case 0: return "等待输入";
      case 1: return "步骤 1: 提取 N-Gram / GPU 开始计算前置层";
      case 2: return "步骤 2: CPU 异步查表 / PCIe 传输重叠";
      case 3: return "步骤 3: Context-aware Gating (上下文感知门控)";
      case 4: return "步骤 4: Short Conv 卷积增强与残差融合";
      default: return "";
    }
  };

  const currentLoss = (Math.pow((moeRatio - 75) / 25, 2) * 0.015 + 1.710).toFixed(4);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 overflow-x-hidden">
      <div className="max-w-[100rem] mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Database className="text-purple-600" />
              DeepSeek Engram: 条件记忆与可扩展检索
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              引入全新的稀疏性维度 (Conditional Memory)。通过 O(1) N-Gram 哈希查表替代昂贵的计算重构，释放注意力机制。
            </p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => { setIsPlaying(false); setStep(0); }} className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition tooltip" title="重置">
                <RotateCcw size={18} />
             </button>
             <button onClick={togglePlay} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-white transition shadow-sm ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {isPlaying ? <><Pause size={18} /> 暂停推演</> : <><Play size={18} /> 动态推演</>}
             </button>
             <button onClick={() => { setIsPlaying(false); if(step<4) setStep(step+1); }} disabled={step >= 4} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50 transition shadow-sm font-semibold whitespace-nowrap">
                <SkipForward size={18} /> 下一步
             </button>
          </div>
        </div>

        {/* 顶层：宏观架构与异步预取系统 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* 左侧：宏观模型架构 (Macro Architecture) */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 mb-4 border-b border-slate-100 pb-3">
              <Network className="text-indigo-500" size={18}/> 
              骨干网络拓扑位置
            </h3>
            <div className="flex-1 flex flex-col items-center justify-end w-full relative">
              {/* 输出 */}
              <ArrowUp className="text-slate-400 mb-1" size={16}/>
              
              {/* Transformer Block with Engram */}
              <div className="border-2 border-slate-300 bg-slate-50 rounded-xl p-3 w-full relative">
                {/* 修复：移除了多余的 absolute border 边框，避免重叠干扰 */}
                <div className="text-[10px] font-bold text-slate-400 mb-2 text-center">Transformer Block (w/ Engram)</div>
                
                <div className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold py-2 rounded text-center mb-2 shadow-sm">MoE</div>
                <ArrowUp className="text-slate-400 mx-auto mb-1" size={12}/>
                <div className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold py-2 rounded text-center mb-2 shadow-sm">Attention</div>
                <ArrowUp className="text-slate-400 mx-auto mb-1" size={12}/>
                {/* 核心注入点 */}
                <div className={`text-xs font-bold py-2 rounded text-center shadow-sm transition-all duration-500 relative
                  ${step >= 3 ? 'bg-purple-500 border border-purple-600 text-white shadow-purple-500/40 ring-2 ring-purple-300' : 'bg-purple-100 border border-purple-300 text-purple-800'}`}>
                  Engram
                  {step >= 3 && <div className="absolute -right-2 top-1/2 w-2 h-0.5 bg-purple-500"></div>}
                </div>
              </div>

              <ArrowUp className="text-slate-400 my-1" size={16}/>
              <div className={`w-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold py-2 rounded text-center shadow-sm transition-all
                 ${step === 1 || step === 2 ? 'ring-2 ring-amber-400' : ''}`}>
                Transformer Block
              </div>
              
              <ArrowUp className="text-slate-400 my-1" size={16}/>
              <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold py-2 rounded text-center shadow-sm">
                Vocab Embedding
              </div>
              
              <ArrowUp className="text-slate-400 my-1" size={16}/>
              <div className="flex gap-1 justify-center w-full">
                {['Only', 'Alexander', 'the', 'Great', '...'].map((t, i) => (
                  <span key={i} className="text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-slate-600">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：真正的系统级异步预取时间轴 (Async Prefetching Timeline) */}
          <div className="lg:col-span-9 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 mb-4 border-b border-slate-100 pb-3">
              <Clock className="text-blue-500" size={18}/> 
              硬件系统级异步预取时间轴 (Computation-Communication Overlap)
            </h3>
            
            {/* 修复：加大 pt-8 避免顶部刻度线遮挡 */}
            <div className="flex-1 flex flex-col justify-center relative w-full pt-8 pb-2 px-2">
               
               {/* 时间轴刻度 (适当下调 top) */}
               <div className="absolute top-2 left-20 right-0 h-4 flex justify-between text-[10px] md:text-xs font-mono text-slate-400">
                 <span>T₀ (输入)</span><span>T₁ (重叠期)</span><span>T₂ (传输完成)</span><span>T₃ (融合)</span>
               </div>

               {/* CPU / Host 轨道 */}
               <div className="flex items-center w-full h-16 mt-1 relative">
                 <div className="w-20 shrink-0 flex flex-col items-center justify-center">
                   <HardDrive className="text-slate-600" size={24}/>
                   <span className="text-[10px] md:text-xs font-bold text-slate-700 mt-1">CPU / Host</span>
                 </div>
                 
                 <div className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl h-12 relative flex items-center px-4 overflow-hidden">
                    {/* 背景传输带 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent opacity-50"></div>
                    
                    {/* Hash & Lookup 动作 */}
                    <div className={`absolute left-[5%] px-3 py-1.5 rounded bg-slate-800 text-white text-[10px] font-bold transition-all duration-500 z-10
                      ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                      CPU: 计算 Hash & 查表
                    </div>

                    {/* PCIe 传输条 */}
                    <div className={`absolute h-2 bg-purple-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(168,85,247,0.8)]
                      ${step === 0 ? 'left-[25%] right-[75%] opacity-0' : 
                        step === 1 ? 'left-[25%] right-[40%] opacity-100 animate-pulse' : 
                        step === 2 ? 'left-[25%] right-[10%] opacity-100' : 
                        'left-[80%] right-[10%] opacity-100 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}
                      style={{ top: '50%', transform: 'translateY(-50%)' }}>
                    </div>
                    {step === 1 || step === 2 ? (
                      <span className="absolute left-[50%] -top-1 text-[9px] font-bold text-purple-700 animate-pulse bg-purple-50 px-1 rounded">PCIe 异步传输 100B 权重中...</span>
                    ) : null}
                 </div>
               </div>

               {/* GPU 轨道 */}
               <div className="flex items-center w-full h-16 mt-4 relative">
                 <div className="w-20 shrink-0 flex flex-col items-center justify-center">
                   <MemoryStick className="text-blue-600" size={24}/>
                   <span className="text-[10px] font-bold text-blue-700 mt-1">GPU</span>
                 </div>
                 
                 <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-r-xl h-12 relative flex items-center px-4">
                    {/* Layer 1 计算条 */}
                    <div className={`absolute left-[5%] right-[40%] h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all duration-500
                      ${step === 1 || step === 2 ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-inner' : 'bg-white border-slate-200 text-slate-400'}`}>
                      {step === 1 || step === 2 ? (
                        <span className="flex items-center gap-2"><Cpu size={12} className="animate-spin-slow"/> 执行前置 Transformer Block 计算 (完美掩盖 PCIe 延迟)</span>
                      ) : '前置层计算'}
                    </div>

                    {/* Engram 融合接收 */}
                    <div className={`absolute right-[5%] w-[30%] h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all duration-500
                      ${step >= 3 ? 'bg-purple-500 border-purple-600 text-white shadow-md shadow-purple-500/40' : 'bg-white border-slate-200 text-slate-400'}`}>
                      {step >= 3 ? 'GPU: 接收 Memory 并执行融合' : '等待 Memory 数据'}
                    </div>
                 </div>
               </div>

               {/* 垂直对齐线 (表示汇合点) */}
               {step >= 3 && (
                 <div className="absolute right-[20%] top-[40%] bottom-[30%] w-0.5 border-r-2 border-dashed border-emerald-400 flex flex-col items-center justify-center z-0">
                    <ArrowDown className="text-emerald-500 bg-white rounded-full mt-4" size={16}/>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* 中层：微观模块内部架构与前向传播动态流 (附带数学公式) */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col relative">
           <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-3">
             <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800">
               <BrainCircuit className="text-purple-600" />
               Engram 模块微观执行流图 (带数学标识)
             </h3>
             <span className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full font-semibold border border-purple-200 shadow-sm">
               {getStepDesc()}
             </span>
           </div>

           <div className="flex-1 flex flex-col justify-end items-center relative pb-4">
             
             {/* ------ 步骤 4：融合层 ------ */}
             <div className={`w-[80%] flex flex-col items-center transition-all duration-700 relative ${step >= 4 ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-4'}`}>
                {/* 修复：放大融合公式并调整偏移量 */}
                <div className="absolute -top-10 right-0 bg-slate-800 text-white font-serif italic text-xs md:text-sm px-4 py-2 rounded shadow-md">
                  Y = SiLU(Conv1D(V&#771;)) + V&#771;
                </div>
                
                <div className="flex gap-4 items-center">
                  <div className="bg-blue-50 border-2 border-blue-300 px-4 py-2 rounded-xl shadow-sm flex flex-col items-center">
                    <span className="text-xs font-bold text-blue-700 mb-1">主干隐状态</span>
                    <span className="font-serif italic text-blue-900 text-sm">H<sup>(l)</sup></span>
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 bg-slate-50">+</div>
                  <div className={`border-2 px-4 py-2 rounded-xl shadow-sm transition-colors duration-500 flex flex-col items-center
                    ${step === 4 ? 'bg-purple-500 border-purple-600 text-white scale-110 shadow-purple-500/40' : 'bg-purple-50 border-purple-300 text-purple-700'}`}>
                    <span className="text-xs font-bold flex items-center gap-1.5 mb-1"><Activity size={14}/> Short Conv 1D</span>
                    <span className="font-serif italic text-[11px]">w=4, d=8</span>
                  </div>
                </div>
                <div className="h-8 w-0.5 bg-slate-300 relative">
                   <ArrowDown size={14} className="absolute -bottom-2 -left-[6px] text-slate-400"/>
                </div>
             </div>

             {/* ------ 步骤 3：上下文感知门控 (Context-Aware Gating) ------ */}
             <div className={`w-full max-w-4xl bg-slate-50 border border-slate-200 rounded-2xl p-5 transition-all duration-700 relative
                ${step >= 3 ? 'opacity-100 ring-2 ring-blue-100' : 'opacity-20'}`}>
                
                <div className="absolute -top-3 left-6 bg-white px-2 text-[11px] font-bold text-slate-600 border border-slate-200 rounded shadow-sm">
                  Context-aware Gating
                </div>

                <div className="flex justify-between items-center mt-2">
                  {/* 左侧：来自主干的动态查询 */}
                  <div className={`flex flex-col items-center w-1/3 transition-all ${step === 3 ? 'scale-105' : ''}`}>
                     <div className="bg-blue-100 border border-blue-300 px-4 py-2 rounded-lg shadow-inner mb-2 w-[80%] text-center">
                       <span className="text-xs font-bold text-blue-800 block mb-1">Dynamic Query</span>
                       <span className="font-serif italic text-sm text-blue-900">h<sub>t</sub></span>
                     </div>
                     <div className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm">RMSNorm(h<sub>t</sub>)</div>
                  </div>

                  {/* 中间：点积计算门控 */}
                  <div className="flex flex-col items-center w-1/3 px-4 relative">
                     {/* 修复：放大 Gating 公式并拉高位置 (-top-14) 防止遮挡 */}
                     <div className={`absolute -top-14 bg-white border border-rose-200 text-rose-700 font-serif italic text-xs md:text-sm px-4 py-2 rounded-lg shadow-md transition-opacity duration-500 whitespace-nowrap ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                        &alpha;<sub>t</sub> = &sigma;( h&#770;<sub>t</sub><sup>T</sup> k&#770;<sub>t</sub> / &radic;d )
                     </div>

                     <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-500 z-10 bg-white
                        ${step === 3 ? 'border-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.6)] scale-110' : 'border-slate-200'}`}>
                        <Combine size={20} className={step === 3 ? 'text-rose-500' : 'text-slate-400'}/>
                     </div>
                     
                     <div className={`h-10 w-0.5 transition-colors duration-500 relative ${step >= 3 ? 'bg-rose-400' : 'bg-slate-200'}`}></div>
                     {/* 修复：放大乘法符号和下方文字 */}
                     <div className={`flex items-center justify-center gap-1 font-bold transition-colors bg-white px-3 py-1.5 rounded-md border ${step >= 3 ? 'text-rose-600 border-rose-200 shadow-sm' : 'text-slate-400 border-slate-200'}`}>
                       <span className="text-xl leading-none">×</span>
                       <span className="text-xs md:text-sm font-serif italic ml-1">&alpha;<sub>t</sub> &isin; (0,1)</span>
                     </div>
                  </div>

                  {/* 右侧：来自静态记忆的键值 */}
                  <div className={`flex flex-col items-center w-1/3 transition-all ${step === 3 ? 'scale-105' : ''}`}>
                     <div className="bg-purple-100 border border-purple-300 px-4 py-2 rounded-lg shadow-inner mb-2 w-[80%] text-center">
                       <span className="text-xs md:text-sm font-bold text-purple-800 block mb-1">Static Memory</span>
                       <span className="font-serif italic text-sm md:text-base text-purple-900">e<sub>t</sub></span>
                     </div>
                     <div className="flex gap-3 w-[80%]">
                        <div className="flex-1 flex flex-col items-center">
                          {/* 修复：放大 kt, vt 的公式 */}
                          <span className="font-serif italic text-xs text-slate-500 mb-1">k<sub>t</sub> = W<sub>K</sub>e<sub>t</sub></span>
                          <div className="w-full bg-purple-500 text-white text-[10px] md:text-xs font-bold px-1 py-1.5 rounded shadow-sm text-center">Key Proj</div>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <span className="font-serif italic text-xs text-slate-500 mb-1">v<sub>t</sub> = W<sub>V</sub>e<sub>t</sub></span>
                          <div className="w-full bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-1 py-1.5 rounded shadow-sm text-center">Value Proj</div>
                        </div>
                     </div>
                  </div>
                </div>
                
                {/* Value 流向 Conv 的虚线 */}
                <svg className="absolute right-[16%] bottom-0 transform translate-y-full w-12 h-16 overflow-visible" style={{ zIndex: 0 }}>
                   <path d="M 20,0 Q 20,30 -100,30 T -230,60" fill="transparent" stroke={step >= 4 ? '#8b5cf6' : '#cbd5e1'} strokeWidth="2" strokeDasharray="4 2" />
                </svg>
             </div>

             <div className="h-8 w-0.5 bg-slate-200 relative z-0"></div>

             {/* ------ 步骤 2：静态查表与哈希 ------ */}
             <div className={`w-full max-w-4xl flex justify-between gap-6 transition-all duration-700 relative z-10
                ${step >= 2 ? 'opacity-100' : 'opacity-30 translate-y-4'}`}>
                
                {/* 修复：放大提取合并公式 */}
                <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm font-serif italic text-xs md:text-sm text-slate-700 transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                  e<sub>t</sub> &equiv; &oplus;<sub>n</sub> &oplus;<sub>k</sub> e<sub>t,n,k</sub>
                </div>

                {[
                  { title: "2-Gram", n: 2, color: "indigo" },
                  { title: "3-Gram", n: 3, color: "purple" },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center relative mt-2">
                     <div className={`text-xs md:text-sm font-bold mb-3 text-slate-600`}>{item.title} Channel</div>
                     
                     <div className={`w-full py-2 rounded border text-center transition-colors flex flex-col items-center justify-center
                        ${step === 2 ? `bg-${item.color}-50 border-${item.color}-300 shadow-inner` : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`text-xs md:text-sm font-bold ${step === 2 ? `text-${item.color}-700` : 'text-slate-400'}`}>Hash Heads (K=8)</span>
                        {/* 修复：放大内部计算哈希的公式 */}
                        <span className={`font-serif italic text-[11px] md:text-xs mt-1.5 ${step === 2 ? `text-${item.color}-600` : 'text-slate-400'}`}>z<sub>t,{item.n},k</sub> = &phi;<sub>{item.n},k</sub>(g<sub>t,{item.n}</sub>)</span>
                     </div>
                     
                     <ArrowDown size={14} className="text-slate-300 my-2"/>
                     
                     <div className={`w-full h-12 rounded border flex flex-col items-center justify-center relative overflow-hidden
                        ${step >= 2 ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                        {step >= 2 ? (
                          <div className="flex gap-[2px] w-full h-full p-1.5">
                             {Array.from({length: 8}).map((_, i) => (
                               <div key={i} className={`flex-1 bg-${item.color}-400 rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.5)]`}></div>
                             ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Embedding Table E<sub>{item.n},k</sub></span>
                        )}
                     </div>
                  </div>
                ))}
             </div>

             <div className="h-8 w-0.5 bg-slate-200 relative z-0"></div>

             {/* ------ 步骤 1：输入与 Tokenizer 压缩 ------ */}
             <div className={`w-full max-w-4xl bg-slate-50 border border-slate-200 rounded-xl p-5 transition-all duration-700 relative
                ${step >= 1 ? 'opacity-100' : 'opacity-40 translate-y-4'}`}>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs md:text-sm font-bold text-slate-700 flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/> Tokenizer Compression & N-Gram</span>
                  {/* 修复：放大 N-gram 获取公式 */}
                  {step >= 1 && <span className="font-serif italic text-xs md:text-sm text-slate-600 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">g<sub>t,n</sub> = (x'<sub>t-n+1</sub>, ..., x'<sub>t</sub>)</span>}
                </div>

                <div className="flex items-center justify-center gap-1.5 font-mono text-xs md:text-sm">
                   <span className={`px-2.5 py-1.5 rounded border transition-colors ${step >= 1 ? 'bg-white border-slate-300 text-slate-400' : 'bg-white border-slate-300 text-slate-700'}`}>Only</span>
                   
                   <div className={`flex items-center gap-1 p-1.5 rounded-lg border-2 transition-colors duration-500
                      ${step >= 1 ? 'border-purple-300 bg-purple-50 shadow-sm' : 'border-transparent'}`}>
                      <span className={`px-2.5 py-1.5 rounded border transition-colors ${step >= 1 ? 'bg-purple-500 border-purple-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`}>
                        {step >= 1 ? 'Alexander' : ' Alexander'}
                      </span>
                      <span className={`px-2.5 py-1.5 rounded border transition-colors ${step >= 1 ? 'bg-purple-500 border-purple-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`}>
                        {step >= 1 ? 'the' : ' the'}
                      </span>
                      <span className={`px-2.5 py-1.5 rounded border transition-colors ${step >= 1 ? 'bg-purple-500 border-purple-600 text-white relative' : 'bg-white border-slate-300 text-slate-700'}`}>
                        {step >= 1 ? 'Great' : ' Great'}
                        {step >= 1 && (
                          <span className="absolute -top-3 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                            t
                          </span>
                        )}
                      </span>
                   </div>
                   
                   <span className={`px-2.5 py-1.5 rounded border transition-colors ${step >= 1 ? 'bg-white border-slate-300 text-slate-400' : 'bg-white border-slate-300 text-slate-700'}`}>could</span>
                </div>
             </div>

           </div>
        </div>

        {/* 底部功能栏：Sparsity Allocation & Gating Case Study */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
           {/* 左下：稀疏容量分配定律 */}
           <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                 <h3 className="text-sm md:text-base font-bold flex items-center gap-2 text-slate-800">
                   <SlidersHorizontal className="text-amber-500" size={18}/>
                   Sparsity Allocation 定律 (参数分配)
                 </h3>
                 <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">Iso-FLOPs & Iso-Params</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                在同等计算量和参数量下，如何将“闲置的”稀疏参数分配给 <strong>MoE (神经计算)</strong> 和 <strong>Engram (静态记忆)</strong>？底层实验揭示了一个完美的 U 型缩放定律。
              </p>
              <div className="mb-8 px-4">
                 <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                    <span>偏重静态 (MoE 40%)</span>
                    <span className="text-blue-600">最佳甜点 (MoE ~75%)</span>
                    <span>纯计算 (MoE 100%)</span>
                 </div>
                 <input 
                   type="range" min="40" max="100" value={moeRatio} 
                   onChange={(e) => setMoeRatio(Number(e.target.value))}
                   className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
              </div>
              <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
                 <div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Validation Loss</div>
                   <div className="text-2xl font-mono font-bold text-slate-800">{currentLoss}</div>
                 </div>
                 <div className={`px-3 py-1.5 rounded text-[11px] font-bold text-white shadow-sm transition-colors duration-300
                    ${moeRatio === 100 ? 'bg-amber-500' : moeRatio < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    {moeRatio === 100 ? '次优：强迫模型计算重构知识' : moeRatio < 60 ? '次优：削弱了动态推理能力' : '最优：记忆与计算的完美解耦'}
                 </div>
              </div>
           </div>

           {/* 右下：门控可视化案例 */}
           <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                 <h3 className="text-sm md:text-base font-bold flex items-center gap-2 text-slate-800">
                   <BookOpen className="text-rose-500" size={18}/>
                   门控可视化 (Gating Case Study)
                 </h3>
                 <span className="text-[10px] font-mono bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded">Gate &alpha;<sub>t</sub></span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                热力图颜色越深，代表门控 $\alpha_t$ 的激活值越高。当模型遇到高度刻板、结构化的实体模式时，会直接从 Engram 表中检索，绕过繁重的深度推理。
              </p>
              <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                <div className="flex flex-wrap gap-[2px] font-mono text-[10px] md:text-xs">
                  <span className="px-2 py-1 bg-rose-200 text-rose-900 rounded-sm">Only</span>
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-sm">Alexander</span>
                  <span className="px-2 py-1 bg-rose-400 text-white rounded-sm font-bold shadow-sm">the</span>
                  <span className="px-2 py-1 bg-rose-500 text-white rounded-sm font-bold shadow-sm">Great</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">could</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">tame</span>
                  <span className="px-2 py-1 bg-rose-400 text-white rounded-sm font-bold shadow-sm">the</span>
                  <span className="px-2 py-1 bg-rose-200 text-rose-900 rounded-sm">horse</span>
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-sm">Buce</span>
                  <span className="px-2 py-1 bg-rose-500 text-white rounded-sm font-bold shadow-sm">phal</span>
                  <span className="px-2 py-1 bg-rose-400 text-white rounded-sm font-bold shadow-sm">us</span>
                </div>
                <div className="flex flex-wrap gap-[2px] font-mono text-[10px] md:text-xs">
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">东汉</span>
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-sm">末年</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">名</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">医</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">张</span>
                  <span className="px-2 py-1 bg-rose-300 text-rose-900 rounded-sm font-bold">仲</span>
                  <span className="px-2 py-1 bg-rose-500 text-white rounded-sm font-bold shadow-sm">景</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">，</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">因其</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">...</span>
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-sm">《</span>
                  <span className="px-2 py-1 bg-rose-300 text-rose-900 rounded-sm font-bold">伤寒</span>
                  <span className="px-2 py-1 bg-rose-200 text-rose-900 rounded-sm">杂</span>
                  <span className="px-2 py-1 bg-rose-500 text-white rounded-sm font-bold shadow-sm">病</span>
                  <span className="px-2 py-1 bg-rose-400 text-white rounded-sm font-bold shadow-sm">论</span>
                  <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-sm">》</span>
                </div>
              </div>
           </div>
        </div>

        {/* 底层原理：严谨的数学公式推导区 (Mathematical Principles) */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col mt-6">
           <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
             <Calculator className="text-emerald-600" size={24}/>
             <h2 className="text-lg md:text-xl font-bold text-slate-900">Engram 底层数学原理推导</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 阶段 1：检索与哈希 */}
              <div className="flex flex-col gap-3">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 1</span> 稀疏检索与哈希</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   首先对原始 Token ID 进行字典投影压缩，获取规范化的等价 ID。随后截取后缀 N-Gram 作为上下文，并通过多头乘法异或哈希（Multi-Head Hashing）定位静态内存槽位。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-serif italic text-[13px] text-slate-700 space-y-3 mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">g<sub>t,n</sub> = (x'<sub>t-n+1</sub>, ..., x'<sub>t</sub>)</span></div>
                    <div>2. <span className="text-slate-500 ml-1">z<sub>t,n,k</sub> &triangleq; &phi;<sub>n,k</sub>(g<sub>t,n</sub>)</span></div>
                    <div>3. <span className="text-slate-500 ml-1">e<sub>t,n,k</sub> = E<sub>n,k</sub>[z<sub>t,n,k</sub>]</span></div>
                    <div className="pt-2 border-t border-slate-200 text-purple-700 font-bold">
                       e<sub>t</sub> &equiv; &oplus;<sub>n=2</sub><sup>N</sup> &oplus;<sub>k=1</sub><sup>K</sup> e<sub>t,n,k</sub>
                    </div>
                 </div>
              </div>

              {/* 阶段 2：上下文感知门控 */}
              <div className="flex flex-col gap-3">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 2</span> 上下文感知门控</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   静态的检索向量 e<sub>t</sub> 缺乏对动态语境的适应性。因此，使用主干网络当前层的隐状态 h<sub>t</sub> 作为 Query，结合静态记忆的 Key 计算动态门控标量 &alpha;<sub>t</sub>。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-serif italic text-[13px] text-slate-700 space-y-3 mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">k<sub>t</sub> = W<sub>K</sub> e<sub>t</sub>, v<sub>t</sub> = W<sub>V</sub> e<sub>t</sub></span></div>
                    <div className="pt-2">2. <span className="text-rose-600 font-bold ml-1">&alpha;<sub>t</sub> = &sigma; <Big>(</Big> <sup className="text-slate-500">RMSNorm(h<sub>t</sub>)<sup>T</sup> RMSNorm(k<sub>t</sub>)</sup> / <sub className="text-slate-500">&radic;d</sub> <Big>)</Big></span></div>
                    <div className="pt-2 border-t border-slate-200 text-purple-700 font-bold">
                       v&#772;<sub>t</sub> = &alpha;<sub>t</sub> &middot; v<sub>t</sub>
                    </div>
                 </div>
              </div>

              {/* 阶段 3：残差融合 */}
              <div className="flex flex-col gap-3">
                 <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">Phase 3</span> 卷积增强与残差融合</h4>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                   为扩展感受野并增加非线性，对门控后的特征序列应用轻量级的深度可分离卷积（Depthwise Causal Conv1D），最后将特征加回主干网络的残差流中。
                 </p>
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-serif italic text-[13px] text-slate-700 space-y-3 mt-auto">
                    <div>1. <span className="text-slate-500 ml-1">V&#771; = [v&#772;<sub>1</sub>, ..., v&#772;<sub>T</sub>]</span></div>
                    <div className="pt-2">2. <span className="text-blue-700 font-bold ml-1">Y = SiLU(Conv1D(RMSNorm(V&#771;))) + V&#771;</span></div>
                    <div className="pt-2 border-t border-slate-200 text-slate-800 font-bold">
                       H<sup>(l)</sup> &larr; H<sup>(l)</sup> + Y
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

// 简单的自定义符号组件用于公式排版
const Big = ({ children }) => <span className="text-lg align-middle">{children}</span>;

export default App;
