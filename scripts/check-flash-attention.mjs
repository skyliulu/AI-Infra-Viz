import assert from 'node:assert/strict';
import {
  FLASH_VERSIONS,
  deriveFlashSnapshot,
  estimateForwardResources,
  getMaskKind,
  getPipeline,
  getFlashOnChipStages,
  getStandardForwardHbmState,
  getTileGrid,
  getVersionProfile,
  intervalsOverlap,
  normalizeFlashConfig,
} from '../src/components/flash-attention/model.js';

const fallback = normalizeFlashConfig({ version: 'v9', sequenceLength: 7, headDim: 7 });
assert.equal(fallback.version, 'v2');
assert.equal(fallback.sequenceLength, 2048);
assert.equal(fallback.headDim, 128);

assert.equal(getVersionProfile('v1').outerLoop, 'kv');
assert.equal(getVersionProfile('v2').outerLoop, 'q');
assert.equal(getVersionProfile('v3').hardware, 'H100');
assert.equal(getVersionProfile('v4').hardware, 'B200');

assert.equal(getMaskKind(0, 1, 64, 64, true), 'skip');
assert.equal(getMaskKind(1, 0, 64, 64, true), 'none');
assert.equal(getMaskKind(1, 1, 64, 64, true), 'partial');
assert.equal(getMaskKind(0, 2, 64, 64, false), 'none');

const causalGrid = getTileGrid({ version: 'v1', sequenceLength: 512, causal: true });
const denseGrid = getTileGrid({ version: 'v1', sequenceLength: 512, causal: false });
assert(causalGrid.skippedPairs > 0);
assert.equal(denseGrid.skippedPairs, 0);
assert.equal(causalGrid.activePairs + causalGrid.skippedPairs, causalGrid.totalPairs);

const standard = estimateForwardResources({ modelType: 'standard', sequenceLength: 2048, headDim: 128 });
const v1 = estimateForwardResources({ modelType: 'flash', version: 'v1', sequenceLength: 2048, headDim: 128 });
const v2 = estimateForwardResources({ modelType: 'flash', version: 'v2', sequenceLength: 2048, headDim: 128 });
assert.equal(standard.standardMaterializedBytes, 2 * 2048 * 2048 * 4);
assert(standard.standardTrafficBytes > v1.flashTrafficBytes);
assert(v1.flashTrafficBytes > v2.flashTrafficBytes);
assert(v2.onChipLiveBytes > 0);

const v3Pipeline = getPipeline({ version: 'v3', direction: 'forward' });
const tma1 = v3Pipeline.operations.find((operation) => operation.id === 'tmaKV1');
const softmax0 = v3Pipeline.operations.find((operation) => operation.id === 'softmax0');
assert(intervalsOverlap(tma1, softmax0), 'V3 must expose TMA / softmax overlap');

const standardPipeline = getPipeline({ modelType: 'standard', direction: 'forward' });
assert(standardPipeline.operations.some((operation) => operation.id === 'readS'));
assert(standardPipeline.operations.some((operation) => operation.id === 'softmax'));
assert(standardPipeline.operations.some((operation) => operation.id === 'readP'));
const standardSteps = Object.fromEntries(standardPipeline.operations.map((operation, index) => [operation.id, index + 1]));
const hbmIdle = getStandardForwardHbmState({}, { phase: 'idle', step: 0 });
const hbmWriteS = getStandardForwardHbmState({}, { phase: 'running', step: standardSteps.writeS });
const hbmReadS = getStandardForwardHbmState({}, { phase: 'running', step: standardSteps.readS });
const hbmSoftmax = getStandardForwardHbmState({}, { phase: 'running', step: standardSteps.softmax });
const hbmWriteP = getStandardForwardHbmState({}, { phase: 'running', step: standardSteps.writeP });
const hbmReadP = getStandardForwardHbmState({}, { phase: 'running', step: standardSteps.readP });
const hbmDone = getStandardForwardHbmState({}, { phase: 'done', step: 999 });
assert.equal(hbmIdle.S.status, 'pending');
assert.equal(hbmIdle.P.fill, 0);
assert.equal(hbmIdle.O.status, 'pending');
assert.equal(hbmIdle.O.access, 'idle');
assert.equal(hbmWriteS.S.access, 'write');
assert.equal(hbmReadS.S.access, 'read');
assert.equal(hbmSoftmax.P.status, 'producing');
assert.equal(hbmWriteP.P.access, 'write');
assert.equal(hbmReadP.P.access, 'read');
assert.equal(hbmDone.O.fill, 1);

const v4Forward = getPipeline({ version: 'v4', direction: 'forward' });
assert(v4Forward.lanes.includes('correction'));
assert(v4Forward.operations.some((operation) => operation.id === 'correctH'));
const v4Backward = getPipeline({ version: 'v4', direction: 'backward' });
assert(v4Backward.operations.some((operation) => operation.id === 'twoCtaMma'));
assert(v4Backward.operations.some((operation) => operation.id === 'dsmemExchange'));

for (const version of FLASH_VERSIONS) {
  for (const direction of ['forward', 'backward']) {
    const pipeline = getPipeline({ modelType: 'flash', version, direction });
    const stages = getFlashOnChipStages({ version, direction });
    const assigned = stages.flatMap((stage) => stage.operationIds);
    assert.deepEqual(new Set(assigned), new Set(pipeline.operations.map((operation) => operation.id)), `${version}/${direction} on-chip stages must cover every pipeline operation`);
    assert.equal(assigned.length, new Set(assigned).size, `${version}/${direction} operations must map to exactly one on-chip stage`);
  }
}

for (const modelType of ['standard', 'flash']) {
  for (const version of FLASH_VERSIONS) {
    for (const direction of ['forward', 'backward']) {
      for (const sequenceLength of [512, 2048, 8192]) {
        for (const headDim of [64, 128]) {
          for (const causal of [false, true]) {
            const config = { modelType, version, direction, sequenceLength, headDim, causal };
            const initial = deriveFlashSnapshot(config, { phase: 'idle', step: 0 });
            const middle = deriveFlashSnapshot(config, { phase: 'running', step: 2 });
            const done = deriveFlashSnapshot(config, { phase: 'done', step: 999 });
            assert.equal(initial.operation, null);
            assert(middle.operation);
            assert.equal(initial.displayTiles.active, false);
            assert.equal(middle.displayTiles.active, true);
            assert(middle.displayTiles.q >= 0 && middle.displayTiles.q < middle.displayTiles.count);
            assert(middle.displayTiles.kv >= 0 && middle.displayTiles.kv < middle.displayTiles.count);
            assert.equal(middle.displayTiles.q, middle.tile.qIndex % middle.displayTiles.count);
            assert.equal(middle.displayTiles.kv, middle.tile.kvIndex % middle.displayTiles.count);
            if (direction === 'backward') {
              assert(middle.backwardHbm);
              assert.equal(middle.backwardHbm.Q.fill, 1);
              assert.equal(middle.backwardHbm.dQ.status === 'pending' || middle.backwardHbm.dQ.status === 'producing' || middle.backwardHbm.dQ.status === 'writing', true);
              assert.equal(done.backwardHbm.dQ.status, 'ready');
              assert.equal(done.backwardHbm.dK.status, 'ready');
              assert.equal(done.backwardHbm.dV.status, 'ready');
              assert.equal(done.backwardHbm.quadraticWorkspaceBytes > 0, modelType === 'standard');
            }
            assert.equal(done.completion, 1);
            assert.equal(done.operation, null);
            assert.equal(done.step, done.maxStep);
            assert.equal(done.pipeline.operations.length, done.maxStep);
            assert(done.grid.activePairs > 0);
            assert(Number.isFinite(done.selectedTrafficBytes));
            assert(done.selectedTrafficBytes > 0);
            assert.equal(done.materializedBytes, undefined);
          }
        }
      }
    }
  }
}

const standardSnapshot = deriveFlashSnapshot({ modelType: 'standard' }, { phase: 'done', step: 99 });
const flashSnapshot = deriveFlashSnapshot({ modelType: 'flash', version: 'v4' }, { phase: 'done', step: 99 });
const standardBackwardLoad = deriveFlashSnapshot({ modelType: 'standard', direction: 'backward' }, { phase: 'running', step: 1 });
const standardBackwardDv = deriveFlashSnapshot({ modelType: 'standard', direction: 'backward' }, { phase: 'running', step: 2 });
const standardBackwardDq = deriveFlashSnapshot({ modelType: 'standard', direction: 'backward' }, { phase: 'running', step: 5 });
const standardBackwardWrite = deriveFlashSnapshot({ modelType: 'standard', direction: 'backward' }, { phase: 'running', step: 7 });
assert.equal(standardSnapshot.fullMatrixMaterialized, true);
assert.equal(flashSnapshot.fullMatrixMaterialized, false);
assert.equal(flashSnapshot.flashExact, true);
assert.equal(standardBackwardLoad.backwardHbm.P.access, 'read');
assert.equal(standardBackwardLoad.backwardHbm.S.access, 'idle');
assert.equal(standardBackwardDv.backwardHbm.dV.status, 'producing');
assert.equal(standardBackwardDv.backwardHbm.dQ.status, 'pending');
assert.equal(standardBackwardDv.backwardHbm.dK.status, 'pending');
assert.equal(standardBackwardDq.backwardHbm.dQ.status, 'producing');
assert.equal(standardBackwardDq.backwardHbm.dV.status, 'buffered');
assert.equal(standardBackwardDq.backwardHbm.dK.status, 'pending');
assert.equal(standardBackwardWrite.backwardHbm.dQ.status, 'writing');
assert.equal(standardBackwardWrite.backwardHbm.dK.status, 'writing');
assert.equal(standardBackwardWrite.backwardHbm.dV.status, 'writing');

console.log('FlashAttention model checks passed.');
