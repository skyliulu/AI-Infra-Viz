import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ENGRAM_DEMO_CONFIG,
  ENGRAM_FIRST_TOKEN_INDEX,
  ENGRAM_MAX_STEP,
  ENGRAM_SYSTEM_MODES,
  ENGRAM_TOKENS,
  advanceEngramState,
  deriveEngramSnapshot,
  normalizeEngramState,
} from '../src/components/engram/model.js';

assert.deepEqual(normalizeEngramState({ step: 99, tokenIndex: -9, systemMode: 'other' }), {
  step: ENGRAM_MAX_STEP,
  tokenIndex: ENGRAM_FIRST_TOKEN_INDEX,
  systemMode: 'inference',
});

for (const systemMode of ENGRAM_SYSTEM_MODES) {
  for (let tokenIndex = ENGRAM_FIRST_TOKEN_INDEX; tokenIndex < ENGRAM_TOKENS.length; tokenIndex += 1) {
    for (let step = 0; step <= ENGRAM_MAX_STEP; step += 1) {
      const snapshot = deriveEngramSnapshot({ systemMode, tokenIndex, step });
      const activeStages = Object.values(snapshot.stageStatus).filter((status) => status === 'active');
      assert.equal(activeStages.length, snapshot.phase === 'running' ? 1 : 0);
      assert.equal(snapshot.currentToken, ENGRAM_TOKENS[tokenIndex]);
      assert(snapshot.suffixTokens.length >= 1 && snapshot.suffixTokens.length <= ENGRAM_DEMO_CONFIG.maxNgramSize);
      assert.equal(snapshot.system.trainingCollective, systemMode === 'training');
      assert.equal(snapshot.boundary.completeLatencyHidingIsConditional, true);
      if (snapshot.phase === 'done') {
        assert.equal(step, ENGRAM_MAX_STEP);
        assert.equal(tokenIndex, ENGRAM_TOKENS.length - 1);
      }
    }
  }
}

assert.deepEqual(ENGRAM_DEMO_CONFIG.layerIds, [1, 15]);
assert.equal(ENGRAM_DEMO_CONFIG.headsPerNgram, 8);
assert.equal(ENGRAM_DEMO_CONFIG.maxNgramSize, 3);
assert.deepEqual(advanceEngramState({ step: 9, tokenIndex: 2 }), {
  step: 1,
  tokenIndex: 3,
  systemMode: 'inference',
});
assert.deepEqual(advanceEngramState({ step: 9, tokenIndex: ENGRAM_TOKENS.length - 1 }), {
  step: 9,
  tokenIndex: ENGRAM_TOKENS.length - 1,
  systemMode: 'inference',
});

const componentSource = readFileSync(new URL('../src/components/Engram.jsx', import.meta.url), 'utf8');
assert(componentSource.includes('dtype=torch.long'));
assert(componentSource.includes('ngram_idx = n - 2'));
assert(componentSource.includes('gates = torch.stack(gates, dim=2)'));
assert(componentSource.includes('V_t = self.W_V(E_t)'));
assert(componentSource.includes('MathFormula'));
assert(componentSource.includes('data-testid="engram-retrieval-gate-bridge"'));
assert(componentSource.includes('E_t=\\operatorname{Concat}(E_{t,2},E_{t,3})'));
assert(componentSource.includes('max-w-4xl relative h-20 z-40'));
assert(componentSource.includes('data-testid="engram-gating-canvas"'));
assert(componentSource.includes('h-[480px]'));
assert(componentSource.includes('sizeClass="w-8 h-8"'));
assert(componentSource.includes('w-28 h-10 rounded-lg'));
for (const semanticNode of ['e-t', 'matmul-k', 'matmul-v', 'gate-score', 'broadcast-gate', 'short-conv', 'residual-add']) {
  assert(
    componentSource.includes(`dataNode="${semanticNode}"`)
      || componentSource.includes(`data-node="${semanticNode}"`),
  );
}
assert(!componentSource.includes('Fully hides PCIe latency'));
assert(!componentSource.includes('完全掩盖 CPU 传输延迟'));

const zhStart = componentSource.indexOf('  zh: {');
const enStart = componentSource.indexOf('  en: {');
const dictionaryEnd = componentSource.indexOf('\n};', enStart);
const dictionaryKeys = (source) => [...source.matchAll(/^    ([A-Za-z][A-Za-z0-9_]*):/gm)].map((match) => match[1]).sort();
assert.deepEqual(
  dictionaryKeys(componentSource.slice(zhStart, enStart)),
  dictionaryKeys(componentSource.slice(enStart, dictionaryEnd)),
);

console.log('Engram checks passed (100 canonical lifecycle states across inference and training modes).');
