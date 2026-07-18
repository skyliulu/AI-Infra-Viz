import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Database, Network, Trash2, Code, Activity, Lock, Unlock, ArrowDownToLine, Grid2X2, SplitSquareHorizontal, Info } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import {
  deriveRadixCacheState,
  MODE_MAX_STEPS,
  RADIX_PREFIX_TOKENS,
  RADIX_REQUESTS,
  RADIX_SUFFIX_A_TOKENS,
  TOTAL_KV_SLOTS,
} from './radix-cache/model';

const i18n = {
  zh: {
    title: 'Radix Cache 原理全景可视化',
    subtitle: 'SGLang: 基于基数树的 Prompt 全局共享与动态物理显存管理',
    langToggle: 'EN',
    standard: '标准 KV Cache',
    radix: 'Radix Cache (树形)',
    reset: '重置',
    pause: '暂停',
    replay: '重播',
    play: '播放',
    next: '下一步',
    
    standardStep0: '等待请求接入...',
    standardStep1: '1. 请求 A 分配独立 KV 槽位',
    standardStep2: '2. 请求 A 完成，缓存保留且解除锁定',
    standardStep3: '3. 请求 B 再次分配相同前缀的 KV 槽位',
    standardStep4: '4. 请求 B 完成，重复前缀仍占用物理槽位',
    standardStep5: '5. 请求 C 分配两个新 KV 槽位',
    standardStep6: '6. 请求 C 完成，当前占用 8/10 个槽位',
    standardStep7: '7. 请求 D 需要 5 个槽位，仅剩 2 个，无法接纳',
    radixStep0: '等待请求接入...',
    radixStep1: '1. 请求 A 插入树并锁定当前路径',
    radixStep2: '2. 请求 A 完成，路径解除锁定但缓存保留',
    radixStep3: '3. 请求 B 命中 8/12 个前缀 Token',
    radixStep4: '4. 在匹配边界分裂压缩节点并锁定共享前缀',
    radixStep5: '5. 仅为请求 B 的新后缀分配一个 KV 槽位',
    radixStep6: '6. 请求 B 完成，共享前缀与后缀均解除锁定',
    radixStep7: '7. 请求 C 无前缀命中，分配两个新槽位',
    radixStep8: '8. 请求 C 完成；请求 D 进入等待队列',
    radixStep9: '9. 请求 D 需要 5 个槽位，仅剩 4 个，缺口为 1',
    radixStep10: '10. 淘汰未锁定的 LRU 叶子 A，空闲槽位增至 5',
    radixStep11: '11. 为请求 D 分配 5 个空闲槽位并锁定路径',
    radixStep12: '12. 请求 D 完成，所有缓存节点均可参与后续 LRU',
    
    // UI Elements
    memUsage: '显存池占用 (物理块)',
    lockRef: '引用锁',
    hitRate: '累计前缀复用率',
    savedMem: '节省显存块',
    logicalLayout: '逻辑层：Memory Layout',
    physicalPool: '物理层：底层 KV Cache 显存池',
    underlyingCode: 'Python 伪代码与核心数据结构',
    principleAnalysis: '深度原理解析',
    incomingReq: '待处理请求流 (Incoming Requests)',
    split: '分裂',
    merge: '合并',
    waiting: '等待中...',
    prefixNode: '共享前缀',
    reqASuffix: 'Req A 后缀',
    reqBSuffix: 'Req B 后缀',
    reqBMerged: 'Req B (合并)',
    reqA: '请求 A',
    reqB: '请求 B',
    reqC: '请求 C',
    reqD: '请求 D',
    blks: '块',
    tokens: '词元',
    pairedSlots: '成对 KV 槽位',
    slotPairNote: '每一列代表同一页的 K/V 槽位对；容量按列计数',
    kPool: 'K Cache 槽位',
    vPool: 'V Cache 槽位',
    capacity: '容量',
    needs: '需要',
    free: '空闲',
    shortage: '缺口',
    evicted: '已淘汰',
    requestWaiting: '等待',
    requestRunning: '处理中',
    requestDone: '已完成',
    requestMatching: '匹配前缀',
    requestSplitting: '分裂节点',
    requestQueued: '已入队',
    requestChecking: '容量检查',
    requestEvicting: '回收槽位',
    requestBlocked: '容量不足',
    legendPrefix: '共享前缀',
    legendA: '请求 A',
    legendB: '请求 B',
    legendC: '请求 C',
    legendD: '请求 D',
    legendEmpty: '空闲',
    legendLocked: '锁定',
    target: 'LRU 候选',
    matchedTokens: '复用 Token',
    promptTokens: '已到达 Prompt Token',
    simplifiedScope: '教学模型：page_size = 4 tokens，10 个成对 KV 槽位',
    nodeKeyComment: '# 压缩节点对应的 Token 序列',
    nodeValueComment: '# 映射到成对的物理 KV 槽位',
    nodeChildrenComment: '# Token 前缀索引的子节点',
    nodeParentComment: '# 父节点引用',
    nodeLockComment: '# 活动请求路径引用计数',
    freeSlotComment: '# 释放成对的物理 KV 槽位',
    pyComment1: '# 线性分配物理块，完全隔离无复用',
    pyComment2: '# 再次分配，前缀部分的物理块完全重复冗余',
    pyComment3: '# 从树根遍历，寻找最长匹配的前缀 Token 序列',
    pyComment4: '# 命中部分 Token，按 prefix_len 切分原节点的 key 和 value',
    pyComment5: '# 仅为未命中的后缀分配槽位，并增加活动路径引用',
    pyComment6: '# 待分配槽位大于空闲槽位时，从可驱逐叶子中选择 LRU',
    pyComment9: '# SGLang不主动合并，仅当父节点变为空叶子时入堆',
    pyCommentFinish: '# 请求完成时递减最后节点及其祖先的 lock_ref',
    pyCommentCapacity: '# 分配前计算缺口，而不是等待池占用达到 100%',
    
    // Deep Dive
    memWallTitle: '传统 KV Cache 的显存黑洞',
    memWallDesc: '本页用“每个请求独立持有 KV 槽位”作为对照基线。并发请求共享 System Prompt 或长文档时，这种基线会重复保存相同前缀；真实引擎是否连续分配取决于其分页与分配器实现。',
    radixTreeTitle: '1. 基数树 (Radix Tree) 逻辑共享',
    radixTreeDesc: 'Radix Tree 将 Token 前缀映射到已有 KV 槽位。相同前缀无需重新计算或重复分配 KV；树查询、索引和引用计数仍会产生元数据开销。',
    lazySplitTitle: '2. 动态分裂 (Lazy Splitting)',
    lazySplitDesc: '多个 Token 可压缩在同一个节点中。部分命中时，_split_node 在匹配边界拆分节点并复用既有 KV 槽位；无需重算 KV，但仍要切分 key/value 索引等元数据。',
    evictTitle: '3. 引用计数与物理块回收',
    evictDesc: '活动请求会增加最后节点及祖先的 lock_ref，请求完成后对应递减。新分配出现容量缺口时，系统按 LRU 从 lock_ref=0 的叶子开始回收，并在父节点成为未锁定叶子时继续级联。',
    metricTitle: '指标口径',
    metricDesc: '累计前缀复用率 = 已复用 Prompt Token / 已到达 Prompt Token。它不依赖当前缓存占用，因此淘汰无关节点不会让命中率虚增。',
  },
  en: {
    title: 'Radix Cache Principle Visualization',
    subtitle: 'SGLang: Global Prompt Sharing & Dynamic VRAM Management',
    langToggle: '中文',
    standard: 'Standard KV Cache',
    radix: 'Radix Cache (Tree)',
    reset: 'Reset',
    pause: 'Pause',
    replay: 'Replay',
    play: 'Play',
    next: 'Next',
    
    standardStep0: 'Waiting for requests...',
    standardStep1: '1. Allocate independent KV slots for Request A',
    standardStep2: '2. Request A finishes; keep its cache and release locks',
    standardStep3: '3. Allocate the same prefix again for Request B',
    standardStep4: '4. Request B finishes; duplicated prefix slots remain',
    standardStep5: '5. Allocate two new KV slots for Request C',
    standardStep6: '6. Request C finishes; 8 of 10 slots are occupied',
    standardStep7: '7. Request D needs 5 slots but only 2 are free',
    radixStep0: 'Waiting for requests...',
    radixStep1: '1. Insert Request A and lock its active path',
    radixStep2: '2. Request A finishes; unlock the path and retain cache',
    radixStep3: '3. Request B matches 8 of 12 prompt tokens',
    radixStep4: '4. Split the compressed node at the match boundary',
    radixStep5: '5. Allocate one KV slot only for Request B’s new suffix',
    radixStep6: '6. Request B finishes; release prefix and suffix locks',
    radixStep7: '7. Request C has no match and allocates two new slots',
    radixStep8: '8. Request C finishes; Request D enters the queue',
    radixStep9: '9. Request D needs 5 slots; 4 are free, so 1 is missing',
    radixStep10: '10. Evict unlocked LRU leaf A; free capacity becomes 5',
    radixStep11: '11. Allocate 5 free slots for Request D and lock its path',
    radixStep12: '12. Request D finishes; all nodes become LRU-eligible',
    
    memUsage: 'Memory Pool (Blocks)',
    lockRef: 'Lock Ref',
    hitRate: 'Cumulative Prefix Reuse',
    savedMem: 'Saved Blocks',
    logicalLayout: 'Logical: Memory Layout',
    physicalPool: 'Physical: Underlying KV Cache Pool',
    underlyingCode: 'Python Pseudocode & Core Structures',
    principleAnalysis: 'Deep Principle Analysis',
    incomingReq: 'Incoming Requests Stream',
    split: 'Split',
    merge: 'Merge',
    waiting: 'Waiting...',
    prefixNode: 'Prefix Node',
    reqASuffix: 'Req A Suffix',
    reqBSuffix: 'Req B Suffix',
    reqBMerged: 'Req B (Merged)',
    reqA: 'Req A',
    reqB: 'Req B',
    reqC: 'Req C',
    reqD: 'Req D',
    blks: 'Blks',
    tokens: 'Tokens',
    pairedSlots: 'Paired KV Slots',
    slotPairNote: 'Each column is one K/V slot pair for the same page; capacity counts columns.',
    kPool: 'K Cache Slots',
    vPool: 'V Cache Slots',
    capacity: 'Capacity',
    needs: 'Needs',
    free: 'Free',
    shortage: 'Short',
    evicted: 'Evicted',
    requestWaiting: 'Waiting',
    requestRunning: 'Running',
    requestDone: 'Done',
    requestMatching: 'Matching',
    requestSplitting: 'Splitting',
    requestQueued: 'Queued',
    requestChecking: 'Capacity check',
    requestEvicting: 'Reclaiming',
    requestBlocked: 'Insufficient capacity',
    legendPrefix: 'Shared prefix',
    legendA: 'Request A',
    legendB: 'Request B',
    legendC: 'Request C',
    legendD: 'Request D',
    legendEmpty: 'Free',
    legendLocked: 'Locked',
    target: 'LRU candidate',
    matchedTokens: 'Reused Tokens',
    promptTokens: 'Arrived Prompt Tokens',
    simplifiedScope: 'Teaching model: page_size = 4 tokens, 10 paired KV slots',
    nodeKeyComment: '# Token sequence stored in a compressed node',
    nodeValueComment: '# Maps to paired physical KV slots',
    nodeChildrenComment: '# Children indexed by token prefixes',
    nodeParentComment: '# Parent node reference',
    nodeLockComment: '# Active-request path reference count',
    freeSlotComment: '# Release paired physical KV slots',
    pyComment1: '# Linear block allocation, isolated, no reuse',
    pyComment2: '# Allocate again, prefix blocks are entirely duplicated',
    pyComment3: '# Traverse from root to find longest matching prefix tokens',
    pyComment4: '# Partial match found, execute lazy split on node.key and node.value',
    pyComment5: '# Allocate only the unmatched suffix and acquire its active path',
    pyComment6: '# If required slots exceed free slots, choose an evictable LRU leaf',
    pyComment9: '# SGLang skips merge, pushes parent to heap if childless',
    pyCommentFinish: '# On completion, decrement lock_ref on the last node and ancestors',
    pyCommentCapacity: '# Compute the deficit before allocation; the pool need not be 100% full',
    
    memWallTitle: 'The Memory Black Hole of Traditional KV Cache',
    memWallDesc: 'This page uses per-request KV ownership as a comparison baseline. Shared system prompts or documents duplicate prefix KV under that policy; whether blocks are contiguous depends on the real engine allocator and paging design.',
    radixTreeTitle: '1. Radix Tree Logical Sharing',
    radixTreeDesc: 'The radix tree maps token prefixes to existing KV slots. Matching prefixes avoid KV recomputation and duplicate allocation, while tree lookup, indexing, and reference counting still incur metadata work.',
    lazySplitTitle: '2. Lazy Splitting',
    lazySplitDesc: 'Multiple tokens may share one compressed node. On a partial match, _split_node divides it at the boundary and reuses the existing KV slots. KV is not recomputed, but key/value indices and other metadata are sliced.',
    evictTitle: '3. Ref Counting & Physical Reclaim',
    evictDesc: 'An active request increments lock_ref on its last node and ancestors, then decrements them on completion. When a new allocation has a deficit, LRU reclaims unlocked leaves and cascades when the parent becomes an unlocked leaf.',
    metricTitle: 'Metric Definition',
    metricDesc: 'Cumulative prefix reuse = reused prompt tokens / arrived prompt tokens. It is independent of current occupancy, so evicting an unrelated node cannot inflate the rate.',
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const App = () => {
  const [modelType, setModelType] = useState('radix');
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;
  const snapshot = useMemo(
    () => deriveRadixCacheState({ mode: modelType, step, phase }),
    [modelType, phase, step],
  );
  const pState = snapshot.pool;
  const treeData = snapshot.tree;

  const reset = useCallback(() => {
    setStep(0);
    setPhase('idle');
    setIsPlaying(false);
  }, []);

  const handleNextStep = useCallback(() => {
    const maxStep = MODE_MAX_STEPS[modelType];
    const nextStep = Math.min(step + 1, maxStep);
    setStep(nextStep);
    setPhase(nextStep === maxStep ? 'done' : 'running');
    if (nextStep === maxStep) setIsPlaying(false);
  }, [modelType, step]);

  const togglePlay = useCallback(() => {
    if (phase === 'done') {
      setStep(0);
      setPhase('running');
      setIsPlaying(true);
      return;
    }
    setPhase((currentPhase) => currentPhase === 'idle' ? 'running' : currentPhase);
    setIsPlaying((playing) => !playing);
  }, [phase]);

  useEffect(() => {
    if (!isPlaying || phase === 'done') return undefined;
    const delay = ['split', 'capacity', 'evict'].includes(snapshot.activeCode) ? 2400 : 3200;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [handleNextStep, isPlaying, phase, snapshot.activeCode]);

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      setStep(0);
      setPhase('idle');
      setIsPlaying(false);
    }
  };

  const getStepText = () => t(snapshot.stepKey);

  const requestStatusKey = {
    waiting: 'requestWaiting',
    running: 'requestRunning',
    done: 'requestDone',
    matching: 'requestMatching',
    splitting: 'requestSplitting',
    queued: 'requestQueued',
    checking: 'requestChecking',
    evicting: 'requestEvicting',
    blocked: 'requestBlocked',
  };
  const requestTone = {
    A: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    B: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    C: 'bg-rose-900/50 text-rose-300 border-rose-700/50',
    D: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
  };
  const requestById = Object.fromEntries(snapshot.requests.map((request) => [request.id, request]));

  // Vertical Tree Node Renderer
  const TreeNode = ({ node, isFirst = false, isLast = false, hasSiblings = false }) => {
    const colorMap = {
      indigo: 'bg-indigo-50 border-indigo-300 text-indigo-800',
      emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      amber: 'bg-amber-50 border-amber-300 text-amber-800',
      rose: 'bg-rose-50 border-rose-300 text-rose-800',
      sky: 'bg-sky-50 border-sky-300 text-sky-800',
    };
    
    return (
      <div className="flex flex-col items-center relative group animate-radix-fade-in-fast">
        {/* Vertical line from horizontal branch to this node */}
        {!isRoot(node) && <div className="w-px h-6 bg-slate-300 absolute -top-6 left-1/2 -translate-x-1/2 z-0"></div>}
        
        {/* Horizontal branch lines handling dynamic widths perfectly */}
        {hasSiblings && isFirst && (
          <div className="absolute h-px bg-slate-300 -top-6 left-1/2 z-0" style={{ width: 'calc(50% + 1rem)' }}></div>
        )}
        {hasSiblings && isLast && (
          <div className="absolute h-px bg-slate-300 -top-6 right-1/2 z-0" style={{ width: 'calc(50% + 1rem)' }}></div>
        )}
        {hasSiblings && !isFirst && !isLast && (
          <div className="absolute h-px bg-slate-300 -top-6 left-[-1rem] right-[-1rem] z-0"></div>
        )}

        {/* Node Card */}
        <div className={`relative flex flex-col gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all duration-500 shadow-sm z-10 w-64 md:w-72 mt-0
          ${node.active ? 'ring-4 ring-indigo-500/20 scale-105' : ''}
          ${colorMap[node.color] || 'bg-white border-slate-200 text-slate-700'}
          ${node.lock > 0 ? 'border-t-4 border-t-emerald-500' : ''}
          ${node.evictWarning ? 'bg-rose-100 border-rose-500 text-rose-900 animate-pulse ring-4 ring-rose-500/30' : ''}
          ${node.isNew ? 'scale-[1.05] shadow-lg border-indigo-500' : 'scale-100'}
          ${node.splitAnim || node.mergeAnim ? 'border-dashed border-indigo-400' : ''}
        `}>
          {/* Split Icons floating out of the way */}
          {node.splitAnim && (
            <div className="absolute -top-4 -right-3 bg-white rounded-lg p-1.5 shadow-lg border-2 border-indigo-300 text-indigo-600 z-30 flex items-center gap-1 scale-90">
              <SplitSquareHorizontal size={12} className="rotate-90"/>
              <span className="text-[9px] font-black">{t('split')}</span>
            </div>
          )}

          {/* Main Label */}
          <div className="flex justify-between items-start">
            <span className={`font-mono text-xs font-bold leading-relaxed break-all ${node.highlightPrefix ? 'text-indigo-600' : ''}`}>
               {node.highlightPrefix ? (
                 <>
                   <span className="bg-indigo-100 px-1 py-0.5 rounded inline-block mb-1 border border-indigo-200">{RADIX_PREFIX_TOKENS}</span>
                   <span className="opacity-40">{RADIX_SUFFIX_A_TOKENS}</span>
                 </>
               ) : node.tokens}
            </span>
            {node.evictWarning && <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-bold border border-rose-400 absolute -top-3 right-2 shadow-sm z-20"><Trash2 size={10}/> {t('target')}</span>}
          </div>
          
          <div className="flex justify-between items-end mt-1 pt-1.5 border-t border-black/10">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t(node.labelKey)}</span>
               <span className="text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1 mt-0.5"><Database size={10}/> {t('blks')}: [{node.blockRefs.join(', ')}]</span>
             </div>
             {/* Lock Indicator Badge */}
             <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider h-fit
               ${node.lock > 0 ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner' : 'bg-white text-slate-400 border-slate-200'}
             `}>
               {node.lock > 0 ? <Lock size={10}/> : <Unlock size={10}/>} {t('lockRef')}={node.lock}
             </span>
          </div>
        </div>

        {/* Children Render (Vertical layout) */}
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col items-center w-full mt-0">
            {/* Vertical line going down to horizontal fork */}
            <div className="w-px h-6 bg-slate-300 relative z-0"></div>
            
            <div className="flex flex-row justify-center gap-8 relative pt-6 w-full items-start">
              {node.children.map((child, idx) => (
                <TreeNode 
                  key={child.id} 
                  node={child} 
                  isFirst={idx === 0} 
                  isLast={idx === node.children.length - 1} 
                  hasSiblings={node.children.length > 1} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isRoot = (node) => {
    return ['a-full', 'shared-prefix', 'c-root', 'd-root'].includes(node.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-4 md:space-y-6">
        
        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-indigo-900">
              <Network className="text-indigo-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-[12px] md:text-sm mt-1">
              {t('subtitle')}
            </p>
            <span className="mt-2 w-fit self-center xl:self-start rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700">
              {t('simplifiedScope')}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button aria-pressed={modelType === 'standard'} onClick={() => handleModelTypeChange('standard')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'standard' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Database size={14} /> {t('standard')}
              </button>
              <button aria-pressed={modelType === 'radix'} onClick={() => handleModelTypeChange('radix')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] md:text-sm font-semibold rounded-md transition-all ${modelType === 'radix' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Network size={14} /> {t('radix')}
              </button>
            </div>
            <button aria-label={t('langToggle')} onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="min-w-10 whitespace-nowrap rounded-lg bg-slate-100 px-2 py-2 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-200">{t('langToggle')}</button>
            <button type="button" aria-label={t('reset')} onClick={reset} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200" title={t('reset')}><RotateCcw size={18} /></button>
            <button type="button" aria-label={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} title={isPlaying ? t('pause') : phase === 'done' ? t('replay') : t('play')} onClick={togglePlay} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" aria-label={t('next')} title={t('next')} onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Incoming Request Banner (Always shown clearly on top) */}
        <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-inner flex flex-col gap-3 relative overflow-hidden">
           <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><ArrowDownToLine size={14}/> {t('incomingReq')}</div>
           <div className="flex flex-col gap-2">
             {snapshot.requests.map((request) => {
               const isWaiting = request.status === 'waiting';
               return (
                 <div key={request.id} className={`text-xs md:text-sm font-mono px-3 py-2 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${isWaiting ? 'bg-slate-800 text-slate-500 border-slate-700' : requestTone[request.id]}`}>
                   <span className="min-w-0 break-all"><strong className="text-white mr-2">{t(`req${request.id}`)}:</strong> {request.full}</span>
                   <div className="flex shrink-0 items-center gap-2">
                     <span className="rounded bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">{t(requestStatusKey[request.status])}</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded ${isWaiting ? 'bg-slate-700 text-slate-400' : 'bg-black/20 text-current'}`}>{request.tokenCount} {t('tokens')} | {request.blocks} {t('blks')}</span>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* Side-by-Side: Memory Layout + Physical Pool (Left) and Python Pseudocode (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Left: Main Visualization Area (Tree/Linear View + Physical Pool) - spans 3 columns */}
          <div className="xl:col-span-3 flex flex-col">
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 relative flex flex-col flex-1">
              
              {/* Header & Metrics */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-semibold text-lg text-slate-700">
                      {modelType === 'radix' ? <Network className="text-indigo-500" /> : <Database className="text-slate-500" />} 
                      {modelType === 'radix' ? t('logicalLayout') : t('logicalLayout')}
                    </div>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-colors duration-300 w-fit mt-1 ${step > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    <Activity size={16} className={step > 0 && isPlaying ? 'animate-pulse' : ''}/>
                    {getStepText()}
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="flex flex-wrap justify-end gap-3 mt-2 md:mt-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{t('memUsage')}</span>
                    <span className={`text-2xl font-black font-mono transition-all ${pState.shortage > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {pState.usedCount} <span className="text-xs text-slate-400 font-sans font-normal">/ {TOTAL_KV_SLOTS}</span>
                    </span>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pState.shortage > 0 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{width: `${Math.min(100, (pState.usedCount / TOTAL_KV_SLOTS) * 100)}%`}}></div>
                    </div>
                  </div>
                  
                  {modelType === 'radix' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col items-end min-w-[120px] transition-all">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">{t('hitRate')}</span>
                      <span className="text-2xl font-black font-mono text-emerald-600 flex items-baseline gap-1">
                        {pState.prefixReuseRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1">{pState.matchedTokens}/{pState.promptTokens} {t('tokens')} · {t('savedMem')}: {pState.savedCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {pState.allocationNeed > 0 && (
                <div className={`mb-4 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2 text-center text-[11px] font-bold sm:grid-cols-4 ${pState.shortage > 0 ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                  <span>{t('needs')}: {pState.allocationNeed}</span>
                  <span>{t('free')}: {pState.freeCount}</span>
                  <span>{t('shortage')}: {pState.shortage}</span>
                  <span>{t('evicted')}: {pState.evictedCount}</span>
                </div>
              )}

              {/* The Tree / Linear View Container */}
              <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-6 overflow-x-auto flex items-start justify-center relative min-h-[350px] scrollbar-thin">
                
                {step === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 flex-col gap-4 text-slate-500">
                    <Database size={48} className="animate-bounce" />
                    <span className="font-bold font-mono tracking-widest">{t('step0')}</span>
                  </div>
                )}

                {modelType === 'radix' && step > 0 && (
                   <div className="flex flex-col items-center pt-2 w-full">
                     {/* Fake Root Node */}
                     <div className="w-12 h-12 bg-slate-800 rounded-xl shadow-lg flex items-center justify-center text-white font-black z-20 shrink-0 border-2 border-slate-600 relative">
                       R
                     </div>
                     <div className="w-px h-6 bg-slate-300 relative z-0"></div>
                     
                     <div className="flex flex-row justify-center relative pt-6 gap-8 w-full items-start">
                       {treeData.root.map((node, idx) => (
                         <TreeNode 
                           key={node.id} 
                           node={node} 
                           isFirst={idx === 0} 
                           isLast={idx === treeData.root.length - 1} 
                           hasSiblings={treeData.root.length > 1} 
                         />
                       ))}
                     </div>
                   </div>
                )}

                {modelType === 'standard' && step > 0 && (
                  <div className="w-full flex flex-col gap-4 max-w-[600px] mx-auto">
                    <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm">
                      <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                         <span>{t('reqA')}</span>
                         <div className="flex gap-2">
                           <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [0, 1, 2]</span>
                           <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">{t('lockRef')}={requestById.A.status === 'running' ? 1 : 0}</span>
                         </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed">
                        <span className="bg-indigo-100 text-indigo-800 px-1 rounded border border-indigo-200 font-bold">{RADIX_PREFIX_TOKENS}</span>
                        <span className="font-bold">{RADIX_SUFFIX_A_TOKENS}</span>
                      </div>
                    </div>
                    
                    {step >= 3 && (
                      <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm animate-radix-fade-in-fast relative">
                        {/* Redundancy Warning */}
                        <div className="absolute -top-3 right-4 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1 shadow-sm"><Info size={12}/> {t('pyComment2')}</div>
                        <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                           <span>{t('reqB')}</span>
                           <div className="flex gap-2">
                             <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [3, 4, 5]</span>
                             <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">{t('lockRef')}={requestById.B.status === 'running' ? 1 : 0}</span>
                           </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed relative">
                           <span className="bg-rose-100 text-rose-800 px-1 rounded border border-rose-300 relative font-bold">
                             {RADIX_PREFIX_TOKENS}
                             <span className="absolute -top-2 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
                           </span>
                           <span className="font-bold">{RADIX_REQUESTS.B.full.slice(RADIX_PREFIX_TOKENS.length)}</span>
                        </div>
                      </div>
                    )}

                    {step >= 5 && (
                      <div className="flex flex-col gap-2 w-full bg-white p-4 rounded-xl border shadow-sm animate-radix-fade-in-fast relative">
                        <div className="font-bold text-slate-700 text-sm border-b pb-2 flex justify-between items-center">
                           <span>{t('reqC')}</span>
                           <div className="flex gap-2">
                             <span className="text-[11px] font-mono text-slate-500 border px-1.5 py-0.5 rounded bg-slate-50 flex items-center gap-1"><Database size={10}/> {t('blks')}: [6, 7]</span>
                             <span className="text-[11px] font-mono text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">{t('lockRef')}={requestById.C.status === 'running' ? 1 : 0}</span>
                           </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono px-3 py-2 rounded break-all leading-relaxed font-bold">
                           {RADIX_REQUESTS.C.full}
                        </div>
                      </div>
                    )}

                    {step >= 7 && (
                      <div className="relative flex w-full flex-col gap-2 rounded-xl border-2 border-rose-400 bg-rose-50 p-4 shadow-sm animate-radix-fade-in-fast">
                        <div className="flex items-center justify-between border-b border-rose-200 pb-2 text-sm font-bold text-rose-800">
                          <span>{t('reqD')}</span>
                          <span className="rounded bg-rose-200 px-2 py-0.5 text-[10px]">{t('requestBlocked')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-rose-800">
                          <span>{t('needs')}: {RADIX_REQUESTS.D.blocks}</span>
                          <span>{t('free')}: {pState.freeCount}</span>
                          <span>{t('shortage')}: {pState.shortage}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider between Layout and Physical Pool */}
              <div className="border-t border-slate-200 mt-6 pt-4">
                <h2 className="text-sm font-semibold mb-4 text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Grid2X2 className="text-indigo-500" size={16} /> {t('physicalPool')}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{t('capacity')}: {TOTAL_KV_SLOTS} {t('pairedSlots')}</span>
                </h2>
                
                <div className="flex flex-col justify-center items-center w-full">
                    <div className="mb-3 w-full rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-center text-[10px] font-medium text-indigo-700">{t('slotPairNote')}</div>
                    <div className="flex flex-col gap-4 w-full">
                      {[
                        { labelKey: 'kPool', icon: 'K' },
                        { labelKey: 'vPool', icon: 'V' }
                      ].map(pool => (
                        <div key={pool.labelKey} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner w-full">
                          <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 px-1"><span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] text-white">{pool.icon}</span> {t(pool.labelKey)}</div>
                          <div className="flex w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 gap-3 pb-4 pt-1 px-1 relative items-center justify-start">
                             {pState.slots.map((b, idx) => {
                               let colorClasses = 'bg-white border-slate-200 text-transparent'; // empty
                               if (b.status === 'used') {
                                  if (b.color === 'indigo') colorClasses = 'bg-indigo-500 border-indigo-600 text-white shadow-sm';
                                  if (b.color === 'emerald') colorClasses = 'bg-emerald-500 border-emerald-600 text-white shadow-sm';
                                  if (b.color === 'amber') colorClasses = 'bg-amber-500 border-amber-600 text-white shadow-sm';
                                  if (b.color === 'rose') colorClasses = 'bg-rose-500 border-rose-600 text-white shadow-sm';
                                  if (b.color === 'sky') colorClasses = 'bg-sky-500 border-sky-600 text-white shadow-sm';
                                  if (b.isDup) colorClasses += ' ring-2 ring-rose-400 ring-offset-1 ring-inset border-dashed';
                               } else if (b.status === 'targeted') {
                                  colorClasses = 'bg-rose-50 border-rose-400 text-rose-800 border-dashed animate-pulse ring-2 ring-rose-300 ring-offset-1';
                               }
        
                               return (
                                 <div key={idx} className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 shrink-0 rounded-lg border-2 transition-all duration-500 flex flex-col items-center justify-center relative group
                                   ${colorClasses}
                                   ${b.status !== 'empty' && step > 0 ? 'scale-100' : 'scale-95 opacity-60'}
                                 `}>
                                   <span className="absolute top-0.5 left-1 text-[11px] lg:text-xs font-black font-mono opacity-80">#{idx}</span>
                                   {/* Lock Icon Overlay */}
                                   {b.locked && (
                                     <div className="absolute -bottom-1.5 -right-1.5 bg-slate-800 text-white p-1 rounded-full shadow-sm z-10 scale-[0.65] border border-slate-600">
                                       <Lock size={12} />
                                     </div>
                                   )}
                                   
                                   {/* Label */}
                                   {b.status !== 'empty' && (
                                      <span className="text-xs lg:text-sm font-black font-mono text-center leading-none mt-3">
                                        {b.seq}
                                      </span>
                                   )}
                                 </div>
                               )
                             })}
                          </div>
                        </div>
                      ))}
                    </div>
                  
                  {/* Legend */}
                  {step > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4 justify-center items-center text-[10px] text-slate-600 font-mono w-full px-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-500 border border-indigo-600"></div> {t('legendPrefix')}</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600"></div> {t('legendA')}</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500 border border-amber-600"></div> {t('legendB')}</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-500 border border-rose-600"></div> {t('legendC')}</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sky-500 border border-sky-600"></div> {t('legendD')}</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-100 border-2 border-slate-200"></div> {t('legendEmpty')}</div>
                      <div className="flex items-center gap-1"><Lock size={10} className="text-slate-700"/> {t('legendLocked')}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Python Pseudocode - spans 2 columns */}
          <div className="xl:col-span-2 flex flex-col">
            <div className="bg-[#0f172a] rounded-2xl p-4 md:p-5 shadow-lg border border-slate-800 text-slate-300 flex flex-col flex-1 relative overflow-hidden h-full">
               {/* Terminal dots decoration */}
               <div className="flex gap-1.5 absolute top-4 left-4">
                 <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               </div>
               
               <h2 className="text-sm font-semibold mb-4 text-white border-b border-slate-700 pb-2 flex items-center justify-between mt-6">
                 <div className="flex items-center gap-2">
                   <Code className="text-emerald-400" size={16} /> {t('underlyingCode')}
                 </div>
                 <span className="text-[9px] text-slate-400 font-mono border border-slate-700 px-1.5 py-0.5 rounded bg-slate-800">Python</span>
              </h2>

              <div className="font-mono text-[10px] md:text-[11px] overflow-y-auto overflow-x-auto bg-[#080c12] p-3 rounded-xl border border-slate-800 flex-1 leading-relaxed shadow-inner scrollbar-thin">
                {modelType === 'standard' ? (
                  <div className="whitespace-pre">
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">StandardKVCache</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">__init__</span>(self):</div>
                    <div>        self.allocator = TokenPoolAllocator()</div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">schedule_req</span>(self, req):</div>
                    <div className={snapshot.activeCode === 'allocate' ? "bg-slate-800/80 px-1 -mx-1 border-l-2 border-slate-500 text-slate-200" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{step === 3 ? t('pyComment2') : t('pyComment1')}</span></div>
                      <div>        kv_indices = self.allocator.alloc(req.tokens.length)</div>
                      <div>        req.kv_indices = kv_indices</div>
                    </div>
                    <div className={snapshot.activeCode === 'finish' ? "bg-emerald-900/40 px-1 -mx-1 border-l-2 border-emerald-400 text-emerald-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyCommentFinish')}</span></div>
                      <div>        req.lock_ref = 0</div>
                    </div>
                    <div className={snapshot.activeCode === 'capacity' ? "bg-rose-900/40 px-1 -mx-1 border-l-2 border-rose-400 text-rose-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyCommentCapacity')}</span></div>
                      <div>        deficit = max(0, req.num_slots - allocator.available_size())</div>
                      <div>        <span className="text-emerald-400">if</span> deficit: scheduler.defer(req)</div>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre">
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">TreeNode</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">__init__</span>(self):</div>
                    <div>        self.key = []              <span className="text-slate-600">{t('nodeKeyComment')}</span></div>
                    <div>        self.value = []            <span className="text-slate-600">{t('nodeValueComment')}</span></div>
                    <div>        self.children = {'{}'}             <span className="text-slate-600">{t('nodeChildrenComment')}</span></div>
                    <div>        self.parent = <span className="text-purple-400">None</span>           <span className="text-slate-600">{t('nodeParentComment')}</span></div>
                    <div>        self.lock_ref = <span className="text-purple-400">0</span>          <span className="text-slate-600">{t('nodeLockComment')}</span></div>
                    <br/>
                    <div><span className="text-blue-400">class</span> <span className="text-amber-300">RadixCache</span>:</div>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">match_prefix</span>(self, tokens):</div>
                    <div className={snapshot.activeCode === 'match' ? "bg-indigo-900/40 px-1 -mx-1 border-l-2 border-indigo-400 text-indigo-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment3')}</span></div>
                      <div>        prefix_len = key_match_fn(child.key, tokens)</div>
                      <div>        <span className="text-emerald-400">return</span> prefix_len, node</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">insert</span>(self, tokens, prefix_len, node):</div>
                    <div className={snapshot.activeCode === 'split' ? "bg-amber-900/40 px-1 -mx-1 border-l-2 border-amber-400 text-amber-100" : "text-slate-500"}>
                      <div>        <span className="text-emerald-400">if</span> prefix_len &lt; <span className="text-blue-300">len</span>(node.key):</div>
                      <div>            <span className="text-slate-600">{t('pyComment4')}</span></div>
                      <div>            node = self._split_node(node, prefix_len)</div>
                    </div>
                    <div className={snapshot.activeCode === 'insert' ? "bg-emerald-900/40 px-1 -mx-1 border-l-2 border-emerald-400 text-emerald-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment5')}</span></div>
                      <div>        self._insert_suffix(node, tokens[prefix_len:])</div>
                      <div>        self.inc_lock_ref(node)</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">cache_finished_req</span>(self, req):</div>
                    <div className={snapshot.activeCode === 'finish' ? "bg-emerald-900/40 px-1 -mx-1 border-l-2 border-emerald-400 text-emerald-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyCommentFinish')}</span></div>
                      <div>        self.dec_lock_ref(req.last_node)</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">ensure_capacity</span>(self, req):</div>
                    <div className={snapshot.activeCode === 'capacity' ? "bg-rose-900/40 px-1 -mx-1 border-l-2 border-rose-400 text-rose-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyCommentCapacity')}</span></div>
                      <div>        deficit = <span className="text-blue-300">max</span>(0, req.num_slots - allocator.available_size())</div>
                      <div>        <span className="text-emerald-400">if</span> deficit: self.evict(deficit)</div>
                    </div>
                    <br/>
                    <div>    <span className="text-emerald-400">def</span> <span className="text-blue-400">evict</span>(self, num_blocks):</div>
                    <div className={snapshot.activeCode === 'evict' ? "bg-rose-900/40 px-1 -mx-1 border-l-2 border-rose-400 text-rose-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment6')}</span></div>
                      <div>        _, node = heapq.heappop(self.evictable_leaves)</div>
                      <div>        self.allocator.free(node.value) <span className="text-slate-600">{t('freeSlotComment')}</span></div>
                      <div>        self._delete_leaf(node)</div>
                    </div>
                    <div className={snapshot.activeCode === 'evict' ? "bg-amber-900/40 px-1 -mx-1 border-l-2 border-amber-400 text-amber-100" : "text-slate-500"}>
                      <div>        <span className="text-slate-600">{t('pyComment9')}</span></div>
                      <div>        <span className="text-emerald-400">if</span> <span className="text-blue-300">len</span>(node.parent.children) == <span className="text-purple-400">0</span> \</div>
                      <div>           <span className="text-emerald-400">and</span> node.parent.lock_ref == <span className="text-purple-400">0</span>:</div>
                      <div>            heapq.heappush(self.evictable_leaves, node.parent)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deep Principle Analysis Bottom Bar */}
        <div className="w-full mt-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-60 pointer-events-none"></div>
            
            <h3 className="text-lg font-bold mb-6 text-indigo-950 pb-3 flex items-center gap-2 border-b border-indigo-100 w-fit pr-10">
              <Info size={20} className="text-indigo-500"/> {t('principleAnalysis')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
              <div className="flex flex-col gap-2">
                <div className="font-bold text-rose-600 text-sm flex items-center gap-1.5 pb-1"><Database size={16}/> {t('memWallTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('memWallDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-indigo-600 text-sm flex items-center gap-1.5 pb-1"><Network size={16}/> {t('radixTreeTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('radixTreeDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-amber-600 text-sm flex items-center gap-1.5 pb-1"><SplitSquareHorizontal size={16}/> {t('lazySplitTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('lazySplitDesc')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-emerald-600 text-sm flex items-center gap-1.5 pb-1"><Trash2 size={16}/> {t('evictTitle')}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{t('evictDesc')}</p>
              </div>
            </div>
            <div className="relative z-10 mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 md:flex-row md:items-center">
              <div className="shrink-0 text-sm font-bold">{t('metricTitle')}</div>
              <div className="overflow-x-auto rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                <MathFormula>{String.raw`r_{\mathrm{prefix}}=\frac{N_{\mathrm{reused\ prompt\ tokens}}}{N_{\mathrm{arrived\ prompt\ tokens}}}`}</MathFormula>
              </div>
              <p className="text-xs leading-relaxed text-emerald-800">{t('metricDesc')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
