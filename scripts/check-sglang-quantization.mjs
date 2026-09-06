import assert from 'node:assert/strict';
import {deriveSGLangModel as derive, ENGINE_PRESETS, ENGINE_KV, ENGINE_SOURCES} from '../src/components/quantization/sglang-model.js';
import {engineI18n} from '../src/components/quantization/sglang-content.js';
assert.deepEqual(Object.keys(engineI18n.zh).sort(), Object.keys(engineI18n.en).sort());
let snapshots = 0;
for (const preset of ENGINE_PRESETS) for (const kv of ENGINE_KV) for (const outliers of [true,false]) {
  const config={preset,kv,outliers}, final=derive({...config,step:999});
  for(let step=0; step<=final.stages.length;step++) {
    const m=derive({...config,step}); snapshots++;
    assert.equal(m.active, m.stages[step] || null);
    assert.equal(m.phase==='done', step===m.stages.length);
    assert.ok(m.committed<=m.allocated && m.allocated<=m.capacity);
    assert.equal(m.kvWrittenBytes,m.committed*m.slotBytes);
    assert.equal(m.slots.filter(s=>s.status==='written').length,m.committed);
    assert.equal(m.slots.filter(s=>s.status==='reserved').length,m.allocated-m.committed);
    assert.deepEqual(m.cacheReadLocations,m.focus.op==='attention' && m.cycle>0 ? m.slots.filter(s=>s.status==='written').map(s=>s.loc) : []);
    assert.equal(m.weightQuantizations,preset==='load-fp8' && m.ready ? 1 : 0);
    assert.equal(Object.values(m.flow.nodes).filter(n=>n.active).length,m.active?1:0);
    assert.equal(m.flow.edges.cast.enabled,m.low);
    assert.equal(m.flow.edges.bypass.enabled,!m.low);
    assert.equal(m.flow.edges.read.enabled,!m.inStartup && m.cycle>0);
    assert.equal(m.flow.edges.fresh.enabled,!m.inStartup && m.cycle===0);
    assert.equal(m.flow.weightPayload+m.flow.weightMetadata,m.weightBytes);
    assert.equal(m.flow.newLocations.length+m.flow.oldLocations.length,m.committed);
    assert.ok(m.flow.targetLocations.every(loc=>loc<=m.allocated));
    assert.equal(m.flow.inputRows,m.inStartup?0:m.current.count);
    assert.equal(m.checkpointView.length,3,'disk layout remains stable after GPU transpose');
    if(!m.flow.inputReady) assert.equal(m.flow.activationPayload,0);
    if(m.flow.castReady) assert.equal(m.flow.activationPayload,m.current.count*8*(m.low?1:2));
    if(m.phase==='done') assert.ok(Object.values(m.flow.edges).every(e=>e.status!=='active'));
    assert.ok(Number.isFinite(m.current.error));
    assert.ok(m.code && ENGINE_SOURCES[m.focus.op]);
    assert.equal(m.weightBytes,m.loaded ? m.ready || m.saved ? m.weights.payload+m.weights.metadata : 48 : 0);
    for(const pass of m.passes) {
      if(kv !== 'auto') assert.ok(pass.qkv.every(r=>r.slice(1).every(v=>Math.abs(v)/m.kvScale<=448)), 'KV fixture stays in finite range of raw FP8 cast');
      assert.ok(pass.attention.flat().every(Number.isFinite));
      assert.ok(pass.qkv.flat().every(Number.isFinite));
      if(!m.staticActivation) assert.equal(pass.clipped,0);
    }
    for(const slot of m.slots.filter(s=>s.status==='written')) assert.deepEqual(slot,final.slots[slot.loc-1]);
    if(m.poolReady) assert.equal(m.capacity*m.slotBytes,24);
  }
  assert.equal(final.committed,6); assert.equal(final.allocated,6);
  assert.equal(final.activationQuantizations,final.low ? 3 : 0);
  assert.equal(final.passes[0].input.length,4);
  assert.equal(final.passes[1].input.length,1);
  assert.equal(final.passes[2].input.length,1);
  assert.equal(final.kvScale,derive(config).kvScale);
  assert.ok(final.at('attention',0)<final.at('write',0));
  assert.ok(final.at('write',1)<final.at('attention',1));
  assert.deepEqual(final.passes[0].attention,derive({...config,kv:'auto',step:999}).passes[0].attention, 'No-prefix ragged Prefill does not read quantized cache');
  const started=derive({...config,step:final.at('batch',0)+1});
  assert.equal(started.allocated,4);assert.equal(started.committed,0);
  const beforeWrite=derive({...config,step:final.at('write',0)});
  const afterWrite=derive({...config,step:final.at('write',0)+1});
  assert.equal(beforeWrite.committed,0);assert.equal(afterWrite.committed,4);
  const decode=derive({...config,step:final.at('batch',1)+1});
  assert.equal(decode.allocated,5);assert.equal(decode.committed,4);
  assert.equal(decode.weightBytes,final.weightBytes);
  assert.equal(decode.flow.oldLocations.length,4);
  assert.equal(decode.flow.newLocations.length,0);
  const writeDecode=derive({...config,step:final.at('write',1)+1});
  assert.deepEqual(writeDecode.flow.newLocations,[5]);
  assert.deepEqual(writeDecode.flow.oldLocations,[1,2,3,4]);
  if(preset==='saved-static') {
    for(const pass of final.passes) for(const p of pass.qx.params) assert.equal(p.scale,final.activationScale);
    assert.ok(final.passes.at(-1).clipped>0);
    assert.ok(final.command.includes('--quantization fp8'));
  }
  if(kv==='fp8-file') assert.ok(final.command.includes('--quantization-param-path'));
  else assert.ok(!final.command.includes('--quantization-param-path'));
  if(kv==='auto') assert.equal(final.capacity,6); else assert.equal(final.capacity,12);
}
const dynamic=derive({preset:'saved-dynamic',step:999}), fixed=derive({preset:'saved-static',step:999});
assert.ok(fixed.current.error>dynamic.current.error);
assert.notEqual(dynamic.passes[0].qx.params[0].scale,dynamic.passes[1].qx.params[0].scale);
assert.equal(derive({step:-5}).completed,0);
assert.equal(derive({preset:'invalid',kv:'invalid'}).preset,'load-fp8');
console.log(`SGLang: ${snapshots} snapshots passed; versioned deployment paths, load-once weights, activation scales, causal attention, fixed KV scales, reservation/write lifetime and i18n.`);
import { routeFlowEdges } from '../src/components/quantization/flow-layout.js';
// Content-sized layout keeps dependencies attached in both compositions.
const box=(x,y,width,height)=>({x,y,width,height});
for(const narrow of [false,true]) {
  const rects=narrow?{
    checkpoint:box(0,0,100,120),prepare:box(115,0,100,120),weights:box(230,0,100,120),
    input:box(0,150,150,130),activation:box(180,150,150,130),
    linear:box(0,310,150,120),attention:box(180,310,150,120),cache:box(0,460,330,150),
  }:{
    checkpoint:box(10,0,300,64),prepare:box(340,0,300,64),weights:box(670,0,300,64),
    input:box(10,94,220,130),activation:box(260,94,220,130),
    linear:box(510,94,220,130),attention:box(760,94,220,130),cache:box(510,254,470,150),
  };
  const paths=routeFlowEdges(rects,narrow?350:1000);
  if(Object.keys(paths).length!==10||Object.values(paths).some(path=>/NaN|undefined/.test(path))) throw new Error('Invalid responsive edge geometry');
  if(!paths.write.endsWith(`V${rects.cache.y}`)||!paths.read.endsWith(`V${rects.attention.y+rects.attention.height}`)) throw new Error('KV dependency endpoints detached');
  for(const [edge,node] of [['write',rects.linear],['read',rects.attention]]) {
    const x=node.x+node.width/2;
    assert.match(paths[edge],/^M[\d.]+ [\d.]+ V[\d.]+$/,'KV edges must be straight vertical paths');
    assert.ok(paths[edge].startsWith(`M${x} `));
    assert.ok(x>=rects.cache.x && x<=rects.cache.x+rects.cache.width,'straight port must land inside cache');
  }
  if(!paths.reuse.endsWith(`V${rects.linear.y}`)) throw new Error('Weight reuse must enter Linear');
}
