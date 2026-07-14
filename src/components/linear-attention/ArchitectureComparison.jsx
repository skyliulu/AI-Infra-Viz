import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Database, Merge, Repeat2, ScanLine, Search, Zap } from 'lucide-react';
import { MathFormula } from './MathFormula';

const FORMULAS = {
  softmaxMemory: String.raw`2Nd_k`,
  linearMemory: String.raw`d_kd_v+d_k`,
  softmaxScores: String.raw`N^2`,
  linearState: String.raw`S_t=S_{t-1}+\phi(k_t)v_t^\top`,
  glaState: String.raw`S_t=\operatorname{Diag}(\alpha_t)S_{t-1}+\phi(k_t)v_t^\top`,
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
};

function MatrixGlyph({ matrix, dk, dv, tone = 'indigo', active = false, dimensions = false, label, compact = false }) {
  const colors = toneClasses[tone];
  const cells = matrix.slice(0, 4).flatMap((row) => row.slice(0, 4));
  return (
    <div className="min-w-0">
      {label && <div className={`mb-1.5 text-center text-[10px] font-bold ${colors.text}`}><MathFormula>{label}</MathFormula></div>}
      <div className={dimensions ? 'grid grid-cols-[24px_1fr] items-center gap-1' : ''}>
        {dimensions && <div className="-rotate-90 whitespace-nowrap text-center text-[9px] text-slate-500"><MathFormula>{String.raw`d_k=${dk}`}</MathFormula></div>}
        <div>
          {dimensions && <div className="mb-1 text-center text-[9px] text-slate-500"><MathFormula>{String.raw`d_v=${dv}`}</MathFormula></div>}
          <motion.div
            animate={active ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            className={`grid grid-cols-4 gap-1 rounded-lg border p-1.5 transition ${colors.border} ${colors.soft} ${active ? `ring-4 ${colors.ring}` : ''}`}
          >
            {cells.map((value, index) => {
              const intensity = Math.min(1, 0.28 + Math.abs(value) / 2.6);
              return (
                <motion.div
                  key={index}
                  animate={{ opacity: intensity }}
                  className={`flex ${compact ? 'h-5' : 'h-7'} items-center justify-center rounded border font-mono text-[8px] font-bold ${colors.cell}`}
                >
                  {Number(value).toFixed(1)}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SoftmaxGrowthLane({ contextLength, dk, dv, state, step, t }) {
  const filled = Math.min(DEMO_TOKENS, state.tokenIndex + 1);
  const reading = step === 1 || step === 2;
  return (
    <div className="grid gap-4 border-b border-slate-200 px-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center" data-architecture-lane="softmax-decode">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><Database size={17} /></div>
        <div>
          <div className="text-sm font-bold text-slate-950">Softmax</div>
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

function RecurrentStateLane({ targetMode, dk, dv, state, step, gateStrength, setGateStrength, t }) {
  const tone = targetMode === 'gla' ? 'amber' : 'indigo';
  const colors = toneClasses[tone];
  const oldTerm = targetMode === 'gla' && step >= 1 ? state.decayedState : state.previousState;
  const displayedState = step >= 2 ? state.state : oldTerm;
  const formula = targetMode === 'gla' ? FORMULAS.glaState : FORMULAS.linearState;
  return (
    <div className="grid gap-4 px-3 py-4 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-center" data-architecture-lane={`${targetMode}-decode`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.soft} ${colors.text}`}>{targetMode === 'gla' ? <Zap size={17} /> : <Repeat2 size={17} />}</div>
        <div>
          <div className="text-sm font-bold text-slate-950">{t(targetMode)}</div>
          <div className={`text-[10px] font-bold ${colors.text}`}><MathFormula>{String.raw`S_{${state.tokenIndex + 1}}`}</MathFormula></div>
        </div>
      </div>

      <div>
        <div className="grid items-center gap-2 sm:grid-cols-[minmax(105px,1fr)_22px_minmax(105px,1fr)_28px_minmax(125px,1.15fr)]">
          <MatrixGlyph matrix={oldTerm} dk={dk} dv={dv} tone={tone} compact active={step === 0 || (targetMode === 'gla' && step === 1)} label={targetMode === 'gla' ? String.raw`\operatorname{Diag}(\alpha_t)S_{t-1}` : String.raw`S_{t-1}`} />
          <div className={`text-center text-xl font-light ${colors.text}`}>+</div>
          <motion.div key={`update-${state.tokenIndex}`} initial={{ x: -14, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <MatrixGlyph matrix={state.update} dk={dk} dv={dv} tone={tone} compact active={step === 1} label={String.raw`\phi(k_t)v_t^\top`} />
          </motion.div>
          <ArrowRight className={`mx-auto ${colors.text}`} size={20} />
          <MatrixGlyph matrix={displayedState} dk={dk} dv={dv} tone={tone} active={step >= 2} dimensions label={String.raw`S_t`} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-[9px] font-bold ${colors.text}`}><Repeat2 size={12} /><MathFormula>{String.raw`S_t\rightarrow S_{t-1}\quad(t\!+\!1)`}</MathFormula></div>
          <div className={`rounded-md px-2 py-1 text-[10px] ${colors.soft} ${colors.text}`}><MathFormula>{formula}</MathFormula></div>
        </div>
        {targetMode === 'gla' && (
          <label className="mt-2 grid grid-cols-[90px_minmax(120px,240px)_40px] items-center gap-2 text-[9px] font-bold text-amber-800">
            <span>{t('gateStrength')}</span>
            <input type="range" min="0" max="0.9" step="0.05" value={gateStrength} onChange={(event) => setGateStrength(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-amber-500" />
            <span className="font-mono">{Math.round(gateStrength * 100)}%</span>
          </label>
        )}
      </div>
    </div>
  );
}

function MemoryScale({ contextMode, targetMode, contextLength, dk, dv, t }) {
  const softValue = contextMode === 'decode' ? 2 * contextLength * dk : contextLength * contextLength;
  const targetValue = dk * dv + dk;
  const maximum = Math.max(softValue, targetValue);
  const softWidth = Math.max(2.5, (softValue / maximum) * 100);
  const targetWidth = Math.max(2.5, (targetValue / maximum) * 100);
  const ratio = softValue / targetValue;
  const tone = targetMode === 'gla' ? 'amber' : 'indigo';
  const rows = [
    { key: 'softmax', label: 'Softmax', value: softValue, width: softWidth, tone: 'rose', formula: contextMode === 'decode' ? FORMULAS.softmaxMemory : FORMULAS.softmaxScores },
    { key: targetMode, label: t(targetMode), value: targetValue, width: targetWidth, tone, formula: FORMULAS.linearMemory },
  ];
  return (
    <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-3" aria-label={t(contextMode === 'decode' ? 'persistentMemory' : 'logicalIntermediate')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{t(contextMode === 'decode' ? 'persistentMemory' : 'logicalIntermediate')} · {t('elements')}</span>
        <span className="font-mono text-[10px] font-bold text-emerald-700">{ratio.toFixed(1)}×</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const colors = toneClasses[row.tone];
          return (
            <div key={row.key} className="grid grid-cols-[74px_minmax(0,1fr)_128px] items-center gap-2 text-[9px]">
              <span className={`truncate font-bold ${colors.text}`}>{row.label}</span>
              <div className="h-4 overflow-hidden rounded bg-slate-200/70">
                <motion.div data-memory-series={row.key} initial={false} animate={{ width: `${row.width}%` }} className={`h-full rounded ${colors.fill}`} />
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
  const tone = targetMode === 'gla' ? 'amber' : 'indigo';
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
  const tone = targetMode === 'gla' ? 'amber' : 'indigo';
  const targetStages = targetMode === 'gla'
    ? ['prefillGla0', 'prefillGla1', 'prefillGla2', 'prefillGla3']
    : ['prefillLinear0', 'prefillLinear1', 'prefillLinear2', 'prefillLinear3'];
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 border-b border-slate-200 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <div>
            <div className="text-sm font-bold text-slate-950">Softmax</div>
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
        <PrefillStageLane label="Softmax" items={['prefillSoftmax0', 'prefillSoftmax1', 'prefillSoftmax2', 'prefillSoftmax3']} tone="rose" step={step} phase={phase} t={t} />
        <PrefillStageLane label={t(targetMode)} items={targetStages} tone={tone} step={step} phase={phase} t={t} />
      </div>
      <MemoryScale contextMode="prefill" targetMode={targetMode} contextLength={contextLength} dk={dk} dv={dv} t={t} />
    </div>
  );
}

export function ArchitectureComparison({ contextMode, onSelectContext, targetMode, contextLength, dk, dv, state, step, phase, gateStrength, setGateStrength, t }) {
  const sharedProps = { contextMode, targetMode, contextLength, dk, dv, state, step, phase, gateStrength, setGateStrength, t };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={t('architectureTitle')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes size={15} className="text-indigo-600" />
          <h2 className="text-base font-bold text-slate-950">{t('architectureShortTitle')}</h2>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('executionContext')}>
          {['decode', 'prefill'].map((value) => <button key={value} type="button" onClick={() => onSelectContext(value)} aria-pressed={contextMode === value} className={`linear-focus rounded-lg px-4 py-2 text-[11px] font-bold transition ${contextMode === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(value)}</button>)}
        </div>
      </div>
      {contextMode === 'decode' ? <DecodeBoard {...sharedProps} /> : <PrefillBoard {...sharedProps} />}
    </section>
  );
}
