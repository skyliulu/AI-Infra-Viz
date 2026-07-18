import React from 'react';
import { ArrowDown, ArrowRight, CornerDownRight, GitMerge, Layers3, Repeat2, Sparkles } from 'lucide-react';
import { MathFormula } from '../linear-attention/MathFormula';

const palette = {
  indigo: { border: 'border-indigo-200', soft: 'bg-indigo-50', text: 'text-indigo-800', rgb: '99,102,241' },
  blue: { border: 'border-blue-200', soft: 'bg-blue-50', text: 'text-blue-800', rgb: '59,130,246' },
  cyan: { border: 'border-cyan-200', soft: 'bg-cyan-50', text: 'text-cyan-800', rgb: '6,182,212' },
  emerald: { border: 'border-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-800', rgb: '16,185,129' },
  amber: { border: 'border-amber-200', soft: 'bg-amber-50', text: 'text-amber-800', rgb: '245,158,11' },
  teal: { border: 'border-teal-200', soft: 'bg-teal-50', text: 'text-teal-800', rgb: '20,184,166' },
  purple: { border: 'border-purple-200', soft: 'bg-purple-50', text: 'text-purple-800', rgb: '168,85,247' },
  slate: { border: 'border-slate-200', soft: 'bg-slate-50', text: 'text-slate-700', rgb: '100,116,139' },
};

const statusClass = {
  active: 'ring-2 ring-offset-1 shadow-md opacity-100',
  passed: 'border-emerald-200 opacity-90',
  pending: 'opacity-70',
};

const tensorStatusClass = {
  active: 'shadow-sm',
  passed: '',
  pending: '',
};

const cellColor = (value, color) => {
  const alpha = 0.12 + Math.abs(value ?? 0) * 0.42;
  return `rgba(${palette[color].rgb},${alpha})`;
};

const TensorMatrix = ({
  id,
  label,
  shape,
  values,
  color = 'slate',
  mask,
  selected,
  status = 'passed',
  note,
  compact = false,
}) => {
  const rows = values.length;
  const cols = values[0]?.length ?? 1;
  const colors = palette[color];
  return (
    <div
      data-tensor-id={id}
      data-tensor-shape={shape}
      className={`min-w-0 rounded-xl border p-2 transition ${colors.border} ${colors.soft} ${tensorStatusClass[status]}`}
    >
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <span className={`truncate text-[10px] font-bold ${colors.text}`}>{label}</span>
        <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shadow-sm">
          <MathFormula>{shape}</MathFormula>
        </span>
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {values.flatMap((row, rowIndex) => row.map((value, colIndex) => {
          const isMasked = Boolean(mask?.[rowIndex]?.[colIndex]);
          const isSelected = Boolean(selected?.(rowIndex, colIndex));
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              aria-label={isMasked ? `${label} masked row ${rowIndex + 1} column ${colIndex + 1}` : `${label} row ${rowIndex + 1} column ${colIndex + 1}`}
              className={`${compact ? 'h-3.5' : 'h-5'} min-w-0 rounded-[3px] border text-center font-mono text-[7px] leading-5 transition ${isMasked ? 'border-slate-200 bg-[repeating-linear-gradient(135deg,#e2e8f0_0,#e2e8f0_2px,#f8fafc_2px,#f8fafc_5px)] text-transparent' : 'border-white/80 text-slate-700'} ${isSelected ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
              style={isMasked ? undefined : { backgroundColor: cellColor(value, color) }}
              title={isMasked ? 'masked' : value.toFixed(2)}
            >
              {!compact && !isMasked ? value.toFixed(1) : ''}
            </div>
          );
        }))}
      </div>
      {note && <div className="mt-1.5 text-[9px] leading-3 text-slate-500">{note}</div>}
      <span className="sr-only">{rows} by {cols} representative cells</span>
    </div>
  );
};

const FlowArrow = ({ label, active, vertical = false }) => (
  <div className={`flex shrink-0 items-center justify-center gap-1 text-[9px] font-semibold ${active ? 'text-indigo-600' : 'text-slate-300'} ${vertical ? 'flex-col py-1' : 'px-0.5'}`}>
    {vertical ? <ArrowDown size={15} /> : <ArrowRight size={15} />}
    {label && <span className="whitespace-nowrap">{label}</span>}
  </div>
);

const StageShell = ({ status, statusLabel, title, subtitle, color = 'indigo', children, testId }) => {
  const colors = palette[color];
  return (
    <section data-testid={testId} data-stage-status={status} className={`rounded-2xl border bg-white p-3 transition ${colors.border} ${statusClass[status]}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`text-xs font-bold ${colors.text}`}>{title}</h3>
          <p className="mt-0.5 text-[9px] leading-3 text-slate-500">{subtitle}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${status === 'active' ? `${colors.soft} ${colors.text}` : 'bg-slate-100 text-slate-500'}`}>{statusLabel}</span>
      </div>
      {children}
    </section>
  );
};

export const LayerKvOverview = ({ snapshot, maxTokens, promptLength, t }) => {
  const { cache, currentLayer, totalLayers } = snapshot;
  const representativeLayers = [...new Set([1, 2, currentLayer, Math.max(1, totalLayers - 1), totalLayers])].sort((a, b) => a - b);
  return (
    <div data-testid="layer-kv-overview" className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-500">{t('currentLayerCache')}</div>
          <div className="mt-1 text-xl font-bold text-indigo-700">{cache.currentLayerTokens}<span className="text-xs font-semibold text-indigo-400"> / {maxTokens}</span></div>
          <div className="text-[9px] text-indigo-500">{t('layerLabel')} {currentLayer} · K/V</div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">{t('layerCommitProgress')}</div>
          <div className="mt-1 text-xl font-bold text-emerald-700">{cache.completedLayerCount}<span className="text-xs font-semibold text-emerald-500"> / {totalLayers}</span></div>
          <div className="text-[9px] text-emerald-600">{t(snapshot.isPrefill ? 'batchWrite' : 'singleAppend')}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        {['K', 'V'].map((kind) => (
          <div key={kind} className="mb-1.5 flex items-center gap-2 last:mb-0">
            <div className={`w-4 text-[10px] font-bold ${kind === 'K' ? 'text-cyan-700' : 'text-emerald-700'}`}>{kind}</div>
            <div className="grid min-w-0 flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${maxTokens}, minmax(0, 1fr))` }}>
              {Array.from({ length: maxTokens }, (_, index) => {
                const filled = index < cache.currentLayerTokens;
                const isPrompt = index < promptLength;
                const writing = cache.writeActive && index === cache.writeIndex;
                return <div key={index} title={`${kind} · token ${index + 1}`} className={`h-4 rounded-[3px] border transition ${filled ? isPrompt ? 'border-blue-400 bg-blue-300' : 'border-emerald-400 bg-emerald-300' : 'border-slate-200 bg-slate-50'} ${writing ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`} />;
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-500"><Layers3 size={12} />{t('layerStack')}</div>
        <div className="grid grid-cols-5 gap-1">
          {representativeLayers.map((layer) => {
            const tokens = cache.layerTokens[layer - 1];
            const active = layer === currentLayer;
            return (
              <div key={layer} className={`rounded border px-1.5 py-1 text-center ${active ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-300' : 'border-slate-200 bg-slate-50'}`}>
                <div className="text-[8px] font-bold text-slate-500">L{layer}</div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-slate-200"><div className="h-full bg-indigo-500" style={{ width: `${maxTokens ? (tokens / maxTokens) * 100 : 0}%` }} /></div>
                <div className="mt-0.5 text-[8px] font-mono text-slate-500">{tokens}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SamplingCurve = ({ sampling, t }) => {
  if (!sampling) return <div className="py-5 text-center text-[9px] italic text-slate-400">{t('waitCalc')}</div>;
  const width = 280;
  const height = 112;
  const plot = { left: 20, right: 10, top: 8, bottom: 28 };
  const innerWidth = width - plot.left - plot.right;
  const innerHeight = height - plot.top - plot.bottom;
  const x = (index) => plot.left + (sampling.totalCount === 1 ? innerWidth / 2 : (index / (sampling.totalCount - 1)) * innerWidth);
  const y = (probability) => plot.top + (1 - probability) * innerHeight;
  const points = (field) => sampling.candidates.map((candidate, index) => `${x(index)},${y(candidate[field])}`).join(' ');

  return (
    <div data-testid="sampling-curve" data-kept-count={sampling.keptCount} data-total-count={sampling.totalCount} className="min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('samplingCurve')} className="h-28 w-full overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((value) => <line key={value} x1={plot.left} x2={width - plot.right} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeWidth="1" />)}
        <line x1={plot.left} x2={width - plot.right} y1={y(sampling.topP)} y2={y(sampling.topP)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
        <polyline points={points('temperatureProbability')} fill="none" stroke="#a855f7" strokeWidth="2" />
        <polyline points={points('cumulativeProbability')} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
        <polyline points={points('finalProbability')} fill="none" stroke="#10b981" strokeWidth="2.5" />
        {sampling.candidates.map((candidate, index) => {
          const tokenLabel = (candidate.t.trim() || candidate.t);
          const compactLabel = tokenLabel.length > 8 ? `${tokenLabel.slice(0, 7)}…` : tokenLabel;
          return (
          <g key={`${candidate.t}-${index}`}>
            <circle cx={x(index)} cy={y(candidate.finalProbability)} r={candidate.accepted ? 4 : 3} fill={candidate.accepted ? '#10b981' : '#cbd5e1'} stroke="white" strokeWidth="1.5" />
            <text x={x(index)} y={height - 10} textAnchor="middle" className="fill-slate-500 text-[8px]">{compactLabel}</text>
          </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[8px] font-semibold text-slate-500">
        <span className="flex items-center gap-1"><i className="h-0.5 w-3 bg-purple-500" />{t('temperatureCurve')}</span>
        <span className="flex items-center gap-1"><i className="h-0.5 w-3 bg-emerald-500" />{t('filteredCurve')}</span>
        <span className="flex items-center gap-1"><i className="w-3 border-t border-dashed border-amber-500" />{t('cumulativeCurve')}</span>
      </div>
      <div className="mt-1 text-center text-[9px] font-semibold text-purple-700">{t('keptCandidates')} {sampling.keptCount} / {sampling.totalCount}</div>
    </div>
  );
};

export const TensorWorkbench = ({ snapshot, sampling, sampledToken, t }) => {
  const { tensors, attention, moe, stageStatus } = snapshot;
  const seqShape = snapshot.isPrefill ? String.raw`L\times d` : String.raw`1\times d`;
  const headShape = snapshot.isPrefill ? String.raw`L\times d_h` : String.raw`1\times d_h`;
  const scoreShape = snapshot.isPrefill ? String.raw`L\times L` : String.raw`1\times L_{\mathrm{cache}}`;
  const tokenLabels = Array.from({ length: snapshot.displaySequenceRows }, (_, index) => snapshot.isPrefill ? `t${index + 1}` : 't');

  return (
    <div data-testid="tensor-workbench" className="relative space-y-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${snapshot.isPrefill ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'}`}>{t(snapshot.isPrefill ? 'prefill' : 'decode')}</span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-500">{t('representativeSlice')}</span>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Layer {snapshot.layerProgress}</span>
      </div>

      <StageShell status={stageStatus.embedding} statusLabel={t(`status_${stageStatus.embedding}`)} title={t('embeddingLookupTitle')} subtitle={t('embeddingLookupDesc')} color="indigo" testId="tensor-stage-embedding">
        <div className="grid items-center gap-2 sm:grid-cols-[minmax(80px,.7fr)_auto_minmax(100px,1fr)_auto_minmax(120px,1.1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1 text-[9px] font-bold text-slate-600">{t('tokenIds')}</div>
            <div className="flex flex-wrap gap-1">{tokenLabels.map((token, index) => <span key={index} className="rounded border border-slate-200 bg-white px-1.5 py-1 font-mono text-[8px] text-slate-600">{token}</span>)}</div>
          </div>
          <FlowArrow active={stageStatus.embedding === 'active'} />
          <TensorMatrix id="embedding-table" label={t('embeddingTable')} shape={String.raw`|\mathcal V|\times d`} values={tensors.embeddingTable} color="slate" status={stageStatus.embedding} compact />
          <FlowArrow label={t('rowLookup')} active={stageStatus.embedding === 'active'} />
          <TensorMatrix id="residual-x" label={t('residualStream')} shape={seqShape} values={tensors.residual} color="indigo" status={stageStatus.embedding} />
        </div>
      </StageShell>

      <FlowArrow vertical active={stageStatus.embedding === 'active'} />

      <StageShell status={stageStatus.attention} statusLabel={t(`status_${stageStatus.attention}`)} title={t('attentionTensorTitle')} subtitle={t(snapshot.isPrefill ? 'attentionTensorPrefill' : 'attentionTensorDecode')} color="blue" testId="tensor-stage-attention">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">RMSNorm</span>
          <ArrowRight size={13} className="text-slate-300" />
          <span>{t('qkvProjection')}</span>
          <span className="ml-auto rounded border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 font-semibold text-fuchsia-700"><MathFormula>{snapshot.positionFormula}</MathFormula></span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <TensorMatrix id="tensor-q" label="Q · RoPE" shape={headShape} values={tensors.q} color="blue" status={stageStatus.attention} />
          <TensorMatrix id="tensor-k" label="K · RoPE" shape={headShape} values={tensors.k} color="cyan" status={stageStatus.attention} note={t('writeCurrentLayerK')} />
          <TensorMatrix id="tensor-v" label="V" shape={headShape} values={tensors.v} color="emerald" status={stageStatus.attention} note={t('writeCurrentLayerV')} />
        </div>
        <div className="my-2 flex items-center justify-center"><ArrowDown size={15} className={stageStatus.attention === 'active' ? 'text-blue-500' : 'text-slate-300'} /></div>
        <div className="grid items-center gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <TensorMatrix id="attention-score" label={t('scoreMatrix')} shape={scoreShape} values={attention.scores} mask={attention.mask} color="amber" status={stageStatus.attention} note={snapshot.isPrefill ? t('causalMaskVisible') : t('queryReadsCache')} />
          <FlowArrow label={t('softmax')} active={stageStatus.attention === 'active'} />
          <TensorMatrix id="attention-probability" label={t('probabilityMatrix')} shape={scoreShape} values={attention.probabilities} mask={attention.mask} color="purple" status={stageStatus.attention} />
          <FlowArrow label={<MathFormula>{String.raw`\times V`}</MathFormula>} active={stageStatus.attention === 'active'} />
          <TensorMatrix id="attention-output" label={t('attentionOutput')} shape={seqShape} values={tensors.attentionOutput} color="indigo" status={stageStatus.attention} />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-semibold text-indigo-600"><GitMerge size={13} />{t('attentionResidualMerge')}</div>
      </StageShell>

      <FlowArrow vertical active={stageStatus.attention === 'active'} />

      <StageShell status={stageStatus.ffn} statusLabel={t(`status_${stageStatus.ffn}`)} title={t(snapshot.modelType === 'moe' ? 'moeTensorTitle' : 'denseTensorTitle')} subtitle={t(snapshot.modelType === 'moe' ? 'moeTensorDesc' : 'denseTensorDesc')} color={snapshot.modelType === 'moe' ? 'teal' : 'indigo'} testId="tensor-stage-ffn">
        {snapshot.modelType === 'dense' ? (
          <div className="space-y-2">
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1.2fr]">
              <TensorMatrix id="ffn-input" label="Norm(X)" shape={seqShape} values={tensors.residual} color="slate" status={stageStatus.ffn} />
              <FlowArrow label={<MathFormula>{String.raw`\times`}</MathFormula>} active={stageStatus.ffn === 'active'} />
              <TensorMatrix id="ffn-up-weight" label="W_up" shape={String.raw`d\times 4d`} values={tensors.ffnUpWeight} color="blue" status={stageStatus.ffn} compact />
              <FlowArrow label="GELU" active={stageStatus.ffn === 'active'} />
              <TensorMatrix id="ffn-hidden" label={t('expandedHidden')} shape={snapshot.isPrefill ? String.raw`L\times 4d` : String.raw`1\times 4d`} values={tensors.ffnHidden} color="amber" status={stageStatus.ffn} />
            </div>
            <div className="grid items-center gap-2 sm:grid-cols-[1.2fr_auto_1fr_auto_1fr]">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[9px] font-bold text-amber-800">{t('reuseExpandedHidden')}</div>
              <FlowArrow label={<MathFormula>{String.raw`\times`}</MathFormula>} active={stageStatus.ffn === 'active'} />
              <TensorMatrix id="ffn-down-weight" label="W_down" shape={String.raw`4d\times d`} values={tensors.ffnDownWeight} color="blue" status={stageStatus.ffn} compact />
              <FlowArrow active={stageStatus.ffn === 'active'} />
              <TensorMatrix id="ffn-output" label={t('ffnOutput')} shape={seqShape} values={tensors.ffnOutput} color="indigo" status={stageStatus.ffn} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid items-center gap-2 md:grid-cols-[.75fr_auto_1.15fr_.8fr]">
              <TensorMatrix id="moe-router-weight" label="W_gate" shape={String.raw`d\times E`} values={tensors.routerWeight} color="slate" status={stageStatus.ffn} compact />
              <FlowArrow active={stageStatus.ffn === 'active'} />
              <TensorMatrix id="moe-router" label={t('routerByToken')} shape={snapshot.isPrefill ? String.raw`L\times E` : String.raw`1\times E`} values={moe.routerValues} color="teal" status={stageStatus.ffn} selected={(row, col) => moe.routes[row]?.topK.includes(col)} note={t(snapshot.isPrefill ? 'perTokenTopK' : 'singleTokenTopK')} />
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-2">
                <div className="mb-2 flex items-center gap-1 text-[9px] font-bold text-teal-800"><Repeat2 size={12} />{t('expertBank')}</div>
                <div className="grid grid-cols-4 gap-1">
                  {moe.expertLoads.map((load, expert) => <div key={expert} className={`rounded border p-1 text-center ${load ? 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'border-slate-200 bg-white text-slate-400'}`}><div className="text-[8px] font-bold">E{expert}</div><div className="font-mono text-[8px]">{load}</div></div>)}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2">
              <div className="mb-2 text-[9px] font-bold text-amber-800">{t('selectedExpertWeights')} E{moe.selectedExpert}</div>
              <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
                <TensorMatrix id="expert-up-weight" label={`E${moe.selectedExpert} · W_up`} shape={String.raw`d\times 4d`} values={tensors.expertUpWeight} color="amber" status={stageStatus.ffn} compact />
                <FlowArrow label={t('expertActivation')} active={stageStatus.ffn === 'active'} />
                <TensorMatrix id="expert-hidden" label={t('expertHidden')} shape={snapshot.isPrefill ? String.raw`L\times 4d` : String.raw`1\times 4d`} values={tensors.ffnHidden} color="amber" status={stageStatus.ffn} />
                <FlowArrow active={stageStatus.ffn === 'active'} />
                <TensorMatrix id="expert-down-weight" label={`E${moe.selectedExpert} · W_down`} shape={String.raw`4d\times d`} values={tensors.expertDownWeight} color="teal" status={stageStatus.ffn} compact />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 text-[9px] font-semibold text-teal-700"><GitMerge size={13} />{t('weightedExpertMerge')}<ArrowRight size={12} /><MathFormula>{seqShape}</MathFormula></div>
          </div>
        )}
        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-semibold text-indigo-600"><GitMerge size={13} />{t('ffnResidualMerge')}</div>
      </StageShell>

      <FlowArrow vertical active={stageStatus.ffn === 'active'} />

      <StageShell status={stageStatus.lmHead} statusLabel={t(`status_${stageStatus.lmHead}`)} title={t('lmTensorTitle')} subtitle={t('lmTensorDesc')} color="purple" testId="tensor-stage-lm-head">
        <div className="grid items-center gap-2 sm:grid-cols-[.8fr_auto_1fr_auto_1fr]">
          <TensorMatrix id="last-hidden" label={t('lastHiddenRow')} shape={String.raw`1\times d`} values={tensors.lastHidden} color="indigo" status={stageStatus.lmHead} />
          <FlowArrow label={<MathFormula>{String.raw`\times`}</MathFormula>} active={stageStatus.lmHead === 'active'} />
          <TensorMatrix id="vocab-weight" label="W_vocab" shape={String.raw`d\times |\mathcal V|`} values={tensors.vocabWeight} color="slate" status={stageStatus.lmHead} compact />
          <FlowArrow active={stageStatus.lmHead === 'active'} />
          <TensorMatrix id="logits" label={t('logitsVector')} shape={String.raw`1\times |\mathcal V|`} values={tensors.logits} color="purple" status={stageStatus.lmHead} />
        </div>
        <div className="mt-2 grid gap-2 rounded-xl border border-purple-100 bg-purple-50 p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="space-y-1 rounded-lg border border-purple-200 bg-white px-2 py-1 text-center text-[9px] font-bold text-purple-700">
            <div><MathFormula>{String.raw`T=${(sampling?.temperature ?? 0.7).toFixed(1)}`}</MathFormula></div>
            <div><MathFormula>{String.raw`K=${sampling?.topK ?? 3}`}</MathFormula></div>
            <div><MathFormula>{String.raw`P=${(sampling?.topP ?? 0.9).toFixed(1)}`}</MathFormula></div>
          </div>
          <SamplingCurve sampling={sampling} t={t} />
          <div className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700"><Sparkles size={12} />{sampledToken ?? t('sampleNext')}</div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-semibold text-indigo-600"><CornerDownRight size={13} />{t('feedbackToDecode')}</div>
      </StageShell>
    </div>
  );
};
