import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, ArrowUp, SplitSquareHorizontal, Combine, Braces, Calculator, HardDrive, MemoryStick, Layers, FastForward, Info } from 'lucide-react';

const NUM_KV_BLOCKS = 6; // 6个KV分块
const NUM_SMS = 4;       // 4个物理SM计算单元

// 动态调度的批次定义
const SM_BATCHES = [
  [0, 1, 2, 3], // 批次 1: SM0->块0, SM1->块1, SM2->块2, SM3->块3
  [4, 5, null, null] // 批次 2: SM0->块4, SM1->块5, SM2->空闲, SM3->空闲
];

const App = () => {
  const [algorithm, setAlgorithm] = useState('optimized'); // 'simple' | 'optimized'
  const [step, setStep] = useState(0); 
  /* Steps:
   0: Idle (等待开始)
   1: Split & Broadcast (切分KV)
   2: Local Compute Batch 1 (处理块0~3)
   3: Local Compute Batch 2 (处理块4~5)
   4: Global Stats (SM 3 载入中间结果并归约 S_global / m_global)
   5: Rescale & Merge (SM 3 计算最终 O_final)
   6: Done (写回 HBM)
  */
  const [isPlaying, setIsPlaying] = useState(false);

  // 自动播放逻辑
  useEffect(() => {
    let timer;
    if (isPlaying && step < 6) {
      let delay = 2500;
      if (step === 2 || step === 3 || step === 5) delay = 3500; 
      timer = setTimeout(() => setStep(s => s + 1), delay);
    } else if (step >= 6) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step]);

  const togglePlay = () => {
    if (step >= 6) {
      setStep(0);
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => { setIsPlaying(false); setStep(0); };
  const handleAlgChange = (alg) => { if (alg !== algorithm) { setAlgorithm(alg); reset(); } };

  const getStepLabel = () => {
    switch(step) {
      case 0: return "开始 Flash Decoding";
      case 1: return "步骤 1: 矩阵切分 (Tiling)";
      case 2: return "步骤 2: 局部计算 (批次 1)";
      case 3: return "步骤 2: 局部计算 (批次 2)";
      case 4: return "步骤 3: 全局归约 (SRAM Sync)";
      case 5: return "步骤 4: 权重修正与合并";
      default: return "完成";
    }
  };

  // 渲染底层代码
  const renderPseudocode = () => {
    const isLocalCompute = step === 2 || step === 3; 

    if (algorithm === 'simple') {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_simple</span>(q, k, v, block_size):</div>
          
          <div className={`mt-2 ${step === 1 ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1"># [步骤 1] Seq 维度切块，准备并行</div>
            <div>  num_blocks = seq_len_kv // block_size</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1"># [步骤 2] Kernel 1: 局部注意力并行计算</div>
            <div>      k_b, v_b = k[i], v[i] <span className="text-slate-500"># 动态载入 SRAM</span></div>
            <div>      scores = (q @ k_b.T) / sqrt(d)</div>
            <div>      block_max[i] = max(scores)</div>
            <div>      exp_s = exp(scores - block_max[i])</div>
            <div>      block_sum_exp[i] = sum(exp_s)</div>
            <div>      block_out[i] = exp_s @ v_b <span className="text-slate-500"># 写回 Workspace</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1"># [步骤 3] Kernel 2 (归约): 求全局 Max</div>
            <div>  global_max = max(block_max)</div>
            <div>  total_sum_exp = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      total_sum_exp += block_sum_exp[i] * exp(block_max[i] - global_max)</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1"># [步骤 4] 修正各块权重并合并</div>
            <div>  final_out = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      weight = exp(block_max[i] - global_max)</div>
            <div>      final_out += block_out[i] * weight</div>
            <div>  final_out = final_out / total_sum_exp</div>
          </div>
          
          <div className={step === 6 ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> final_out <span className="text-slate-500"># 写回 HBM</span></div>
        </div>
      );
    } else {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_lse</span>(q, k, v, num_streams):</div>
          
          <div className={`mt-2 ${step === 1 ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1"># [步骤 1] 切块并分配并行流</div>
            <div>  streams = []</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_streams):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1"># [步骤 2] Kernel 1: 分块局部计算 LSE</div>
            <div>      scores = (q @ k[i].T) / sqrt(d)</div>
            <div>      m_i = max(scores)</div>
            <div>      l_i = sum(exp(scores - m_i))</div>
            <div>      O_i = (exp(scores - m_i) @ v[i]) / l_i </div>
            <div>      S_i = m_i + log(l_i) <span className="text-slate-500"># 关键：Log-Sum-Exp</span></div>
            <div>      streams.append((O_i, S_i)) <span className="text-slate-500"># 写入 HBM Workspace</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1"># [步骤 3] Kernel 2 (归约): 迭代求全局因子 S</div>
            <div>  S_global = streams[0].S</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(1, num_streams):</div>
            <div>      S_max = max(S_global, streams[i].S)</div>
            <div>      S_min = min(S_global, streams[i].S)</div>
            <div>      S_global = S_max + log1p(exp(S_min - S_max))</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1"># [步骤 4] 利用 S_global 合并各流</div>
            <div>  O_global = 0</div>
            <div>  <span className="text-emerald-400">for</span> O_i, S_i <span className="text-emerald-400">in</span> streams:</div>
            <div>      weight = exp(S_i - S_global) <span className="text-slate-500"># 权重对齐</span></div>
            <div>      O_global += O_i * weight</div>
          </div>
          
          <div className={step === 6 ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> O_global <span className="text-slate-500"># 写回结果</span></div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* 顶部控制栏 */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              Flash Decoding 核心原理解析
            </h1>
            <p className="text-slate-500 text-sm mt-1">打破长序列 Decoding 的显存墙：切分 KV Cache，多流并行计算，两步归约</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button onClick={() => handleAlgChange('simple')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${algorithm === 'simple' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlignLeft size={14} /> 基础分块 (Simple)
              </button>
              <button onClick={() => handleAlgChange('optimized')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${algorithm === 'optimized' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Calculator size={14} /> LSE 优化版 (Optimized)
              </button>
            </div>

            <button onClick={reset} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition" title="重置"><RotateCcw size={20} /></button>
            <button onClick={togglePlay} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition shadow-sm ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {isPlaying ? <><Pause size={18} /> 暂停</> : <><Play size={18} /> 播放</>}
            </button>
            <button onClick={() => { setIsPlaying(false); if(step<6) setStep(step+1); }} disabled={isPlaying || step === 6} className="flex items-center gap-2 px-4 py-2 w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm font-semibold">
              <SkipForward size={18} /> <span className="text-sm">{getStepLabel()}</span>
            </button>
          </div>
        </div>

        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 md:p-5 text-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-10px] p-4 text-indigo-200/40">
            <Database size={120} />
          </div>
          <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2 text-indigo-900">
            <HardDrive size={18} className="text-indigo-500"/> 核心挑战：打破 Memory Wall (显存墙)
          </h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed max-w-5xl space-y-1 relative z-10 text-slate-600">
            <li><strong>痛点</strong>：Decode 阶段 Query 长度仅为 1，却需搬运历史成千上万 Token 的 KV Cache，严重受限于主存带宽。</li>
            <li><strong>解法</strong>：切分 KV Cache 动态指派给多个 SM 计算单元进行并行计算，利用中间状态暂存与二次归约合并结果。</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col min-w-0 overflow-hidden relative">
             <div className="flex items-center justify-between shrink-0 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="text-indigo-500" size={20} /> 数据流与计算图
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200`}>
                Decoding Phase
              </span>
            </div>
            
            <div className="mb-2">
              <span className="text-[11px] md:text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md inline-block border border-slate-200">
                <strong>维度：</strong> 
                <code className="font-bold text-indigo-600 mx-1">N</code>=序列长 | 
                <code className="font-bold text-indigo-600 mx-1">b</code>=块大小 (N/6) | 
                <code className="font-bold text-indigo-600 mx-1">d</code>=头维度
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-x-auto pb-4 pt-2">
              
              <div className={`relative border-2 rounded-xl p-4 mt-2 transition-all duration-500
                ${(step === 1 || step === 3 || step >= 6) ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-slate-200 bg-slate-50/50'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 rounded">
                  <HardDrive size={14} className="text-indigo-500"/> GPU HBM (主显存)
                </div>

                <div className="flex flex-col items-center gap-3 mt-2 min-w-[540px]">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">Query</span>
                    <div className="px-4 py-1.5 bg-blue-100 border-2 border-blue-400 text-blue-800 font-mono text-xs font-bold rounded shadow-sm w-24 text-center">
                      <i>Q</i> <sub>[1, d]</sub>
                    </div>
                  </div>

                  {[ {l:'Key',k:'K'}, {l:'Value',k:'V'} ].map(row => (
                    <div key={row.k} className="flex items-center gap-3 w-full">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">{row.l}</span>
                      <div className={`flex w-full transition-all duration-700 ${step >= 1 ? 'gap-2' : 'gap-0'}`}>
                        {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                          const isBatch1 = step === 2 && i < 4;
                          const isBatch2 = step === 3 && i >= 4;
                          return (
                            <div key={i} className={`flex-1 flex items-center justify-center font-mono text-[9px] md:text-xs font-bold transition-all duration-700 h-8
                              ${step >= 1 ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 rounded' : 'bg-slate-200 border-y-2 border-slate-300 text-slate-500 first:rounded-l last:rounded-r first:border-l-2 last:border-r-2'}
                              ${(isBatch1 || isBatch2) ? 'ring-2 ring-amber-500 scale-105 z-10 shadow-md bg-amber-100 border-amber-400 text-amber-900' : ''}
                            `}>
                              {step >= 1 ? <><i>{row.k}</i><sub>{i}</sub> <span className="font-normal text-[8px] opacity-70 ml-0.5">[b,d]</span></> : (i === 2 ? <span><i>{row.k}</i> Cache <sub>[N, d]</sub></span> : '')}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className={`w-full mt-2 pt-3 border-t-2 border-dashed border-indigo-200 transition-all duration-500 ${(step >= 3) ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <Database size={12}/> HBM Workspace (中间态暂存)
                      </span>
                      {step >= 4 && step <= 5 && <span className="text-[10px] text-pink-600 font-bold animate-pulse">SM 3 正在回读数据并进行归约...</span>}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 w-full">
                      {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                        const isWritten = (step >= 3 && i < 4) || (step >= 4 && i >= 4);
                        return (
                          <div key={i} className={`flex-1 min-w-[60px] flex items-center justify-center py-1.5 text-[9px] font-mono rounded border transition-all duration-500
                            ${isWritten ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm scale-100' : 'bg-slate-100 border-slate-200 text-transparent scale-90'}`}>
                            {algorithm === 'simple' ? <span><i>O<sub>{i}</sub></i>, <i>m<sub>{i}</sub></i>, <i>l<sub>{i}</sub></i></span> : <span><i>O<sub>{i}</sub></i>, <i>S<sub>{i}</sub></i></span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {step === 6 && (
                    <div className="flex items-center gap-3 w-full mt-2 animate-fade-in border-t border-slate-200 pt-3">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">Output</span>
                      <div className="px-4 py-1.5 bg-emerald-500 border-2 border-emerald-600 text-white font-mono text-xs font-bold rounded shadow-md w-28 text-center">
                        <i>O</i> <sub>[1, d]</sub>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold ml-2">✓ 全局结果写回 HBM</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-center min-w-[540px] h-10 relative transition-all duration-500 ${(step >= 2 && step <= 6) ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {step === 2 && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>[Kernel 1] 调度批次 1 加载进 SRAM...</span>}
                    {step === 3 && <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>[Kernel 1] 批次 2 加载，同时写回批次 1 的暂存结果...<ArrowDown size={14}/></span>}
                    {(step === 4 || step === 5) && <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>[Kernel 2] 指派 SM 3 进行最终归约加载...</span>}
                    {step === 6 && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>最终合并结果写回 HBM</span>}
                 </div>
              </div>

              <div className={`relative border-2 rounded-xl p-3 md:p-4 mt-2 transition-all duration-500
                ${(step === 2 || step === 3) ? 'border-amber-400 bg-amber-50/30 ring-4 ring-amber-50' : 
                  (step === 4 || step === 5) ? 'border-pink-300 bg-pink-50/30 ring-4 ring-pink-50 shadow-inner' : 'border-blue-200 bg-blue-50/30'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-blue-500 border border-blue-200 rounded shadow-sm z-10">
                  <MemoryStick size={14}/> GPU 物理流处理器 (SMs)
                </div>

                {step === 4 && (
                  <div className="absolute inset-x-0 -top-8 flex justify-center">
                    <div className="bg-pink-600 text-white px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg animate-bounce">
                      <Combine size={12}/> Kernel 级同步屏障 (Barrier Sync) 已越过，开启归约。
                    </div>
                  </div>
                )}

                <div className={`grid gap-2 min-w-[540px] mt-4 transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`} 
                     style={{ gridTemplateColumns: `repeat(${NUM_SMS}, minmax(0, 1fr))` }}>
                  {Array.from({length: NUM_SMS}).map((_, smIdx) => {
                    const isReductionWorker = (smIdx === 3 && (step === 4 || step === 5));
                    
                    let currentBlock = null;
                    if (step === 2) currentBlock = SM_BATCHES[0][smIdx];
                    if (step === 3) currentBlock = SM_BATCHES[1][smIdx];

                    const isComputingLocal = (step === 2 || step === 3) && currentBlock !== null;
                    const isIdle = !isComputingLocal && !isReductionWorker;
                    const t = isComputingLocal ? currentBlock : 'i';
                    const activeColor = isComputingLocal ? 'text-amber-700 font-bold' : 'text-slate-500';

                    return (
                      <div key={smIdx} className={`flex flex-col items-center p-2 rounded border shadow-sm transition-all duration-500 relative
                        ${isComputingLocal ? 'bg-white border-amber-300 ring-2 ring-amber-100' : 
                          isReductionWorker ? 'bg-white border-pink-400 ring-4 ring-pink-100 scale-105 z-20' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        
                        <div className={`text-[10px] font-bold mb-1 border-b w-full text-center pb-1 ${isReductionWorker ? 'text-pink-700 border-pink-200' : 'text-slate-700 border-slate-200'}`}>
                          SM {smIdx} {isReductionWorker && "(归约节点)"}
                        </div>
                        
                        <div className="h-14 flex flex-col items-center justify-center mb-1 w-full transition-all duration-300">
                          {isComputingLocal ? (
                            <>
                              <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[8px] rounded border border-blue-200"><i>Q</i><sub>[1,d]</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><i>K</i><sub>{currentBlock}</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><i>V</i><sub>{currentBlock}</sub></span>
                              </div>
                              <ArrowDown size={12} className="text-amber-400 mt-1 animate-pulse"/>
                            </>
                          ) : isReductionWorker ? (
                            <>
                              <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[8px] rounded border border-indigo-300">Workspace 状态集</span>
                              </div>
                              <ArrowDown size={12} className="text-pink-400 mt-1 animate-pulse"/>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">{step > 3 ? '✓ 同步完成' : '空闲 / 待命'}</span>
                          )}
                        </div>

                        <div className={`p-1.5 md:p-2 rounded w-full text-left space-y-1.5 text-[8px] md:text-[9.5px] border transition-colors duration-500
                          ${isComputingLocal ? 'bg-amber-50/50 border-amber-100' : 
                            isReductionWorker ? 'bg-pink-50/50 border-pink-100' : 'bg-slate-50 border-slate-100'}`}>
                          
                          {isReductionWorker ? (
                            algorithm === 'simple' ? (
                              <div className="space-y-1.5">
                                <div className={step === 4 ? "text-pink-700 font-bold" : "text-slate-500"}><i>m<sub>g</sub></i> = max(<i>m<sub>0..5</sub></i>)</div>
                                <div className={step === 5 ? "text-pink-700 font-bold" : "text-slate-500"}><i>w<sub>i</sub></i> = e<sup><i>m<sub>i</sub>-m<sub>g</sub></i></sup></div>
                                <div className={step === 5 ? "text-pink-700 font-bold flex flex-col leading-none pt-1" : "text-slate-500 flex flex-col leading-none"}>
                                  <span><i>O<sub>final</sub></i> = &Sigma; <i>O<sub>i</sub>w<sub>i</sub></i> / &Sigma; <i>w<sub>i</sub></i></span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className={step === 4 ? "text-pink-700 font-bold" : "text-slate-500"}><i>S<sub>new</sub></i> = <i>S<sub>max</sub></i> + ln(1+e<sup>&Delta;<i>S</i></sup>)</div>
                                <div className={step === 5 ? "text-pink-700 font-bold" : "text-slate-500"}><i>w<sub>i</sub></i> = e<sup><i>S<sub>i</sub>-S<sub>g</sub></i></sup></div>
                                <div className={step === 5 ? "text-pink-700 font-bold" : "text-slate-500"}><i>O<sub>final</sub></i> = &Sigma; (<i>O<sub>i</sub>w<sub>i</sub></i>)</div>
                              </div>
                            )
                          ) : (
                            <div className="space-y-1">
                              <div className="text-slate-500 border-b border-slate-200 pb-1 mb-1 leading-tight italic">
                                <i>S<sub>{t}</sub></i> = (<i>Q K<sub>{t}</sub><sup>T</sup></i>) / &radic;<i>d</i>
                              </div>
                              {algorithm === 'simple' ? (
                                <>
                                  <div className={activeColor}><i>m<sub>{t}</sub></i> = max(<i>S<sub>{t}</sub></i>)</div>
                                  <div className={activeColor}><i>l<sub>{t}</sub></i> = &Sigma; e<sup><i>S<sub>{t}</sub> &minus; m<sub>{t}</sub></i></sup></div>
                                  <div className={activeColor}><i>O<sub>{t}</sub></i> = e<sup><i>S<sub>{t}</sub> &minus; m<sub>{t}</sub></i></sup> <i>V<sub>{t}</sub></i></div>
                                </>
                              ) : (
                                <>
                                  <div className={activeColor}><i>m<sub>{t}</sub></i>=max(S), <i>l<sub>{t}</sub></i>=&Sigma;e<sup>..</sup></div>
                                  <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                    <i>S<sub>new_{t}</sub></i> = <i>m<sub>{t}</sub></i> + ln(<i>l<sub>{t}</sub></i>)
                                  </div>
                                  <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                    {/* 修复 JSX 语法错误：修正花括号嵌套与标签闭合 */}
                                    <i>O<sub>{t}</sub></i> = (e<sup>..</sup> / <i>l<sub>{t}</sub></i>) <i>V<sub>{t}</sub></i>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
             <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
               <div className="flex items-center gap-2">
                 <Code className="text-emerald-400" size={20} /> 底层代码 (Python 伪代码)
               </div>
               <span className={`text-xs px-2 py-1 rounded border ${algorithm === 'optimized' ? 'bg-teal-900/50 text-teal-400 border-teal-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                 {algorithm === 'optimized' ? 'Optimized Tiling' : 'Simple Version'}
               </span>
            </h2>
            {renderPseudocode()}
          </div>
        </div>

        <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-4 opacity-5 rotate-12">
             <Cpu size={160} />
          </div>
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <Braces className="text-amber-400" size={24}/>
            核心数学原理与执行解析
          </h3>
          
          <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl min-h-[160px] relative z-10">
            {step === 0 && (
              <p className="opacity-90">等待开始。<br/><span className="text-indigo-300 text-sm italic flex items-center gap-2 mt-2"><Info size={14}/> 请点击顶部的“播放”按钮观察动态调度过程。</span></p>
            )}
            
            {step === 1 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs">步骤 1</span> 
                  <SplitSquareHorizontal size={18}/> 矩阵切块 (Tiling)
                </h4>
                <p className="opacity-90 text-indigo-50">KV Cache 在 HBM 中被逻辑切分为 <strong>{NUM_KV_BLOCKS} 个分块</strong>。由于 SM 只有 <strong>{NUM_SMS} 个</strong>，硬件将无法一次性处理所有数据。Flash Decoding 将启动异步加载流水线。</p>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">步骤 2.1</span> 
                  <Cpu size={18}/> 局部计算 (批次 1)
                </h4>
                <p className="opacity-90">四个 SM 同时认领了 Block 0~3。数据被载入 SM 各自的高速片上缓存 SRAM。此时计算处于<strong>高并发、互不干扰</strong>的局部阶段，并将计算出的中间态及时写回 HBM Workspace。</p>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">步骤 2.2</span> 
                  <Cpu size={18}/> 动态调度 (批次 2)
                </h4>
                <p className="opacity-90">流水线在流动：SM 0 和 SM 1 算完上一块后立即接手了 Block 4 和 5。而 SM 2 和 SM 3 暂时空闲进入待命状态。这是 Flash Decoding 处理<strong>无限长上下文</strong>的核心：分批次榨干算力。</p>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-pink-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded text-xs">步骤 3</span> 
                  <Combine size={18}/> Kernel 同步与状态归约
                </h4>
                <p className="opacity-90 mb-2"><strong>[重要转折点]</strong>：所有 SM 计算完毕并同步。此时启动第二个轻量级 Kernel，通常调度到某一个 SM (如 SM 3) 上执行。它通过 SRAM 载入 HBM Workspace 中的汇总数据，重新统一尺度。</p>
                <p className="opacity-90 italic text-indigo-200">
                  {algorithm === 'simple' ? "读取各块极大值 m_i，计算全局 m_global 以校准后续权重。" : "使用 LSE 稳定迭代公式，在对数空间内合并所有分母信息。"}
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">步骤 4</span> 
                  <Calculator size={18}/> 最终合并 (Merge)
                </h4>
                <p className="opacity-90">归约 SM 利用同步好的全局比例尺，对之前分散在 HBM 中的各块 $O_i$ 进行加权合并。这不仅修正了局部 Softmax 的误差，更在无需重新访问全量 KV 的情况下，完美输出了与传统 Attention 完全等价的结果。</p>
              </div>
            )}

            {step === 6 && (
              <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-800 rounded-full shrink-0 shadow-lg ring-2 ring-emerald-400"><Zap className="text-emerald-400" size={24} /></div>
                <div>
                  <h4 className="font-bold text-emerald-300 text-base md:text-lg">Flash Decoding 完成</h4>
                  <p className="opacity-90 mt-1 text-sm">最终结果已写回。通过“切分-局部计算-同步-全局归约”的四步走策略，我们成功把内存密集型的 Decoding 任务，转化为了计算与显存高效平衡的流水线。</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
