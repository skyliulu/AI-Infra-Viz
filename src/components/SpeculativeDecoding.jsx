import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, BrainCircuit, Cpu, Database, Globe, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { deriveSpeculativeSnapshot, deriveSamplingModel, getNextLifecycle, PREFIX, STREAM } from './speculative-decoding/model';
import './speculative-decoding/style.css';

const getInitialLang = () => navigator.language?.toLowerCase().includes('zh') ? 'zh' : 'en';
const i18n = {
  zh: {
    title:'推测解码原理可视化', subtitle:'调整候选配置，观察验证后实际接受的 Token、KV 和输出速度',
    eagle2:'EAGLE-2', dspark:'DSpark', language:'Switch to English', langToggle:'EN',
    play:'播放', pause:'暂停', replay:'重播', reset:'重置', next:'下一步', nextRound:'进入下一轮',
    raceControls:'竞速控制', traceControls:'算法轨迹控制', raceTitle:'相同时间内，能提交多少 Token？',
    raceHint:'两条路径都从 Target 已生成的 predict 开始。每个周期按实际接受结果推进；点选周期可查看同一轮的内部过程。',
    settings:'实验参数', details:'参数说明',
    depthShort:'每轮向前推测多少步', widthShort:'每步展开多少个候选分支', budgetShort:'一次最多送入 Target 的节点数（含锚点）', blockShort:'一次生成的候选数量',
    parameterSourceEagle:'SGLang · 运行时配置', parameterSourceDspark:'DeepSpec · 模型配置',
    experimentNote:'固定教学样例与计时条件；接受率由验证结果统计。',
    depth:'Draft 展开步数', depthHint:'每轮自回归展开深度；不是下方教学阶段数。',
    width:'Top-k 展开宽度', widthHint:'每层选 Top-k 父节点继续，每个父节点保留 Top-k 子候选。',
    budget:'Target 验证容量', budgetHint:'包括 1 个已知锚点。Top-k=1 时按 SGLang 口径设为 steps+1；实际节点不足时不补虚假候选。',
    block:'Draft 候选块长度', blockHint:'对应 DeepSpec 模型配置 block_size。输入为 1 个锚点及其余 Mask；实际送验长度由调度选择。这里比较不同块长的教学配置，不表示任意 checkpoint 可直接修改块长。',
    baseline:'标准自回归', speculative:'当前推测方案', baselineHint:'每单位时间完成一次 Target 单 Token 前向',
    drafting:'Draft', verifying:'Target 验证', committing:'接受 / 提交', seconds:'Target 单 Token 时间单位',
    current:'当前', round:'轮', inspect:'查看此轮', seed:'共同起点 · 已有 Target 锚点', output:'已提交输出', noOutput:'尚未提交新 Token',
    more:'领先', less:'落后', tied:'输出持平', tokens:'Token', finished:'时间预算结束', waiting:'等待开始',
    actualRate:'实际接受率（候选利用率）', cumulative:'累计候选利用率', meanLength:'平均每轮新增', rateHint:'已接受 / 已送验 Draft；含旁支和首拒后后缀，不含锚点与 Target 补发。比例更高不一定更快。',
    unknown:'待验证', noDraft:'未送验 Draft', actual:'实际', accepted:'已接受 Draft', verified:'已送验 Draft',
    architecture:'模型如何协作，候选如何变成输出？', architectureHint:'左侧跟随当前阶段标出正在运行的部件；右侧从同一解码轮次展开算法细节。主轨迹使用贪心验证，词和分数均为合成教学数据。',
    overview:'模型关系总览', target:'Target 原模型', transformer:'Transformer 层堆叠', targetHint:'完整原权重 · 候选带正确位置与 Mask 穿过所有层',
    featurePort:'特征 / 锚点 → Draft', returnPort:'候选 + Mask → Target', draft:'Draft 旁路模型',
    shared:'共享冻结权重', learned:'Draft 权重', runtime:'运行时逻辑', activation:'请求张量',
    featureEagle:'Target 特征', featureDspark:'多层 Target 特征', embedding:'Token Embedding', projection:'特征融合 / 投影',
    eagleDecoder:'一层自回归 Decoder', parallelDecoder:'块并行 Backbone', lmHead:'共享 LM Head', markov:'低秩 Markov Head',
    confidenceHead:'Confidence Head', controller:'选取 / Mask / 调度', draftCache:'Draft 上下文状态', draftCacheHint:'由 Target 特征建立 Draft 自己的上下文 KV；临时树分支不冒充 Target KV。后续轮按已接受前缀同步。',
    kv:'Target KV', prefix:'已有 Prefix', reserve:'预留', temporary:'临时写入', stable:'已提交 / 回收', empty:'未分配', free:'回收',
    kvHint:'按节点 ID 选取接受路径并压紧，其余回收。映射左侧是从 1 起算的本轮输入编号，右侧是从 0 起算的新 Prefix 索引。',
    gather:'接受路径 → 新 Prefix 槽', pendingAnchor:'新锚点已输出，KV 待下一轮 Target 前向', carried:'上一轮补发 Token → 本轮锚点',
    anchorKv:'本轮锚点的 KV 在此 Target 验证中生成', length:'长度', draftActive:'读取 / 生成 Draft 状态',
    mechanism:'算法过程', eventStep:'教学阶段', ready:'准备开始', done:'本轮完成', eventHint:'阶段是教学操作；EAGLE 的展开深度与 DSpark 的顺序位置单独标出。',
    stageExpand:'Draft 按层展开', stageSelect:'路径分数重排', stageBackbone:'并行 Backbone', stageMarkov:'顺序 Markov',
    stageConfidence:'预测条件存活率', stageSchedule:'因果前缀调度', stageReserve:'预留 KV / 构造 Mask',
    stageVerify:'Target 一次块前向', stageAccept:'按路径判断接受', stageCommit:'提交并压紧 KV',
    depthNow:'深度', position:'位置', tree:'动态候选树', treeHint:'点击节点查看祖先路径与 Mask 行；灰色占位尚未生成。每层扩展来自上一层的 Top-k 选择；窄屏可横向滚动查看旁支。',
    root:'Target 锚点', selected:'选中', pending:'待生成', proposed:'已生成', skipped:'未送验', discarded:'未采用', committed:'已提交',
    mask:'祖先可见 Mask', maskHint:'行是 Query，列是 Key；保留 Prefix 另行全部可见。同层节点位置相同，兄弟分支不可互看。',
    query:'当前 Query', visible:'可见', isolated:'隔离', noMask:'选取候选后生成 Mask', targetInput:'本轮 Target 输入（含锚点）',
    blockInput:'DSpark 输入', masks:'Mask', base:'并行基础分数', baseHint:'所有基础 logits 同时产生；随后轻量 Markov 头用前一个已采样 Token 调整当前分布。',
    previous:'前一 Token', proposal:'当前候选', baseGuess:'基础首选', confidence:'条件存活率', survival:'前缀存活率',
    scheduler:'验证长度如何决定', schedulerHint:'从仅锚点开始，依次加入连续前缀；预期吞吐第一次不再增加时立即停止。此处为单请求、合成负载曲线，非生产异步调度复刻。',
    candidates:'候选', expectedNew:'预期新增', cost:'Target 成本', throughput:'预期吞吐', decision:'调度', admit:'纳入', stop:'停止', notEvaluated:'未再评估',
    schedulingPending:'等待置信度与调度阶段', checks:'Target 贪心验证', checksHint:'一次并行评分后，沿可接受路径顺序判定；首个不匹配即结束，再由 Target 补发。',
    targetChoice:'Target 首选', verdict:'判定', match:'匹配', reject:'首拒', bonus:'Target 补发', correction:'Target 修正',
    bonusHint:'全部通过或路径终止后补发一个 Token；它成为下一轮锚点。补发不计入 Draft 接受数量。',
    actualOutput:'本轮新增输出', utilization:'候选利用率', whyFast:'为什么可能更快', whyFastText:'用较少的 Target 串行前向提交多个 Token。改变步数、宽度或块长，对照实际采用的候选与每轮新增输出；更多候选也会增加 Draft 和验证开销。',
    sampling:'为什么随机采样仍保持 Target 分布？', samplingHint:'独立的单位置三词实验：主轨迹是贪心验证；这里演示严格拒绝采样。分布一致不等于每次随机结果或随机种子下的文本相同。',
    draw:'接受判断随机数', residualDraw:'补采样随机数', sampleOutput:'本次输出', chooseProposal:'假设 Draft 抽中了', sampleAccept:'接受 Draft 候选', sampleReject:'拒绝 → 从正残差分布补采样',
    threshold:'接受阈值', residual:'拒绝后的分布', mass:'最终概率', exactHint:'p 是 Target 分布，q 是 Draft 分布。直接接受与拒绝后补采样的概率相加，得到表中始终不变的 Target 概率。两者分布相同时没有拒绝，也无需残差采样。',
    acceptanceFormula:'逐位置接受与拒绝修正', lossless:'严格拒绝采样；调度不得依赖未来候选信息。置信度只分配计算量，不决定最终接受。',
    code:'引擎操作伪代码', boundary:'范围与来源', boundaryText:'固定合成候选、分数与归一化成本，不运行真实 checkpoint。参数改变候选展开与送验范围；接受率由验证统计，不代表真实模型预测值。EAGLE-2 使用贪心树验证；DSpark 使用 Markov 版本与单请求因果调度。Prefill 及训练成本不计入竞速。',
    paperEagle:'EAGLE-2 原论文', paperDspark:'DSpark 原论文', docs:'SGLang 参数说明', dsparkConfig:'DSpark 配置来源', samplingPaper:'严格推测采样论文',
    tail:'本轮尚未验证；最终接受率与输出在相应阶段出现。',
    reclaiming:'回收中', logitSlice:'当前顺序位置 · 三词分数切片', sliceHint:'教学分数：前一 Token 选择转移偏置，再加到基础 logits。展示词表的三个代表项，省略其余维度。', bias:'转移偏置', combined:'相加后分数', noMarkov:'逐步播放以观察每个位置的转移偏置',
  },
  en: {
    title:'Speculative Decoding Visualization', subtitle:'Adjust proposal settings; observe accepted tokens, KV, and output speed after verification',
    eagle2:'EAGLE-2', dspark:'DSpark', language:'切换到中文', langToggle:'中文',
    play:'Play',pause:'Pause',replay:'Replay',reset:'Reset',next:'Next step',nextRound:'Next round',
    raceControls:'Race controls',traceControls:'Trace controls',raceTitle:'How many tokens can fit in the same time budget?',
    raceHint:'Both paths start with the Target-produced anchor predict. Each cycle advances by its verified output. Select a cycle to inspect that same round.',
    settings:'Experiment settings',details:'Parameter details',
    depthShort:'How far to draft per round',widthShort:'Candidate branches expanded per step',budgetShort:'Maximum Target input nodes, including the anchor',blockShort:'Candidates produced in one block',
    parameterSourceEagle:'SGLang · runtime configuration',parameterSourceDspark:'DeepSpec · model configuration',
    experimentNote:'Fixed teaching data and timing; acceptance is measured after verification.',
    depth:'Draft expansion steps',depthHint:'Autoregressive expansion depth per round, not the number of teaching stages.',
    width:'Top-k expansion width',widthHint:'Expand the top-k parents in each layer, retaining top-k children per parent.',
    budget:'Target verification capacity',budgetHint:'Includes one known anchor. With top-k=1, use steps+1 as in SGLang. Do not pad a small tree with fictitious candidates.',
    block:'Draft proposal block length',blockHint:'DeepSpec model field: block_size. Input is one anchor plus masks; the scheduler chooses the verified prefix. This compares teaching configurations, not arbitrary block-size changes to an existing checkpoint.',
    baseline:'Autoregressive baseline',speculative:'Current speculative path',baselineHint:'One Target single-token forward per time unit',
    drafting:'Draft',verifying:'Target verify',committing:'Accept / commit',seconds:'Target single-token time units',
    current:'Current',round:'Round',inspect:'Inspect round',seed:'Shared start · existing Target anchor',output:'Committed output',noOutput:'No new tokens committed',
    more:'Ahead by',less:'Behind by',tied:'Same output count',tokens:'tokens',finished:'Time budget reached',waiting:'Ready',
    actualRate:'Observed acceptance (candidate utilization)',cumulative:'Cumulative candidate utilization',meanLength:'Mean new tokens / round',rateHint:'Accepted / verified drafts, including branches and rejected suffixes, excluding the anchor and Target bonus. A higher ratio need not be faster.',
    unknown:'Not verified',noDraft:'No draft verified',actual:'Observed',accepted:'Accepted drafts',verified:'Verified drafts',
    architecture:'How do the models turn proposals into output?',architectureHint:'Left: components active in the current stage. Right: operations in the same decoding round. The main trace uses greedy verification with synthetic tokens and scores.',
    overview:'Model relationships',target:'Original Target',transformer:'Transformer layer stack',targetHint:'Original full weights · candidates traverse every layer with correct positions and masks',
    featurePort:'Features / anchor → Draft',returnPort:'Candidates + mask → Target',draft:'Draft sidecar',
    shared:'Shared frozen weights',learned:'Draft weights',runtime:'Runtime logic',activation:'Request activations',
    featureEagle:'Target feature',featureDspark:'Target layer features',embedding:'Token embedding',projection:'Feature fusion / projection',
    eagleDecoder:'One autoregressive decoder',parallelDecoder:'Block-parallel backbone',lmHead:'Shared LM head',markov:'Low-rank Markov head',
    confidenceHead:'Confidence head',controller:'Selection / mask / scheduling',draftCache:'Draft context state',draftCacheHint:'Target features build the Draft’s own context KV. Temporary draft branches are not Target KV; later rounds synchronize the accepted prefix.',
    kv:'Target KV',prefix:'Existing prefix',reserve:'Reserved',temporary:'Temporary writes',stable:'Committed / reclaimed',empty:'Unallocated',free:'Reclaimed',
    kvHint:'Gather accepted node IDs into a compact prefix and reclaim the others. The mapping uses 1-based input numbers on the left and 0-based new prefix indices on the right.',
    gather:'Accepted path → new prefix slots',pendingAnchor:'New anchor emitted; KV waits for the next Target forward',carried:'Previous bonus → current anchor',
    anchorKv:'Anchor KV is produced in this Target verification',length:'Length',draftActive:'Read / build Draft state',
    mechanism:'Algorithm trace',eventStep:'Teaching stage',ready:'Ready',done:'Round complete',eventHint:'These are teaching operations. Draft depth and sequential position are shown separately.',
    stageExpand:'Layer-wise Draft expansion',stageSelect:'Rerank path scores',stageBackbone:'Parallel backbone',stageMarkov:'Sequential Markov',
    stageConfidence:'Predict conditional survival',stageSchedule:'Causal prefix scheduling',stageReserve:'Reserve KV / build mask',
    stageVerify:'One Target block forward',stageAccept:'Accept along the path',stageCommit:'Commit and compact KV',
    depthNow:'Depth',position:'Position',tree:'Dynamic candidate tree',treeHint:'Select a node to inspect its ancestors and mask row. Gray placeholders are not generated yet. Each depth expands the previous top-k selection. Scroll horizontally for side branches on narrow screens.',
    root:'Target anchor',selected:'Selected',pending:'Pending',proposed:'Proposed',skipped:'Not verified',discarded:'Unused',committed:'Committed',
    mask:'Ancestor-visible mask',maskHint:'Rows are queries; columns are keys. The existing prefix is separately visible. Siblings share positions but cannot see one another.',
    query:'Selected query',visible:'Visible',isolated:'Isolated',noMask:'Mask appears after candidate selection',targetInput:'Target input this round (includes anchor)',
    blockInput:'DSpark input',masks:'Mask',base:'Parallel base scores',baseHint:'Base logits appear together. The lightweight Markov head then conditions each distribution on the previous sampled token.',
    previous:'Previous token',proposal:'Current proposal',baseGuess:'Base top choice',confidence:'Conditional survival',survival:'Prefix survival',
    scheduler:'How is verification length chosen?',schedulerHint:'Start with the anchor; admit a prefix until expected throughput first stops improving. Single-request synthetic profile, not a production asynchronous scheduler.',
    candidates:'Candidates',expectedNew:'Expected new',cost:'Target cost',throughput:'Expected throughput',decision:'Decision',admit:'Admit',stop:'Stop',notEvaluated:'Not evaluated',
    schedulingPending:'Waiting for confidence and scheduling',checks:'Target greedy verification',checksHint:'Parallel scoring is followed by sequential path acceptance. Stop at the first mismatch; the Target emits the next token.',
    targetChoice:'Target top choice',verdict:'Verdict',match:'Match',reject:'First rejection',bonus:'Target bonus',correction:'Target correction',
    bonusHint:'After accepting or ending the path, emit one Target token as the next anchor. It is not counted as an accepted draft.',
    actualOutput:'New output this round',utilization:'Candidate utilization',whyFast:'Why it can be faster',whyFastText:'Fewer serial Target forwards can commit more tokens. Change depth, width, or block length and compare used candidates with new output per round. More candidates also add drafting and verification work.',
    sampling:'Why does random sampling preserve the Target distribution?',samplingHint:'Separate one-position, three-word experiment. The main trace uses greedy verification; this lab uses exact rejection sampling. Equal distributions do not mean identical random draws or seeded text.',
    draw:'Acceptance random draw',residualDraw:'Residual random draw',sampleOutput:'Sample output',chooseProposal:'Assume Draft sampled',sampleAccept:'Accept the draft proposal',sampleReject:'Reject → resample from the positive residual',
    threshold:'Acceptance threshold',residual:'Distribution after rejection',mass:'Final probability',exactHint:'p is the Target distribution; q is the Draft distribution. Direct acceptance and resampling contributions add up to the unchanged Target probabilities. With equal distributions, rejection is impossible and residual sampling is unnecessary.',
    acceptanceFormula:'Per-position acceptance and correction',lossless:'Exact rejection sampling requires non-anticipating scheduling. Confidence allocates compute; it does not decide final acceptance.',
    code:'Engine pseudocode',boundary:'Scope and sources',boundaryText:'Fixed synthetic proposals, scores, and normalized costs, not a live checkpoint. Parameters change proposal expansion and verification; acceptance is an observed teaching result, not a real-model prediction. EAGLE-2 uses greedy trees; DSpark uses Markov drafting and single-request causal scheduling. Prefill and training are outside the race.',
    paperEagle:'EAGLE-2 paper',paperDspark:'DSpark paper',docs:'SGLang parameters',dsparkConfig:'DSpark configuration source',samplingPaper:'Exact speculative sampling',
    tail:'Verification has not happened yet. Acceptance and output appear at their corresponding stages.',
    reclaiming:'Reclaiming',logitSlice:'Current sequential position · three-word score slice',sliceHint:'Synthetic scores: the previous token selects a transition bias, added to base logits. Three representative vocabulary entries are shown; others are omitted.',bias:'Transition bias',combined:'Combined logits',noMarkov:'Step through the trace to inspect each position’s transition bias',
  },
};
const FORMULAS = {
  path:'v_i=\\prod_{j\\in\\mathrm{path}(i)}q_j',
  markov:'q_k(v)=\\mathrm{softmax}\\!\\left(U_k+W_1[x_{k-1}]W_2\\right)_v',
  survival:'a_j=\\prod_{i=1}^{j}c_i',
  schedule:'\\Theta_\\ell=\\left(1+\\sum_{j=1}^{\\ell}a_j\\right)/C_T(1+\\ell)',
  accept:'\\alpha(x)=\\min(1,p(x)/q(x))',
  residual:'r(x)=[p(x)-q(x)]_+\\,/\\!\\sum_y[p(y)-q(y)]_+',
};
const CODES = {
  eagle2:[
    'for depth in range(steps): tree.expand(top_k(frontier), draft.forward)',
    'selected = [anchor] + top_m_connected(tree, verify_capacity - 1)',
    'slots, positions, mask = reserve_and_flatten(selected, prefix_kv)',
    'logits, hidden, kv = target.forward(selected.tokens, positions, mask)',
    'path, bonus = greedy_accept_path_and_target_sample(logits, selected)',
    'gather_kv(slots[path]); reclaim_others(); sync_draft(hidden[path]); next_anchor = bonus',
  ],
  dspark:[
    'U, hidden = backbone([anchor] + [MASK] * (gamma - 1), draft_context_kv)',
    'for k in range(gamma): x[k] = sample(U[k] + W1[x[k-1]] @ W2)',
    'c = confidence_head(hidden, previous_token_embeddings)',
    'length = causal_prefix_scan(c, profile, stop_on_first_non_improvement=True)',
    'slots = reserve([anchor] + x[:length], prefix_kv)',
    'logits, hidden, kv = target.forward([anchor] + x[:length], slots)',
    'path, bonus = greedy_accept_prefix_and_target_sample(logits, x[:length])',
    'gather_kv(slots[path]); reclaim_suffix(); sync_draft(hidden[path]); next_anchor = bonus',
  ],
};
const tones = {
  pending:'border-slate-200 bg-slate-50 text-slate-500',proposed:'border-violet-300 bg-violet-50 text-violet-900',
  selected:'border-blue-400 bg-blue-50 text-blue-900',verifying:'border-blue-500 bg-blue-100 text-blue-950',
  accepted:'border-emerald-500 bg-emerald-50 text-emerald-900',committed:'border-emerald-500 bg-emerald-100 text-emerald-950',
  skipped:'border-dashed border-slate-300 bg-slate-50 text-slate-500',discarded:'border-rose-300 bg-rose-50 text-rose-800',
};
const pct = n => (100*n).toFixed(0)+'%';
function Controls({playing,done,onPlay,onNext,onReset,t,label}) {
  return <div className="flex shrink-0 items-center gap-1" aria-label={t(label)}>
    <button className="spec-icon" onClick={onReset} aria-label={t('reset')} title={t('reset')}><RotateCcw size={15}/></button>
    <button className="spec-icon !bg-blue-600 !text-white" onClick={onPlay} aria-label={t(playing?'pause':done?'replay':'play')} title={t(playing?'pause':done?'replay':'play')}>{playing?<Pause size={16}/>:<Play size={16}/>}</button>
    <button className="spec-icon" onClick={onNext} aria-label={t('next')} title={t('next')} disabled={done}><SkipForward size={16}/></button>
  </div>;
}
function Parameter({name,hint,short,value,min,max,onChange,disabled=false,flag,t}) {
  return <div className="min-w-0 space-y-1">
    <label htmlFor={'spec-param-'+name} className="flex items-start justify-between gap-2 text-xs font-semibold"><span>{t(name)}</span><strong className="text-blue-700">{value}</strong></label>
    {flag&&<code className="block break-all text-[10px] text-slate-500">{flag}</code>}
    <input id={'spec-param-'+name} aria-label={t(name)} type="range" min={min} max={max} step="1" value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} className="w-full accent-blue-600 disabled:opacity-40"/>
    <details className="text-[11px] leading-relaxed text-slate-500"><summary aria-label={t(name)+' · '+t('details')} className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{t(short)}</summary><p className="mt-1 rounded border border-slate-200 bg-white p-2">{t(hint)}</p></details>
  </div>;
}
function Settings({s,config,setConfig,t}) {
  const update=(key,value)=>setConfig({...config,[key]:value});
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="speculative-settings">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{t('settings')} · {t(s.algorithm)}</h3><span className="text-[11px] text-slate-500">{t(s.algorithm==='eagle2'?'parameterSourceEagle':'parameterSourceDspark')}</span></div>
    <div className={'grid gap-4 '+(s.algorithm==='eagle2'?'sm:grid-cols-3':'max-w-sm')}>
      {s.algorithm==='eagle2'?<>
        <Parameter name="depth" hint="depthHint" short="depthShort" value={s.depth} min={1} max={5} onChange={v=>update('depth',v)} flag="--speculative-num-steps" t={t}/>
        <Parameter name="width" hint="widthHint" short="widthShort" value={s.width} min={1} max={3} onChange={v=>update('width',v)} flag="--speculative-eagle-topk" t={t}/>
        <Parameter name="budget" hint="budgetHint" short="budgetShort" value={s.budget} min={2} max={16} onChange={v=>update('budget',v)} disabled={s.width===1} flag="--speculative-num-draft-tokens" t={t}/>
      </>:<Parameter key="block" name="block" hint="blockHint" short="blockShort" value={s.blockSize} min={1} max={8} onChange={v=>update('blockSize',v)} flag="block_size" t={t}/>}
    </div>
    <p className="mt-2 text-[11px] text-slate-500">{t('experimentNote')}</p>
  </div>;
}
function TokenStream({tokens,t}) {
  return <div className="flex min-h-8 flex-wrap items-center gap-1">{tokens.length?tokens.map((token,i)=><motion.span key={i} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} className="rounded border border-emerald-200 bg-white px-1.5 py-1 text-xs text-emerald-900">{token}</motion.span>):<span className="text-xs text-slate-400">{t('noOutput')}</span>}</div>;
}
function Race({s,t,playing,onPlay,onNext,onReset,onInspect,config,setConfig}) {
  const r=s.race;
  return <section className="spec-card space-y-3" data-testid="speculative-race">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{t('raceTitle')}</h2><p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500">{t('raceHint')}</p></div><Controls t={t} label="raceControls" playing={playing} done={r.isDone} onPlay={onPlay} onNext={onNext} onReset={onReset}/></div>
    <Settings s={s} config={config} setConfig={setConfig} t={t}/>
    <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{t('seed')}: <strong>{[...PREFIX,STREAM[0]].join(' ')}</strong></span><span className="font-semibold tabular-nums">{r.elapsed.toFixed(1)} / {r.timeBudget} · {t('seconds')}</span></div>
    <div className="space-y-3">
      <div className="spec-lane"><div className="flex justify-between text-sm font-bold"><span>{t('baseline')}</span><span>{r.baselineCount} {t('tokens')}</span></div>
        <div className="my-2 flex h-8 gap-1">{Array.from({length:r.timeBudget},(_,i)=><div key={i} className={'flex flex-1 items-center justify-center rounded border text-[10px] '+(i<r.baselineCount?'border-emerald-300 bg-emerald-100':'border-slate-200 bg-white')}>{i+1}</div>)}</div><TokenStream tokens={r.baselineTokens} t={t}/>
      </div>
      <div className="spec-lane !border-blue-200 !bg-blue-50/40"><div className="flex justify-between text-sm font-bold text-blue-950"><span>{t('speculative')} · {t(s.algorithm)}</span><span>{r.speculativeCount} {t('tokens')}</span></div>
        <div className="relative my-2 h-12" aria-label={t('inspect')}>
          {r.cycles.map(c=>{
            const end=Math.min(c.end,r.timeBudget),span=end-c.start;
            return <button key={c.index} title={t('inspect')+' '+(c.index+1)} aria-label={t('inspect')+' '+(c.index+1)} onClick={()=>onInspect(c.index)} className={'absolute inset-y-0 overflow-hidden rounded border text-left '+(s.roundIndex===c.index?'border-blue-600 ring-1 ring-blue-500':'border-blue-200')} style={{left:c.start/r.timeBudget*100+'%',width:span/r.timeBudget*100+'%'}}>
              <span className="absolute inset-y-0 left-0 bg-violet-200" style={{width:Math.min(span,c.draftEnd-c.start)/span*100+'%'}}/>
              <span className="absolute inset-y-0 bg-blue-200" style={{left:(c.draftEnd-c.start)/span*100+'%',width:Math.max(0,Math.min(end,c.verifyEnd)-c.draftEnd)/span*100+'%'}}/>
              <span className="absolute inset-y-0 bg-amber-200" style={{left:(c.verifyEnd-c.start)/span*100+'%',width:Math.max(0,end-c.verifyEnd)/span*100+'%'}}/>
              <span className="relative block px-1 pt-1 text-[10px] font-bold">{t('round')} {c.index+1}</span>
              {c.completed&&<span className="relative block px-1 text-xs font-bold text-emerald-900">+{c.output.length}</span>}
            </button>;
          })}
          <div className="pointer-events-none absolute inset-y-0 border-l-2 border-rose-500" style={{left:r.elapsed/r.timeBudget*100+'%'}}/>
        </div><div className="mb-2 flex flex-wrap gap-3 text-[11px] text-slate-600">{[['drafting','bg-violet-200'],['verifying','bg-blue-200'],['committing','bg-amber-200']].map(([key,color])=><span key={key} className="flex items-center gap-1"><i className={'h-2 w-3 rounded '+color}/>{t(key)}</span>)}</div><TokenStream tokens={r.speculativeTokens} t={t}/>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs">
      <span>{r.isDone?t('finished'):r.event?t(r.event.labelKey):t('waiting')} · <strong className={r.lead<0?'text-rose-700':'text-emerald-700'}>{r.lead===0?t('tied'):t(r.lead>0?'more':'less')+' '+Math.abs(r.lead)+' '+t('tokens')}</strong></span>
      <span>{t('cumulative')}: <strong>{s.acceptance.cumulativeRate===null?'—':pct(s.acceptance.cumulativeRate)}</strong> ({s.acceptance.cumulativeAccepted}/{s.acceptance.cumulativeVerified}) · {t('meanLength')}: {s.acceptance.meanLength.toFixed(2)}</span>
    </div>
  </section>;
}
function Relation({s,t}) {
  const owner=s.architecture.activeOwner;
  return <aside className="min-w-0 space-y-3" data-testid="static-weight-topology">
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><h3 className="mb-2 text-sm font-bold">{t('overview')}</h3>
      <div data-testid="target-model-tower" className={'rounded-lg border-2 bg-white p-3 '+(owner==='target'?'border-rose-400 ring-2 ring-rose-100':'border-blue-200')}>
        <div className="flex items-center gap-2 text-sm font-bold text-blue-950"><Cpu size={16}/>{t('target')}<MathFormula>{'\\theta_T'}</MathFormula></div>
        <div className="my-2 flex items-center justify-between gap-1 text-[11px]"><span>E</span><ArrowRight size={12}/><span className="rounded border border-blue-300 bg-blue-50 p-1.5 shadow-[2px_-2px_0_0_#bfdbfe]">{t('transformer')} <MathFormula>{'L_T'}</MathFormula></span><ArrowRight size={12}/><span>LM</span></div>
        <p className="text-[11px] leading-relaxed text-slate-500">{t('targetHint')}</p>
      </div>
      <div className="my-2 flex flex-wrap justify-between gap-1 text-[10px] font-semibold"><span className={owner==='draft'?'text-violet-700':'text-slate-500'}>{t('featurePort')}</span><span className={owner==='target'?'text-blue-700':'text-slate-500'}>{t('returnPort')}</span></div>
      <div data-testid="draft-model-tower" className={'rounded-lg border-2 bg-white p-2.5 '+(owner==='draft'?'border-rose-400':'border-violet-200')}>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold"><BrainCircuit size={15}/>{t(s.algorithm)} <MathFormula>{'\\theta_D'}</MathFormula></div>
        <div className="grid grid-cols-2 gap-1.5" data-testid="draft-internal-flow">{s.architecture.groups.map((g,i)=><div key={g.id} title={t(g.kind==='draft'?'learned':g.kind)} className={'min-w-0 rounded border p-1.5 '+(g.active?'border-rose-400 ring-1 ring-rose-300 ':'')+({shared:'bg-amber-50 text-amber-950',draft:'bg-violet-50 text-violet-950',activation:'bg-cyan-50 text-cyan-950',runtime:'bg-slate-100 text-slate-700'}[g.kind])}>
          <div className="text-[10px] font-semibold leading-snug">{i+1}. {t(g.labelKey)}{g.active&&<span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-500"/>}</div>{g.formula&&<div className="mt-1 overflow-x-auto text-[10px]"><MathFormula>{g.formula}</MathFormula></div>}
        </div>)}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]"><span className="text-amber-800">{t('shared')}</span><span className="text-violet-800">{t('learned')}</span></div>
      </div>
      <div className="my-2 text-center text-slate-400"><ArrowDown size={14} className="mx-auto"/></div>
      <Kv s={s} t={t}/>
      <div className={'mt-2 rounded border p-2 '+(s.kv.draftContextActive?'border-violet-400 bg-violet-50':'border-slate-200 bg-white')}><div className="text-xs font-semibold">{t('draftCache')} · {s.kv.draftPrefixLength}</div><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t('draftCacheHint')}</p></div>
    </div>
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><h4 className="text-xs font-bold text-blue-950">{t('whyFast')}</h4><p className="mt-1 text-xs leading-relaxed text-blue-900">{t('whyFastText')}</p></div>
  </aside>;
}
function Kv({s,t}) {
  const tone={empty:'border-dashed border-slate-300 bg-white',reserved:'border-dashed border-blue-400 bg-blue-50',temporary:'border-blue-500 bg-blue-100',committing:'border-emerald-500 bg-emerald-50',reclaiming:'border-rose-400 bg-rose-100',committed:'border-emerald-500 bg-emerald-100',free:'border-dashed border-rose-300 bg-rose-50'};
  return <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2.5" data-testid="compact-kv-relation" data-kv-state={s.kv.state}>
    <div className="flex items-center justify-between text-xs font-bold"><span className="flex items-center gap-1"><Database size={14}/>{t('kv')}</span><span>{t(s.kv.state==='reserved'?'reserve':s.kv.state)}</span></div>
    <div className="my-2 rounded bg-slate-200 px-2 py-1 text-[11px]">{t('prefix')} · {s.kv.prefixLength} → {s.kv.committedPrefixLength}</div>
    <div className="flex flex-wrap gap-1">{s.kv.slots.map(slot=><div key={slot.id} data-kv-node={slot.id} data-kv-slot-state={slot.state} title={(s.selectedVisible?slot.token:t('empty'))+' · '+(slot.destination??'—')} className={'min-w-9 rounded border px-1 py-1 text-center text-[11px] '+tone[slot.state]}>{slot.index+1}<span className="block max-w-16 truncate text-[10px]">{slot.id==='root'?s.round.nodes[0].token:s.selectedVisible?slot.token:'—'}</span></div>)}</div>
    <p className="mt-2 text-[11px] leading-relaxed text-cyan-950">{t('kvHint')}</p>
    {s.kv.gathered.length>0&&<div className="mt-2 text-[11px]"><strong>{t('gather')}</strong><div className="mt-1 flex flex-wrap gap-1">{s.kv.gathered.map(slot=><span key={slot.id} className="rounded bg-emerald-100 px-1 text-emerald-950">{slot.index+1} → {slot.destination}</span>)}</div></div>}
    <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-1.5 text-[11px]">{s.committed?t('pendingAnchor'):t('anchorKv')}: <strong>{s.kv.pendingAnchor}</strong></div>
    {s.kv.carriedAnchor&&<p className="mt-1 text-[11px]">{t('carried')}: <strong>{s.kv.carriedAnchor}</strong></p>}
  </div>;
}
function layoutTree(nodes) {
  const positions={};
  const levels=Array.from({length:Math.max(...nodes.map(x=>x.level))+1},(_,level)=>nodes.filter(n=>n.level===level));
  const width=Math.max(460,Math.max(...levels.map(row=>row.length))*104);
  levels.forEach((row,level)=>row.forEach((node,index)=>{positions[node.id]={x:(index+0.5)*width/row.length,y:level};}));
  return {positions,width,height:levels.length*82+24};
}
function Eagle({s,t,selectedNode,setSelectedNode}) {
  const l=layoutTree(s.candidates);
  const treeRef=useRef(null);
  useEffect(()=>{
    const el=treeRef.current;
    const center=()=>{el.scrollLeft=Math.max(0,(l.width-el.clientWidth)/2);};
    center();
    const observer=new ResizeObserver(center);observer.observe(el);
    return ()=>observer.disconnect();
  },[l.width,s.roundIndex]);
  const query=s.candidates.find(x=>x.id===selectedNode&&x.generated)||(s.selectedVisible?s.round.selected[s.round.selected.length-1]:s.candidates[0]);
  const rowIndex=s.round.selected.findIndex(x=>x.id===query.id);
  const ancestors=new Set();
  let ancestor=query;
  while(ancestor){ancestors.add(ancestor.id);ancestor=s.candidates.find(x=>x.id===ancestor.parent);}
  const point=id=>({x:l.positions[id].x,y:40+l.positions[id].y*82});
  return <div className="spec-tree-mask">
    <div className="min-w-0"><div className="mb-2 flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold">{t('tree')}</h4><div className="max-w-full overflow-x-auto px-1 text-xs"><MathFormula>{FORMULAS.path}</MathFormula></div></div><p className="mb-2 text-[11px] leading-relaxed text-slate-500">{t('treeHint')}</p>
      <div ref={treeRef} className="overflow-x-auto rounded-lg border border-violet-200 bg-violet-50/30" data-testid="eagle-tree"><div className="relative" style={{width:l.width,height:l.height}}>
        <svg width={l.width} height={l.height} className="absolute inset-0" aria-hidden="true">{s.candidates.filter(x=>x.parent).map(n=>{const a=point(n.parent),b=point(n.id);return <line key={n.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.hasVerdict&&n.accepted?'#059669':ancestors.has(n.id)&&s.selectedVisible?'#7c3aed':'#cbd5e1'} strokeDasharray={n.generated?undefined:'4 3'} strokeWidth={2}/>;})}</svg>
        {s.candidates.map(n=>{const p=point(n.id);return <button key={n.id} onClick={()=>setSelectedNode(n.id)} disabled={!n.generated} title={n.generated?n.token:t('pending')} aria-label={t('query')+' '+n.id+' '+(n.generated?n.token:t('pending'))} className={'absolute w-[94px] -translate-x-1/2 -translate-y-1/2 rounded-md border px-1 py-1 text-center '+tones[n.status]+(query.id===n.id?' ring-2 ring-violet-400':'')} style={{left:p.x,top:p.y}}>
          <span className="block truncate text-xs font-bold">{n.generated?n.token:'···'}</span><span className="block text-[10px]">{n.id==='root'?t('root'):t(n.status)}</span><span className="block text-[10px] tabular-nums">{n.generated&&n.id!=='root'?'q '+n.probability.toFixed(2)+' · v '+n.value.toFixed(2):n.id}</span>
        </button>;})}
      </div></div>
    </div>
    <div className="min-w-0 rounded-lg border border-cyan-200 bg-cyan-50/30 p-3" data-testid="ancestor-mask">
      <h4 className="text-sm font-bold">{t('mask')}</h4><p className="my-2 text-[11px] leading-relaxed text-slate-600">{t('maskHint')}</p>
      {s.selectedVisible?<><div className="mb-2 text-xs">{t('query')}: <strong>{query.token}</strong> · {rowIndex<0?t('skipped'):t('visible')+': '+s.round.selected.filter(x=>ancestors.has(x.id)).map(x=>x.token).join(' → ')}</div>
        <div className="overflow-x-auto"><table className="border-separate border-spacing-0.5 text-[10px]"><thead><tr><th>Q / K</th>{s.round.selected.map((n,i)=><th key={n.id} title={n.token}>{i+1}</th>)}</tr></thead><tbody>{s.round.mask.map((row,i)=><tr key={i}><th className="max-w-20 truncate pr-1 text-left" title={s.round.selected[i].token}><button onClick={()=>setSelectedNode(s.round.selected[i].id)} className={rowIndex===i?'text-violet-700 underline':''}>{i+1}. {s.round.selected[i].token}</button></th>{row.map((v,j)=><td key={j} title={s.round.selected[i].token+' → '+s.round.selected[j].token+' · '+t(v?'visible':'isolated')} className={'h-4 min-w-4 border text-center '+(rowIndex===i?'border-violet-500 ':'border-transparent ')+(v?'bg-cyan-500 text-white':'bg-slate-100 text-slate-400')}>{v?'1':'0'}</td>)}</tr>)}</tbody></table></div>
        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{s.round.selected.map((n,i)=><span key={n.id} className="rounded border border-blue-200 bg-white px-1 py-0.5">{i+1}. {n.token} · {t('position')} {PREFIX.length+s.round.cursor+n.level}</span>)}</div>
      </>:<p className="text-xs text-slate-400">{t('noMask')}</p>}
    </div>
  </div>;
}
function Dspark({s,t}) {
  const nodes=s.candidates.slice(1);
  const detail=nodes[Math.max(0,Math.min(nodes.length-1,s.markovPosition-1))];
  const backboneReady=s.phase!=='idle';
  const confidenceReady=s.hasVerdict||s.phase==='done'||s.step>=s.round.events.findIndex(x=>x.type==='confidence')&&s.phase==='running';
  return <div className="space-y-3" data-testid="dspark-block">
    <div className="rounded-lg border border-cyan-200 bg-cyan-50/30 p-3"><h4 className="text-sm font-bold">{t('blockInput')}</h4>
      <div className="my-2 flex flex-wrap items-center gap-1 text-xs"><strong className="rounded bg-slate-800 px-2 py-1 text-white">{s.round.nodes[0].token}</strong>{Array.from({length:s.blockSize-1},(_,i)=><span key={i} className="rounded border border-dashed border-cyan-400 px-2 py-1">{t('masks')}</span>)}<ArrowRight size={14}/><span>{s.blockSize} {t('base')}</span></div>
      <p className="text-xs leading-relaxed text-slate-600">{t('baseHint')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{nodes.map((n,i)=><div key={n.id} className={'rounded border p-2 '+(s.event?.type==='backbone'?'border-rose-400 bg-white':'border-cyan-200 bg-white')}><div className="text-[11px] text-cyan-800"><MathFormula>{'U_{'+(i+1)+'}'}</MathFormula> · {t('baseGuess')}</div><div className="mt-1 text-sm font-bold">{backboneReady?n.baseToken:'···'}</div></div>)}</div>
    </div>
    <div className="rounded-lg border border-violet-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">{t('markov')}</h4><div className="max-w-full overflow-x-auto text-xs"><MathFormula>{FORMULAS.markov}</MathFormula></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{nodes.map((n,i)=><div key={n.id} className={'rounded border p-2 '+(s.event?.type==='markov'&&s.event.position===i+1?'border-rose-400 ring-1 ring-rose-200 ':'')+tones[n.status]}>
        <div className="text-[11px]">{t('position')} {i+1}</div><div className="mt-1 text-[10px]">{t('previous')}: {i===0?s.round.nodes[0].token:s.markovPosition>=i?nodes[i-1].token:'···'}</div><div className="my-1 flex items-center gap-1"><ArrowRight size={13}/><strong className="text-sm">{n.generated?n.token:'···'}</strong></div>
        <div className="text-[10px]">{t(n.status)}</div>
        {confidenceReady&&<div className="mt-2 border-t border-current/10 pt-1 text-[11px]"><div>{t('confidence')}: {pct(n.confidence)}</div><div>{t('survival')}: {pct(s.round.scheduler.rows[i].survival)}</div></div>}
      </div>)}</div>
      {s.markovPosition>0?<div className="mt-3 overflow-x-auto rounded border border-violet-100 p-2"><div className="text-xs font-semibold">{t('logitSlice')} {detail.level} · {t('previous')}: {detail.previous}</div><p className="my-1 text-[11px] text-slate-500">{t('sliceHint')}</p><table className="w-full text-left text-[11px]"><thead><tr><th>{t('candidates')}</th><th><MathFormula>{'U_k'}</MathFormula></th><th>{t('bias')}</th><th>{t('combined')}</th></tr></thead><tbody>{detail.vocabulary.map((word,i)=><tr key={i} className={word===detail.token?'bg-violet-50 text-violet-900 font-semibold':''}><td className="py-1">{word}</td><td>{detail.baseLogits[i].toFixed(1)}</td><td>{detail.bias[i].toFixed(1)}</td><td>{detail.logits[i].toFixed(1)}</td></tr>)}</tbody></table></div>:<p className="mt-2 text-xs text-slate-400">{t('noMarkov')}</p>}
    </div>
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3" data-testid="dspark-scheduler">
      <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold">{t('scheduler')}</h4><div className="max-w-full overflow-x-auto text-xs"><MathFormula>{FORMULAS.schedule}</MathFormula></div></div>
      <p className="my-2 text-xs leading-relaxed text-slate-600">{t('schedulerHint')}</p>
      {s.selectedVisible?<div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead><tr>{['candidates','expectedNew','cost','throughput','decision'].map(key=><th className="px-2 py-1" key={key}>{t(key)}</th>)}</tr></thead><tbody>{s.round.scheduler.rows.map(row=><tr key={row.index} className={row.admitted?'bg-emerald-50':row.evaluated?'bg-rose-50':'text-slate-400'}><td className="px-2 py-1">{row.index+1}</td><td className="px-2">{row.evaluated?row.expected.toFixed(2):'—'}</td><td className="px-2">{row.evaluated?row.cost.toFixed(2):'—'}</td><td className="px-2">{row.evaluated?<div className="flex items-center gap-1"><span>{row.throughput.toFixed(2)}</span><span className="h-1.5 max-w-20 rounded bg-orange-400" style={{width:row.throughput*20}}/></div>:'—'}</td><td className="px-2">{t(row.admitted?'admit':row.evaluated?'stop':'notEvaluated')}</td></tr>)}</tbody></table></div>:<p className="text-xs text-slate-400">{t('schedulingPending')}</p>}
    </div>
  </div>;
}
function Verification({s,t}) {
  return <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/20 p-3" data-testid="verification-result">
    <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold">{t('checks')}</h4><span className="text-xs">{t('actualRate')}: <strong>{s.acceptance.rate===null?t(s.hasVerdict?'noDraft':'unknown'):pct(s.acceptance.rate)}</strong> ({s.acceptance.accepted}/{s.acceptance.verified})</span></div>
    <p className="text-[11px] leading-relaxed text-slate-500">{t('rateHint')}</p>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs"><span>{t('accepted')}: <strong>{s.hasVerdict?s.acceptance.accepted:'—'}</strong></span><span>{t('verified')}: <strong>{s.selectedVisible?s.acceptance.verified:'—'}</strong></span></div>
    <div className="h-2 rounded bg-slate-100" aria-label={t('utilization')}><div className="h-full rounded bg-emerald-500" style={{width:pct(s.acceptance.rate??0)}}/></div>
    {s.selectedVisible&&<div className="flex flex-wrap gap-1 text-[11px]"><span className="mr-1 font-semibold">{t('targetInput')}:</span>{s.round.selected.map((n,i)=><span key={n.id} className="rounded border border-blue-200 bg-white px-1">{i+1}. {n.token}</span>)}</div>}
    {s.hasVerdict?<><p className="text-xs text-slate-600">{t('checksHint')}</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['position','candidates','targetChoice','verdict'].map(key=><th key={key} className="py-1 pr-2">{t(key)}</th>)}</tr></thead><tbody>{s.round.checks.map((check,i)=><tr key={i} className={check.accepted?'text-emerald-800':'text-rose-700'}><td className="py-1">{check.position}</td><td>{check.proposals.join(' / ')}</td><td className="font-bold">{check.expected}</td><td>{t(check.accepted?'match':'reject')}</td></tr>)}</tbody></table></div><div className="text-xs"><strong>{t(s.round.rejected?'correction':'bonus')}: {s.round.bonus}</strong><p className="mt-1 text-slate-500">{t('bonusHint')}</p></div></>:<p className="text-xs text-slate-400">{t('tail')}</p>}
    <div className="border-t border-emerald-100 pt-2"><div className="mb-1 text-xs font-semibold">{t('actualOutput')}</div><TokenStream tokens={s.committedTokens} t={t}/></div>
  </div>;
}
function Workbench({s,t,playing,onPlay,onNext,onReset,onRound,selectedNode,setSelectedNode}) {
  return <section className="spec-card" data-testid="speculative-architecture">
    <h2 className="text-lg font-bold">{t('architecture')}</h2><p className="mb-4 mt-1 text-xs leading-relaxed text-slate-500">{t('architectureHint')}</p>
    <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[310px_minmax(0,1fr)]">
      <Relation s={s} t={t}/>
      <div className="spec-workbench min-w-0 space-y-3" data-testid="algorithm-workbench">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div><h3 className="text-sm font-bold">{t('mechanism')} · {t(s.algorithm)}</h3><label className="mt-2 flex items-center gap-2 text-xs">{t('round')}<select aria-label={t('round')} className="rounded border bg-white px-2 py-1" value={s.roundIndex} onChange={e=>onRound(Number(e.target.value))}>{s.rounds.map(r=><option key={r.index} value={r.index}>{r.index+1}</option>)}</select><span className="max-w-56 truncate" title={[...PREFIX,...STREAM.slice(0,s.round.cursor+1)].join(' ')}>{s.round.nodes[0].token}</span></label></div>
          <Controls playing={playing} done={s.phase==='done'} onPlay={onPlay} onNext={onNext} onReset={onReset} t={t} label="traceControls"/>
        </div>
        <div className="text-xs font-semibold" data-testid="trace-stage">{t('eventStep')} {s.phase==='idle'?0:s.phase==='done'?s.maxStep:s.step+1}/{s.maxStep} · {s.event?t(s.event.labelKey):t(s.phase==='done'?'done':'ready')}{s.event?.level?' · '+t('depthNow')+' '+s.event.level:''}{s.event?.position?' · '+t('position')+' '+s.event.position:''}</div>
        <div className="flex h-1.5 gap-1" aria-hidden="true">{s.stages.map((stage,i)=><div key={i} className={'flex-1 rounded '+(stage.status==='active'?'bg-rose-500':stage.status==='passed'?'bg-emerald-400':'bg-slate-200')}/>)}</div>
        <p className="text-[11px] text-slate-500">{t('eventHint')}</p>
        {s.algorithm==='eagle2'?<Eagle s={s} t={t} selectedNode={selectedNode} setSelectedNode={setSelectedNode}/>:<Dspark s={s} t={t}/>}
        <Verification s={s} t={t}/>
        {s.phase==='done'&&<button className="spec-small-button" onClick={()=>onRound((s.roundIndex+1)%s.rounds.length)}>{t('nextRound')} →</button>}
      </div>
    </div>
  </section>;
}
function Principles({s,t}) {
  const [draw,setDraw]=useState(0.82);
  const [residualDraw,setResidualDraw]=useState(0.37);
  const [proposal,setProposal]=useState(2);
  const m=deriveSamplingModel(90,draw,proposal,residualDraw);
  return <div className="grid min-w-0 items-start gap-3 xl:grid-cols-2">
    <section className="spec-card min-w-0" data-testid="sampling-lab"><h3 className="text-base font-bold">{t('sampling')}</h3><p className="my-2 text-xs leading-relaxed text-slate-600">{t('samplingHint')}</p>
      <div className="my-3 flex flex-wrap items-center gap-3"><label className="text-xs">{t('chooseProposal')} <select aria-label={t('chooseProposal')} value={proposal} onChange={e=>setProposal(Number(e.target.value))} className="rounded border px-2 py-1">{['A','B','C'].map((token,i)=><option key={token} value={i}>{token}</option>)}</select></label><label className="flex items-center gap-2 text-xs">{t('draw')} {draw.toFixed(2)}<input aria-label={t('draw')} type="range" min="0" max="0.99" step="0.01" value={draw} onChange={e=>setDraw(Number(e.target.value))} className="w-24 accent-blue-600"/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><thead><tr><th>Token</th><th>p</th><th>q</th><th>{t('residual')}</th><th>{t('mass')}</th></tr></thead><tbody>{['A','B','C'].map((token,i)=><tr key={token} className={proposal===i?'bg-blue-50':''}><td className="py-2 font-semibold">{token}</td><td>{m.p[i].toFixed(3)}</td><td>{m.q[i].toFixed(3)}</td><td>{m.rejection<1e-10?'—':m.residual[i].toFixed(3)}</td><td className="font-bold text-emerald-700">{m.result[i].toFixed(3)}</td></tr>)}</tbody></table></div>
      <div className={'my-2 rounded border px-3 py-2 text-xs '+(m.accepted?'border-emerald-300 bg-emerald-50':'border-orange-300 bg-orange-50')}>{t('threshold')}: {m.threshold.toFixed(3)} · {t(m.accepted?'sampleAccept':'sampleReject')}</div>
      {!m.accepted&&<label className="my-2 flex flex-wrap items-center gap-2 text-xs">{t('residualDraw')} {residualDraw.toFixed(2)}<input aria-label={t('residualDraw')} type="range" min="0" max="0.99" step="0.01" value={residualDraw} onChange={e=>setResidualDraw(Number(e.target.value))} className="w-28 accent-orange-600"/></label>}
      <div className="text-xs font-semibold text-emerald-800">{t('sampleOutput')}: {['A','B','C'][m.output]}</div>
      <div className="space-y-2 overflow-x-auto py-2 text-xs"><div><MathFormula>{FORMULAS.accept}</MathFormula></div><div><MathFormula>{FORMULAS.residual}</MathFormula></div></div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{t('exactHint')}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{t('lossless')}</p>
    </section>
    <div className="min-w-0 space-y-3"><section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] text-slate-300"><h3 className="border-b border-slate-700 p-3 text-xs font-bold">{t('code')} · {t(s.algorithm)}</h3><pre className="overflow-x-auto p-3 text-[11px] leading-6">{CODES[s.algorithm].map((line,i)=><div key={line} className={s.event?.codeIndex===i?'rounded bg-blue-500/20 text-blue-100':''}>{line}</div>)}</pre></section>
      <section className="spec-card !bg-amber-50"><h3 className="text-sm font-bold">{t('boundary')}</h3><p className="my-2 text-xs leading-relaxed text-amber-950">{t('boundaryText')}</p><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-blue-700">{[['paperEagle','https://arxiv.org/html/2406.16858v1'],['paperDspark','https://arxiv.org/html/2607.05147v1'],['docs','https://docs.sglang.io/docs/advanced_features/speculative_decoding'],['dsparkConfig','https://github.com/deepseek-ai/DeepSpec/blob/main/config/dspark/dspark_qwen3_4b.py'],['samplingPaper','https://proceedings.mlr.press/v202/leviathan23a.html']].map(([key,url])=><a key={key} href={url} target="_blank" rel="noreferrer" className="underline">{t(key)}</a>)}</div></section>
    </div>
  </div>;
}
export default function SpeculativeDecoding() {
  const [config,setConfigState]=useState({algorithm:'eagle2',depth:3,width:2,budget:8,blockSize:4});
  const [phase,setPhase]=useState('idle');
  const [step,setStep]=useState(0);
  const [roundIndex,setRoundIndex]=useState(0);
  const [isPlaying,setIsPlaying]=useState(false);
  const [raceStep,setRaceStep]=useState(0);
  const [racePlaying,setRacePlaying]=useState(false);
  const [selectedNode,setSelectedNode]=useState(null);
  const [lang,setLang]=useState(getInitialLang);
  const s=useMemo(()=>deriveSpeculativeSnapshot({...config,phase,step,roundIndex,raceStep}),[config,phase,step,roundIndex,raceStep]);
  const t=key=>i18n[lang][key]??key;
  const resetTrace=()=>{setPhase('idle');setStep(0);setIsPlaying(false);setSelectedNode(null);};
  const resetRace=()=>{setRaceStep(0);setRacePlaying(false);};
  const setConfig=value=>{setConfigState(value);resetTrace();resetRace();setRoundIndex(0);};
  const handleNextStep=()=>{
    const next=getNextLifecycle(s);
    setPhase(next.phase);setStep(next.step);setRoundIndex(next.roundIndex);
    if(next.phase==='done')setIsPlaying(false);
  };
  const togglePlay=()=>{
    if(s.phase==='done'){setPhase('running');setStep(0);setIsPlaying(true);}
    else if(s.phase==='idle'){setPhase('running');setStep(0);setIsPlaying(true);}
    else setIsPlaying(value=>!value);
  };
  const inspect=index=>{setRoundIndex(index);resetTrace();setRacePlaying(false);};
  const raceNext=()=>{setRacePlaying(false);setRaceStep(value=>Math.min(s.race.maxStep,value+1));};
  const racePlay=()=>{if(s.race.isDone)setRaceStep(0);setRacePlaying(value=>!value);};
  useEffect(()=>{
    if(!isPlaying||s.phase!=='running')return undefined;
    const timer=setTimeout(handleNextStep,s.event?.type==='verify'?1000:650);
    return ()=>clearTimeout(timer);
  },[isPlaying,phase,step,roundIndex,config]);
  useEffect(()=>{
    if(!racePlaying||s.race.isDone){if(s.race.isDone)setRacePlaying(false);return undefined;}
    const timer=setTimeout(()=>setRaceStep(value=>Math.min(s.race.maxStep,value+1)),150);
    return ()=>clearTimeout(timer);
  },[racePlaying,raceStep,s.race.isDone]);
  return <div className="spec-page min-h-full bg-slate-50 text-slate-800">
    <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6"><div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{t('title')}</h1><p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p></div><div className="flex items-center gap-2"><div className="flex rounded-lg bg-slate-100 p-1">{['eagle2','dspark'].map(algorithm=><button key={algorithm} aria-pressed={config.algorithm===algorithm} className={'rounded-md px-3 py-1.5 text-xs font-semibold '+(config.algorithm===algorithm?'bg-white text-blue-700 shadow-sm':'text-slate-600')} onClick={()=>setConfig({...config,algorithm})}>{t(algorithm)}</button>)}</div><button onClick={()=>setLang(value=>value==='zh'?'en':'zh')} aria-label={t('language')} className="spec-icon !w-auto gap-1 !px-2 text-xs"><Globe size={15}/>{t('langToggle')}</button></div></div></header>
    <main className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
      <Race s={s} t={t} config={config} setConfig={setConfig} playing={racePlaying} onPlay={racePlay} onNext={raceNext} onReset={resetRace} onInspect={inspect}/>
      <Workbench s={s} t={t} playing={isPlaying} onPlay={togglePlay} onNext={()=>{setIsPlaying(false);handleNextStep();}} onReset={resetTrace} onRound={inspect} selectedNode={selectedNode} setSelectedNode={setSelectedNode}/>
      <Principles s={s} t={t}/>
    </main>
  </div>;
}
