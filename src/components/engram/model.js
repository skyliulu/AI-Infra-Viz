export const ENGRAM_TOKENS = ['[BOS]', 'Only', 'Alexander', 'the', 'Great', 'could', 'tame'];
export const ENGRAM_SYSTEM_MODES = ['inference', 'training'];
export const ENGRAM_MAX_STEP = 9;
export const ENGRAM_FIRST_TOKEN_INDEX = 2;

export const ENGRAM_DEMO_CONFIG = Object.freeze({
  maxNgramSize: 3,
  headsPerNgram: 8,
  layerIds: [1, 15],
  convolutionKernel: 4,
  convolutionDilation: 3,
});

const OPERATIONS = [
  'idle',
  'extract',
  'hash',
  'lookup',
  'retrieve',
  'concatenate',
  'project',
  'gate',
  'shortConv',
  'integrate',
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeEngramState(input = {}) {
  const numericStep = Number.isFinite(input.step) ? Math.trunc(input.step) : 0;
  const numericTokenIndex = Number.isFinite(input.tokenIndex)
    ? Math.trunc(input.tokenIndex)
    : ENGRAM_FIRST_TOKEN_INDEX;

  return {
    step: clamp(numericStep, 0, ENGRAM_MAX_STEP),
    tokenIndex: clamp(numericTokenIndex, ENGRAM_FIRST_TOKEN_INDEX, ENGRAM_TOKENS.length - 1),
    systemMode: ENGRAM_SYSTEM_MODES.includes(input.systemMode) ? input.systemMode : 'inference',
  };
}

const statusForStep = (stageStep, currentStep, phase) => {
  if (currentStep === 0) return 'pending';
  if (stageStep < currentStep) return 'passed';
  if (stageStep > currentStep) return 'pending';
  return phase === 'done' ? 'done' : 'active';
};

const statusForRange = (start, end, currentStep) => {
  if (currentStep < start) return 'pending';
  if (currentStep > end) return 'passed';
  return 'active';
};

export function deriveEngramSnapshot(input = {}) {
  const normalized = normalizeEngramState(input);
  const { step, tokenIndex, systemMode } = normalized;
  const isFinalToken = tokenIndex === ENGRAM_TOKENS.length - 1;
  const phase = step === 0 ? 'idle' : step === ENGRAM_MAX_STEP && isFinalToken ? 'done' : 'running';
  const stageStatus = Object.fromEntries(
    OPERATIONS.slice(1).map((operation, index) => [operation, statusForStep(index + 1, step, phase)]),
  );
  const currentToken = ENGRAM_TOKENS[tokenIndex];
  const normalizedToken = currentToken === '[BOS]' ? '[bos]' : currentToken.normalize('NFKC').trim().toLowerCase();
  const inferenceTimeline = {
    input: statusForRange(1, 1, step),
    hostLookup: statusForRange(2, 4, step),
    pcieTransfer: statusForRange(4, 5, step),
    computeWindow: statusForRange(2, 5, step),
    fusion: statusForRange(6, 8, step),
    subsequent: statusForRange(9, 9, step),
  };
  const trainingTimeline = {
    input: statusForRange(1, 1, step),
    localHash: statusForRange(2, 2, step),
    tableShards: statusForRange(3, 5, step),
    allToAll: statusForRange(3, 4, step),
    activeRows: statusForRange(5, 5, step),
    fusion: statusForRange(6, 8, step),
    subsequent: statusForRange(9, 9, step),
  };

  return {
    ...normalized,
    phase,
    operation: OPERATIONS[step],
    stageStatus,
    isFinalToken,
    currentToken,
    suffixTokens: ENGRAM_TOKENS.slice(Math.max(0, tokenIndex - 2), tokenIndex + 1),
    tokenizerExample: {
      rawForms: [` ${currentToken}`, currentToken.toUpperCase()],
      normalizedToken,
    },
    topology: {
      vocab: statusForRange(1, 1, step),
      precedingBlock: statusForRange(1, 5, step),
      engramBlock: statusForRange(2, 8, step),
      subsequentBlock: statusForRange(9, 9, step),
      embedding: statusForRange(3, 5, step),
      projections: statusForRange(6, 6, step),
      norms: statusForRange(7, 8, step),
      convolution: statusForRange(8, 8, step),
    },
    system: systemMode === 'inference'
      ? {
          sourceLane: 'host',
          destinationLane: 'device',
          transfer: 'pciePrefetch',
          overlapCondition: 'prefetchLatencyLteComputeWindow',
          trainingCollective: false,
        }
      : {
          sourceLane: 'requestingRank',
          destinationLane: 'tableShards',
          transfer: 'allToAllRows',
          overlapCondition: 'collectiveCompletesBeforeFusion',
          trainingCollective: true,
        },
    timeline: systemMode === 'inference' ? inferenceTimeline : trainingTimeline,
    boundary: {
      demoConfiguration: true,
      layersAreRepresentative: true,
      hostOffloadIsInferenceOnly: systemMode === 'inference',
      completeLatencyHidingIsConditional: true,
      backwardGradientDispatchNotAnimated: systemMode === 'training',
    },
  };
}

export function advanceEngramState(input = {}) {
  const state = normalizeEngramState(input);
  if (state.step < ENGRAM_MAX_STEP) return { ...state, step: state.step + 1 };
  if (state.tokenIndex < ENGRAM_TOKENS.length - 1) {
    return { ...state, step: 1, tokenIndex: state.tokenIndex + 1 };
  }
  return state;
}
