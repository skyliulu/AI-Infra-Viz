import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Globe, Pause, Play, RotateCcw, Sigma, SkipForward, Workflow } from 'lucide-react';
import { getInitialLang, i18n } from './linear-attention/content';
import { getAttentionState, TRACKS } from './linear-attention/model';
import { ArchitectureComparison } from './linear-attention/ArchitectureComparison';
import { Inspector } from './linear-attention/Inspector';
import { StageCanvas } from './linear-attention/StageCanvas';

const CONTEXT_OPTIONS = [16, 64, 256, 1024, 4096, 16384];
const D_OPTIONS = [16, 32, 64, 128];
const DEMO_N = 8;

function LinearAttention() {
  const [lang, setLang] = useState(getInitialLang);
  const [targetMode, setTargetMode] = useState('linear');
  const [detailMode, setDetailMode] = useState('linear');
  const [contextMode, setContextMode] = useState('decode');
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [contextLength, setContextLength] = useState(1024);
  const [dk, setDk] = useState(32);
  const [dv, setDv] = useState(32);
  const [tokenIndex, setTokenIndex] = useState(0);
  const [gateStrength, setGateStrength] = useState(0.45);
  const t = (key) => i18n[lang][key] ?? key;
  const detailTrack = TRACKS[detailMode];
  const isDone = phase === 'done';

  const detailState = useMemo(() => getAttentionState({
    mode: detailMode, step, tokenIndex, n: DEMO_N, dk, dv, gateStrength,
  }), [detailMode, step, tokenIndex, dk, dv, gateStrength]);

  const comparisonState = useMemo(() => getAttentionState({
    mode: targetMode,
    step,
    tokenIndex: contextMode === 'prefill' ? Math.min(4, DEMO_N - 1) : tokenIndex,
    n: DEMO_N,
    dk,
    dv,
    gateStrength,
  }), [targetMode, contextMode, step, tokenIndex, dk, dv, gateStrength]);

  const handleNextStep = () => {
    if (isDone) return;
    setPhase('running');
    if (contextMode === 'prefill') {
      if (step < 3) {
        setStep((current) => current + 1);
        return;
      }
      setPhase('done');
      setIsPlaying(false);
      return;
    }
    if (step < detailTrack.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (tokenIndex < DEMO_N - 1) {
      setTokenIndex((current) => current + 1);
      setStep(0);
      return;
    }
    setPhase('done');
    setIsPlaying(false);
  };

  const reset = () => {
    setPhase('idle');
    setStep(0);
    setTokenIndex(0);
    setIsPlaying(false);
    setGateStrength(0.45);
  };

  const togglePlay = () => {
    if (isDone) {
      reset();
      setIsPlaying(true);
      return;
    }
    setPhase('running');
    setIsPlaying((current) => !current);
  };

  useEffect(() => {
    if (!isPlaying || isDone) return undefined;
    const delay = contextMode === 'prefill' ? 720 : step === detailTrack.length - 1 ? 280 : 170;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, isDone, contextMode, tokenIndex, step, detailMode, detailTrack.length]);

  const selectTargetMode = (nextMode) => {
    setTargetMode(nextMode);
    setDetailMode(nextMode);
    setStep(0);
    setTokenIndex(0);
    setPhase('idle');
    setIsPlaying(false);
  };

  const selectContextMode = (nextContext) => {
    setContextMode(nextContext);
    setDetailMode(targetMode);
    setStep(0);
    setTokenIndex(0);
    setPhase('idle');
    setIsPlaying(false);
  };

  const selectDetailMode = (nextMode) => {
    setDetailMode(nextMode);
    setStep(0);
    setTokenIndex(0);
    setPhase('idle');
    setIsPlaying(false);
  };

  const selectStep = (nextStep) => {
    setStep(nextStep);
    setPhase('running');
    setIsPlaying(false);
  };

  const selectToken = (nextToken) => {
    setTokenIndex(nextToken);
    setStep(0);
    setPhase('running');
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-800 sm:p-4 lg:p-5">
      <style>{'.linear-focus:focus-visible{outline:3px solid rgba(99,102,241,.35);outline-offset:2px}@media(prefers-reduced-motion:reduce){.linear-lab *,.linear-lab *::before,.linear-lab *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}'}</style>
      <div className="linear-lab mx-auto max-w-[1560px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Sigma size={20} /></div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{t('title')}</h1>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">{t('subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('comparisonTarget')}>
                {['linear', 'gla'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectTargetMode(value)}
                    aria-pressed={targetMode === value}
                    className={`linear-focus rounded-lg px-4 py-2 text-[11px] font-bold transition ${targetMode === value ? value === 'gla' ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {t('softmaxVs')} {t(value)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button type="button" onClick={reset} title={t('reset')} aria-label={t('reset')} className="linear-focus rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><RotateCcw size={16} /></button>
                <button type="button" onClick={togglePlay} title={isPlaying ? t('pause') : t('play')} aria-label={isPlaying ? t('pause') : t('play')} className="linear-focus rounded-lg bg-indigo-600 p-2 text-white transition hover:bg-indigo-700">{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
                <button type="button" onClick={handleNextStep} title={t('next')} aria-label={t('next')} className="linear-focus rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><SkipForward size={16} /></button>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                <Globe size={14} className="ml-1 text-slate-400" />
                {['zh', 'en'].map((value) => <button key={value} type="button" onClick={() => setLang(value)} aria-pressed={lang === value} className={`linear-focus rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${lang === value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{t(value)}</button>)}
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Gauge size={13} />{t('experiment')}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['contextLength', t('contextLength'), contextLength, CONTEXT_OPTIONS, setContextLength],
              ['dk', t('keyDim'), dk, D_OPTIONS, setDk],
              ['dv', t('valueDim'), dv, D_OPTIONS, setDv],
            ].map(([id, label, value, options, setter]) => (
              <label key={id} className="block text-[10px] font-semibold text-slate-500">
                <span className="mb-1.5 block truncate">{label}</span>
                <select value={value} onChange={(event) => setter(Number(event.target.value))} className="linear-focus w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800">
                  {options.map((option) => <option key={option} value={option}>{option.toLocaleString()}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>

        {contextMode === 'decode' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-shared-timeline>
            <div className="grid gap-4 xl:grid-cols-[minmax(300px,1fr)_minmax(340px,1.2fr)] xl:items-end">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <motion.span key={`${detailMode}-${tokenIndex}`} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`h-2.5 w-2.5 rounded-full ${detailMode === 'gla' ? 'bg-cyan-700' : detailMode === 'exact' ? 'bg-rose-500' : 'bg-indigo-600'} shadow-[0_0_12px_currentColor]`} />
                    {t('currentToken')}
                  </div>
                  <div className="font-mono text-xs font-bold text-indigo-700">{t('tokenPrefix')}{tokenIndex + 1} / {DEMO_N}</div>
                </div>
                <input type="range" min="0" max={DEMO_N - 1} step="1" value={tokenIndex} aria-label={t('currentToken')} onChange={(event) => selectToken(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-indigo-600" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500">
                  <span>{t(detailTrack[step])}</span>
                  <span className="font-mono">{step + 1} / {detailTrack.length}</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: DEMO_N }, (_, index) => <button key={index} type="button" onClick={() => selectToken(index)} className={`linear-focus rounded-md px-1 py-1.5 font-mono text-[9px] font-bold transition ${tokenIndex === index ? detailMode === 'gla' ? 'bg-cyan-700 text-white' : detailMode === 'exact' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white' : index < tokenIndex ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{t('tokenPrefix')}{index + 1}</button>)}
                </div>
              </div>
            </div>
          </section>
        )}

        <ArchitectureComparison
          contextMode={contextMode}
          onSelectContext={selectContextMode}
          targetMode={targetMode}
          activeMode={detailMode}
          contextLength={contextLength}
          dk={dk}
          dv={dv}
          state={comparisonState}
          step={step}
          phase={phase}
          gateStrength={gateStrength}
          setGateStrength={setGateStrength}
          t={t}
        />

        {contextMode === 'decode' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Workflow size={16} /></div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">{t('executionLevel')}</div>
                  <h2 className="mt-1 text-base font-bold text-slate-950">{t('implementationDetailTitle')}</h2>
                  <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-500">{t('implementationDetailLead')}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('detailAlgorithm')}>
                  {['exact', targetMode].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectDetailMode(value)}
                      aria-pressed={detailMode === value}
                      className={`linear-focus rounded-lg px-4 py-2 text-[10px] font-bold transition ${detailMode === value ? value === 'gla' ? 'bg-cyan-700 text-white shadow-sm' : value === 'exact' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t(value)}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-semibold text-slate-500">· {t('demoSequence')}</div>
              </div>
            </div>

            <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-live="polite">
                <StageCanvas mode={detailMode} step={step} state={detailState} t={t} gateStrength={gateStrength} setGateStrength={setGateStrength} onSelectStep={selectStep} isPlaying={isPlaying} phase={phase} />
              </main>
              <Inspector mode={detailMode} step={step} state={detailState} t={t} />
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2 px-1 pb-2 text-[10px] leading-4 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{t('sampledDimensions')}</span>
          <span>{contextMode === 'decode' ? t('tokenHint') : t('prefillHint')}</span>
        </div>
      </div>
    </div>
  );
}

export default LinearAttention;
