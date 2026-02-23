import React, { lazy, Suspense, useState } from 'react';
import { Github, Cpu, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const LLMInference = lazy(() => import('./components/LLMInference.jsx'));
const FlashAttention = lazy(() => import('./components/FlashAttention.jsx'));

const TABS = [
  { id: 'llm', label: 'LLM Inference', icon: Cpu, component: LLMInference },
  { id: 'flash', label: 'Flash Attention', icon: Zap, component: FlashAttention },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-indigo-300 text-lg animate-pulse">
      Loading visualization…
    </div>
  );
}

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* ── Navigation Bar ── */}
      <nav className="bg-indigo-950 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-xl font-bold tracking-tight text-white">
            AI-Infra-Viz
          </span>
          <a
            href="https://github.com/skyliulu/AI-Infra-Viz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 hover:text-white transition-colors"
            aria-label="GitHub repository"
          >
            <Github size={24} />
          </a>
        </div>
      </nav>

      {/* ── Tab Bar ── */}
      <div className="bg-indigo-950/60 border-b border-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-indigo-400 text-indigo-300'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={<LoadingFallback />}>
              {ActiveComponent && <ActiveComponent />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-indigo-950/40 border-t border-indigo-900 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} AI-Infra-Viz — Visualizing AI Infrastructure
      </footer>
    </div>
  );
}
