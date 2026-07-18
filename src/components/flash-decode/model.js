export const FLASH_DECODE_ALGORITHMS = ['simple', 'optimized'];
export const FLASH_DECODE_EXECUTIONS = ['unsplit', 'split'];
export const FLASH_DECODE_KV_LAYOUTS = ['contiguous', 'paged'];
export const FLASH_DECODE_HEAD_MODES = ['mha', 'gqa', 'mqa'];
export const FLASH_DECODE_SPLIT_SETTINGS = ['auto', '2', '4', '6', '8'];

export const NUM_KV_BLOCKS = 6;
export const NUM_WORK_UNITS = 4;
export const MAX_FLASH_DECODE_STEP = 6;
export const SEQ_LEN = 12288;
export const HEAD_DIM = 128;
export const QUERY_HEADS = 8;

const PHYSICAL_PAGE_ORDER = [4, 1, 7, 3, 8, 0];

const HEAD_CONFIG = {
  mha: { queryHeads: QUERY_HEADS, kvHeads: QUERY_HEADS },
  gqa: { queryHeads: QUERY_HEADS, kvHeads: 2 },
  mqa: { queryHeads: QUERY_HEADS, kvHeads: 1 },
};

const SPLIT_OPERATION_BY_STEP = [
  'idle',
  'splitViews',
  'localBatch1',
  'localBatch2',
  'reduceStats',
  'mergeOutput',
  'writeOutput',
];

const SINGLE_BATCH_SPLIT_OPERATION_BY_STEP = [
  'idle',
  'splitViews',
  'localBatch1',
  'reduceStats',
  'mergeOutput',
  'writeOutput',
];

const UNSPLIT_OPERATION_BY_STEP = [
  'idle',
  'resolveKv',
  'fusedAttention',
  'writeOutput',
];

const clampStep = (step, maximum) => Math.max(0, Math.min(maximum, step));

export function deriveAutoSplitCount(sequenceLength = SEQ_LEN) {
  const targetTokensPerSplit = 2048;
  const rawCount = Math.ceil(sequenceLength / targetTokensPerSplit);
  const evenCount = Math.ceil(rawCount / 2) * 2;
  return Math.max(2, Math.min(8, evenCount));
}

export function normalizeFlashDecodeState(input = {}) {
  const algorithm = FLASH_DECODE_ALGORITHMS.includes(input.algorithm) ? input.algorithm : 'optimized';
  const execution = FLASH_DECODE_EXECUTIONS.includes(input.execution) ? input.execution : 'split';
  const kvLayout = FLASH_DECODE_KV_LAYOUTS.includes(input.kvLayout) ? input.kvLayout : 'contiguous';
  const headMode = FLASH_DECODE_HEAD_MODES.includes(input.headMode) ? input.headMode : 'gqa';
  const splitSetting = FLASH_DECODE_SPLIT_SETTINGS.includes(String(input.splitSetting))
    ? String(input.splitSetting)
    : 'auto';
  const configuredSplitCount = splitSetting === 'auto'
    ? deriveAutoSplitCount(SEQ_LEN)
    : Number(splitSetting);
  const maxStep = execution === 'split'
    ? (configuredSplitCount > NUM_WORK_UNITS ? MAX_FLASH_DECODE_STEP : 5)
    : 3;
  const numericStep = Number.isFinite(input.step) ? Math.trunc(input.step) : 0;

  return {
    algorithm,
    execution,
    kvLayout,
    headMode,
    splitSetting,
    step: clampStep(numericStep, maxStep),
  };
}

const createHeadMapping = ({ queryHeads, kvHeads }) => {
  const groupSize = queryHeads / kvHeads;
  return Array.from({ length: queryHeads }, (_, queryHead) => ({
    queryHead,
    kvHead: Math.floor(queryHead / groupSize),
  }));
};

const createSplitWorkItems = (operation, effectiveSplitCount) => {
  const activeBatch = operation === 'localBatch1' ? 0 : operation === 'localBatch2' ? 1 : null;
  return Array.from({ length: NUM_WORK_UNITS }, (_, workUnit) => {
    if (activeBatch === null) return null;
    const splitIndex = activeBatch * NUM_WORK_UNITS + workUnit;
    return splitIndex < effectiveSplitCount ? { splitIndex, fullSequence: false } : null;
  });
};

export function deriveFlashDecodeSnapshot(input = {}) {
  const normalized = normalizeFlashDecodeState(input);
  const { algorithm, execution, kvLayout, headMode, splitSetting, step } = normalized;
  const isSplit = execution === 'split';
  const configuredSplitCount = splitSetting === 'auto'
    ? deriveAutoSplitCount(SEQ_LEN)
    : Number(splitSetting);
  const effectiveSplitCount = isSplit ? configuredSplitCount : 1;
  const splitOperations = effectiveSplitCount > NUM_WORK_UNITS
    ? SPLIT_OPERATION_BY_STEP
    : SINGLE_BATCH_SPLIT_OPERATION_BY_STEP;
  const maxStep = isSplit ? splitOperations.length - 1 : 3;
  const splitSize = Math.ceil(SEQ_LEN / effectiveSplitCount);
  const headConfig = HEAD_CONFIG[headMode];
  const headMapping = createHeadMapping(headConfig);
  const operation = isSplit ? splitOperations[step] : UNSPLIT_OPERATION_BY_STEP[step];
  const workItems = isSplit
    ? createSplitWorkItems(operation, effectiveSplitCount)
    : Array.from({ length: NUM_WORK_UNITS }, (_, workUnit) => (
      operation === 'fusedAttention' && workUnit === 0 ? { splitIndex: null, fullSequence: true } : null
    ));
  const assignments = workItems.map((item) => item?.splitIndex ?? null);
  const writtenBlockCount = !isSplit
    ? 0
    : operation === 'localBatch2'
      ? Math.min(NUM_WORK_UNITS, effectiveSplitCount)
      : ['reduceStats', 'mergeOutput', 'writeOutput'].includes(operation)
        ? effectiveSplitCount
        : 0;

  return {
    ...normalized,
    maxStep,
    operation,
    phase: step === 0 ? 'idle' : step === maxStep ? 'done' : 'running',
    isSplit,
    assignments,
    workItems,
    writtenBlockCount,
    splitVisible: isSplit && operation !== 'idle',
    localActive: ['localBatch1', 'localBatch2', 'fusedAttention'].includes(operation),
    reductionActive: isSplit && ['reduceStats', 'mergeOutput'].includes(operation),
    outputReady: operation === 'writeOutput',
    workspaceVisible: isSplit && writtenBlockCount > 0 && operation !== 'writeOutput',
    workspaceForm: algorithm === 'simple' ? 'accumulators' : 'lse',
    sequenceLength: SEQ_LEN,
    headDim: HEAD_DIM,
    effectiveSplitCount,
    splitSize,
    ctaBatches: isSplit ? Math.ceil(effectiveSplitCount / NUM_WORK_UNITS) : 1,
    queryHeads: headConfig.queryHeads,
    kvHeads: headConfig.kvHeads,
    queryHeadsPerKvHead: headConfig.queryHeads / headConfig.kvHeads,
    headMapping,
    logicalPages: Array.from({ length: NUM_KV_BLOCKS }, (_, logicalPage) => ({
      logicalPage,
      physicalPage: kvLayout === 'paged' ? PHYSICAL_PAGE_ORDER[logicalPage] : logicalPage,
    })),
    metrics: {
      kvElementsRead: SEQ_LEN * headConfig.kvHeads * HEAD_DIM * 2,
      workspaceEntries: isSplit ? effectiveSplitCount : 0,
      reductionPasses: isSplit ? 1 : 0,
    },
    boundary: {
      representativeBlocks: true,
      representativeCtas: true,
      logicalSplitViews: isSplit,
      independentReductionKernel: isSplit,
      pageBlocksIndependentFromSplits: true,
      autoSplitIsTeachingHeuristic: splitSetting === 'auto',
      runtimeCanChooseDifferentKernel: true,
    },
  };
}

const logAddExp = (a, b) => {
  const maxValue = Math.max(a, b);
  if (maxValue === -Infinity) return -Infinity;
  return maxValue + Math.log(Math.exp(a - maxValue) + Math.exp(b - maxValue));
};

export function mergeLsePartials(partials) {
  if (!Array.isArray(partials) || partials.length === 0) return { output: [], lse: -Infinity };
  const lse = partials.reduce((value, partial) => logAddExp(value, partial.lse), -Infinity);
  const output = partials[0].output.map((_, dimension) => partials.reduce(
    (sum, partial) => sum + partial.output[dimension] * Math.exp(partial.lse - lse),
    0,
  ));
  return { output, lse };
}

export function mergeAccumulatorPartials(partials) {
  if (!Array.isArray(partials) || partials.length === 0) return { output: [], max: -Infinity, sumExp: 0 };
  const max = Math.max(...partials.map((partial) => partial.max));
  const sumExp = partials.reduce(
    (sum, partial) => sum + partial.sumExp * Math.exp(partial.max - max),
    0,
  );
  const numerator = partials[0].numerator.map((_, dimension) => partials.reduce(
    (sum, partial) => sum + partial.numerator[dimension] * Math.exp(partial.max - max),
    0,
  ));
  return { output: numerator.map((value) => value / sumExp), max, sumExp };
}
