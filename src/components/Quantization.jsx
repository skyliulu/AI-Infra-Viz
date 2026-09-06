import React, { useEffect, useMemo, useState } from 'react';
import { Globe, ArrowRight, Cpu, Database, Layers } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { ALGORITHMS, MODES, deriveAlgorithmModel, deriveCapacityModel } from './quantization/model';
import { Card, Choice, Range, Tabs, Metric, Matrix, Playback, usePlayback, Stages, stageName, fmt, bytes } from './quantization/primitives';
import SGLangWorkbench from './quantization/SGLangWorkbench';
import Numeric from './quantization/NumericWorkbench';
import { engineI18n } from './quantization/sglang-content';
import { i18n, FORMULAS, CODE } from './quantization/content';
import './quantization/style.css';

const getInitialLang = () => navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
// Shared compact controls are also used by the SGLang trace.
function Overview({ config, setConfig, t }) {
  const [selected, setSelected] = useState('weights');
  const m = deriveCapacityModel(config);
  const kvVariables = [
    ['2', 'kvPair', null], ['L', 'kvLayers', m.shape.layers], ['B', 'kvBatch', m.shape.batch],
    ['T', 'kvContext', m.shape.context], [String.raw`H_{\mathrm{KV}}`, 'kvHeads', m.shape.heads],
    ['d_h', 'kvHeadDim', m.shape.headDim], [String.raw`b_{\mathrm{KV}}`, 'kvBits', m.kb],
  ];
  const parts = [{id:'weights', icon:Layers, precision:m.wb}, {id:'activation', icon:Cpu, precision:m.ab}, {id:'kv', icon:Database, precision:m.kb}];
  return <Card id="quant-overview" number="01" title="overview" hint="overviewHint" t={t}>
    <div className="q-controls"><Range label="batch" value={config.batch} min={1} max={8} onChange={batch => setConfig({...config, batch})} t={t}/><Range label="context" value={config.context} min={256} max={8192} step={256} onChange={context => setConfig({...config, context})} t={t}/><Choice label="phase" value={config.prefill ? 'prefill' : 'decode'} options={['decode','prefill'].map(v => [v,v])} onChange={v => setConfig({...config,prefill:v === 'prefill'})} t={t}/><Choice label="kvPrecision" value={config.kv} options={[[ 'fp16','kv16'],['fp8','kv8']]} onChange={kv => setConfig({...config,kv})} t={t}/></div>
    <div className="q-columns"><div className="q-soft"><h3>{t('architecture')}</h3><div className="q-object-row">{parts.map(({id,icon:Icon,precision}) => <button key={id} aria-pressed={selected === id} onClick={() => setSelected(id)} className={`q-object ${selected === id ? 'selected' : ''}`}><Icon size={21}/><strong>{t(id)}</strong><span>{precision} bit</span><small>{t(id === 'weights' ? 'offline' : 'online')}</small></button>)}</div><div className="q-layer"><MathFormula>{'X'}</MathFormula><ArrowRight size={15}/><span>{t('layer')}</span><ArrowRight size={15}/><MathFormula>{'Y'}</MathFormula></div><p className="q-insight">{t({weights:'weightWhere',activation:'activationWhere',kv:'kvWhere'}[selected])}</p></div>
    <div className="q-capacity"><div className="q-legend"><span className={selected === 'weights' ? 'q-emphasis' : ''}><i className="weights"/>{t('weights')}</span><span className={selected === 'kv' ? 'q-emphasis' : ''}><i className="kv"/>{t('kv')}</span></div>{[[m.highWeights,m.highKV,'baseline'],[m.weightBytes,m.kvBytes,'configured']].map(([w,k,label]) => <div className="q-storage" key={label}><div><strong>{t(label)}</strong><span>{bytes(w+k)}</span></div><div className="q-storage-track"><div className={`weights ${selected === 'weights' ? 'focus' : ''}`} style={{width:`${w/m.baseline*100}%`}}/><div className={`kv ${selected === 'kv' ? 'focus' : ''}`} style={{width:`${k/m.baseline*100}%`}}/></div><small>{t('weights')} {bytes(w)} · {t('kv')} {bytes(k)}</small></div>)}<div className="q-metrics"><Metric t={t} label="metadata" value={bytes(m.weightScales+m.kvScales)}/><Metric t={t} label="activationSize" value={bytes(m.activation)}/></div></div></div>
    <details><summary>{t('formulas')}</summary><p>{t('capacityNote')}</p><p>{t('metadataNote')}</p><div className="q-capacity-formula"><h4>{t('kvCountTitle')}</h4><MathFormula block>{FORMULAS.kvElements}</MathFormula><MathFormula block>{FORMULAS.kv}</MathFormula><dl className="q-variable-grid">{kvVariables.map(([symbol,label,value]) => <div key={symbol}><dt><MathFormula>{symbol}</MathFormula>{value !== null && <strong>{value}</strong>}</dt><dd>{t(label)}</dd></div>)}</dl><div className="q-metrics"><Metric t={t} label="kvPayload" value={bytes(m.kvPayload)}/><Metric t={t} label="metadata" value={bytes(m.kvScales)}/><Metric t={t} label="kvTotal" value={bytes(m.kvBytes)}/></div></div><p>{t('perToken')}: {bytes(m.weightBytesPerToken)}</p><p>{t('performanceNote')}</p></details>
  </Card>;
}
function Algorithm({outliers,t}) {
  const [algorithm,setAlgorithm] = useState('awq'), [step,setStep] = useState(0), [isPlaying,setIsPlaying] = useState(false), [alpha,setAlpha] = useState(.5);
  const m = useMemo(() => deriveAlgorithmModel(algorithm,outliers,step,alpha),[algorithm,outliers,step,alpha]);
  usePlayback(step,m.stages.length,isPlaying,setStep,setIsPlaying);
  useEffect(() => {setStep(0);setIsPlaying(false);},[outliers]);
  const setMode = v => {setAlgorithm(v);setStep(0);setIsPlaying(false);};
  const active = m.stages[Math.min(step,m.stages.length-1)], codeKey = active.startsWith('column') ? 'column' : active;
  const code = codeKey === 'quantWeights' && algorithm === 'smooth' ? CODE.smoothQuantize : codeKey === 'quantWeights' && algorithm === 'awq' ? CODE.awqQuantize : CODE[codeKey];
  return <Card id="quant-algorithm" number="03" title="algorithm" hint="algorithmHint" t={t} controls={<Playback step={step} max={m.stages.length} setStep={setStep} isPlaying={isPlaying} setIsPlaying={setIsPlaying} t={t}/>}>
    <div className="q-heading"><Tabs values={ALGORITHMS} value={algorithm} onChange={setMode} t={t} label={t('algorithm')}/>{algorithm === 'smooth' && <Range label="alpha" value={alpha} min={0} max={1} step={.1} onChange={v => {setAlpha(v);setStep(0);setIsPlaying(false);}} t={t}/>}</div><p className="q-insight">{t(`${algorithm}Hint`)}</p>
    <p className="q-footnote">{t('algorithmScope')}</p><Stages stages={m.stages} completed={step} onSelect={v => {setStep(v);setIsPlaying(false);}} t={t}/>
    <div className="q-columns"><div className="q-soft q-stack"><Matrix values={m.visibleW} label="weights" symbol="W_{\mathrm{stage}}" t={t} committed={m.committed}/><Matrix values={[m.visibleX[0]]} label="input" symbol="X_{\mathrm{stage}}" t={t}/>{(algorithm === 'awq' || algorithm === 'smooth') && <><h4>{t('scaleChannels')}</h4><p className="q-footnote">{t('channelScaleMeaning')}{algorithm === 'smooth' && <> {t('alphaMeaning')}</>}</p><div className="q-channel-bars">{m.scales.map((s,i) => <div key={i}><span>{i+1}</span><div><i style={{height:`${(step >= 2 ? s : 1)/Math.max(...m.scales,1)*100}%`}}/></div><small>{fmt(step >= 2 ? s:1)}</small></div>)}</div></>}<small>{t('calibration')}</small></div>
    <div className="q-soft q-stack"><div className="q-metrics"><Metric label="current" value={step >= m.stages.length ? t('done'):stageName(active,t)} t={t}/><Metric label="error" value={fmt(m.error)} t={t}/></div><Matrix values={[m.reference[0]]} label="reference" symbol="Y" t={t}/><Matrix values={[m.visibleOutput[0]]} label="output" symbol="Y_{\mathrm{stage}}" t={t}/><h4>{t('code')}</h4><pre>{code}</pre><div className={`q-status ${step >= m.stages.length ? 'done':''}`}>{t(step >= m.stages.length ? 'packed':'notPacked')}</div></div></div>
    <details><summary>{t('formulas')}</summary><MathFormula block>{FORMULAS.equivalent}</MathFormula><p>{t('algorithmScope')}</p><p>{t('algorithmBoundary')}</p><div className="q-metrics"><Metric label="final" value={fmt(m.finalError)} t={t}/>{algorithm !== 'smooth' && <Metric label="rtnReference" value={fmt(m.baselineError)} t={t}/>}</div></details><p className="q-footnote">{t('engineBridge')}</p>
  </Card>;
}
export default function Quantization() {
  const [lang,setLang] = useState(getInitialLang), [config,setConfig] = useState({mode:'w4',batch:1,context:2048,kv:'fp16',prefill:false}), [outliers,setOutliers] = useState(true);
  const t = key => engineI18n[lang][key] ?? i18n[lang][key] ?? key;
  return <div className="quant-page min-h-full bg-slate-50 text-slate-800"><header className="q-top"><div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div><div className="q-top-tools"><div className="q-top-actions"><Tabs values={MODES} value={config.mode} onChange={mode => setConfig({...config,mode})} t={t} label={t('title')}/><button className="q-language" onClick={() => setLang(v => v === 'zh' ? 'en':'zh')} aria-label={t('language')}><Globe size={15}/>{t('langToggle')}</button></div><small className="q-mode-scope">{t('precisionScope')}</small></div></header><main>
    <Overview config={config} setConfig={setConfig} t={t}/><Numeric mode={config.mode} outliers={outliers} setOutliers={setOutliers} t={t}/><Algorithm outliers={outliers} t={t}/><SGLangWorkbench outliers={outliers} t={t}/>
    <footer className="q-card"><h3>{t('references')}</h3><p>{t('boundary')}</p><div className="q-source-links">{[['sourceAWQ','https://arxiv.org/html/2306.00978v5'],['sourceGPTQ','https://github.com/IST-DASLab/gptq/blob/main/gptq.py'],['sourceSmooth','https://arxiv.org/html/2211.10438v7'],['sourceSGLangFP8','https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/quantization/fp8.py'],['sourceSGLangKV','https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/layers/attention/flashinfer_backend.py']].map(([k,url]) => <a href={url} target="_blank" rel="noreferrer" key={k}>{t(k)} ↗</a>)}</div></footer>
  </main></div>;
}
