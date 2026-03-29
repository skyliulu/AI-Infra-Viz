import React, { useState, useEffect } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, Globe, Info, Activity,
  AlertTriangle, ArrowRight, ArrowDown,
} from 'lucide-react';

// ── i18n ─────────────────────────────────────────────────────────────────────
const i18n = {
  zh: {
    title: 'Linear Attention 原理全景可视化',
    subtitle: 'O(N²)→O(N)：核函数近似 × 结合律重排 × GLA 门控递归状态',
    reset: '重置', play: '播放', pause: '暂停', next: '下一步',
    langToggle: 'EN',
    modeStd: '标准 Attention',
    modeGla: 'GLA (线性)',
    memLabel: '中间态显存',
    seqLabel: '输入序列',

    step0: '等待开始。点击播放，逐步观察两种 Attention 的计算差异。',
    step1: '步骤 1：Q / K / V 线性投影',
    step2std: '步骤 2：计算 N×N 注意力分数矩阵 QKᵀ',
    step2gla: '步骤 2：核函数近似 — 用特征映射 φ 替换 softmax',
    step3std: '步骤 3：Softmax 全局归一化（不可分解，必须看全 N 个 token）',
    step3gla: '步骤 3：结合律魔法 — 交换乘法顺序，彻底避免 N×N 矩阵',
    step4std: '步骤 4：加权聚合 V，输出 O = AV',
    step4gla: '步骤 4：GLA 门控 — 引入遗忘因子 Gₜ，提升表达力',
    step5std: '步骤 5：完成（显存峰值 O(N²)，长序列的显存墙）',
    step5gla: '步骤 5：逐 token 递归更新 — Sₜ = Gₜ ⊙ Sₜ₋₁ + kₜ ⊗ vₜ',
    step6gla: '步骤 6：输出 oₜ = φ(qₜ) · Sₜ（O(d²) 固定状态查询）',
    step7gla: '步骤 7：复杂度全景对比',

    pyShared1: '# Q/K/V 线性投影（两种方式完全相同）',
    pyStd2: '# ⚠️ N×N 矩阵完整实例化至 HBM',
    pyStd3: '# Softmax 必须看到全部 N 个 token，不可流式',
    pyStd4: '# O(N²d) IO，带宽严重受限',
    pyGla2: '# 核函数近似: elu(x)+1，消除 softmax',
    pyGla3a: '# 关键: 先算 φ(K)ᵀV (d×d)，而非 φ(Q)φ(K)ᵀ (N×N)',
    pyGla3b: '# 结合律: φ(Q)(φ(K)ᵀV) 与 (φ(Q)φ(K)ᵀ)V 等价，但前者 O(d²)！',
    pyGla4: '# GLA 门控矩阵，学习选择性遗忘',
    pyGla5: '# 递归推理：固定 O(d²) 状态，不随 N 增长',
    pyGla5b: '# 外积 kₜ⊗vₜ 叠加进状态矩阵',
    pyGla6: '# 输出：φ(q) 查询状态矩阵 S',

    p1title: '问题：Softmax 的 N² 诅咒',
    p1desc: '每个 query 需对全部 N 个 key 计算点积，形成 N×N 分数矩阵。该矩阵必须完整写入显存才能做 Softmax，空间复杂度 O(N²)。序列从 4K 涨到 64K，显存需求暴增 256 倍。',
    p2title: '突破口：核函数近似',
    p2desc: '将 softmax(QKᵀ/√d) 替换为 φ(Q)φ(K)ᵀ，φ 为特征映射（如 elu+1）。消除了 softmax 的全局依赖，但问题依然：φ(Q)φ(K)ᵀ 仍是 N×N！',
    p3title: '关键技巧：结合律重排',
    p3desc: '矩阵乘满足结合律：[φ(Q)φ(K)ᵀ]V = φ(Q)[φ(K)ᵀV]。右侧先算 φ(K)ᵀV，得 d×d 状态矩阵 S，中间态从 O(N²) 压缩至 O(d²)。N=8K、d=128 时节省 4096 倍。',
    p4title: 'GLA 门控：选择性遗忘',
    p4desc: '朴素线性 Attention 无法遗忘历史噪声。GLA 引入门控 Gₜ ∈ (0,1)^{d×d}：Sₜ = Gₜ ⊙ Sₜ₋₁ + kₜ ⊗ vₜ。门控让模型可选择性保留或丢弃历史，大幅提升表达力，接近标准 Attention 质量。',
    p5title: '递归推理：O(1) 显存增量',
    p5desc: '推理时只需维护固定 d×d 状态矩阵 S。每新 token：一次矩阵更新 O(d²) + 一次矩阵-向量乘 O(d²)。显存完全不随序列长度增长，支持无限长上下文推理。',
    p6title: '复杂度全景（每层）',
    p6desc: '标准 Attention：训练/推理 O(N²d)，显存 O(N²)。GLA 推理：O(Nd²) 时间，O(d²) 显存。GLA 训练：O(Nd²) 分块并行。N=64K、d=128 时，GLA 显存节省约 25000 倍。',

    attnMat: 'Attention 分数矩阵 (QKᵀ)',
    stateMat: '状态矩阵 S',
    gateG: '门控 Gₜ',
    outputO: '输出 O',
    alertMsg: '⚠️ N² 显存',
    optMsg: '✓ d² 固定',
    projQ: 'Q', projK: 'K', projV: 'V',
    phiQ: 'φ(Q)', phiK: 'φ(K)',
    softmaxRow: 'Softmax (逐行)',
    reorderTitle: '结合律重排',
    wrongOrder: '❌ 先算左边 → N×N',
    rightOrder: '✓ 先算右边 → d×d',
    tokenProcess: '已处理 token',
    memCmpTitle: '中间态显存对比',
    kernelNote1: '特征映射近似 softmax 核',
    kernelNote2: '保持非负性 + 线性可分解性',
    gateNote: '选择性遗忘\n历史信息',
    reorderIntermediate: '中间态:',
    reorderCompress: '× 压缩',
    outputEfficiency: 'O(d²)/token，显存不随 N 增长',
    pseudocodeTitle: 'Python 伪代码',
    principleTitle: '深度原理解析',
    tableTrainTime: '训练时间',
    tableInferTime: '推理时间/token',
    tableIntermMem: '中间显存',
    tableInfCtx: '无限上下文',
  },
  en: {
    title: 'Linear Attention Panorama',
    subtitle: 'O(N²)→O(N): Kernel Approximation × Associativity Trick × GLA Gated Recurrent State',
    reset: 'Reset', play: 'Play', pause: 'Pause', next: 'Next',
    langToggle: '中文',
    modeStd: 'Standard Attention',
    modeGla: 'GLA (Linear)',
    memLabel: 'Peak Memory',
    seqLabel: 'Input Sequence',

    step0: 'Waiting. Click Play to step through the computation differences.',
    step1: 'Step 1: Q / K / V Linear Projections',
    step2std: 'Step 2: Form N×N Attention Score Matrix QKᵀ',
    step2gla: 'Step 2: Kernel Approximation — Replace softmax with feature map φ',
    step3std: 'Step 3: Global Softmax Normalization (non-decomposable, needs all N tokens)',
    step3gla: 'Step 3: Associativity Magic — Reorder multiplication to avoid N×N entirely',
    step4std: 'Step 4: Weighted Aggregation O = AV',
    step4gla: 'Step 4: GLA Gating — Introduce forget factor Gₜ for expressiveness',
    step5std: 'Step 5: Done (Peak Memory O(N²) — the memory wall)',
    step5gla: 'Step 5: Token-by-token recurrence — Sₜ = Gₜ ⊙ Sₜ₋₁ + kₜ ⊗ vₜ',
    step6gla: 'Step 6: Output oₜ = φ(qₜ) · Sₜ (O(d²) fixed-state query)',
    step7gla: 'Step 7: Full Complexity Comparison',

    pyShared1: '# Q/K/V projections — identical for both modes',
    pyStd2: '# ⚠️ Full N×N matrix instantiated in HBM',
    pyStd3: '# Softmax requires seeing all N tokens — not streamable',
    pyStd4: '# O(N²d) IO, severely bandwidth-bound',
    pyGla2: '# Kernel approx: elu(x)+1, removes softmax',
    pyGla3a: '# KEY: compute φ(K)ᵀV (d×d) FIRST, not φ(Q)φ(K)ᵀ (N×N)',
    pyGla3b: '# Associativity: φ(Q)(φ(K)ᵀV) == (φ(Q)φ(K)ᵀ)V but former is O(d²)!',
    pyGla4: '# GLA gate matrix — learned selective forget',
    pyGla5: '# Recurrent inference: fixed O(d²) state, independent of N',
    pyGla5b: '# Outer product kₜ⊗vₜ accumulated into state S',
    pyGla6: '# Output: φ(q) queries the fixed state matrix S',

    p1title: 'The N² Curse of Softmax',
    p1desc: 'Each query needs a dot product with all N keys, forming an N×N score matrix. That matrix must be fully stored in memory before softmax can run — O(N²) space. Going from 4K to 64K tokens multiplies memory by 256×.',
    p2title: 'Breakout: Kernel Approximation',
    p2desc: 'Replace softmax(QKᵀ/√d) with φ(Q)φ(K)ᵀ where φ is a feature map (e.g., elu+1). This removes the global softmax dependency — but φ(Q)φ(K)ᵀ is still N×N!',
    p3title: 'The Associativity Trick',
    p3desc: 'Matrix multiplication is associative: [φ(Q)φ(K)ᵀ]V = φ(Q)[φ(K)ᵀV]. The right side computes φ(K)ᵀV first — a d×d state matrix S. Memory collapses from O(N²) to O(d²). For N=8K, d=128 that is 4096× savings.',
    p4title: 'GLA Gating: Selective Memory',
    p4desc: 'Vanilla linear attention accumulates history equally and cannot forget noise. GLA adds gate Gₜ ∈ (0,1)^{d×d}: Sₜ = Gₜ ⊙ Sₜ₋₁ + kₜ ⊗ vₜ. The gate enables selective retention, closing much of the quality gap with standard attention.',
    p5title: 'Inference: O(1) Memory Growth',
    p5desc: 'At inference, only a fixed d×d state S is maintained. Each new token: one matrix update O(d²) + one matrix-vector multiply O(d²). Memory is completely independent of sequence length, enabling infinite-length context.',
    p6title: 'Full Complexity (per layer)',
    p6desc: 'Standard: O(N²d) compute, O(N²) memory. GLA inference: O(Nd²) compute, O(d²) memory. GLA training: O(Nd²) chunked parallel. At N=64K, d=128, GLA saves ~25,000× memory.',

    attnMat: 'Attention Score Matrix (QKᵀ)',
    stateMat: 'State Matrix S',
    gateG: 'Gate Gₜ',
    outputO: 'Output O',
    alertMsg: '⚠️ N² memory',
    optMsg: '✓ d² fixed',
    projQ: 'Q', projK: 'K', projV: 'V',
    phiQ: 'φ(Q)', phiK: 'φ(K)',
    softmaxRow: 'Softmax (per-row)',
    reorderTitle: 'Associativity trick',
    wrongOrder: '❌ left-first → N×N',
    rightOrder: '✓ right-first → d×d',
    tokenProcess: 'Tokens processed',
    memCmpTitle: 'Intermediate Memory Comparison',
    kernelNote1: 'Feature map approximating softmax kernel',
    kernelNote2: 'Non-negative + linearly decomposable',
    gateNote: 'Selective forget\nold memory',
    reorderIntermediate: 'Intermediate:',
    reorderCompress: '× compression',
    outputEfficiency: 'O(d²)/token\nmemory independent of N',
    pseudocodeTitle: 'Python pseudocode',
    principleTitle: 'Principle Deep Dive',
    tableTrainTime: 'Training time',
    tableInferTime: 'Inference/token',
    tableIntermMem: 'Intermediate mem',
    tableInfCtx: 'Infinite context',
  },
};

const getInitialLang = () =>
  (typeof navigator !== 'undefined' && navigator.language.toLowerCase().includes('zh')) ? 'zh' : 'en';

// ── Demo dimensions ───────────────────────────────────────────────────────────
const N = 8;
const D = 4;

const TOKEN_BG = [
  'bg-indigo-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-amber-400',
  'bg-orange-400', 'bg-rose-400', 'bg-purple-400', 'bg-teal-400',
];

// ── Step snapshot ─────────────────────────────────────────────────────────────
const getStepState = (step, mode) => {
  if (mode === 'standard') {
    return {
      showProj:    step >= 1,
      showQKT:     step >= 2,
      showSoftmax: step >= 3,
      showOutput:  step >= 4,
      isAlert:     step >= 2,
      memTag:      step >= 2 ? `O(N²) = ${N * N}` : step >= 1 ? 'O(Nd)' : '—',
    };
  }
  return {
    showProj:    step >= 1,
    showKernel:  step >= 2,
    showReorder: step >= 3,
    showState:   step >= 3,
    showGate:    step >= 4,
    showRecur:   step >= 5,
    showOutput:  step >= 6,
    isOptimal:   step >= 3,
    memTag:      step >= 3 ? `O(d²) = ${D * D}` : step >= 1 ? 'O(Nd)' : '—',
  };
};

const MAX_STEPS = { standard: 5, gla: 7 };

// ── Sub-components ────────────────────────────────────────────────────────────
function MiniMatrix({ rows, cols, label, dims, fillAll = false, coloring = 'indigo',
                      isAlert = false, cellPx = 11 }) {
  const ACTIVE = {
    indigo:  'bg-indigo-400 border-indigo-500',
    amber:   'bg-amber-400 border-amber-500',
    emerald: 'bg-emerald-400 border-emerald-500',
    cyan:    'bg-cyan-400 border-cyan-500',
    violet:  'bg-violet-400 border-violet-500',
    rose:    'bg-rose-400 border-rose-500',
  };
  const active = isAlert ? ACTIVE.rose : (ACTIVE[coloring] || ACTIVE.indigo);
  const idle   = 'bg-slate-100 border-slate-200';

  return (
    <div className="flex flex-col items-center gap-0.5">
      {label && <div className="text-[9px] font-semibold text-slate-600 text-center leading-tight">{label}</div>}
      <div className="flex flex-col" style={{ gap: 1 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex" style={{ gap: 1 }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} style={{ width: cellPx, height: cellPx }}
                className={`rounded-[1px] border transition-colors duration-300 ${fillAll ? active : idle}`} />
            ))}
          </div>
        ))}
      </div>
      {dims && <div className="text-[8px] font-mono text-slate-400 mt-0.5">{dims}</div>}
    </div>
  );
}

function SoftmaxMatrix({ rows, cols, cellPx = 11 }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-[9px] font-semibold text-indigo-700 text-center">softmax →</div>
      <div className="flex flex-col" style={{ gap: 1 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex" style={{ gap: 1 }}>
            {Array.from({ length: cols }).map((_, c) => {
              const alpha = 0.18 + 0.72 * Math.exp(-Math.abs(r - c) * 0.55);
              return (
                <div key={c} style={{ width: cellPx, height: cellPx, opacity: alpha }}
                  className="rounded-[1px] bg-indigo-500" />
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-[8px] font-mono text-indigo-400 mt-0.5">Σ_row = 1</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const App = () => {
  const [mode,      setMode]      = useState('standard');
  const [step,      setStep]      = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tokenIdx,  setTokenIdx]  = useState(-1);
  const [lang,      setLang]      = useState(getInitialLang());

  const t        = (k) => i18n[lang][k] ?? k;
  const maxSteps = MAX_STEPS[mode === 'standard' ? 'standard' : 'gla'];
  const isDone   = step >= maxSteps;
  const ss       = getStepState(step, mode);

  // token-by-token animation during recurrence step
  useEffect(() => {
    if (mode === 'gla' && step === 5 && tokenIdx < N - 1) {
      const tid = setTimeout(() => setTokenIdx(i => i + 1), 340);
      return () => clearTimeout(tid);
    }
  }, [mode, step, tokenIdx]);

  useEffect(() => { setTokenIdx(-1); }, [step, mode]);

  useEffect(() => {
    if (!isPlaying || isDone) return;
    const delay = (step === 2 || step === 3 || step === 5) ? 2800 : 2000;
    const tid = setTimeout(advance, delay);
    return () => clearTimeout(tid);
  }, [isPlaying, step, mode]); // eslint-disable-line

  const advance = () => { if (!isDone) setStep(s => s + 1); else setIsPlaying(false); };
  const reset   = () => { setIsPlaying(false); setStep(0); setTokenIdx(-1); };
  const togglePlay = () => { if (isDone) reset(); setIsPlaying(p => !p); };
  const handleModeChange = (m) => { if (m !== mode) { setMode(m); reset(); } };

  const stepLabel = (() => {
    if (step === 0) return t('step0');
    if (step === 1) return t('step1');
    if (step === 2) return mode === 'standard' ? t('step2std') : t('step2gla');
    if (step === 3) return mode === 'standard' ? t('step3std') : t('step3gla');
    if (step === 4) return mode === 'standard' ? t('step4std') : t('step4gla');
    if (step === 5) return mode === 'standard' ? t('step5std') : t('step5gla');
    if (step === 6) return t('step6gla');
    if (step === 7) return t('step7gla');
    return '';
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-violet-100">
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
        .anim-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      <div className="max-w-[92rem] mx-auto space-y-4">

        {/* ── control bar ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200
                        flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-violet-900">
              <Activity className="text-violet-500" />{t('title')}
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">{t('subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {[['standard', t('modeStd')], ['gla', t('modeGla')]].map(([id, label]) => (
                <button key={id} onClick={() => handleModeChange(id)}
                  className={`px-3 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-all
                    ${mode === id ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={reset} title={t('reset')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500">
                <RotateCcw size={15} />
              </button>
              <button onClick={togglePlay}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold">
                {isPlaying ? <><Pause size={14} />{t('pause')}</> : <><Play size={14} />{t('play')}</>}
              </button>
              <button onClick={advance} disabled={isDone || isPlaying} title={t('next')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-40">
                <SkipForward size={15} />
              </button>
            </div>

            <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-400 text-sm text-slate-600">
              <Globe size={14} />{t('langToggle')}
            </button>
          </div>
        </div>

        {/* ── step banner ─────────────────────────────────────────────────── */}
        <div key={`${step}-${mode}`}
          className={`anim-in bg-white rounded-xl border px-4 py-2.5 text-sm font-medium flex items-center gap-2
            ${ss.isAlert ? 'border-rose-200 text-rose-700 bg-rose-50' : 'border-violet-100 text-violet-800'}`}>
          {ss.isAlert ? <AlertTriangle size={14} /> : <Activity size={14} />}
          <span className="text-xs text-slate-400 mr-1">[{step}/{maxSteps}]</span>
          {stepLabel}
        </div>

        {/* ── 3-column layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px_270px] gap-4">

          {/* ──── LEFT: animation canvas ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-5">

            {/* metric pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className={`rounded-lg px-3 py-1.5 border font-semibold transition-all duration-500
                ${ss.isAlert
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-[0_0_14px_rgba(244,63,94,0.2)]'
                  : ss.isOptimal
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {t('memLabel')}: <span className="font-bold">{ss.memTag}</span>
              </div>
              {ss.isAlert && (
                <div className="rounded-lg px-3 py-1.5 border bg-rose-50 border-rose-300 text-rose-600 font-bold">
                  {t('alertMsg')}
                </div>
              )}
              {ss.isOptimal && (
                <div className="rounded-lg px-3 py-1.5 border bg-emerald-50 border-emerald-300 text-emerald-700 font-bold">
                  {t('optMsg')}
                </div>
              )}
            </div>

            {/* idle */}
            {step === 0 && (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center py-10 leading-relaxed">
                {t('step0')}
              </div>
            )}

            {/* token bar */}
            {step >= 1 && (
              <div className="anim-in">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {t('seqLabel')} (N = {N})
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: N }).map((_, i) => (
                    <div key={i}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-white text-[9px] font-bold
                        transition-all duration-300 ${TOKEN_BG[i]}
                        ${mode === 'gla' && step === 5 && tokenIdx === i
                          ? 'ring-2 ring-white ring-offset-1 scale-110 shadow-lg' : 'opacity-85'}`}>
                      t{i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* projections */}
            {ss.showProj && (
              <div className="anim-in">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  W_q · W_k · W_v  →
                </div>
                <div className="flex gap-4 items-end flex-wrap">
                  <MiniMatrix rows={N} cols={D} fillAll
                    label={mode === 'gla' && ss.showKernel ? t('phiQ') : t('projQ')}
                    dims={`${N}×${D}`} coloring="indigo" />
                  <MiniMatrix rows={N} cols={D} fillAll
                    label={mode === 'gla' && ss.showKernel ? t('phiK') : t('projK')}
                    dims={`${N}×${D}`} coloring="amber" />
                  <MiniMatrix rows={N} cols={D} fillAll
                    label={t('projV')} dims={`${N}×${D}`} coloring="cyan" />

                  {mode === 'gla' && ss.showKernel && (
                    <div className="anim-in flex flex-col gap-1 text-[10px] bg-violet-50 border border-violet-200
                                    rounded-lg px-3 py-2 leading-relaxed text-violet-700">
                      <div className="font-bold">φ(x) = elu(x) + 1</div>
                      <div className="text-slate-500 text-[9px]">{t('kernelNote1')}</div>
                      <div className="text-slate-500 text-[9px]">{t('kernelNote2')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STANDARD: N×N attention matrix ── */}
            {mode === 'standard' && ss.showQKT && (
              <div className="anim-in flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ArrowDown size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">
                    {t('attnMat')}
                  </span>
                </div>
                <div className="flex items-start gap-5 flex-wrap">
                  {/* the big matrix */}
                  <div className={`rounded-xl border-2 p-3 transition-all duration-500
                    ${ss.isAlert
                      ? 'border-rose-400 bg-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.3)]'
                      : 'border-slate-200'}`}>
                    <MiniMatrix rows={N} cols={N} fillAll isAlert dims={`${N}×${N} = ${N * N} elements`} cellPx={12} />
                  </div>

                  {/* after softmax */}
                  {ss.showSoftmax && (
                    <div className="anim-in">
                      <SoftmaxMatrix rows={N} cols={N} cellPx={12} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STANDARD: output ── */}
            {mode === 'standard' && ss.showOutput && (
              <div className="anim-in flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ArrowDown size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t('outputO')}  (A × V)
                  </span>
                </div>
                <MiniMatrix rows={N} cols={D} fillAll coloring="indigo" dims={`${N}×${D}`} cellPx={12} />
              </div>
            )}

            {/* ── GLA: reorder diagram ── */}
            {mode === 'gla' && ss.showReorder && (
              <div className="anim-in bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-3">
                  {t('reorderTitle')}
                </div>
                <div className="flex flex-col gap-2.5 text-[10px]">
                  <div className="flex items-center gap-2 opacity-50">
                    <span className="text-rose-600 font-bold shrink-0">{t('wrongOrder')}</span>
                    <code className="font-mono text-rose-700 bg-rose-100 px-2 py-1 rounded">
                      [φ(Q)·φ(K)ᵀ]·V  →  {N}×{N}  →  {N}×{D}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">{t('rightOrder')}</span>
                    <code className="font-mono text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                      φ(Q)·[φ(K)ᵀ·V]  →  {D}×{D}  →  {N}×{D}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold">
                    <span className="text-slate-500">{t('reorderIntermediate')}</span>
                    <span className="line-through text-rose-500">{N}×{N}={N * N}</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className="text-emerald-600">{D}×{D}={D * D}</span>
                    <span className="text-slate-400 font-normal ml-1">
                      ({Math.round((N * N) / (D * D))}{t('reorderCompress')})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── GLA: state matrix S + gate + recurrence ── */}
            {mode === 'gla' && ss.showState && (
              <div className="anim-in flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ArrowDown size={13} className="text-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    {t('stateMat')}  S = φ(K)ᵀV
                  </span>
                </div>

                <div className="flex items-start gap-4 flex-wrap">
                  {/* d×d state */}
                  <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-3
                                  shadow-[0_0_16px_rgba(52,211,153,0.25)]">
                    <MiniMatrix rows={D} cols={D} fillAll coloring="emerald"
                      dims={`${D}×${D} = ${D * D} elements`} cellPx={20} />
                  </div>

                  {/* gate G */}
                  {ss.showGate && (
                    <div className="anim-in flex flex-col items-center gap-1.5">
                      <div className="text-[9px] font-semibold text-violet-600">{t('gateG')}</div>
                      <MiniMatrix rows={D} cols={D} fillAll coloring="violet"
                        dims={`σ(X·Wg)`} cellPx={20} />
                      <div className="text-[8px] text-violet-500 text-center max-w-[72px] leading-tight whitespace-pre-line">
                        {t('gateNote')}
                      </div>
                    </div>
                  )}

                  {/* recurrence */}
                  {ss.showRecur && (
                    <div className="anim-in flex flex-col gap-2">
                      <div className="text-[9px] font-semibold text-amber-700">
                        Sₜ = Gₜ ⊙ Sₜ₋₁ + kₜ ⊗ vₜ
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: N }).map((_, i) => (
                          <div key={i}
                            className={`w-7 h-7 rounded-md flex items-center justify-center
                              text-white text-[9px] font-bold transition-all duration-200
                              ${TOKEN_BG[i]}
                              ${tokenIdx >= i ? 'opacity-100 scale-100' : 'opacity-25 scale-90'}`}>
                            t{i + 1}
                          </div>
                        ))}
                      </div>
                      <div className="text-[9px] text-amber-600 font-medium">
                        {tokenIdx >= 0
                          ? `${t('tokenProcess')}: ${tokenIdx + 1} / ${N}`
                          : '…'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── GLA: output ── */}
            {mode === 'gla' && ss.showOutput && (
              <div className="anim-in flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ArrowDown size={13} className="text-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    {t('outputO')}  oₜ = φ(qₜ) · S
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <MiniMatrix rows={1} cols={D} fillAll coloring="indigo"
                    label="φ(qₜ)" dims={`1×${D}`} cellPx={15} />
                  <span className="text-slate-400 font-bold text-lg">×</span>
                  <MiniMatrix rows={D} cols={D} fillAll coloring="emerald"
                    label="S" dims={`${D}×${D}`} cellPx={15} />
                  <span className="text-slate-400 font-bold text-lg">=</span>
                  <MiniMatrix rows={1} cols={D} fillAll coloring="violet"
                    label="oₜ" dims={`1×${D}`} cellPx={15} />
                  <div className="text-[9px] text-emerald-600 leading-tight whitespace-pre-line">
                    {t('outputEfficiency')}
                  </div>
                </div>
              </div>
            )}

            {/* ── memory comparison bar ── */}
            {(ss.showQKT || ss.showState || (mode === 'standard' && step >= 5) || (mode === 'gla' && step >= 5)) && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-col gap-2 anim-in">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  {t('memCmpTitle')} (N={N}, d={D})
                </div>
                <div className="flex items-end gap-5 h-16">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[9px] font-mono text-rose-500">{N}²={N * N}</div>
                    <div className="w-10 rounded-t-md bg-rose-400 transition-all duration-700"
                      style={{ height: 56 }} />
                    <div className="text-[8px] text-slate-500">Standard</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[9px] font-mono text-emerald-600">{D}²={D * D}</div>
                    <div className="w-10 rounded-t-md bg-emerald-400 transition-all duration-700"
                      style={{ height: Math.round((D * D / (N * N)) * 56) }} />
                    <div className="text-[8px] text-slate-500">GLA</div>
                  </div>
                  <div className="flex flex-col justify-end pb-5 text-[9px] text-slate-400 leading-relaxed">
                    <div>N=64K → std: 4G cells</div>
                    <div>N=64K → GLA: {D * D} cells</div>
                  </div>
                </div>
              </div>
            )}

          </div>{/* end left panel */}

          {/* ──── CENTER: pseudocode ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('pseudocodeTitle')}
            </h3>
            <div className="font-mono text-[10px] md:text-[11px] bg-[#0d1117] p-4 rounded-xl
                            border border-slate-800 flex-1 leading-relaxed text-slate-400 overflow-x-auto">

              {mode === 'standard' ? (
                <>
                  <div>
                    <span className="text-blue-400">def </span>
                    <span className="text-emerald-300">standard_attention</span>
                    <span>(X, W_q, W_k, W_v):</span>
                  </div>

                  <div className={`mt-3 ${step === 1
                    ? 'bg-indigo-900/60 text-indigo-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-indigo-400' : ''}`}>
                    <div className="text-indigo-400 font-bold text-[9px] mb-1">{t('pyShared1')}</div>
                    <div>{'  '}Q = X @ W_q  <span className="text-slate-600"># [N, d]</span></div>
                    <div>{'  '}K = X @ W_k</div>
                    <div>{'  '}V = X @ W_v</div>
                  </div>

                  <div className={`mt-3 ${step === 2
                    ? 'bg-rose-900/50 text-rose-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-rose-400' : ''}`}>
                    <div className="text-rose-400 font-bold text-[9px] mb-1">{t('pyStd2')}</div>
                    <div>{'  '}scores = Q @ K.T / sqrt(d)</div>
                    <div>{'  '}<span className="text-rose-400"># shape [{N},{N}] — N² elements!</span></div>
                  </div>

                  <div className={`mt-3 ${step === 3
                    ? 'bg-amber-900/40 text-amber-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-amber-400' : ''}`}>
                    <div className="text-amber-400 font-bold text-[9px] mb-1">{t('pyStd3')}</div>
                    <div>{'  '}attn = softmax(scores, dim=-1)</div>
                  </div>

                  <div className={`mt-3 ${step >= 4
                    ? 'bg-purple-900/40 text-purple-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-purple-400' : ''}`}>
                    <div className="text-purple-400 font-bold text-[9px] mb-1">{t('pyStd4')}</div>
                    <div>{'  '}O = attn @ V   <span className="text-slate-600"># [N, d]</span></div>
                    <div className={step >= 5 ? 'text-rose-400 font-bold mt-1' : 'mt-1'}>
                      {'  '}<span className="text-blue-400">return</span> O
                      <span className="text-rose-400">  # total: O(N²d) IO</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-blue-400">def </span>
                    <span className="text-emerald-300">gla_attention</span>
                    <span>(X, W_q, W_k, W_v, W_g):</span>
                  </div>

                  <div className={`mt-3 ${step === 1
                    ? 'bg-indigo-900/60 text-indigo-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-indigo-400' : ''}`}>
                    <div className="text-indigo-400 font-bold text-[9px] mb-1">{t('pyShared1')}</div>
                    <div>{'  '}Q = X@W_q; K = X@W_k; V = X@W_v</div>
                  </div>

                  <div className={`mt-3 ${step === 2
                    ? 'bg-cyan-900/50 text-cyan-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-cyan-400' : ''}`}>
                    <div className="text-cyan-400 font-bold text-[9px] mb-1">{t('pyGla2')}</div>
                    <div>{'  '}phi_Q = elu(Q) + 1  <span className="text-slate-600"># [N,d]</span></div>
                    <div>{'  '}phi_K = elu(K) + 1</div>
                  </div>

                  <div className={`mt-3 ${step === 3
                    ? 'bg-emerald-900/50 text-emerald-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-emerald-400' : ''}`}>
                    <div className="text-emerald-400 font-bold text-[9px] mb-1">{t('pyGla3a')}</div>
                    <div>{'  '}<span className="text-emerald-300">S = phi_K.T @ V</span>
                      <span className="text-slate-600">  # [d,d] O(d²)!</span></div>
                    <div className="text-slate-500 text-[9px] mt-0.5">{'  '}{t('pyGla3b')}</div>
                  </div>

                  <div className={`mt-3 ${step === 4
                    ? 'bg-violet-900/50 text-violet-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-violet-400' : ''}`}>
                    <div className="text-violet-400 font-bold text-[9px] mb-1">{t('pyGla4')}</div>
                    <div>{'  '}G = sigmoid(X @ W_g)</div>
                    <div>{'  '}<span className="text-slate-600"># [N, d, d]</span></div>
                  </div>

                  <div className={`mt-3 ${step === 5
                    ? 'bg-amber-900/40 text-amber-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-amber-400' : ''}`}>
                    <div className="text-amber-400 font-bold text-[9px] mb-1">{t('pyGla5')}</div>
                    <div>{'  '}S = zeros(d, d)</div>
                    <div>{'  '}<span className="text-blue-400">for</span> t <span className="text-blue-400">in</span> range(N):</div>
                    <div>{'      '}S = G[t] * S + outer(phi_K[t], V[t])</div>
                    <div className="text-slate-600">{'      '}{t('pyGla5b')}</div>
                  </div>

                  <div className={`mt-3 ${step >= 6
                    ? 'bg-teal-900/40 text-teal-200 px-2 py-1.5 -mx-2 rounded border-l-2 border-teal-400' : ''}`}>
                    <div className="text-teal-400 font-bold text-[9px] mb-1">{t('pyGla6')}</div>
                    <div>{'  '}O = phi_Q @ S  <span className="text-slate-600"># [N,d]</span></div>
                    <div className={step >= 7 ? 'text-emerald-400 font-bold mt-1' : 'mt-1'}>
                      {'  '}<span className="text-blue-400">return</span> O
                      <span className="text-emerald-400">  # O(Nd²)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ──── RIGHT: principle panel ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 overflow-y-auto max-h-[780px]">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={12} /> {t('principleTitle')}
            </h3>

            {step === 0 && (
              <p className="text-xs text-slate-400 leading-relaxed">{t('step0')}</p>
            )}

            {step >= 1 && (
              <div className="space-y-1 anim-in">
                <p className="text-xs font-bold text-rose-700">{t('p1title')}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p1desc')}</p>
              </div>
            )}

            {step >= 2 && (
              <div className="space-y-1 anim-in">
                <p className={`text-xs font-bold ${mode === 'standard' ? 'text-rose-600' : 'text-cyan-700'}`}>
                  {t('p2title')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p2desc')}</p>
              </div>
            )}

            {step >= 3 && (
              <div className="space-y-1 anim-in">
                <p className={`text-xs font-bold ${mode === 'gla' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {t('p3title')}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p3desc')}</p>
              </div>
            )}

            {step >= 4 && (
              <div className="space-y-1 anim-in">
                <p className="text-xs font-bold text-violet-700">{t('p4title')}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p4desc')}</p>
              </div>
            )}

            {step >= 5 && (
              <div className="space-y-1 anim-in">
                <p className="text-xs font-bold text-amber-700">{t('p5title')}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p5desc')}</p>
              </div>
            )}

            {((mode === 'standard' && step >= 5) || (mode === 'gla' && step >= 6)) && (
              <div className="space-y-1 anim-in">
                <p className="text-xs font-bold text-teal-700">{t('p6title')}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{t('p6desc')}</p>
              </div>
            )}

            {/* complexity table */}
            {((mode === 'standard' && step >= 5) || (mode === 'gla' && step >= 7)) && (
              <div className="anim-in mt-1 rounded-xl border border-slate-200 overflow-hidden text-[10px]">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-slate-500 font-semibold border-b border-slate-200"></th>
                      <th className="px-2 py-1.5 text-rose-600 font-semibold border-b border-slate-200 text-center">Standard</th>
                      <th className="px-2 py-1.5 text-emerald-600 font-semibold border-b border-slate-200 text-center">GLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      [t('tableTrainTime'), 'O(N²d)', 'O(Nd²)'],
                      [t('tableInferTime'), 'O(Nd)', 'O(d²)'],
                      [t('tableIntermMem'), 'O(N²)', 'O(d²)'],
                      [t('tableInfCtx'), '❌', '✅'],
                    ].map(([label, std, gla]) => (
                      <tr key={label}>
                        <td className="px-2 py-1.5 text-slate-500">{label}</td>
                        <td className="px-2 py-1.5 text-center text-rose-600 font-mono">{std}</td>
                        <td className="px-2 py-1.5 text-center text-emerald-600 font-mono">{gla}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;
