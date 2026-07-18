export const TOKENS_PER_SLOT = 4;
export const TOTAL_KV_SLOTS = 10;

const PREFIX_TOKENS = '[1, 93, 24, 15, 8, 304, 11, 42';
const SUFFIX_A_TOKENS = ', 19, 7, 501, 8]';
const SUFFIX_B_TOKENS = ', 66, 31, 9, 102]';

export const RADIX_REQUESTS = {
  A: {
    id: 'A',
    full: PREFIX_TOKENS + SUFFIX_A_TOKENS,
    color: 'emerald',
    blocks: 3,
    prefixBlocks: 2,
    suffixBlocks: 1,
    tokenCount: 12,
    matchedTokens: 0,
    blockRefs: [0, 1, 2],
  },
  B: {
    id: 'B',
    full: PREFIX_TOKENS + SUFFIX_B_TOKENS,
    color: 'amber',
    blocks: 3,
    prefixBlocks: 2,
    suffixBlocks: 1,
    tokenCount: 12,
    matchedTokens: 8,
    blockRefs: [3, 4, 5],
  },
  C: {
    id: 'C',
    full: '[55, 91, 19, 23, 77, 88, 12, 34]',
    color: 'rose',
    blocks: 2,
    prefixBlocks: 0,
    suffixBlocks: 2,
    tokenCount: 8,
    matchedTokens: 0,
    blockRefs: [6, 7],
  },
  D: {
    id: 'D',
    full: '[70, 14, 6, 81, 33, 45, 90, 12, 5, 201, 19, 38, 77, 4, 62, 18, 9, 54, 31, 88]',
    color: 'sky',
    blocks: 5,
    prefixBlocks: 0,
    suffixBlocks: 5,
    tokenCount: 20,
    matchedTokens: 0,
    blockRefs: [2, 6, 7, 8, 9],
  },
};

export const RADIX_PREFIX_TOKENS = PREFIX_TOKENS;
export const RADIX_SUFFIX_A_TOKENS = SUFFIX_A_TOKENS;
export const RADIX_SUFFIX_B_TOKENS = SUFFIX_B_TOKENS;

export const MODE_MAX_STEPS = {
  standard: 7,
  radix: 12,
};

const REQUEST_ARRIVAL_STEP = {
  standard: { A: 1, B: 3, C: 5, D: 7 },
  radix: { A: 1, B: 3, C: 7, D: 8 },
};

const REQUEST_ACTIVE_STEP = {
  standard: { A: 1, B: 3, C: 5 },
  radix: { A: 1, B: 5, C: 7, D: 11 },
};

const REQUEST_DONE_STEP = {
  standard: { A: 2, B: 4, C: 6 },
  radix: { A: 2, B: 6, C: 8, D: 12 },
};

const STEP_KEYS = {
  standard: [
    'standardStep0',
    'standardStep1',
    'standardStep2',
    'standardStep3',
    'standardStep4',
    'standardStep5',
    'standardStep6',
    'standardStep7',
  ],
  radix: [
    'radixStep0',
    'radixStep1',
    'radixStep2',
    'radixStep3',
    'radixStep4',
    'radixStep5',
    'radixStep6',
    'radixStep7',
    'radixStep8',
    'radixStep9',
    'radixStep10',
    'radixStep11',
    'radixStep12',
  ],
};

const ACTIVE_CODE = {
  standard: ['idle', 'allocate', 'finish', 'allocate', 'finish', 'allocate', 'finish', 'capacity'],
  radix: ['idle', 'insert', 'finish', 'match', 'split', 'insert', 'finish', 'insert', 'finish', 'capacity', 'evict', 'insert', 'finish'],
};

const makeSlots = () => Array.from({ length: TOTAL_KV_SLOTS }, (_, index) => ({
  index,
  status: 'empty',
  color: 'slate',
  seq: '',
  locked: false,
  isDup: false,
}));

const occupy = (slots, indices, properties) => {
  indices.forEach((index) => {
    slots[index] = { ...slots[index], status: 'used', ...properties };
  });
};

const getRequestStatus = (mode, step, requestId) => {
  const arrival = REQUEST_ARRIVAL_STEP[mode][requestId];
  if (arrival == null || step < arrival) return 'waiting';

  if (mode === 'radix' && requestId === 'B') {
    if (step === 3) return 'matching';
    if (step === 4) return 'splitting';
  }
  if (mode === 'standard' && requestId === 'D') return 'blocked';
  if (requestId === 'D' && step === arrival) return 'queued';
  if (mode === 'radix' && requestId === 'D') {
    if (step === 9) return 'checking';
    if (step === 10) return 'evicting';
  }
  const active = REQUEST_ACTIVE_STEP[mode][requestId];
  const done = REQUEST_DONE_STEP[mode][requestId];
  if (step === active) return 'running';
  if (done != null && step >= done) return 'done';
  return 'queued';
};

const deriveStandardPool = (step) => {
  const slots = makeSlots();

  if (step >= 1) {
    occupy(slots, [0, 1], { color: 'indigo', seq: 'A·P', locked: step === 1 });
    occupy(slots, [2], { color: 'emerald', seq: 'A', locked: step === 1 });
  }
  if (step >= 3) {
    occupy(slots, [3, 4], { color: 'indigo', seq: 'B·P', locked: step === 3, isDup: true });
    occupy(slots, [5], { color: 'amber', seq: 'B', locked: step === 3 });
  }
  if (step >= 5) {
    occupy(slots, [6, 7], { color: 'rose', seq: 'C', locked: step === 5 });
  }

  return slots;
};

const deriveRadixPool = (step) => {
  const slots = makeSlots();
  const prefixLocked = step === 1 || step === 4 || step === 5;
  const aLocked = step === 1;

  if (step >= 1) {
    occupy(slots, [0, 1], { color: 'indigo', seq: 'P', locked: prefixLocked });
    if (step < 10) {
      occupy(slots, [2], {
        color: 'emerald',
        seq: 'A',
        locked: aLocked,
        status: step === 9 ? 'targeted' : 'used',
      });
    }
  }
  if (step >= 5) occupy(slots, [3], { color: 'amber', seq: 'B', locked: step === 5 });
  if (step >= 7) occupy(slots, [4, 5], { color: 'rose', seq: 'C', locked: step === 7 });
  if (step >= 11) occupy(slots, RADIX_REQUESTS.D.blockRefs, { color: 'sky', seq: 'D', locked: step === 11 });

  return slots;
};

const deriveMetrics = (mode, step, slots) => {
  const arrived = Object.values(RADIX_REQUESTS).filter(
    (request) => step >= REQUEST_ARRIVAL_STEP[mode][request.id],
  );
  const promptTokens = arrived.reduce((sum, request) => sum + request.tokenCount, 0);
  const matchedTokens = mode === 'radix'
    ? arrived.reduce((sum, request) => sum + request.matchedTokens, 0)
    : 0;
  const usedCount = slots.filter((slot) => slot.status !== 'empty').length;
  const freeCount = TOTAL_KV_SLOTS - usedCount;
  const dHasArrived = step >= REQUEST_ARRIVAL_STEP[mode].D;
  const dAllocated = mode === 'radix' && step >= 11;
  const allocationNeed = dHasArrived && !dAllocated ? RADIX_REQUESTS.D.blocks : 0;
  const shortage = Math.max(0, allocationNeed - freeCount);

  return {
    usedCount,
    freeCount,
    promptTokens,
    matchedTokens,
    prefixReuseRate: promptTokens > 0 ? (matchedTokens / promptTokens) * 100 : 0,
    savedCount: mode === 'radix' && step >= 5 ? RADIX_REQUESTS.B.prefixBlocks : 0,
    allocationNeed,
    shortage,
    evictedCount: mode === 'radix' && step >= 10 ? 1 : 0,
  };
};

const node = (properties) => ({ children: [], ...properties });

const deriveRadixTree = (step) => {
  if (step === 0) return { root: [] };
  if (step <= 3) {
    return {
      root: [node({
        id: 'a-full',
        tokens: RADIX_REQUESTS.A.full,
        labelKey: 'reqA',
        lock: step === 1 ? 1 : 0,
        active: step === 1 || step === 3,
        isNew: step === 1,
        highlightPrefix: step === 3,
        color: 'indigo',
        blockRefs: [0, 1, 2],
      })],
    };
  }

  const prefix = node({
    id: 'shared-prefix',
    tokens: `${RADIX_PREFIX_TOKENS}]`,
    labelKey: 'prefixNode',
    lock: step === 4 || step === 5 ? 1 : 0,
    active: step === 4,
    splitAnim: step === 4,
    color: 'indigo',
    blockRefs: [0, 1],
  });

  if (step < 10) {
    prefix.children.push(node({
      id: 'a-suffix',
      tokens: `[${RADIX_SUFFIX_A_TOKENS.substring(2)}`,
      labelKey: 'reqASuffix',
      lock: 0,
      active: false,
      evictWarning: step === 9,
      color: 'emerald',
      blockRefs: [2],
    }));
  }
  if (step >= 5) {
    prefix.children.push(node({
      id: 'b-suffix',
      tokens: `[${RADIX_SUFFIX_B_TOKENS.substring(2)}`,
      labelKey: 'reqBSuffix',
      lock: step === 5 ? 1 : 0,
      active: step === 5,
      isNew: step === 5,
      color: 'amber',
      blockRefs: [3],
    }));
  }

  const roots = [prefix];
  if (step >= 7) {
    roots.push(node({
      id: 'c-root',
      tokens: RADIX_REQUESTS.C.full,
      labelKey: 'reqC',
      lock: step === 7 ? 1 : 0,
      active: step === 7,
      isNew: step === 7,
      color: 'rose',
      blockRefs: [4, 5],
    }));
  }
  if (step >= 11) {
    roots.push(node({
      id: 'd-root',
      tokens: RADIX_REQUESTS.D.full,
      labelKey: 'reqD',
      lock: step === 11 ? 1 : 0,
      active: step === 11,
      isNew: step === 11,
      color: 'sky',
      blockRefs: RADIX_REQUESTS.D.blockRefs,
    }));
  }
  return { root: roots };
};

export const deriveRadixCacheState = ({ mode = 'radix', step = 0, phase = 'idle' } = {}) => {
  const normalizedMode = mode === 'standard' ? 'standard' : 'radix';
  const maxStep = MODE_MAX_STEPS[normalizedMode];
  const normalizedStep = Math.min(Math.max(0, Math.trunc(step)), maxStep);
  const slots = normalizedMode === 'standard'
    ? deriveStandardPool(normalizedStep)
    : deriveRadixPool(normalizedStep);
  const metrics = deriveMetrics(normalizedMode, normalizedStep, slots);
  const normalizedPhase = normalizedStep === maxStep
    ? 'done'
    : phase === 'running' || normalizedStep > 0
      ? 'running'
      : 'idle';

  return {
    mode: normalizedMode,
    step: normalizedStep,
    maxStep,
    phase: normalizedPhase,
    stepKey: STEP_KEYS[normalizedMode][normalizedStep],
    activeCode: ACTIVE_CODE[normalizedMode][normalizedStep],
    requests: Object.values(RADIX_REQUESTS).map((request) => ({
      ...request,
      status: getRequestStatus(normalizedMode, normalizedStep, request.id),
    })),
    pool: { slots, ...metrics },
    tree: normalizedMode === 'radix' ? deriveRadixTree(normalizedStep) : { root: [] },
  };
};
