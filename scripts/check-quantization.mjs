import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WEIGHTS, MODES, ALGORITHMS, FP8_VALUES, roundEven, nearestFP8, quantize, fixture, linear, mse, deriveNumericModel, deriveAlgorithmModel, deriveCapacityModel, deriveRuntimeModel} from '../src/components/quantization/model.js';
import {i18n, CODE, FORMULAS} from '../src/components/quantization/content.js';
import katex from 'katex';
import {describeFP16} from '../src/components/quantization/model.js';
const near = (a,b,e=1e-10) => assert.ok(Math.abs(a-b) < e, `${a} != ${b}`);
assert.deepEqual(Object.keys(i18n.zh).sort(),Object.keys(i18n.en).sort());
assert.equal(describeFP16(.75).bits,'0011101000000000');
assert.equal(describeFP16(-.75).bits,'1011101000000000');
assert.equal(describeFP16(.75).represented,.75);
assert.equal(describeFP16(1+2**-11).fraction,0,'ties round to an even significand');
assert.equal(describeFP16(1+3*2**-11).fraction,2);
assert.equal(describeFP16(2-2**-11).represented,2,'rounding can carry into exponent');
for(const bad of [0,-0,2**-15,65505,Infinity,NaN]) assert.throws(()=>describeFP16(bad));
// Every finite positive normal binary16 code, plus the negative counterpart.
for(let raw=0x400;raw<=0x7bff;raw++) {
  const value=(1+(raw&1023)/1024)*2**((raw>>10)-15);
  assert.equal(parseInt(describeFP16(value).bits,2),raw);
  assert.equal(parseInt(describeFP16(-value).bits,2),raw+0x8000);
}
for(const mode of MODES) for(let selected=0;selected<24;selected++) {
  const base=deriveNumericModel({mode,selected}), m=deriveNumericModel({mode,selected,floatSource:'selected'});
  assert.equal(base.float16.input,.75);
  assert.equal(m.float16.input,WEIGHTS.flat()[selected]);
  assert.deepEqual(base.q,m.q,'primer choice must not change quantization');
  assert.deepEqual(base.storage,m.storage,'primer is not another storage allocation');
  assert.equal(base.error,m.error);
  const f=m.float16;
  near(f.represented,(-1)**f.sign*(1+f.fraction/1024)*2**(f.exponent-15));
  katex.renderToString(`(-1)^{${f.sign}}\\times\\left(1+\\frac{${f.fraction}}{1024}\\right)\\times2^{${f.power}}\\approx${f.represented}`,{throwOnError:true});
  katex.renderToString(`${f.sign?'-':''}(1.${f.fields[2].replace(/0+$/,'')||'0'})_2\\times2^{${f.power}}\\approx${f.represented}`,{throwOnError:true});
}
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
  assert.equal(m.storage.baselineBytes,48);
  assert.equal(m.storage.totalBytes,m.q.payload+m.q.metadata);
  assert.equal(m.storage.scaleBytes+m.storage.zeroBytes,m.q.metadata);
  assert.equal(m.storage.savedBytes,48-m.storage.totalBytes);
  assert.ok(m.storage.extent>=Math.max(48,m.storage.totalBytes));
  near(m.contributions.reduce((a,b)=>a+b,0)+m.extraActivationError,m.output[0][m.r]-m.reference[0][m.r]);
  near(m.contribution,m.weightDelta*m.x[0][m.c]);
  if(mode!=='fp16') m.storage.packedCodes.forEach((binary,i)=>{
    assert.equal(binary.length,m.q.bits); assert.match(binary,/^[01]+$/);
    const raw=parseInt(binary,2),code=m.q.codes.flat()[i];
    if(mode==='fp8') near((raw&128?-1:1)*FP8_VALUES[raw&127],code);
    else near(!affine && raw>=2**(m.q.bits-1)?raw-2**m.q.bits:raw,code);
  });
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
for(const id of ['quant-overview','quant-algorithm']) assert.ok(jsx.includes(id));
const numericJSX=fs.readFileSync(new URL('../src/components/quantization/NumericWorkbench.jsx',import.meta.url),'utf8');
assert.ok(numericJSX.includes('quant-numeric'));
assert.ok(numericJSX.indexOf('<Storage m=')<numericJSX.indexOf('inputExperiment'));
for(const group of ['tensor',8,4,2]) {
  const m=deriveNumericModel({mode:'w4',group});
  assert.equal(m.storage.totalBytes,({tensor:16,8:24,4:36,2:60})[group]);
  assert.deepEqual(m.storage,deriveNumericModel({mode:'w4',group,outliers:false}).storage);
}
assert.equal(deriveNumericModel({mode:'w4',selected:2}).storage.packedCodes[2],'0100');
assert.ok(fs.readFileSync(new URL('../src/components/quantization/SGLangWorkbench.jsx',import.meta.url),'utf8').includes('quant-runtime'));
assert.ok(jsx.indexOf('<Overview config')<jsx.indexOf('<Numeric mode'));
assert.ok(jsx.indexOf('<Numeric mode')<jsx.indexOf('<Algorithm outliers'));
assert.ok(jsx.indexOf('<Algorithm outliers')<jsx.indexOf('<SGLangWorkbench outliers'));
console.log(`Quantization: ${numericCases} numeric combinations; ${runtimeCases} lifecycle snapshots; FP8 codebook, rounding, offline algorithms, KV commit/scale identity, capacity and i18n passed.`);
