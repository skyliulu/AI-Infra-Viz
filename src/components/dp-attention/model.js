export const RANK_COUNT = 4;

export const DP_ATTENTION_CONFIGS = {
  tp: {
    tpSize: 4,
    dpSize: 1,
    attentionTpSize: 4,
    moeTopology: 'tp',
  },
  dp: {
    tpSize: 4,
    dpSize: 4,
    attentionTpSize: 1,
  },
};
const PIPELINES = {
  tp: ['idle', 'input', 'attention', 'moe', 'output', 'done'],
  dpTp: ['idle', 'input', 'attention', 'gather', 'moe', 'reduceScatter', 'done'],
  dpEp: ['idle', 'input', 'attention', 'expertDispatch', 'moe', 'expertCombine', 'done'],
};

const normalizeMode = (mode) => (mode === 'tp' ? 'tp' : 'dp');
const normalizeMoeTopology = (mode, topology) => (
  mode === 'tp' ? 'tp' : topology === 'ep' ? 'ep' : 'tp'
);

export const getPipeline = (mode, moeTopology = 'tp') => {
  const normalizedMode = normalizeMode(mode);
  const normalizedTopology = normalizeMoeTopology(normalizedMode, moeTopology);
  if (normalizedMode === 'tp') return PIPELINES.tp;
  return normalizedTopology === 'ep' ? PIPELINES.dpEp : PIPELINES.dpTp;
};

export const getMaxStep = (mode, moeTopology = 'tp') => getPipeline(mode, moeTopology).length - 1;

export const normalizeDpAttentionState = ({ mode = 'dp', moeTopology = 'tp', step = 0 } = {}) => {
  const normalizedMode = normalizeMode(mode);
  const normalizedTopology = normalizeMoeTopology(normalizedMode, moeTopology);
  const maxStep = getMaxStep(normalizedMode, normalizedTopology);
  const numericStep = Number.isFinite(Number(step)) ? Number(step) : 0;
  return {
    mode: normalizedMode,
    moeTopology: normalizedTopology,
    step: Math.min(maxStep, Math.max(0, Math.trunc(numericStep))),
    maxStep,
  };
};

const getStageStatus = (pipeline, activeIndex, operation) => {
  const index = pipeline.indexOf(operation);
  if (index < 0) return 'absent';
  if (activeIndex === 0) return 'pending';
  if (activeIndex === pipeline.length - 1) return 'done';
  if (index < activeIndex) return 'passed';
  if (index === activeIndex) return 'active';
  return 'pending';
};

export const deriveDpAttentionSnapshot = (input = {}) => {
  const normalized = normalizeDpAttentionState(input);
  const { mode, moeTopology, step, maxStep } = normalized;
  const pipeline = getPipeline(mode, moeTopology);
  const operation = pipeline[step];
  const phase = step === 0 ? 'idle' : step === maxStep ? 'done' : 'running';
  const config = mode === 'tp'
    ? DP_ATTENTION_CONFIGS.tp
    : { ...DP_ATTENTION_CONFIGS.dp, moeTopology };
  const isDp = mode === 'dp';
  const cacheVisible = step >= pipeline.indexOf('attention');
  const replicationFactor = config.attentionTpSize;
  const perRankPercent = cacheVisible ? 100 / config.dpSize : 0;
  const clusterPercent = cacheVisible ? replicationFactor * 100 : 0;
  const communicationOperation = ['gather', 'reduceScatter', 'expertDispatch', 'expertCombine'].includes(operation)
    ? operation
    : null;

  return {
    ...normalized,
    phase,
    operation,
    pipeline,
    config,
    isDp,
    communicationOperation,
    statusKey: `status.${operation}`,
    assumptionKey: isDp
      ? moeTopology === 'ep' ? 'assumption.dpEp' : 'assumption.dpTp'
      : 'assumption.tp',
    cache: {
      visible: cacheVisible,
      perRankPercent,
      clusterPercent,
      replicationFactor,
      localRequestFraction: 1 / config.dpSize,
      shapeLatex: isDp
        ? String.raw`\left[\frac{B}{4},\,S,\,d_c+d_h^R\right]`
        : String.raw`\left[B,\,S,\,d_c+d_h^R\right]`,
      formulaLatex: String.raw`M_{\mathrm{KV}}=B\,S\,(d_c+d_h^R)\,b`,
      totalFormulaLatex: isDp
        ? String.raw`M_{\mathrm{cluster}}=\frac{p}{d}\,M_{\mathrm{KV}}=1\times M_{\mathrm{KV}}`
        : String.raw`M_{\mathrm{cluster}}=p\,M_{\mathrm{KV}}=4\times M_{\mathrm{KV}}`,
    },
    tensors: {
      inputShapeLatex: isDp ? String.raw`\left[\frac{B}{4},S,H\right]` : String.raw`[B,S,H]`,
      attentionOutputShapeLatex: isDp ? String.raw`\left[\frac{B}{4},S,H\right]` : String.raw`[B,S,H]`,
      moeInputShapeLatex: isDp && moeTopology === 'ep'
        ? String.raw`[T_{\mathrm{expert}},H]`
        : String.raw`[B,S,H]`,
      finalShapeLatex: isDp ? String.raw`\left[\frac{B}{4},S,H\right]` : String.raw`[B,S,H]`,
      querySource: 'hidden',
      kvSource: 'hidden',
    },
    views: {
      inputVisible: step >= pipeline.indexOf('input'),
      attentionVisible: step >= pipeline.indexOf('attention'),
      bridgeVisible: isDp && step >= 3,
      moeVisible: step >= pipeline.indexOf('moe'),
      returnVisible: isDp && step >= 5,
      outputVisible: phase === 'done' || operation === 'output' || operation === 'reduceScatter' || operation === 'expertCombine',
      gatherStatus: getStageStatus(pipeline, step, 'gather'),
      reduceScatterStatus: getStageStatus(pipeline, step, 'reduceScatter'),
      expertDispatchStatus: getStageStatus(pipeline, step, 'expertDispatch'),
      expertCombineStatus: getStageStatus(pipeline, step, 'expertCombine'),
      attentionStatus: getStageStatus(pipeline, step, 'attention'),
      moeStatus: getStageStatus(pipeline, step, 'moe'),
    },
  };
};
