import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Cpu, Database, FastForward, Github, GitBranch, Globe, Network, Sparkles, Star, Zap, Activity } from 'lucide-react';

const REPO_API = 'https://api.github.com/repos/skyliulu/LLM-Infra-Explorer';
const REPO_URL = 'https://github.com/skyliulu/LLM-Infra-Explorer';

const i18n = {
  en: {
    badge: 'Interactive AI Infrastructure Explorer',
    titlePrefix: 'Explore the world of',
    titleHighlight: ' large-model infrastructure',
    titleSuffix: ' interactively',
    description:
      'LLM-Infra-Explorer breaks down complex large-model infrastructure and inference optimization into interactive, experiment-friendly modules. You can not only see how each system works, but also build intuition through interaction.',
    cta: 'Start interactive exploration',
    viewModule: 'Open module',
    languageLabel: 'Language',
  },
  zh: {
    badge: '交互式大模型基础设施探索',
    titlePrefix: '探索',
    titleHighlight: '大模型基础设施',
    titleSuffix: ' 的交互式世界',
    description:
      'LLM-Infra-Explorer 将复杂的大模型基础设施与推理优化拆解为可交互、可实验、可理解的模块。你不仅能看见系统结构，还能通过交互快速建立直觉。',
    cta: '开始交互式探索',
    viewModule: '查看模块',
    languageLabel: '语言',
  },
};

const featureCards = [
  {
    id: 'llm',
    title: { en: 'LLM Inference', zh: 'LLM 推理' },
    description: {
      en: 'Understand prefill/decode stages, KV cache usage, and token generation flow.',
      zh: '理解 Prefill/Decode 阶段、KV Cache 使用方式与 Token 生成流程。',
    },
    icon: Cpu,
    iconClass: 'text-cyan-300',
  },
  {
    id: 'parallel',
    title: { en: 'Parallel Strategy', zh: '并行策略' },
    description: {
      en: 'Explore tensor, pipeline, and data parallelism trade-offs visually.',
      zh: '交互式探索张量并行、流水并行、数据并行等策略权衡。',
    },
    icon: Network,
    iconClass: 'text-fuchsia-300',
  },
  {
    id: 'flash',
    title: { en: 'Flash Attention', zh: 'Flash Attention' },
    description: {
      en: 'See how tiled attention cuts memory access and boosts throughput.',
      zh: '了解分块注意力如何减少显存访问并提升吞吐。',
    },
    icon: Zap,
    iconClass: 'text-emerald-300',
  },
  {
    id: 'flashdecode',
    title: { en: 'Flash Decode', zh: 'Flash Decode' },
    description: {
      en: 'Dive into low-latency decoding optimizations for real-time responses.',
      zh: '深入低时延解码优化路径，理解实时生成性能提升。',
    },
    icon: FastForward,
    iconClass: 'text-amber-300',
  },
  {
    id: 'speculative',
    title: { en: 'Speculative Decoding', zh: '推测解码' },
    description: {
      en: 'See why Draft–Verify reduces serial Target work, then compare EAGLE-2 dynamic trees with DSpark confidence scheduling.',
      zh: '先理解 Draft–Verify 如何减少 Target 串行前向，再比较 EAGLE-2 动态树与 DSpark 置信度调度。',
    },
    icon: Sparkles,
    iconClass: 'text-blue-300',
  },
  {
    id: 'engram',
    title: { en: 'Engram', zh: 'Engram' },
    description: {
      en: 'Explore how Engram augments Transformer layers with n-gram memory modules for efficient long-context modeling.',
      zh: '了解 Engram 如何通过 n-gram 记忆模块增强 Transformer 层，以更高效地建模长上下文。',
    },
    icon: Database,
    iconClass: 'text-rose-300',
  },
  {
    id: 'radixcache',
    title: { en: 'Radix Cache', zh: 'Radix Cache' },
    description: {
      en: 'Explore how Radix Cache uses a radix tree for prefix-sharing KV cache to reduce memory usage and improve throughput.',
      zh: '了解 Radix Cache 如何通过基数树实现前缀共享 KV Cache，减少显存占用并提升吞吐量。',
    },
    icon: GitBranch,
    iconClass: 'text-indigo-300',
  },
  {
    id: 'linearattn',
    title: { en: 'Linear Attention', zh: 'Linear Attention' },
    description: {
      en: 'From O(N²) to O(N): understand how the kernel trick and associativity reorder transforms Attention into a recurrent state machine.',
      zh: '从 O(N²) 到 O(N)：理解核函数近似与结合律重排如何将 Attention 变为 O(d²) 固定状态的递归更新。',
    },
    icon: Activity,
    iconClass: 'text-violet-300',
  },
  {
    id: 'dpattention',
    title: { en: 'DP Attention', zh: 'DP Attention' },
    description: {
      en: 'Understand hybrid DP/TP attention flow, KV cache sharding, and cross-rank communication trade-offs.',
      zh: '理解 DP/TP 混合并行中的 Attention 流程、KV Cache 切分方式与跨卡通信权衡。',
    },
    icon: Network,
    iconClass: 'text-sky-300',
  },
];

function formatStars(count) {
  if (count == null) return '--';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export default function HomeLanding({ onExplore }) {
  const [stars, setStars] = useState(null);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    let cancelled = false;

    async function fetchStars() {
      try {
        const res = await fetch(REPO_API);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStars(data?.stargazers_count ?? null);
        }
      } catch {
        // Ignore network failures and keep fallback display.
      }
    }

    fetchStars();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function detectLanguageByLocation() {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (timezone.startsWith('Asia/Shanghai') || timezone.startsWith('Asia/Chongqing')) {
          if (!cancelled) setLanguage('zh');
          return;
        }

        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) return;
        const data = await res.json();
        const detectedLanguage = data?.country_code === 'CN' ? 'zh' : 'en';
        if (!cancelled) {
          setLanguage(detectedLanguage);
        }
      } catch {
        if (!cancelled) {
          setLanguage('en');
        }
      }
    }

    detectLanguageByLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = i18n[language] || i18n.en;
  const cards = useMemo(
    () => featureCards.map((card) => ({ ...card, titleText: card.title[language], descriptionText: card.description[language] })),
    [language]
  );

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 md:px-10 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="absolute right-6 top-6 z-10 flex items-center gap-2 md:right-10 md:top-8">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
          <Globe size={14} />
          <span>{copy.languageLabel}</span>
          <button
            onClick={() => setLanguage('zh')}
            className={`rounded px-2 py-0.5 transition ${language === 'zh' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            中文
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`rounded px-2 py-0.5 transition ${language === 'en' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            EN
          </button>
        </div>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          <Github size={16} />
          <span className="font-medium">skyliulu/LLM-Infra-Explorer</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            <Star size={12} />
            {formatStars(stars)}
          </span>
        </a>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 pt-24 md:pt-16">
        <div className="space-y-6 text-center md:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            <Sparkles size={14} />
            {copy.badge}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            {copy.titlePrefix}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{copy.titleHighlight}</span>
            {copy.titleSuffix}
          </h1>
          <p className="max-w-3xl text-base text-slate-300 md:text-lg">{copy.description}</p>
          <button
            onClick={() => onExplore('llm')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {copy.cta}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onExplore(item.id)}
                className="group rounded-xl border border-slate-800 bg-slate-900/80 p-5 text-left transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="mb-4 inline-flex rounded-lg bg-slate-800 p-2.5">
                  <Icon size={18} className={item.iconClass} />
                </div>
                <h3 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-white">
                  <BrainCircuit size={16} className="text-slate-400" />
                  {item.titleText}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">{item.descriptionText}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-300 opacity-0 transition group-hover:opacity-100">
                  {copy.viewModule}
                  <ArrowRight size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
