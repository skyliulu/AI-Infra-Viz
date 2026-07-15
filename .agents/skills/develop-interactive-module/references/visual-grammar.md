# Visual Grammar

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
- animation that repeatedly traverses channels only to consume time;
- color palettes with unreadable selected states.

