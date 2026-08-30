const ALGORITHMS = new Set(['eagle2', 'dspark']);
const SCENARIOS = new Set(['representative', 'lowAcceptance']);
const RACE_MAX_STEP = 12;
const RACE_TIME_BUDGET = 6;
const OUTPUT_STREAM = ['predict', 'the', 'future', 'of', 'language', 'with', 'speculative', 'decoding', 'while', 'preserving', 'the', 'target', 'distribution', 'exactly', 'at', 'every', 'accepted', 'position'];

const EAGLE_TREE = [
  { id: 'e0', token: 'predict', level: 0, column: 3.5, parent: null, confidence: 0.92 },
  { id: 'e1', token: 'the', level: 1, column: 1.7, parent: 'e0', confidence: 0.86 },
  { id: 'e2', token: 'generate', level: 1, column: 5.3, parent: 'e0', confidence: 0.42 },
  { id: 'e3', token: 'future', level: 2, column: 0.7, parent: 'e1', confidence: 0.78 },
  { id: 'e4', token: 'next', level: 2, column: 2.7, parent: 'e1', confidence: 0.55 },
  { id: 'e5', token: 'of', level: 3, column: 0.1, parent: 'e3', confidence: 0.73 },
  { id: 'e6', token: 'language', level: 3, column: 1.4, parent: 'e3', confidence: 0.28 },
  { id: 'e7', token: 'tokens', level: 2, column: 5.3, parent: 'e2', confidence: 0.61 },
  { id: 'e8', token: 'faster', level: 3, column: 4.5, parent: 'e7', confidence: 0.44 },
  { id: 'e9', token: 'well', level: 3, column: 6.2, parent: 'e7', confidence: 0.31 },
];

const DSPARK_BLOCK = [
  { id: 'd0', token: 'the', baseToken: 'the', confidence: 0.91 },
  { id: 'd1', token: 'future', baseToken: 'next?', confidence: 0.82 },
  { id: 'd2', token: 'tokens', baseToken: 'words?', confidence: 0.55 },
  { id: 'd3', token: 'faster', baseToken: 'quickly?', confidence: 0.31 },
];

const ALGORITHM_CONFIG = {
  eagle2: {
    operations: [
      { type: 'featureDraft', stageKey: 'stageFeatureDraft' },
      { type: 'expandTree', stageKey: 'stageExpandTree' },
      { type: 'rerankTree', stageKey: 'stageRerankTree' },
      { type: 'flattenMask', stageKey: 'stageFlattenMask' },
      { type: 'targetVerify', stageKey: 'stageTargetVerifyTree' },
      { type: 'commitKv', stageKey: 'stageCommitTree' },
    ],
    draftCost: 0.52,
    runtimeCost: 0.12,
    draftArchitectureKey: 'eagleDraftArchitecture',
    topologyKey: 'eagleTopology',
    schedulingKey: 'eagleScheduling',
    tradeoffKey: 'eagleTradeoff',
    codeKeys: ['codeEagle1', 'codeEagle2', 'codeEagle3', 'codeEagle4', 'codeEagle5', 'codeEagle6'],
  },
  dspark: {
    operations: [
      { type: 'parallelBackbone', stageKey: 'stageParallelBackbone' },
      { type: 'sequentialMarkov', stageKey: 'stageSequentialMarkov' },
      { type: 'confidenceHead', stageKey: 'stageConfidenceHead' },
      { type: 'scheduleVerify', stageKey: 'stageScheduleVerify' },
      { type: 'targetVerify', stageKey: 'stageTargetVerifyBlock' },
      { type: 'commitKv', stageKey: 'stageCommitBlock' },
    ],
    draftCost: 0.32,
    runtimeCost: 0.09,
    draftArchitectureKey: 'dsparkDraftArchitecture',
    topologyKey: 'dsparkTopology',
    schedulingKey: 'dsparkScheduling',
    tradeoffKey: 'dsparkTradeoff',
    codeKeys: ['codeDspark1', 'codeDspark2', 'codeDspark3', 'codeDspark4', 'codeDspark5', 'codeDspark6'],
  },
};

const TARGET_WEIGHT_GROUPS = [
  { id: 'embedding', labelKey: 'weightEmbedding', formula: String.raw`E_T`, shape: String.raw`V\times d`, aspect: 'tall', kind: 'target' },
  {
    id: 'decoderStack', labelKey: 'weightDecoderStack', formula: String.raw`L_T`, kind: 'target',
    matrices: [
      { id: 'q', labelKey: 'matrixQuery', formula: String.raw`W_Q`, shape: String.raw`d\times(H_qd_h)`, aspect: 'square' },
      { id: 'kv', labelKey: 'matrixKeyValue', formula: String.raw`W_K,W_V`, shape: String.raw`d\times(H_{kv}d_h)`, aspect: 'narrow' },
      { id: 'o', labelKey: 'matrixOutput', formula: String.raw`W_O`, shape: String.raw`(H_qd_h)\times d`, aspect: 'square' },
      { id: 'gateUp', labelKey: 'matrixGateUp', formula: String.raw`W_{\mathrm{gate}},W_{\mathrm{up}}`, shape: String.raw`d\times d_{ff}`, aspect: 'wide' },
      { id: 'down', labelKey: 'matrixDown', formula: String.raw`W_{\mathrm{down}}`, shape: String.raw`d_{ff}\times d`, aspect: 'tall' },
    ],
  },
  { id: 'finalNorm', labelKey: 'weightFinalNorm', formula: String.raw`\gamma_{\mathrm{norm}}`, shape: String.raw`d`, aspect: 'vector', kind: 'target' },
  { id: 'lmHead', labelKey: 'weightLmHead', formula: String.raw`W_{\mathrm{vocab}}`, shape: String.raw`d\times V`, aspect: 'wide', kind: 'target' },
];

const DRAFT_WEIGHT_GROUPS = {
  eagle2: [
    { id: 'fusionProjection', labelKey: 'weightFusionProjection', formula: String.raw`W_{\mathrm{fuse}}`, shape: String.raw`(2d)\times d`, aspect: 'wide', kind: 'draft' },
    {
      id: 'draftDecoder', labelKey: 'weightEagleDecoder', formula: String.raw`L_D=1`, kind: 'draft',
      matrices: [
        { id: 'draftQkv', labelKey: 'matrixDraftQkv', formula: String.raw`W_{QKV}^{D}`, shape: String.raw`d\times3d`, aspect: 'wide' },
        { id: 'draftO', labelKey: 'matrixOutput', formula: String.raw`W_O^{D}`, shape: String.raw`d\times d`, aspect: 'square' },
        { id: 'draftUp', labelKey: 'matrixGateUp', formula: String.raw`W_{\mathrm{gate}}^{D},W_{\mathrm{up}}^{D}`, shape: String.raw`d\times d_{ff}^{D}`, aspect: 'wide' },
        { id: 'draftDown', labelKey: 'matrixDown', formula: String.raw`W_{\mathrm{down}}^{D}`, shape: String.raw`d_{ff}^{D}\times d`, aspect: 'tall' },
      ],
    },
  ],
  dspark: [
    { id: 'featureProjection', labelKey: 'weightFeatureProjection', formula: String.raw`W_{\mathrm{proj}}`, shape: String.raw`(Md)\times d`, aspect: 'wide', kind: 'draft' },
    {
      id: 'parallelBackbone', labelKey: 'weightParallelBackbone', formula: String.raw`L_D`, kind: 'draft',
      matrices: [
        { id: 'parallelQkv', labelKey: 'matrixDraftQkv', formula: String.raw`W_{QKV}^{D}`, shape: String.raw`d\times3d`, aspect: 'wide' },
        { id: 'parallelO', labelKey: 'matrixOutput', formula: String.raw`W_O^{D}`, shape: String.raw`d\times d`, aspect: 'square' },
        { id: 'parallelUp', labelKey: 'matrixGateUp', formula: String.raw`W_{\mathrm{gate}}^{D},W_{\mathrm{up}}^{D}`, shape: String.raw`d\times d_{ff}^{D}`, aspect: 'wide' },
        { id: 'parallelDown', labelKey: 'matrixDown', formula: String.raw`W_{\mathrm{down}}^{D}`, shape: String.raw`d_{ff}^{D}\times d`, aspect: 'tall' },
      ],
    },
    {
      id: 'markovHead', labelKey: 'weightMarkovHead', formula: String.raw`B=W_1W_2`, kind: 'draft',
      matrices: [
        { id: 'markovIn', labelKey: 'matrixMarkovIn', formula: String.raw`W_1`, shape: String.raw`V\times r`, aspect: 'tall' },
        { id: 'markovOut', labelKey: 'matrixMarkovOut', formula: String.raw`W_2`, shape: String.raw`r\times V`, aspect: 'wide' },
      ],
    },
    { id: 'confidenceHead', labelKey: 'weightConfidenceHead', formula: String.raw`w_c`, shape: String.raw`(d+r)\times1`, aspect: 'vector', kind: 'draft' },
  ],
};

const clampStep = (value) => Math.max(0, Math.round(Number(value) || 0));

export function normalizeSpeculativeInput(input = {}) {
  return {
    algorithm: ALGORITHMS.has(input.algorithm) ? input.algorithm : 'eagle2',
    scenario: SCENARIOS.has(input.scenario) ? input.scenario : 'representative',
    phase: ['idle', 'running', 'done'].includes(input.phase) ? input.phase : 'idle',
    step: clampStep(input.step),
    raceStep: Math.min(clampStep(input.raceStep), RACE_MAX_STEP),
  };
}

function deriveRaceModel({ committedTokens, draftCost, speculativeCost, verifyCost, raceStep }) {
  const elapsed = RACE_TIME_BUDGET * raceStep / RACE_MAX_STEP;
  const baselineCompleted = Math.min(OUTPUT_STREAM.length, Math.floor(elapsed + 1e-6));
  const baselineActivePass = raceStep > 0 && raceStep < RACE_MAX_STEP
    ? baselineCompleted
    : null;
  const completedCycles = Math.floor((elapsed + 1e-6) / speculativeCost);
  const speculativeCommitted = Math.min(OUTPUT_STREAM.length, completedCycles * committedTokens.length);
  const cycleElapsed = elapsed - completedCycles * speculativeCost;
  const cycleProgress = cycleElapsed / speculativeCost;

  let speculativeStage = 'pending';
  if (raceStep === RACE_MAX_STEP) speculativeStage = 'budgetReached';
  else if (raceStep > 0 && cycleElapsed < draftCost) speculativeStage = 'drafting';
  else if (cycleElapsed >= draftCost && cycleElapsed < draftCost + verifyCost) speculativeStage = 'verifying';
  else if (cycleElapsed >= draftCost + verifyCost) speculativeStage = 'committing';

  const cycles = Array.from({ length: Math.ceil(RACE_TIME_BUDGET / speculativeCost) }, (_, index) => {
    const start = index * speculativeCost;
    const end = Math.min(RACE_TIME_BUDGET, start + speculativeCost);
    return {
      index,
      start,
      end,
      draftEnd: Math.min(end, start + draftCost),
      verifyEnd: Math.min(end, start + draftCost + verifyCost),
      completed: elapsed + 1e-6 >= start + speculativeCost,
      active: raceStep > 0 && raceStep < RACE_MAX_STEP && elapsed >= start && elapsed < start + speculativeCost,
    };
  });

  return {
    step: raceStep,
    maxStep: RACE_MAX_STEP,
    elapsed,
    progress: raceStep / RACE_MAX_STEP,
    timeBudget: RACE_TIME_BUDGET,
    baselineCompleted,
    baselineActivePass,
    speculativeCommitted,
    speculativeStage,
    completedCycles,
    activeCycle: raceStep > 0 && raceStep < RACE_MAX_STEP ? completedCycles : null,
    cycleProgress,
    cycles,
    baselineTokens: OUTPUT_STREAM.slice(0, baselineCompleted),
    speculativeTokens: OUTPUT_STREAM.slice(0, speculativeCommitted),
    lead: speculativeCommitted - baselineCompleted,
    isDone: raceStep === RACE_MAX_STEP,
  };
}

function getStageStatus(index, operationIndex, phase) {
  if (phase === 'idle') return 'pending';
  if (phase === 'done') return 'done';
  if (index < operationIndex) return 'passed';
  if (index === operationIndex) return 'active';
  return 'pending';
}

function deriveArchitectureModel({ algorithm, phase, activeOperation }) {
  const activeType = activeOperation?.type;
  const draftOperationTypes = algorithm === 'eagle2'
    ? new Set(['featureDraft', 'expandTree', 'rerankTree', 'flattenMask'])
    : new Set(['parallelBackbone', 'sequentialMarkov', 'confidenceHead', 'scheduleVerify']);
  const draftActive = draftOperationTypes.has(activeType);
  const verifyActive = activeType === 'targetVerify';
  const commitActive = activeType === 'commitKv';
  const terminal = phase === 'done';

  const runtimeStages = [
    { id: 'prefill', labelKey: 'runtimePrefill', hintKey: 'runtimePrefillHint', owner: 'target', status: terminal ? 'done' : 'passed' },
    { id: 'seed', labelKey: 'runtimeSeed', hintKey: algorithm === 'eagle2' ? 'runtimeSeedEagleHint' : 'runtimeSeedDsparkHint', owner: 'target', status: terminal ? 'done' : 'passed' },
    { id: 'draft', labelKey: 'runtimeDraft', hintKey: algorithm === 'eagle2' ? 'runtimeDraftEagleHint' : 'runtimeDraftDsparkHint', owner: 'draft', status: terminal ? 'done' : draftActive ? 'active' : verifyActive || commitActive ? 'passed' : 'pending' },
    { id: 'verify', labelKey: 'runtimeVerify', hintKey: 'runtimeVerifyHint', owner: 'target', status: terminal ? 'done' : verifyActive ? 'active' : commitActive ? 'passed' : 'pending' },
    { id: 'commit', labelKey: 'runtimeCommit', hintKey: 'runtimeCommitHint', owner: 'runtime', status: terminal ? 'done' : commitActive ? 'active' : 'pending' },
  ];

  return {
    targetWeights: TARGET_WEIGHT_GROUPS.map((group) => ({ ...group, active: verifyActive })),
    sharedWeights: [
      { id: 'sharedEmbedding', labelKey: 'weightEmbedding', formula: String.raw`E_T`, shape: String.raw`V\times d`, aspect: 'tall', kind: 'shared', active: draftActive },
      { id: 'sharedLmHead', labelKey: 'weightLmHead', formula: String.raw`W_{\mathrm{vocab}}`, shape: String.raw`d\times V`, aspect: 'wide', kind: 'shared', active: draftActive },
    ],
    activationTap: {
      id: 'targetFeatureTap',
      labelKey: algorithm === 'eagle2' ? 'activationEagleFeature' : 'activationDsparkFeature',
      formula: algorithm === 'eagle2' ? String.raw`h_t^T` : String.raw`\{h_t^{T,(\ell)}\}`,
      shape: algorithm === 'eagle2' ? String.raw`B\times L\times d` : String.raw`B\times L\times(Md)`,
      kind: 'activation',
      active: draftActive,
    },
    draftWeights: DRAFT_WEIGHT_GROUPS[algorithm].map((group) => ({ ...group, active: draftActive })),
    controller: {
      id: 'runtimeController',
      labelKey: algorithm === 'eagle2' ? 'controllerEagle' : 'controllerDspark',
      kind: 'runtime',
      active: algorithm === 'eagle2'
        ? ['expandTree', 'rerankTree', 'flattenMask'].includes(activeType)
        : ['confidenceHead', 'scheduleVerify'].includes(activeType),
    },
    checkpointKey: algorithm === 'eagle2' ? 'eagleDraftCheckpoint' : 'dsparkDraftCheckpoint',
    tensorShapes: {
      input: String.raw`B\times L`,
      targetHidden: String.raw`B\times L\times d`,
      targetKv: String.raw`B\times H_{kv}\times L\times d_h`,
      logits: String.raw`B\times L\times V`,
      candidates: algorithm === 'eagle2' ? String.raw`m\ \text{tree nodes}` : String.raw`B\times \gamma`,
    },
    runtimeStages,
    activeOwner: draftActive ? 'draft' : verifyActive ? 'target' : commitActive ? 'runtime' : null,
  };
}

function deriveKvLifecycle({ algorithm, phase, activeOperation, verifiedCount, acceptedDraftCount, correctionToken }) {
  const activeType = activeOperation?.type;
  const reservationType = algorithm === 'eagle2' ? 'flattenMask' : 'scheduleVerify';
  let state = 'prefix';
  if (phase === 'done') state = 'stable';
  else if (activeType === 'commitKv') state = 'committing';
  else if (activeType === 'targetVerify') state = 'verifying';
  else if (activeType === reservationType) state = 'reserved';

  const correctionPending = Boolean(correctionToken) && ['committing', 'stable'].includes(state);
  const statusKeyByState = {
    prefix: 'kvStatePrefix',
    reserved: 'kvStateReserved',
    verifying: 'kvStateVerifying',
    committing: 'kvStateCommitting',
    stable: 'kvStateStable',
  };
  const hintKeyByState = {
    prefix: 'kvHintPrefix',
    reserved: 'kvHintReserved',
    verifying: 'kvHintVerifying',
    committing: correctionPending ? 'kvHintCommittingCorrection' : 'kvHintCommitting',
    stable: correctionPending ? 'kvHintStableCorrection' : 'kvHintStable',
  };

  const slots = Array.from({ length: verifiedCount }, (_, index) => {
    let slotState = 'empty';
    if (state === 'reserved') slotState = 'reserved';
    if (state === 'verifying') slotState = 'temporary';
    if (state === 'committing') slotState = index < acceptedDraftCount ? 'committing' : 'reclaiming';
    if (state === 'stable') slotState = index < acceptedDraftCount ? 'committed' : 'free';
    return { id: `target-kv-${index}`, index, state: slotState };
  });

  return {
    state,
    statusKey: statusKeyByState[state],
    hintKey: hintKeyByState[state],
    prefixPersistent: true,
    slots,
    slotCount: verifiedCount,
    acceptedKvCount: ['committing', 'stable'].includes(state) ? acceptedDraftCount : 0,
    temporaryCount: state === 'verifying' ? verifiedCount : 0,
    reclaimedCount: ['committing', 'stable'].includes(state) ? verifiedCount - acceptedDraftCount : 0,
    correctionPending,
    correctionToken: correctionPending ? correctionToken : null,
    isChanging: ['verifying', 'committing'].includes(state),
  };
}

function getEagleModel(normalized, operationIndex) {
  const acceptedIds = new Set(normalized.scenario === 'representative'
    ? ['e0', 'e1', 'e3', 'e5']
    : ['e0']);
  const treeBuilt = normalized.phase === 'done' || operationIndex >= 1;
  const reranking = normalized.phase === 'running' && operationIndex === 2;
  const flattening = normalized.phase === 'running' && operationIndex === 3;
  const verifying = normalized.phase === 'running' && operationIndex === 4;
  const committed = normalized.phase === 'done' || operationIndex >= 5;

  const valueById = {};
  for (const node of EAGLE_TREE) valueById[node.id] = node.confidence * (node.parent ? valueById[node.parent] : 1);
  const selectedIds = new Set([...EAGLE_TREE]
    .sort((left, right) => valueById[right.id] - valueById[left.id] || left.level - right.level)
    .slice(0, 8)
    .map((node) => node.id));
  const expandParentIds = new Set([...EAGLE_TREE]
    .filter((node) => node.level === 2)
    .sort((left, right) => valueById[right.id] - valueById[left.id])
    .slice(0, 2)
    .map((node) => node.id));

  const candidates = EAGLE_TREE.map((node) => {
    let status = 'pending';
    if (treeBuilt) status = 'proposed';
    if (operationIndex === 1 && expandParentIds.has(node.id)) status = 'expanding';
    if (reranking) status = selectedIds.has(node.id) ? 'reranked' : 'pruned';
    if (flattening) status = selectedIds.has(node.id) ? 'masked' : 'pruned';
    if (verifying) status = selectedIds.has(node.id) ? 'verifying' : 'pruned';
    if (committed) status = acceptedIds.has(node.id) ? 'committed' : selectedIds.has(node.id) ? 'discarded' : 'pruned';
    return { ...node, value: valueById[node.id], accepted: acceptedIds.has(node.id), selected: selectedIds.has(node.id), expandParent: expandParentIds.has(node.id), scheduled: selectedIds.has(node.id), status };
  });

  const acceptedTokens = EAGLE_TREE.filter((node) => acceptedIds.has(node.id)).map((node) => node.token);
  const flattenedCandidates = candidates.filter((node) => node.selected);
  const parentById = Object.fromEntries(EAGLE_TREE.map((node) => [node.id, node.parent]));
  const isAncestorOrSelf = (ancestorId, nodeId) => {
    let cursor = nodeId;
    while (cursor) {
      if (cursor === ancestorId) return true;
      cursor = parentById[cursor];
    }
    return false;
  };
  const attentionMask = flattenedCandidates.map((rowNode) => flattenedCandidates.map((columnNode) => isAncestorOrSelf(columnNode.id, rowNode.id)));
  const correctionToken = normalized.scenario === 'lowAcceptance' ? 'generate' : null;
  return {
    candidates,
    flattenedCandidates,
    attentionMask,
    maskExample: {
      queryToken: 'of',
      visibleTokens: ['predict', 'the', 'future', 'of'],
      blockedTokens: ['generate', 'tokens'],
    },
    edges: EAGLE_TREE.filter((node) => node.parent).map((node) => ({
      from: node.parent,
      to: node.id,
      accepted: acceptedIds.has(node.id) && acceptedIds.has(node.parent),
    })),
    acceptedTokens,
    correctionToken,
    committedTokens: correctionToken ? [...acceptedTokens, correctionToken] : acceptedTokens,
    draftedCount: EAGLE_TREE.length,
    verifiedCount: selectedIds.size,
    acceptedDraftCount: acceptedTokens.length,
    wastedCount: selectedIds.size - acceptedTokens.length,
  };
}

function getDsparkModel(normalized, operationIndex) {
  const verifyBudget = normalized.scenario === 'representative' ? 3 : 2;
  const acceptedDraftCount = normalized.scenario === 'representative' ? 2 : 1;
  const blockReady = normalized.phase === 'done' || operationIndex >= 0;
  const confidenceReady = normalized.phase === 'done' || operationIndex >= 2;
  const schedulingReady = normalized.phase === 'done' || operationIndex >= 3;
  const verifying = normalized.phase === 'running' && operationIndex === 4;
  const committed = normalized.phase === 'done' || operationIndex >= 5;

  let survival = 1;

  const candidates = DSPARK_BLOCK.map((item, index) => {
    survival *= item.confidence;
    const scheduled = index < verifyBudget;
    const accepted = index < acceptedDraftCount;
    let status = blockReady ? 'proposed' : 'pending';
    if (confidenceReady) status = 'conditioned';
    if (schedulingReady && !scheduled) status = 'skipped';
    if (verifying && scheduled) status = 'verifying';
    if (verifying && scheduled) status = accepted ? 'accepted' : 'rejected';
    if (committed) status = accepted ? 'committed' : scheduled ? 'discarded' : 'skipped';
    return { ...item, index, survival, scheduled, accepted, status };
  });

  const acceptedTokens = DSPARK_BLOCK.slice(0, acceptedDraftCount).map((item) => item.token);
  const correctionToken = normalized.scenario === 'representative' ? 'of' : 'next';
  return {
    candidates,
    acceptedTokens,
    correctionToken,
    committedTokens: [...acceptedTokens, correctionToken],
    draftedCount: DSPARK_BLOCK.length,
    verifiedCount: verifyBudget,
    acceptedDraftCount,
    wastedCount: verifyBudget - acceptedDraftCount,
  };
}

export function deriveSpeculativeSnapshot(input = {}) {
  const normalized = normalizeSpeculativeInput(input);
  const config = ALGORITHM_CONFIG[normalized.algorithm];
  const maxStep = config.operations.length;
  const phase = normalized.phase === 'done' || normalized.step >= maxStep ? 'done' : normalized.phase;
  const step = Math.min(normalized.step, Math.max(0, maxStep - 1));
  const operationIndex = phase === 'idle' ? -1 : phase === 'done' ? maxStep : step;
  const activeOperation = phase === 'running' ? config.operations[step] : null;
  const algorithmModel = normalized.algorithm === 'eagle2'
    ? getEagleModel({ ...normalized, phase }, operationIndex)
    : getDsparkModel({ ...normalized, phase }, operationIndex);

  const committedCount = algorithmModel.committedTokens.length;
  const baselineCost = committedCount;
  const verifyCost = 1 + Math.max(0, algorithmModel.verifiedCount - 1) * 0.035;
  const speculativeCost = config.draftCost + verifyCost + config.runtimeCost;
  const speedupEstimate = baselineCost / speculativeCost;
  const stages = config.operations.map((operation, index) => ({
    ...operation,
    index,
    status: getStageStatus(index, operationIndex, phase),
  }));
  const race = deriveRaceModel({
    committedTokens: algorithmModel.committedTokens,
    draftCost: config.draftCost,
    speculativeCost,
    verifyCost,
    raceStep: normalized.raceStep,
  });
  const architecture = deriveArchitectureModel({ algorithm: normalized.algorithm, phase, activeOperation });
  const kvLifecycle = deriveKvLifecycle({
    algorithm: normalized.algorithm,
    phase,
    activeOperation,
    verifiedCount: algorithmModel.verifiedCount,
    acceptedDraftCount: algorithmModel.acceptedDraftCount,
    correctionToken: algorithmModel.correctionToken,
  });

  return {
    ...normalized,
    phase,
    step,
    maxStep,
    operationIndex,
    activeOperation,
    stages,
    ...algorithmModel,
    prefixTokens: ['Large', 'models', 'can'],
    anchorToken: normalized.algorithm === 'dspark' ? 'predict' : null,
    committedCount,
    targetPasses: 1,
    baselineTargetPasses: committedCount,
    targetWeightStreams: 1,
    baselineWeightStreams: committedCount,
    baselineCost,
    draftCost: config.draftCost,
    verifyCost,
    runtimeCost: config.runtimeCost,
    speculativeCost,
    speedupEstimate,
    costScaleMax: Math.max(baselineCost, speculativeCost),
    draftArchitectureKey: config.draftArchitectureKey,
    topologyKey: config.topologyKey,
    schedulingKey: config.schedulingKey,
    tradeoffKey: config.tradeoffKey,
    codeKeys: config.codeKeys,
    hasCorrection: Boolean(algorithmModel.correctionToken),
    race,
    architecture,
    kvLifecycle,
  };
}

export function getNextLifecycle(snapshot) {
  if (snapshot.phase === 'idle' || snapshot.phase === 'done') return { phase: 'running', step: 0 };
  if (snapshot.step + 1 >= snapshot.maxStep) return { phase: 'done', step: snapshot.maxStep };
  return { phase: 'running', step: snapshot.step + 1 };
}

export const SPECULATIVE_ALGORITHMS = [...ALGORITHMS];
export const SPECULATIVE_SCENARIOS = [...SCENARIOS];
export const SPECULATIVE_RACE_MAX_STEP = RACE_MAX_STEP;
