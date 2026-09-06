import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { deriveNumericModel, maxAbs } from './model';
import { Card, Choice, Range, Metric, Matrix, fmt, bytes } from './primitives';
import { FORMULAS } from './content';
import './numeric.css';

const texNumber=value=>Number(value.toPrecision(4)).toString().replace(/e([+-]?\d+)/,(_,power)=>`\\times10^{${Number(power)}}`);

function FloatBasics({m,source,onSource,t}) {
  const f=m.float16;
  return <section className="qn-float" data-testid="float-basics" aria-label={t('floatSource')}>
    <div className="qn-float-heading"><h4>{t('floatBasics')}</h4><div role="group" aria-label={t('floatSource')}>
      <button aria-pressed={source==='example'} onClick={()=>onSource('example')}>{t('floatExample')} · 0.75</button>
      <button aria-pressed={source==='selected'} onClick={()=>onSource('selected')}>{t('floatSelected')} · {fmt(m.value)}</button>
    </div></div>
    <div className="qn-float-fields" data-testid="float-fields">
      {['floatSign','floatExponent','floatFraction'].map((key,i)=><div key={key} className={`qn-float-field field-${i}`}>
        <small>{t(key)}</small><span className="qn-float-bits">{f.fields[i].split('').map((bit,j)=><i key={j}>{bit}</i>)}</span>
        <MathFormula>{i===0?`b=${f.sign}`:i===1?`E=${f.exponent}`:`F=${f.fraction}`}</MathFormula>
        <small>{t(i===0?(f.sign?'floatNegative':'floatPositive'):i===1?'floatBias':'floatImplicit')}</small>
        {i===1 && <MathFormula>{`${f.exponent}-15=${f.power}`}</MathFormula>}
      </div>)}
    </div>
    <div className="qn-float-value" data-testid="float-value"><MathFormula>{`${f.sign?'-':''}(1.${f.fields[2].replace(/0+$/,'')||'0'})_2\\times2^{${f.power}}${Number(f.represented.toPrecision(6))===f.represented?'=':'\\approx'}${Number(f.represented.toPrecision(6))}`}</MathFormula></div>
    <p>{t('floatBinaryHint')} <MathFormula>{String.raw`\frac12,\,\frac14,\,\frac18,\ldots`}</MathFormula></p>
    <p className="qn-float-bridge">{t('floatScaleBridge')}</p>
    {source==='selected' && <small>{t('floatScope')}</small>}
  </section>;
}

function Storage({m, onSelect, floatSource, onFloatSource, t}) {
  const s=m.storage;
  const navigate=(event,index)=>{
    const offset={ArrowLeft:-1,ArrowRight:1}[event.key];
    if(!offset) return;
    event.preventDefault();const next=Math.max(0,Math.min(s.count-1,index+offset));
    onSelect(next);event.currentTarget.parentElement.children[next]?.focus();
  };
  return <div className="qn-storage" data-testid="numeric-storage">
    <h3>{t('storageQuestion')}</h3><p>{t(m.low?'storageAnswer':'storageBaselineAnswer')}</p>
    {['baseline','configured'].map((key,index)=><div className="qn-storage-row" key={key}>
      <div className="qn-label"><strong>{t(key)}</strong><span>{index ? m.q.bits : 16} bit / {t('oneWeight')} · <b>{bytes(index?s.totalBytes:s.baselineBytes)}</b></span></div>
      <div className="qn-byte-track" aria-label={`${t(key)} ${bytes(index?s.totalBytes:s.baselineBytes)}`}>
        <div className={`qn-weight-payload ${index?'low':''}`} style={{width:`${(index?m.q.payload:s.baselineBytes)/s.extent*100}%`}}>
          {m.w.flat().map((_,i)=><button key={i} type="button" tabIndex={m.selected===i?0:-1} aria-label={`${t('storageWeight')} ${i+1} · ${t(key)}`} aria-pressed={m.selected===i} onClick={()=>onSelect(i)} onKeyDown={e=>navigate(e,i)} className={`${m.selected===i?'selected':''} ${m.low&&m.q.ids.flat()[i]===m.selectedGroup?'in-group':''}`} title={`${t('storageWeight')} ${i+1}`}/>)}
        </div>
        {index===1 && m.low && <><div className="qn-scale-payload" style={{width:`${s.scaleBytes/s.extent*100}%`}} title={`${t('scale')} ${bytes(s.scaleBytes)}`}>{m.q.params.map((p,i)=><button key={i} aria-label={`${t('scaleGroup')} ${i+1}`} aria-pressed={m.selectedGroup===i} onClick={()=>onSelect(p.start)} className={m.selectedGroup===i?'selected':''}/>)}</div>{s.zeroBytes>0 && <div className="qn-zero-payload" style={{width:`${s.zeroBytes/s.extent*100}%`}}/>}</>}
      </div>
      <small>{index===0 ? <>{s.count} {t('sameWeights')}</> : <>{t('weightCodes')} {bytes(m.q.payload)}{m.low && <> · {t('scale')} {bytes(s.scaleBytes)}</>}{s.zeroBytes>0 && <> · {t('zero')} {bytes(s.zeroBytes)}</>}</>}</small>
    </div>)}
    <div className={`qn-saving ${s.savedBytes<0?'warning':''}`} role="status"><strong>{t(s.savedBytes<0?'storageLarger':s.savedBytes===0?'storageUnchanged':'storageSaved')} {bytes(Math.abs(s.savedBytes))}</strong><span>{t('storageIncludesMetadata')}</span></div>
    <div className="q-legend"><span><i className="weights"/>{t('weightCodes')}</span>{m.low && <span><i className="qn-scale-key"/>{t('scale')}</span>}{m.affine && <span><i className="qn-zero-payload"/>{t('zero')}</span>}</div>
    <FloatBasics m={m} source={floatSource} onSource={onFloatSource} t={t}/>
  </div>;
}

function Reconstruction({m,t}) {
  const bound = Math.max(maxAbs(m.w), ...m.ticks.map(Math.abs)) * 1.1;
  const pos=v=>`${50+v/bound*46}%`;
  const shownTicks=m.ticks.filter((_,i)=>i%Math.max(1,Math.ceil(m.ticks.length/40))===0);
  return <div className="qn-reconstruction">
    <h3>{t('reconstructionQuestion')} <MathFormula>{`W_{${m.r+1},${m.c+1}}`}</MathFormula></h3>
    <div className="q-value-flow"><div><small>{t('originalValue')}</small><strong>{fmt(m.value)}</strong><span className="qn-bit-budget" aria-label={t('baselineBitBudget')}>{Array.from({length:16},(_,i)=><i key={i}/>)}</span><small>16 bit</small></div><ArrowRight size={15}/><div><small>{t('encoded')}</small><strong>{fmt(m.code)}</strong><span className="qn-binary" data-testid="numeric-bits">{m.low ? m.storage.packedCodes[m.selected].split('').map((bit,i)=><i key={i}>{bit}</i>) : t('noConversion')}</span><small>{m.q.bits} bit</small></div><ArrowRight size={15}/><div><small>{t('reconstructed')}</small><strong>{fmt(m.restored)}</strong><small>{t('usedForCompute')}</small></div></div>
    {m.low ? <><div className="qn-scale-equation"><span>{t('scaleRuler')}</span><MathFormula>{m.affine ? `(${texNumber(m.code)}-${m.p.zero})\\times ${texNumber(m.p.scale)}\\approx ${texNumber(m.restored)}` : `${texNumber(m.code)}\\times ${texNumber(m.p.scale)}\\approx ${texNumber(m.restored)}`}</MathFormula></div><p>{t(m.format==='fp8'?'fp8Ruler':'integerRuler')}</p></> : <p>{t('baseHint')}</p>}
    <div className="q-numberline" role="img" aria-label={`${t('originalValue')} ${fmt(m.value)}, ${t('reconstructed')} ${fmt(m.restored)}`}><div className="q-axis"/>{shownTicks.map((v,i)=><i key={i} style={{left:pos(v)}}/>)}<span className="q-original-dot" style={{left:pos(m.value)}}/><span className="q-restored-dot" style={{left:pos(m.restored)}}/><small className="q-axis-left">{fmt(-bound)}</small><small className="q-axis-right">{fmt(bound)}</small></div>
    <div className="q-legend"><span><i className="weights"/>{t('originalValue')}</span><span><i className="kv"/>{t('reconstructed')}</span><span>{t('weightDelta')} {fmt(m.weightDelta)}</span></div>
    {m.low && <small>{t(m.format==='int4'?'packing4':m.format==='fp8'?'packingFP8':'packing8')}</small>}
    {m.format==='int4' && <div className="qn-packed-byte"><small>{t('onePackedByte')}</small><span>{m.storage.packedCodes.slice(Math.floor(m.selected/2)*2,Math.floor(m.selected/2)*2+2).map((binary,j)=><span key={j} className={m.selected%2===j?'selected':''}>{binary.split('').map((bit,k)=><i key={k}>{bit}</i>)}</span>)}</span><small>{t('twoCodes')}</small></div>}
  </div>;
}

export default function Numeric({mode,outliers,setOutliers,t}) {
  const [group,setGroup]=useState('8'),[clip,setClip]=useState(100),[affine,setAffine]=useState(false),[selected,setSelected]=useState(2);
  const [floatSource,setFloatSource]=useState('example');
  const m=useMemo(()=>deriveNumericModel({mode,group:group==='tensor'?group:Number(group),clip:clip/100,affine,outliers,selected,floatSource}),[mode,group,clip,affine,outliers,selected,floatSource]);
  return <Card id="quant-numeric" number="02" title="numeric" hint="numericHint" t={t}>
    <div className="qn-main"><Storage m={m} onSelect={setSelected} floatSource={floatSource} onFloatSource={setFloatSource} t={t}/><Reconstruction m={m} t={t}/></div>
    {m.low && <div className="qn-group-experiment"><div><h3>{t('groupQuestion')}</h3><p>{t('groupAnswer')}</p></div><Choice label="group" value={group} options={[['tensor','tensor'],['8','channel'],['4','group4'],['2','group2']]} onChange={setGroup} t={t}/><div className="qn-group-result"><strong>{m.groupCount} {t('sharedRulers')} · {bytes(m.storage.scaleBytes)}{m.affine && <> + {bytes(m.storage.zeroBytes)} {t('zero')}</>}</strong><small>{m.p.count} {t('weightsPerRuler')} · {t('scale')} {fmt(m.p.scale)}</small></div></div>}
    <details className="qn-detail"><summary>{t('matricesAndSettings')}</summary>
      {m.low && <div className="q-controls"><Range label="clip" value={clip} min={30} max={100} step={5} suffix="%" onChange={setClip} t={t}/>{mode!=='fp8' && <Choice label="scheme" value={affine?'affine':'symmetric'} options={['symmetric','affine'].map(v=>[v,v])} onChange={v=>setAffine(v==='affine')} t={t}/>}<Metric label="weightError" value={fmt(m.q.error)} t={t}/></div>}
      <p>{t('rowMeaning')}{m.low && <> {t('sharedScale')}</>}</p><div className="q-columns"><Matrix values={m.w} label="original" symbol="W" t={t} selected={m.selected} onSelect={setSelected} ids={m.low?m.q.ids:undefined} highlightedGroup={m.selectedGroup}/><Matrix values={m.q.values} label="restored" symbol={String.raw`\hat W`} t={t} selected={m.selected} onSelect={setSelected} ids={m.low?m.q.ids:undefined} highlightedGroup={m.selectedGroup} range={maxAbs(m.w)}/></div>
      {m.low && <p>{t('clipMeaning')} {t(mode==='fp8'?'floatHint':'intHint')}</p>}
    </details>
    <details className="qn-detail" data-testid="numeric-input-experiment"><summary>{t('inputExperiment')}</summary>
      <div className="q-heading"><p>{t('inputExperimentHint')}</p><Choice label="sample" value={outliers?'outliers':'ordinary'} options={['ordinary','outliers'].map(v=>[v,v])} onChange={v=>setOutliers(v==='outliers')} t={t}/></div>
      <div className="q-columns"><div><div className="qn-input-bars" aria-label={t('inputMagnitudes')}>{m.x[0].map((v,i)=><button key={i} aria-label={`${t('inputFeature')} ${i+1}: ${fmt(v)}`} aria-pressed={i===m.c} onClick={()=>setSelected(m.r*8+i)}><small>{i+1}</small><span><i style={{height:`${Math.abs(v)/m.inputExtent*100}%`}}/></span><strong>{fmt(v)}</strong></button>)}</div><small>{t('inputMagnitudes')}</small></div><div className="qn-impact"><h4>{t('weightContribution')} <MathFormula>{`X_{1,${m.c+1}}`}</MathFormula></h4><MathFormula block>{`${texNumber(m.weightDelta)}\\times ${texNumber(m.x[0][m.c])}\\approx ${texNumber(m.contribution)}`}</MathFormula><p>{t('contributionHint')}</p><Metric label="error" value={fmt(m.error)} t={t}/>{(mode==='w8'||mode==='fp8') && <small>{t('activationErrorAlso')} {fmt(m.extraActivationError)}</small>}</div></div>
      <small>{t('inputSharedHint')}</small>
    </details>
    <details><summary>{t('formulas')}</summary><MathFormula block>{FORMULAS.float16}</MathFormula><p>{t('floatFormulaHint')}</p><a className="qn-source" href="https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/mathematical-functions.html#floating-point-format" target="_blank" rel="noreferrer">{t('sourceFloat')} ↗</a><MathFormula block>{mode==='fp16'?String.raw`\hat W=W`:mode==='fp8'?FORMULAS.fp8:FORMULAS.quant}</MathFormula><MathFormula block>{FORMULAS.error}</MathFormula><p>{t(mode==='fp16'?'baseHint':mode==='fp8'?'floatHint':'formulaHint')}</p><a className="qn-source" href="https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/quantized-types-schemes.html" target="_blank" rel="noreferrer">{t('sourceQuantSchemes')} ↗</a></details>
    <p className="q-footnote">{t('numericBoundary')}</p>
  </Card>;
}
