import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, StepForward } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { maxAbs } from './model';

export const fmt = v => Math.abs(v) < 1e-14 ? '0' : Math.abs(v) < .001 ? v.toExponential(2) : Number(v.toFixed(3)).toString();
export const bytes = n => n >= 2 ** 30 ? `${(n / 2 ** 30).toFixed(2)} GiB` : n >= 2 ** 20 ? `${(n / 2 ** 20).toFixed(2)} MiB` : n >= 1024 ? `${(n / 1024).toFixed(2)} KiB` : `${fmt(n)} B`;
export function Choice({ label, value, options, onChange, t }) {
  return <label className="q-field"><span>{t(label)}</span><select aria-label={t(label)} value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, k]) => <option value={v} key={v}>{t(k)}</option>)}</select></label>;
}
export function Range({ label, value, min, max, step = 1, onChange, suffix = '', t }) {
  return <label className="q-field q-range"><span>{t(label)} <strong>{value}{suffix}</strong></span><input aria-label={t(label)} type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))}/></label>;
}
export function Tabs({ values, value, onChange, t, label }) {
  return <div className="q-tabs" role="group" aria-label={label}>{values.map(v => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{t(v)}</button>)}</div>;
}
export function Card({ number, title, hint, t, children, controls, id }) {
  return <section className="q-card" data-testid={id}><div className="q-heading"><div><h2><span className="q-number">{number}</span>{t(title)}</h2><p>{t(hint)}</p></div>{controls}</div>{children}</section>;
}
export function Metric({ label, value, t }) {return <div className="q-metric"><span>{t(label)}</span><strong>{value}</strong></div>;}
export function Matrix({ values, label, symbol, t, selected, onSelect, ids, highlightedGroup = null, emphasisColumn = null, committed = 0, range }) {
  const bound = range || maxAbs(values) || 1;
  return <div className="q-matrix-wrap"><div className="q-matrix-title"><strong>{t(label)}</strong><MathFormula>{`${symbol}\\in\\mathbb{R}^{${values.length}\\times${values[0].length}}`}</MathFormula></div>
    <div className="q-scroll"><div className="q-matrix" style={{gridTemplateColumns:`repeat(${values[0].length}, minmax(32px, 1fr))`}}>{values.flatMap((row, r) => row.map((v, c) => {
      const index = r * row.length + c, active = selected === index;
      const grouped = highlightedGroup !== null && ids?.[r][c] === highlightedGroup;
      const style = {backgroundColor:`rgba(${v < 0 ? '245,158,11' : '59,130,246'},${.07 + .24 * Math.min(1, Math.abs(v) / bound)})`};
      const props = {style, className:`q-cell ${active ? 'selected' : ''} ${grouped ? 'scale-group' : ''} ${c === emphasisColumn ? 'feature-peak' : ''} ${c < committed ? 'committed' : ''} ${ids && c > 0 && ids[r][c] !== ids[r][c - 1] ? 'group-start' : ''}`, title:`${t(label)} [${r + 1}, ${c + 1}]: ${v}`, 'data-row':r, 'data-col':c, 'data-scale-group':grouped || undefined};
      return onSelect ? <button {...props} key={index} aria-pressed={active} aria-label={`${t(label)} ${r + 1}, ${c + 1}`} onClick={() => onSelect(index)}>{fmt(v)}</button> : <div {...props} key={index}>{fmt(v)}</div>;
    }))}</div></div></div>;
}
export function Playback({ step, max, setStep, isPlaying, setIsPlaying, t }) {
  const reset = () => {setStep(0); setIsPlaying(false);};
  const handleNextStep = () => {setIsPlaying(false); setStep(Math.min(max, step + 1));};
  const togglePlay = () => {if (step >= max) setStep(0); setIsPlaying(v => !v);};
  return <div className="q-playback"><span>{step} / {max}</span><button aria-label={t('reset')} title={t('reset')} onClick={reset}><RotateCcw size={16}/></button><button aria-label={t(isPlaying ? 'pause' : step >= max ? 'replay' : 'play')} title={t(isPlaying ? 'pause' : 'play')} onClick={togglePlay}>{isPlaying ? <Pause size={16}/> : <Play size={16}/>}</button><button aria-label={t('next')} title={t('next')} disabled={step >= max} onClick={handleNextStep}><StepForward size={16}/></button></div>;
}
export function usePlayback(step, max, isPlaying, setStep, setIsPlaying) {
  useEffect(() => {
    if (!isPlaying) return undefined;
    if (step >= max) {setIsPlaying(false); return undefined;}
    const timer = setTimeout(() => setStep(v => Math.min(max, v + 1)), 900);
    return () => clearTimeout(timer);
  }, [step, max, isPlaying, setStep, setIsPlaying]);
}
export const stageName = (key, t) => key.startsWith('column') ? `${t('column')} ${Number(key.slice(6)) + 1}` : t(key);
export function Stages({ stages, completed, onSelect, t }) {
  return <div className="q-stages">{stages.map((key, i) => <button key={key} onClick={() => onSelect(i)} className={i < completed ? 'passed' : i === completed ? 'active' : ''} aria-current={i === completed ? 'step' : undefined}><span>{i < completed ? '✓' : i + 1}</span>{stageName(key, t)}</button>)}</div>;
}
