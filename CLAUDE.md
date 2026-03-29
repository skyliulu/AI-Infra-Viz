# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start development server (Vite, hot reload)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test suite exists. Validate changes visually via `npm run dev`.

## Architecture

**LLM-Infra-Explorer** is a React SPA for interactively visualizing LLM infrastructure concepts. It deploys as a static site to GitHub Pages.

**Stack:** React 18 + Vite + Tailwind CSS + Framer Motion + Lucide React

### Navigation flow

`main.jsx` → `App.jsx` → `MainDashboard.jsx` (sidebar + tab routing) → individual visualization components

`MainDashboard` manages which tab is active via local `useState`. Clicking a card on `HomeLanding` navigates to the corresponding visualization. The sidebar is collapsible on mobile.

### Visualization modules (`src/components/`)

Each file is a self-contained, interactive visualization:

| Component | Concept |
|---|---|
| `LLMInference.jsx` | Token prefill/decode, KV cache lifecycle, MoE vs Dense, temperature sampling |
| `ParallelStrategies.jsx` | 6D parallel topology (DP/TP/PP/CP/EP/ETP), tensor slicing, GPU mapping |
| `FlashAttention.jsx` | Tiled attention vs standard, SRAM/HBM IO tracking |
| `FlashDecode.jsx` | KV cache splitting, parallel reduction |
| `Engram.jsx` | DeepSeek n-gram memory retrieval, async prefetch |
| `RadixCache.jsx` | SGLang radix tree KV cache, LRU eviction, block reuse |
| `DpAttention.jsx` | DP/TP hybrid attention, KV cache sharding, cross-rank communication |

### Styling conventions

- Dark theme throughout: `bg-slate-950`, `text-slate-100`
- Framer Motion for animated transitions (`motion.div`, `AnimatePresence`)
- `clsx` + `tailwind-merge` for conditional class composition
- Responsive breakpoints: `md:` for sidebar/layout changes

### Visualization component conventions

Every visualization component (`src/components/*.jsx`) follows a strict set of shared patterns. Read these before touching any component.

**Theme:** Components use light mode internally (`bg-slate-50 text-slate-800`, cards as `bg-white border border-slate-200`), contrasting with the dark shell. This "entering a workbench" feel is intentional.

**Top control bar structure (fixed, every component):**
1. Title + subtitle (left)
2. Mode toggle pill — e.g. Standard vs Flash, Dense vs MoE (`bg-slate-100 p-1 rounded-lg`)
3. Playback controls: `RotateCcw` reset · `Play/Pause` · `SkipForward` step
4. Language toggle: `Globe` icon + EN/中文 buttons

**i18n pattern:** All text goes through `t(key)`. Every component has a top-level `i18n = { zh: {...}, en: {...} }` object where `zh` and `en` keys are identical. Language is initialized via `getInitialLang()` (`navigator.language` check). Never hardcode display strings in JSX.

**State machine (identical across all components):**
```js
const [phase, setPhase] = useState('idle');   // 'idle' | 'running' | 'done'
const [step, setStep] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
// Required: handleNextStep(), reset(), togglePlay()
```

**Auto-play pattern:**
```js
useEffect(() => {
  if (!isPlaying || isDone) return;
  const timer = setTimeout(handleNextStep, delay); // delay varies per step
  return () => clearTimeout(timer);
}, [isPlaying, step, ...deps]);
```

**Step snapshot pattern:** Use a pure `getXxxState(step)` function that maps step number → all derived render data. Rendering is always a pure `state → UI` mapping with no side effects.

**Multi-panel layout:** Left = main animation canvas · Center = pseudocode (`bg-[#0d1117]`, active block highlighted with colored left border + translucent bg) · Right = principle analysis panel (white card, `Info` icon, narrative "why" text per step).

**Color semantics:**
- Active/highlighted: `indigo` / `amber` / `emerald`
- Alert/bottleneck: `rose` with `ring` glow (`shadow-[0_0_15px_rgba(244,63,94,0.5)]`)
- Optimal/done: `emerald` / `green`
- Inactive: `bg-slate-100 border-slate-200`
- Pseudocode bg: `bg-[#0d1117]`

**Visualization principles:**
- Every module offers a Before/After mode toggle to make the tradeoff visceral
- Show "pain point" (alert state) before showing the solution
- Display both logical layer (algorithm/math) and physical layer (GPU/HBM/SRAM)
- Matrix/tensor slices: active chunk highlighted, inactive chunks `bg-slate-100`; dimension labels in `font-mono text-[8px]`
- Metrics (IO traffic, hit rate, memory blocks) are computed dynamically from `step`, never stored in state

**To add a new module**, use the `/new-module` skill.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. The Vite base path is relative (`./`) so the build works at any deployment path.
