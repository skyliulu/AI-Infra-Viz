import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, ArrowDown, CornerDownRight, Network, Repeat, SlidersHorizontal, Orbit, Globe } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';

const i18n = {
  zh: {
    title: 'LLM 推理全景可视化',
    subtitle: '从 Prefill 到 Decode：观察逐层注意力、KV Cache、稀疏路由与采样',
    reset: '重置',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    langToggle: 'EN',
    language: '切换语言',
    dense: 'Dense (稠密)',
    moe: 'MoE (稀疏)',
    adjustRandomness: '调整生成随机性',
    tempLabel: '温度',
    sequenceTitle: '序列 (Sequence) - 观察自回归回路',
    promptLabel: 'Prompt (输入提示词):',
    generationLabel: 'Generation (模型生成):',
    kvCacheTitle: 'KV Cache (显存)',
    slots: '槽位',
    modelPipeline: '模型内部流水线',
    moeArch: 'MoE 架构 (MoE Architecture)',
    denseArch: '稠密架构 (Dense Architecture)',
    prefill: 'Prefill',
    decode: 'Decode',
    currentInput: '当前输入: [完整 Prompt - 6 个 Token]',
    autoRegInput: '自回归输入:',
    asInput: '作为输入',
    ropeWait: '等待输入序列...',
    ropePrefill: '依据绝对位置 m 进行多维旋转',
    ropeDecode: '当前生成词绝对位置: m=',
    transformerBlock: 'Transformer 层循环（32 层）',
    loopingLayer: '当前层：',
    inputEmbedding: '输入嵌入',
    embeddingOutput: '输出',
    maskedSelfAttention: '因果自注意力（含 RoPE）',
    denseFfn: 'Dense 前馈网络（MLP）',
    sparseMoeLayer: '稀疏 MoE 层',
    moeEnabled: 'MoE 已启用',
    cachedToken: '已缓存 Token',
    emptyCacheSlot: '空闲槽位',
    top2Fusion: 'Top-2 融合:',
    waitingRouter: '等待 Router 打分分发...',
    lmHeadSample: 'LM Head & 温度采样',
    probDist: '采样概率分布 (Softmax)',
    predDone: '预测完成 ✓',
    waitStack: '等待层循环堆叠完成...',
    waitCalc: '等待计算...',
    codeTitle: '底层代码',
    pyCode: '(Python 伪代码)',
    c_emb1: '# Embedding',
    c_emb2: '# [L, d]',
    c_rope1: '# RoPE 在每层 Attention 内旋转 Q/K',
    c_rope2: '# positions 为绝对位置',
    c_loop1: '# 层循环堆叠',
    c_attn1: '# 注意力与 KV Cache',
    c_ffn1: '# Dense FFN',
    c_ffn2: '# 残差连接并进入下一层',
    c_moe1: '# Sparse MoE: 路由分发',
    c_moe2: '# 残差连接',
    c_lm1: '# LM Head & 温度采样',
    c_lm2: '# 映射到词表',
    c_lm3: '# 温度调整缩放',
    stateTitle: '当前微观执行状态',
    waitStartMsg1: '等待开始。当前选择：',
    moeSparse: 'MoE 稀疏架构',
    denseDense: 'Dense 稠密架构',
    waitStartMsg2: '。请点击“播放”。',
    stateEmbTitle: 'Embedding 阶段',
    stateEmbPrefill: '并行读取整个 Prompt。',
    stateEmbDecode: '【自回归现象】提取上轮生成的 Token 作为当前唯一输入。',
    stateRopeTitle: '层内 RoPE',
    stateRopeDesc1: '每层先投影自己的 Q/K/V，再用绝对位置旋转该层的 Q 与 K。',
    stateRopeDesc2: 'RoPE 不是 Embedding 后只执行一次的全局阶段。',
    stateAttnTitle: '层内 Attention、RoPE 与缓存',
    stateAttnPrefill: '本层并行生成 Q/K/V，对 Q/K 应用 RoPE，再把本层 K/V 写入对应 KV Cache。',
    stateAttnDecode: '本层为当前 token 生成 Q/K/V，对 Q/K 应用 RoPE，写入一个新 KV 槽位并读取该层全部历史缓存。',
    stateDenseTitle: 'Dense FFN',
    stateDenseDesc: '全量激活巨大的矩阵网络提取知识特征。',
    stateMoeTitle: 'MoE 稀疏路由',
    stateMoeDesc1: 'Router 对 8 个专家进行打分，仅激活 ',
    stateMoeDesc2: ' 专家进行推理，最后加权融合。',
    stateLoopTitle: '逐层 Transformer 执行',
    stateLoopDesc1: '每层严格执行 Attention（含本层 RoPE）再执行 FFN/MoE，并通过残差把结果交给下一层。当前层：',
    stateLoopDesc2: '',
    stateLoopDesc3: '',
    stateLoopDesc4: '。完成第 32 层后才进入 LM Head。',
    stateLmTitle: 'LM Head & 温度采样',
    stateLmDesc1: '特征被映射为涵盖整个词表的 Logits (得分)。',
    stateLmDesc2: '温度(T)缩放：',
    stateLmDesc3: '你可以拖动上方滑块试试！',
    stateLmDesc4: '放大概率差异，使采样更集中于高概率 token。',
    stateLmDesc5: '缩小概率差异，提高低概率 token 被采样的机会。',
    stateDoneTitle: 'Token 生成完毕',
    stateDoneDesc: '通过采样掷骰子选中下一个词，准备丢回起点循环。',
    routerMatrix: 'Router 矩阵'
  },
  en: {
    title: 'LLM Inference Panorama',
    subtitle: 'From Prefill to Decode: inspect per-layer attention, KV cache, sparse routing, and sampling',
    reset: 'Reset',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    langToggle: '中文',
    language: 'Switch language',
    dense: 'Dense',
    moe: 'MoE (Sparse)',
    adjustRandomness: 'Adjust generation randomness',
    tempLabel: 'Temperature',
    sequenceTitle: 'Sequence - Observe Autoregressive Loop',
    promptLabel: 'Prompt (Input):',
    generationLabel: 'Generation (Model Output):',
    kvCacheTitle: 'KV Cache (Memory)',
    slots: 'Slots',
    modelPipeline: 'Model Internal Pipeline',
    moeArch: 'MoE Architecture',
    denseArch: 'Dense Architecture',
    prefill: 'Prefill',
    decode: 'Decode',
    currentInput: 'Current Input: [Full Prompt - 6 Tokens]',
    autoRegInput: 'Autoregressive Input:',
    asInput: 'As Input',
    ropeWait: 'Waiting for input sequence...',
    ropePrefill: 'Multi-dimensional rotation by absolute pos m',
    ropeDecode: 'Current generated token abs pos: m=',
    transformerBlock: 'Transformer layer loop (32 layers)',
    loopingLayer: 'Current layer: ',
    inputEmbedding: 'Input embedding',
    embeddingOutput: 'Output',
    maskedSelfAttention: 'Causal self-attention (with RoPE)',
    denseFfn: 'Dense feed-forward network (MLP)',
    sparseMoeLayer: 'Sparse MoE layer',
    moeEnabled: 'MoE enabled',
    cachedToken: 'Cached token',
    emptyCacheSlot: 'Empty slot',
    top2Fusion: 'Top-2 Fusion:',
    waitingRouter: 'Waiting for Router scoring...',
    lmHeadSample: 'LM Head & Temp Sampling',
    probDist: 'Probability Distribution (Softmax)',
    predDone: 'Prediction Done ✓',
    waitStack: 'Waiting for layer loop stacking...',
    waitCalc: 'Waiting for calculation...',
    codeTitle: 'Underlying Code',
    pyCode: '(Python Pseudocode)',
    c_emb1: '# Embedding',
    c_emb2: '# [L, d]',
    c_rope1: '# Apply RoPE to Q/K inside every attention layer',
    c_rope2: '# positions are absolute token positions',
    c_loop1: '# Layer stacking loop',
    c_attn1: '# Attention & KV Cache',
    c_ffn1: '# Dense FFN',
    c_ffn2: '# Residual connection & next layer',
    c_moe1: '# Sparse MoE: Routing distribution',
    c_moe2: '# Residual connection',
    c_lm1: '# LM Head & Temp Sampling',
    c_lm2: '# Map to vocabulary',
    c_lm3: '# Temperature scaling',
    stateTitle: 'Current Micro Execution State',
    waitStartMsg1: 'Waiting to start. Current selection: ',
    moeSparse: 'MoE Sparse Architecture',
    denseDense: 'Dense Architecture',
    waitStartMsg2: '. Please click "Play".',
    stateEmbTitle: 'Embedding Phase',
    stateEmbPrefill: 'Read the entire Prompt in parallel.',
    stateEmbDecode: '[Autoregressive] Extract the last generated token as the sole input.',
    stateRopeTitle: 'Per-layer RoPE',
    stateRopeDesc1: 'Each layer first projects its own Q/K/V, then rotates that layer\'s Q and K using absolute positions.',
    stateRopeDesc2: 'RoPE is not a one-off global stage after embedding.',
    stateAttnTitle: 'Per-layer attention, RoPE, and cache',
    stateAttnPrefill: 'This layer projects Q/K/V in parallel, applies RoPE to Q/K, and writes the layer\'s K/V to its KV cache.',
    stateAttnDecode: 'This layer projects Q/K/V for the current token, applies RoPE to Q/K, appends one KV slot, and reads the layer\'s historical cache.',
    stateDenseTitle: 'Dense FFN',
    stateDenseDesc: 'Fully activate the massive matrix network to extract knowledge features.',
    stateMoeTitle: 'MoE Sparse Routing',
    stateMoeDesc1: 'Router scores 8 experts and activates only ',
    stateMoeDesc2: ' experts for inference, followed by weighted fusion.',
    stateLoopTitle: 'Per-layer Transformer execution',
    stateLoopDesc1: 'Every layer runs attention (including that layer\'s RoPE) and then FFN/MoE, passing the residual result to the next layer. Current layer: ',
    stateLoopDesc2: '',
    stateLoopDesc3: '',
    stateLoopDesc4: '. LM Head starts only after layer 32 completes.',
    stateLmTitle: 'LM Head & Temp Sampling',
    stateLmDesc1: 'Features are mapped to Logits (scores) covering the entire vocabulary.',
    stateLmDesc2: 'Temp(T) Scaling: ',
    stateLmDesc3: 'Drag the slider above to try it!',
    stateLmDesc4: 'amplifies probability differences and concentrates sampling on high-probability tokens.',
    stateLmDesc5: 'shrinks probability differences and raises the chance of sampling lower-probability tokens.',
    stateDoneTitle: 'Token Generation Complete',
    stateDoneDesc: 'Select the next word via probability sampling and throw it back to the start of the loop.',
    routerMatrix: 'Router Matrix'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

// 模拟 Router 动态打分与选择
const MOCK_EXPERT_ROUTING = [
  { topK: [2, 5], weights: [0.72, 0.28] }, { topK: [1, 7], weights: [0.61, 0.39] },
  { topK: [0, 4], weights: [0.53, 0.47] }, { topK: [3, 6], weights: [0.82, 0.18] },
  { topK: [2, 7], weights: [0.61, 0.39] }, { topK: [0, 5], weights: [0.53, 0.47] }
];

const TOTAL_LAYERS = 32; // 模拟如 Llama-3 常见的 32 层 Transformer Block

const MODULE = {
  idle: 0,
  embedding: 1,
  attention: 2,
  ffn: 3,
  lmHead: 5,
  tokenDone: 6,
};

const getStageStatus = (stage, activeModule) => {
  if (activeModule === MODULE.idle) return 'pending';
  if (stage === 'embedding') return activeModule === MODULE.embedding ? 'active' : 'passed';
  if (stage === 'attention') {
    if (activeModule === MODULE.attention) return 'active';
    return activeModule > MODULE.attention ? 'passed' : 'pending';
  }
  if (stage === 'ffn') {
    if (activeModule === MODULE.ffn) return 'active';
    return activeModule > MODULE.ffn ? 'passed' : 'pending';
  }
  if (activeModule === MODULE.lmHead) return 'active';
  return activeModule === MODULE.tokenDone ? 'passed' : 'pending';
};

const getInferenceState = ({ phase, activeModule, currentLayer, step, promptLength }) => ({
  isLayerStage: activeModule === MODULE.attention || activeModule === MODULE.ffn,
  positionFormula: phase === 'prefill'
    ? String.raw`p=0,\ldots,${promptLength - 1}`
    : String.raw`p=${promptLength + step}`,
  kvCacheSize: phase === 'idle'
    ? 0
    : phase === 'prefill'
      ? (activeModule >= MODULE.attention ? promptLength : 0)
      : promptLength + step - 1 + (activeModule >= MODULE.attention ? 1 : 0),
  stageStatus: {
    embedding: getStageStatus('embedding', activeModule),
    attention: getStageStatus('attention', activeModule),
    ffn: getStageStatus('ffn', activeModule),
    lmHead: getStageStatus('lmHead', activeModule),
  },
  layerProgress: `${currentLayer} / ${TOTAL_LAYERS}`,
});

const App = () => {
  const [modelType, setModelType] = useState('moe');
  const [temperature, setTemperature] = useState(1.0);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  
  // Embedding 只运行一次；随后每层按 Attention（含 RoPE）→ FFN/MoE 执行。
  const [activeModule, setActiveModule] = useState(MODULE.idle);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState(getInitialLang());
  const t = (k) => i18n[lang][k] ?? k;

  // 根据语言动态提供 Token 与 Prompt 数据
  const { promptTokens, generatedTokens } = useMemo(() => {
    if (lang === 'zh') {
      return {
        promptTokens: ["人工", "智能", "的", "发展", "将", "会"],
        generatedTokens: [
          { token: "带来", probs: [{t: "带来", p: 0.85}, {t: "导致", p: 0.10}, {t: "让", p: 0.05}] },
          { token: "深远", probs: [{t: "深远", p: 0.72}, {t: "巨大", p: 0.20}, {t: "很多", p: 0.08}] },
          { token: "的", probs: [{t: "的", p: 0.99}, {t: "地", p: 0.005}, {t: "得", p: 0.005}] },
          { token: "变革", probs: [{t: "变革", p: 0.65}, {t: "影响", p: 0.30}, {t: "改变", p: 0.05}] },
          { token: "。", probs: [{t: "。", p: 0.95}, {t: "！", p: 0.03}, {t: "？", p: 0.02}] },
          { token: "<EOS>", probs: [{t: "<EOS>", p: 0.99}, {t: "\n", p: 0.01}] }
        ]
      };
    } else {
      return {
        promptTokens: ["The", " develop", "ment", " of", " AI", " will"],
        generatedTokens: [
          { token: " bring", probs: [{t: " bring", p: 0.85}, {t: " cause", p: 0.10}, {t: " let", p: 0.05}] },
          { token: " profound", probs: [{t: " profound", p: 0.72}, {t: " massive", p: 0.20}, {t: " many", p: 0.08}] },
          { token: " changes", probs: [{t: " changes", p: 0.99}, {t: " impacts", p: 0.005}, {t: " shifts", p: 0.005}] },
          { token: " to", probs: [{t: " to", p: 0.65}, {t: " for", p: 0.30}, {t: " in", p: 0.05}] },
          { token: " society.", probs: [{t: " society.", p: 0.95}, {t: " world.", p: 0.03}, {t: " us.", p: 0.02}] },
          { token: "<EOS>", probs: [{t: "<EOS>", p: 0.99}, {t: "\n", p: 0.01}] }
        ]
      };
    }
  }, [lang]);

  // 1. 自动播放只调用同一个单步状态机；暂停后不会再有独立层计时器推进。
  useEffect(() => {
    if (!isPlaying || phase === 'done') return undefined;
    const isEdgeLayer = currentLayer === 1 || currentLayer === TOTAL_LAYERS;
    let delay = 450;
    if (activeModule === MODULE.idle) delay = 300;
    if (activeModule === MODULE.attention || activeModule === MODULE.ffn) {
      delay = isEdgeLayer ? (activeModule === MODULE.ffn && modelType === 'moe' ? 400 : 300) : 12;
    }
    if (activeModule === MODULE.lmHead) delay = 700;
    if (activeModule === MODULE.tokenDone) delay = 700;
    const timer = setTimeout(handleNextStep, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, activeModule, step, modelType, currentLayer]);

  const handleNextStep = () => {
    if (phase === 'idle') {
      setPhase('prefill');
      setStep(0);
      setActiveModule(MODULE.embedding);
      setCurrentLayer(1);
      return;
    }
    if (phase === 'done') return;
    if (activeModule === MODULE.embedding) {
      setActiveModule(MODULE.attention);
    } else if (activeModule === MODULE.attention) {
      setActiveModule(MODULE.ffn);
    } else if (activeModule === MODULE.ffn) {
      if (currentLayer < TOTAL_LAYERS) {
        setCurrentLayer((layer) => layer + 1);
        setActiveModule(MODULE.attention);
      } else {
        setActiveModule(MODULE.lmHead);
      }
    } else if (activeModule === MODULE.lmHead) {
      setActiveModule(MODULE.tokenDone);
    } else if (activeModule === MODULE.tokenDone && phase === 'prefill') {
      setPhase('decode');
      setStep(1);
      setActiveModule(MODULE.embedding);
      setCurrentLayer(1);
    } else if (activeModule === MODULE.tokenDone && phase === 'decode') {
      if (step + 1 < generatedTokens.length) {
        setStep((tokenStep) => tokenStep + 1);
        setActiveModule(MODULE.embedding);
        setCurrentLayer(1);
      } else {
        setPhase('done');
        setActiveModule(MODULE.tokenDone);
        setIsPlaying(false);
      }
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setStep(0);
    setActiveModule(MODULE.idle);
    setCurrentLayer(1);
  };

  const togglePlay = () => {
    if (phase === 'done') {
      setPhase('idle');
      setStep(0);
      setActiveModule(MODULE.idle);
      setCurrentLayer(1);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((playing) => !playing);
  };

  const handleModelTypeChange = (type) => {
    if (type !== modelType) {
      setModelType(type);
      reset();
    }
  };

  const handleTemperatureChange = (event) => {
    setTemperature(parseFloat(event.target.value));
  };

  // 2. 动态计算带温度的概率 (Temperature Scaling)
  const currentProbs = activeModule >= MODULE.lmHead ? generatedTokens[step].probs : null;
  const displayProbs = useMemo(() => {
    if (!currentProbs) return null;
    if (temperature === 1.0) return currentProbs; // T=1 时保持原样
    // 温度公式：p_i^(1/T) 然后重新归一化
    const adjusted = currentProbs.map(p => ({ ...p, weight: Math.pow(p.p, 1 / temperature) }));
    const sum = adjusted.reduce((acc, p) => acc + p.weight, 0);
    return adjusted.map(p => ({ t: p.t, p: p.weight / sum }));
  }, [currentProbs, temperature]);

  const inferenceState = getInferenceState({
    phase,
    activeModule,
    currentLayer,
    step,
    promptLength: promptTokens.length,
  });
  const { kvCacheSize, stageStatus, isLayerStage, positionFormula, layerProgress } = inferenceState;

  const renderTokens = (tokens, isInput) => (
    <div className="flex flex-wrap gap-2 mb-4">
      {tokens.map((token, index) => {
        let isHighlight = phase === 'prefill' && activeModule === MODULE.embedding && isInput;
        let isProcessed = false;
        let isJustGenerated = false;
        let isAutoRegressiveInput = false;

        if (isInput) {
          isProcessed = phase !== 'idle' && !(phase === 'prefill' && activeModule < MODULE.attention);
        } else {
          if (index > step || (index === step && activeModule < MODULE.lmHead)) return null;
          if (index < step) {
            isProcessed = true; 
            if (phase === 'decode' && index === step - 1 && activeModule === MODULE.embedding) isAutoRegressiveInput = true;
          } else if (index === step && activeModule >= MODULE.lmHead) {
            isProcessed = true; 
            isJustGenerated = activeModule === MODULE.lmHead || activeModule === MODULE.tokenDone;
          }
        }

        return (
          <div key={index} className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-300 relative
            ${isInput ? 'border-blue-200' : 'border-green-200'}
            ${isHighlight ? 'scale-110 shadow-lg ring-4 ring-opacity-50 z-10 bg-blue-500 text-white ring-blue-300 border-blue-500' : ''}
            ${isAutoRegressiveInput ? 'scale-110 bg-indigo-600 text-white ring-4 ring-indigo-300 border-indigo-500 shadow-xl z-20 animate-pulse' : ''}
            ${isJustGenerated ? 'scale-105 bg-green-100 border-green-400 text-green-800 ring-2 ring-green-200 shadow-md' : ''}
            ${isProcessed && !isHighlight && !isAutoRegressiveInput && !isJustGenerated ? (isInput ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800') : ''}
            ${!isProcessed && !isHighlight && !isAutoRegressiveInput && !isJustGenerated ? 'bg-gray-50 text-gray-400 border-gray-200' : ''}
          `}>
            {isAutoRegressiveInput && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-indigo-600 whitespace-nowrap animate-bounce flex items-center gap-1">
                {t('asInput')} <CornerDownRight size={12} />
              </div>
            )}
            {token}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 lg:p-6 selection:bg-indigo-100">
      <div className="max-w-[90rem] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-indigo-900">
              <Zap className="text-amber-500" />
              {t('title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* 采样温度滑块 (Temperature) */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 mr-2" title={t('adjustRandomness')}>
              <SlidersHorizontal size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-purple-800">{t('tempLabel')} (<MathFormula>{String.raw`T`}</MathFormula>)</span>
              <input aria-label={t('adjustRandomness')} type="range" min="0.1" max="2.0" step="0.1" value={temperature} onInput={handleTemperatureChange} onChange={handleTemperatureChange} className="w-20 accent-purple-500" />
              <span className="text-xs font-mono font-bold text-purple-700 w-6 text-right">{temperature.toFixed(1)}</span>
            </div>

            {/* Model Type Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
              <button aria-pressed={modelType === 'dense'} onClick={() => handleModelTypeChange('dense')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'dense' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {t('dense')}
              </button>
              <button aria-pressed={modelType === 'moe'} onClick={() => handleModelTypeChange('moe')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-all ${modelType === 'moe' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                <Network size={14} /> {t('moe')}
              </button>
            </div>

            <button aria-label={t('language')} onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))} className="px-2 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1"><Globe size={16} /> {t('langToggle')}</button>
            <button type="button" aria-label={t('reset')} title={t('reset')} onClick={reset} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"><RotateCcw size={18} /></button>
            <button type="button" aria-label={t(isPlaying ? 'pause' : 'play')} title={t(isPlaying ? 'pause' : 'play')} onClick={togglePlay} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition hover:bg-blue-700">
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" aria-label={t('next')} title={t('next')} onClick={() => { setIsPlaying(false); handleNextStep(); }} disabled={isPlaying || phase === 'done'} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 顶层：序列与 KV Cache 并排布局 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* 左侧：Sequence */}
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlignLeft className="text-indigo-500" size={20} />
                  {t('sequenceTitle')}
                </h2>
                <div className="mb-2 text-sm text-slate-500 font-medium">{t('promptLabel')}</div>
                {renderTokens(promptTokens, true)}
                <div className="mt-8 mb-2 text-sm text-slate-500 font-medium">{t('generationLabel')}</div>
                <div className="min-h-[60px]">
                  {renderTokens(generatedTokens.map(t => t.token), false)}
                </div>
              </div>

              {/* 右侧：KV Cache */}
              <div className="border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-12">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="text-indigo-500" size={20} /> {t('kvCacheTitle')}
                </h2>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold text-indigo-600">{kvCacheSize}</span>
                  <span className="text-slate-500 text-sm mb-1">/ {promptTokens.length + generatedTokens.length - 1} {t('slots')}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-6">
                  {Array.from({ length: promptTokens.length + generatedTokens.length - 1 }).map((_, i) => (
                    <div key={i} className={`h-8 md:h-10 flex-1 rounded-sm transition-all duration-300 ${i < kvCacheSize ? (i < promptTokens.length ? 'bg-blue-400' : 'bg-green-400') : 'bg-slate-100'}`} title={i < kvCacheSize ? `${t('cachedToken')} ${i + 1}` : t('emptyCacheSlot')}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 中间层：流水线与底层代码 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* 左侧：模型内部流水线 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full flex flex-col min-w-0">
               <h2 className="text-lg font-semibold mb-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu className="text-indigo-500" size={20} /> {t('modelPipeline')}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-mono ${modelType === 'moe' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {modelType === 'moe' ? t('moeArch') : t('denseArch')}
                </span>
              </h2>

              <div className="relative p-4 md:p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 flex-1 overflow-x-auto">
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all
                    ${phase === 'prefill' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                    {t('prefill')}
                  </span>
                </div>
                <div className="absolute top-4 right-4 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all
                    ${phase === 'decode' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                    {t('decode')}
                  </span>
                </div>

                <div className={`mx-auto w-full max-w-sm mt-10 md:mt-12 rounded-xl p-3 md:p-4 flex flex-col relative transition-all duration-500 shadow-xl border bg-white
                  ${phase === 'prefill' ? 'border-amber-300 ring-4 ring-amber-400/20' : phase === 'decode' ? 'border-emerald-300 ring-4 ring-emerald-400/20' : 'border-slate-200'}`}
                >
                  <div className="text-center mb-4 h-8 flex items-center justify-center">
                    {phase === 'prefill' && activeModule > MODULE.idle && <span className="text-xs md:text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-fade-in">{t('currentInput')}</span>}
                    {phase === 'decode' && activeModule > MODULE.idle && step > 0 && <span className="text-xs md:text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-2 animate-fade-in"><CornerDownRight size={14} /> {t('autoRegInput')} "{generatedTokens[step-1].token}"</span>}
                  </div>
                  
                  <div className="relative z-10 flex flex-col">
                    {(() => {
                      const L_seq = phase === 'idle' ? "?" : (phase === 'prefill' ? promptTokens.length : 1);
                      const L_cache = phase === 'idle' ? "?" : (phase === 'prefill' ? promptTokens.length : promptTokens.length + step);
                      const seqColorClass = phase === 'prefill' ? 'text-amber-600' : (phase === 'decode' ? 'text-emerald-600' : 'text-slate-400');
                      const currentRouting = MOCK_EXPERT_ROUTING[Math.min(step, MOCK_EXPERT_ROUTING.length - 1)];

                      return (
                        <>
                          {/* Module 1: Embedding */}
                          <div data-stage-status={stageStatus.embedding} className={`p-2 rounded border transition-all duration-300 shadow-sm ${stageStatus.embedding === 'active' ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 scale-105 z-10' : stageStatus.embedding === 'passed' ? 'bg-emerald-50 border-emerald-200 opacity-90' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`font-semibold text-xs md:text-sm text-center ${stageStatus.embedding === 'active' ? 'text-indigo-900' : stageStatus.embedding === 'passed' ? 'text-emerald-800' : 'text-slate-500'}`}>{t('inputEmbedding')}</div>
                            <div className="mt-2 text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-indigo-100 flex flex-col gap-1">
                              <div className="flex justify-between px-1">
                                <span className="tracking-wide text-[11px] md:text-[13px]"><MathFormula>{String.raw`X=\operatorname{Embed}(\text{tokens})`}</MathFormula></span>
                                <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}><MathFormula>{String.raw`${L_seq}\times d`}</MathFormula></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule === MODULE.embedding ? 'text-indigo-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                          {/* --- 层堆叠循环框 (Transformer Block) --- */}
                          <div className={`border-2 rounded-xl p-2 relative transition-all duration-300 mt-2 mb-2 ${isLayerStage ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 border-dashed'}`}>
                             <div className="absolute -left-2 -top-3 bg-white px-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 rounded border border-slate-200">
                               <Repeat size={12} className={isLayerStage ? 'text-amber-500' : ''}/>
                               {t('transformerBlock')}
                             </div>
                             
                             {/* 光速循环层数指示器 */}
                             {isLayerStage && (
                               <div className="absolute right-2 -top-4 bg-amber-500 text-white px-3 py-0.5 rounded-full text-[11px] font-bold shadow-lg animate-pulse flex items-center gap-1">
                                 <Zap size={12}/> {t('loopingLayer')}{layerProgress}
                               </div>
                             )}

                            {/* Module 2: Attention */}
                            <div data-stage-status={stageStatus.attention} className={`mt-3 p-2 rounded border transition-all duration-300 shadow-sm ${stageStatus.attention === 'active' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 scale-105 z-10 shadow-lg' : stageStatus.attention === 'passed' ? 'bg-emerald-50 border-emerald-200 opacity-90' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                              <div className={`font-semibold text-xs md:text-sm mb-2 text-center flex items-center justify-center gap-1 ${stageStatus.attention === 'active' ? 'text-blue-900' : stageStatus.attention === 'passed' ? 'text-emerald-800' : 'text-slate-500'}`}><Orbit size={14} className={stageStatus.attention === 'active' ? 'animate-spin' : ''}/>{t('maskedSelfAttention')}</div>
                              <div className="text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-blue-100 flex flex-col gap-1.5">
                                <div className="flex justify-between px-1">
                                  <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`Q,K,V=XW_Q,XW_K,XW_V`}</MathFormula></span>
                                  <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}><MathFormula>{String.raw`${L_seq}\times d`}</MathFormula></span>
                                </div>
                                <div className={`flex justify-between items-center px-1 md:px-2 py-0.5 rounded border -mx-1 ${stageStatus.attention === 'active' ? 'bg-fuchsia-50 border-fuchsia-200' : 'border-transparent'}`}>
                                  <span className={`text-[11px] md:text-[13px] tracking-wide ${stageStatus.attention === 'active' ? 'text-fuchsia-900' : 'text-slate-600'}`}><MathFormula>{String.raw`Q',K'=\operatorname{RoPE}(Q,K;\,p)`}</MathFormula></span>
                                  <span className="text-fuchsia-700 font-bold text-[10px]"><MathFormula>{positionFormula}</MathFormula></span>
                                </div>
                                <div className="flex justify-between px-1">
                                  <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`A=\operatorname{softmax}(Q'K_{\mathrm{cache}}^{\prime\top}/\sqrt{d_k})V_{\mathrm{cache}}`}</MathFormula></span>
                                  <span className="text-slate-600 font-bold text-xs"><MathFormula>{String.raw`${L_seq}\times ${L_cache}`}</MathFormula></span>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule === MODULE.attention ? 'text-blue-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                            {/* Module 3: FFN vs MoE */}
                            {modelType === 'dense' ? (
                              <div data-stage-status={stageStatus.ffn} className={`p-2 rounded border transition-all duration-300 shadow-sm ${stageStatus.ffn === 'active' ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 scale-105 z-10 shadow-lg' : stageStatus.ffn === 'passed' ? 'bg-emerald-50 border-emerald-200 opacity-90' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                <div className={`font-semibold text-xs md:text-sm text-center ${stageStatus.ffn === 'active' ? 'text-indigo-900' : stageStatus.ffn === 'passed' ? 'text-emerald-800' : 'text-slate-500'}`}>{t('denseFfn')}</div>
                                <div className="mt-1 text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-indigo-100 flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center bg-indigo-50 -mx-1 px-2 py-0.5 rounded border border-indigo-100">
                                    <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`H=\operatorname{GELU}(XW_{\mathrm{up}})`}</MathFormula></span>
                                    <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}><MathFormula>{String.raw`${L_seq}\times 4d`}</MathFormula></span>
                                  </div>
                                  <div className="flex justify-between px-1">
                                    <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`Y=HW_{\mathrm{down}}`}</MathFormula></span>
                                    <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}><MathFormula>{String.raw`${L_seq}\times d`}</MathFormula></span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div data-stage-status={stageStatus.ffn} className={`p-2 rounded border transition-all duration-300 shadow-sm ${stageStatus.ffn === 'active' ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-200 scale-105 z-10 shadow-lg' : stageStatus.ffn === 'passed' ? 'bg-emerald-50 border-emerald-200 opacity-90' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                <div className={`font-semibold text-xs md:text-sm text-center flex items-center justify-center gap-1 ${stageStatus.ffn === 'active' ? 'text-teal-900' : stageStatus.ffn === 'passed' ? 'text-emerald-800' : 'text-slate-500'}`}>
                                  <Network size={14}/> {t('sparseMoeLayer')}
                                </div>
                                <div className="mt-1 text-[10px] md:text-xs font-mono bg-white p-1 md:p-1.5 rounded border border-teal-100 flex flex-col gap-1.5">
                                  <div className="flex justify-between px-1 opacity-60">
                                    <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`W_g`}</MathFormula> {t('routerMatrix')}</span>
                                    <span><MathFormula>{String.raw`d\times 8`}</MathFormula></span>
                                  </div>
                                  <div className={`flex justify-between px-1 rounded transition-colors ${stageStatus.ffn === 'active' ? 'bg-amber-50 text-amber-800 border border-amber-200' : ''}`}>
                                    <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`r=\operatorname{softmax}(XW_g)`}</MathFormula></span>
                                  </div>
                                  <div className="flex justify-between items-end gap-0.5 md:gap-1 mt-1 mb-1">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(e => {
                                      const isMoEActive = activeModule === MODULE.ffn;
                                      const isExpertSelected = currentRouting.topK.includes(e);
                                      const isActive = isMoEActive && isExpertSelected;
                                      const weightStr = isActive ? currentRouting.weights[currentRouting.topK.indexOf(e)].toFixed(2) : (isMoEActive ? "0.01" : "-");
                                      return (
                                        <div key={e} className="flex flex-col items-center justify-end w-full">
                                          <div className={`text-[8px] mb-0.5 transition-all duration-500 ${isActive ? 'text-teal-700 font-bold scale-125' : 'text-slate-300 opacity-50'}`}>{weightStr}</div>
                                          <div className={`w-full h-4 md:h-5 rounded border flex items-center justify-center text-[8px] md:text-[10px] transition-all duration-300 ${isActive ? 'bg-teal-100 border-teal-400 text-teal-800 font-bold shadow ring-1 ring-teal-300 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400'}`}><MathFormula>{String.raw`E_{${e}}`}</MathFormula></div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {/* 恢复 Top-K 融合计算式 */}
                                  <div className={`flex flex-col bg-teal-50 -mx-1 px-1 md:px-2 py-1 rounded border transition-colors ${stageStatus.ffn === 'active' ? 'border-teal-300' : 'border-teal-100'}`}>
                                    <div className="flex justify-between items-center w-full mb-1">
                                      <span className="text-teal-800 font-semibold">{t('top2Fusion')}</span>
                                      <span className={`${seqColorClass} font-bold text-[10px] bg-white px-1 rounded border border-teal-100`}><MathFormula>{String.raw`${L_seq}\times d`}</MathFormula></span>
                                    </div>
                                    <div className="text-[10px] md:text-[12px] text-teal-900 text-center tracking-wide">
                                      {activeModule === MODULE.ffn
                                        ? <MathFormula>{String.raw`Y=${currentRouting.weights[0].toFixed(2)}E_{${currentRouting.topK[0]}}+${currentRouting.weights[1].toFixed(2)}E_{${currentRouting.topK[1]}}`}</MathFormula>
                                        : <span className="font-sans font-normal text-[10px]">{t('waitingRouter')}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* --- 循环框结束 --- */}

                          <div className="flex justify-center -my-1 relative z-0"><ArrowDown className={`${activeModule === MODULE.ffn ? 'text-purple-400 animate-bounce' : 'text-slate-200'}`} size={16} /></div>

                          {/* Module 4: LM Head & Probabilities */}
                          <div data-stage-status={stageStatus.lmHead} className={`p-2 md:p-3 rounded border transition-all duration-300 shadow-sm ${stageStatus.lmHead === 'active' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200 scale-105 z-10' : stageStatus.lmHead === 'passed' ? 'bg-emerald-50 border-emerald-200 opacity-90' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className={`font-semibold text-xs md:text-sm text-center mb-2 ${stageStatus.lmHead === 'active' ? 'text-purple-900' : stageStatus.lmHead === 'passed' ? 'text-emerald-800' : 'text-slate-500'}`}>{t('lmHeadSample')} <MathFormula>{String.raw`T=${temperature.toFixed(1)}`}</MathFormula></div>
                            <div className="text-[10px] md:text-xs font-mono bg-white p-1.5 rounded border border-purple-100 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center bg-purple-50 -mx-1 px-2 py-0.5 rounded border border-purple-100">
                                <span className="text-[11px] md:text-[13px] tracking-wide"><MathFormula>{String.raw`\ell=XW_{\mathrm{vocab}}`}</MathFormula></span>
                                <span className={`${seqColorClass} font-bold text-xs bg-slate-100 px-1 rounded`}><MathFormula>{String.raw`${L_seq}\times |\mathcal V|`}</MathFormula></span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-purple-200">
                               <div className="text-[10px] font-semibold text-purple-600 mb-2 uppercase tracking-wider flex justify-between">
                                 <span>{t('probDist')}</span>
                                 {activeModule === MODULE.tokenDone && <span className="text-emerald-600 font-bold animate-pulse">{t('predDone')}</span>}
                               </div>
                               {displayProbs ? (
                                 <div className="space-y-1.5 animate-fade-in">
                                   {displayProbs.map((prob, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                       <div className="w-8 md:w-10 text-xs font-medium text-right text-purple-900">{prob.t}</div>
                                       <div className="flex-1 h-2.5 bg-purple-100 rounded-full overflow-hidden relative">
                                         <div className={`h-full rounded-full transition-all duration-300 ease-out ${idx === 0 ? 'bg-purple-500' : 'bg-purple-300'}`} style={{ width: `${prob.p * 100}%` }}></div>
                                       </div>
                                       <div className="w-8 text-[10px] text-purple-600 text-right font-mono">{(prob.p * 100).toFixed(0)}%</div>
                                     </div>
                                   ))}
                                 </div>
                               ) : (
                                 <div className="text-center text-purple-400 text-[10px] italic py-2">
                                   {activeModule > MODULE.idle && activeModule < MODULE.lmHead ? t('waitStack') : t('waitCalc')}
                                 </div>
                               )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：代码级原理解析 (Pseudocode) */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 text-slate-300 h-full flex flex-col min-w-0">
               <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
                 <div className="flex items-center gap-2">
                   <Code className="text-emerald-400" size={20} /> {t('codeTitle')} <span className="text-xs text-slate-400 font-normal ml-2">{t('pyCode')}</span>
                 </div>
                 {modelType === 'moe' && <span className="text-xs bg-teal-900/50 text-teal-400 px-2 py-1 rounded border border-teal-800">{t('moeEnabled')}</span>}
              </h2>
              <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed">
                <div className={`transition-all duration-500 whitespace-pre block`}>
                  <div><span className="text-emerald-400">def</span> <span className="text-blue-400">{phase === 'prefill' ? 'prefill' : 'decode_step'}</span>(request_ids, input_tokens, kv_cache, temp={temperature.toFixed(1)}):</div>
                  
                  {/* Emb 高亮 */}
                  <div className={activeModule === MODULE.embedding ? "bg-indigo-900/60 text-indigo-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>  <span className="text-slate-500">{t('c_emb1')}</span></div>
                    <div>  meta = scheduler.inference_meta(request_ids)</div>
                    <div>  x = embedding(input_tokens) <span className="text-slate-500">{t('c_emb2')}</span></div>
                  </div>
                  <br/>

                  {/* Transformer Loop */}
                  <div className={isLayerStage ? "bg-amber-900/30 text-amber-200 px-1 -mx-1 rounded border-l-2 border-amber-400" : "text-emerald-400"}>
                      <span className="text-emerald-400">for</span> layer_id <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>({TOTAL_LAYERS}): <span className="text-slate-500 font-normal">{t('c_loop1')}</span>
                  </div>

                  {/* Attention 高亮 */}
                  <div className={activeModule === MODULE.attention ? "bg-blue-900/60 text-blue-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>      <span className="text-slate-500">{t('c_attn1')}</span></div>
                    <div>      layer_cache = kv_cache.layer(layer_id)</div>
                    <div>      q, k, v = qkv_proj[layer_id](norm(x))</div>
                    <div className="text-fuchsia-300">      q, k = apply_rope(q, k, meta.positions) <span className="text-slate-500">{t('c_rope1')}</span></div>
                    <div className={activeModule === MODULE.attention && phase === 'decode' ? "text-pink-300 font-bold" : ""}>      slots = layer_cache.reserve(meta.slot_mapping)</div>
                    <div className={activeModule === MODULE.attention && phase === 'decode' ? "text-pink-300 font-bold" : ""}>      layer_cache.write_(slots, k, v)</div>
                    <div>      backend = select_attention_backend(meta, q.dtype)</div>
                    <div>      attn_out = backend.{phase === 'prefill' ? 'prefill' : 'decode'}(q, layer_cache, meta)</div>
                    <div>      x = x + o_proj[layer_id](attn_out)</div>
                  </div>
                  <br/>

                  {/* FFN / MoE 高亮 */}
                  {modelType === 'dense' ? (
                    <div className={activeModule === MODULE.ffn ? "bg-indigo-900/60 text-indigo-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                      <div>      <span className="text-slate-500">{t('c_ffn1')}</span></div>
                      <div>      ffn_in = norm(x)</div>
                      <div>      hidden = gelu(ffn_in @ W_up[layer_id])</div>
                      <div>      x = x + (hidden @ W_down) <span className="text-slate-500">{t('c_ffn2')}</span></div>
                    </div>
                  ) : (
                    <div className={activeModule === MODULE.ffn ? "bg-teal-900/50 text-teal-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                      <div>      <span className="text-slate-500">{t('c_moe1')}</span></div>
                      <div>      moe_in = norm(x)</div>
                      <div className={activeModule === MODULE.ffn ? "text-amber-200 font-bold" : ""}>      r_scores = softmax(moe_in @ W_gate[layer_id]) </div>
                      <div className={activeModule === MODULE.ffn ? "text-amber-200" : ""}>      weights, experts = topk(r_scores, k=2)</div>
                      <div className={activeModule === MODULE.ffn ? "text-amber-200" : ""}>      weights = weights / weights.sum(-1, keepdim=True)</div>
                      <div>      moe_out = zeros_like(moe_in)</div>
                      <div>      <span className="text-emerald-400">for</span> i <span className="text-emerald-400">in</span> <span className="text-blue-300">range</span>(2):</div>
                      <div>          e_idx = experts[i]; w = weights[i]</div>
                      <div>          e_out = expert_mlp(layer_id, e_idx, moe_in)</div>
                      <div className={activeModule === MODULE.ffn ? "text-amber-200" : ""}>          moe_out += w * e_out</div>
                      <div>      x = x + moe_out <span className="text-slate-500">{t('c_moe2')}</span></div>
                    </div>
                  )}
                  <br/>

                  {/* LM Head 高亮 */}
                  <div className={activeModule >= MODULE.lmHead ? "bg-purple-900/60 text-purple-200 px-1 -mx-1 rounded" : "text-slate-400"}>
                    <div>  <span className="text-slate-500">{t('c_lm1')}</span></div>
                    <div>  logits = x[-1] @ W_vocab <span className="text-slate-500">{t('c_lm2')}</span></div>
                    <div className={activeModule >= MODULE.lmHead && temperature !== 1.0 ? "text-purple-300 font-bold" : ""}>  logits = logits / temp   <span className="text-slate-500">{t('c_lm3')}</span></div>
                    <div>  probs = softmax(logits)</div>
                    <div>  <span className="text-emerald-400">return</span> sample(probs)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底层：状态面板与原理解释 */}
          <div className="bg-indigo-900 text-indigo-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Zap className="text-amber-400" size={24}/>
              {t('stateTitle')}
            </h3>
            
            <div className="space-y-4 text-sm md:text-base leading-relaxed max-w-5xl">
              {activeModule === MODULE.idle && (
                <p className="opacity-90">{t('waitStartMsg1')}<strong className="text-amber-300">{modelType === 'moe' ? t('moeSparse') : t('denseDense')}</strong>{t('waitStartMsg2')}</p>
              )}
              
              {activeModule === MODULE.embedding && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-indigo-300 text-base mb-2">{t('stateEmbTitle')}</h4>
                  <p className="opacity-90">{phase === 'prefill' ? t('stateEmbPrefill') : t('stateEmbDecode')}</p>
                </div>
              )}

              {activeModule === MODULE.attention && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-blue-300 text-base mb-2 flex items-center gap-2"><Orbit size={16}/>{t('stateAttnTitle')}</h4>
                  <p className="opacity-90">{phase === 'prefill' ? t('stateAttnPrefill') : t('stateAttnDecode')}</p>
                  <p className="mt-2 text-sm text-fuchsia-200">{t('stateRopeDesc1')} {t('stateRopeDesc2')}</p>
                  <div className="mt-2 inline-flex rounded-lg border border-blue-700 bg-blue-950/50 px-3 py-1"><MathFormula>{String.raw`\ell=${currentLayer}/${TOTAL_LAYERS}`}</MathFormula></div>
                </div>
              )}

              {activeModule === MODULE.ffn && (
                <div className="animate-fade-in">
                  {modelType === 'dense' ? (
                    <><h4 className="font-bold text-indigo-300 text-base mb-2">{t('stateDenseTitle')}</h4><p className="opacity-90">{t('stateDenseDesc')}</p></>
                  ) : (
                    <><h4 className="font-bold text-teal-300 text-base mb-2 flex items-center gap-2"><Network size={16}/> {t('stateMoeTitle')}</h4>
                      <p className="opacity-90">{t('stateMoeDesc1')}<strong className="text-amber-300">Top-2</strong>{t('stateMoeDesc2')}</p>
                    </>
                  )}
                  <p className="mt-2 text-sm text-amber-100">{t('stateLoopDesc1')}<strong className="text-white">{layerProgress}</strong>{t('stateLoopDesc4')}</p>
                </div>
              )}

              {activeModule === MODULE.lmHead && (
                <div className="animate-fade-in">
                  <h4 className="font-bold text-purple-300 text-base mb-2 flex items-center gap-2"><SlidersHorizontal size={16}/> {t('stateLmTitle')}</h4>
                  <ul className="list-disc pl-4 space-y-2 opacity-90">
                    <li>{t('stateLmDesc1')}</li>
                    <li><strong className="text-amber-300">{t('stateLmDesc2')}</strong>{t('stateLmDesc3')}
                      <br/><MathFormula>{String.raw`T<1`}</MathFormula>：{t('stateLmDesc4')}
                      <br/><MathFormula>{String.raw`T>1`}</MathFormula>：{t('stateLmDesc5')}
                    </li>
                  </ul>
                </div>
              )}

              {activeModule === MODULE.tokenDone && (
                <div className="animate-fade-in py-4 border-t border-indigo-700/50 mt-4 pt-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-800 rounded-full shrink-0"><Zap className="text-emerald-400" size={24} /></div>
                  <div>
                    <h4 className="font-bold text-emerald-300 text-base md:text-lg">{t('stateDoneTitle')}</h4>
                    <p className="opacity-80 mt-1 text-sm">{t('stateDoneDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
