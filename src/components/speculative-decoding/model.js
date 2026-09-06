// Deterministic teaching trace, not a checkpoint or hardware benchmark.
// Main trace uses greedy verification. The separate distribution lab demonstrates
// exact rejection sampling without conflating draft confidence and acceptance.
export const SPECULATIVE_ALGORITHMS = ['eagle2', 'dspark'];
export const SPECULATIVE_RACE_MAX_STEP = 80;
export const TIME_BUDGET = 8;
export const PREFIX = ['Large', 'models', 'can'];
export const STREAM = 'predict the future of language with speculative decoding while preserving the target decisions through every round of verification and cache updates . A small draft proposes several possible continuations and the target checks them together before accepting a prefix and generating the next anchor . Longer proposals can save time when acceptance is high but waste work when many candidates are rejected .'.split(' ');
const alternatives = ['other', 'new', 'many', 'different', 'next', 'more'];
const clamp = (n, lo, hi, fallback) => Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Number(n))) : fallback;
// Fixed request fixture, indexed by absolute output position (not configuration
// or round boundaries). Rank 3 lies outside the supported top-3 proposals.
// Confidence is separate synthetic model evidence, not a requested acceptance rate.
const TARGET_RANKS = [0, 0, 1, 0, 3, 0, 0, 1, 0, 0, 3, 0];
const CONFIDENCES = [.94, .88, .58, .82, .24, .91, .86, .55, .84, .9, .3, .87];
export function getTeachingPosition(position) {
  const index = (position - 1 + TARGET_RANKS.length) % TARGET_RANKS.length;
  return { correctRank: TARGET_RANKS[index], confidence: CONFIDENCES[index] };
}
export function normalizeSpeculativeInput(input = {}) {
  const algorithm = SPECULATIVE_ALGORITHMS.includes(input.algorithm) ? input.algorithm : 'eagle2';
  const depth = Math.round(clamp(input.depth, 1, 5, 3));
  const width = Math.round(clamp(input.width, 1, 3, 2));
  return {
    algorithm, depth, width,
    budget: width === 1 ? depth + 1 : Math.round(clamp(input.budget, 2, 16, 8)),
    blockSize: Math.round(clamp(input.blockSize, 1, 8, 4)),
    phase: ['idle', 'running', 'done'].includes(input.phase) ? input.phase : 'idle',
    step: Math.max(0, Math.round(Number(input.step) || 0)),
    roundIndex: Math.max(0, Math.round(Number(input.roundIndex) || 0)),
    raceStep: Math.round(clamp(input.raceStep, 0, SPECULATIVE_RACE_MAX_STEP, 0)),
  };
}
// A profile in normalized single-token Target units. Convex extra-token cost
// exposes why a larger verification batch can lose throughput under load.
export function targetCost(slots, load = 1) {
  return 1 + (slots - 1) * (0.025 + (load - 1) * 0.022) + (slots - 1) ** 2 * 0.006 * load;
}
export function schedulePrefix(confidences, load = 1) {
  let survival = 1;
  let expected = 1; // Target bonus, not a draft token
  let best = 1 / targetCost(1, load);
  let count = 0;
  let stopped = false;
  const rows = [];
  for (let i = 0; i < confidences.length; i += 1) {
    survival *= confidences[i];
    expected += survival;
    const cost = targetCost(i + 2, load);
    const throughput = expected / cost;
    const admitted = !stopped && throughput > best;
    rows.push({ index: i, survival, expected, cost, sps: 1 / cost, throughput, admitted, evaluated: !stopped });
    if (admitted) { count += 1; best = throughput; }
    else stopped = true; // Causal first non-improvement, never retrospective argmax.
  }
  return { rows, count, best };
}
function makeTree(n, cursor, roundIndex) {
  const root = { id: 'root', token: STREAM[cursor], level: 0, parent: null, value: 1, probability: 1, correctPath: true };
  const nodes = [root];
  let frontier = [root];
  const expansions = [];
  for (let level = 1; level <= n.depth; level += 1) {
    const parents = [...frontier].sort((a,b) => b.value - a.value).slice(0, n.width);
    expansions.push(parents.map(p => p.id));
    const next = [];
    for (const parent of parents) {
      const position = cursor + level;
      const { correctRank } = getTeachingPosition(position);
      for (let rank = 0; rank < n.width; rank += 1) {
        const correctPath = parent.correctPath && rank === correctRank;
        const token = correctPath ? STREAM[position] : alternatives[(position + rank) % alternatives.length];
        const probability = [0.60, 0.28, 0.12][rank];
        const node = { id: 'n' + nodes.length, parent: parent.id, token, level, probability, value: parent.value * probability, correctPath };
        nodes.push(node); next.push(node);
      }
    }
    frontier = next;
  }
  const selected = [root, ...nodes.slice(1).sort((a,b)=>b.value-a.value || a.level-b.level).slice(0, n.budget-1)]
    .sort((a,b)=>a.level-b.level || nodes.indexOf(a)-nodes.indexOf(b));
  const accepted = [];
  const checks = [];
  let parent = root;
  for (let depth = 1; depth <= n.depth; depth += 1) {
    const children = selected.filter(node => node.parent === parent.id);
    if (!children.length) break;
    const expected = STREAM[cursor + depth];
    const winner = children.find(node => node.token === expected && node.correctPath);
    checks.push({ position: depth, expected, proposals: children.map(x=>x.token), acceptedId: winner?.id ?? null, accepted: Boolean(winner) });
    if (!winner) break;
    accepted.push(winner);
    parent = winner;
  }
  return { nodes, selected, accepted, checks, expansions };
}
function makeBlock(n, cursor, roundIndex) {
  const nodes = [];
  for (let i=0; i<n.blockSize; i+=1) {
    const fixture = getTeachingPosition(cursor+i+1);
    const correct = fixture.correctRank === 0;
    // c_i is fixed ex-ante evidence: independent of this or later sampled tokens.
    const confidence = fixture.confidence;
    const previous = i ? nodes[i-1].token : STREAM[cursor];
    const vocabulary = [STREAM[cursor+i+1], alternatives[(cursor+i)%alternatives.length], alternatives[(cursor+i+2)%alternatives.length]];
    const baseLogits = [correct ? 1.1 : -1, 1.4, 0.2];
    // A three-word slice of a synthetic transition table: only the preceding
    // token selects the bias row. It never reads later sampled candidates.
    const bias = previous === STREAM[cursor+i] ? [0.5, 0, -0.1] : [-0.2, 0.2, 0.1];
    const logits = baseLogits.map((v,j)=>v+bias[j]);
    const chosen = logits.indexOf(Math.max(...logits));
    const token = vocabulary[chosen];
    nodes.push({ id:'d'+i, token,
      level:i+1, parent:i ? 'd'+(i-1) : 'root', confidence,
      baseToken:vocabulary[baseLogits.indexOf(Math.max(...baseLogits))], previous, vocabulary, baseLogits, bias, logits,
      correctPath:token===STREAM[cursor+i+1] });
  }
  const scheduler = schedulePrefix(nodes.map(x=>x.confidence));
  const root = { id:'root', token:STREAM[cursor], level:0, parent:null, value:1 };
  const selected = [root, ...nodes.slice(0,scheduler.count)];
  const accepted = [];
  const checks = [];
  for(const node of selected.slice(1)) {
    const expected = STREAM[cursor+node.level];
    const match = node.token === expected;
    checks.push({position:node.level,expected,proposals:[node.token],acceptedId:match ? node.id:null,accepted:match});
    if (!match) break;
    accepted.push(node);
  }
  return {nodes:[root,...nodes],selected,accepted,checks,scheduler};
}
function makeRound(n, cursor, index, start) {
  const data = n.algorithm === 'eagle2' ? makeTree(n,cursor,index) : makeBlock(n,cursor,index);
  const acceptedCount = data.accepted.length;
  const bonus = STREAM[cursor+acceptedCount+1];
  const output = [...data.accepted.map(x=>x.token), bonus];
  const ops = [];
  const push = (type,labelKey,duration,extra={}) => ops.push({type,labelKey,duration,...extra});
  if (n.algorithm === 'eagle2') {
    for(let level=1;level<=n.depth;level+=1) push('expand','stageExpand',0.09+0.025*n.width,{level,codeIndex:0});
    push('select','stageSelect',0.025,{codeIndex:1});
  } else {
    push('backbone','stageBackbone',0.15+0.012*n.blockSize,{codeIndex:0});
    for(let position=1;position<=n.blockSize;position+=1) push('markov','stageMarkov',0.018,{position,codeIndex:1});
    push('confidence','stageConfidence',0.025,{codeIndex:2});
    push('schedule','stageSchedule',0.035,{codeIndex:3});
  }
  push('reserve','stageReserve',0.025,{codeIndex:n.algorithm==='eagle2'?2:4});
  push('verify','stageVerify',targetCost(data.selected.length),{codeIndex:n.algorithm==='eagle2'?3:5});
  push('accept','stageAccept',0.035,{codeIndex:n.algorithm==='eagle2'?4:6});
  push('commit','stageCommit',0.055,{codeIndex:n.algorithm==='eagle2'?5:7});
  let time=start;
  const events=ops.map((op,operationIndex)=>{const event={...op,operationIndex,start:time,end:time+op.duration};time=event.end;return event;});
  const draftEnd=events.find(x=>x.type==='reserve').start;
  const verifyEnd=events.find(x=>x.type==='verify').end;
  return {...data,index,cursor,start,end:time,draftEnd,verifyEnd,events,output,bonus,
    rejected:data.checks.some(x=>!x.accepted),
    acceptedCount, verifiedDraftCount:data.selected.length-1,
    mask:data.selected.map(row=>data.selected.map(col=>{
      let node=row;
      while(node) { if(node.id===col.id)return true; node=data.nodes.find(x=>x.id===node.parent); }
      return false;
    })),
  };
}
export function buildRun(input = {}) {
  const n=normalizeSpeculativeInput(input);
  const rounds=[];
  let cursor=0, time=0;
  while(time<TIME_BUDGET && cursor+10<STREAM.length) {
    const round=makeRound(n,cursor,rounds.length,time);
    rounds.push(round); cursor+=round.output.length; time=round.end;
  }
  return {input:n,rounds};
}
function architectureFor(n,event) {
  const type=event?.type;
  const backbone=n.algorithm==='eagle2' ? type==='expand' : type==='backbone';
  const groups=[
    {id:'features',labelKey:n.algorithm==='eagle2'?'featureEagle':'featureDspark',kind:'activation',formula:n.algorithm==='eagle2'?"h_t^T":"[h_t^{(\\ell_1)};\\ldots;h_t^{(\\ell_m)}]",active:backbone},
    {id:'embedding',labelKey:'embedding',kind:'shared',formula:"E_T",active:backbone},
    {id:'projection',labelKey:'projection',kind:'draft',formula:n.algorithm==='eagle2'?"W_f\\in\\mathbb{R}^{2d\\times d}":"W_c\\in\\mathbb{R}^{md\\times d}",active:backbone},
    {id:'backbone',labelKey:n.algorithm==='eagle2'?'eagleDecoder':'parallelDecoder',kind:'draft',formula:n.algorithm==='eagle2'?"L_D=1":"L_D",active:backbone},
    {id:'lm',labelKey:'lmHead',kind:'shared',formula:"W_{\\mathrm{vocab}}\\in\\mathbb{R}^{d\\times V}",active:backbone},
  ];
  if(n.algorithm==='dspark') groups.push(
    {id:'markov',labelKey:'markov',kind:'draft',formula:"W_1[V,r]\\,W_2[r,V]",active:type==='markov'},
    {id:'confidence',labelKey:'confidenceHead',kind:'draft',formula:"w_c\\in\\mathbb{R}^{d+r}",active:type==='confidence'});
  groups.push({id:'controller',labelKey:'controller',kind:'runtime',active:['select','reserve','schedule'].includes(type)});
  return {groups,activeOwner:backbone||['markov','confidence'].includes(type)?'draft':type==='verify'?'target':['accept','commit','select','reserve','schedule'].includes(type)?'runtime':null};
}
export function deriveSpeculativeSnapshot(input={}) {
  const run=buildRun(input), n=run.input;
  const roundIndex=Math.min(n.roundIndex,run.rounds.length-1);
  const round=run.rounds[roundIndex];
  const phase=n.phase==='done'||n.step>=round.events.length?'done':n.phase;
  const step=Math.min(n.step,round.events.length-1);
  const event=phase==='running'?round.events[step]:null;
  const progress=phase==='idle'?-1:phase==='done'?round.events.length:step;
  const reached=type=>progress>=round.events.findIndex(x=>x.type===type);
  const hasVerdict=reached('accept');
  const committed=phase==='done';
  const generatedLevel=phase==='done'?n.depth:phase==='idle'?0:event?.type==='expand'?event.level:n.depth;
  const markovPosition=phase==='idle'?0:phase==='done'||!['backbone','markov'].includes(event?.type)?n.blockSize:event?.position||0;
  const selectedVisible=reached(n.algorithm==='eagle2'?'select':'schedule');
  const acceptedIds=new Set(round.accepted.map(x=>x.id));
  const selectedIds=new Set(round.selected.map(x=>x.id));
  const candidates=round.nodes.map(node=>{
    const generated=node.id==='root'||(n.algorithm==='eagle2'?node.level<=generatedLevel:node.level<=markovPosition);
    let status=generated?'proposed':'pending';
    if(selectedVisible&&node.id!=='root')status=selectedIds.has(node.id)?'selected':'skipped';
    if(reached('verify')&&selectedIds.has(node.id))status='verifying';
    if(hasVerdict&&selectedIds.has(node.id))status=node.id==='root'||acceptedIds.has(node.id)?'accepted':'discarded';
    if(committed&&selectedIds.has(node.id))status=node.id==='root'||acceptedIds.has(node.id)?'committed':'discarded';
    return {...node,generated,status,selected:selectedIds.has(node.id),accepted:hasVerdict&&acceptedIds.has(node.id)};
  });
  const kvState=committed?'stable':event?.type==='commit'?'committing':event?.type==='verify'||event?.type==='accept'?'temporary':event?.type==='reserve'?'reserved':'empty';
  const acceptedKvIds=['root',...round.accepted.map(x=>x.id)];
  const slots=round.selected.map((node,index)=>({
    id:node.id,token:node.token,index,
    destination:committed&&acceptedKvIds.includes(node.id)?PREFIX.length+round.cursor+acceptedKvIds.indexOf(node.id):null,
    state:committed?(acceptedKvIds.includes(node.id)?'committed':'free'):kvState==='committing'?(acceptedKvIds.includes(node.id)?'committing':'reclaiming'):kvState,
  }));
  const elapsed=TIME_BUDGET*n.raceStep/SPECULATIVE_RACE_MAX_STEP;
  const completed=run.rounds.filter(r=>r.end<=elapsed+1e-8);
  const output=completed.flatMap(r=>r.output);
  const baselineCount=Math.floor(elapsed+1e-8);
  const activeRound=run.rounds.find(r=>r.start<=elapsed&&r.end>elapsed);
  const activeRaceEvent=activeRound?.events.find(e=>e.start<=elapsed&&e.end>elapsed);
  const cumulativeAccepted=completed.reduce((sum,r)=>sum+r.acceptedCount,0);
  const cumulativeVerified=completed.reduce((sum,r)=>sum+r.verifiedDraftCount,0);
  const observedAccepted=hasVerdict?round.acceptedCount:0;
  const observedVerified=reached('verify')?round.verifiedDraftCount:0;
  const guide = { codeIndex:event?.codeIndex ?? (committed?round.events.at(-1).codeIndex:0), dataKey:'guideAnchor', data:[round.nodes[0].token] };
  if (committed || event?.type==='commit') { guide.dataKey='actualOutput'; guide.data=committed?round.output:[]; }
  else if (event?.type==='expand') { guide.dataKey='guideCandidates'; guide.data=candidates.filter(x=>x.level===event.level).map(x=>x.token); }
  else if (event?.type==='backbone') { guide.dataKey='baseGuess'; guide.data=round.nodes.slice(1).map(x=>x.baseToken); }
  else if (event?.type==='markov') { guide.dataKey='guideCandidates'; guide.data=candidates.filter(x=>x.id!=='root'&&x.generated).map(x=>x.token); }
  else if (event?.type==='confidence') { guide.dataKey='confidence'; guide.data=round.nodes.slice(1).map(x=>x.confidence.toFixed(2)); }
  else if (event?.type==='accept') { guide.dataKey='accepted'; guide.data=round.accepted.map(x=>x.token); }
  else if (selectedVisible) { guide.dataKey='targetInput'; guide.data=round.selected.map(x=>x.token); }
  return {
    ...n,phase,step,roundIndex,round,rounds:run.rounds,
    event,maxStep:round.events.length,hasVerdict,committed,selectedVisible,candidates,guide,
    generatedLevel,markovPosition,
    committedTokens:committed?round.output:[],
    acceptance:{accepted:observedAccepted,verified:observedVerified,rate:hasVerdict&&observedVerified?observedAccepted/observedVerified:null,
      cumulativeAccepted,cumulativeVerified,cumulativeRate:cumulativeVerified?cumulativeAccepted/cumulativeVerified:null,
      meanLength:completed.length?output.length/completed.length:0},
    architecture:architectureFor(n,event),
    kv:{state:kvState,slots,prefixLength:PREFIX.length+round.cursor,committedPrefixLength:PREFIX.length+round.cursor+(committed?acceptedKvIds.length:0),
      gathered:committed?acceptedKvIds.map(id=>slots.find(s=>s.id===id)):[],
      pendingAnchor:committed?round.bonus:round.nodes[0].token,
      carriedAnchor:roundIndex>0?run.rounds[roundIndex-1].bonus:null,
      draftPrefixLength:PREFIX.length+round.cursor,
      draftContextActive:event?.type==='expand'||event?.type==='backbone',
    },
    stages:round.events.map((e,i)=>({...e,status:i===progress&&phase==='running'?'active':i<progress||phase==='done'?'passed':'pending'})),
    race:{elapsed,timeBudget:TIME_BUDGET,step:n.raceStep,maxStep:SPECULATIVE_RACE_MAX_STEP,isDone:n.raceStep===SPECULATIVE_RACE_MAX_STEP,
      baselineTokens:STREAM.slice(1,1+baselineCount),speculativeTokens:output,baselineCount,speculativeCount:output.length,lead:output.length-baselineCount,
      completedRounds:completed.length,activeRoundIndex:activeRound?.index??null,event:n.raceStep===0||n.raceStep===SPECULATIVE_RACE_MAX_STEP?null:activeRaceEvent,
      cycles:run.rounds.map(r=>({...r,completed:r.end<=elapsed+1e-8,active:r.index===activeRound?.index&&n.raceStep>0&&n.raceStep<SPECULATIVE_RACE_MAX_STEP})),
    },
  };
}
export function getNextLifecycle(snapshot) {
  if(snapshot.phase==='done') return {phase:'running',step:0,roundIndex:(snapshot.roundIndex+1)%snapshot.rounds.length};
  if(snapshot.phase==='idle')return {phase:'running',step:0,roundIndex:snapshot.roundIndex};
  return {phase:snapshot.step+1>=snapshot.maxStep?'done':'running',step:snapshot.step+1,roundIndex:snapshot.roundIndex};
}
// Exact one-position rejection sampler: all probability mass is accounted for.
// Kept separate from the greedy multi-branch trace.
export function deriveSamplingModel(quality=80,draw=0.82,proposalIndex=2,residualDraw=0.37) {
  const closeness=clamp(quality,0,100,80)/100;
  const p=[0.7,0.2,0.1], bad=[0.15,0.15,0.7];
  const q=p.map((v,i)=>closeness*v+(1-closeness)*bad[i]);
  return sampleDistributions(p,q,draw,proposalIndex,residualDraw);
}
function sampleDistributions(p,q,draw,proposalIndex,residualDraw) {
  const acceptedMass=p.map((v,i)=>Math.min(v,q[i]));
  const acceptance=acceptedMass.reduce((a,b)=>a+b,0);
  const rejection=1-acceptance;
  const residual=p.map((v,i)=>rejection>1e-10?Math.max(0,v-q[i])/rejection:0);
  const result=p.map((v,i)=>acceptedMass[i]+rejection*residual[i]);
  const selected=Math.round(clamp(proposalIndex,0,2,2));
  const threshold=Math.min(1,p[selected]/q[selected]);
  let total=0;
  const correction=residual.findIndex(value=>{total+=value;return residualDraw<total;});
  const output=draw<threshold?selected:Math.max(0,correction);
  return {p,q,acceptedMass,acceptance,rejection,residual,result,selected,threshold,draw,residualDraw,output,accepted:draw<threshold};
}

// Independent introductory examples: reuse the actual greedy fixture and exact
// sampler, but use round percentages so probability correction is easy to see.
export function deriveCorrectnessExample(verified=false,corrected=false,draw=.75,proposalIndex=2) {
  const round=buildRun({algorithm:'dspark',blockSize:4}).rounds[0];
  const sampling=sampleDistributions([.7,.2,.1],[.6,.2,.2],draw,proposalIndex,.37);
  return {
    greedy:{prefix:[...PREFIX,STREAM[0]],verified,
      scoringRows:round.selected.slice(1).map((node,i)=>({
        context:[...PREFIX,STREAM[0],...round.selected.slice(1,i+1).map(x=>x.token)],
        readout:round.selected[i].token,candidate:node.token,
        usable:!verified?null:i<=round.acceptedCount,
      })),
      candidates:round.selected.slice(1).map((node,i)=>({token:node.token,status:!verified?'pending':i<round.acceptedCount?'match':i===round.acceptedCount?'reject':'discarded'})),
      correction:verified?round.bonus:null,output:verified?round.output:[]},
    sampling:{...sampling,corrected,
      selectedToken:['A','B','C'][sampling.selected],
      selectedP:sampling.p[sampling.selected],selectedQ:sampling.q[sampling.selected],
      logP:Math.log(sampling.p[sampling.selected]),logQ:Math.log(sampling.q[sampling.selected]),
      alwaysAccept:sampling.q[sampling.selected]<=sampling.p[sampling.selected],
      rows:sampling.p.map((target,i)=>({token:['A','B','C'][i],target,draft:sampling.q[i],kept:sampling.acceptedMass[i],refill:sampling.rejection*sampling.residual[i],display:corrected?sampling.result[i]:sampling.q[i]}))},
  };
}
