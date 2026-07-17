import assert from 'node:assert/strict';
import {
  DEGREE_OPTIONS,
  MAX_GPUS,
  getGpuCoordinates,
  getIllustrativeGpuCount,
  getMoeParallelState,
  getPipelineOwnership,
  isTopologyValid,
} from '../src/components/parallel-strategies/topologyModel.js';

const dimensions = ['dp', 'tp', 'pp', 'cp', 'ep', 'etp'];
const mappingModels = ['orthogonal', 'dcpReuse'];
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
  visit(0, {}, (degrees) => {
    candidates += 1;
    if (!isTopologyValid(degrees, mappingModel)) return;
    legalTopologies += 1;

    const total = getIllustrativeGpuCount(degrees, mappingModel);
    assert.ok(total >= 1 && total <= MAX_GPUS, `${mappingModel}: invalid total ${total}`);
    const expected = degrees.dp
      * degrees.pp
      * degrees.tp
      * degrees.ep
      * degrees.etp
      * (mappingModel === 'dcpReuse' ? 1 : degrees.cp);
    assert.equal(total, expected, `${mappingModel}: total mismatch`);

    const coordinateKeys = new Set();
    for (let gpu = 0; gpu < total; gpu += 1) {
      const coords = getGpuCoordinates(gpu, degrees, mappingModel);
      assert.ok(coords.dp_idx >= 0 && coords.dp_idx < degrees.dp);
      assert.ok(coords.tp_idx >= 0 && coords.tp_idx < degrees.tp);
      assert.ok(coords.pp_idx >= 0 && coords.pp_idx < degrees.pp);
      assert.ok(coords.cp_idx >= 0 && coords.cp_idx < degrees.cp);
      assert.ok(coords.ep_idx >= 0 && coords.ep_idx < degrees.ep);
      assert.ok(coords.etp_idx >= 0 && coords.etp_idx < degrees.etp);
      if (mappingModel === 'dcpReuse') assert.equal(coords.cp_idx, coords.tp_idx % degrees.cp);
      coordinateKeys.add(JSON.stringify(coords));

      const ownership = getPipelineOwnership(degrees.pp, coords.pp_idx);
      assert.equal(ownership.ownsEmbedding, coords.pp_idx === 0);
      assert.equal(ownership.ownsLmHead, coords.pp_idx === degrees.pp - 1);
      checkedGpuCards += 1;
    }
    assert.equal(coordinateKeys.size, total, `${mappingModel}: duplicate GPU coordinate`);

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
  });
});

assert.deepEqual(
  getMoeParallelState({ dp: 1, tp: 2, pp: 1, cp: 1, ep: 1, etp: 1 }),
  { mode: 'tp', expertTp: 2, shardAxis: 'tp' },
);
assert.equal(
  getIllustrativeGpuCount({ dp: 1, tp: 2, pp: 2, cp: 1, ep: 2, etp: 1 }, 'orthogonal'),
  8,
);

console.log(`PASS parallel topology regression: ${legalTopologies}/${candidates} legal topologies, ${checkedGpuCards} GPU cards checked, cap=${MAX_GPUS}`);
