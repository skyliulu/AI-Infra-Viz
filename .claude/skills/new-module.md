---
name: new-module
description: >
  Scaffold and implement a new interactive visualization module for LLM-Infra-Explorer.
  Use this skill whenever the user wants to add a new topic, concept, or algorithm as a
  visualization module — even if they just say "add a page for X", "create a visualization
  of Y", or "I want to explain Z interactively". The skill covers the full workflow:
  choosing a topic, registering the route, and writing the component from scratch following
  the project's strict shared conventions.
---

# New Module Skill

This skill walks through creating a new visualization module for LLM-Infra-Explorer end-to-end.
The project has strict shared conventions — every module must conform to them so the codebase stays coherent.
Read the conventions in CLAUDE.md ("Visualization component conventions") before writing any code.

---

## Step 0 — Clarify the topic (if not already clear)

Before writing code, confirm:

1. **What concept** is being visualized? (e.g., "PagedAttention", "Speculative Decoding", "RingAttention")
2. **What is the core tradeoff?** Every module needs a Before/After mode toggle. What are the two modes?
   - Example: Standard KV Alloc ↔ PagedAttention, Naive Decoding ↔ Speculative Decoding
3. **What is the key metric?** One or two numbers that visibly improve when switching to the optimized mode.
   - Example: memory waste %, accepted tokens/step, IO traffic
4. **What are the ~6–10 steps** in the execution flow? Sketch them now — this becomes the state machine.
5. **What Lucide icon** best represents this module?
6. **What accent color** (must be unused by existing modules)?
   - Already used: cyan (LLM), fuchsia (Parallel), emerald (Flash Attn), amber (Flash Decode), rose (Engram), indigo (Radix), sky (DP Attn)

If the user hasn't answered these, ask before proceeding.

---

## Step 1 — Register the route (2 file edits)

### `src/MainDashboard.jsx`

Add the lazy import and TABS entry. Keep alphabetical order within the imports block.

```js
// Add lazy import near the top with the others:
const YourModule = lazy(() => import('./components/YourModule.jsx'));

// Add to TABS array:
{ id: 'yourmodule', label: 'Your Label', icon: YourIcon, component: YourModule },
```

### `src/components/HomeLanding.jsx`

Add a card to the `featureCards` array. The description should answer "what will I understand after using this?" not "what does this show?".

```js
{
  id: 'yourmodule',
  title: { en: 'English Title', zh: '中文标题' },
  description: {
    en: 'One sentence: what insight does the user gain.',
    zh: '一句话：用户能获得什么洞察。',
  },
  icon: YourIcon,
  iconClass: 'text-XXX-300',  // use the chosen accent color
},
```

---

## Step 2 — Write the component file

Create `src/components/YourModule.jsx`. The structure below is mandatory — do not deviate from the skeleton, only fill in the domain-specific content.

### Skeleton

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Globe, Info, /* domain icons */ } from 'lucide-react';

// ─── i18n ────────────────────────────────────────────────────────────────────
// Rules:
// - zh and en must have IDENTICAL keys
// - Every display string in JSX must come from t(key) — no hardcoded text
// - Step labels follow: step0, step1, step2, ...
// - Pseudocode comments follow: pyC1, pyC2, ...
// - Principle panel text follows: pTitle1, pDesc1, pTitle2, pDesc2, ...
const i18n = {
  zh: {
    title: '模块名称可视化',
    subtitle: '核心 tradeoff 一句话描述',
    reset: '重置', play: '播放', pause: '暂停', next: '下一步',
    langToggle: 'EN',
    modeA: '模式A', modeB: '模式B',
    metricLabel: '关键指标',
    step0: '等待开始...',
    step1: '步骤 1：...',
    // ... all steps
    pyC1: '# 注释1',
    // ... all pseudocode comments
    pTitle1: '痛点标题',
    pDesc1: '解释为什么这是个问题，用第一人称叙事。',
    pTitle2: '解法标题',
    pDesc2: '解释方案如何绕过痛点，并量化收益。',
  },
  en: {
    title: 'Module Name Visualization',
    subtitle: 'One-line tradeoff description',
    reset: 'Reset', play: 'Play', pause: 'Pause', next: 'Next',
    langToggle: '中文',
    modeA: 'Mode A', modeB: 'Mode B',
    metricLabel: 'Key Metric',
    step0: 'Waiting to start...',
    step1: 'Step 1: ...',
    // ... mirror all zh keys
    pyC1: '# Comment 1',
    pTitle1: 'Pain Point Title',
    pDesc1: 'Explain why this is a problem. Use first-person narrative.',
    pTitle2: 'Solution Title',
    pDesc2: 'Explain how the solution sidesteps the problem and quantify the gain.',
  },
};

const getInitialLang = () =>
  (typeof navigator !== 'undefined' && navigator.language.toLowerCase().includes('zh')) ? 'zh' : 'en';

// ─── Step snapshot (pure function) ───────────────────────────────────────────
// Maps (step, mode) → all derived render data.
// Rendering must be a pure state→UI mapping: no side effects here.
// Return shape: { highlight: {...}, metric: number|string, isAlert: bool, ... }
const getStepState = (step, mode) => {
  // fill in domain-specific logic
  return { highlight: {}, metric: 0, isAlert: false };
};

// ─── Component ────────────────────────────────────────────────────────────────
const App = () => {
  const MAX_STEPS = 8; // adjust to actual step count

  const [mode, setMode] = useState('modeA');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  const isDone = step >= MAX_STEPS;
  const ss = getStepState(step, mode);

  // Auto-play — delay varies by step to give important frames more time
  useEffect(() => {
    if (!isPlaying || isDone) return;
    const delay = ss.isSpecial ? 1200 : 2200;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, step, mode]);

  const handleNextStep = () => {
    if (!isDone) setStep(s => s + 1);
    else setIsPlaying(false);
  };
  const reset = () => { setIsPlaying(false); setStep(0); };
  const togglePlay = () => { if (isDone) reset(); setIsPlaying(p => !p); };
  const handleModeChange = (m) => { if (m !== mode) { setMode(m); reset(); } };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-4 md:space-y-6">

        {/* ── Top control bar ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200
                        flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center xl:text-left">
            <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center xl:justify-start gap-2 text-indigo-900">
              {/* Replace DomainIcon with your chosen Lucide icon */}
              <DomainIcon className="text-amber-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">{t('subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Mode toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {['modeA', 'modeB'].map(m => (
                <button key={m} onClick={() => handleModeChange(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-all
                    ${mode === m ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t(m)}
                </button>
              ))}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button onClick={reset} title={t('reset')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors">
                <RotateCcw size={15} />
              </button>
              <button onClick={togglePlay}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
                {isPlaying ? <><Pause size={14} />{t('pause')}</> : <><Play size={14} />{t('play')}</>}
              </button>
              <button onClick={handleNextStep} disabled={isDone || isPlaying}
                title={t('next')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors">
                <SkipForward size={15} />
              </button>
            </div>

            {/* Language toggle */}
            <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-400 text-sm text-slate-600 transition-colors">
              <Globe size={14} />{t('langToggle')}
            </button>
          </div>
        </div>

        {/* ── Main body: three columns ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px_280px] gap-4">

          {/* Left: main animation canvas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            {/* Metric bar */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className={`rounded-lg px-3 py-2 border font-medium transition-colors
                ${ss.isAlert
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                  : 'bg-slate-50 border-slate-200 text-indigo-700'}`}>
                {t('metricLabel')}: <span className="font-bold">{ss.metric}</span>
              </div>
            </div>

            {/* === DOMAIN-SPECIFIC VISUALIZATION GOES HERE ===
                Guidelines:
                - Use ss.highlight.XXX to decide which elements are active
                - Active elements: bright accent color (indigo/amber/emerald)
                - Inactive elements: bg-slate-100 border-slate-200
                - Alert state (bottleneck): rose color + ring glow
                - Matrix slices: show dimension labels in font-mono text-[8px]
                - Keep the canvas responsive with flex/grid and min-w-0
            */}
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              {/* Replace with actual visualization */}
              Visualization canvas
            </div>
          </div>

          {/* Center: pseudocode */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Code size={13} /> Python 伪代码
            </h3>
            <div className="font-mono text-[10px] md:text-xs bg-[#0d1117] p-4 rounded-lg border border-slate-800
                            flex-1 leading-relaxed text-slate-400 overflow-x-auto">
              {/* === PSEUDOCODE GOES HERE ===
                  Pattern for each step block:
                    <div className={step === N
                      ? "bg-indigo-900/60 text-indigo-200 px-2 py-1 -mx-2 rounded border-l-2 border-indigo-400"
                      : ""}>
                      <div className="text-indigo-400 font-bold text-[10px] mb-1">{t('pyC1')}</div>
                      <div>  actual_code_here()</div>
                    </div>
                  Use consistent step colors: step1=indigo, step2=amber, step3=pink, step4=purple
              */}
              <div>def your_algorithm(...):</div>
              <div className="mt-2 text-slate-600">  # fill in pseudocode</div>
            </div>
          </div>

          {/* Right: principle analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={13} /> 深度原理解析
            </h3>

            {step === 0 && (
              <div className="text-xs text-slate-400 leading-relaxed mt-1">
                {t('step0')}
              </div>
            )}

            {/* === PRINCIPLE NARRATIVE GOES HERE ===
                Pattern:
                  {step >= N && (
                    <div className="space-y-1.5 animate-[fadeIn_0.3s_ease]">
                      <p className="text-xs font-bold text-indigo-700">{t('pTitleN')}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{t('pDescN')}</p>
                    </div>
                  )}
                - Show sections cumulatively (step >= N, not step === N)
                - Write "why" not "what": explain the insight, not the label
                - First section = pain point (use rose text for alert titles)
                - Last section = quantified benefit
            */}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
```

---

## Step 3 — Fill in the domain content

### Animation canvas checklist
- [ ] At least one element changes highlight color as step advances
- [ ] Pain-point step uses `rose` color + `shadow-[0_0_12px_rgba(244,63,94,0.25)]` glow
- [ ] Key metric value updates dynamically from `ss.metric`
- [ ] Physical layer shown (GPU/HBM/SRAM) if the concept involves hardware
- [ ] Tensor/matrix slices annotated with dimension labels (`font-mono text-[8px]`)

### Pseudocode checklist
- [ ] 4–6 step blocks, each with a colored comment header (`t('pyCN')`)
- [ ] Color progression: step1 = `indigo`, step2 = `amber`, step3 = `pink`, step4 = `purple`
- [ ] Active block has `border-l-2` + `bg-XXX-900/60` highlight
- [ ] All comment text comes from `t()` — fully bilingual

### Principle panel checklist
- [ ] Idle state shows a "click play to start" prompt
- [ ] Sections appear cumulatively (`step >= N`), not one-at-a-time (`step === N`)
- [ ] At least 3 sections: pain point → core mechanism → quantified benefit
- [ ] Text is first-person narrative ("the model must...", "each rank is forced to...")
- [ ] Final section mentions a concrete number (e.g., "4x memory reduction", "O(N) vs O(N²) IO")

### i18n checklist
- [ ] Every `zh` key has an identical `en` counterpart
- [ ] Zero hardcoded display strings in JSX
- [ ] `getInitialLang()` copied verbatim (do not rewrite it)

---

## Step 4 — Verify before shipping

```bash
npm run dev   # must start with zero errors
```

Then manually verify:
1. Module appears in sidebar and HomeLanding grid
2. Play → Pause → Step → Reset all work correctly
3. Switching EN ↔ 中文 immediately updates all text without layout breaks
4. Switching mode (modeA ↔ modeB) resets animation to step 0
5. At mobile width (~375px) the top control bar does not overflow (`flex-wrap` handles it)
6. No `console.error` or React key warnings in browser devtools
