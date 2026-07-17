export const MAX_GPUS = 32;
export const DEGREE_OPTIONS = [1, 2, 4];

export const getIllustrativeGpuCount = (degrees, mappingModel = 'orthogonal') => {
  const cpFactor = mappingModel === 'dcpReuse' ? 1 : degrees.cp;
  return degrees.dp * degrees.pp * cpFactor * degrees.tp * degrees.ep * degrees.etp;
};

export const getDeploymentGpuCount = (degrees, mappingModel = 'orthogonal', servingMode = 'unified') => {
  const poolMultiplier = servingMode === 'pdDisaggregated' ? 2 : 1;
  return getIllustrativeGpuCount(degrees, mappingModel) * poolMultiplier;
};

export const isTopologyValid = (degrees, mappingModel = 'orthogonal', servingMode = 'unified') => {
  const dcpIsValid = mappingModel !== 'dcpReuse'
    || (degrees.tp >= degrees.cp && degrees.tp % degrees.cp === 0);
  const pdMappingIsValid = !(servingMode === 'pdDisaggregated' && mappingModel === 'dcpReuse');
  return dcpIsValid && pdMappingIsValid && getDeploymentGpuCount(degrees, mappingModel, servingMode) <= MAX_GPUS;
};

export const getGpuCoordinates = (gpuIndex, degrees, mappingModel = 'orthogonal') => {
  let rem = gpuIndex;
  const etp_idx = rem % degrees.etp; rem = Math.floor(rem / degrees.etp);
  const ep_idx = rem % degrees.ep; rem = Math.floor(rem / degrees.ep);
  const tp_idx = rem % degrees.tp; rem = Math.floor(rem / degrees.tp);
  const cp_idx = mappingModel === 'dcpReuse' ? tp_idx % degrees.cp : rem % degrees.cp;
  if (mappingModel !== 'dcpReuse') rem = Math.floor(rem / degrees.cp);
  const dp_idx = rem % degrees.dp; rem = Math.floor(rem / degrees.dp);
  const pp_idx = rem % degrees.pp;

  return { tp_idx, ep_idx, etp_idx, cp_idx, dp_idx, pp_idx };
};

export const getDeploymentGpuCoordinates = (gpuIndex, degrees, mappingModel = 'orthogonal', servingMode = 'unified') => {
  const poolSize = getIllustrativeGpuCount(degrees, mappingModel);
  const localGpuIndex = servingMode === 'pdDisaggregated' ? gpuIndex % poolSize : gpuIndex;
  const pool = servingMode === 'pdDisaggregated'
    ? gpuIndex < poolSize ? 'prefill' : 'decode'
    : 'unified';
  return {
    ...getGpuCoordinates(localGpuIndex, degrees, mappingModel),
    pool,
    localGpuIndex,
  };
};

export const getComponentParallelState = (degrees, profile = 'standard', attentionMode = 'standard') => {
  const wideEp = profile === 'wideEp';
  const helix = profile === 'helix';
  const dpAttention = attentionMode === 'dpAttention' || wideEp;
  return {
    attentionMode: helix ? 'helix' : dpAttention ? 'dpAttention' : 'standard',
    attentionDp: wideEp ? degrees.dp * degrees.ep : degrees.dp,
    attentionDpIndex: (coords) => wideEp
      ? coords.dp_idx * degrees.ep + coords.ep_idx
      : coords.dp_idx,
    attentionTp: degrees.tp,
    sparseEp: degrees.ep,
    lmHeadDp: wideEp ? degrees.dp * degrees.ep : degrees.dp,
    kvParallel: helix ? degrees.ep : 1,
    ffnTp: degrees.tp,
    ffnEp: degrees.ep,
    rankReuseSize: helix ? degrees.tp * degrees.ep : 1,
  };
};

export const getAttentionArchitectureState = (
  degrees,
  attentionType = 'mla',
  attentionMode = 'standard',
  contextMode = 'decode',
) => {
  const configs = {
    mha: { queryHeads: 16, kvHeads: 16, latentWidth: null, kvFootprintUnits: 32 },
    gqa: { queryHeads: 16, kvHeads: 4, latentWidth: null, kvFootprintUnits: 8 },
    mla: { queryHeads: 16, kvHeads: 1, latentWidth: 4, kvFootprintUnits: 4 },
  };
  const config = configs[attentionType] || configs.mla;
  const workerCount = Math.max(1, degrees.tp);
  const isDpAttention = attentionMode === 'dpAttention';
  const kvHeadShardDegree = attentionType === 'mla'
    ? 1
    : Math.min(workerCount, config.kvHeads);
  const kvReplication = isDpAttention
    ? 1
    : Math.max(1, Math.ceil(workerCount / kvHeadShardDegree));

  return {
    ...config,
    attentionType,
    contextMode,
    workerCount,
    requestLaneCount: isDpAttention ? workerCount : 1,
    kvHeadShardDegree,
    kvReplication,
    hasExclusiveRequestKv: isDpAttention,
    needsTokenGatherBeforeMoe: isDpAttention && workerCount > 1,
    tokensPerRequest: contextMode === 'prefill' ? 'S_new' : '1',
  };
};

export const getDwdpDegrees = (degrees) => ({
  ...degrees,
  tp: 1,
  ep: Math.max(2, degrees.ep),
  etp: 1,
});

export const getDwdpExpertResidency = (expertIndex, coords, epDegree) => (
  expertIndex % epDegree === coords.ep_idx ? 'local' : 'prefetched'
);

export const getMoeParallelState = (degrees) => {
  if (degrees.etp > 1) {
    return {
      mode: degrees.ep > 1 ? 'hybrid' : 'etp',
      expertTp: degrees.etp,
      shardAxis: 'etp',
    };
  }

  if (degrees.ep > 1) {
    return { mode: 'ep', expertTp: 1, shardAxis: null };
  }

  if (degrees.tp > 1) {
    return { mode: 'tp', expertTp: degrees.tp, shardAxis: 'tp' };
  }

  return { mode: 'single', expertTp: 1, shardAxis: null };
};

export const getPipelineOwnership = (ppDegree, ppRank) => ({
  ownsEmbedding: ppRank === 0,
  ownsLmHead: ppRank === ppDegree - 1,
});
