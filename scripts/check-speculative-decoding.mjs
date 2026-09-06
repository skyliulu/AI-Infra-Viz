import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRun, deriveSpeculativeSnapshot as derive, normalizeSpeculativeInput, schedulePrefix, deriveSamplingModel, getNextLifecycle, getTeachingPosition, PREFIX, STREAM } from '../src/components/speculative-decoding/model.js';
let cases=0;
const inputs=[];
for(const depth of [1,2,3,4,5]) for(const width of [1,2,3]) for(const budget of [2,8,16]) inputs.push({algorithm:'eagle2',depth,width,budget});
for(const blockSize of [1,2,3,4,5,6,7,8]) inputs.push({algorithm:'dspark',blockSize});
for(const input of inputs) {
      const {algorithm}=input;
      const run=buildRun(input); cases++;
      let cursor=0;
      for(const r of run.rounds) {
        assert.equal(r.cursor,cursor);
        assert.deepEqual(r.output,STREAM.slice(cursor+1,cursor+1+r.output.length),'Greedy output must match target, including bonus');
        assert.equal(r.output.length,r.acceptedCount+1);
        assert.equal(r.selected[0].id,'root');
        assert.equal(r.verifiedDraftCount,r.selected.length-1);
        const ids=new Set(r.selected.map(n=>n.id));
        for(const node of r.selected) if(node.parent) assert.ok(ids.has(node.parent),'Selection must be ancestor closed');
        r.mask.forEach((row,i)=>row.forEach((visible,j)=>{
          let n=r.selected[i],expected=false;
          while(n){if(n.id===r.selected[j].id)expected=true;n=r.nodes.find(x=>x.id===n.parent);}
          assert.equal(visible,expected);
        }));
        if(algorithm==='eagle2') {
          for(let depth=1;depth<=run.input.depth;depth++) {
            const parents=new Set(r.expansions[depth-1]);
            r.nodes.filter(n=>n.level===depth).forEach(n=>assert.ok(parents.has(n.parent),'Every child must come from the selected expansion parents'));
          }
          assert.ok(r.selected.length<=run.input.budget);
        } else {
          assert.equal(r.nodes.length-1,run.input.blockSize);
          assert.equal(r.scheduler.count,r.verifiedDraftCount);
          r.nodes.slice(1).forEach((node,i)=>{
            assert.deepEqual(node.logits,node.baseLogits.map((x,j)=>x+node.bias[j]));
            assert.equal(node.token,node.vocabulary[node.logits.indexOf(Math.max(...node.logits))]);
            assert.equal(node.previous,i?r.nodes[i].token:r.nodes[0].token);
          });
        }
        cursor+=r.output.length;
      }
      const idle=derive(input);
      assert.equal(idle.event,null);
      assert.equal(idle.committedTokens.length,0);
      assert.equal(idle.acceptance.rate,null);
      assert.ok(idle.kv.slots.every(x=>x.state==='empty'));
      for(const e of idle.round.events) {
        const s=derive({...input,phase:'running',step:e.operationIndex});
        assert.equal(s.stages.filter(x=>x.status==='active').length,1);
        assert.equal(s.committedTokens.length,0,'No output before commit completes');
        if(e.type==='verify')assert.ok(s.kv.slots.every(x=>x.state==='temporary'));
        if(e.type==='commit')assert.ok(s.kv.slots.every(x=>['committing','reclaiming'].includes(x.state)));
        if(algorithm==='dspark'&&e.type==='markov'){
          assert.deepEqual(s.architecture.groups.filter(x=>x.active).map(x=>x.id),['markov']);
          assert.equal(s.candidates.filter(x=>x.id!=='root'&&x.generated).length,e.position);
        }
      }
      const done=derive({...input,phase:'done'});
      const acceptedIds=['root',...done.round.accepted.map(x=>x.id)];
      assert.deepEqual(done.kv.gathered.map(x=>x.id),acceptedIds,'Gather actual node IDs, not first N slots');
      assert.equal(done.kv.gathered.length,done.round.acceptedCount+1,'Anchor KV included');
      assert.equal(done.kv.committedPrefixLength,PREFIX.length+done.round.cursor+acceptedIds.length);
      assert.equal(done.kv.pendingAnchor,done.round.bonus);
      assert.deepEqual(done.committedTokens,done.round.output);
      if(done.round.verifiedDraftCount===0)assert.equal(done.acceptance.rate,null);
      else assert.equal(done.acceptance.rate,done.round.acceptedCount/done.round.verifiedDraftCount);
      if(done.rounds.length>1){
        const next=derive({...input,roundIndex:1});
        assert.equal(next.kv.carriedAnchor,done.round.bonus);
        assert.equal(next.kv.prefixLength,done.kv.committedPrefixLength);
        assert.equal(next.round.nodes[0].token,done.round.bonus);
      }
      let lastCount=0;
      for(const raceStep of [0,10,25,50,80]){
        const s=derive({...input,raceStep});
        assert.deepEqual(s.race.speculativeTokens,s.rounds.filter(r=>r.end<=s.race.elapsed+1e-8).flatMap(r=>r.output));
        assert.deepEqual(s.race.speculativeTokens,STREAM.slice(1,s.race.speculativeCount+1));
        assert.ok(s.race.speculativeCount>=lastCount);lastCount=s.race.speculativeCount;
      }
}
const narrow=derive({width:1,depth:3,phase:'done'}),wide=derive({width:2,depth:3,budget:8,phase:'done'});
assert.ok(wide.round.acceptedCount>narrow.round.acceptedCount,'Widening includes a fixed lower-ranked correct candidate');
assert.ok(wide.acceptance.rate<narrow.acceptance.rate,'More accepted tokens need not mean higher candidate utilization');
assert.deepEqual(derive({budget:2}).round.nodes,derive({budget:16}).round.nodes,'Verification budget cannot rewrite draft predictions');
const short=derive({algorithm:'dspark',blockSize:2}),long=derive({algorithm:'dspark',blockSize:8});
assert.deepEqual(short.round.nodes,long.round.nodes.slice(0,3),'Block extension preserves fixed earlier predictions and confidence');
assert.notEqual(derive({algorithm:'dspark',blockSize:2,phase:'done'}).acceptance.rate,derive({algorithm:'dspark',blockSize:4,phase:'done'}).acceptance.rate,'Measured acceptance changes with verified prefix');
assert.deepEqual(buildRun({quality:0,load:8}),buildRun({quality:100,load:1}),'Removed input fields must not affect the fixed experiment');
assert.equal(getTeachingPosition(3).correctRank,1);
assert.ok(derive({raceStep:80}).race.lead>0,'Default teaching configuration can accelerate');
assert.equal(derive({raceStep:80}).race.isDone,true);
const schedule=schedulePrefix([.1,.9,.9],8);
assert.equal(schedule.count,0);
assert.equal(schedule.rows[1].evaluated,false);
assert.equal(schedulePrefix([.1,0,0],8).count,schedule.count,'Future confidences cannot undo early stopping');
assert.ok(schedulePrefix([.9,.85,.8,.75],8).count<schedulePrefix([.9,.85,.8,.75],1).count,'Load must affect scheduling');
for(let quality=0;quality<=100;quality++){
  const m=deriveSamplingModel(quality);
  assert.ok(Math.abs(m.q.reduce((a,b)=>a+b,0)-1)<1e-10);
  m.result.forEach((v,i)=>assert.ok(Math.abs(v-m.p[i])<1e-10,'Exact mass conservation'));
  if(quality<100)assert.ok(Math.abs(m.residual.reduce((a,b)=>a+b,0)-1)<1e-10);
}
const n=normalizeSpeculativeInput({depth:99,width:1,budget:99,quality:-1,load:99});
assert.equal(deriveSamplingModel(90,0.1,2).output,2,'Accepted proposal is emitted');
assert.equal(deriveSamplingModel(90,0.82,2,0.37).output,0,'Residual low draw selects A');
assert.equal(deriveSamplingModel(90,0.82,2,0.99).output,1,'Residual high draw selects B');
assert.equal(deriveSamplingModel(100,0.99,2).accepted,true,'Equal distributions never reject');
assert.equal(n.depth,5);assert.equal(n.budget,6);assert.ok(!('quality' in n));assert.ok(!('load' in n));
const complete=derive({phase:'done'});
assert.equal(getNextLifecycle(complete).roundIndex,1);
const jsx=readFileSync(new URL('../src/components/SpeculativeDecoding.jsx',import.meta.url),'utf8');
assert.ok(jsx.includes('length:s.blockSize-1'),'DSpark input must have gamma-1 masks');
assert.ok(!jsx.includes('ArchitectureDetailedLegacy'),'Obsolete architecture removed');
assert.ok(!jsx.includes('text-[6px]')&&!jsx.includes('text-[7px]')&&!jsx.includes('text-[8px]'),'No microtype in the teaching interface');
assert.ok(!jsx.includes('name="quality"')&&!jsx.includes('name="load"')&&!jsx.includes('s.quality'),'No acceptance or load input, including downstream expected-rate bars');
assert.ok(jsx.includes('flag="block_size"'),'DSpark uses its actual model config field');
assert.ok(jsx.includes('<details')&&!jsx.includes('<details open'),'Long parameter explanations are collapsed by default');
console.log('Speculative decoding: '+cases+' parameter configurations, event/round/KV identity invariants, scheduler causality, output equality and exact sampling mass passed.');
