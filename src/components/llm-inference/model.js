export const TOTAL_LAYERS = 32;
export const EXPERT_COUNT = 8;

export const MODULE = {
  idle: 0,
  embedding: 1,
  attention: 2,
  ffn: 3,
  lmHead: 5,
  tokenDone: 6,
};

const stageOrder = {
  embedding: MODULE.embedding,
  attention: MODULE.attention,
  ffn: MODULE.ffn,
  lmHead: MODULE.lmHead,
};

export const getStageStatus = (stage, activeModule) => {
  if (activeModule === MODULE.idle) return 'pending';
  const order = stageOrder[stage];
  if (activeModule === order) return 'active';
  return activeModule > order ? 'passed' : 'pending';
};

const round = (value) => Math.round(value * 100) / 100;

const deterministicValue = (seed, row, col) => {
  const raw = Math.sin((seed + 1) * 1.73 + row * 2.11 + col * 0.97);
  return round(raw);
};

const makeValues = (seed, rows, cols) => Array.from(
  { length: rows },
  (_, row) => Array.from({ length: cols }, (_, col) => deterministicValue(seed, row, col)),
);

const softmax = (values) => {
  const finite = values.filter(Number.isFinite);
  const max = Math.max(...finite);
  const exps = values.map((value) => Number.isFinite(value) ? Math.exp(value - max) : 0);
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => round(value / sum));
};

const normalizeWeights = (values) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => total > 0 ? value / total : 0);
};

export const deriveSamplingDistribution = ({ candidates, temperature, topK, topP }) => {
  if (!candidates?.length) return null;

  const normalizedTemperature = Math.min(0.9, Math.max(0.1, Number(temperature) || 0.7));
  const normalizedTopK = Math.min(candidates.length, Math.max(1, Math.round(Number(topK) || 1)));
  const normalizedTopP = Math.min(1, Math.max(0.1, Number(topP) || 0.9));
  const temperatureProbabilities = normalizeWeights(
    candidates.map((candidate) => Math.pow(Math.max(candidate.p, Number.EPSILON), 1 / normalizedTemperature)),
  );
  const ranked = candidates
    .map((candidate, index) => ({ ...candidate, sourceIndex: index, temperatureProbability: temperatureProbabilities[index] }))
    .sort((a, b) => b.temperatureProbability - a.temperatureProbability);
  const topKMass = ranked.slice(0, normalizedTopK).reduce((sum, candidate) => sum + candidate.temperatureProbability, 0);
  let cumulative = 0;
  let keptCount = 0;
  const withCutoffs = ranked.map((candidate, rank) => {
    const topKProbability = rank < normalizedTopK ? candidate.temperatureProbability / topKMass : 0;
    const accepted = rank < normalizedTopK && cumulative < normalizedTopP;
    if (rank < normalizedTopK) cumulative += topKProbability;
    if (accepted) {
      keptCount += 1;
    }
    return {
      ...candidate,
      rank,
      topKProbability,
      cumulativeProbability: rank < normalizedTopK ? Math.min(1, cumulative) : 1,
      accepted,
    };
  });
  const acceptedMass = withCutoffs.reduce(
    (sum, candidate) => sum + (candidate.accepted ? candidate.temperatureProbability : 0),
    0,
  );

  return {
    temperature: normalizedTemperature,
    topK: normalizedTopK,
    topP: normalizedTopP,
    keptCount,
    totalCount: candidates.length,
    candidates: withCutoffs.map((candidate) => ({
      ...candidate,
      finalProbability: candidate.accepted ? candidate.temperatureProbability / acceptedMass : 0,
    })),
  };
};

const makeAttention = ({ queryRows, keyRows, displayRows, displayCols, isPrefill, seed }) => {
  const scores = makeValues(seed, displayRows, displayCols);
  const mask = scores.map((row, rowIndex) => row.map((_, colIndex) => (
    isPrefill && colIndex > rowIndex
  )));
  const probabilities = scores.map((row, rowIndex) => softmax(
    row.map((value, colIndex) => mask[rowIndex][colIndex] ? Number.NEGATIVE_INFINITY : value),
  ));

  return {
    queryRows,
    keyRows,
    displayRows,
    displayCols,
    scores,
    probabilities,
    mask,
  };
};

const makeRoutes = ({ rows, expertCount, seed }) => Array.from({ length: rows }, (_, row) => {
  const first = (seed + row * 3 + 2) % expertCount;
  let second = (seed + row * 5 + 5) % expertCount;
  if (second === first) second = (second + 1) % expertCount;
  const firstWeight = round(0.58 + ((row + seed) % 4) * 0.07);
  return {
    row,
    topK: [first, second],
    weights: [firstWeight, round(1 - firstWeight)],
  };
});

const getLayerCacheTokens = ({
  phase,
  activeModule,
  currentLayer,
  layer,
  promptLength,
  step,
}) => {
  if (phase === 'idle') return 0;
  const isPrefill = phase === 'prefill';
  const baseTokens = isPrefill ? 0 : promptLength + Math.max(0, step - 1);
  const targetTokens = isPrefill ? promptLength : baseTokens + 1;
  if (activeModule >= MODULE.lmHead) return targetTokens;
  if (layer < currentLayer) return targetTokens;
  if (layer === currentLayer && activeModule >= MODULE.attention) return targetTokens;
  return baseTokens;
};

export const deriveInferenceTensorSnapshot = ({
  phase,
  activeModule,
  currentLayer,
  step,
  promptLength,
  modelType,
  totalLayers = TOTAL_LAYERS,
  expertCount = EXPERT_COUNT,
}) => {
  const isPrefill = phase === 'idle' || phase === 'prefill';
  const sequenceRows = isPrefill ? promptLength : 1;
  const keyRows = isPrefill ? promptLength : promptLength + step;
  const displaySequenceRows = Math.max(1, Math.min(sequenceRows, 6));
  const displayKeyRows = Math.max(1, Math.min(keyRows, 8));
  const layerCacheTokens = Array.from({ length: totalLayers }, (_, index) => getLayerCacheTokens({
    phase,
    activeModule,
    currentLayer,
    layer: index + 1,
    promptLength,
    step,
  }));
  const cacheTargetTokens = isPrefill ? promptLength : promptLength + step;
  const currentLayerCacheTokens = layerCacheTokens[currentLayer - 1] ?? 0;
  const completedLayerCount = layerCacheTokens.filter((count) => count === cacheTargetTokens).length;
  const stageStatus = {
    embedding: getStageStatus('embedding', activeModule),
    attention: getStageStatus('attention', activeModule),
    ffn: getStageStatus('ffn', activeModule),
    lmHead: getStageStatus('lmHead', activeModule),
  };
  const seed = currentLayer * 7 + step * 11 + (isPrefill ? 3 : 19);
  const attention = makeAttention({
    queryRows: sequenceRows,
    keyRows,
    displayRows: displaySequenceRows,
    displayCols: displayKeyRows,
    isPrefill,
    seed,
  });
  const routes = makeRoutes({ rows: displaySequenceRows, expertCount, seed: step + currentLayer });
  const expertLoads = Array.from({ length: expertCount }, (_, expert) => routes.reduce(
    (count, route) => count + (route.topK.includes(expert) ? 1 : 0),
    0,
  ));

  return {
    phase,
    modelType,
    isPrefill,
    isLayerStage: activeModule === MODULE.attention || activeModule === MODULE.ffn,
    positionFormula: isPrefill
      ? String.raw`p=0,\ldots,${promptLength - 1}`
      : String.raw`p=${promptLength + Math.max(0, step - 1)}`,
    sequenceRows,
    keyRows,
    displaySequenceRows,
    displayKeyRows,
    stageStatus,
    layerProgress: `${currentLayer} / ${totalLayers}`,
    currentLayer,
    totalLayers,
    cache: {
      layerTokens: layerCacheTokens,
      currentLayerTokens: currentLayerCacheTokens,
      targetTokens: cacheTargetTokens,
      completedLayerCount,
      writeActive: activeModule === MODULE.attention,
      writeIndex: Math.max(0, cacheTargetTokens - 1),
    },
    tensors: {
      embeddingTable: makeValues(seed + 1, 4, 4),
      residual: makeValues(seed + 2, displaySequenceRows, 4),
      q: makeValues(seed + 3, displaySequenceRows, 4),
      k: makeValues(seed + 4, displaySequenceRows, 4),
      v: makeValues(seed + 5, displaySequenceRows, 4),
      attentionOutput: makeValues(seed + 6, displaySequenceRows, 4),
      ffnHidden: makeValues(seed + 7, displaySequenceRows, 6),
      ffnOutput: makeValues(seed + 8, displaySequenceRows, 4),
      lastHidden: makeValues(seed + 9, 1, 4),
      vocabWeight: makeValues(seed + 10, 4, 6),
      logits: makeValues(seed + 11, 1, 6),
      ffnUpWeight: makeValues(seed + 12, 4, 6),
      ffnDownWeight: makeValues(seed + 13, 6, 4),
      routerWeight: makeValues(seed + 14, 4, expertCount),
      expertUpWeight: makeValues(seed + 15 + routes[0].topK[0], 4, 6),
      expertDownWeight: makeValues(seed + 23 + routes[0].topK[0], 6, 4),
    },
    attention,
    moe: {
      expertCount,
      selectedExpert: routes[0].topK[0],
      routes,
      expertLoads,
      routerValues: routes.map((route) => Array.from({ length: expertCount }, (_, expert) => {
        const selectedIndex = route.topK.indexOf(expert);
        return selectedIndex >= 0 ? route.weights[selectedIndex] : round(0.01 + ((expert + route.row) % 3) * 0.01);
      })),
    },
    lmHead: {
      inputRows: 1,
      logitsRows: 1,
    },
  };
};
