import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Database } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';
import { bytes } from './primitives';
import { objectKey } from './flow-content';
import { routeFlowEdges } from './flow-layout';

export function Payload({payload, metadata=0, baseline, t}) {
  return <div className="qf-payload"><div><span>{t('flowPayload')}</span><strong>{bytes(payload)}</strong>{metadata>0 && <small>+ {bytes(metadata)} {t('flowMetadata')}</small>}</div><div className="qf-byte-track"><i style={{width:`${Math.min(100,payload/baseline*100)}%`}}/></div></div>;
}

function Rows({count, ready, compact=false, row}) {
  return <div className={`qf-rows ${ready ? 'ready' : ''} ${compact ? 'low' : ''}`} aria-hidden="true">{Array.from({length:Math.max(1,count)},(_,r)=><div key={r} className={ready&&row===r?'inspected':''}>{Array.from({length:8},(_,c)=><i key={c}/>)}</div>)}</div>;
}

export default function EngineFlow({m, t, selected, onSelect, selectedSlot, onSlot, isPlaying, row, inspector}) {
  const id = useId().replace(/:/g,''), f=m.flow;
  const canvas=useRef(null), [geometry,setGeometry]=useState({rects:{},width:0,height:0});
  useLayoutEffect(()=>{
    const root=canvas.current;
    const measure=()=>{
      const bounds=root.getBoundingClientRect(), rects={};
      root.querySelectorAll('[data-object]').forEach(el=>{const r=el.getBoundingClientRect();rects[el.dataset.object]={x:r.x-bounds.x,y:r.y-bounds.y,width:r.width,height:r.height};});
      const next={rects,width:bounds.width,height:bounds.height};
      setGeometry(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
    };
    const observer=new ResizeObserver(measure);
    observer.observe(root);root.querySelectorAll('[data-object], .qf-detail').forEach(el=>observer.observe(el));
    measure();return ()=>observer.disconnect();
  },[]);
  const paths=routeFlowEdges(geometry.rects,geometry.width);
  const node = (name, tag, children) => <button type="button" data-object={name} className={`qf-node qf-${name} ${f.nodes[name].ready?'ready':''} ${f.nodes[name].active?'active':''} ${selected===name?'selected':''}`} aria-pressed={selected===name} onClick={()=>onSelect(name)}>
    <small className="qf-tag">{t(tag)}</small><strong>{t(objectKey(m,name))}</strong>{children}
  </button>;
  return <div className={`qf-canvas-wrap ${isPlaying?'is-playing':''}`}>
    <div className="qf-canvas-heading"><strong>{t('flowTitle')}</strong><small>{t('flowHint')}</small></div>
    <div className="qf-canvas" data-testid="engine-flow" ref={canvas}>
      {geometry.width>0 && <svg className="qf-wires" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true"><defs>{['active','passed','pending'].map(state=><marker key={state} id={`${id}-${state}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill={state==='active'?'#2563eb':state==='passed'?'#64748b':'#cbd5e1'}/></marker>)}</defs>{Object.entries(paths).map(([edge,path])=>f.edges[edge].enabled && <g key={edge} className={`qf-wire ${f.edges[edge].status}`} data-edge={edge} data-state={f.edges[edge].status}><path d={path} markerEnd={`url(#${id}-${f.edges[edge].status})`}/></g>)}</svg>}
      {node('checkpoint','flowOffline',<span>{m.saved?'FP8 + scale':'BF16'}</span>)}
      {node('prepare','flowOnce',<><span>{t(!m.low?'flowWeightBase':m.saved?'flowWeightSaved':'flowWeightCast')}</span><small>{t(m.ready?'flowPassed':'flowFuture')}</small></>)}
      {node('weights',m.ready?'flowReused':'flowKeep',<><MathFormula>{`${m.ready&&m.low?'Q_W^\\mathsf T':m.saved?'Q_W':'W'}\\!: ${m.weightShape[0]}\\times${m.weightShape[1]}`}</MathFormula><Payload payload={f.weightPayload} metadata={f.weightMetadata} baseline={48} t={t}/></>)}
      {node('input','flowEach',<><div className="qf-shape"><span>{t('flowRows')}: {f.inputRows || '—'}</span>{f.inputRows>0 && <MathFormula>{`${f.inputRows}\\times8`}</MathFormula>}</div><Rows count={f.inputRows} ready={f.inputReady} row={row}/><span>{f.inputReady?`BF16 · ${bytes(f.inputBytes)}`:t('flowWaiting')}</span></>)}
      {node('activation',m.low?'flowEachFP8':'flowEach',<><span>{t(!m.low?'flowBypass':m.staticActivation?'flowStatic':'flowDynamic')}</span><Rows count={f.inputRows} ready={f.castReady} compact={m.low} row={row}/><Payload payload={f.activationPayload} metadata={f.activationMetadata} baseline={Math.max(1,f.inputRows)*16} t={t}/></>)}
      {node('linear','flowEach',<><strong className="qf-dtype">{m.low?'FP8':'BF16'} GEMM</strong><MathFormula>{String.raw`X\cdot W^{\mathsf T}\longrightarrow[Q,K,V]`}</MathFormula><small>{f.projectionReady?'BF16 · Q / K / V':t('flowFuture')}</small></>)}
      {node('attention','flowEach',<><span>{t(m.cycle===0?'flowFresh':'flowReadLabel')}</span><small>{t(f.attentionReady?'flowAvailable':'flowFuture')}</small>{f.attentionReady && <MathFormula>{`O\\!: ${m.current.count}\\times1`}</MathFormula>}</>)}
      <div className={`qf-node qf-cache ${f.nodes.cache.active?'active':''} ${selected==='cache'?'selected':''}`} data-object="cache">
        <button className="qf-cache-select" aria-pressed={selected==='cache'} onClick={()=>onSelect('cache')}><strong><Database size={15}/>{t('flowCache')}</strong><small>{t('flowKeep')}</small></button>
        <div className="qf-cache-stats"><span>{m.kv==='auto'?'BF16':'FP8'} · {bytes(m.slotBytes)} / slot</span><strong>{m.committed} / {m.poolReady?m.capacity:'—'}</strong></div>
        <div className="qf-slots" data-testid="sglang-pool">{m.poolReady?m.slots.map(slot=>{
          const isNew=f.newLocations.includes(slot.loc), reading=m.cacheReadLocations.includes(slot.loc);
          const key=slot.status==='free'?'engineFree':slot.status==='reserved'?'flowHeld':isNew?'flowNew':'flowOld';
          return <button key={slot.loc} data-slot={slot.loc} data-status={slot.status} data-new={isNew} aria-pressed={selected==='cache' && selectedSlot===slot.loc} aria-label={`${t('engineSlot')} ${slot.loc} · ${t(key)}${reading?' · '+t('flowReadNow'):''}`} className={`qf-slot ${slot.status} ${isNew?'new':''} ${reading?'reading':''}`} onClick={()=>onSlot(slot.loc)}><strong>{slot.loc}</strong><small>{t(key)}</small></button>;
        }):<span className="qf-pool-pending">{t('enginePoolPending')}</span>}</div>
        <div className="qf-cache-stats"><small>{t('flowReserve')}: {m.allocated}</small><small>{t('flowPayload')}: {bytes(m.kvWrittenBytes)} / {bytes(m.poolBudget)}</small></div>
      </div>
      <div className="qf-detail">{inspector}</div>
      {geometry.rects.cache && geometry.rects.linear && <span className={`qf-wire-label ${m.active?.op==='write'?'active':''}`} style={{left:geometry.rects.linear.x+geometry.rects.linear.width/2+8,top:geometry.rects.cache.y-22}}>{t('flowWritePort')}</span>}
      {geometry.rects.cache && geometry.rects.attention && !m.inStartup && m.cycle>0 && <span className={`qf-wire-label ${m.active?.op==='attention'?'active':''}`} style={{left:geometry.rects.attention.x+geometry.rects.attention.width/2+8,top:geometry.rects.cache.y-22}}>{t('flowReadPort')}</span>}
    </div>
    <div className="qf-bottom"><span>{t('flowWeightCount')}: <b>{m.weightQuantizations}</b></span><span>{t('flowActivationCount')}: <b>{m.activationQuantizations}</b></span><small>{t('flowLayerScope')}</small></div>
  </div>;
}
