import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, ArrowUp, SplitSquareHorizontal, Combine, Braces, Calculator, HardDrive, MemoryStick, Layers, FastForward } from 'lucide-react';

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
   3: Local Compute Batch 2 (处理块4~5, 块0~3写回HBM)
   4: Global Stats (SM 3 归约 S_global / m_global)
   5: Rescale & Merge (SM 3 合并 O_final)
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
      case 4: return "步骤 3: 全局归约 (Sync)";
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
            <div className="text-amber-400 font-bold text-[10px] mb-1"># [步骤 2] HBM -{'>'} SRAM，多流并行局部计算</div>
            <div>      k_b, v_b = k[i], v[i] <span className="text-slate-500"># 动态载入 SRAM</span></div>
            <div>      scores = (q @ k_b.T) / sqrt(d)</div>
            <div>      block_max[i] = max(scores)</div>
            <div>      exp_s = exp(scores - block_max[i])</div>
            <div>      block_sum_exp[i] = sum(exp_s)</div>
            <div>      block_out[i] = exp_s @ v_b <span className="text-slate-500"># 写回 HBM Workspace</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1"># [步骤 3] Reduction Kernel (指定SM执行)</div>
            <div>  global_max = max(block_max)</div>
            <div>  total_sum_exp = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      total_sum_exp += block_sum_exp[i] * exp(block_max[i] - global_max)</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1"># [步骤 4] 修正各块权重，合并最终输出</div>
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
            <div className="text-amber-400 font-bold text-[10px] mb-1"># [步骤 2] HBM -{'>'} SRAM，多流并行局部计算</div>
            <div>      scores = (q @ k[i].T) / sqrt(d) <span className="text-slate-500"># 分批载入内存</span></div>
            <div>      m_i = max(scores)</div>
            <div>      l_i = sum(exp(scores - m_i))</div>
            <div>      O_i = (exp(scores - m_i) @ v[i]) / l_i <span className="text-slate-500"># 局部已归一化</span></div>
            <div>      S_i = m_i + log(l_i) <span className="text-slate-500"># 核心优化：LSE</span></div>
            <div>      streams.append((O_i, S_i)) <span className="text-slate-500"># 写入 HBM Workspace</span></div>
          </div>

          <div className={`mt-2 ${step === 4 ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1"># [步骤 3] Reduction Kernel (指定SM执行)</div>
            <div>  S_global = streams[0].S</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(1, num_streams):</div>
            <div>      S_max = max(S_global, streams[i].S)</div>
            <div>      S_min = min(S_global, streams[i].S)</div>
            <div>      S_global = S_max + log1p(exp(S_min - S_max))</div>
          </div>

          <div className={`mt-2 ${step === 5 ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1"># [步骤 4] 利用 S_global 修正各流并合并</div>
            <div>  O_global = 0</div>
            <div>  <span className="text-emerald-400">for</span> O_i, S_i <span className="text-emerald-400">in</span> streams:</div>
            <div>      weight = exp(S_i - S_global) <span className="text-slate-500"># 解码权重</span></div>
            <div>      O_global += O_i * weight</div>
          </div>
          
          <div className={step === 6 ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> O_global <span className="text-slate-500"># 写回 HBM 作为结果</span></div>
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
              {isPlaying ? <><Pause size={18} /> 暂停</> : <><Play size={18} /> {step === 6 ? '重播' : '自动播放'}</>}
            </button>
            <button onClick={() => { setIsPlaying(false); if(step<6) setStep(step+1); }} disabled={isPlaying || step === 6} className="flex items-center gap-2 px-4 py-2 w-48 justify-center rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 disabled:opacity-50 transition shadow-sm font-semibold">
              <SkipForward size={18} /> <span className="text-sm">{getStepLabel()}</span>
            </button>
          </div>
        </div>

        {/* --- 柔和背景介绍模块 --- */}
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 md:p-5 text-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-10px] p-4 text-indigo-200/40">
            <Database size={120} />
          </div>
          <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2 text-indigo-900">
            <HardDrive size={18} className="text-indigo-500"/> 核心挑战：打破 Memory Wall (显存墙)
          </h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed max-w-5xl space-y-1 relative z-10 text-slate-600">
            <li><strong>痛点</strong>：Decode 阶段 Query 长度仅为 1，却需搬运历史成千上万 Token 的 KV Cache (HBM -{'>'} SRAM)，算力闲置，严重受限于显存带宽。</li>
            <li><strong>解法</strong>：在序列 (Sequence) 维度切分 KV Cache，动态调度给多个 SM 物理单元多流并行，最后通过专门的 Kernel 归约合并结果。</li>
          </ul>
        </div>

        {/* 核心可视化区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* 左侧：数据流与模型架构图 */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col min-w-0 overflow-hidden">
             <div className="flex items-center justify-between shrink-0 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="text-indigo-500" size={20} /> 数据流与计算图
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200`}>
                Decoding Phase
              </span>
            </div>
            
            {/* 维度说明图例 */}
            <div className="mb-2">
              <span className="text-[11px] md:text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md inline-block border border-slate-200">
                <strong>维度说明：</strong> 
                <code className="font-bold text-indigo-600 mx-1">N</code> = 总序列长度 | 
                <code className="font-bold text-indigo-600 mx-1">b</code> = 块大小 (N/6) | 
                <code className="font-bold text-indigo-600 mx-1">d</code> = 注意力头维度
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-x-auto pb-4 pt-2">
              
              {/* === 区域 1: GPU HBM (主显存) === */}
              {/* 现在把 Workspace 合并到了 HBM 这个物理大框内部 */}
              <div className={`relative border-2 rounded-xl p-4 mt-2 transition-all duration-500
                ${(step === 1 || step === 3 || step >= 6) ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-slate-200 bg-slate-50/50'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 rounded">
                  <HardDrive size={14} className="text-indigo-500"/> GPU HBM (主显存)
                </div>
                {step === 1 && <div className="absolute top-2 right-4 text-xs font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded animate-pulse">[步骤 1] 切分 KV</div>}

                <div className="flex flex-col items-center gap-3 mt-2 min-w-[540px]">
                  {/* Q Matrix */}
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">Query</span>
                    <div className="px-4 py-1.5 bg-blue-100 border-2 border-blue-400 text-blue-800 font-mono text-xs font-bold rounded shadow-sm w-24 text-center">
                      <i>Q</i> <sub>[1, d]</sub>
                    </div>
                  </div>

                  {/* K Matrix (6个分块) */}
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">Key</span>
                    <div className={`flex w-full transition-all duration-700 ${step >= 1 ? 'gap-2' : 'gap-0'}`}>
                      {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                        const isLoaded = (step === 2 && i < 4) || (step === 3 && i >= 4);
                        return (
                          <div key={i} className={`flex-1 flex items-center justify-center font-mono text-[9px] md:text-xs font-bold transition-all duration-700 h-8
                            ${step >= 1 ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 rounded' : 'bg-slate-200 border-y-2 border-slate-300 text-slate-500 first:rounded-l last:rounded-r first:border-l-2 last:border-r-2'}
                            ${isLoaded ? 'ring-2 ring-amber-500 scale-105 z-10 shadow-md bg-amber-100 border-amber-400 text-amber-900' : ''}
                          `}>
                            {step >= 1 ? <><i>K</i><sub>{i}</sub> <span className="font-normal text-[8px] opacity-70 ml-0.5">[b,d]</span></> : (i === 2 ? <span><i>K</i> Cache <sub>[N, d]</sub></span> : '')}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* V Matrix (6个分块) */}
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">Value</span>
                    <div className={`flex w-full transition-all duration-700 ${step >= 1 ? 'gap-2' : 'gap-0'}`}>
                      {Array.from({length: NUM_KV_BLOCKS}).map((_, i) => {
                         const isLoaded = (step === 2 && i < 4) || (step === 3 && i >= 4);
                         return (
                          <div key={i} className={`flex-1 flex items-center justify-center font-mono text-[9px] md:text-xs font-bold transition-all duration-700 h-8
                            ${step >= 1 ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 rounded' : 'bg-slate-200 border-y-2 border-slate-300 text-slate-500 first:rounded-l last:rounded-r first:border-l-2 last:border-r-2'}
                            ${isLoaded ? 'ring-2 ring-amber-500 scale-105 z-10 shadow-md bg-amber-100 border-amber-400 text-amber-900' : ''}
                          `}>
                            {step >= 1 ? <><i>V</i><sub>{i}</sub> <span className="font-normal text-[8px] opacity-70 ml-0.5">[b,d]</span></> : (i === 2 ? <span><i>V</i> Cache <sub>[N, d]</sub></span> : '')}
                          </div>
                         )
                      })}
                    </div>
                  </div>

                  {/* HBM 内部的 Workspace 区域（逻辑上同属 HBM） */}
                  <div className={`w-full mt-2 pt-3 border-t-2 border-dashed border-indigo-200 transition-all duration-500 ${(step >= 3) ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <Database size={12}/> HBM Workspace (局部中间状态暂存区)
                      </span>
                      {step >= 4 && step <= 5 && <span className="text-[10px] text-pink-600 font-bold animate-pulse">SM 3 正在读取数据进行归约...</span>}
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

                  {/* Final Output */}
                  {step === 6 && (
                    <div className="flex items-center gap-3 w-full mt-2 animate-fade-in border-t border-slate-200 pt-3">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">Output</span>
                      <div className="px-4 py-1.5 bg-emerald-500 border-2 border-emerald-600 text-white font-mono text-xs font-bold rounded shadow-md w-28 text-center">
                        <i>O</i> <sub>[1, d]</sub>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold ml-2">✓ 归约结果写回完毕</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Transfer Arrows (HBM <-> SRAM) */}
              <div className={`flex justify-center min-w-[540px] h-10 relative transition-all duration-500 ${(step >= 2 && step <= 6) ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {step === 2 && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>调度 Block 0~3 载入 SMs SRAM...</span>}
                    {step === 3 && <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>0~3结果落盘，载入剩下的 Block 4~5...<ArrowDown size={14}/></span>}
                    {(step === 4 || step === 5) && <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>调度给 SM 3 执行归约合并...</span>}
                    {step === 6 && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>最终结果返回 HBM</span>}
                 </div>
              </div>

              {/* === 区域 2: SM SRAM (片上缓存) & Local Compute / Reduction === */}
              <div className={`relative border-2 rounded-xl p-3 md:p-4 mt-2 transition-all duration-500
                ${(step === 2 || step === 3) ? 'border-amber-400 bg-amber-50/30 ring-4 ring-amber-50' : 
                  (step === 4 || step === 5) ? 'border-pink-300 bg-pink-50/30 ring-4 ring-pink-50' : 'border-blue-200 bg-blue-50/30'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-blue-500 border border-blue-200 rounded shadow-sm">
                  <MemoryStick size={14}/> {NUM_SMS} 个物理 SM (流处理器)
                </div>

                <div className={`grid gap-2 min-w-[540px] mt-4 transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`} 
                     style={{ gridTemplateColumns: `repeat(${NUM_SMS}, minmax(0, 1fr))` }}>
                  {Array.from({length: NUM_SMS}).map((_, smIdx) => {
                    // 判断该 SM 在当前的步骤中担任什么角色
                    const isReductionWorker = (smIdx === 3 && (step === 4 || step === 5));
                    
                    let currentBlock = null;
                    if (step === 2) currentBlock = SM_BATCHES[0][smIdx];
                    if (step === 3) currentBlock = SM_BATCHES[1][smIdx];

                    const isComputingLocal = (step === 2 || step === 3) && currentBlock !== null;
                    const isIdle = !isComputingLocal && !isReductionWorker;

                    const t = isComputingLocal ? currentBlock : 'i';
                    const activeColor = isComputingLocal ? 'text-amber-700 font-bold' : 'text-slate-500';

                    // 如果是指定的 SM 3 执行 Reduction，改变渲染方式（跨列拉宽显示复杂公式）
                    if (isReductionWorker) {
                      return (
                        <div key={smIdx} className="col-span-full bg-white border-2 border-pink-400 ring-2 ring-pink-100 p-2 rounded shadow-lg flex flex-col md:flex-row items-stretch gap-4 transition-all duration-500">
                          <div className="flex flex-col items-center justify-center min-w-[100px] border-b md:border-b-0 md:border-r border-pink-200 pb-2 md:pb-0 md:pr-4">
                             <div className="text-[10px] text-pink-700 font-bold mb-1">SM {smIdx}</div>
                             <Layers size={24} className="text-pink-500 mb-1"/>
                             <div className="text-[9px] text-pink-600 font-bold text-center">执行 Reduction<br/>Kernel</div>
                          </div>
                          <div className="flex-1 w-full flex items-center justify-center">
                            {/* 将归约公式渲染在 SM 3 内部 */}
                            {algorithm === 'simple' ? (
                              <div className="w-full grid grid-cols-2 gap-4 text-xs text-center px-2">
                                <div className={`p-2 rounded-lg border flex flex-col justify-center ${step === 4 ? "border-pink-300 bg-pink-50 text-pink-900 font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500"}`}>
                                  <div className="text-[9px] text-pink-600 mb-1 uppercase tracking-wide">[步骤 3] 全局极大值</div>
                                  <div className="text-xs"><i>m<sub>global</sub></i> = max(<i>m<sub>i</sub></i>)</div>
                                </div>
                                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${step === 5 ? "border-purple-300 bg-purple-50 text-purple-900 font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500"}`}>
                                   <div className="text-[9px] text-purple-600 mb-1 uppercase tracking-wide">[步骤 4] 补偿权重与合并</div>
                                   <div className="text-[10px]"><i>w<sub>i</sub></i> = e<sup><i>m<sub>i</sub> &minus; m<sub>global</sub></i></sup></div>
                                   <div className="mt-1 flex items-center gap-1 text-xs">
                                     <i>O<sub>final</sub></i> = 
                                     <div className="inline-flex flex-col items-center leading-none text-[10px]">
                                       <span className="border-b border-current pb-0.5">&Sigma; <i>O<sub>i</sub> w<sub>i</sub></i></span>
                                       <span className="pt-0.5">&Sigma; <i>w<sub>i</sub></i></span>
                                     </div>
                                   </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full grid grid-cols-2 gap-4 text-xs text-center px-2">
                                <div className={`p-2 rounded-lg border flex flex-col justify-center ${step === 4 ? "border-pink-300 bg-pink-50 text-pink-900 font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500"}`}>
                                  <div className="text-[9px] text-pink-600 mb-1 uppercase tracking-wide">[步骤 3] 迭代求全局缩放因子 S</div>
                                  <div className="text-[10px]"><i>S<sub>new</sub></i> = <i>S<sub>max</sub></i> + ln(1 + e<sup><i>S<sub>min</sub> &minus; S<sub>max</sub></i></sup>)</div>
                                </div>
                                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${step === 5 ? "border-purple-300 bg-purple-50 text-purple-900 font-bold shadow-sm" : "border-slate-200 bg-white text-slate-500"}`}>
                                  <div className="text-[9px] text-purple-600 mb-1 uppercase tracking-wide">[步骤 4] 权重分配与加权和</div>
                                  <div className="text-[10px]"><i>w<sub>i</sub></i> = e<sup><i>S<sub>i</sub> &minus; S<sub>global</sub></i></sup></div>
                                  <div className="mt-1 text-xs"><i>O<sub>final</sub></i> = &Sigma; (<i>O<sub>i</sub> w<sub>i</sub></i>)</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // 正常的局部计算 SM 或空闲 SM 渲染
                    return (
                      <div key={smIdx} className={`flex flex-col items-center p-2 rounded border shadow-sm transition-all duration-500 relative
                        ${isComputingLocal ? 'bg-white border-amber-300 ring-2 ring-amber-100' : 'bg-white border-slate-200 opacity-60'}`}>
                        
                        <div className="text-[10px] text-slate-700 font-bold mb-1 border-b border-slate-200 w-full text-center pb-1">SM {smIdx}</div>
                        
                        {/* 动态显示加载的矩阵 或 空闲状态 */}
                        <div className="h-12 flex flex-col items-center justify-center mb-1 w-full transition-all duration-300">
                          {isComputingLocal ? (
                            <>
                              <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[8px] rounded"><i>Q</i><sub>[1,d]</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded"><i>K</i><sub>{currentBlock} [b,d]</sub></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded"><i>V</i><sub>{currentBlock} [b,d]</sub></span>
                              </div>
                              <ArrowDown size={12} className="text-amber-400 mt-1 animate-pulse"/>
                            </>
                          ) : isIdle ? (
                            <span className="text-[10px] text-slate-400 italic">空闲 / 待命</span>
                          ) : null}
                        </div>

                        {/* 局部数学公式展示区 */}
                        <div className={`p-1.5 md:p-2 rounded w-full text-left space-y-1.5 text-[8px] md:text-[9.5px] border transition-colors duration-500
                          ${isComputingLocal ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                          
                          <div className="text-slate-500 border-b border-slate-200 pb-1 mb-1 leading-tight">
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
                              <div className={isComputingLocal ? 'text-slate-700' : 'text-slate-500'}>
                                <i>m<sub>{t}</sub></i> = max(<i>S<sub>{t}</sub></i>), <i>l<sub>{t}</sub></i> = &Sigma; e<sup><i>S<sub>{t}</sub> &minus; m<sub>{t}</sub></i></sup>
                              </div>
                              <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                <i>S<sub>new_{t}</sub></i> = <i>m<sub>{t}</sub></i> + ln(<i>l<sub>{t}</sub></i>)
                              </div>
                              <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}>
                                <i>O<sub>{t}</sub></i> = (e<sup><i>S<sub>{t}</sub> &minus; m<sub>{t}</sub></i></sup> / <i>l<sub>{t}</sub></i>) <i>V<sub>{t}</sub></i>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 右侧：代码与原理解析 */}
          <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
             <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
               <div className="flex items-center gap-2">
                 <Code className="text-emerald-400" size={20} /> 底层代码 (Python 伪代码)
               </div>
               <span className={`text-xs px-2 py-1 rounded border ${algorithm === 'optimized' ? 'bg-teal-900/50 text-teal-400 border-teal-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                 {algorithm === 'optimized' ? 'Optimized Tiling' : 'Simple Version'}
               </span>
            </h2>
            
            {/* 动态伪代码 */}
            {renderPseudocode()}

          </div>
        </div>

        {/* 底层：状态面板与数学推导讲解 */}
        <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <Braces className="text-amber-400" size={24}/>
            核心数学原理与执行解析
          </h3>
          
          <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl min-h-[160px]">
            {step === 0 && (
              <p className="opacity-90">等待开始。<br/><span className="text-indigo-300 text-sm">观察上方的数据流图：待处理的 Query 只有一个 Token，而 KV Cache 包含历史大量 Token。接下来我们将演示如何将它们切分为 {NUM_KV_BLOCKS} 块并动态分配给 {NUM_SMS} 个物理 SM 处理。</span></p>
            )}
            
            {step === 1 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs">步骤 1</span> 
                  <SplitSquareHorizontal size={18}/> 矩阵切块 (Tiling)
                </h4>
                <p className="opacity-90">长序列的 KV Cache 在 HBM 中被逻辑切分为多个块 <i>K<sub>i</sub></i>, <i>V<sub>i</sub></i>。在图示中切分出了 <strong>{NUM_KV_BLOCKS} 块</strong>，由于 SM 只有 <strong>{NUM_SMS} 个</strong>，所以 GPU 调度器会分批次指派任务，充分榨干并发算力。</p>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">步骤 2 (批次 1)</span> 
                  <Cpu size={18}/> 载入 SRAM 进行局部 Attention 计算
                </h4>
                {algorithm === 'simple' ? (
                  <p className="opacity-90">SM 池首先认领前 4 个分块 (Block 0~3) 并行计算。每个块独立计算并保存 3 个变量：局部最大分数 <i>m<sub>i</sub></i>、局部指数和 <i>l<sub>i</sub></i> 及未归一化的矩阵 <i>O<sub>i</sub></i>，随后落盘写回 HBM 中部的 Workspace 暂存区。</p>
                ) : (
                  <p className="opacity-90">SM 池首先认领前 4 个分块 (Block 0~3) 进行计算。优化版的最大亮点是局部输出<strong>已归一化</strong>的 <i>O<sub>i</sub></i>，并将 <i>m<sub>i</sub></i> 和 <i>l<sub>i</sub></i> 完美融合成标量缩放因子：<span className="font-bold text-amber-300"><i>S<sub>i</sub></i> = <i>m<sub>i</sub></i> + ln(<i>l<sub>i</sub></i>)</span>，这使写入 HBM Workspace 的带宽开销大幅降低！</p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">步骤 2 (批次 2)</span> 
                  <Cpu size={18}/> 动态调度剩余计算与暂存 HBM
                </h4>
                <p className="opacity-90">第一批任务结束后，部分空闲下来的 SM 继续认领剩下的 Block 4 和 5。算完后的局部状态持续追加进 HBM Workspace。这种流水线调度确保了无论序列多长，都能将其均匀打散给所有的算力单元。</p>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-pink-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded text-xs">步骤 3</span> 
                  <Combine size={18}/> 启动 Reduction Kernel: 状态同步
                </h4>
                <p className="opacity-90 mb-2">局部计算全部结束后，系统调度启动第二个专用的 CUDA Kernel。由于只需读取微小的局部状态，<strong>该 Kernel 仅指派给一个空闲的流处理器 (如图中 SM 3) 执行即可。</strong></p>
                {algorithm === 'simple' ? (
                  <p className="opacity-90">因为 Softmax 的分母必须基于“全局最大值”，SM 3 的第一步是将 Workspace 中所有的 <i>m<sub>i</sub></i> 汇总，求出真正的全局最大值 <span className="font-bold text-pink-300"><i>m<sub>global</sub></i></span>。</p>
                ) : (
                  <p className="opacity-90">利用极其优雅的数值稳定迭代公式求解全局缩放因子 S：合并两路状态时，<span className="font-bold text-pink-300"><i>S<sub>new</sub></i> = <i>S<sub>max</sub></i> + ln(1 + e<sup><i>S<sub>min</sub> &minus; S<sub>max</sub></i></sup>)</span>。这在对数空间内安全地完成了全局分母累加，彻底规避了精度下溢风险。</p>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">步骤 4</span> 
                  <Calculator size={18}/> 修正权重与合并 (Rescale & Merge)
                </h4>
                {algorithm === 'simple' ? (
                  <p className="opacity-90">在这个归约 Kernel 内部，利用刚求出的 <i>m<sub>global</sub></i>，重新计算各块的补偿权重：<i>w<sub>i</sub></i> = e<sup><i>m<sub>i</sub> &minus; m<sub>global</sub></i></sup>。将未归一化的 <i>O<sub>i</sub></i> 乘上该权重累加后，除以总分母，无损拼接出最终结果。</p>
                ) : (
                  <p className="opacity-90">一旦获得全局的 <i>S<sub>global</sub></i>，局部块 <i>O<sub>i</sub></i> 对全局的真实权重即为：<span className="font-bold text-purple-300"><i>w<sub>i</sub></i> = e<sup><i>S<sub>i</sub> &minus; S<sub>global</sub></i></sup></span>。对所有 <i>O<sub>i</sub></i> 进行加权求和瞬间合并完毕，完美契合 GPU Tree-Reduce 指令！</p>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-800 rounded-full shrink-0"><Zap className="text-emerald-400" size={24} /></div>
                <div>
                  <h4 className="font-bold text-emerald-300 text-base md:text-lg">Flash Decoding 完成</h4>
                  <p className="opacity-90 mt-1 text-sm">最终结果 <i>O<sub>final</sub></i> 从 SM 3 写回 GPU HBM。长文本推理的瓶颈被彻底突破，完成了从“单线程苦等内存”到“多物理流分批局部并行 + 单核高频归约”的极致榨干性能策略。</p>
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
