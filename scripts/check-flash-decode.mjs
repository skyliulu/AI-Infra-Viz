import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FLASH_DECODE_ALGORITHMS,
  FLASH_DECODE_EXECUTIONS,
  FLASH_DECODE_HEAD_MODES,
  FLASH_DECODE_KV_LAYOUTS,
  FLASH_DECODE_SPLIT_SETTINGS,
  NUM_KV_BLOCKS,
  NUM_WORK_UNITS,
  QUERY_HEADS,
  deriveAutoSplitCount,
  deriveFlashDecodeSnapshot,
  mergeAccumulatorPartials,
  mergeLsePartials,
  normalizeFlashDecodeState,
} from '../src/components/flash-decode/model.js';

assert.deepEqual(normalizeFlashDecodeState({
  algorithm: 'other',
  execution: 'other',
  kvLayout: 'other',
  headMode: 'other',
  splitSetting: 'other',
  step: 99,
}), {
  algorithm: 'optimized',
  execution: 'split',
  kvLayout: 'contiguous',
  headMode: 'gqa',
  splitSetting: 'auto',
  step: 6,
});

assert.equal(deriveAutoSplitCount(12288), 6);
assert.equal(deriveAutoSplitCount(1), 2);
assert.equal(deriveAutoSplitCount(999999), 8);

let checkedStates = 0;
for (const algorithm of FLASH_DECODE_ALGORITHMS) {
  for (const execution of FLASH_DECODE_EXECUTIONS) {
    for (const kvLayout of FLASH_DECODE_KV_LAYOUTS) {
      for (const headMode of FLASH_DECODE_HEAD_MODES) {
        for (const splitSetting of FLASH_DECODE_SPLIT_SETTINGS) {
          const finalSnapshot = deriveFlashDecodeSnapshot({ algorithm, execution, kvLayout, headMode, splitSetting, step: 99 });
          for (let step = 0; step <= finalSnapshot.maxStep; step += 1) {
            const snapshot = deriveFlashDecodeSnapshot({ algorithm, execution, kvLayout, headMode, splitSetting, step });
            checkedStates += 1;
            assert.equal(snapshot.workItems.length, NUM_WORK_UNITS);
            assert.equal(snapshot.assignments.length, NUM_WORK_UNITS);
            assert.equal(snapshot.workspaceForm, algorithm === 'simple' ? 'accumulators' : 'lse');
            assert.equal(snapshot.headMapping.length, QUERY_HEADS);
            assert(snapshot.headMapping.every(({ kvHead }) => kvHead >= 0 && kvHead < snapshot.kvHeads));
            assert.equal(snapshot.logicalPages.length, NUM_KV_BLOCKS);
            assert.equal(snapshot.outputReady, snapshot.operation === 'writeOutput');
            assert.equal(snapshot.localActive, ['localBatch1', 'localBatch2', 'fusedAttention'].includes(snapshot.operation));

            if (kvLayout === 'contiguous') {
              assert(snapshot.logicalPages.every(({ logicalPage, physicalPage }) => logicalPage === physicalPage));
            } else {
              assert(snapshot.logicalPages.some(({ logicalPage, physicalPage }) => logicalPage !== physicalPage));
            }

            if (execution === 'unsplit') {
              assert.equal(snapshot.effectiveSplitCount, 1);
              assert.equal(snapshot.maxStep, 3);
              assert.equal(snapshot.metrics.workspaceEntries, 0);
              assert.equal(snapshot.metrics.reductionPasses, 0);
              assert.equal(snapshot.reductionActive, false);
              assert.equal(snapshot.boundary.independentReductionKernel, false);
            } else {
              const expectedSplits = splitSetting === 'auto' ? 6 : Number(splitSetting);
              assert.equal(snapshot.effectiveSplitCount, expectedSplits);
              assert.equal(snapshot.metrics.workspaceEntries, expectedSplits);
              assert.equal(snapshot.maxStep, expectedSplits > NUM_WORK_UNITS ? 6 : 5);
              assert.equal(snapshot.boundary.independentReductionKernel, true);
              assert.equal(snapshot.operation === 'localBatch2', expectedSplits > NUM_WORK_UNITS && step === 3);
              assert(snapshot.assignments.every((split) => split === null || (split >= 0 && split < expectedSplits)));
            }
          }
        }
      }
    }
  }
}

const headSnapshots = Object.fromEntries(FLASH_DECODE_HEAD_MODES.map((headMode) => [
  headMode,
  deriveFlashDecodeSnapshot({ headMode }),
]));
assert.equal(headSnapshots.mha.kvHeads, 8);
assert.equal(headSnapshots.gqa.kvHeads, 2);
assert.equal(headSnapshots.mqa.kvHeads, 1);
assert.equal(headSnapshots.mha.queryHeadsPerKvHead, 1);
assert.equal(headSnapshots.gqa.queryHeadsPerKvHead, 4);
assert.equal(headSnapshots.mqa.queryHeadsPerKvHead, 8);
assert(headSnapshots.mha.metrics.kvElementsRead > headSnapshots.gqa.metrics.kvElementsRead);
assert(headSnapshots.gqa.metrics.kvElementsRead > headSnapshots.mqa.metrics.kvElementsRead);

const scores = [1.2, -0.4, 0.8, 2.1];
const values = [[1, 0], [0, 1], [2, 1], [-1, 3]];
const maxScore = Math.max(...scores);
const expScores = scores.map((score) => Math.exp(score - maxScore));
const denominator = expScores.reduce((sum, value) => sum + value, 0);
const direct = values[0].map((_, dimension) => expScores.reduce(
  (sum, weight, index) => sum + weight * values[index][dimension],
  0,
) / denominator);

const chunks = [[0, 1], [2, 3]];
const accumulatorPartials = chunks.map((indices) => {
  const max = Math.max(...indices.map((index) => scores[index]));
  const weights = indices.map((index) => Math.exp(scores[index] - max));
  return {
    max,
    sumExp: weights.reduce((sum, value) => sum + value, 0),
    numerator: values[0].map((_, dimension) => weights.reduce(
      (sum, weight, offset) => sum + weight * values[indices[offset]][dimension],
      0,
    )),
  };
});
const lsePartials = accumulatorPartials.map((partial) => ({
  lse: partial.max + Math.log(partial.sumExp),
  output: partial.numerator.map((value) => value / partial.sumExp),
}));

for (const merged of [mergeAccumulatorPartials(accumulatorPartials), mergeLsePartials(lsePartials)]) {
  direct.forEach((expected, index) => assert(Math.abs(merged.output[index] - expected) < 1e-12));
}

const componentSource = readFileSync(new URL('../src/components/FlashDecode.jsx', import.meta.url), 'utf8');
const zhStart = componentSource.indexOf('  zh: {');
const enStart = componentSource.indexOf('  en: {');
const dictionaryEnd = componentSource.indexOf('\n};', enStart);
assert(zhStart >= 0 && enStart > zhStart && dictionaryEnd > enStart);
const dictionaryKeys = (source) => [...source.matchAll(/^    ([A-Za-z][A-Za-z0-9_]*):/gm)].map((match) => match[1]).sort();
const zhKeys = dictionaryKeys(componentSource.slice(zhStart, enStart));
const enKeys = dictionaryKeys(componentSource.slice(enStart, dictionaryEnd));
assert.deepEqual(zhKeys, enKeys);
for (const testId of ['flashdecode-technical-controls', 'flashdecode-derived-metrics', 'kv-addressing', 'split-setting']) {
  assert(componentSource.includes(`data-testid=\"${testId}\"`));
}

console.log(`FlashDecode checks passed (${checkedStates} legal lifecycle states; ${zhKeys.length} aligned i18n keys).`);
