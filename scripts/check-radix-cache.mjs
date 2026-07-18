import assert from 'node:assert/strict';
import {
  deriveRadixCacheState,
  MODE_MAX_STEPS,
  RADIX_REQUESTS,
  TOTAL_KV_SLOTS,
} from '../src/components/radix-cache/model.js';

const occupied = (snapshot) => snapshot.pool.slots.filter((slot) => slot.status !== 'empty');
const locked = (snapshot) => occupied(snapshot).filter((slot) => slot.locked);

const flattenTree = (roots) => roots.flatMap((treeNode) => [treeNode, ...flattenTree(treeNode.children ?? [])]);

for (const mode of Object.keys(MODE_MAX_STEPS)) {
  for (let step = 0; step <= MODE_MAX_STEPS[mode]; step += 1) {
    const snapshot = deriveRadixCacheState({ mode, step, phase: step === 0 ? 'idle' : 'running' });
    assert.equal(snapshot.pool.slots.length, TOTAL_KV_SLOTS, `${mode}/${step}: slot count`);
    assert.equal(snapshot.pool.usedCount, occupied(snapshot).length, `${mode}/${step}: used slots`);
    assert.equal(snapshot.pool.freeCount, TOTAL_KV_SLOTS - snapshot.pool.usedCount, `${mode}/${step}: free slots`);
    assert.ok(snapshot.pool.usedCount <= TOTAL_KV_SLOTS, `${mode}/${step}: capacity bound`);
    assert.ok(snapshot.pool.shortage >= 0, `${mode}/${step}: non-negative deficit`);

    const treeNodes = flattenTree(snapshot.tree.root);
    assert.equal(new Set(treeNodes.map((node) => node.id)).size, treeNodes.length, `${mode}/${step}: tree ids`);
    assert.ok(treeNodes.filter((node) => node.active).length <= 1, `${mode}/${step}: one active node`);
  }
}

const standardPressure = deriveRadixCacheState({ mode: 'standard', step: 7 });
assert.deepEqual(
  [standardPressure.pool.usedCount, standardPressure.pool.freeCount, standardPressure.pool.allocationNeed, standardPressure.pool.shortage],
  [8, 2, RADIX_REQUESTS.D.blocks, 3],
  'standard baseline must expose the real admission deficit',
);
assert.equal(
  standardPressure.requests.find((request) => request.id === 'D').status,
  'blocked',
  'the request list and capacity panel must agree that D is blocked',
);

const radixPressure = deriveRadixCacheState({ mode: 'radix', step: 9 });
assert.deepEqual(
  [radixPressure.pool.usedCount, radixPressure.pool.freeCount, radixPressure.pool.allocationNeed, radixPressure.pool.shortage],
  [6, 4, RADIX_REQUESTS.D.blocks, 1],
  'radix eviction must be triggered by pending allocation demand',
);

const radixAfterEvict = deriveRadixCacheState({ mode: 'radix', step: 10 });
assert.deepEqual(
  [radixAfterEvict.pool.usedCount, radixAfterEvict.pool.freeCount, radixAfterEvict.pool.shortage, radixAfterEvict.pool.evictedCount],
  [5, 5, 0, 1],
  'one evicted suffix must satisfy the one-slot deficit',
);

const radixAllocated = deriveRadixCacheState({ mode: 'radix', step: 11 });
assert.deepEqual(
  [radixAllocated.pool.usedCount, radixAllocated.pool.freeCount, radixAllocated.pool.shortage],
  [10, 0, 0],
  'D allocation must fill the pool without exceeding capacity',
);
assert.deepEqual(
  RADIX_REQUESTS.D.blockRefs.filter((index) => radixAllocated.pool.slots[index].seq === 'D'),
  RADIX_REQUESTS.D.blockRefs,
  'D must occupy the reclaimed and remaining free slots',
);

assert.equal(radixPressure.pool.prefixReuseRate, radixAfterEvict.pool.prefixReuseRate, 'eviction must not change prefix reuse rate');
assert.deepEqual([radixPressure.pool.matchedTokens, radixPressure.pool.promptTokens], [8, 52], 'reuse metric denominator');

const lockExpectations = [
  [1, 3], [2, 0], [5, 3], [6, 0], [7, 2], [8, 0], [11, 5], [12, 0],
];
for (const [step, expectedLocks] of lockExpectations) {
  const snapshot = deriveRadixCacheState({ mode: 'radix', step });
  assert.equal(locked(snapshot).length, expectedLocks, `radix/${step}: lock lifecycle`);
}

assert.equal(deriveRadixCacheState({ mode: 'standard', step: 7 }).phase, 'done');
assert.equal(deriveRadixCacheState({ mode: 'radix', step: 12 }).phase, 'done');

console.log('Radix Cache model checks passed.');
