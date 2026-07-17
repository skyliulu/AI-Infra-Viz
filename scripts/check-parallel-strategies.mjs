import assert from 'node:assert/strict';
import {
  DEGREE_OPTIONS,
  MAX_GPUS,
  getAttentionArchitectureState,
  getComponentParallelState,
  getDeploymentGpuCoordinates,
  getDeploymentGpuCount,
  getDwdpDegrees,
  getDwdpExpertResidency,
  getIllustrativeGpuCount,
  getMoeParallelState,
  getPipelineOwnership,
  isTopologyValid,
} from '../src/components/parallel-strategies/topologyModel.js';

const dimensions = ['dp', 'tp', 'pp', 'cp', 'ep', 'etp'];
const mappingModels = ['orthogonal', 'dcpReuse'];
const servingModes = ['unified', 'pdDisaggregated'];
let candidates = 0;
let legalTopologies = 0;
let checkedGpuCards = 0;

const visit = (index, degrees, callback) => {
  if (index === dimensions.length) {
    callback(degrees);
    return;
  }
  const dimension = dimensions[index];
  DEGREE_OPTIONS.forEach((degree) => visit(index + 1, { ...degrees, [dimension]: degree }, callback));
};

mappingModels.forEach((mappingModel) => {
  servingModes.forEach((servingMode) => {
    visit(0, {}, (degrees) => {
      candidates += 1;
      if (!isTopologyValid(degrees, mappingModel, servingMode)) return;
      legalTopologies += 1;

      const total = getDeploymentGpuCount(degrees, mappingModel, servingMode);
      assert.ok(total >= 1 && total <= MAX_GPUS, `${mappingModel}/${servingMode}: invalid total ${total}`);
      const instanceTotal = degrees.dp
        * degrees.pp
        * degrees.tp
        * degrees.ep
        * degrees.etp
        * (mappingModel === 'dcpReuse' ? 1 : degrees.cp);
      const expected = instanceTotal * (servingMode === 'pdDisaggregated' ? 2 : 1);
      assert.equal(total, expected, `${mappingModel}/${servingMode}: total mismatch`);

      const coordinateKeys = new Set();
      for (let gpu = 0; gpu < total; gpu += 1) {
        const coords = getDeploymentGpuCoordinates(gpu, degrees, mappingModel, servingMode);
        assert.ok(coords.dp_idx >= 0 && coords.dp_idx < degrees.dp);
        assert.ok(coords.tp_idx >= 0 && coords.tp_idx < degrees.tp);
        assert.ok(coords.pp_idx >= 0 && coords.pp_idx < degrees.pp);
        assert.ok(coords.cp_idx >= 0 && coords.cp_idx < degrees.cp);
        assert.ok(coords.ep_idx >= 0 && coords.ep_idx < degrees.ep);
        assert.ok(coords.etp_idx >= 0 && coords.etp_idx < degrees.etp);
        assert.ok(coords.localGpuIndex >= 0 && coords.localGpuIndex < instanceTotal);
        assert.equal(coords.pool, servingMode === 'pdDisaggregated' ? gpu < instanceTotal ? 'prefill' : 'decode' : 'unified');
        if (mappingModel === 'dcpReuse') assert.equal(coords.cp_idx, coords.tp_idx % degrees.cp);
        coordinateKeys.add(JSON.stringify(coords));

        const ownership = getPipelineOwnership(degrees.pp, coords.pp_idx);
        assert.equal(ownership.ownsEmbedding, coords.pp_idx === 0);
        assert.equal(ownership.ownsLmHead, coords.pp_idx === degrees.pp - 1);
        checkedGpuCards += 1;
      }
      assert.equal(coordinateKeys.size, total, `${mappingModel}/${servingMode}: duplicate GPU coordinate`);

      const moe = getMoeParallelState(degrees);
      if (degrees.etp > 1) {
        assert.equal(moe.expertTp, degrees.etp);
        assert.equal(moe.shardAxis, 'etp');
      } else if (degrees.ep > 1) {
        assert.equal(moe.mode, 'ep');
        assert.equal(moe.expertTp, 1);
      } else if (degrees.tp > 1) {
        assert.equal(moe.mode, 'tp');
        assert.equal(moe.expertTp, degrees.tp);
        assert.equal(moe.shardAxis, 'tp');
      } else {
        assert.equal(moe.mode, 'single');
        assert.equal(moe.expertTp, 1);
      }

      const wideEp = getComponentParallelState(degrees, 'wideEp');
      assert.equal(wideEp.attentionMode, 'dpAttention');
      assert.equal(wideEp.attentionDp, degrees.dp * degrees.ep);
      const lastCoords = getDeploymentGpuCoordinates(total - 1, degrees, mappingModel, servingMode);
      const attentionDpIndex = wideEp.attentionDpIndex(lastCoords);
      assert.ok(attentionDpIndex >= 0 && attentionDpIndex < wideEp.attentionDp);

      const helix = getComponentParallelState(degrees, 'helix');
      assert.equal(helix.attentionMode, 'helix');
      assert.equal(helix.attentionDp, degrees.dp);
      assert.equal(helix.kvParallel, degrees.ep);
      assert.equal(helix.ffnTp, degrees.tp);
      assert.equal(helix.ffnEp, degrees.ep);
      assert.equal(helix.rankReuseSize, degrees.tp * degrees.ep);

      const dpAttention = getComponentParallelState(degrees, 'standard', 'dpAttention');
      assert.equal(dpAttention.attentionMode, 'dpAttention');
      assert.equal(dpAttention.attentionDp, degrees.dp);
      assert.equal(dpAttention.attentionTp, degrees.tp);
      assert.equal(dpAttention.sparseEp, degrees.ep);

      const dwdpDegrees = getDwdpDegrees(degrees);
      assert.equal(dwdpDegrees.tp, 1);
      assert.equal(dwdpDegrees.etp, 1);
      assert.ok(dwdpDegrees.ep >= 2);
      if (isTopologyValid(dwdpDegrees, 'orthogonal', 'pdDisaggregated')) {
        const dwdpCoords = getDeploymentGpuCoordinates(0, dwdpDegrees, 'orthogonal', 'pdDisaggregated');
        assert.equal(dwdpCoords.pool, 'prefill');
        for (let expert = 0; expert < 4; expert += 1) {
          assert.equal(
            getDwdpExpertResidency(expert, dwdpCoords, dwdpDegrees.ep),
            expert % dwdpDegrees.ep === dwdpCoords.ep_idx ? 'local' : 'prefetched',
          );
        }
      }
    });
  });
});

assert.deepEqual(
  getMoeParallelState({ dp: 1, tp: 2, pp: 1, cp: 1, ep: 1, etp: 1 }),
  { mode: 'tp', expertTp: 2, shardAxis: 'tp' },
);

const standardMla = getAttentionArchitectureState(
  { dp: 1, tp: 4, pp: 1, cp: 1, ep: 1, etp: 1 },
  'mla',
  'standard',
  'decode',
);
assert.equal(standardMla.requestLaneCount, 1);
assert.equal(standardMla.kvReplication, 4);
assert.equal(standardMla.kvFootprintUnits, 4);
assert.equal(standardMla.hasExclusiveRequestKv, false);

const dpMla = getAttentionArchitectureState(
  { dp: 1, tp: 4, pp: 1, cp: 1, ep: 1, etp: 1 },
  'mla',
  'dpAttention',
  'decode',
);
assert.equal(dpMla.requestLaneCount, 4);
assert.equal(dpMla.kvReplication, 1);
assert.equal(dpMla.hasExclusiveRequestKv, true);
assert.equal(dpMla.needsTokenGatherBeforeMoe, true);

const standardGqa = getAttentionArchitectureState(
  { dp: 1, tp: 2, pp: 1, cp: 1, ep: 1, etp: 1 },
  'gqa',
  'standard',
  'prefill',
);
assert.equal(standardGqa.kvHeadShardDegree, 2);
assert.equal(standardGqa.kvReplication, 1);
assert.equal(standardGqa.kvFootprintUnits, 8);
assert.equal(standardGqa.tokensPerRequest, 'S_new');

const dpMha = getAttentionArchitectureState(
  { dp: 1, tp: 4, pp: 1, cp: 1, ep: 1, etp: 1 },
  'mha',
  'dpAttention',
  'decode',
);
assert.equal(dpMha.kvFootprintUnits, 32);
assert.equal(dpMha.requestLaneCount, 4);
assert.equal(dpMha.kvReplication, 1);
assert.equal(
  getIllustrativeGpuCount({ dp: 1, tp: 2, pp: 2, cp: 1, ep: 2, etp: 1 }, 'orthogonal'),
  8,
);
assert.equal(
  getDeploymentGpuCount({ dp: 1, tp: 2, pp: 2, cp: 1, ep: 2, etp: 1 }, 'orthogonal', 'pdDisaggregated'),
  16,
);
assert.equal(
  isTopologyValid({ dp: 1, tp: 2, pp: 1, cp: 2, ep: 1, etp: 1 }, 'dcpReuse', 'pdDisaggregated'),
  false,
);
assert.deepEqual(
  getDeploymentGpuCoordinates(1, { dp: 1, tp: 1, pp: 1, cp: 1, ep: 1, etp: 1 }, 'orthogonal', 'pdDisaggregated'),
  { tp_idx: 0, ep_idx: 0, etp_idx: 0, cp_idx: 0, dp_idx: 0, pp_idx: 0, pool: 'decode', localGpuIndex: 0 },
);

console.log(`PASS parallel topology regression: ${legalTopologies}/${candidates} legal topologies, ${checkedGpuCards} GPU cards checked, cap=${MAX_GPUS}`);
