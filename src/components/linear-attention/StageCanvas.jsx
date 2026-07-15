import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, Check, Cpu, GitCompareArrows, Layers3, Zap } from 'lucide-react';
import { FORMULAS, TRACKS } from './model';
import { MathFormula } from './MathFormula';

const modeTone = {
  exact: {
    active: 'border-rose-300 bg-rose-50 shadow-[0_0_22px_rgba(244,63,94,.13)]',
    badge: 'bg-rose-500 text-white',
    bar: 'bg-rose-500',
    text: 'text-rose-700',
  },
  linear: {
    active: 'border-indigo-300 bg-indigo-50 shadow-[0_0_22px_rgba(99,102,241,.14)]',
    badge: 'bg-indigo-600 text-white',
    bar: 'bg-indigo-600',
    text: 'text-indigo-700',
  },
  gla: {
    active: 'border-cyan-400 bg-cyan-50 shadow-[0_0_22px_rgba(14,116,144,.16)]',
    badge: 'bg-cyan-700 text-white',
    bar: 'bg-cyan-700',
    text: 'text-cyan-800',
  },
};

const canvasFormulas = {
  exact: [
    String.raw`q_t,\ k_t,\ v_t`,
    String.raw`s_{tj}=\frac{q_t^\top k_j}{\sqrt{d_k}}`,
    String.raw`a_t=\operatorname{softmax}(s_t)`,
    String.raw`o_t=\sum_j a_{tj}v_j`,
  ],
  linear: [
    String.raw`\bar k_t=\phi(k_t)`,
    String.raw`\Delta S_t=\bar k_t v_t^\top`,
    String.raw`S_t=S_{t-1}+\Delta S_t`,
    String.raw`o_t=n_t/d_t`,
  ],
  gla: [
    String.raw`\bar k_t,\ \alpha_t`,
    String.raw`\widetilde S_{t-1}=\operatorname{Diag}(\alpha_t)S_{t-1}`,
    String.raw`S_t=\widetilde S+\Delta S_t`,
    String.raw`o_t=n_t/d_t`,
  ],
};

function SmallVector({ values, label, tone = 'indigo', active = false }) {
  const palette = tone === 'cyan'
    ? 'border-cyan-300 bg-cyan-100 text-cyan-950'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-100 text-amber-950'
    : tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-950'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-100 text-rose-950'
        : 'border-indigo-200 bg-indigo-100 text-indigo-950';
  return (
    <div>
      <div className="mb-1.5 truncate text-[10px] font-bold text-slate-600">{label}</div>
      <div className="grid grid-cols-4 gap-1">
        {values.slice(0, 4).map((value, index) => (
          <motion.div
            key={index}
            animate={active ? { y: [0, -2, 0] } : { y: 0 }}
            transition={active ? { delay: index * 0.04, duration: 0.3 } : { duration: 0 }}
            className={`rounded border px-0.5 py-1.5 text-center font-mono text-[9px] font-bold ${palette}`}
          >
            {Number(value).toFixed(1)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SmallMatrix({ matrix, label, tone = 'indigo', active = false, retention }) {
  const palette = tone === 'cyan'
    ? 'border-cyan-300 bg-cyan-100 text-cyan-950'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-100 text-amber-950'
    : tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-950'
      : tone === 'rose'
        ? 'border-rose-200 bg-rose-100 text-rose-950'
        : 'border-indigo-200 bg-indigo-100 text-indigo-950';
  return (
    <div>
      <div className="mb-1.5 text-center text-[10px] font-bold text-slate-600">{label}</div>
      <div className="mx-auto grid w-full max-w-[142px] grid-cols-4 gap-1">
        {matrix.slice(0, 4).flatMap((row, rowIndex) => row.slice(0, 4).map((value, columnIndex) => (
          <motion.div
            key={`${rowIndex}-${columnIndex}`}
            animate={active ? { scale: [1, 1.05, 1], opacity: retention ? Math.max(0.22, retention[rowIndex]) : 1 } : { scale: 1, opacity: retention ? Math.max(0.22, retention[rowIndex]) : 1 }}
            transition={active ? { delay: (rowIndex * 4 + columnIndex) * 0.012, duration: 0.28 } : { duration: 0 }}
            className={`flex h-7 items-center justify-center rounded border px-0.5 font-mono text-[9px] font-bold ${palette}`}
          >
            {Number(value).toFixed(1)}
          </motion.div>
        )))}
      </div>
    </div>
  );
}

function FormulaLine({ formula }) {
  return <div className="flex min-h-[42px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white/80 px-1.5 py-2 text-center text-[11px] text-slate-900"><MathFormula className="whitespace-nowrap">{formula}</MathFormula></div>;
}

function StageNode({ mode, index, step, phase, state, label, formula, onSelect, t, children }) {
  const sequenceDone = phase === 'done';
  const passed = index < step && !sequenceDone;
  const active = index === step && phase !== 'done';
  const tone = modeTone[mode];
  const surface = active
    ? tone.active
    : sequenceDone
      ? 'border-emerald-200 bg-emerald-50/40 opacity-70'
      : passed
        ? 'border-slate-200 bg-white opacity-55'
      : 'border-slate-200 bg-slate-100/80 opacity-45 grayscale';
  return (
    <motion.article data-stage-index={index} data-stage-status={active ? 'active' : sequenceDone ? 'complete' : passed ? 'passed' : 'pending'} animate={active ? { y: -2 } : { y: 0 }} transition={{ duration: 0.2 }} className={`relative h-full min-w-0 rounded-2xl border p-3 transition ${surface}`}>
      {active && <motion.div className={`absolute inset-x-3 top-0 h-0.5 rounded-full ${tone.bar}`} layoutId={`active-stage-${mode}`} />}
      <button type="button" onClick={() => onSelect(index)} aria-current={active ? 'step' : undefined} className="linear-focus w-full rounded-lg text-left">
        <div className="flex min-h-[32px] items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${sequenceDone ? 'bg-emerald-500 text-white' : passed ? 'bg-slate-300 text-slate-700' : active ? tone.badge : 'bg-slate-200 text-slate-500'}`}>
            {sequenceDone || passed ? <Check size={13} /> : index + 1}
          </span>
          <span className="min-w-0 flex-1 text-[11px] font-bold leading-4 text-slate-900">{label}</span>
        </div>
        <div className="mt-2 text-[9px] font-semibold text-slate-500">
          {sequenceDone ? t('stageComplete') : passed ? t('stagePassed') : active ? `${t('tokenPrefix')}${state.tokenIndex + 1} · ${index + 1}/${TRACKS[mode].length}` : t('stagePending')}
        </div>
      </button>
      <div className="mt-3 space-y-3">
        <FormulaLine formula={formula} />
        {children(active)}
      </div>
    </motion.article>
  );
}

function StageConnector({ reached, mode }) {
  const color = reached ? mode === 'gla' ? 'text-cyan-700' : mode === 'exact' ? 'text-rose-500' : 'text-indigo-500' : 'text-slate-300';
  return (
    <div className={`flex items-center justify-center ${color}`} aria-hidden="true">
      <motion.div animate={reached ? { x: [0, 3, 0] } : { x: 0 }} transition={reached ? { duration: 0.45 } : { duration: 0 }}>
        <ArrowRight size={19} className="hidden lg:block" />
        <ArrowDown size={19} className="my-1 lg:hidden" />
      </motion.div>
    </div>
  );
}

function ScoreBars({ values, active, tone = 'indigo' }) {
  const recent = values.slice(-5);
  const bar = tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div className="space-y-2">
      {recent.map((value, index) => (
        <div key={index} className="grid grid-cols-[24px_1fr_30px] items-center gap-1.5 text-[9px] font-semibold text-slate-500">
          <span>t{Math.max(1, values.length - recent.length + index + 1)}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <motion.div animate={{ width: `${Math.max(8, Math.min(100, 38 + Math.abs(value) * 42))}%` }} transition={{ duration: active ? 0.24 : 0 }} className={`h-full rounded-full ${bar}`} />
          </div>
          <span className="text-right font-mono">{Number(value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function CausalGrid({ size = 6, activeRow = 0, active }) {
  return (
    <div className="mx-auto grid w-full max-w-[132px] gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))` }}>
      {Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => {
        const allowed = column <= row;
        const highlighted = row === activeRow && allowed;
        return <motion.div key={`${row}-${column}`} animate={active && highlighted ? { scale: [1, 1.14, 1] } : { scale: 1 }} transition={{ delay: column * 0.025, duration: 0.28 }} className={`aspect-square rounded-sm ${highlighted ? 'bg-indigo-500' : allowed ? 'bg-indigo-200' : 'bg-slate-200'}`} />;
      }))}
    </div>
  );
}

function ExactStages({ state, activeIndex }) {
  return [
    (active) => <div className="space-y-2"><SmallVector values={state.query} label={<MathFormula>{String.raw`q_t`}</MathFormula>} tone="rose" active={active} /><SmallVector values={state.key} label={<MathFormula>{String.raw`k_t`}</MathFormula>} active={active} /><SmallVector values={state.value} label={<MathFormula>{String.raw`v_t`}</MathFormula>} tone="emerald" active={active} /></div>,
    (active) => <div><div className="mb-2 text-[10px] font-bold text-slate-600"><MathFormula>{String.raw`q_tK_{\le t}^{\top}`}</MathFormula></div><ScoreBars values={state.scores} active={active} tone="rose" /></div>,
    (active) => <div className="space-y-3"><CausalGrid size={6} activeRow={Math.min(5, state.currentSampleRow)} active={active} /><ScoreBars values={state.weights} active={active} /></div>,
    (active) => <div className="space-y-3"><ScoreBars values={state.weights} active={active} /><SmallVector values={state.exactOutput} label={<MathFormula>{String.raw`o_t`}</MathFormula>} tone="emerald" active={active} /></div>,
  ][activeIndex];
}

function LinearStages({ state, activeIndex }) {
  return [
    (active) => <div className="space-y-3"><SmallVector values={state.key} label={<MathFormula>{String.raw`k_t`}</MathFormula>} active={active} /><SmallVector values={state.phiKey} label={<MathFormula>{String.raw`\phi(k_t)`}</MathFormula>} tone="emerald" active={active} /></div>,
    (active) => <SmallMatrix matrix={state.update} label={<MathFormula>{String.raw`\Delta S_t`}</MathFormula>} tone="amber" active={active} />,
    (active) => <div className="space-y-3"><SmallMatrix matrix={state.state} label={<MathFormula>{String.raw`S_t`}</MathFormula>} active={active} /><SmallVector values={state.normalizer} label={<MathFormula>{String.raw`z_t`}</MathFormula>} tone="amber" active={active} /></div>,
    (active) => <div className="space-y-3"><SmallVector values={state.numerator} label={<MathFormula>{String.raw`\phi(q_t)^\top S_t`}</MathFormula>} active={active} /><div className="rounded-lg border border-amber-200 bg-amber-100 px-2 py-2 text-center text-sm font-bold text-amber-950"><MathFormula>{`d_t=${state.denominator.toFixed(2)}`}</MathFormula></div><SmallVector values={state.linearOutput} label={<MathFormula>{String.raw`o_t`}</MathFormula>} tone="emerald" active={active} /></div>,
  ][activeIndex];
}

function GlaStages({ state, activeIndex, t }) {
  return [
    (active) => <div className="space-y-3"><SmallVector values={state.phiKey} label={<MathFormula>{String.raw`\phi(k_t)`}</MathFormula>} tone="emerald" active={active} /><SmallVector values={state.retention} label={<MathFormula>{String.raw`\alpha_t`}</MathFormula>} tone="cyan" active={active} /></div>,
    (active) => <div className="space-y-3"><SmallMatrix matrix={state.previousState} label={<MathFormula>{String.raw`S_{t-1}`}</MathFormula>} active={active} /><SmallMatrix matrix={state.decayedState} label={<MathFormula>{String.raw`\operatorname{Diag}(\alpha_t)S_{t-1}`}</MathFormula>} tone="cyan" active={active} retention={state.retention} /></div>,
    (active) => <div className="space-y-3"><SmallMatrix matrix={state.update} label={<MathFormula>{String.raw`\Delta S_t`}</MathFormula>} tone="cyan" active={active} /><SmallMatrix matrix={state.state} label={<MathFormula>{String.raw`S_t`}</MathFormula>} tone="emerald" active={active} /></div>,
    (active) => <div className="space-y-3"><SmallVector values={state.plainOutput} label={t('plainOutput')} tone="rose" active={active} /><SmallVector values={state.linearOutput} label={t('gatedOutput')} tone="emerald" active={active} /></div>,
  ][activeIndex];
}

function GlaRelation({ gateStrength, setGateStrength, t }) {
  return (
    <div className="grid gap-3 rounded-xl border border-cyan-300 bg-cyan-50/70 p-3 lg:grid-cols-[1fr_230px] lg:items-center">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-950"><GitCompareArrows size={15} />{t('glaRelationTitle')}</div>
        <p className="mt-1 text-[10px] leading-4 text-cyan-950/75">{t('glaRelationLead')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="rounded-lg bg-white px-2 py-1 text-indigo-700"><MathFormula>{FORMULAS.state}</MathFormula></span>
          <ArrowRight size={14} className="text-cyan-700" />
          <span className="rounded-lg bg-white px-2 py-1 text-cyan-800"><MathFormula>{FORMULAS.gatedState}</MathFormula></span>
        </div>
      </div>
      <label className="block rounded-lg bg-white p-2.5 text-[10px] font-bold text-slate-600">
        <span className="mb-2 flex items-center justify-between"><span>{t('gateStrength')}</span><span className="font-mono text-cyan-800">{Math.round(gateStrength * 100)}%</span></span>
        <input type="range" min="0" max="0.9" step="0.05" value={gateStrength} onChange={(event) => setGateStrength(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-cyan-700" />
      </label>
    </div>
  );
}

export function StageCanvas({ mode, step, state, t, gateStrength, setGateStrength, onSelectStep, isPlaying, phase }) {
  const track = TRACKS[mode];
  const formulas = canvasFormulas[mode];
  const renderStage = mode === 'exact' ? ExactStages : mode === 'linear' ? LinearStages : GlaStages;

  return (
    <div className="space-y-4" role="group" aria-label={t('pipelineTitle')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">{t('pipelineTitle')}</div>
          <p className="mt-1 text-[11px] text-slate-500">{t('pipelineRule')}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${modeTone[mode].bar}`} />{t('activeStageLegend')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />{t('stagePassed')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />{t('stagePending')}</span>
        </div>
      </div>

      {mode === 'gla' && <GlaRelation gateStrength={gateStrength} setGateStrength={setGateStrength} t={t} />}

      <div className="grid items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_22px_minmax(0,1fr)_22px_minmax(0,1fr)_22px_minmax(0,1fr)]">
        {track.map((key, index) => (
          <React.Fragment key={key}>
            <StageNode mode={mode} index={index} step={step} phase={phase} state={state} label={t(key)} formula={formulas[index]} onSelect={onSelectStep} t={t}>
              {(active) => renderStage({ state, activeIndex: index, t })(active)}
            </StageNode>
            {index < track.length - 1 && <StageConnector reached={index < step || phase === 'done'} mode={mode} />}
          </React.Fragment>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-600"><span>{isPlaying ? t('pipelineRunning') : t('pipelinePaused')}</span><span className="text-right"><span className="font-mono">{t('tokenPrefix')}{state.tokenIndex + 1} / {state.n}</span> · {t(track[step])} {step + 1}/{track.length}</span></div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }, (_, index) => {
            const token = Math.round(index * (state.n - 1) / 7);
            const completed = phase === 'done' || token < state.tokenIndex;
            const current = phase !== 'done' && Math.abs(token - state.tokenIndex) <= Math.max(0, Math.floor(state.n / 16));
            return <div key={index} className={`h-2 rounded-full transition ${current ? modeTone[mode].bar : completed ? 'bg-emerald-300' : 'bg-slate-200'}`} />;
          })}
        </div>
      </div>
    </div>
  );
}

export function ModeMetric({ mode, state, t }) {
  const config = mode === 'exact'
    ? { icon: Layers3, label: t('scoreStorage'), value: `${state.scoreCells.toLocaleString()} · ${state.exactScoreBytes < 1024 ? `${state.exactScoreBytes} B` : `${(state.exactScoreBytes / 1024).toFixed(1)} KB`}`, detail: t('exactMetric'), tone: 'rose' }
    : { icon: mode === 'gla' ? Zap : Cpu, label: t('recurrentStorage'), value: `${state.dk}×${state.dv} + ${state.dk}`, detail: t(mode === 'gla' ? 'glaMetric' : 'linearMetric'), tone: mode === 'gla' ? 'cyan' : 'indigo' };
  const Icon = config.icon;
  const tone = config.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-900' : config.tone === 'cyan' ? 'border-cyan-300 bg-cyan-50 text-cyan-950' : 'border-indigo-200 bg-indigo-50 text-indigo-900';
  return <div className={`rounded-xl border px-3 py-2.5 ${tone}`}><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]"><Icon size={13} />{config.label}</div><div className="mt-1 font-mono text-sm font-bold">{config.value}</div><div className="mt-1 text-[10px] leading-4 opacity-80">{config.detail}</div></div>;
}
