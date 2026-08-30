import assert from 'node:assert/strict';
import {
  deriveSpeculativeSnapshot,
  getNextLifecycle,
  normalizeSpeculativeInput,
} from '../src/components/speculative-decoding/model.js';

for (const algorithm of ['eagle2', 'dspark']) {
  for (const scenario of ['representative', 'lowAcceptance']) {
    const idle = deriveSpeculativeSnapshot({ algorithm, scenario, phase: 'idle', step: 0 });
    assert.equal(idle.activeOperation, null, `${algorithm} idle must not expose an active operation`);
    assert.equal(idle.stages.filter((stage) => stage.status === 'active').length, 0);
    assert.equal(idle.targetPasses, 1);
    assert.equal(idle.targetWeightStreams, 1);
    assert.equal(idle.baselineTargetPasses, idle.committedCount);
    assert.equal(idle.baselineWeightStreams, idle.committedCount);
    assert.ok(idle.speculativeCost > 0);
    assert.ok(idle.speedupEstimate > 0);
    assert.equal(idle.race.step, 0);
    assert.equal(idle.race.baselineCompleted, 0);
    assert.equal(idle.race.speculativeCommitted, 0);
    assert.equal(idle.race.speculativeStage, 'pending');
    assert.equal(idle.kvLifecycle.state, 'prefix');
    assert.equal(idle.kvLifecycle.prefixPersistent, true);
    assert.equal(idle.kvLifecycle.slots.length, idle.verifiedCount);
    assert.ok(idle.kvLifecycle.slots.every((slot) => slot.state === 'empty'));

    let previousBaseline = 0;
    let previousSpeculative = 0;
    let previousCycles = 0;
    for (let raceStep = 0; raceStep <= idle.race.maxStep; raceStep += 1) {
      const raceSnapshot = deriveSpeculativeSnapshot({ algorithm, scenario, phase: 'idle', step: 0, raceStep });
      assert.ok(raceSnapshot.race.baselineCompleted >= previousBaseline, 'baseline race progress must be monotonic');
      assert.ok(raceSnapshot.race.speculativeCommitted >= previousSpeculative, 'speculative output must be monotonic');
      assert.ok(raceSnapshot.race.completedCycles >= previousCycles, 'completed cycles must be monotonic');
      assert.ok(raceSnapshot.race.baselineActivePass === null || raceSnapshot.race.baselineActivePass < raceSnapshot.race.timeBudget);
      assert.equal(raceSnapshot.race.baselineTokens.length, raceSnapshot.race.baselineCompleted);
      assert.equal(raceSnapshot.race.speculativeTokens.length, raceSnapshot.race.speculativeCommitted);
      assert.ok(raceSnapshot.race.cycles.every((cycle) => cycle.start <= cycle.draftEnd && cycle.draftEnd <= cycle.verifyEnd && cycle.verifyEnd <= cycle.end));
      previousBaseline = raceSnapshot.race.baselineCompleted;
      previousSpeculative = raceSnapshot.race.speculativeCommitted;
      previousCycles = raceSnapshot.race.completedCycles;
    }

    for (let step = 0; step < idle.maxStep; step += 1) {
      const snapshot = deriveSpeculativeSnapshot({ algorithm, scenario, phase: 'running', step });
      assert.ok(snapshot.activeOperation, `${algorithm} step ${step} needs one active operation`);
      assert.equal(snapshot.operationIndex, step);
      assert.equal(snapshot.stages.filter((stage) => stage.status === 'active').length, 1);
      assert.equal(snapshot.stages[step].type, snapshot.activeOperation.type);
      if (step === 3) {
        assert.equal(snapshot.kvLifecycle.state, 'reserved');
        assert.ok(snapshot.kvLifecycle.slots.every((slot) => slot.state === 'reserved'));
      }
      if (step === 4) {
        assert.equal(snapshot.kvLifecycle.state, 'verifying');
        assert.equal(snapshot.kvLifecycle.temporaryCount, snapshot.verifiedCount);
        assert.ok(snapshot.kvLifecycle.slots.every((slot) => slot.state === 'temporary'));
      }
      if (step === 5) {
        assert.equal(snapshot.kvLifecycle.state, 'committing');
        assert.equal(snapshot.kvLifecycle.acceptedKvCount, snapshot.acceptedDraftCount);
        assert.equal(snapshot.kvLifecycle.slots.filter((slot) => slot.state === 'committing').length, snapshot.acceptedDraftCount);
        assert.equal(snapshot.kvLifecycle.slots.filter((slot) => slot.state === 'reclaiming').length, snapshot.verifiedCount - snapshot.acceptedDraftCount);
      }
    }

    const done = deriveSpeculativeSnapshot({ algorithm, scenario, phase: 'done', step: 99 });
    assert.equal(done.activeOperation, null);
    assert.ok(done.stages.every((stage) => stage.status === 'done'));
    assert.equal(done.committedTokens.length, done.committedCount);
    assert.ok(done.acceptedDraftCount <= done.verifiedCount);
    assert.equal(done.wastedCount, done.verifiedCount - done.acceptedDraftCount);
    assert.equal(done.kvLifecycle.state, 'stable');
    assert.equal(done.kvLifecycle.acceptedKvCount, done.acceptedDraftCount);
    assert.equal(done.kvLifecycle.slots.filter((slot) => slot.state === 'committed').length, done.acceptedDraftCount);
    assert.equal(done.kvLifecycle.slots.filter((slot) => slot.state === 'free').length, done.verifiedCount - done.acceptedDraftCount);
    assert.equal(done.kvLifecycle.correctionPending, done.hasCorrection);
    const raceDone = deriveSpeculativeSnapshot({ algorithm, scenario, phase: 'done', step: 99, raceStep: idle.race.maxStep });
    assert.equal(raceDone.race.baselineCompleted, raceDone.race.timeBudget);
    assert.equal(raceDone.race.speculativeStage, 'budgetReached');
    assert.equal(raceDone.race.lead, raceDone.race.speculativeCommitted - raceDone.race.baselineCompleted);
    if (scenario === 'representative') assert.ok(raceDone.race.lead > 0, `${algorithm} representative race must preserve a final output lead`);
    else assert.ok(raceDone.race.lead >= 0, `${algorithm} low-acceptance race must not claim a negative speedup in the teaching model`);
  }
}

const eagleRepresentative = deriveSpeculativeSnapshot({ algorithm: 'eagle2', scenario: 'representative', phase: 'done', step: 99 });
assert.deepEqual(eagleRepresentative.committedTokens, ['predict', 'the', 'future', 'of']);
assert.equal(eagleRepresentative.draftedCount, 10);
assert.equal(eagleRepresentative.verifiedCount, 8);
assert.equal(eagleRepresentative.flattenedCandidates.length, 8);
assert.equal(eagleRepresentative.candidates.filter((candidate) => candidate.selected).length, 8);
assert.equal(eagleRepresentative.candidates.filter((candidate) => candidate.expandParent).length, 2);
assert.equal(eagleRepresentative.attentionMask.length, 8);
assert.ok(eagleRepresentative.attentionMask.every((row, index) => row.length === 8 && row[index]));
assert.ok(eagleRepresentative.candidates.filter((candidate) => candidate.parent).every((candidate) => candidate.value <= eagleRepresentative.candidates.find((parent) => parent.id === candidate.parent).value));
assert.equal(eagleRepresentative.baselineTargetPasses, 4);
assert.equal(eagleRepresentative.targetPasses, 1);
assert.equal(eagleRepresentative.hasCorrection, false);
assert.ok(eagleRepresentative.candidates.filter((candidate) => candidate.accepted).every((candidate) => candidate.status === 'committed'));
assert.deepEqual(eagleRepresentative.maskExample.visibleTokens, ['predict', 'the', 'future', 'of']);
assert.ok(eagleRepresentative.maskExample.blockedTokens.includes('generate'));
assert.deepEqual([...eagleRepresentative.prefixTokens, ...eagleRepresentative.committedTokens], ['Large', 'models', 'can', 'predict', 'the', 'future', 'of']);
assert.deepEqual(eagleRepresentative.architecture.targetWeights.map((group) => group.id), ['embedding', 'decoderStack', 'finalNorm', 'lmHead']);
assert.deepEqual(eagleRepresentative.architecture.draftWeights.map((group) => group.id), ['fusionProjection', 'draftDecoder']);
assert.deepEqual(eagleRepresentative.architecture.sharedWeights.map((group) => group.id), ['sharedEmbedding', 'sharedLmHead']);
assert.equal(eagleRepresentative.architecture.activationTap.kind, 'activation');
assert.equal(eagleRepresentative.architecture.tensorShapes.input, String.raw`B\times L`);
assert.equal(eagleRepresentative.architecture.tensorShapes.targetKv, String.raw`B\times H_{kv}\times L\times d_h`);
assert.equal(eagleRepresentative.architecture.targetWeights.find((group) => group.id === 'embedding').shape, String.raw`V\times d`);
assert.equal(eagleRepresentative.architecture.targetWeights.find((group) => group.id === 'decoderStack').matrices.length, 5);
assert.equal(eagleRepresentative.architecture.draftWeights.find((group) => group.id === 'fusionProjection').shape, String.raw`(2d)\times d`);
assert.equal(eagleRepresentative.architecture.draftWeights.find((group) => group.id === 'draftDecoder').matrices.length, 4);

const eagleDraftActive = deriveSpeculativeSnapshot({ algorithm: 'eagle2', scenario: 'representative', phase: 'running', step: 0 });
assert.equal(eagleDraftActive.architecture.runtimeStages.find((stage) => stage.id === 'draft').status, 'active');
assert.ok(eagleDraftActive.architecture.draftWeights.every((group) => group.active));
assert.ok(eagleDraftActive.architecture.targetWeights.every((group) => !group.active));

const eagleVerifyActive = deriveSpeculativeSnapshot({ algorithm: 'eagle2', scenario: 'representative', phase: 'running', step: 4 });
assert.equal(eagleVerifyActive.architecture.runtimeStages.find((stage) => stage.id === 'verify').status, 'active');
assert.ok(eagleVerifyActive.architecture.targetWeights.every((group) => group.active));
assert.ok(eagleVerifyActive.architecture.draftWeights.every((group) => !group.active));

const eagleLow = deriveSpeculativeSnapshot({ algorithm: 'eagle2', scenario: 'lowAcceptance', phase: 'done', step: 99 });
assert.deepEqual(eagleLow.committedTokens, ['predict', 'generate']);
assert.equal(eagleLow.hasCorrection, true);
assert.equal(eagleLow.kvLifecycle.acceptedKvCount, 1);
assert.equal(eagleLow.kvLifecycle.correctionToken, 'generate');
assert.equal(eagleLow.kvLifecycle.slots.filter((slot) => slot.state === 'free').length, 7);
assert.ok(eagleLow.speedupEstimate < eagleRepresentative.speedupEstimate, 'lower acceptance must reduce the teaching speedup');

const dsparkRepresentative = deriveSpeculativeSnapshot({ algorithm: 'dspark', scenario: 'representative', phase: 'done', step: 99 });
assert.deepEqual(dsparkRepresentative.committedTokens, ['the', 'future', 'of']);
assert.equal(dsparkRepresentative.anchorToken, 'predict');
assert.equal(dsparkRepresentative.draftedCount, 4);
assert.equal(dsparkRepresentative.verifiedCount, 3);
assert.equal(dsparkRepresentative.wastedCount, 1);
assert.equal(dsparkRepresentative.kvLifecycle.acceptedKvCount, 2);
assert.equal(dsparkRepresentative.kvLifecycle.correctionToken, 'of');
assert.equal(dsparkRepresentative.kvLifecycle.slots.filter((slot) => slot.state === 'free').length, 1);
assert.equal(dsparkRepresentative.candidates.filter((candidate) => candidate.status === 'skipped').length, 1);
assert.ok(dsparkRepresentative.candidates.every((candidate, index, candidates) => index === 0 || candidate.survival < candidates[index - 1].survival));
assert.deepEqual([...dsparkRepresentative.prefixTokens, dsparkRepresentative.anchorToken, ...dsparkRepresentative.committedTokens], ['Large', 'models', 'can', 'predict', 'the', 'future', 'of']);
assert.deepEqual(dsparkRepresentative.architecture.draftWeights.map((group) => group.id), ['featureProjection', 'parallelBackbone', 'markovHead', 'confidenceHead']);
assert.deepEqual(dsparkRepresentative.architecture.targetWeights.map((group) => group.id), eagleRepresentative.architecture.targetWeights.map((group) => group.id));
assert.equal(dsparkRepresentative.architecture.draftWeights.find((group) => group.id === 'featureProjection').shape, String.raw`(Md)\times d`);
assert.deepEqual(dsparkRepresentative.architecture.draftWeights.find((group) => group.id === 'markovHead').matrices.map((matrix) => matrix.shape), [String.raw`V\times r`, String.raw`r\times V`]);
assert.equal(dsparkRepresentative.architecture.draftWeights.find((group) => group.id === 'confidenceHead').shape, String.raw`(d+r)\times1`);

const dsparkIdle = deriveSpeculativeSnapshot({ algorithm: 'dspark', scenario: 'representative', phase: 'idle', step: 0 });
assert.equal(dsparkIdle.architecture.runtimeStages.filter((stage) => stage.status === 'active').length, 0);
assert.ok(dsparkIdle.architecture.runtimeStages.filter((stage) => ['prefill', 'seed'].includes(stage.id)).every((stage) => stage.status === 'passed'));

const dsparkLow = deriveSpeculativeSnapshot({ algorithm: 'dspark', scenario: 'lowAcceptance', phase: 'done', step: 99 });
assert.equal(dsparkLow.verifiedCount, 2);
assert.deepEqual(dsparkLow.committedTokens, ['the', 'next']);
assert.equal(dsparkLow.candidates.filter((candidate) => candidate.status === 'skipped').length, 2);
assert.ok(dsparkLow.verifyCost < dsparkRepresentative.verifyCost, 'confidence scheduling must reduce verified positions');

const normalized = normalizeSpeculativeInput({ algorithm: 'unknown', scenario: 'unknown', phase: 'oops', step: -7 });
assert.deepEqual(normalized, { algorithm: 'eagle2', scenario: 'representative', phase: 'idle', step: 0, raceStep: 0 });

for (const algorithm of ['eagle2', 'dspark']) {
  const raceDone = deriveSpeculativeSnapshot({ algorithm, scenario: 'representative', raceStep: 12 });
  assert.ok(raceDone.race.speculativeCommitted > raceDone.race.baselineCompleted, `${algorithm} must output more tokens within the same representative time budget`);
  assert.ok(raceDone.race.completedCycles >= 3);
}

let lifecycle = deriveSpeculativeSnapshot({ algorithm: 'eagle2', phase: 'idle', step: 0 });
for (let index = 0; index <= lifecycle.maxStep; index += 1) {
  lifecycle = deriveSpeculativeSnapshot({ algorithm: 'eagle2', ...getNextLifecycle(lifecycle) });
  if (lifecycle.phase === 'done') break;
}
assert.equal(lifecycle.phase, 'done');
assert.deepEqual(getNextLifecycle(lifecycle), { phase: 'running', step: 0 });

console.log('Speculative decoding model checks passed.');
