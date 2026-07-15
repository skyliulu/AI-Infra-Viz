import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Database, Merge, Repeat2, ScanLine, Search, Zap } from 'lucide-react';
import { MathFormula } from './MathFormula';

const FORMULAS = {
  softmaxCurrentMemory: String.raw`n_t(d_k+d_v)`,
  linearMemory: String.raw`d_kd_v+d_k`,
  glaMemory: String.raw`d_kd_v`,
  softmaxScores: String.raw`N^2`,
  linearState: String.raw`S_t=S_{t-1}+\phi(k_t)v_t^\top`,
  glaState: String.raw`S_t=G_t\odot S_{t-1}+k_t^\top v_t`,
};

const DEMO_TOKENS = 8;

const compactNumber = (value) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
};

const toneClasses = {
  rose: {
    text: 'text-rose-700',
    border: 'border-rose-300',
    soft: 'bg-rose-50',
    cell: 'border-rose-300 bg-rose-200 text-rose-950',
    fill: 'bg-rose-500',
    ring: 'ring-rose-200',
  },
  indigo: {
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    soft: 'bg-indigo-50',
    cell: 'border-indigo-300 bg-indigo-200 text-indigo-950',
    fill: 'bg-indigo-600',
    ring: 'ring-indigo-200',
  },
  amber: {
    text: 'text-amber-700',
    border: 'border-amber-300',
    soft: 'bg-amber-50',
    cell: 'border-amber-300 bg-amber-200 text-amber-950',
    fill: 'bg-amber-500',
    ring: 'ring-amber-200',
  },
  cyan: {
    text: 'text-cyan-800',
    border: 'border-cyan-400',
    soft: 'bg-cyan-50',
    cell: 'border-cyan-400 bg-cyan-200 text-cyan-950',
    fill: 'bg-cyan-700',
    ring: 'ring-cyan-200',
  },
};

function MatrixGlyph({ matrix, dk, dv, tone = 'indigo', active = false, dimensions = false, label, compact = false, layoutId, placeholder = false }) {
  const colors = toneClasses[tone];
  const cells = matrix.slice(0, 4).flatMap((row) => row.slice(0, 4));
  return (
    <div className="w-fit max-w-full">
      {label && <div className={`mb-1.5 text-center text-[10px] font-bold ${colors.text}`}><MathFormula>{label}</MathFormula></div>}
      <div className={dimensions ? 'grid grid-cols-[20px_auto] items-center gap-1' : ''}>
        {dimensions && <div className="-rotate-90 whitespace-nowrap text-center text-[9px] text-slate-500"><MathFormula>{String.raw`d_k=${dk}`}</MathFormula></div>}
        <div className="w-fit">
          {dimensions && <div className="mb-1 text-center text-[9px] text-slate-500"><MathFormula>{String.raw`d_v=${dv}`}</MathFormula></div>}
          <motion.div
            layoutId={layoutId}
            animate={active ? { scale: [1, 1.025, 1] } : { scale: 1 }}
            transition={{ duration: 0.26 }}
            className={`grid ${compact ? 'w-[112px]' : 'w-[128px]'} max-w-full grid-cols-4 gap-0.5 rounded-md border p-1 transition ${placeholder ? 'border-dashed border-slate-300 bg-slate-50' : `${colors.border} ${colors.soft}`} ${active ? `ring-2 ${colors.ring}` : ''}`}
          >
            {cells.map((value, index) => {
              const intensity = Math.min(1, 0.28 + Math.abs(value) / 2.6);
              return (
                <motion.div
                  key={index}
                  animate={{ opacity: placeholder ? 0.32 : intensity }}
                  className={`flex aspect-square min-w-0 items-center justify-center rounded-[3px] border font-mono text-[10px] font-bold leading-none ${placeholder ? 'border-dashed border-slate-300 bg-white text-transparent' : colors.cell}`}
                >
                  {placeholder ? '' : Number(value).toFixed(1)}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SoftmaxGrowthLane({ contextLength, dk, dv, state, step, activeMode, t }) {
  const filled = Math.min(DEMO_TOKENS, state.tokenIndex + 1);
  const isActive = activeMode === 'exact';
  const reading = isActive && (step === 0 || step === 1 || step === 2);
  return (
    <div className={`grid gap-4 border-b border-slate-200 px-3 py-4 transition lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center ${isActive ? 'bg-rose-50/45' : 'bg-white'}`} data-architecture-lane="softmax-decode" data-lane-active={isActive}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><Database size={17} /></div>
        <div>
          <div className="text-sm font-bold text-slate-950">{t('softmax')}</div>
          <div className="text-[10px] font-bold text-rose-700"><MathFormula>{String.raw`t=${filled}`}</MathFormula></div>
        </div>
      </div>

      <div className="relative pt-7" role="img" aria-label={t('softmaxDecodeVisual')}>
        <motion.div
          key={`query-${state.tokenIndex}`}
          initial={{ x: -14, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute left-0 top-0 flex items-center gap-1 rounded-md bg-rose-500 px-2 py-1 font-mono text-[9px] font-bold text-white"
        >
          <Search size={11} /><MathFormula>{String.raw`q_{${state.tokenIndex + 1}}`}</MathFormula>
        </motion.div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: DEMO_TOKENS }, (_, index) => {
            const stored = index < filled;
            const current = index === filled - 1;
            return (
              <motion.div
                key={index}
                data-kv-status={stored ? current ? 'current' : 'stored' : 'future'}
                initial={false}
                animate={stored ? { opacity: 1, y: current ? [0, -4, 0] : 0 } : { opacity: 0.28, y: 0 }}
                transition={{ duration: 0.28 }}
                className={`relative overflow-hidden rounded-lg border ${stored ? `border-rose-300 bg-white ${reading ? 'ring-2 ring-rose-100' : ''}` : 'border-slate-200 bg-slate-100'}`}
              >
                <div className={`px-1 py-1.5 text-center text-[8px] font-bold ${stored ? 'bg-rose-100 text-rose-900' : 'text-slate-400'}`}><MathFormula>{String.raw`K_{${index + 1}}`}</MathFormula></div>
                <div className={`border-t px-1 py-1.5 text-center text-[8px] font-bold ${stored ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-400'}`}><MathFormula>{String.raw`V_{${index + 1}}`}</MathFormula></div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center text-[9px] font-semibold text-slate-400">
          <span><MathFormula>{String.raw`t_1`}</MathFormula></span><span className="mx-2 h-px flex-1 bg-gradient-to-r from-rose-300 to-slate-200" /><ArrowRight size={11} /><span className="ml-1 text-rose-700"><MathFormula>{String.raw`N=${contextLength}`}</MathFormula></span>
        </div>
        <div className="mt-1 flex justify-end gap-3 font-mono text-[9px] text-slate-500">
          <span><MathFormula>{String.raw`K_i\in\mathbb R^{${dk}}`}</MathFormula></span><span><MathFormula>{String.raw`V_i\in\mathbb R^{${dv}}`}</MathFormula></span>
        </div>
      </div>
    </div>
  );
}

function CompressionFunnel({ targetMode, state, stateReady, isActive, t }) {
  const tone = targetMode === 'gla' ? 'cyan' : 'indigo';
  const colors = toneClasses[tone];
  const tokens = Array.from({ length: state.tokenIndex + 1 }, (_, index) => index);
  const visualState = stateReady ? state.state : state.previousState;
  const cells = visualState.slice(0, 4).flatMap((row) => row.slice(0, 4));
  return (
    <div className={`mb-4 grid items-center gap-3 rounded-xl border px-3 py-3 sm:grid-cols-[minmax(190px,1fr)_28px_138px] ${colors.border} ${colors.soft}`} role="img" aria-label={t(targetMode === 'gla' ? 'glaCompressedLead' : 'linearCompressedLead')} data-compression-count={tokens.length}>
      <div className="min-w-0">
        <div className={`mb-2 text-[9px] font-bold uppercase tracking-[0.12em] ${colors.text}`}>{t('tokensEnter')}</div>
        <div className="flex min-h-8 items-center gap-1 overflow-hidden">
          {tokens.map((index) => {
            const current = index === state.tokenIndex;
            return (
              <motion.div
                key={`${targetMode}-history-token-${index}`}
                initial={current ? { x: -14, opacity: 0 } : false}
                animate={current && isActive && stateReady ? { x: [0, 16, 28], scale: [1, 0.92, 0.72], opacity: [1, 1, 0.25] } : { x: 0, scale: 1, opacity: current ? 1 : 0.58 }}
                transition={{ duration: 0.38 }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white font-mono text-[9px] font-bold ${current ? `${colors.border} ${colors.text} ring-2 ${colors.ring}` : 'border-slate-200 text-slate-500'}`}
              >
                <MathFormula>{String.raw`t_{${index + 1}}`}</MathFormula>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div animate={isActive && stateReady ? { scale: [1, 1.18, 1] } : { scale: 1 }} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white ${colors.text}`}>
        <Merge size={16} />
      </motion.div>

      <div className="flex items-center gap-2">
        <motion.div animate={isActive && stateReady ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={{ duration: 0.38 }} className={`relative grid h-[68px] w-[68px] shrink-0 grid-cols-4 gap-0.5 rounded-lg border p-1.5 ${colors.border} bg-white shadow-sm`}>
          {cells.map((value, index) => <motion.div key={index} animate={{ opacity: Math.min(1, 0.32 + Math.abs(value) / 2.4) }} className={`rounded-[2px] ${colors.fill}`} />)}
          <div className={`absolute -right-2 -top-2 rounded-md border bg-white px-1.5 py-0.5 text-[9px] font-bold ${colors.border} ${colors.text}`}><MathFormula>{String.raw`S_t`}</MathFormula></div>
        </motion.div>
        <div className="min-w-0">
          <div className={`text-[9px] font-bold uppercase tracking-[0.1em] ${colors.text}`}>{t('fixedShape')}</div>
          <div className="mt-1 whitespace-nowrap text-[9px] text-slate-500"><MathFormula>{String.raw`${state.dk}\times ${state.dv}`}</MathFormula></div>
        </div>
      </div>
    </div>
  );
}

function RecurrentStateLane({ targetMode, activeMode, dk, dv, state, step, gateStrength, setGateStrength, t }) {
  const tone = targetMode === 'gla' ? 'cyan' : 'indigo';
  const colors = toneClasses[tone];
  const isActive = activeMode === targetMode;
  const stateReady = step >= 2;
  const oldTerm = targetMode === 'gla' && step >= 1 ? state.decayedState : state.previousState;
  const oldLabel = targetMode === 'gla' && step >= 1 ? String.raw`G_t\odot S_{t-1}` : String.raw`S_{t-1}`;
  const formula = targetMode === 'gla' ? FORMULAS.glaState : FORMULAS.linearState;
  return (
    <div className={`grid gap-4 px-3 py-4 transition lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center ${isActive ? targetMode === 'gla' ? 'bg-cyan-50/55' : 'bg-indigo-50/45' : 'bg-white'}`} data-architecture-lane={`${targetMode}-decode`} data-lane-active={isActive}>
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.soft} ${colors.text}`}>{targetMode === 'gla' ? <Zap size={17} /> : <Repeat2 size={17} />}</div>
        <div>
          <div className="text-sm font-bold text-slate-950">{t(targetMode)}</div>
          <div className={`text-[10px] font-bold ${colors.text}`}><MathFormula>{String.raw`S_{${state.tokenIndex + 1}}`}</MathFormula></div>
        </div>
      </div>

      <div>
        <CompressionFunnel targetMode={targetMode} state={state} stateReady={stateReady} isActive={isActive} t={t} />
        <div className="grid items-center justify-center gap-2 sm:grid-cols-[112px_18px_112px_24px_148px] sm:justify-start">
          <MatrixGlyph matrix={oldTerm} dk={dk} dv={dv} tone={tone} compact active={isActive && !stateReady} layoutId={isActive && !stateReady ? `recurrent-state-${targetMode}` : undefined} label={oldLabel} />
          <div className={`text-center text-xl font-light ${colors.text}`}>+</div>
          <motion.div
            key={`update-${state.tokenIndex}`}
            initial={{ x: -18, opacity: 0 }}
            animate={isActive && stateReady ? { x: [0, 22, 0], scale: [1, 0.9, 1], opacity: [1, 0.55, 1] } : { x: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.34 }}
          >
            <MatrixGlyph matrix={state.update} dk={dk} dv={dv} tone={tone} compact active={isActive && (step === 1 || step === 2)} label={targetMode === 'gla' ? String.raw`k_t^\top v_t` : String.raw`\phi(k_t)v_t^\top`} />
          </motion.div>
          <ArrowRight className={`mx-auto ${colors.text}`} size={20} />
          <MatrixGlyph matrix={state.state} dk={dk} dv={dv} tone={tone} active={isActive && stateReady} dimensions placeholder={!stateReady} layoutId={isActive && stateReady ? `recurrent-state-${targetMode}` : undefined} label={String.raw`S_t`} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <motion.div key={`recycle-${state.tokenIndex}-${stateReady}`} animate={isActive && stateReady ? { x: [0, 8, 0], opacity: [0.55, 1, 1] } : { x: 0, opacity: 0.65 }} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold ${colors.soft} ${colors.text}`}><Repeat2 size={12} /><MathFormula>{String.raw`S_t\rightarrow S_{t-1}\quad(t\!+\!1)`}</MathFormula></motion.div>
          <div className={`rounded-md px-2 py-1 text-[10px] ${colors.soft} ${colors.text}`}><MathFormula>{formula}</MathFormula></div>
        </div>
        {targetMode === 'gla' && (
          <label className="mt-2 grid grid-cols-[90px_minmax(120px,240px)_40px] items-center gap-2 text-[9px] font-bold text-cyan-800">
            <span>{t('gateStrength')}</span>
            <input type="range" min="0" max="0.9" step="0.05" value={gateStrength} onChange={(event) => setGateStrength(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-cyan-700" />
            <span className="font-mono">{Math.round(gateStrength * 100)}%</span>
          </label>
        )}
      </div>
    </div>
  );
}

function MemoryScale({ contextMode, targetMode, contextLength, dk, dv, state, t }) {
  const demoProgress = state ? (state.tokenIndex + 1) / DEMO_TOKENS : 1;
  const currentTokens = contextMode === 'decode' ? Math.max(1, Math.round(contextLength * demoProgress)) : contextLength;
  const softValue = contextMode === 'decode' ? currentTokens * (dk + dv) : contextLength * contextLength;
  const fullSoftValue = contextMode === 'decode' ? contextLength * (dk + dv) : softValue;
  const targetValue = targetMode === 'gla' ? dk * dv : dk * dv + dk;
  const maximum = Math.max(fullSoftValue, targetValue);
  const softWidth = Math.max(2.5, (softValue / maximum) * 100);
  const targetWidth = Math.max(2.5, (targetValue / maximum) * 100);
  const ratio = softValue / targetValue;
  const tone = targetMode === 'gla' ? 'cyan' : 'indigo';
  const rows = [
    { key: 'softmax', label: t('softmax'), value: softValue, width: softWidth, tone: 'rose', formula: contextMode === 'decode' ? FORMULAS.softmaxCurrentMemory : FORMULAS.softmaxScores },
    { key: targetMode, label: t(targetMode), value: targetValue, width: targetWidth, tone, formula: targetMode === 'gla' ? FORMULAS.glaMemory : FORMULAS.linearMemory },
  ];
  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-3" aria-label={t(contextMode === 'decode' ? 'persistentMemory' : 'logicalIntermediate')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{t(contextMode === 'decode' ? 'persistentMemory' : 'logicalIntermediate')} · {t('elements')}</span>
        <div className="flex items-center gap-3">
          {contextMode === 'decode' && <span className="font-mono text-[9px] text-slate-500"><MathFormula>{String.raw`n_t=\left\lceil\frac{t}{${DEMO_TOKENS}}N\right\rceil`}</MathFormula></span>}
          <span className="font-mono text-[10px] font-bold text-emerald-700"><MathFormula>{String.raw`${ratio.toFixed(1)}\times`}</MathFormula></span>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const colors = toneClasses[row.tone];
          return (
            <div key={row.key} className="grid grid-cols-[74px_minmax(0,1fr)_128px] items-center gap-2 text-[9px]">
              <span className={`truncate font-bold ${colors.text}`}>{row.label}</span>
              <div className="h-4 overflow-hidden rounded bg-slate-200/70">
                <motion.div data-memory-series={row.key} data-memory-token={currentTokens} initial={false} animate={{ width: `${row.width}%` }} transition={{ duration: 0.28 }} className={`h-full rounded ${colors.fill}`} />
              </div>
              <div className="flex items-center justify-end gap-1 font-mono text-slate-600"><MathFormula>{row.formula}</MathFormula><span>= {compactNumber(row.value)}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddressabilityStrip({ targetMode, gateStrength, t }) {
  const tone = targetMode === 'gla' ? 'cyan' : 'indigo';
  const colors = toneClasses[tone];
  return (
    <div className="grid items-center gap-3 border-t border-slate-200 px-3 py-3 md:grid-cols-[1fr_32px_1fr]" role="img" aria-label={t('compressionCostLead')}>
      <div className="flex items-center justify-center gap-2">
        <Search size={15} className="text-rose-600" />
        {['A', 'B', 'C'].map((label) => <div key={label} className={`flex h-10 w-16 items-center justify-center rounded-lg border font-mono text-[10px] font-bold ${label === 'B' ? 'border-rose-400 bg-rose-100 ring-2 ring-rose-100 text-rose-950' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>KV-{label}</div>)}
        <span className="text-[9px] font-bold text-rose-700">{t('addressable')}</span>
      </div>
      <ArrowRight size={17} className="mx-auto rotate-90 text-slate-400 md:rotate-0" />
      <div className="flex items-center justify-center gap-2">
        <div className="relative h-12 w-40">
          {['A', 'B', 'C'].map((label, index) => (
            <motion.div key={label} animate={{ left: `${18 + index * 22}%`, opacity: targetMode === 'gla' && index === 0 ? Math.max(0.2, 1 - gateStrength) : 1 }} className={`absolute top-1 flex h-10 w-16 items-center justify-center rounded-lg border text-[10px] font-bold ${colors.border} ${colors.soft} ${colors.text}`}><MathFormula>{String.raw`${label}\rightarrow S`}</MathFormula></motion.div>
          ))}
        </div>
        <Merge size={16} className={colors.text} />
        <span className={`text-[9px] font-bold ${colors.text}`}>{t('compressed')}</span>
      </div>
    </div>
  );
}

function DecodeBoard(props) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <SoftmaxGrowthLane {...props} />
      <RecurrentStateLane {...props} />
      <MemoryScale {...props} />
      <AddressabilityStrip {...props} />
    </div>
  );
}

function PrefillStageLane({ label, items, tone, step, phase, t }) {
  return (
    <div className="grid gap-2 lg:grid-cols-[92px_repeat(4,minmax(0,1fr))] lg:items-center">
      <div className={`text-[10px] font-bold ${toneClasses[tone].text}`}>{label}</div>
      {items.map((key, index) => {
        const active = phase !== 'done' && index === step;
        const passed = phase === 'done' || index < step;
        return (
          <motion.div
            key={key}
            data-prefill-stage={index}
            data-prefill-status={active ? 'active' : passed ? 'passed' : 'pending'}
            animate={active ? { y: [0, -3, 0] } : { y: 0 }}
            className={`rounded-lg border px-2 py-2 text-center text-[9px] font-semibold transition ${active ? `${toneClasses[tone].border} ${toneClasses[tone].soft} ${toneClasses[tone].text} ring-2 ${toneClasses[tone].ring}` : passed ? 'border-slate-200 bg-white text-slate-600' : 'border-slate-200 bg-slate-100 text-slate-400 opacity-55'}`}
          >
            {t(key)}
          </motion.div>
        );
      })}
    </div>
  );
}

function PrefillBoard({ targetMode, contextLength, dk, dv, state, step, phase, t }) {
  const tone = targetMode === 'gla' ? 'cyan' : 'indigo';
  const targetStages = targetMode === 'gla'
    ? ['prefillGla0', 'prefillGla1', 'prefillGla2', 'prefillGla3']
    : ['prefillLinear0', 'prefillLinear1', 'prefillLinear2', 'prefillLinear3'];
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 border-b border-slate-200 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <div>
            <div className="text-sm font-bold text-slate-950">{t('softmax')}</div>
            <div className="text-[10px] font-bold text-rose-700"><MathFormula>{String.raw`N\times N`}</MathFormula></div>
          </div>
          <div className="mx-auto grid w-full max-w-[250px] grid-cols-8 gap-1" role="img" aria-label={t('softmaxPrefillVisual')}>
            {Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, column) => {
              const visible = column <= row;
              const active = step >= 1 && row === Math.min(7, step * 2 + 1) && visible;
              return <motion.div key={`${row}-${column}`} animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }} className={`aspect-square rounded-sm ${active ? 'bg-rose-500' : visible ? 'bg-rose-200' : 'bg-slate-100'}`} />;
            }))}
          </div>
        </div>

        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <div>
            <div className="text-sm font-bold text-slate-950">{t(targetMode)}</div>
            <div className={`text-[10px] font-bold ${toneClasses[tone].text}`}><MathFormula>{String.raw`d_k\times d_v`}</MathFormula></div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_24px_150px] items-center gap-2">
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }, (_, index) => <motion.div key={index} animate={step === 1 || step === 2 ? { x: [0, 4, 0] } : { x: 0 }} transition={{ delay: index * 0.03 }} className={`rounded-md border px-1 py-2 text-center text-[9px] font-bold ${toneClasses[tone].border} ${toneClasses[tone].soft} ${toneClasses[tone].text}`}><MathFormula>{String.raw`C_{${index + 1}}`}</MathFormula></motion.div>)}
            </div>
            <ArrowRight size={18} className={toneClasses[tone].text} />
            <MatrixGlyph matrix={targetMode === 'gla' ? state.state : state.plainState} dk={dk} dv={dv} tone={tone} active={step === 2 || step === 3} dimensions label={String.raw`S`} />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200 bg-slate-50/80 p-3">
        <div className="mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"><ScanLine size={12} />{t('stageProgress')}</div>
        <PrefillStageLane label={t('softmax')} items={['prefillSoftmax0', 'prefillSoftmax1', 'prefillSoftmax2', 'prefillSoftmax3']} tone="rose" step={step} phase={phase} t={t} />
        <PrefillStageLane label={t(targetMode)} items={targetStages} tone={tone} step={step} phase={phase} t={t} />
      </div>
      <MemoryScale contextMode="prefill" targetMode={targetMode} contextLength={contextLength} dk={dk} dv={dv} state={state} t={t} />
    </div>
  );
}

export function ArchitectureComparison({ contextMode, onSelectContext, targetMode, activeMode, contextLength, dk, dv, state, step, phase, gateStrength, setGateStrength, t }) {
  const sharedProps = { contextMode, targetMode, activeMode, contextLength, dk, dv, state, step, phase, gateStrength, setGateStrength, t };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={t('architectureTitle')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Boxes size={16} /></div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">{t('designLevel')}</div>
            <h2 className="mt-1 text-base font-bold text-slate-950">{t('architectureShortTitle')}</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">{t('architectureLead')}</p>
          </div>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('executionContext')}>
          {['decode', 'prefill'].map((value) => <button key={value} type="button" onClick={() => onSelectContext(value)} aria-pressed={contextMode === value} className={`linear-focus rounded-lg px-4 py-2 text-[11px] font-bold transition ${contextMode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(value)}</button>)}
        </div>
      </div>
      {contextMode === 'decode' ? <DecodeBoard {...sharedProps} /> : <PrefillBoard {...sharedProps} />}
    </section>
  );
}
