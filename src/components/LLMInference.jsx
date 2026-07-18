import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Cpu, Database, Zap, AlignLeft, Code, CornerDownRight, Network, SlidersHorizontal, Orbit, Globe } from 'lucide-react';
import { MathFormula } from './linear-attention/MathFormula';
import { deriveInferenceTensorSnapshot, deriveSamplingDistribution, MODULE, TOTAL_LAYERS } from './llm-inference/model';
import { LayerKvOverview, TensorWorkbench } from './llm-inference/TensorWorkbench';

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
    topKLabel: 'Top-K',
    topPLabel: 'Top-P',
    adjustTopK: '调整 Top-K 候选数量',
    adjustTopP: '调整 Top-P 累计概率阈值',
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
    routerMatrix: 'Router 矩阵',
    currentLayerCache: '当前层 KV',
    layerCommitProgress: '层写入进度',
    batchWrite: '整段 Prompt 批量写入',
    singleAppend: '当前 Token 逐层追加',
    layerStack: '每层独立 KV 堆栈',
    representativeSlice: '代表性张量切片',
    embeddingLookupTitle: 'Token ID、Embedding 与 Residual Stream',
    embeddingLookupDesc: '从词表查表得到连续向量；只展示少量维度，标签保留真实形状。',
    tokenIds: 'Token ID 行',
    embeddingTable: 'Embedding Table',
    rowLookup: '按行查表',
    residualStream: 'Residual Stream X',
    attentionTensorTitle: 'RMSNorm、Q/K/V、Attention 与 Residual',
    attentionTensorPrefill: '多行 Prompt 并行计算，Score 矩阵显式显示因果遮罩。',
    attentionTensorDecode: '单行 Query 读取历史 KV，并把当前 K/V 追加到本层 Cache。',
    qkvProjection: '当前层并行投影 Q/K/V；Q/K 再应用 RoPE',
    writeCurrentLayerK: '写入当前层 K Cache',
    writeCurrentLayerV: '写入当前层 V Cache',
    scoreMatrix: 'Score = QKᵀ',
    causalMaskVisible: '上三角位置不可见',
    queryReadsCache: '一行 Query 读取全部历史位置',
    softmax: '逐行 Softmax',
    probabilityMatrix: 'Attention Probability',
    attentionOutput: 'Context = PV',
    attentionResidualMerge: 'Attention 输出投影后与 Residual Stream 相加',
    denseTensorTitle: 'Dense MLP：所有 Token 经过同一组权重',
    denseTensorDesc: '隐藏维度扩张后再压回 d；矩阵宽度表达中间激活规模。',
    expandedHidden: 'Expanded Hidden',
    ffnOutput: 'MLP Output',
    reuseExpandedHidden: '复用 Expanded Hidden',
    selectedExpertWeights: '当前路由 Expert 的独立权重矩阵',
    expertHidden: 'Expert Hidden',
    expertActivation: '专家激活',
    moeTensorTitle: 'MoE：每个 Token 独立路由',
    moeTensorDesc: 'Router 的每一行对应一个 Token，并分别选择 Top-2 Expert。',
    routerByToken: 'Router Probability',
    perTokenTopK: '每行独立 Top-2；描边为选中项',
    singleTokenTopK: '当前 Token 仅路由到两个 Expert',
    expertBank: 'Expert Bank · 路由 Token 数',
    weightedExpertMerge: '按 Token 的路由权重融合 Expert 输出',
    ffnResidualMerge: 'FFN/MoE 输出与 Residual Stream 相加后进入下一层',
    lmTensorTitle: '最后一行 Hidden State 到 LM Head 与采样',
    lmTensorDesc: '生成下一个 Token 时只读取最后一个位置，而不是把全部 L 行都送去采样。',
    lastHiddenRow: '最后一行 Hidden State',
    logitsVector: 'Vocabulary Logits',
    sampleNext: '等待采样',
    feedbackToDecode: '采样 Token 回到 Embedding，成为下一次 Decode 输入',
    samplingCurve: '温度缩放与 Top-K、Top-P 截断曲线',
    temperatureCurve: '温度缩放',
    filteredCurve: '最终分布',
    cumulativeCurve: '累计概率 / Top-P',
    keptCandidates: '保留候选',
    status_active: '执行中',
    status_passed: '已完成',
    status_pending: '待执行',
    layerLabel: '层'
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
    topKLabel: 'Top-K',
    topPLabel: 'Top-P',
    adjustTopK: 'Adjust the Top-K candidate count',
    adjustTopP: 'Adjust the Top-P cumulative probability threshold',
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
    routerMatrix: 'Router Matrix',
    currentLayerCache: 'Current-layer KV',
    layerCommitProgress: 'Layer commit progress',
    batchWrite: 'Batch-write the full prompt',
    singleAppend: 'Append the current token per layer',
    layerStack: 'Independent KV stack per layer',
    representativeSlice: 'Representative tensor slice',
    embeddingLookupTitle: 'Token IDs, Embedding, and Residual Stream',
    embeddingLookupDesc: 'Look up continuous vectors from the vocabulary; sampled cells preserve the real shape label.',
    tokenIds: 'Token ID row',
    embeddingTable: 'Embedding Table',
    rowLookup: 'row lookup',
    residualStream: 'Residual Stream X',
    attentionTensorTitle: 'RMSNorm, Q/K/V, Attention, and Residual',
    attentionTensorPrefill: 'Process prompt rows in parallel and expose the causal mask in the score matrix.',
    attentionTensorDecode: 'One query row reads historical KV and appends the current K/V to this layer cache.',
    qkvProjection: 'Project Q/K/V in this layer, then apply RoPE to Q/K',
    writeCurrentLayerK: 'Write this layer K cache',
    writeCurrentLayerV: 'Write this layer V cache',
    scoreMatrix: 'Score = QKᵀ',
    causalMaskVisible: 'Upper-triangle positions are unavailable',
    queryReadsCache: 'One query row reads every historical position',
    softmax: 'row Softmax',
    probabilityMatrix: 'Attention Probability',
    attentionOutput: 'Context = PV',
    attentionResidualMerge: 'Project the attention output and add it to the residual stream',
    denseTensorTitle: 'Dense MLP: every token uses the same weights',
    denseTensorDesc: 'Expand the hidden width, then project back to d; matrix width exposes activation size.',
    expandedHidden: 'Expanded Hidden',
    ffnOutput: 'MLP Output',
    reuseExpandedHidden: 'Reuse Expanded Hidden',
    selectedExpertWeights: 'Independent weights of the routed expert',
    expertHidden: 'Expert Hidden',
    expertActivation: 'expert activation',
    moeTensorTitle: 'MoE: route every token independently',
    moeTensorDesc: 'Every router row belongs to one token and chooses its own Top-2 experts.',
    routerByToken: 'Router Probability',
    perTokenTopK: 'Independent Top-2 per row; rings mark selections',
    singleTokenTopK: 'The current token routes to two experts',
    expertBank: 'Expert Bank · routed token count',
    weightedExpertMerge: 'Merge expert outputs with per-token routing weights',
    ffnResidualMerge: 'Add the FFN/MoE output to the residual stream before the next layer',
    lmTensorTitle: 'Last hidden row to LM Head and sampling',
    lmTensorDesc: 'Next-token generation reads only the last position, not all L rows.',
    lastHiddenRow: 'Last hidden row',
    logitsVector: 'Vocabulary Logits',
    sampleNext: 'Waiting to sample',
    feedbackToDecode: 'Feed the sampled token back to Embedding as the next Decode input',
    samplingCurve: 'Temperature scaling with Top-K and Top-P cutoff curves',
    temperatureCurve: 'temperature-scaled',
    filteredCurve: 'final distribution',
    cumulativeCurve: 'cumulative / Top-P',
    keptCandidates: 'Kept candidates',
    status_active: 'Active',
    status_passed: 'Passed',
    status_pending: 'Pending',
    layerLabel: 'Layer'
  }
};

const getInitialLang = () => (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().includes('zh') ? 'zh' : 'en');

const App = () => {
  const [modelType, setModelType] = useState('moe');
  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(3);
  const [topP, setTopP] = useState(0.9);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  
  // Embedding 只运行一次；随后每层依次执行 Attention（含 RoPE）与 FFN/MoE。
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

  const handleTopKChange = (event) => {
    setTopK(parseInt(event.target.value, 10));
  };

  const handleTopPChange = (event) => {
    setTopP(parseFloat(event.target.value));
  };

  // 2. 动态计算带温度的概率 (Temperature Scaling)
  const currentProbs = activeModule >= MODULE.lmHead ? generatedTokens[step].probs : null;
  const samplingState = useMemo(() => deriveSamplingDistribution({
    candidates: currentProbs,
    temperature,
    topK,
    topP,
  }), [currentProbs, temperature, topK, topP]);

  const inferenceState = useMemo(() => deriveInferenceTensorSnapshot({
    phase,
    activeModule,
    currentLayer,
    step,
    promptLength: promptTokens.length,
    modelType,
  }), [phase, activeModule, currentLayer, step, promptTokens.length, modelType]);
  const { stageStatus, isLayerStage, layerProgress, positionFormula } = inferenceState;

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
            {/* Sampling controls */}
            <div data-testid="sampling-controls" className="grid gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 sm:grid-cols-3">
              <label className="flex items-center gap-1.5" title={t('adjustRandomness')}>
                <SlidersHorizontal size={13} className="shrink-0 text-purple-600" />
                <span className="w-10 text-[10px] font-semibold text-purple-800">{t('tempLabel')}</span>
                <input aria-label={t('adjustRandomness')} type="range" min="0.1" max="0.9" step="0.1" value={temperature} onInput={handleTemperatureChange} onChange={handleTemperatureChange} className="w-16 accent-purple-500" />
                <span className="w-5 text-right text-[10px] font-bold text-purple-700">{temperature.toFixed(1)}</span>
              </label>
              <label className="flex items-center gap-1.5" title={t('adjustTopK')}>
                <span className="w-10 text-[10px] font-semibold text-purple-800">{t('topKLabel')}</span>
                <input aria-label={t('adjustTopK')} type="range" min="1" max="3" step="1" value={topK} onInput={handleTopKChange} onChange={handleTopKChange} className="w-16 accent-emerald-500" />
                <span className="w-5 text-right text-[10px] font-bold text-emerald-700">{topK}</span>
              </label>
              <label className="flex items-center gap-1.5" title={t('adjustTopP')}>
                <span className="w-10 text-[10px] font-semibold text-purple-800">{t('topPLabel')}</span>
                <input aria-label={t('adjustTopP')} type="range" min="0.5" max="1.0" step="0.1" value={topP} onInput={handleTopPChange} onChange={handleTopPChange} className="w-16 accent-amber-500" />
                <span className="w-5 text-right text-[10px] font-bold text-amber-700">{topP.toFixed(1)}</span>
              </label>
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
                <LayerKvOverview
                  snapshot={inferenceState}
                  maxTokens={promptTokens.length + generatedTokens.length - 1}
                  promptLength={promptTokens.length}
                  t={t}
                />
              </div>
            </div>
          </div>

          {/* 中间层：流水线与底层代码 */}
          <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
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

              <TensorWorkbench
                snapshot={inferenceState}
                sampling={samplingState}
                sampledToken={activeModule >= MODULE.lmHead ? generatedTokens[step]?.token : null}
                t={t}
              />

            </div>

            {/* 右侧：代码级原理解析 (Pseudocode) */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 text-slate-300 flex flex-col min-w-0">
               <h2 className="text-lg font-semibold mb-4 flex items-center justify-between text-white shrink-0">
                 <div className="flex items-center gap-2">
                   <Code className="text-emerald-400" size={20} /> {t('codeTitle')} <span className="text-xs text-slate-400 font-normal ml-2">{t('pyCode')}</span>
                 </div>
                 {modelType === 'moe' && <span className="text-xs bg-teal-900/50 text-teal-400 px-2 py-1 rounded border border-teal-800">{t('moeEnabled')}</span>}
              </h2>
              <div className="font-mono text-[10px] md:text-xs xl:text-sm overflow-x-auto bg-[#0d1117] p-4 rounded-lg border border-slate-800 flex-1 leading-relaxed">
                <div className={`transition-all duration-500 whitespace-pre block`}>
                  <div><span className="text-emerald-400">def</span> <span className="text-blue-400">{phase === 'prefill' ? 'prefill' : 'decode_step'}</span>(request_ids, input_tokens, kv_cache, temp={temperature.toFixed(1)}, top_k={topK}, top_p={topP.toFixed(1)}):</div>
                  
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
                    <div className={activeModule >= MODULE.lmHead ? "text-purple-300 font-bold" : ""}>  logits = logits / temp   <span className="text-slate-500">{t('c_lm3')}</span></div>
                    <div>  probs = softmax(logits)</div>
                    <div>  probs = top_k_filter(probs, top_k)</div>
                    <div>  probs = top_p_filter(probs, top_p)</div>
                    <div>  <span className="text-emerald-400">return</span> sample(renormalize(probs))</div>
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
