# Interaction Model

## Canonical state

Use one source of truth for all views:

```js
{
  mode,
  contextMode,     // training | prefill | decode, when relevant
  phase,           // idle | running | done
  tokenIndex,      // or chunkIndex for chunked execution
  step,
  isPlaying,
  sequenceLength,
  dimensions,
  parameters,
}
```

Store only user-controlled or lifecycle state. Compute matrices, counters, memory usage, active code lines, stage status, and explanatory copy through pure snapshot functions.

## Model the real loop

- For autoregressive decode, run the real stages for token `t`, commit its state, then advance to token `t+1`.
- For prefill, represent tile, chunk, or parallel work when that is what the kernel performs. Do not replay a decode loop and label it prefill.
- Give each algorithm its own stage map. Align stages only when the underlying operations are genuinely comparable.
- Distinguish logical intermediates from persistent state. A score matrix used inside a tiled kernel is not automatically persistent KV storage.

## Pipeline status

When showing a complete pipeline, use three visibly different statuses:

- `active`: the only operation executing now;
- `passed`: completed for the current token or chunk;
- `pending`: not yet executed.

Never accumulate active styling across completed stages. A completed stage may remain readable, but must not compete with the active stage.

## Synchronize multiple explanatory layers

If the module has an architectural comparison and a detailed execution board, drive both from the same token and phase. Map the detailed stage to a meaningful architectural event instead of inventing a second timeline.

Changing mode, context, dimensions, or sequence length must reset or deterministically remap incompatible progress. Scrubbing a token must update storage, state contents, memory bars, formulas, code highlights, and narration together.

## Playback behavior

- Make token transitions fast enough that a full demonstration completes without patience becoming the lesson.
- Allow longer delays only for a visually meaningful state transition.
- Stop cleanly at `done`; do not wrap automatically unless looping is an explicit feature.
- Make reset, play/pause, step, and scrubber behavior consistent.
- Preserve manual inspection: clicking a stage pauses playback and shows that snapshot.

## Interaction acceptance questions

1. What real operation does the current animation represent?
2. Which state changed, and which views derive from it?
3. Does the next step follow the algorithm's actual dependency order?
4. Can a user explain what a control changed without searching elsewhere on the page?

