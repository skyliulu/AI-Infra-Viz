export const MAX_GPUS = 32;
export const DEGREE_OPTIONS = [1, 2, 4];

export const getIllustrativeGpuCount = (degrees, mappingModel = 'orthogonal') => {
  const cpFactor = mappingModel === 'dcpReuse' ? 1 : degrees.cp;
  return degrees.dp * degrees.pp * cpFactor * degrees.tp * degrees.ep * degrees.etp;
};

export const isTopologyValid = (degrees, mappingModel = 'orthogonal') => {
  const dcpIsValid = mappingModel !== 'dcpReuse'
    || (degrees.tp >= degrees.cp && degrees.tp % degrees.cp === 0);
  return dcpIsValid && getIllustrativeGpuCount(degrees, mappingModel) <= MAX_GPUS;
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
