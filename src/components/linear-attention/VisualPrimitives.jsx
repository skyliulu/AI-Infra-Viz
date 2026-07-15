import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const valueTone = (value, tone) => {
  if (tone === 'cyan') return 'border-cyan-300 bg-cyan-100 text-cyan-950';
  if (tone === 'amber') return 'border-amber-300 bg-amber-100 text-amber-950';
  if (tone === 'emerald') return 'border-emerald-300 bg-emerald-100 text-emerald-950';
  if (tone === 'rose') return 'border-rose-300 bg-rose-100 text-rose-950';
  if (tone === 'indigo') return 'border-indigo-300 bg-indigo-100 text-indigo-950';
  return value >= 0 ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-rose-200 bg-rose-50 text-rose-900';
};

export function VectorStrip({ values, label, tone = 'auto', pulseKey, faded = false }) {
  return (
    <div className={faded ? 'opacity-45' : ''}>
      {label && <div className="mb-2 text-[11px] font-bold text-slate-600">{label}</div>}
      <div className="mx-auto grid w-full max-w-[240px] grid-cols-4 gap-1.5">
        {values.slice(0, 4).map((value, index) => (
          <motion.div
            key={`${pulseKey}-${index}`}
            initial={{ scale: 0.86, opacity: 0.45 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.06, duration: 0.22 }}
            className={`rounded-md border px-1.5 py-2 text-center font-mono text-[11px] font-bold ${valueTone(value, tone)}`}
          >
            {Number(value).toFixed(2)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function MatrixGrid({ matrix, label, tone = 'auto', pulseKey, faded = false, retention }) {
  return (
    <div className={faded ? 'opacity-40' : ''}>
      {label && <div className="mb-2 text-center text-[11px] font-bold text-slate-600">{label}</div>}
      <div className="mx-auto grid w-max max-w-full grid-cols-[repeat(4,2.75rem)] gap-1">
        {matrix.slice(0, 4).flatMap((row, rowIndex) => row.slice(0, 4).map((value, columnIndex) => (
          <motion.div
            key={`${pulseKey}-${rowIndex}-${columnIndex}`}
            initial={{ scale: 0.76, opacity: 0.3 }}
            animate={{ scale: 1, opacity: retention ? Math.max(0.18, retention[rowIndex]) : 1 }}
            transition={{ delay: (rowIndex * 4 + columnIndex) * 0.018, duration: 0.26 }}
            className={`flex h-9 items-center justify-center rounded border px-1 font-mono text-[10px] font-bold ${valueTone(value, tone)}`}
          >
            {Number(value).toFixed(1)}
          </motion.div>
        )))}
      </div>
    </div>
  );
}

export function FlowArrow({ pulseKey, tone = 'indigo', vertical = false }) {
  const color = tone === 'cyan' ? 'text-cyan-700' : tone === 'amber' ? 'text-amber-500' : tone === 'emerald' ? 'text-emerald-500' : 'text-indigo-500';
  return (
    <div className={`flex items-center justify-center ${vertical ? 'py-1' : 'px-1'}`}>
      <motion.div
        key={pulseKey}
        initial={vertical ? { y: -8, opacity: 0.2 } : { x: -8, opacity: 0.2 }}
        animate={vertical ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowRight size={20} className={`${color} ${vertical ? 'rotate-90' : ''}`} />
      </motion.div>
    </div>
  );
}

export function ContributionBar({ label, value, tone = 'indigo', pulseKey }) {
  const bar = tone === 'cyan' ? 'bg-cyan-700' : tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-600">
        <span className="truncate">{label}</span><span className="font-mono">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div key={pulseKey} initial={{ width: 0 }} animate={{ width: `${Math.max(2, value * 100)}%` }} transition={{ duration: 0.42 }} className={`h-full rounded-full ${bar}`} />
      </div>
    </div>
  );
}

export function StageHeader({ eyebrow, title, lead, tone = 'indigo' }) {
  const badge = tone === 'cyan' ? 'bg-cyan-50 text-cyan-800' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'amber' ? 'bg-amber-50 text-amber-800' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700';
  return (
    <div>
      <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${badge}`}>{eyebrow}</div>
      <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{lead}</p>
    </div>
  );
}
