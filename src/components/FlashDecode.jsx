import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, ArrowUp, SplitSquareHorizontal, Combine, Braces, Calculator, HardDrive, MemoryStick, Info, Globe } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { NUM_WORK_UNITS, deriveFlashDecodeSnapshot } from './flash-decode/model';

const i18n = {
  zh: {
    title: 'Flash Decoding 原理可视化',
    subtitle: '打破长序列 Decoding 的显存墙：逻辑切分 KV Cache，增加并行工作量，再做精确归约',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    replay: '重播',
    next: '下一步',
    langToggle: 'EN',
    challenge: '核心挑战：打破 Memory Wall (显存墙)',
    algSimple: '累加器工作区',
    algOptimized: 'O + LSE 工作区',
    executionLabel: '执行',
    executionUnsplit: 'Unsplit',
    executionSplit: 'Split-K',
    kvLayoutLabel: 'KV 布局',
    kvContiguous: '连续',
    kvPaged: 'Paged',
    headModeLabel: '注意力头',
    splitSettingLabel: 'Split 数',
    splitAuto: 'Auto',
    autoHeuristic: 'Auto 为教学启发式：目标约 2K tokens/split，真实后端会按形状与硬件选择。',
    splitControlsDisabled: 'Unsplit 不产生局部工作区，工作区表示与 Split 数暂不生效。',
    splitSolution: '沿 KV 序列建立逻辑 Split，由多个 CTA 并行计算局部 Attention，再通过独立归约 Kernel 精确合并。',
    unsplitSolution: 'Unsplit 由一个代表性 CTA 直接扫描完整 KV，并在同一 kernel 内完成在线 Softmax；它是对照基线，不产生局部工作区和跨 Split 归约。',
    queryHeadsMetric: 'Q/KV 头',
    headReuseMetric: '每 KV 头复用',
    effectiveSplitsMetric: '有效 Split',
    splitSizeMetric: '每 Split tokens',
    fullRangeMetric: '完整 KV tokens',
    ctaBatchesMetric: 'CTA 批次',
    workspaceMetric: 'Workspace 条目',
    kvReadMetric: 'KV 读取元素',
    blockTable: 'KV 寻址',
    contiguousAddress: '连续基址 + token 偏移',
    pagedAddress: 'Block Table：逻辑页 → 物理页',
    queryLabel: 'Query',
    keyLabel: 'Key',
    valueLabel: 'Value',
    resolveKvPath: '解析 KV 地址与 Q→KV 头映射',
    directAttention: '单个代表性 CTA 扫描完整 KV',
    directKernel: 'Unsplit 融合 Attention Kernel',
    directNoWorkspace: '无局部 Workspace / 无归约 Kernel',
    unsplitStep1Name: '解析 KV 与头映射',
    unsplitStep1Desc: '运行时先根据连续地址或 Block Table 解析 KV；GQA/MQA 仅改变多个 Q heads 如何复用较少的 KV heads，不改变序列是否 Split。',
    unsplitStep2Name: '完整 KV 在线 Softmax',
    unsplitStep2Desc: '代表性 CTA 在同一个融合 kernel 内遍历完整 KV，并维护在线 Softmax 状态。这里没有每个 Split 的局部结果，也不需要第二个归约 kernel。',
    unsplitDoneDesc: 'Unsplit 输出已直接写回 HBM。它保留最短执行路径，但在 batch 较小、上下文很长时可暴露的序列并行度较少。',
    pyResolvePaged: '# 通过 Block Table 解析非连续 KV 页',
    pyResolveContiguous: '# 连续 KV：基址 + token 偏移',
    pyHeadMap: '# Q head 映射到共享 KV head',
    pyDirectStep: '# 单个融合 kernel 扫描完整 KV 并在线归一化',
    painPoint: '痛点',
    solution: '解法',
    challengeDesc1: 'Decode 阶段 Query 长度仅为 1，却需搬运历史成千上万 Token 的 KV Cache，严重受限于主存带宽。',
    challengeDesc2: '把 KV Cache 建成多个逻辑 Split，由多个 CTA/线程块并行计算局部 Attention，再通过独立归约 Kernel 精确合并。',
    dataFlow: '数据流与计算图',
    dimensions: '维度：',
    seqLen: '序列长',
    blockSize: '块大小',
    headDim: '头维度',
    hbmTitle: 'GPU HBM (主显存)',
    hbmWorkspace: 'HBM Workspace (中间态暂存)',
    sm3Reducing: '独立归约 Kernel 正在回读 Workspace...',
    globalResultWriteback: '✓ 全局结果写回 HBM',
    kernel1Batch1: '[Kernel 1] 调度批次 1 加载进 SRAM...',
    kernel1Batch2: '[Kernel 1] 批次 2 加载，同时写回批次 1 的暂存结果...',
    kernel2Assign: '[Kernel 2] 独立归约工作单元读取所有局部结果...',
    finalWriteback: '最终合并结果写回 HBM',
    gpuSms: 'Kernel 1 代表性 CTA 工作单元',
    barrierSync: 'Kernel 级同步屏障 (Barrier Sync) 已越过，开启归约。',
    reduction: '(归约)',
    reductionKernel: '独立归约 Kernel',
    reductionDone: '归约与合并完成',
    standbyDone: '✓ 待命 (局部计算完成)',
    idle: '空闲 / 待命',
    pythonCode: '底层代码 (Python 伪代码)',
    py1Step1: '# [步骤 1] Seq 维度切块，准备并行',
    py1Step2: '# [步骤 2] Kernel 1: 局部注意力并行计算',
    py1DynamicLoad: '# 动态载入 SRAM',
    py1WriteWorkspace: '# 写回 Workspace',
    py1Step3: '# [步骤 3] Kernel 2 (归约): 求全局 Max',
    py1Step4: '# [步骤 4] 修正各块权重并合并',
    py1Return: '# 写回 HBM',
    py2Step1: '# [步骤 1] 建立逻辑 Split 并分配 CTA 工作',
    py2Step2: '# [步骤 2] Kernel 1: 分块局部计算 LSE',
    py2LseKey: '# 关键：Log-Sum-Exp',
    py2WriteHbm: '# 写入 HBM Workspace',
    py2Step3: '# [步骤 3] Kernel 2 (归约): 迭代求全局 LSE',
    py2Step4: '# [步骤 4] 利用 L_global 合并各 Split',
    py2WeightAlign: '# 权重对齐',
    py2Return: '# 写回结果',
    mathPrinciple: '核心数学原理与执行解析',
    waitStart: '等待开始。',
    clickPlay: '请点击顶部的“播放”按钮观察动态调度过程。',
    step1Title: '步骤 1',
    step1Name: '矩阵切块 (Tiling)',
    step1Desc: 'KV Cache 在 HBM 中建立 6 个代表性逻辑 Split；这一步创建视图与元数据，不复制 KV。页面用 4 个 CTA 工作位演示分批调度，真实数量由后端与形状决定。',
    step21Title: '步骤 2.1',
    step21Name: '局部计算 (批次 1)',
    step21Desc: '四个代表性 CTA 同时处理 Split 0~3，读取共享 Query 与各自的 KV 视图，并把局部输出和 Softmax 统计量写入 HBM Workspace。CTA 到物理 SM 的映射由运行时调度。',
    step22Title: '步骤 2.2',
    step22Name: '动态调度 (批次 2)',
    step22Desc: '第二批代表性 CTA 处理 Split 4 和 5，其余工作位待命。这里演示的是逻辑工作分配，不表示 Split 固定绑定某个 SM，也不意味着上下文长度没有实现上限。',
    step3Title: '步骤 3',
    step3Name: 'Kernel 同步与状态归约',
    step3Desc1: '[重要转折点]：Kernel 1 的所有 CTA 完成后，运行时跨过 Kernel 边界并启动独立归约 Kernel。它读取 HBM Workspace 中的局部结果并统一 Softmax 尺度，但不绑定固定物理 SM。',
    step3Desc2Simple: '读取各块极大值 m_i，计算全局 m_global 以校准后续权重。',
    step3Desc2Opt: '使用 LSE 稳定迭代公式，在对数空间内合并所有分母信息。',
    step4Title: '步骤 4',
    step4Name: '最终合并 (Merge)',
    step4Desc: '独立归约 Kernel 利用统一后的全局比例尺，对 HBM Workspace 中的局部结果进行加权合并；无需重新读取全量 KV，即可在数学上恢复完整 Attention（实际数值仍受浮点舍入影响）。',
    doneTitle: 'Flash Decoding 完成',
    doneDesc: '最终结果已写回。通过“切分-局部计算-同步-全局归约”的四步走策略，我们成功把内存密集型的 Decoding 任务，转化为了计算与显存高效平衡的流水线。'
  },
  en: {
    title: 'Flash Decoding Visualization',
    subtitle: 'Break the decoding memory wall: create logical KV splits, expose parallel work, then reduce exactly',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    next: 'Next',
    langToggle: '中文',
    challenge: 'Core Challenge: Break the Memory Wall',
    algSimple: 'Accumulator Workspace',
    algOptimized: 'O + LSE Workspace',
    executionLabel: 'Execution',
    executionUnsplit: 'Unsplit',
    executionSplit: 'Split-K',
    kvLayoutLabel: 'KV Layout',
    kvContiguous: 'Contiguous',
    kvPaged: 'Paged',
    headModeLabel: 'Head Mode',
    splitSettingLabel: 'Splits',
    splitAuto: 'Auto',
    autoHeuristic: 'Auto is a teaching heuristic targeting about 2K tokens per split; real backends dispatch by shape and hardware.',
    splitControlsDisabled: 'Unsplit creates no local workspace, so workspace representation and split count are inactive.',
    splitSolution: 'Create logical splits along the KV sequence, process local Attention with multiple CTAs, then merge exactly in an independent reduction kernel.',
    unsplitSolution: 'Unsplit uses one representative CTA to scan the full KV range and maintain online Softmax in one kernel. It is the baseline and creates no per-split workspace or reduction.',
    queryHeadsMetric: 'Q/KV heads',
    headReuseMetric: 'Q per KV head',
    effectiveSplitsMetric: 'Effective splits',
    splitSizeMetric: 'Tokens per split',
    fullRangeMetric: 'Full-KV tokens',
    ctaBatchesMetric: 'CTA batches',
    workspaceMetric: 'Workspace entries',
    kvReadMetric: 'KV elements read',
    blockTable: 'KV addressing',
    contiguousAddress: 'Contiguous base + token offset',
    pagedAddress: 'Block Table: logical page → physical page',
    queryLabel: 'Query',
    keyLabel: 'Key',
    valueLabel: 'Value',
    resolveKvPath: 'Resolve KV addresses and Q→KV head mapping',
    directAttention: 'One representative CTA scans the full KV range',
    directKernel: 'Unsplit Fused Attention Kernel',
    directNoWorkspace: 'No local workspace / no reduction kernel',
    unsplitStep1Name: 'Resolve KV and Head Mapping',
    unsplitStep1Desc: 'The runtime resolves KV through contiguous addresses or a block table first. GQA/MQA only changes how query heads share fewer KV heads; it is independent of sequence splitting.',
    unsplitStep2Name: 'Full-KV Online Softmax',
    unsplitStep2Desc: 'A representative CTA traverses the full KV range and maintains online Softmax state in one fused kernel. There are no per-split partials and no second reduction kernel.',
    unsplitDoneDesc: 'The Unsplit output is written directly to HBM. It keeps the shortest execution path, but exposes less sequence parallelism for small-batch, long-context decoding.',
    pyResolvePaged: '# Resolve non-contiguous KV pages through the block table',
    pyResolveContiguous: '# Contiguous KV: base address + token offset',
    pyHeadMap: '# Map a Q head to its shared KV head',
    pyDirectStep: '# One fused kernel scans full KV with online normalization',
    painPoint: 'Pain Point',
    solution: 'Solution',
    challengeDesc1: 'In the Decode phase, Query length is only 1, but it needs to load thousands of historical KV Cache tokens, severely bottlenecked by memory bandwidth.',
    challengeDesc2: 'Create logical KV splits, process local Attention with multiple CTAs/threadblocks, then merge exactly in an independent reduction kernel.',
    dataFlow: 'Data Flow & Computation Graph',
    dimensions: 'Dimensions: ',
    seqLen: 'Seq Length',
    blockSize: 'Block Size',
    headDim: 'Head Dim',
    hbmTitle: 'GPU HBM (Main Memory)',
    hbmWorkspace: 'HBM Workspace (Intermediate Storage)',
    sm3Reducing: 'The independent reduction kernel is reading the workspace...',
    globalResultWriteback: '✓ Global result written back to HBM',
    kernel1Batch1: '[Kernel 1] Dispatch Batch 1 into SRAM...',
    kernel1Batch2: '[Kernel 1] Load Batch 2, write back Batch 1 intermediate results...',
    kernel2Assign: '[Kernel 2] Independent reduction work unit reads all local results...',
    finalWriteback: 'Final merged result written back to HBM',
    gpuSms: 'Representative Kernel 1 CTA Work Units',
    barrierSync: 'Kernel-level Barrier Sync passed, starting reduction.',
    reduction: '(Reduction)',
    reductionKernel: 'Independent Reduction Kernel',
    reductionDone: 'Reduction & Merge Done',
    standbyDone: '✓ Standby (Local Compute Done)',
    idle: 'Idle / Standby',
    pythonCode: 'Underlying Code (Python Pseudocode)',
    py1Step1: '# [Step 1] Split along Seq dim, prepare for parallel',
    py1Step2: '# [Step 2] Kernel 1: Parallel local attention compute',
    py1DynamicLoad: '# Dynamically load to SRAM',
    py1WriteWorkspace: '# Write back to Workspace',
    py1Step3: '# [Step 3] Kernel 2 (Reduction): Find global Max',
    py1Step4: '# [Step 4] Rescale block weights and merge',
    py1Return: '# Write back to HBM',
    py2Step1: '# [Step 1] Create logical splits and assign CTA work',
    py2Step2: '# [Step 2] Kernel 1: Block local compute LSE',
    py2LseKey: '# Key: Log-Sum-Exp',
    py2WriteHbm: '# Write to HBM Workspace',
    py2Step3: '# [Step 3] Kernel 2 (Reduction): Iteratively merge global LSE',
    py2Step4: '# [Step 4] Merge splits using L_global',
    py2WeightAlign: '# Weight alignment',
    py2Return: '# Write back result',
    mathPrinciple: 'Core Mathematical Principles & Execution Analysis',
    waitStart: 'Waiting to start.',
    clickPlay: 'Please click the "Play" button at the top to observe the dynamic scheduling process.',
    step1Title: 'Step 1',
    step1Name: 'Matrix Tiling',
    step1Desc: 'The KV cache exposes six representative logical split views in HBM; no KV copy occurs. Four CTA slots illustrate batched scheduling, while real counts depend on the backend and shape.',
    step21Title: 'Step 2.1',
    step21Name: 'Local Compute (Batch 1)',
    step21Desc: 'Four representative CTAs process Splits 0~3, read the shared Query and their KV views, and write local outputs plus Softmax statistics to the HBM workspace. Runtime scheduling maps CTAs to physical SMs.',
    step22Title: 'Step 2.2',
    step22Name: 'Dynamic Scheduling (Batch 2)',
    step22Desc: 'The second representative batch processes Splits 4 and 5 while the remaining work slots wait. This is logical work assignment, not fixed SM binding or a claim of unbounded context length.',
    step3Title: 'Step 3',
    step3Name: 'Kernel Sync & State Reduction',
    step3Desc1: '[Critical Point]: After every Kernel 1 CTA completes, the runtime crosses a kernel boundary and launches an independent reduction kernel. It reads the HBM workspace to unify Softmax scales without binding to a fixed physical SM.',
    step3Desc2Simple: 'Read block maximums m_i, compute global m_global to calibrate subsequent weights.',
    step3Desc2Opt: 'Use stable LSE iteration formula to merge all denominator info in log space.',
    step4Title: 'Step 4',
    step4Name: 'Final Merge',
    step4Desc: 'The independent reduction kernel merges the local HBM-workspace results on a unified global scale. It recovers full Attention mathematically without rereading all KV, subject to ordinary floating-point rounding.',
    doneTitle: 'Flash Decoding Done',
    doneDesc: 'Final result written back. Through the 4-step "Split - Local Compute - Sync - Global Reduce" strategy, we successfully transformed a memory-intensive Decoding task into a highly balanced pipeline of compute and memory.'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const App = () => {
  const [algorithm, setAlgorithm] = useState('optimized'); // 'simple' | 'optimized'
  const [execution, setExecution] = useState('split');
  const [kvLayout, setKvLayout] = useState('contiguous');
  const [headMode, setHeadMode] = useState('gqa');
  const [splitSetting, setSplitSetting] = useState('auto');
  const [step, setStep] = useState(0); 
  /* Steps:
   0: Idle (等待开始)
   1: Split & Broadcast (切分KV)
   2: Local Compute Batch 1 (处理块0~3)
   3: Local Compute Batch 2 (处理块4~5)
   4: Global Stats (独立归约 Kernel 读取 Workspace)
   5: Rescale & Merge (独立归约 Kernel 计算最终 O_final)
   6: Done (写回 HBM)
  */
  const [phase, setPhase] = useState('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;
  const snapshot = useMemo(() => deriveFlashDecodeSnapshot({
    algorithm,
    execution,
    kvLayout,
    headMode,
    splitSetting,
    step,
  }), [algorithm, execution, kvLayout, headMode, splitSetting, step]);

  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setStep(0);
  };

  const handleNextStep = () => {
    if (phase === 'done') return;
    const nextStep = Math.min(step + 1, snapshot.maxStep);
    setStep(nextStep);
    setPhase(nextStep === snapshot.maxStep ? 'done' : 'running');
    if (nextStep === snapshot.maxStep) setIsPlaying(false);
  };

  // 自动播放逻辑
  useEffect(() => {
    let timer;
    if (isPlaying && step < snapshot.maxStep) {
      let delay = 2500;
      if (step === 2 || step === 3 || step === 5) delay = 3500; 
      timer = setTimeout(handleNextStep, delay);
    } else if (step >= snapshot.maxStep) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step, phase, snapshot.maxStep]);

  const togglePlay = () => {
    if (step >= snapshot.maxStep) {
      setStep(0);
      setPhase('running');
      setIsPlaying(true);
    } else {
      if (phase === 'idle') setPhase('running');
      setIsPlaying(!isPlaying);
    }
  };

  const handleAlgChange = (alg) => { if (alg !== algorithm) { setAlgorithm(alg); reset(); } };
  const updateTechnicalControl = (setter, value) => {
    setter(value);
    reset();
  };

  // 渲染底层代码
  const renderPseudocode = () => {
    const isLocalCompute = snapshot.localActive;

    if (!snapshot.isSplit) {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">decode_attention_unsplit</span>(q, kv_cache, q_head, block_table=None):</div>
          <div className={`mt-3 ${snapshot.operation === 'resolveKv' ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div>  kv_head = q_head // q_per_kv_head <span className="text-slate-500">{t('pyHeadMap')}</span></div>
            <div>  kv = resolve_kv(kv_cache, block_table) <span className="text-slate-500">{t(kvLayout === 'paged' ? 'pyResolvePaged' : 'pyResolveContiguous')}</span></div>
          </div>
          <div className={`mt-3 ${snapshot.operation === 'fusedAttention' ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1">{t('pyDirectStep')}</div>
            <div>  O, L = fused_online_attention(q[q_head], kv.K[kv_head], kv.V[kv_head])</div>
          </div>
          <div className={snapshot.outputReady ? "text-emerald-400 font-bold mt-3" : "mt-3"}>  <span className="text-emerald-400">return</span> O <span className="text-slate-500">{t('py1Return')}</span></div>
        </div>
      );
    }

    if (algorithm === 'simple') {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_simple</span>(q, k, v, block_size):</div>
          <div className={`mt-2 ${snapshot.operation === 'splitViews' ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div>  kv_head = q_head // q_per_kv_head <span className="text-slate-500">{t('pyHeadMap')}</span></div>
            <div>  k, v = resolve_kv(k, v, block_table) <span className="text-slate-500">{t(kvLayout === 'paged' ? 'pyResolvePaged' : 'pyResolveContiguous')}</span></div>
          </div>
          
          <div className={`mt-2 ${snapshot.operation === 'splitViews' ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1">{t('py1Step1')}</div>
            <div>  num_blocks = seq_len_kv // block_size</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1">{t('py1Step2')}</div>
            <div>      k_b, v_b = k[i], v[i] <span className="text-slate-500">{t('py1DynamicLoad')}</span></div>
            <div>      scores = (q @ k_b.T) / sqrt(d)</div>
            <div>      block_max[i] = max(scores)</div>
            <div>      exp_s = exp(scores - block_max[i])</div>
            <div>      block_sum_exp[i] = sum(exp_s)</div>
            <div>      block_out[i] = exp_s @ v_b <span className="text-slate-500">{t('py1WriteWorkspace')}</span></div>
          </div>

          <div className={`mt-2 ${snapshot.operation === 'reduceStats' ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1">{t('py1Step3')}</div>
            <div>  global_max = max(block_max)</div>
            <div>  total_sum_exp = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      total_sum_exp += block_sum_exp[i] * exp(block_max[i] - global_max)</div>
          </div>

          <div className={`mt-2 ${snapshot.operation === 'mergeOutput' ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1">{t('py1Step4')}</div>
            <div>  final_out = 0</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_blocks):</div>
            <div>      weight = exp(block_max[i] - global_max)</div>
            <div>      final_out += block_out[i] * weight</div>
            <div>  final_out = final_out / total_sum_exp</div>
          </div>
          
          <div className={snapshot.outputReady ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> final_out <span className="text-slate-500">{t('py1Return')}</span></div>
        </div>
      );
    } else {
      return (
        <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed whitespace-pre text-slate-400 block">
          <div><span className="text-emerald-400">def</span> <span className="text-blue-400">flash_decoding_lse</span>(q, k, v, num_splits):</div>
          <div className={`mt-2 ${snapshot.operation === 'splitViews' ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div>  kv_head = q_head // q_per_kv_head <span className="text-slate-500">{t('pyHeadMap')}</span></div>
            <div>  k, v = resolve_kv(k, v, block_table) <span className="text-slate-500">{t(kvLayout === 'paged' ? 'pyResolvePaged' : 'pyResolveContiguous')}</span></div>
          </div>
          
          <div className={`mt-2 ${snapshot.operation === 'splitViews' ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400" : ""}`}>
            <div className="text-indigo-400 font-bold text-[10px] mb-1">{t('py2Step1')}</div>
            <div>  partials = []</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(num_splits):</div>
          </div>
          
          <div className={`mt-2 ${isLocalCompute ? "bg-amber-900/40 text-amber-200 px-2 py-1 -mx-2 rounded border-l-2 border-amber-400" : ""}`}>
            <div className="text-amber-400 font-bold text-[10px] mb-1">{t('py2Step2')}</div>
            <div>      scores = (q @ k[i].T) / sqrt(d)</div>
            <div>      m_i = max(scores)</div>
            <div>      l_i = sum(exp(scores - m_i))</div>
            <div>      O_i = (exp(scores - m_i) @ v[i]) / l_i </div>
            <div>      L_i = m_i + log(l_i) <span className="text-slate-500">{t('py2LseKey')}</span></div>
            <div>      partials.append((O_i, L_i)) <span className="text-slate-500">{t('py2WriteHbm')}</span></div>
          </div>

          <div className={`mt-2 ${snapshot.operation === 'reduceStats' ? "bg-pink-900/40 text-pink-200 px-2 py-1 -mx-2 rounded border-l-2 border-pink-400" : ""}`}>
            <div className="text-pink-400 font-bold text-[10px] mb-1">{t('py2Step3')}</div>
            <div>  L_global = partials[0].L</div>
            <div>  <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(1, num_splits):</div>
            <div>      L_max = max(L_global, partials[i].L)</div>
            <div>      L_min = min(L_global, partials[i].L)</div>
            <div>      L_global = L_max + log1p(exp(L_min - L_max))</div>
          </div>

          <div className={`mt-2 ${snapshot.operation === 'mergeOutput' ? "bg-purple-900/50 text-purple-200 px-2 py-1 -mx-2 rounded border-l-2 border-purple-400" : ""}`}>
            <div className="text-purple-400 font-bold text-[10px] mb-1">{t('py2Step4')}</div>
            <div>  O_global = 0</div>
            <div>  <span className="text-emerald-400">for</span> O_i, L_i <span className="text-emerald-400">in</span> partials:</div>
            <div>      weight = exp(L_i - L_global) <span className="text-slate-500">{t('py2WeightAlign')}</span></div>
            <div>      O_global += O_i * weight</div>
          </div>
          
          <div className={snapshot.outputReady ? "text-emerald-400 font-bold mt-2" : "mt-2"}>  <span className="text-emerald-400">return</span> O_global <span className="text-slate-500">{t('py2Return')}</span></div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
      
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* 顶部控制栏 */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button disabled={!snapshot.isSplit} title={!snapshot.isSplit ? t('splitControlsDisabled') : undefined} onClick={() => handleAlgChange('simple')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-45 ${algorithm === 'simple' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlignLeft size={14} /> {t('algSimple')}
              </button>
              <button disabled={!snapshot.isSplit} title={!snapshot.isSplit ? t('splitControlsDisabled') : undefined} onClick={() => handleAlgChange('optimized')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-45 ${algorithm === 'optimized' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Calculator size={14} /> {t('algOptimized')}
              </button>
            </div>

            <button onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="px-2 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1" title="Language"><Globe size={16} /> {t('langToggle')}</button>
            <button type="button" onClick={reset} aria-label={t('reset')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200" title={t('reset')}><RotateCcw size={18} /></button>
            <button type="button" onClick={togglePlay} aria-label={isPlaying ? t('pause') : snapshot.outputReady ? t('replay') : t('play')} title={isPlaying ? t('pause') : snapshot.outputReady ? t('replay') : t('play')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition hover:bg-blue-700">
               {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
             <button type="button" onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || snapshot.outputReady} aria-label={t('next')} title={t('next')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="w-full border-t border-slate-100 pt-3 flex flex-wrap items-center gap-2 text-[11px]" data-testid="flashdecode-technical-controls">
            <span className="font-bold text-slate-500 mr-0.5">{t('executionLabel')}</span>
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {['unsplit', 'split'].map((value) => (
                <button key={value} data-testid={`execution-${value}`} onClick={() => updateTechnicalControl(setExecution, value)} className={`rounded px-2.5 py-1 font-semibold transition ${execution === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t(value === 'split' ? 'executionSplit' : 'executionUnsplit')}
                </button>
              ))}
            </div>

            <span className="font-bold text-slate-500 ml-1">{t('kvLayoutLabel')}</span>
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {['contiguous', 'paged'].map((value) => (
                <button key={value} data-testid={`kv-layout-${value}`} onClick={() => updateTechnicalControl(setKvLayout, value)} className={`rounded px-2.5 py-1 font-semibold transition ${kvLayout === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t(value === 'paged' ? 'kvPaged' : 'kvContiguous')}
                </button>
              ))}
            </div>

            <span className="font-bold text-slate-500 ml-1">{t('headModeLabel')}</span>
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {['mha', 'gqa', 'mqa'].map((value) => (
                <button key={value} data-testid={`head-mode-${value}`} onClick={() => updateTechnicalControl(setHeadMode, value)} className={`rounded px-2.5 py-1 font-semibold uppercase transition ${headMode === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {value}
                </button>
              ))}
            </div>

            <label className={`ml-1 flex items-center gap-1.5 font-bold text-slate-500 ${!snapshot.isSplit ? 'opacity-45' : ''}`}>
              {t('splitSettingLabel')}
              <select data-testid="split-setting" aria-label={t('splitSettingLabel')} disabled={!snapshot.isSplit} value={splitSetting} onChange={(event) => updateTechnicalControl(setSplitSetting, event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed">
                {['auto', '2', '4', '6', '8'].map((value) => <option key={value} value={value}>{value === 'auto' ? t('splitAuto') : value}</option>)}
              </select>
            </label>
            {splitSetting === 'auto' && snapshot.isSplit && <span className="text-[10px] text-slate-400">{t('autoHeuristic')}</span>}
          </div>
        </div>

        <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 md:p-5 text-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-10px] p-4 text-indigo-200/40">
            <Database size={120} />
          </div>
          <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2 text-indigo-900">
            <HardDrive size={18} className="text-indigo-500"/> {t('challenge')}
          </h2>
          <ul className="list-disc pl-5 text-sm leading-relaxed max-w-5xl space-y-1 relative z-10 text-slate-600">
            <li><strong>{t('painPoint')}</strong>：{t('challengeDesc1')}</li>
            <li><strong>{t('solution')}</strong>：{t(snapshot.isSplit ? 'splitSolution' : 'unsplitSolution')}</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col min-w-0 overflow-hidden relative xl:col-span-7">
             <div className="flex items-center justify-between shrink-0 mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="text-indigo-500" size={20} /> {t('dataFlow')}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200`}>
                Decoding Phase
              </span>
            </div>
            
            <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] md:text-[11px]" data-testid="flashdecode-derived-metrics">
              <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-slate-600">
                <strong>{t('dimensions')}</strong><MathFormula>{String.raw`N=${snapshot.sequenceLength},\ d=${snapshot.headDim}`}</MathFormula>
              </span>
              <span className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
                <strong>{t('queryHeadsMetric')}</strong><MathFormula>{String.raw`H_q=${snapshot.queryHeads},\ H_{kv}=${snapshot.kvHeads}`}</MathFormula>
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800"><strong>{t('headReuseMetric')}：</strong>{snapshot.queryHeadsPerKvHead}</span>
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-800"><strong>{t('effectiveSplitsMetric')}：</strong>{snapshot.effectiveSplitCount}</span>
              <span className="flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-indigo-700">
                <strong>{t(snapshot.isSplit ? 'splitSizeMetric' : 'fullRangeMetric')}：</strong>
                {snapshot.isSplit ? <MathFormula>{String.raw`b=${snapshot.splitSize}`}</MathFormula> : snapshot.splitSize}
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800"><strong>{t('ctaBatchesMetric')}：</strong>{snapshot.ctaBatches}</span>
              <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-purple-800"><strong>{t('workspaceMetric')}：</strong>{snapshot.metrics.workspaceEntries}</span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600"><strong>{t('kvReadMetric')}：</strong>{(snapshot.metrics.kvElementsRead / 1_000_000).toFixed(1)}M</span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-x-auto pb-4 pt-2">
              
              <div className={`relative border-2 rounded-xl p-4 mt-2 transition-all duration-500
                ${['splitViews', 'resolveKv', 'localBatch2', 'writeOutput'].includes(snapshot.operation) ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-slate-200 bg-slate-50/50'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-slate-600 border border-slate-200 rounded">
                  <HardDrive size={14} className="text-indigo-500"/> {t('hbmTitle')}
                </div>

                <div className="flex flex-col items-center gap-3 mt-2 min-w-[480px]">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs font-bold text-slate-600 w-10 text-right">{t('queryLabel')}</span>
                    <div className="px-3 py-1.5 bg-blue-100 border-2 border-blue-400 text-blue-800 text-[10px] md:text-xs font-bold rounded shadow-sm min-w-28 text-center">
                      <MathFormula>{String.raw`Q\,[1,H_q,d]`}</MathFormula>
                    </div>
                    <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${snapshot.queryHeads}, minmax(0, 1fr))` }} aria-label={`${t('headModeLabel')}: ${headMode.toUpperCase()}`}>
                      {snapshot.headMapping.map(({ queryHead, kvHead }) => {
                        const tones = ['bg-indigo-100 border-indigo-300 text-indigo-800', 'bg-emerald-100 border-emerald-300 text-emerald-800', 'bg-amber-100 border-amber-300 text-amber-800', 'bg-purple-100 border-purple-300 text-purple-800'];
                        return (
                          <div key={queryHead} className={`rounded border px-0.5 py-0.5 text-center text-[7px] md:text-[8px] font-bold leading-none ${tones[kvHead % tones.length]}`}>
                            <MathFormula>{String.raw`Q_{${queryHead}}`}</MathFormula>
                            <div className="mt-0.5 border-t border-current/20 pt-0.5 opacity-80"><MathFormula>{String.raw`KV_{${kvHead}}`}</MathFormula></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {[ {l:t('keyLabel'),k:'K'}, {l:t('valueLabel'),k:'V'} ].map(row => (
                    <div key={row.k} className="flex items-center gap-3 w-full">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">{row.l}</span>
                      <div className={`flex w-full transition-all duration-700 ${snapshot.splitVisible ? 'gap-2' : 'gap-0'}`}>
                        {Array.from({length: snapshot.splitVisible ? snapshot.effectiveSplitCount : 1}).map((_, i) => {
                          const isActiveSplit = snapshot.assignments.includes(i);
                          return (
                            <div key={i} className={`flex-1 flex items-center justify-center font-mono text-[9px] md:text-xs font-bold transition-all duration-700 h-8 whitespace-nowrap
                              ${snapshot.splitVisible ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-800 rounded' : 'bg-slate-200 border-y-2 border-slate-300 text-slate-500 first:rounded-l last:rounded-r first:border-l-2 last:border-r-2'}
                              ${isActiveSplit ? 'ring-2 ring-amber-500 scale-105 z-10 shadow-md bg-amber-100 border-amber-400 text-amber-900' : ''}
                            `}>
                              {snapshot.splitVisible
                                ? <MathFormula>{String.raw`${row.k}_{${i}}\,[b,H_{kv},d]`}</MathFormula>
                                : <MathFormula>{String.raw`${row.k}\ \mathrm{Cache}\,[N,H_{kv},d]`}</MathFormula>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className={`w-full rounded-lg border px-2.5 py-2 ${kvLayout === 'paged' ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-white'}`} data-testid="kv-addressing">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px] font-bold text-slate-600">
                      <span className="flex items-center gap-1"><Database size={11}/>{t('blockTable')}</span>
                      <span className={kvLayout === 'paged' ? 'text-indigo-700' : 'text-slate-500'}>{t(kvLayout === 'paged' ? 'pagedAddress' : 'contiguousAddress')}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {snapshot.logicalPages.map(({ logicalPage, physicalPage }) => (
                        <div key={logicalPage} className={`rounded border px-1 py-1 text-center text-[8px] font-bold ${kvLayout === 'paged' ? 'border-indigo-300 bg-white text-indigo-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                          <MathFormula>{String.raw`L_{${logicalPage}}\to P_{${physicalPage}}`}</MathFormula>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`w-full transition-all duration-700 overflow-hidden ${snapshot.workspaceVisible ? 'max-h-40 opacity-100 mt-2 pt-3 border-t-2 border-dashed border-indigo-200' : 'max-h-0 opacity-0 mt-0 pt-0 border-none'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <Database size={12}/> {t('hbmWorkspace')}
                      </span>
                      {snapshot.reductionActive && <span className="text-[10px] text-amber-600 font-bold animate-pulse">{t('sm3Reducing')}</span>}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 w-full pb-1">
                      {Array.from({length: snapshot.effectiveSplitCount}).map((_, i) => {
                        const isWritten = i < snapshot.writtenBlockCount;
                        return (
                          <div key={i} className={`flex-1 min-w-[60px] flex items-center justify-center py-1.5 text-[9px] font-mono rounded border transition-all duration-500 whitespace-nowrap
                            ${!isWritten ? 'bg-slate-100 border-slate-200 text-transparent scale-90' : 
                              snapshot.reductionActive ? 'bg-indigo-100 border-amber-500 text-indigo-800 shadow-md ring-2 ring-amber-400 animate-pulse z-10' :
                              'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm'
                            }`}>
                            <MathFormula>{algorithm === 'simple' ? String.raw`\widetilde O_{${i}},m_{${i}},\ell_{${i}}` : String.raw`O_{${i}},L_{${i}}`}</MathFormula>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {snapshot.outputReady && (
                    <div className="flex items-center gap-3 w-full mt-2 animate-fade-in border-t border-slate-200 pt-3">
                      <span className="text-xs font-bold text-slate-600 w-10 text-right">Output</span>
                      <div className="px-4 py-1.5 bg-emerald-500 border-2 border-emerald-600 text-white font-mono text-xs font-bold rounded shadow-md w-28 text-center">
                        <MathFormula>{String.raw`O\,[1,d]`}</MathFormula>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold ml-2">{t('globalResultWriteback')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-center min-w-[480px] h-10 relative transition-all duration-500 ${(step >= 1 && step <= snapshot.maxStep) ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="absolute inset-0 flex flex-col items-center justify-center whitespace-nowrap">
                    {snapshot.operation === 'localBatch1' && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('kernel1Batch1')}</span>}
                    {snapshot.operation === 'localBatch2' && <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>{t('kernel1Batch2')}<ArrowDown size={14}/></span>}
                    {snapshot.reductionActive && <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('kernel2Assign')}</span>}
                    {snapshot.operation === 'resolveKv' && <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('resolveKvPath')}</span>}
                    {snapshot.operation === 'fusedAttention' && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mb-1"><ArrowDown size={14}/>{t('directAttention')}</span>}
                    {snapshot.outputReady && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mb-1"><ArrowUp size={14}/>{t('finalWriteback')}</span>}
                 </div>
              </div>

              <div className={`relative border-2 rounded-xl p-3 md:p-4 mt-2 transition-all duration-500
                ${snapshot.localActive ? 'border-amber-400 bg-amber-50/30 ring-4 ring-amber-50' :
                  snapshot.reductionActive ? 'border-pink-300 bg-pink-50/30 ring-4 ring-pink-50 shadow-inner' : 'border-blue-200 bg-blue-50/30'}
              `}>
                <div className="absolute -top-3 left-4 bg-white px-2 flex items-center gap-1 text-xs font-bold text-blue-500 border border-blue-200 rounded shadow-sm z-10">
                  <MemoryStick size={14}/> {t(snapshot.isSplit ? 'gpuSms' : 'directKernel')}
                </div>

                {snapshot.operation === 'reduceStats' && (
                  <div className="absolute inset-x-0 -top-8 flex justify-center">
                    <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg animate-bounce whitespace-nowrap">
                      <Combine size={12}/> {t('barrierSync')}
                    </div>
                  </div>
                )}

                <div className={`grid gap-2 min-w-[480px] mt-4 transition-all duration-700 ${snapshot.operation !== 'idle' && !['splitViews', 'resolveKv'].includes(snapshot.operation) ? 'opacity-100' : 'opacity-30'}`}
                     style={{ gridTemplateColumns: `repeat(${NUM_WORK_UNITS}, minmax(0, 1fr))` }}>
                  {Array.from({length: NUM_WORK_UNITS}).map((_, workIdx) => {
                    const workItem = snapshot.workItems[workIdx];
                    const isComputingLocal = Boolean(workItem);
                    const blockId = workItem?.fullSequence ? String.raw`\mathrm{full}` : (workItem?.splitIndex ?? 'i');
                    const formulaTone = isComputingLocal ? 'text-amber-700 font-bold' : 'text-slate-500';

                    return (
                      <div key={workIdx} className={`flex flex-col items-center p-2 rounded border shadow-sm transition-all duration-500 relative ${isComputingLocal ? 'bg-white border-amber-300 ring-2 ring-amber-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                        <div className="text-[10px] font-bold mb-1 border-b w-full text-center pb-1 whitespace-nowrap text-slate-700 border-slate-200">CTA {workIdx}</div>
                        <div className="h-14 flex flex-col items-center justify-center mb-1 w-full transition-all duration-300">
                          {isComputingLocal ? (
                            <>
                              <div className="flex flex-wrap gap-1 justify-center animate-fade-in">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[8px] rounded border border-blue-200"><MathFormula>{String.raw`Q\,[1,d]`}</MathFormula></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><MathFormula>{workItem.fullSequence ? String.raw`K_{0:N}` : String.raw`K_{${workItem.splitIndex}}`}</MathFormula></span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] rounded border border-emerald-200"><MathFormula>{workItem.fullSequence ? String.raw`V_{0:N}` : String.raw`V_{${workItem.splitIndex}}`}</MathFormula></span>
                              </div>
                              <ArrowDown size={12} className="text-amber-400 mt-1 animate-pulse"/>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic text-center leading-tight">{snapshot.reductionActive || snapshot.outputReady ? t('standbyDone') : t('idle')}</span>
                          )}
                        </div>

                        <div className={`p-1.5 md:p-2 rounded w-full text-left space-y-1 text-[8px] md:text-[9px] border transition-colors duration-500 flex flex-col justify-center ${isComputingLocal ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="text-slate-500 border-b border-slate-200 pb-1 mb-1"><MathFormula>{String.raw`A_{${blockId}}=QK_{${blockId}}^{\top}/\sqrt d`}</MathFormula></div>
                          {!snapshot.isSplit ? (
                            <div className={formulaTone}><MathFormula>{String.raw`O=\operatorname{softmax}(A)V`}</MathFormula></div>
                          ) : algorithm === 'simple' ? (
                            <>
                              <div className={formulaTone}><MathFormula>{String.raw`m_{${blockId}}=\max(A_{${blockId}})`}</MathFormula></div>
                              <div className={formulaTone}><MathFormula>{String.raw`\ell_{${blockId}}=\sum_j e^{A_{${blockId},j}-m_{${blockId}}}`}</MathFormula></div>
                              <div className={formulaTone}><MathFormula>{String.raw`\widetilde O_{${blockId}}=\sum_j e^{A_{${blockId},j}-m_{${blockId}}}V_j`}</MathFormula></div>
                            </>
                          ) : (
                            <>
                              <div className={formulaTone}><MathFormula>{String.raw`m_{${blockId}}=\max(A),\quad \ell_{${blockId}}=\sum e^{A-m}`}</MathFormula></div>
                              <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}><MathFormula>{String.raw`L_{${blockId}}=m_{${blockId}}+\log\ell_{${blockId}}`}</MathFormula></div>
                              <div className={isComputingLocal ? 'text-amber-700 font-bold bg-amber-100/50 rounded px-1' : 'text-slate-500'}><MathFormula>{String.raw`O_{${blockId}}=\widetilde O_{${blockId}}/\ell_{${blockId}}`}</MathFormula></div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!snapshot.isSplit && (
                  <div className="mt-3 min-w-[480px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[10px] font-bold text-slate-600" data-testid="unsplit-no-workspace">
                    {t('directNoWorkspace')}
                  </div>
                )}

                {snapshot.isSplit && ['reduceStats', 'mergeOutput', 'writeOutput'].includes(snapshot.operation) && (
                  <div className={`mt-3 min-w-[480px] rounded-lg border px-3 py-2 transition-all ${snapshot.reductionActive ? 'border-indigo-400 bg-white ring-2 ring-indigo-100 shadow-sm' : 'border-emerald-300 bg-emerald-50'}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-indigo-100 pb-1.5 text-[10px] font-bold text-indigo-700">
                      <span className="flex items-center gap-1"><Combine size={12}/>{t('reductionKernel')}</span>
                      <span className={snapshot.outputReady ? 'text-emerald-600' : 'text-amber-600'}>{snapshot.outputReady ? t('reductionDone') : t('sm3Reducing')}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-center text-[9px] text-indigo-800 md:grid-cols-3">
                      {algorithm === 'simple' ? (
                        <>
                          <div className={snapshot.operation === 'reduceStats' ? 'rounded bg-indigo-50 px-2 py-1 font-bold' : 'px-2 py-1'}><MathFormula>{String.raw`m=\max_i m_i`}</MathFormula></div>
                          <div className={snapshot.operation === 'reduceStats' ? 'rounded bg-indigo-50 px-2 py-1 font-bold' : 'px-2 py-1'}><MathFormula>{String.raw`\ell=\sum_i e^{m_i-m}\ell_i`}</MathFormula></div>
                          <div className={snapshot.operation !== 'reduceStats' ? 'rounded bg-purple-50 px-2 py-1 font-bold text-purple-800' : 'px-2 py-1'}><MathFormula>{String.raw`O=\frac{\sum_i e^{m_i-m}\widetilde O_i}{\ell}`}</MathFormula></div>
                        </>
                      ) : (
                        <>
                          <div className={snapshot.operation === 'reduceStats' ? 'rounded bg-indigo-50 px-2 py-1 font-bold' : 'px-2 py-1'}><MathFormula>{String.raw`L=\operatorname{LSE}_i(L_i)`}</MathFormula></div>
                          <div className={snapshot.operation === 'mergeOutput' ? 'rounded bg-purple-50 px-2 py-1 font-bold text-purple-800 md:col-span-2' : 'px-2 py-1 md:col-span-2'}><MathFormula>{String.raw`O=\sum_i e^{L_i-L}O_i`}</MathFormula></div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-5 md:p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0 xl:col-span-5">
             <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
               <div className="flex items-center gap-2">
                 <Code className="text-emerald-400" size={20} /> {t('pythonCode')}
               </div>
               <span className={`text-xs px-2 py-1 rounded border ${snapshot.isSplit && algorithm === 'optimized' ? 'bg-teal-900/50 text-teal-400 border-teal-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                 {snapshot.isSplit ? (algorithm === 'optimized' ? t('algOptimized') : t('algSimple')) : t('executionUnsplit')}
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
            {t('mathPrinciple')}
          </h3>
          
          <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl min-h-[160px] relative z-10">
            {snapshot.operation === 'idle' && (
              <p className="opacity-90">{t('waitStart')}<br/><span className="text-indigo-300 text-sm italic flex items-center gap-2 mt-2"><Info size={14}/> {t('clickPlay')}</span></p>
            )}
            
            {snapshot.operation === 'splitViews' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs">{t('step1Title')}</span> 
                  <SplitSquareHorizontal size={18}/> {t('step1Name')}
                </h4>
                <p className="opacity-90 text-indigo-50">{t('step1Desc')}</p>
              </div>
            )}

            {snapshot.operation === 'localBatch1' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">{t('step21Title')}</span> 
                  <Cpu size={18}/> {t('step21Name')}
                </h4>
                <p className="opacity-90">{t('step21Desc')}</p>
              </div>
            )}

            {snapshot.operation === 'localBatch2' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">{t('step22Title')}</span> 
                  <Cpu size={18}/> {t('step22Name')}
                </h4>
                <p className="opacity-90">{t('step22Desc')}</p>
              </div>
            )}

            {snapshot.operation === 'reduceStats' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-pink-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded text-xs">{t('step3Title')}</span> 
                  <Combine size={18}/> {t('step3Name')}
                </h4>
                <p className="opacity-90 mb-2">{t('step3Desc1')}</p>
                <p className="opacity-90 italic text-indigo-200">
                  {algorithm === 'simple' ? t('step3Desc2Simple') : t('step3Desc2Opt')}
                </p>
              </div>
            )}

            {snapshot.operation === 'mergeOutput' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">{t('step4Title')}</span> 
                  <Calculator size={18}/> {t('step4Name')}
                </h4>
                <p className="opacity-90">{t('step4Desc')}</p>
              </div>
            )}

            {snapshot.operation === 'resolveKv' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-indigo-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded text-xs">{t('step1Title')}</span>
                  <Database size={18}/> {t('unsplitStep1Name')}
                </h4>
                <p className="opacity-90">{t('unsplitStep1Desc')}</p>
              </div>
            )}

            {snapshot.operation === 'fusedAttention' && (
              <div className="animate-fade-in">
                <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs">{t('step21Title')}</span>
                  <Cpu size={18}/> {t('unsplitStep2Name')}
                </h4>
                <p className="opacity-90">{t('unsplitStep2Desc')}</p>
              </div>
            )}

            {snapshot.outputReady && (
              <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-800 rounded-full shrink-0 shadow-lg ring-2 ring-emerald-400"><Zap className="text-emerald-400" size={24} /></div>
                <div>
                  <h4 className="font-bold text-emerald-300 text-base md:text-lg">{t('doneTitle')}</h4>
                  <p className="opacity-90 mt-1 text-sm">{t(snapshot.isSplit ? 'doneDesc' : 'unsplitDoneDesc')}</p>
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
