import React, { useEffect, useMemo, useState } from 'react';
import { MathFormula } from '../linear-attention/MathFormula';
import { Card, Choice, Metric, Matrix, Playback, usePlayback, fmt, bytes } from './primitives';
import { deriveSGLangModel, ENGINE_PRESETS, ENGINE_KV } from './sglang-model';
import { ENGINE_FORMULAS } from './sglang-content';
import EngineFlow from './EngineFlow';
import { objectKey } from './flow-content';
import './flow.css';

const stageKey = op => `engine${op[0].toUpperCase()}${op.slice(1)}`;
const groups = ['engineSetup', 'enginePrefill', 'engineDecode1', 'engineDecode2'];

function explanation(m, object) {
  switch(object) {
    case 'checkpoint': return 'flowCheckpointInfo';
    case 'prepare': return m.focus.op==='configure'?'engineConfigureInfo':!m.low?'enginePrepareBaseInfo':m.saved?'enginePrepareSavedInfo':'enginePrepareLoadInfo';
    case 'weights': return 'flowWeightsInfo';
    case 'input': return 'flowInputInfo';
    case 'activation': return !m.low?'flowBaselineInfo':m.staticActivation?'flowStaticInfo':'flowDynamicInfo';
    case 'linear': return m.low?'flowGemmInfo':'engineGemmBaseInfo';
    case 'cache': return 'flowCacheInfo';
    default: return m.cycle===0?'flowPrefillInfo':'flowDecodeInfo';
  }
}

function Inspector({m,t,object,row,onRow,slot,onFollow}) {
  const f=m.flow,c=m.current, weightObject=['checkpoint','prepare','weights'].includes(object);
  const inspectActivation=object==='activation' || object==='input';
  const available=object==='checkpoint'||(weightObject?!!m.weightView:inspectActivation?f.inputReady:object==='linear'?f.projectionReady:object==='attention'?f.attentionReady:m.committed>0);
  const conversion=object==='activation' && f.castReady && m.low;
  return <aside className="qf-inspector q-soft" data-testid="engine-inspector">
    <div className="qf-explanation">
    <div className="qf-inspector-heading"><small>{t('flowSelection')}</small><button onClick={onFollow}>{t('flowFollow')}</button></div>
    <h3>{t(objectKey(m,object))}</h3><p>{t(explanation(m,object))}</p>
    </div><div className="qf-inspector-values">
    {inspectActivation && f.inputReady && <>
      <Choice label="flowRow" value={row} options={c.input.map((_,i)=>[i,String(i+1)])} onChange={v=>onRow(Number(v))} t={t}/>
      <small>{t('flowExample')}</small>
      <div className="qf-values"><div><small>{t('flowOriginal')}</small><strong>{fmt(c.input[row][0])}</strong></div>{conversion && <><span>→</span><div><small>{t('flowEncoded')}</small><strong>{fmt(c.qx.codes[row][0])}</strong></div><span>→</span><div><small>{t('flowRestored')}</small><strong>{fmt(c.qx.values[row][0])}</strong></div></>}</div>
      {conversion && <div className="q-metrics"><Metric label="flowScale" value={fmt(c.qx.params[row].scale)} t={t}/><Metric label="engineClipped" value={c.clipped} t={t}/></div>}
      {object==='activation' && m.low && !f.castReady && <small>{t('flowScaleLater')}</small>}
    </>}
    {weightObject && <div className="q-metrics"><Metric label="engineResident" value={bytes(m.weightBytes)} t={t}/><Metric label="flowWeightCount" value={m.weightQuantizations} t={t}/></div>}
    {object==='linear' && f.projectionReady && <><Matrix values={[c.qkv[row]]} label="engineProjection" symbol="[Q,K,V]" t={t}/><Metric label="engineMSE" value={fmt(c.error)} t={t}/></>}
    {object==='attention' && f.attentionReady && <Matrix values={c.attention} label="engineAttentionOutput" symbol="O" t={t}/>}
    {object==='cache' && <>
      <div className="q-metrics"><Metric label="flowCapacity" value={`${m.committed} / ${m.poolReady?m.capacity:'—'}`} t={t}/>{m.kv!=='auto' && <Metric label="engineKScale" value={m.ready?fmt(m.kvScale):'—'} t={t}/>}</div>
      {slot?.status==='written'?<><small>{t('engineSlot')} {slot.loc} · {t(m.cacheReadLocations.includes(slot.loc)?'flowReadNow':f.newLocations.includes(slot.loc)?'flowNew':'flowOld')}</small><Matrix values={[slot.values]} label="flowSlotValues" symbol={String.raw`[\hat K,\hat V]`} t={t}/></>:<small>{t('flowNoSlot')}</small>}
      {m.kv==='fp8-unit' && <p className="qe-warning">{t('engineKVWarning')}</p>}
    </>}
    {!available && <small className="qf-unavailable">{t('engineNoTensor')}</small>}
    <details key={object}><summary>{t('flowValues')}</summary><div className="q-stack">
      {object==='checkpoint'?<Matrix values={m.checkpointView} label="flowCheckpoint" symbol={m.saved?'Q_W':'W'} t={t}/>:weightObject && m.weightView && <Matrix values={m.weightView} label="engineWeightMatrix" symbol={m.ready&&m.low?String.raw`Q_W^\mathsf T`:m.saved?'Q_W':'W'} t={t}/>}
      {inspectActivation && f.inputReady && <Matrix values={[c.input[row]]} label="engineInput" symbol="X" t={t}/>}
      {inspectActivation && f.castReady && m.low && <><Matrix values={[c.qx.codes[row]]} label="engineCodes" symbol="Q_X" t={t}/><div className="qe-scale-row"><span>{t('engineXScale')}</span>{c.qx.params.map((p,i)=><code key={i}>{fmt(p.scale)}</code>)}</div></>}
      {object==='linear' && f.projectionReady && <Matrix values={c.qkv} label="engineProjection" symbol="Y" t={t}/>}
      {object==='cache' && !m.inStartup && m.passed('write') && <Matrix values={c.stored.codes} label="engineStored" symbol="[Q_K,Q_V]" t={t}/>}
      <p>{t('flowPayloadHint')}</p>
    </div></details></div>
  </aside>;
}

export default function SGLangWorkbench({outliers, t}) {
  const [preset,setPreset]=useState('load-fp8'),[kv,setKV]=useState('fp8-file');
  const [step,setStep]=useState(0),[isPlaying,setIsPlaying]=useState(false);
  const [selection,setSelection]=useState(null),[row,setRow]=useState(0),[slot,setSlot]=useState(null);
  const m=useMemo(()=>deriveSGLangModel({preset,kv,step,outliers}),[preset,kv,step,outliers]);
  usePlayback(step,m.stages.length,isPlaying,setStep,setIsPlaying);
  useEffect(()=>{setStep(0);setIsPlaying(false);setSelection(null);setSlot(null);setRow(0);},[outliers]);
  const seek=value=>{setStep(value);setIsPlaying(false);setSelection(null);setRow(0);};
  const change=(setter,value)=>{setter(value);seek(0);setSlot(null);};
  const playbackStep=value=>{setStep(value);setSelection(null);setRow(0);setSlot(null);};
  const object=selection?.step===m.completed?selection.id:m.flow.focus;
  const select=id=>{setSelection({id,step:m.completed});setIsPlaying(false);};
  const selectedSlot=m.slots.find(s=>s.loc===((selection?.step===m.completed && slot) || m.flow.newLocations[0] || m.flow.oldLocations[0]));
  const currentRow=Math.min(row,m.current.count-1);
  const status=op=>m.passed(op,m.focus.cycle)?'passed':m.active?.op===op?'active':'pending';
  return <Card id="quant-runtime" number="04" title="engineTitle" hint="engineHint" t={t} controls={<Playback step={step} max={m.stages.length} setStep={playbackStep} isPlaying={isPlaying} setIsPlaying={setIsPlaying} t={t}/>}>
    <div className="q-controls qe-controls"><Choice label="enginePreset" value={preset} options={ENGINE_PRESETS.map(v=>[v,v])} onChange={v=>change(setPreset,v)} t={t}/><Choice label="engineKV" value={kv} options={ENGINE_KV.map(v=>[v,v])} onChange={v=>change(setKV,v)} t={t}/></div>
    <div className="qe-phases" role="group" aria-label={t('phase')}>{groups.map((key,i)=><button key={key} aria-pressed={m.focus.cycle===i-1} onClick={()=>seek(m.starts[i])}><span>{i+1}</span>{t(key)}</button>)}</div>
    <div className="qf-steps" aria-label={t('engineNextOperation')}>{m.shownOps.map((op,i)=><button key={op} className={status(op)} aria-current={status(op)==='active'?'step':undefined} onClick={()=>seek(m.at(op,m.focus.cycle))}><span>{status(op)==='passed'?'✓':i+1}</span>{t(op==='attention'&&m.cycle===0?'engineRaggedAttention':stageKey(op))}</button>)}</div>
    <EngineFlow m={m} t={t} selected={object} onSelect={select} selectedSlot={selectedSlot?.loc} onSlot={value=>{setSlot(value);select('cache');}} isPlaying={isPlaying} row={currentRow} inspector={<Inspector m={m} t={t} object={object} row={currentRow} onRow={value=>{setRow(value);setIsPlaying(false);}} slot={selectedSlot} onFollow={()=>setSelection(null)}/>}/>
    <div className="qf-current" role="status"><strong>{t(m.active?'engineNextOperation':'engineAllDone')}{m.active && ` · ${t(m.focus.op==='attention'&&m.cycle===0?'engineRaggedAttention':stageKey(m.focus.op))}`}</strong><span>{t('flowPhaseHint')}</span></div>
    <details><summary>{t('engineFormulaTitle')}</summary><MathFormula block>{m.low?ENGINE_FORMULAS.gemm:ENGINE_FORMULAS.baseline}</MathFormula>{m.kv!=='auto' && <MathFormula block>{ENGINE_FORMULAS.kv}</MathFormula>}<p>{t(m.low?'engineFormulaHint':'flowBaselineInfo')}</p></details>
    <p className="q-footnote">{t('flowSmallBoundary')}</p>
  </Card>;
}
