import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deriveDpAttentionSnapshot,
  getMaxStep,
  getPipeline,
  normalizeDpAttentionState,
} from '../src/components/dp-attention/model.js';

const combinations = [
  ['tp', 'tp'],
  ['dp', 'tp'],
  ['dp', 'ep'],
];

for (const [mode, moeTopology] of combinations) {
  const pipeline = getPipeline(mode, moeTopology);
  for (let step = 0; step <= getMaxStep(mode, moeTopology); step += 1) {
    const snapshot = deriveDpAttentionSnapshot({ mode, moeTopology, step });
    assert.equal(snapshot.operation, pipeline[step]);
    assert.equal(snapshot.phase, step === 0 ? 'idle' : step === pipeline.length - 1 ? 'done' : 'running');
    assert.equal(snapshot.tensors.querySource, 'hidden');
    assert.equal(snapshot.tensors.kvSource, 'hidden');
    assert.ok(snapshot.cache.perRankPercent >= 0);
    assert.ok(snapshot.cache.clusterPercent >= 0);
  }
}

const tpAttention = deriveDpAttentionSnapshot({ mode: 'tp', step: 2 });
assert.deepEqual(
  [tpAttention.cache.perRankPercent, tpAttention.cache.clusterPercent, tpAttention.cache.replicationFactor],
  [100, 400, 4],
);
assert.match(tpAttention.cache.shapeLatex, /d_c\+d_h\^R/);

for (const topology of ['tp', 'ep']) {
  const dpAttention = deriveDpAttentionSnapshot({ mode: 'dp', moeTopology: topology, step: 2 });
  assert.deepEqual(
    [dpAttention.cache.perRankPercent, dpAttention.cache.clusterPercent, dpAttention.cache.replicationFactor],
    [25, 100, 1],
  );
}

assert.ok(getPipeline('dp', 'tp').includes('gather'));
assert.ok(getPipeline('dp', 'tp').includes('reduceScatter'));
assert.ok(!getPipeline('dp', 'tp').includes('expertDispatch'));
assert.ok(getPipeline('dp', 'ep').includes('expertDispatch'));
assert.ok(getPipeline('dp', 'ep').includes('expertCombine'));
assert.ok(!getPipeline('dp', 'ep').includes('gather'));

assert.deepEqual(
  normalizeDpAttentionState({ mode: 'tp', moeTopology: 'ep', step: 999 }),
  { mode: 'tp', moeTopology: 'tp', step: 5, maxStep: 5 },
);

const componentSource = readFileSync(new URL('../src/components/DpAttention.jsx', import.meta.url), 'utf8');
assert.ok(componentSource.includes('min-w-[520px]'), 'dense four-rank canvas keeps the compact width contract');
assert.ok(!componentSource.includes('min-w-[760px]'), 'legacy oversized canvas width must not return');
assert.ok(componentSource.includes("mode === 'localMatrix'"), 'returned DP shards use a visible matrix encoding');
assert.ok(componentSource.includes("tReturnedOutput"), 'returned matrices keep an explicit semantic label');

console.log('DP Attention model checks passed.');
