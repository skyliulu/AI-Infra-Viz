import React, { lazy, Suspense, useState } from 'react';
import { Github, Cpu, Zap, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="flex items-center justify-center h-64 text-slate-400 text-lg animate-pulse">
      Loading visualization…
    </div>
  );
}

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300',
          sidebarCollapsed ? 'w-14' : 'w-44',
          'md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-slate-800 shrink-0">
          {!sidebarCollapsed && (
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent whitespace-nowrap select-none">
              AI-Infra-Viz
            </span>
          )}
          <div className={cn('flex items-center gap-1', sidebarCollapsed && 'w-full justify-center')}>
            {!sidebarCollapsed && (
              <a
                href="https://github.com/skyliulu/AI-Infra-Viz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
                aria-label="GitHub repository"
              >
                <Github size={16} />
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

        {/* Nav items */}
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

        {/* GitHub icon shown in collapsed state */}
        {sidebarCollapsed && (
          <div className="px-2 py-3 border-t border-slate-800 shrink-0 flex justify-center">
            <a
              href="https://github.com/skyliulu/AI-Infra-Viz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded"
              aria-label="GitHub repository"
            >
              <Github size={16} />
            </a>
          </div>
        )}
      </aside>

      {/* ── Right side: header + content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center h-14 px-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 text-base font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">AI-Infra-Viz</span>
        </header>

        {/* Main content — no outer padding to avoid dark border around components */}
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

        {/* Footer */}
        <footer className="shrink-0 border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} AI-Infra-Viz — Visualizing AI Infrastructure
        </footer>
      </div>
    </div>
  );
}
