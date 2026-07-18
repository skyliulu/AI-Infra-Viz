export const FLASH_VERSIONS = ['v1', 'v2', 'v3', 'v4'];
export const DIRECTIONS = ['forward', 'backward'];

export const DEFAULT_FLASH_CONFIG = Object.freeze({
  modelType: 'flash',
  version: 'v2',
  direction: 'forward',
  causal: true,
  sequenceLength: 2048,
  headDim: 128,
  dtype: 'bf16',
});

const VERSION_PROFILES = {
  v1: {
    hardware: 'A100-class GPU',
    architecture: 'Ampere / CUDA + Tensor Cores',
    outerLoop: 'kv',
    warpPartition: 'split-k',
    qTile: 64,
    kvTile: 64,
    storage: ['SMEM: Qᵢ / Kⱼ / Vⱼ', 'registers: Oᵢ, m, ℓ', 'HBM: O, m, ℓ write-back'],
    bottleneck: 'repeated O / statistics traffic',
  },
  v2: {
    hardware: 'A100',
    architecture: 'Ampere / mma.sync',
    outerLoop: 'q',
    warpPartition: 'split-q',
    qTile: 128,
    kvTile: 64,
    storage: ['SMEM: Kⱼ / Vⱼ', 'registers: CTA-owned Qᵢ / Oᵢ', 'HBM: final O + LSE'],
    bottleneck: 'occupancy and non-matmul work',
  },
  v3: {
    hardware: 'H100',
    architecture: 'Hopper / TMA + WGMMA',
    outerLoop: 'q',
    warpPartition: 'warp specialization',
    qTile: 128,
    kvTile: 128,
    storage: ['SMEM: double-buffered K / V', 'registers: WGMMA accumulators', 'producer / consumer warpgroups'],
    bottleneck: 'softmax latency beside fast WGMMA',
  },
  v4: {
    hardware: 'B200',
    architecture: 'Blackwell / UMMA + TMEM',
    outerLoop: 'q-pair',
    warpPartition: 'specialized Qᴴ / Qᴸ groups',
    qTile: 128,
    kvTile: 128,
    storage: ['SMEM: staged operands', 'TMEM: S / P / O accumulators', 'correction warpgroup'],
    bottleneck: 'exponential throughput and SMEM traffic',
  },
};

const PIPELINES = {
  standard: {
    forward: {
      lanes: ['hbm', 'tensor', 'cuda'],
      operations: [
        ['dispatch', 'hbm', 0, 1],
        ['qk', 'tensor', 1, 2],
        ['writeS', 'hbm', 3, 1],
        ['readS', 'hbm', 4, 1],
        ['softmax', 'cuda', 5, 2],
        ['writeP', 'hbm', 7, 1],
        ['readP', 'hbm', 8, 1],
        ['pv', 'tensor', 9, 2],
        ['writeO', 'hbm', 11, 1],
      ],
    },
    backward: {
      lanes: ['hbm', 'tensor', 'cuda'],
      operations: [
        ['loadSaved', 'hbm', 0, 2],
        ['dv', 'tensor', 2, 2],
        ['dp', 'tensor', 4, 2],
        ['softmaxBwd', 'cuda', 6, 2],
        ['dq', 'tensor', 8, 2],
        ['dk', 'tensor', 10, 2],
        ['writeGrads', 'hbm', 12, 1],
      ],
    },
  },
  v1: {
    forward: {
      lanes: ['hbm', 'tensor', 'cuda'],
      operations: [
        ['loadKV', 'hbm', 0, 2],
        ['loadQState', 'hbm', 2, 2],
        ['qk', 'tensor', 4, 2],
        ['onlineSoftmax', 'cuda', 6, 2],
        ['pv', 'tensor', 8, 2],
        ['writeState', 'hbm', 10, 2],
        ['nextQ', 'hbm', 12, 1],
      ],
    },
    backward: {
      lanes: ['hbm', 'tensor', 'cuda'],
      operations: [
        ['loadBackward', 'hbm', 0, 2],
        ['recomputeS', 'tensor', 2, 2],
        ['recomputeP', 'cuda', 4, 2],
        ['dvdk', 'tensor', 6, 2],
        ['softmaxBwd', 'cuda', 8, 2],
        ['dq', 'tensor', 10, 2],
        ['atomicGrad', 'hbm', 12, 1],
      ],
    },
  },
  v2: {
    forward: {
      lanes: ['cta', 'hbm', 'tensor', 'cuda'],
      operations: [
        ['assignQ', 'cta', 0, 2],
        ['loadKV', 'hbm', 2, 2],
        ['splitQQK', 'tensor', 4, 2],
        ['leanSoftmax', 'cuda', 6, 2],
        ['splitQPV', 'tensor', 8, 2],
        ['nextKV', 'hbm', 10, 1],
        ['writeOLSE', 'hbm', 11, 2],
      ],
    },
    backward: {
      lanes: ['cta', 'hbm', 'tensor', 'cuda'],
      operations: [
        ['assignKV', 'cta', 0, 2],
        ['loadBackward', 'hbm', 1, 2],
        ['recomputeS', 'tensor', 3, 2],
        ['recomputeP', 'cuda', 5, 2],
        ['gradMma', 'tensor', 7, 3],
        ['atomicDQ', 'hbm', 10, 2],
        ['writeGrad', 'hbm', 12, 1],
      ],
    },
  },
  v3: {
    forward: {
      lanes: ['producer', 'wgmmaA', 'softmax', 'wgmmaB'],
      operations: [
        ['tmaKV0', 'producer', 0, 3],
        ['wgmmaQK0', 'wgmmaA', 2, 3],
        ['tmaKV1', 'producer', 4, 3],
        ['softmax0', 'softmax', 5, 3],
        ['wgmmaPV0', 'wgmmaB', 7, 3],
        ['wgmmaQK1', 'wgmmaA', 7, 3],
        ['softmax1', 'softmax', 10, 2],
        ['commitO', 'producer', 12, 1],
      ],
    },
    backward: {
      lanes: ['producer', 'wgmmaA', 'softmax', 'wgmmaB'],
      operations: [
        ['tmaBackward', 'producer', 0, 3],
        ['recomputeWgmma', 'wgmmaA', 2, 3],
        ['recomputeSoftmax', 'softmax', 5, 2],
        ['gradWgmma0', 'wgmmaB', 6, 3],
        ['gradSoftmax', 'softmax', 8, 2],
        ['gradWgmma1', 'wgmmaA', 9, 3],
        ['commitGrad', 'producer', 12, 1],
      ],
    },
  },
  v4: {
    forward: {
      lanes: ['umma', 'softmaxH', 'softmaxL', 'correction'],
      operations: [
        ['ummaQKH', 'umma', 0, 3],
        ['softmaxH', 'softmaxH', 3, 3],
        ['ummaQKL', 'umma', 3, 3],
        ['softmaxL', 'softmaxL', 6, 3],
        ['ummaPVH', 'umma', 6, 3],
        ['correctH', 'correction', 8, 2],
        ['ummaPVL', 'umma', 9, 3],
        ['correctL', 'correction', 11, 2],
      ],
    },
    backward: {
      lanes: ['tmem', 'umma', 'cuda', 'cluster'],
      operations: [
        ['recomputeTranspose', 'umma', 0, 3],
        ['storeTmem', 'tmem', 2, 2],
        ['softmaxTile', 'cuda', 4, 3],
        ['gradPrevious', 'umma', 5, 3],
        ['twoCtaMma', 'cluster', 8, 3],
        ['dsmemExchange', 'cluster', 10, 2],
        ['reduceGrad', 'tmem', 12, 1],
      ],
    },
  },
};

const ON_CHIP_STAGE_SPECS = {
  v1: {
    forward: [
      ['v1LoadKv', 'tiles', ['loadKV']],
      ['v1ReloadState', 'state', ['loadQState']],
      ['v1Score', 'score', ['qk']],
      ['v1OnlineUpdate', 'softmax', ['onlineSoftmax', 'pv']],
      ['v1WriteState', 'commit', ['writeState', 'nextQ']],
    ],
    backward: [
      ['bwdLoad', 'tiles', ['loadBackward']],
      ['bwdRecompute', 'score', ['recomputeS', 'recomputeP']],
      ['bwdGradMma', 'gradient', ['dvdk', 'dq']],
      ['bwdSoftmax', 'softmax', ['softmaxBwd']],
      ['bwdCommit', 'commit', ['atomicGrad']],
    ],
  },
  v2: {
    forward: [
      ['v2Assign', 'scheduler', ['assignQ']],
      ['v2Stream', 'tiles', ['loadKV', 'nextKV']],
      ['v2SplitQ', 'score', ['splitQQK']],
      ['v2OnlineUpdate', 'softmax', ['leanSoftmax', 'splitQPV']],
      ['v2Commit', 'commit', ['writeOLSE']],
    ],
    backward: [
      ['v2AssignKv', 'scheduler', ['assignKV']],
      ['bwdLoad', 'tiles', ['loadBackward']],
      ['bwdRecompute', 'score', ['recomputeS', 'recomputeP']],
      ['bwdGradMma', 'gradient', ['gradMma']],
      ['bwdCommit', 'commit', ['atomicDQ', 'writeGrad']],
    ],
  },
  v3: {
    forward: [
      ['v3Producer', 'tiles', ['tmaKV0', 'tmaKV1']],
      ['v3Score', 'score', ['wgmmaQK0', 'wgmmaQK1']],
      ['v3Softmax', 'softmax', ['softmax0', 'softmax1']],
      ['v3Output', 'output', ['wgmmaPV0']],
      ['v3Commit', 'commit', ['commitO']],
    ],
    backward: [
      ['v3ProducerBwd', 'tiles', ['tmaBackward']],
      ['bwdRecompute', 'score', ['recomputeWgmma', 'recomputeSoftmax']],
      ['bwdGradMma', 'gradient', ['gradWgmma0', 'gradWgmma1']],
      ['bwdSoftmax', 'softmax', ['gradSoftmax']],
      ['bwdCommit', 'commit', ['commitGrad']],
    ],
  },
  v4: {
    forward: [
      ['v4High', 'high', ['ummaQKH', 'softmaxH', 'ummaPVH']],
      ['v4Low', 'low', ['ummaQKL', 'softmaxL', 'ummaPVL']],
      ['v4Correction', 'correction', ['correctH', 'correctL']],
    ],
    backward: [
      ['v4Recompute', 'score', ['recomputeTranspose']],
      ['v4Tmem', 'state', ['storeTmem', 'softmaxTile']],
      ['v4PreviousGrad', 'gradient', ['gradPrevious']],
      ['v4Cluster', 'cluster', ['twoCtaMma', 'dsmemExchange']],
      ['bwdCommit', 'commit', ['reduceGrad']],
    ],
  },
};

const clampChoice = (value, choices, fallback) => choices.includes(Number(value)) ? Number(value) : fallback;

export function normalizeFlashConfig(input = {}) {
  const modelType = input.modelType === 'standard' ? 'standard' : 'flash';
  const version = FLASH_VERSIONS.includes(input.version) ? input.version : DEFAULT_FLASH_CONFIG.version;
  const direction = DIRECTIONS.includes(input.direction) ? input.direction : DEFAULT_FLASH_CONFIG.direction;
  return {
    modelType,
    version,
    direction,
    causal: input.causal !== false,
    sequenceLength: clampChoice(input.sequenceLength, [512, 2048, 8192], DEFAULT_FLASH_CONFIG.sequenceLength),
    headDim: clampChoice(input.headDim, [64, 128], DEFAULT_FLASH_CONFIG.headDim),
    dtype: input.dtype === 'fp16' ? 'fp16' : 'bf16',
  };
}

export function getVersionProfile(version) {
  return VERSION_PROFILES[FLASH_VERSIONS.includes(version) ? version : DEFAULT_FLASH_CONFIG.version];
}

export function getMaskKind(qIndex, kvIndex, qTile, kvTile, causal = true) {
  if (!causal) return 'none';
  const qStart = qIndex * qTile;
  const qEnd = qStart + qTile;
  const kStart = kvIndex * kvTile;
  const kEnd = kStart + kvTile;
  if (kStart >= qEnd) return 'skip';
  if (kEnd <= qStart) return 'none';
  return 'partial';
}

export function getTileGrid(configInput) {
  const config = normalizeFlashConfig(configInput);
  const profile = getVersionProfile(config.version);
  const qTiles = Math.ceil(config.sequenceLength / profile.qTile);
  const kvTiles = Math.ceil(config.sequenceLength / profile.kvTile);
  let activePairs = 0;
  let skippedPairs = 0;
  for (let q = 0; q < qTiles; q += 1) {
    for (let kv = 0; kv < kvTiles; kv += 1) {
      if (getMaskKind(q, kv, profile.qTile, profile.kvTile, config.causal) === 'skip') skippedPairs += 1;
      else activePairs += 1;
    }
  }
  return { qTiles, kvTiles, activePairs, skippedPairs, totalPairs: qTiles * kvTiles };
}

export function estimateForwardResources(configInput) {
  const config = normalizeFlashConfig(configInput);
  const profile = getVersionProfile(config.version);
  const grid = getTileGrid(config);
  const n = config.sequenceLength;
  const d = config.headDim;
  const elementBytes = 2;
  const accumulatorBytes = 4;
  const tensorBytes = n * d * elementBytes;
  const standardTrafficBytes = 4 * tensorBytes + 4 * n * n * accumulatorBytes;
  const standardMaterializedBytes = 2 * n * n * accumulatorBytes;

  const qBytes = profile.qTile * d * elementBytes;
  const kvBytes = profile.kvTile * d * elementBytes;
  const scoreBytes = profile.qTile * profile.kvTile * accumulatorBytes;
  const outputBytes = profile.qTile * d * accumulatorBytes;
  const statsBytes = profile.qTile * 2 * accumulatorBytes;
  const bufferFactor = config.version === 'v3' || config.version === 'v4' ? 2 : 1;
  const onChipLiveBytes = qBytes + bufferFactor * 2 * kvBytes + scoreBytes + outputBytes + statsBytes;

  const v1PerPair = qBytes + 2 * profile.qTile * d * elementBytes + 4 * profile.qTile * accumulatorBytes;
  const v1TrafficBytes = 2 * tensorBytes + grid.activePairs * v1PerPair;
  const streamTrafficBytes = grid.qTiles * (qBytes + profile.qTile * d * elementBytes)
    + grid.activePairs * 2 * kvBytes
    + grid.qTiles * profile.qTile * accumulatorBytes;
  const flashTrafficBytes = config.version === 'v1' ? v1TrafficBytes : streamTrafficBytes;

  return {
    elementBytes,
    accumulatorBytes,
    tensorBytes,
    standardTrafficBytes,
    standardMaterializedBytes,
    flashTrafficBytes,
    materializedBytes: config.modelType === 'standard' ? standardMaterializedBytes : 0,
    onChipLiveBytes,
    qBytes,
    kvBytes,
    scoreBytes,
    outputBytes,
    statsBytes,
  };
}

export function getPipeline(configInput) {
  const config = normalizeFlashConfig(configInput);
  const key = config.modelType === 'standard' ? 'standard' : config.version;
  const pipeline = PIPELINES[key][config.direction];
  return {
    lanes: [...pipeline.lanes],
    operations: pipeline.operations.map(([id, lane, start, duration], index) => ({ id, lane, start, duration, index })),
    horizon: Math.max(...pipeline.operations.map(([, , start, duration]) => start + duration)),
  };
}

export function getFlashOnChipStages(configInput) {
  const config = normalizeFlashConfig({ ...configInput, modelType: 'flash' });
  const pipeline = getPipeline(config);
  const operationIndex = new Map(pipeline.operations.map((operation) => [operation.id, operation.index]));
  return ON_CHIP_STAGE_SPECS[config.version][config.direction].map(([id, visual, operationIds], index) => ({
    id,
    visual,
    operationIds: [...operationIds],
    index,
    firstOperationIndex: Math.min(...operationIds.map((operationId) => operationIndex.get(operationId))),
    lastOperationIndex: Math.max(...operationIds.map((operationId) => operationIndex.get(operationId))),
  }));
}

function getFlashForwardHbmState(config, pipeline, operation, phase, visualStage) {
  const operationId = operation?.id;
  const readQ = ['loadQState', 'assignQ', 'splitQQK', 'wgmmaQK0', 'wgmmaQK1', 'ummaQKH', 'ummaQKL'].includes(operationId);
  const readK = ['loadKV', 'tmaKV0', 'tmaKV1', 'qk', 'splitQQK', 'wgmmaQK0', 'wgmmaQK1', 'ummaQKH', 'ummaQKL'].includes(operationId);
  const readV = ['loadKV', 'tmaKV0', 'tmaKV1', 'pv', 'splitQPV', 'wgmmaPV0', 'ummaPVH', 'ummaPVL'].includes(operationId);
  const commitIds = ['writeState', 'writeOLSE', 'commitO', 'correctL'];
  const isCommit = commitIds.includes(operationId);
  const isProducingOutput = ['output', 'softmax', 'high', 'low', 'correction'].includes(visualStage);
  const ready = { status: 'ready', fill: 1, access: 'idle' };
  const reading = { status: 'reading', fill: 1, access: 'read' };
  const pending = { status: 'pending', fill: 0, access: 'idle' };
  const producing = { status: 'producing', fill: 0.45, access: 'compute' };
  const writing = { status: 'writing', fill: 0.72, access: 'write' };
  const complete = phase === 'done';
  return {
    Q: readQ ? reading : ready,
    K: readK ? reading : ready,
    V: readV ? reading : ready,
    O: complete ? ready : isCommit ? writing : isProducingOutput ? producing : pending,
    LSE: complete ? ready : isCommit ? writing : ['softmax', 'high', 'low', 'correction'].includes(visualStage) ? producing : pending,
    quadraticWorkspaceBytes: 0,
  };
}

function getBackwardHbmState(config, pipeline, operation, phase, visualStage) {
  const operationId = operation?.id;
  const isStandard = config.modelType === 'standard';
  const ready = { status: 'ready', fill: 1, access: 'idle' };
  const reading = { status: 'reading', fill: 1, access: 'read' };
  const pending = { status: 'pending', fill: 0, access: 'idle' };
  const producing = { status: 'producing', fill: 0.45, access: 'compute' };
  const writing = { status: 'writing', fill: 0.72, access: 'write' };
  const complete = phase === 'done';

  if (isStandard) {
    const readState = (ids) => ids.includes(operationId) ? reading : ready;
    const gradientState = (producerId) => {
      const producerIndex = pipeline.operations.findIndex((candidate) => candidate.id === producerId);
      if (complete) return ready;
      if (operationId === 'writeGrads') return writing;
      if (operationId === producerId) return producing;
      if ((operation?.index ?? -1) > producerIndex) return { status: 'buffered', fill: 0, access: 'idle' };
      return pending;
    };
    return {
      Q: readState(['loadSaved', 'dk']),
      K: readState(['loadSaved', 'dq']),
      V: readState(['loadSaved', 'dp']),
      O: ready,
      dO: readState(['loadSaved', 'dv', 'dp']),
      LSE: null,
      S: ready,
      P: readState(['loadSaved', 'dv', 'softmaxBwd']),
      dQ: gradientState('dq'),
      dK: gradientState('dk'),
      dV: gradientState('dv'),
      quadraticWorkspaceBytes: estimateForwardResources(config).standardMaterializedBytes,
    };
  }

  const loadIds = isStandard ? ['loadSaved'] : ['loadBackward', 'tmaBackward', 'recomputeTranspose'];
  const recomputeIds = isStandard ? [] : ['recomputeS', 'recomputeP', 'recomputeWgmma', 'recomputeSoftmax', 'storeTmem', 'softmaxTile'];
  const readsBackwardInputs = loadIds.includes(operationId) || recomputeIds.includes(operationId) || ['tiles', 'score', 'state'].includes(visualStage);
  const commitIds = isStandard ? ['writeGrads'] : ['atomicGrad', 'atomicDQ', 'writeGrad', 'commitGrad', 'reduceGrad'];
  const isCommit = commitIds.includes(operationId);
  const gradientIds = isStandard ? ['dv', 'dq', 'dk'] : ['dvdk', 'dq', 'gradMma', 'gradWgmma0', 'gradWgmma1', 'gradPrevious', 'twoCtaMma'];
  const isProducingGradient = gradientIds.includes(operationId) || visualStage === 'gradient' || visualStage === 'cluster';
  const gradientState = complete ? ready : isCommit ? writing : isProducingGradient ? producing : pending;
  const inputState = readsBackwardInputs ? reading : ready;

  return {
    Q: inputState,
    K: inputState,
    V: inputState,
    O: inputState,
    dO: inputState,
    LSE: isStandard ? null : inputState,
    S: isStandard ? ready : null,
    P: isStandard ? inputState : null,
    dQ: gradientState,
    dK: gradientState,
    dV: gradientState,
    quadraticWorkspaceBytes: isStandard ? estimateForwardResources(config).standardMaterializedBytes : 0,
  };
}

function getOperationPosition(pipeline, operationId) {
  return pipeline.operations.findIndex((operation) => operation.id === operationId);
}

function getHbmObjectState({ pipeline, operation, phase, producerId, writeId, readId }) {
  const currentIndex = phase === 'done' ? pipeline.operations.length : (operation?.index ?? -1);
  const producerIndex = getOperationPosition(pipeline, producerId);
  const writeIndex = getOperationPosition(pipeline, writeId);
  const readIndex = readId ? getOperationPosition(pipeline, readId) : -1;

  if (phase === 'done') return { status: 'ready', fill: 1, access: 'idle' };
  if (readId && operation?.id === readId) return { status: 'reading', fill: 1, access: 'read' };
  if (operation?.id === writeId) return { status: 'writing', fill: 0.68, access: 'write' };
  if (operation?.id === producerId) return { status: 'producing', fill: 0, access: 'compute' };
  if (currentIndex > writeIndex) {
    return {
      status: readIndex >= 0 && currentIndex > readIndex ? 'consumed' : 'ready',
      fill: 1,
      access: 'idle',
    };
  }
  if (currentIndex > producerIndex) return { status: 'buffered', fill: 0, access: 'idle' };
  return { status: 'pending', fill: 0, access: 'idle' };
}

export function getStandardForwardHbmState(configInput, lifecycle = {}) {
  const config = normalizeFlashConfig({ ...configInput, modelType: 'standard', direction: 'forward' });
  const pipeline = getPipeline(config);
  const maxStep = pipeline.operations.length;
  const phase = ['idle', 'running', 'done'].includes(lifecycle.phase) ? lifecycle.phase : 'idle';
  const requestedStep = Number.isFinite(lifecycle.step) ? lifecycle.step : 0;
  const step = Math.max(0, Math.min(requestedStep, maxStep));
  const operation = phase === 'idle' || phase === 'done' || step === 0
    ? null
    : pipeline.operations[Math.min(step - 1, maxStep - 1)];

  return {
    S: getHbmObjectState({ pipeline, operation, phase, producerId: 'qk', writeId: 'writeS', readId: 'readS' }),
    P: getHbmObjectState({ pipeline, operation, phase, producerId: 'softmax', writeId: 'writeP', readId: 'readP' }),
    O: getHbmObjectState({ pipeline, operation, phase, producerId: 'pv', writeId: 'writeO' }),
  };
}

function getRepresentativeTile(config, operationIndex) {
  const profile = getVersionProfile(config.version);
  const qIndex = Math.floor(operationIndex / 3) % 3;
  const kvIndex = operationIndex % 3;
  return {
    qIndex,
    kvIndex,
    mask: getMaskKind(qIndex, kvIndex, profile.qTile, profile.kvTile, config.causal),
    qRange: [qIndex * profile.qTile, Math.min((qIndex + 1) * profile.qTile, config.sequenceLength)],
    kvRange: [kvIndex * profile.kvTile, Math.min((kvIndex + 1) * profile.kvTile, config.sequenceLength)],
  };
}

export function deriveFlashSnapshot(configInput, lifecycle = {}) {
  const config = normalizeFlashConfig(configInput);
  const profile = getVersionProfile(config.version);
  const grid = getTileGrid(config);
  const resources = estimateForwardResources(config);
  const pipeline = getPipeline(config);
  const maxStep = pipeline.operations.length;
  const phase = ['idle', 'running', 'done'].includes(lifecycle.phase) ? lifecycle.phase : 'idle';
  const requestedStep = Number.isFinite(lifecycle.step) ? lifecycle.step : 0;
  const step = Math.max(0, Math.min(requestedStep, maxStep));
  const operation = phase === 'idle' || phase === 'done' || step === 0 ? null : pipeline.operations[Math.min(step - 1, maxStep - 1)];
  const tile = getRepresentativeTile(config, operation?.index ?? 0);
  const displayTiles = {
    count: 4,
    q: tile.qIndex % 4,
    kv: tile.kvIndex % 4,
    active: Boolean(operation),
  };
  const completion = phase === 'done' ? 1 : step / maxStep;
  const selectedTrafficBytes = config.modelType === 'standard' ? resources.standardTrafficBytes : resources.flashTrafficBytes;
  const standardHbm = config.modelType === 'standard' && config.direction === 'forward'
    ? getStandardForwardHbmState(config, { phase, step })
    : null;
  const onChipStages = config.modelType === 'flash' ? getFlashOnChipStages(config) : [];
  const visualStageObject = onChipStages.find((stage) => stage.operationIds.includes(operation?.id));
  const visualStage = phase === 'done' ? 'done' : phase === 'idle' ? 'idle' : (visualStageObject?.visual ?? 'idle');
  const flashHbm = config.modelType === 'flash' && config.direction === 'forward'
    ? getFlashForwardHbmState(config, pipeline, operation, phase, visualStage)
    : null;
  const backwardHbm = config.direction === 'backward'
    ? getBackwardHbmState(config, pipeline, operation, phase, visualStage)
    : null;
  return {
    config,
    profile,
    grid,
    resources,
    pipeline,
    phase,
    step,
    maxStep,
    operation,
    tile,
    displayTiles,
    completion,
    currentTrafficBytes: selectedTrafficBytes * completion,
    selectedTrafficBytes,
    standardHbm,
    flashHbm,
    backwardHbm,
    onChipStages,
    visualStage,
    fullMatrixMaterialized: config.modelType === 'standard',
    flashExact: config.modelType === 'flash',
    mmaPerTile: config.direction === 'forward' ? 2 : (config.modelType === 'standard' ? 4 : 5),
  };
}

export function intervalsOverlap(a, b) {
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}
