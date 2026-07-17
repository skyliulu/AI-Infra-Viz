# Interaction Model

## Match interaction to the learning object

Choose the smallest interaction grammar that exposes the concept:

| Learning object | Suitable interaction |
|---|---|
| Ordered execution | play, pause, step, scrub, active/passed/pending stages |
| Structure or ownership | select, inspect, lock, highlight relationships |
| State lifecycle | allocate, grow, reuse, evict, commit, reset |
| Algorithm comparison | switch modes on shared inputs and scales |
| Parameter sensitivity | adjust a parameter and derive all consequences immediately |
| Resource or data movement | show locations, direction, transfer, and ownership changes |

Do not invent a timeline for a structural explorer or reduce a real dependency chain to disconnected configuration cards.

## Use one canonical domain model

Store only user-controlled input and genuine lifecycle state. Names may vary by module, but the dependency direction must remain explicit:

```js
const normalizedInput = normalizeInput(userInput);
const snapshot = deriveModuleState(normalizedInput, lifecycleState);
```

The snapshot should contain every fact needed by the views: structure, dimensions, ownership, resource values, current operation, status, and capability boundaries. Compute matrices, counters, memory use, code highlights, and explanatory copy from this snapshot rather than storing duplicate state.

## Classify controls and dependencies

For each control, record whether it is:

- an independent input;
- a derived value that should not be edited directly;
- a constrained input with a documented normalization rule;
- mutually exclusive with another mode;
- a presentation preference that must not change the technical model.

Changing an input must either preserve compatible progress or deterministically reset/remap it. Never silently couple independent controls, and never present a derived constraint as a universal technical law.

## Keep modes structurally truthful

Give each mode its real state shape, dependency order, ownership, and resource consequences. Align stages or dimensions only when they are genuinely comparable. A mode switch that claims a mechanism change must update every affected canvas, metric, formula, code highlight, and explanation.

Distinguish logical intermediates from persistent state. Distinguish a replicated value from a partitioned value, and an unavailable or non-resident component from a component that does not exist.

## Add timeline state only when needed

For a `timeline` capability, include `phase`, `step`, `isPlaying`, and the relevant token, chunk, layer, or event position. Model the real loop:

- finish the current operation before advancing its enclosing token or chunk;
- represent prefill, decode, training, tiling, and parallel work according to their real execution;
- keep exactly one operation active and distinguish `active`, `passed`, `pending`, and `done`;
- stop cleanly at `done` and keep reset, play/pause, step, and scrub consistent;
- pause playback when the user manually inspects a stage.

## Validate large state spaces outside the UI

When controls create many legal combinations, expose pure derivation functions and test invariants without rendering every case. Use browser tests for representative control paths, coupled transitions, and visual evidence rather than as the only correctness mechanism.

## Interaction acceptance questions

1. What learning object does the interaction expose?
2. Which input changed, how was it normalized, and which views derive from it?
3. Is every claimed mode difference visible in the affected layers?
4. Does a timeline follow the real dependency order, if a timeline exists?
5. Can the user explain what a control changed without searching elsewhere?
