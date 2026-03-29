import React, { lazy, Suspense, useState } from 'react';
import { Github, Cpu, Zap, FastForward, Network, Database, GitBranch, Activity, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const HomeLanding = lazy(() => import('./components/HomeLanding.jsx'));
const LLMInference = lazy(() => import('./components/LLMInference.jsx'));
const DpAttention = lazy(() => import('./components/DpAttention.jsx'));
const FlashAttention = lazy(() => import('./components/FlashAttention.jsx'));
const FlashDecode = lazy(() => import('./components/FlashDecode.jsx'));
const ParallelStrategies = lazy(() => import('./components/ParallelStrategies.jsx'));
const Engram = lazy(() => import('./components/Engram.jsx'));
const RadixCache = lazy(() => import('./components/RadixCache.jsx'));
const LinearAttention = lazy(() => import('./components/LinearAttention.jsx'));

const TABS = [
  { id: 'llm', label: 'LLM Inference', icon: Cpu, component: LLMInference },
  { id: 'parallel', label: 'Parallel Strategy', icon: Network, component: ParallelStrategies },
  { id: 'flash', label: 'Flash Attention', icon: Zap, component: FlashAttention },
  { id: 'flashdecode', label: 'Flash Decode', icon: FastForward, component: FlashDecode },
  { id: 'engram', label: 'Engram', icon: Database, component: Engram },
  { id: 'radixcache', label: 'Radix Cache', icon: GitBranch, component: RadixCache },
  { id: 'dpattention', label: 'DP Attention', icon: Network, component: DpAttention },
  { id: 'linearattn', label: 'Linear Attention', icon: Activity, component: LinearAttention },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-lg animate-pulse">
      Loading visualization…
    </div>
  );
}

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (activeTab === 'home') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Suspense fallback={<LoadingFallback />}>
          <HomeLanding onExplore={setActiveTab} />
        </Suspense>
      </div>
    );
  }

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300',
          sidebarCollapsed ? 'w-14' : 'w-44',
          'md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-slate-800 shrink-0">
          {!sidebarCollapsed && (
            <button
              onClick={() => {
                setActiveTab('home');
                setSidebarOpen(false);
              }}
              className="min-w-0 flex-1 text-left text-sm font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent truncate select-none hover:opacity-90 transition-opacity"
              aria-label="Back to home"
              title="LLM Infra Explorer"
            >
              LLM Infra Explorer
            </button>
          )}
          <div className={cn('shrink-0 flex items-center gap-1', sidebarCollapsed && 'w-full justify-center')}>
            {!sidebarCollapsed && (
              <a
                href="https://github.com/skyliulu/LLM-Infra-Explorer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                aria-label="GitHub repository"
              >
                <Github size={20} />
              </a>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:block text-slate-400 hover:text-white transition-colors p-1 rounded"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  sidebarCollapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <Icon size={16} />
                {!sidebarCollapsed && tab.label}
              </button>
            );
          })}
        </nav>

        {sidebarCollapsed && (
          <div className="px-2 py-3 border-t border-slate-800 shrink-0 flex justify-center">
            <a
              href="https://github.com/skyliulu/LLM-Infra-Explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors p-1.5 rounded hover:bg-slate-700"
              aria-label="GitHub repository"
            >
              <Github size={20} />
            </a>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center h-14 px-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className="ml-3 text-base font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent hover:opacity-90 transition-opacity"
            aria-label="Back to home"
          >
            LLM-Infra-Explorer
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <Suspense fallback={<LoadingFallback />}>
                {ActiveComponent && <ActiveComponent />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="shrink-0 border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} LLM-Infra-Explorer — Interactive AI Infrastructure Explorer
        </footer>
      </div>
    </div>
  );
}
