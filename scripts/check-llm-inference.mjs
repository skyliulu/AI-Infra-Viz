import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deriveInferenceTensorSnapshot,
  deriveSamplingDistribution,
  MODULE,
  TOTAL_LAYERS,
} from '../src/components/llm-inference/model.js';

const promptLength = 6;
const models = ['dense', 'moe'];
const activeStages = [MODULE.embedding, MODULE.attention, MODULE.ffn, MODULE.lmHead];
let checked = 0;

const makeSnapshot = (overrides = {}) => deriveInferenceTensorSnapshot({
  phase: 'prefill',
  activeModule: MODULE.embedding,
  currentLayer: 1,
  step: 0,
  promptLength,
  modelType: 'moe',
  ...overrides,
});

const assertProbabilityRows = (snapshot) => {
  for (const row of snapshot.attention.probabilities) {
    const sum = row.reduce((total, value) => total + value, 0);
    assert.ok(Math.abs(sum - 1) <= 0.03, `attention probability row sums to ${sum}`);
  }
};

const assertRoutes = (snapshot) => {
  assert.equal(snapshot.moe.routes.length, snapshot.displaySequenceRows);
  for (const route of snapshot.moe.routes) {
    assert.equal(route.topK.length, 2);
    assert.equal(new Set(route.topK).size, 2);
    assert.ok(route.topK.every((expert) => expert >= 0 && expert < snapshot.moe.expertCount));
    assert.ok(Math.abs(route.weights.reduce((sum, value) => sum + value, 0) - 1) < 0.001);
  }
};

const assertMatrixShape = (matrix, rows, cols, label) => {
  assert.equal(matrix.length, rows, `${label} row count`);
  assert.ok(matrix.every((row) => row.length === cols), `${label} column count`);
};

for (const modelType of models) {
  for (const activeModule of activeStages) {
    for (const currentLayer of [1, 16, TOTAL_LAYERS]) {
      const snapshot = makeSnapshot({ modelType, activeModule, currentLayer });
      const activeCount = Object.values(snapshot.stageStatus).filter((status) => status === 'active').length;
      assert.equal(activeCount, 1, 'exactly one pipeline stage is active');
      assert.equal(snapshot.sequenceRows, promptLength);
      assert.equal(snapshot.attention.queryRows, promptLength);
      assert.equal(snapshot.attention.keyRows, promptLength);
      assert.equal(snapshot.lmHead.inputRows, 1);
      assert.equal(snapshot.lmHead.logitsRows, 1);
      assertProbabilityRows(snapshot);
      assertRoutes(snapshot);
      assertMatrixShape(snapshot.tensors.ffnUpWeight, 4, 6, 'FFN up projection');
      assertMatrixShape(snapshot.tensors.ffnDownWeight, 6, 4, 'FFN down projection');
      assertMatrixShape(snapshot.tensors.routerWeight, 4, snapshot.moe.expertCount, 'MoE router');
      assertMatrixShape(snapshot.tensors.expertUpWeight, 4, 6, 'expert up projection');
      assertMatrixShape(snapshot.tensors.expertDownWeight, 6, 4, 'expert down projection');
      checked += 1;
    }
  }
}

const prefillAttention = makeSnapshot({ activeModule: MODULE.attention, currentLayer: 7 });
assert.equal(prefillAttention.cache.layerTokens[5], promptLength);
assert.equal(prefillAttention.cache.layerTokens[6], promptLength);
assert.equal(prefillAttention.cache.layerTokens[7], 0);
for (let row = 0; row < prefillAttention.attention.displayRows; row += 1) {
  for (let col = 0; col < prefillAttention.attention.displayCols; col += 1) {
    assert.equal(prefillAttention.attention.mask[row][col], col > row);
  }
}

for (const modelType of models) {
  for (const step of [1, 3, 5]) {
    for (const activeModule of activeStages) {
      for (const currentLayer of [1, 16, TOTAL_LAYERS]) {
        const snapshot = makeSnapshot({
          phase: 'decode',
          modelType,
          activeModule,
          currentLayer,
          step,
        });
        assert.equal(snapshot.sequenceRows, 1);
        assert.equal(snapshot.attention.queryRows, 1);
        assert.equal(snapshot.attention.keyRows, promptLength + step);
        assert.equal(snapshot.attention.displayRows, 1);
        assert.ok(snapshot.attention.mask[0].every((masked) => !masked));
        assert.equal(snapshot.positionFormula, `p=${promptLength + step - 1}`);
        assertProbabilityRows(snapshot);
        assertRoutes(snapshot);
        checked += 1;
      }
    }
  }
}

const decodeEmbedding = makeSnapshot({
  phase: 'decode',
  activeModule: MODULE.embedding,
  currentLayer: 1,
  step: 3,
});
assert.ok(decodeEmbedding.cache.layerTokens.every((tokens) => tokens === promptLength + 2));

const decodeAttention = makeSnapshot({
  phase: 'decode',
  activeModule: MODULE.attention,
  currentLayer: 7,
  step: 3,
});
assert.equal(decodeAttention.cache.layerTokens[5], promptLength + 3);
assert.equal(decodeAttention.cache.layerTokens[6], promptLength + 3);
assert.equal(decodeAttention.cache.layerTokens[7], promptLength + 2);

const done = makeSnapshot({ activeModule: MODULE.tokenDone, currentLayer: TOTAL_LAYERS });
assert.ok(Object.values(done.stageStatus).every((status) => status === 'passed'));

const samplingCandidates = [
  { t: 'A', p: 0.52 },
  { t: 'B', p: 0.28 },
  { t: 'C', p: 0.14 },
  { t: 'D', p: 0.06 },
];
const restrictiveSampling = deriveSamplingDistribution({
  candidates: samplingCandidates,
  temperature: 1.4,
  topK: 2,
  topP: 0.7,
});
assert.equal(restrictiveSampling.temperature, 0.9, 'temperature is constrained below one');
assert.ok(restrictiveSampling.keptCount <= restrictiveSampling.topK, 'Top-P never restores a Top-K filtered candidate');
assert.ok(restrictiveSampling.candidates.slice(restrictiveSampling.topK).every((candidate) => !candidate.accepted));
assert.ok(restrictiveSampling.candidates.filter((candidate) => !candidate.accepted).every((candidate) => candidate.finalProbability === 0));
assert.ok(Math.abs(restrictiveSampling.candidates.reduce((sum, candidate) => sum + candidate.finalProbability, 0) - 1) < 0.0001);

const topOneSampling = deriveSamplingDistribution({ candidates: samplingCandidates, temperature: 0.1, topK: 1, topP: 1 });
assert.equal(topOneSampling.keptCount, 1);
assert.equal(topOneSampling.candidates[0].finalProbability, 1);

const componentSource = readFileSync(new URL('../src/components/LLMInference.jsx', import.meta.url), 'utf8');
const workbenchSource = readFileSync(new URL('../src/components/llm-inference/TensorWorkbench.jsx', import.meta.url), 'utf8');
assert.ok(componentSource.includes('<TensorWorkbench'), 'the primary canvas renders tensor evidence');
assert.ok(componentSource.includes('<LayerKvOverview'), 'the cache region renders per-layer ownership');
assert.ok(workbenchSource.includes('id="last-hidden"') && workbenchSource.includes('id="vocab-weight"'), 'LM Head keeps last-row semantics');
assert.ok(componentSource.includes('data-testid="sampling-controls"'), 'Top-K, Top-P, and sub-one temperature share the sampling control group');
assert.ok(!componentSource.includes('<details'), 'the redundant expandable formula panel is removed');
assert.ok(!componentSource.includes('formulaReference'), 'the removed formula panel leaves no stale copy');
assert.ok(workbenchSource.includes('id="attention-score"'), 'attention score has stable semantic identity');
assert.ok(workbenchSource.includes("moe.routes[row]?.topK.includes(col)"), 'MoE selection is derived per token row');
for (const tensorId of ['ffn-up-weight', 'ffn-down-weight', 'moe-router-weight', 'expert-up-weight', 'expert-down-weight']) {
  assert.ok(workbenchSource.includes(`id="${tensorId}"`), `${tensorId} is rendered in the tensor workbench`);
}
assert.ok(workbenchSource.includes('data-testid="sampling-curve"'), 'sampling is encoded as curves instead of prose-only controls');

console.log(`LLM Inference model checks passed (${checked} representative states).`);
