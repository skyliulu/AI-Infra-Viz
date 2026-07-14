import { AlertTriangle, Braces, Info, Variable } from 'lucide-react';
import { MathFormula } from './MathFormula';
import { getStageCopy } from './content';

export function Inspector({ mode, step, state, t }) {
  const copy = getStageCopy(mode, step, t);
  return (
    <aside className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600"><Info size={14} />{t('principle')}</div>
        <h3 className="mt-2 text-base font-bold leading-6 text-slate-950">{copy.title}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">{copy.lead}</p>
      </div>

      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Variable size={14} />{t('equation')}</div>
        <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-center text-indigo-950"><MathFormula block>{copy.formula}</MathFormula></div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[['N', state.n], ['t', state.tokenIndex + 1], ['S', `${state.dk}×${state.dv}`]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 px-2 py-2 text-center"><div className="font-mono text-[9px] font-bold text-slate-400">{label}</div><div className="mt-1 font-mono text-xs font-bold text-slate-800">{value}</div></div>)}
        </div>
      </div>

      <div className="flex min-h-[220px] flex-1 flex-col bg-[#0d1117] p-4 text-slate-300">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Braces size={14} />{t('pseudocode')}</div>
        <div className="space-y-1 font-mono text-[11px] leading-5">
          {copy.code.map((line, index) => <div key={`${line}-${index}`} className={`rounded-r-lg border-l-2 px-3 py-1.5 ${index === copy.activeLine ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-transparent text-slate-400'}`}>{line}</div>)}
        </div>
      </div>

      <div className="border-t border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800"><AlertTriangle size={14} />{t('boundary')}</div>
        <p className="mt-2 text-xs leading-5 text-amber-950/80">{copy.boundary}</p>
      </div>
    </aside>
  );
}
