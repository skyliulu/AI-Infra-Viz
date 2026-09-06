import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEIGHTS, MODES, ALGORITHMS, FP8_VALUES, roundEven, nearestFP8, quantize, fixture, linear, mse, deriveNumericModel, deriveAlgorithmModel, deriveCapacityModel, deriveRuntimeModel} from '../src/components/quantization/model.js';
import {i18n, CODE, FORMULAS} from '../src/components/quantization/content.js';
import katex from 'katex';
const near = (a,b,e=1e-10) => assert.ok(Math.abs(a-b) < e, `${a} != ${b}`);
assert.deepEqual(Object.keys(i18n.zh).sort(),Object.keys(i18n.en).sort());
assert.equal(roundEven(.5),0); assert.equal(roundEven(1.5),2); assert.equal(roundEven(-1.5),-2);
assert.equal(FP8_VALUES.at(-1),448); near(FP8_VALUES[1],2**-9);
for(const v of FP8_VALUES) {near(nearestFP8(v),v); near(nearestFP8(-v),-v);}
near(nearestFP8(10000),448); near(nearestFP8(1.0625),1);
assert.throws(()=>quantize([[1,2]],{group:0}));
assert.throws(()=>quantize([[NaN]],{group:1}));
assert.throws(()=>quantize([[1]],{group:1,fixedScale:0}));
let numericCases=0, runtimeCases=0;
for (const mode of MODES) for(const group of ['tensor',2,4,8]) for(const clip of [.3,.7,1]) for(const affine of [false,true]) for(const outliers of [false,true]) {
  const m=deriveNumericModel({mode,group,clip,affine,outliers,selected:23});
  numericCases++;
  assert.ok(Number.isFinite(m.error)); assert.ok(Number.isFinite(m.q.error));
  assert.equal(m.q.values.length,3); assert.equal(m.q.values[0].length,8);
  assert.equal(m.q.payload,mode==='w4'?12:mode==='fp16'?48:24);
  assert.equal(m.q.params.length,group==='tensor'?1:24/group);
  assert.equal(m.groupCount,mode==='fp16'?0:m.q.params.length);
  assert.equal(m.selectedGroup,mode==='fp16'?null:m.q.ids[2][7]);
  assert.equal(m.emphasisColumn,outliers?2:null);
  if(mode!=='fp16') assert.equal(m.q.ids.flat().filter(id=>id===m.selectedGroup).length,m.p.count);
  for (let r=0;r<3;r++) for(let c=0;c<8;c++) {
    const p=m.q.params[m.q.ids[r][c]];
    near(m.q.values[r][c],mode==='fp16'?WEIGHTS[r][c]:(m.q.codes[r][c]-p.zero)*p.scale);
  }
  near(m.error,mse(m.reference,m.output));
  if(mode==='fp16') {near(m.q.error,0);near(m.error,0);assert.equal(m.q.metadata,0);}
}
for (const outliers of [false,true]) for(const algorithm of ALGORITHMS) {
  const end=deriveAlgorithmModel(algorithm,outliers,100);
  for(let step=0;step<=end.stages.length;step++) {
    const m=deriveAlgorithmModel(algorithm,outliers,step);
    assert.equal(m.completed,step); assert.ok(Number.isFinite(m.error));
    near(m.error,mse(m.reference,linear(m.visibleX,m.visibleW)));
    if((algorithm==='awq'||algorithm==='smooth')&&step===2) near(m.error,0);
    if(algorithm==='gptq') {
      assert.equal(m.committed,Math.min(8,Math.max(0,step-1)));
      for(let c=0;c<m.committed;c++) for(let r=0;r<3;r++) {
        near(m.visibleW[r][c],end.finalW[r][c]);
      }
    }
  }
  if(algorithm==='awq') assert.ok(end.finalError<=end.baselineError+1e-12);
  const start=deriveAlgorithmModel(algorithm,outliers,0);
  assert.deepEqual(start.visibleW,WEIGHTS); near(start.error,0);
}
// Compensation changes remaining columns instead of merely changing labels.
const gp=deriveAlgorithmModel('gptq',true,2);
assert.notDeepEqual(gp.snapshots[0].before[0].slice(1),gp.snapshots[0].after[0].slice(1));
// Equivalent smoothing for all legal alpha values before quantization.
for(let i=0;i<=10;i++) near(deriveAlgorithmModel('smooth',true,2,i/10).error,0);
for(const mode of MODES) for(const scene of ['linear','kv']) for(const scaling of ['static','dynamic']) for(const kv of ['fp16','fp8']) for(const outliers of [false,true]) for(let token=0;token<3;token++) {
  const config={mode,scene,scaling,kv,outliers,token};
  const final=deriveRuntimeModel({...config,step:100});
  for(let step=0;step<=final.stages.length;step++) {
    const m=deriveRuntimeModel({...config,step}); runtimeCases++;
    assert.equal(m.outputReady,step===final.stages.length);
    assert.equal(m.active,final.stages[step]??null);
    assert.ok(Number.isFinite(m.error));
    for(const stage of m.stages) {assert.ok(i18n.en[stage]); assert.ok(i18n.zh[stage+'Info']);assert.ok(CODE[stage]);}
    if(scene==='kv') {
      assert.equal(m.slots.length,token+Number(step>final.stages.indexOf('writeKV')));
      assert.equal(m.cacheBytes,m.slots.length*(kv==='fp16'?32:24));
      for(let i=0;i<token;i++) assert.deepEqual(m.slots[i],final.slots[i]);
    }
    if(scaling==='dynamic') assert.equal(m.clipped,0);
  }
}
const dyn=deriveRuntimeModel({mode:'w8',scaling:'dynamic',token:2,step:100});
const sta=deriveRuntimeModel({mode:'w8',scaling:'static',token:2,step:100});
assert.ok(sta.clipped>0); assert.ok(sta.q.error>dyn.q.error);
assert.ok(dyn.q.params[0].scale>sta.q.params[0].scale);
for(const mode of MODES) for(const batch of [1,8]) for(const context of [256,8192]) for(const kv of ['fp16','fp8']) {
  const c=deriveCapacityModel({mode,batch,context,kv});
  assert.equal(c.shape.batch,batch); assert.equal(c.shape.context,context);
  assert.equal(c.kvElements,2*c.shape.layers*batch*context*c.shape.heads*c.shape.headDim);
  near(c.kvPayload,c.kvElements*c.kb/8); near(c.kvBytes,c.kvPayload+c.kvScales);
  near(c.total,c.weightBytes+c.kvBytes); assert.ok(c.total<=c.baseline);
  const other=deriveCapacityModel({mode,batch,context,kv:kv==='fp8'?'fp16':'fp8'});
  assert.equal(c.weightBytes,other.weightBytes);
  const p=deriveCapacityModel({mode,batch,context,kv,prefill:true});
  near(p.weightBytesPerToken*context,c.weightBytesPerToken); near(p.activation,c.activation*context);
}
assert.equal(deriveCapacityModel({batch:0,context:-5}).tokens,1);
assert.equal(deriveCapacityModel({batch:0,context:-5}).shape.context,256);
for(const formula of Object.values(FORMULAS)) assert.doesNotThrow(()=>katex.renderToString(formula,{throwOnError:true}));
assert.ok(FORMULAS.kvElements.includes('\\cdot'));
assert.equal(deriveRuntimeModel({step:-4,token:99}).completed,0);
const jsx=fs.readFileSync(new URL('../src/components/Quantization.jsx',import.meta.url),'utf8');
for(const id of ['quant-overview','quant-numeric','quant-algorithm']) assert.ok(jsx.includes(id));
assert.ok(fs.readFileSync(new URL('../src/components/quantization/SGLangWorkbench.jsx',import.meta.url),'utf8').includes('quant-runtime'));
assert.ok(jsx.indexOf('<Overview config')<jsx.indexOf('<Numeric mode'));
assert.ok(jsx.indexOf('<Numeric mode')<jsx.indexOf('<Algorithm outliers'));
assert.ok(jsx.indexOf('<Algorithm outliers')<jsx.indexOf('<SGLangWorkbench outliers'));
console.log(`Quantization: ${numericCases} numeric combinations; ${runtimeCases} lifecycle snapshots; FP8 codebook, rounding, offline algorithms, KV commit/scale identity, capacity and i18n passed.`);
