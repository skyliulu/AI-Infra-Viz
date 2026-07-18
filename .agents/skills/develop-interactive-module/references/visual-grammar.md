# Visual Grammar

## Map claims to evidence

Create a compact claim-to-evidence matrix before implementation:

| Claim | Trigger or state | Visible evidence | Boundary snapshot |
|---|---|---|---|
| A resource grows | increase the driving input | calibrated length, count, or occupied slots | empty and maximum |
| Two modes differ structurally | switch mode with shared inputs | components, dimensions, or paths change | representative mode pair |
| Ownership changes | select or advance state | persistent objects change owner or location | before and after transfer |

Every important claim needs an observable consequence. If the consequence exists only in prose, the visual explanation is incomplete.

## Encode claims as visible changes

| Technical claim | Preferred visual evidence |
|---|---|
| Cache or history grows with sequence length | Add addressable slots or extend a calibrated bar |
| Recurrent state has fixed shape | Keep one dimension-labeled container constant while tokens enter it |
| History is compressed | Animate many token contributions merging into one state and remove per-token addresses |
| State is recurrent | Feed the committed new state back as the next step's previous state |
| A gate forgets history | Fade or shrink old-state channels before the current write |
| Data stays individually addressable | Keep separate slots and show query selection |
| Data is moved across memory levels or devices | Animate directional flow between labeled physical locations |
| Work is parallel | Show simultaneous lanes or chunks, not a fast sequential loop |
| Resource use differs | Use a shared scale and dynamically computed values |

If an animation does not reveal a changing variable, dependency, bottleneck, or tradeoff, remove it.

## Make mode differences observable

For every mode switch, review the layers it claims to affect:

- structure and component presence;
- dimensions, capacity, or quantitative scale;
- ownership, residency, or addressability;
- data movement and direction;
- execution stages and implementation evidence.

Change all affected layers, not merely the label, color, or explanatory paragraph. Keep unaffected layers stable so the real difference remains legible.

## Reuse semantic objects

Add secondary explanations such as movement, ownership, warnings, or communication to the primary objects they describe. Draw paths between the existing source and destination components instead of duplicating a second disconnected row of nodes. Keep direction, endpoints, local versus remote scope, and current selection visible.

Preserve semantic identity across synchronized views. Use a shared label, position cue, shape, or stable identity color, then reserve transient styling for activity or status. If an object changes location or representation, make the correspondence observable.

## Compose the canvas

- Show the full pipeline in one canvas when sequence is the teaching object.
- Keep inactive stages visible but subdued so the reader retains the whole mental model.
- Use progressive activation, not page-by-page replacement, for a fixed pipeline.
- Use separate architectural and execution layers only when each answers a distinct question; synchronize them through one state.
- Put local controls beside the affected visualization.

Do not force every chapter into the same panel count. Choose the smallest layout that makes the relationships legible.

## Control information density

- Size matrix and tensor cells from readable values, not from available whitespace.
- Keep labels close to their objects and dimension annotations on the corresponding edge.
- Reduce empty containers, large causal grids, and decorative cards that do not carry proportionate information.
- Let a short panel fill its column vertically when adjacent panels are taller.
- On narrow screens, preserve reading order and avoid page-level horizontal overflow.
- Test component-level overflow as well as page overflow. Dense cards, labels, tracks, formulas, and code blocks must keep `clientWidth` and `scrollWidth` compatible with the intended scrolling behavior.
- Check representative sparse and dense states. A layout that works for one item may fail at maximum count or with longer translated labels.
- Preserve the main teaching region when space tightens; compress secondary controls and metadata before shrinking the core evidence below readability.
- Compare layout with measurable signals such as region-height ratios, unused space, active-object count, wrapping, and overflow. Use thresholds as regression guards, not as universal design targets.

## Separate identity colors from action colors

Assign accessible identity colors to algorithms only when persistent color identity helps comparison. Use separate semantic colors for transient states:

- active execution;
- warning or bottleneck;
- successful completion;
- current write or newly arrived data;
- inactive or future work.

Check contrast on buttons, pale panels, small formulas, lines, sliders, and matrix cells. Do not rely on hue alone; combine color with labels, position, borders, opacity, or icons.

## Limit prose inside the main canvas

Use the canvas for names, dimensions, small values, and short action labels. Move paragraphs, caveats, and derivations to the inspector. A reader should still see the core difference before reading the inspector.

## Avoid these failure modes

- oversized rectangles containing one tiny symbol;
- every completed stage remaining visually active;
- identical animation for algorithms with different execution;
- progress bars without a shared quantitative scale;
- token scrubbers whose changes are not visible elsewhere;
- mode switches that alter text but not the claimed structure or resource;
- secondary diagrams that duplicate the primary semantic objects;
- animation that repeatedly traverses channels only to consume time;
- color palettes with unreadable selected states.
