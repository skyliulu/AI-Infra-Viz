import { AlertTriangle, Braces, CircleHelp, Eye, GitCompareArrows, Info, Variable } from 'lucide-react';
import { MathFormula } from './MathFormula';
import { getStageCopy } from './content';

export function Inspector({ mode, step, state, t }) {
  const copy = getStageCopy(mode, step, t);
  return (
    <aside className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600"><Info size={14} />{t('principle')}</div>
        <h3 className="mt-2 text-base font-bold leading-6 text-slate-950">{copy.title}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">{copy.lead}</p>

        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"><CircleHelp size={12} />{t('coreProblem')}</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-700">{copy.problem}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-indigo-600"><GitCompareArrows size={12} />{t('algorithmDifference')}</div>
            <p className="mt-1.5 text-[11px] leading-5 text-indigo-950/80">{copy.difference}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Eye size={13} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">{t('watchCanvas')}</div>
            <p className="mt-1 text-[11px] leading-5 text-emerald-950/75">{copy.visual}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Variable size={14} />{t('equation')}</div>
        <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-center text-indigo-950"><MathFormula block>{copy.formula}</MathFormula></div>
        <div className="mt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{t('variableMeaning')}</div>
        <div className="mt-2 space-y-1.5">
          {copy.variables.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-2 text-[10px] leading-4 text-slate-600"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" /><span>{item}</span></div>)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            String.raw`N=${state.n}`,
            String.raw`t=${state.tokenIndex + 1}`,
            String.raw`S\in\mathbb R^{${state.dk}\times ${state.dv}}`,
          ].map((formula) => <div key={formula} className="rounded-lg bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-800"><MathFormula>{formula}</MathFormula></div>)}
        </div>
      </div>

      <div className="flex min-h-[240px] flex-1 flex-col bg-[#0d1117] p-4 text-slate-300">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><Braces size={14} />{t('pseudocode')}</div>
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-1 font-mono text-[10px] leading-5">
            {copy.code.map((line, index) => <div key={`${line}-${index}`} className={`whitespace-pre rounded-r-lg border-l-2 px-3 py-1.5 ${index === copy.activeLine ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-transparent text-slate-400'}`}>{line}</div>)}
          </div>
        </div>
      </div>

      <div className="border-t border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800"><AlertTriangle size={14} />{t('boundary')}</div>
        <p className="mt-2 text-xs leading-5 text-amber-950/80">{copy.boundary}</p>
      </div>
    </aside>
  );
}
