import { WEIGHTS, fixture, quantize, linear, maxAbs, mse } from './model.js';

// Source contract: SGLang v0.4.6.post5, CUDA SM90+, native sgl-kernel,
// non-block FP8, fused QKV (three logical shards), TP=1, plain-text Llama:
// FlashInfer ragged no-prefix prefill, paged decode.
// Numbers are a 1-head, head_dim=1 teaching projection, NOT a runnable GPU shape.
export const ENGINE_PRESETS = ['bf16', 'load-fp8', 'saved-dynamic', 'saved-static'];
export const ENGINE_KV = ['auto', 'fp8-unit', 'fp8-file'];
export const SOURCE_ROOT = 'https://github.com/sgl-project/sglang/blob/v0.4.6.post5/python/sglang/srt/';
export const ENGINE_SOURCES = {
  configure: 'server_args.py',
  load: 'model_loader/loader.py',
  prepare: 'layers/quantization/fp8.py',
  pool: 'model_executor/model_runner.py',
  batch: 'managers/schedule_batch.py',
  activation: 'layers/quantization/fp8_utils.py',
  gemm: 'layers/quantization/fp8_utils.py',
  write: 'mem_cache/memory_pool.py',
  attention: 'layers/attention/flashinfer_backend.py',
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const transpose = a => a[0].map((_, c) => a.map(r => r[c]));

export function deriveSGLangModel({preset = 'load-fp8', kv = 'fp8-file', step = 0, outliers = true} = {}) {
  if (!ENGINE_PRESETS.includes(preset)) preset = 'load-fp8';
  if (!ENGINE_KV.includes(kv)) kv = 'fp8-file';
  const low = preset !== 'bf16', saved = preset.startsWith('saved'), staticActivation = preset === 'saved-static';
  const startup = ['configure', 'load', 'prepare', 'pool'];
  const operationsFor = c => ['batch', ...(low ? ['activation'] : []), 'gemm', ...(c === 0 ? ['attention', 'write'] : ['write', 'attention'])];
  const stages = [...startup.map(op => ({op, cycle: -1})), ...[0, 1, 2].flatMap(cycle => operationsFor(cycle).map(op => ({op, cycle})))];
  const completed = clamp(Math.floor(Number.isFinite(step) ? step : 0), 0, stages.length);
  const active = stages[completed] || null, focus = active || stages.at(-1);
  const cycle = Math.max(0, focus.cycle), inStartup = focus.cycle < 0;
  const operations = operationsFor(cycle);
  const at = (op, c = cycle) => stages.findIndex(s => s.op === op && s.cycle === c);
  const passed = (op, c = cycle) => { const i = at(op, c); return i >= 0 && completed > i; };
  const xs = fixture(outliers), weights = quantize(WEIGHTS, {format: low ? 'fp8' : 'fp16', group: 8});
  const activationScale = maxAbs(xs.slice(0, 4)) / 448 || 1;
  const batches = [xs.slice(0, 4), [xs[4].map(v => v * 1.8)], [xs[5].map(v => v * 3)]];
  // Offline KV calibration includes the stress-input range, with headroom.
  // Raw torch FP8 casts in set_kv_buffer do NOT promise saturating overflow.
  const calibrationKV = linear(batches.flat(), WEIGHTS).map(r => r.slice(1));
  const kvScale = kv === 'fp8-file' ? maxAbs(calibrationKV) * 1.25 / 448 || 1 : 1;
  const allKV = [];
  const passes = batches.map((input, c) => {
    const qx = quantize(input, {format: low ? 'fp8' : 'fp16', group: 8, ...(staticActivation ? {fixedScale: activationScale} : {})});
    const qkv = linear(qx.values, weights.values), reference = linear(input, WEIGHTS);
    const stored = quantize(qkv.map(r => r.slice(1)), {format: kv === 'auto' ? 'fp16' : 'fp8', group: 'tensor', fixedScale: kvScale});
    const start = allKV.length;
    stored.values.forEach((r, i) => allKV.push({loc: start + i + 1, cycle: c, values: r, codes: stored.codes[i]}));
    const attention = qkv.map((r, i) => {
      const prefix = c === 0 ? qkv.slice(0, i + 1).map(row => ({values: row.slice(1)})) : allKV.slice(0, start + i + 1);
      const logits = prefix.map(slot => r[0] * slot.values[0]);
      const exp = logits.map(v => Math.exp(v - Math.max(...logits))), sum = exp.reduce((a, b) => a + b, 0);
      return [prefix.reduce((s, slot, j) => s + exp[j] / sum * slot.values[1], 0)];
    });
    return {input, qx, qkv, reference, stored, start, count: input.length, attention,
      clipped: input.flat().filter((v, i) => low && Math.abs(v) > qx.params[Math.floor(i / 8)].scale * 448 + 1e-10).length,
      error: mse(qkv, reference)};
  });
  const current = passes[cycle];
  const allocated = passes.reduce((n, p, c) => n + (passed('batch', c) ? p.count : 0), 0);
  const committed = passes.reduce((n, p, c) => n + (passed('write', c) ? p.count : 0), 0);
  const poolReady = passed('pool', -1), loaded = passed('load', -1), ready = passed('prepare', -1);
  // Fixed usable payload budget (sentinel, allocator and scale metadata excluded).
  const poolBudget = 24, slotBytes = kv === 'auto' ? 4 : 2, capacity = poolBudget / slotBytes;
  const slots = Array.from({length: poolReady ? capacity : 0}, (_, i) => ({
    loc: i + 1, status: i < committed ? 'written' : i < allocated ? 'reserved' : 'free',
    ...(i < committed ? allKV[i] : {}),
  }));
  const modelPath = saved ? './fp8-checkpoint' : './bf16-checkpoint';
  const command = ['python -m sglang.launch_server', `  --model-path ${modelPath}`, '  --dtype bfloat16',
    ...(low ? ['  --quantization fp8'] : []),
    `  --kv-cache-dtype ${kv === 'auto' ? 'auto' : 'fp8_e4m3'}`,
    ...(kv === 'fp8-file' ? ['  --quantization-param-path ./kv-scales.json'] : []),
    '  --attention-backend flashinfer', '  --disable-cuda-graph'].join(' \\\n');
  const code = {
    configure: low ? 'quant_config = Fp8Config(...)\nLinearBase.quant_method = Fp8LinearMethod(quant_config)' : 'quant_config = None\nLinearBase.quant_method = UnquantizedLinearMethod()',
    load: 'model = _initialize_model(model_config, load_config)\nmodel.load_weights(weights_iterator)\n# DefaultModelLoader → load_weights_and_postprocess',
    prepare: !low ? 'UnquantizedLinearMethod.process_weights_after_loading(layer)\n# No FP8 weight conversion' : saved
      ? 'weight_scale = convert_to_channelwise(\n    layer.weight_scale, layer.logical_widths)\nlayer.weight = Parameter(weight.t())'
      : 'qweight, weight_scale = per_token_group_quant_fp8(\n    layer.weight, layer.weight.shape[-1])\nlayer.weight = Parameter(qweight.t())\nlayer.input_scale = None',
    pool: 'max_tokens = profile_max_num_token(...)\ninit_memory_pool(...)\n# MHATokenToKVPool + TokenToKVPoolAllocator',
    batch: `# ScheduleBatch, page_size=1\nout_cache_loc = token_to_kv_pool_allocator.alloc(${current.count})\n# ForwardBatch carries positions and out_cache_loc\nModelRunner.forward_${cycle === 0 ? 'extend' : 'decode'}(forward_batch)`,
    activation: staticActivation ? 'qinput, x_scale = static_quant_fp8(\n    input_2d, input_scale, repeat_scale=True)' : 'qinput, x_scale = sglang_per_token_quant_fp8(input_2d)',
    gemm: low ? 'output = fp8_scaled_mm(\n    qinput, weight, x_scale, weight_scale,\n    out_dtype=input.dtype, bias=bias)' : 'output = F.linear(x, layer.weight, bias)',
    write: kv === 'auto' ? 'pool.set_kv_buffer(layer, out_cache_loc, k, v)\n# Write BF16 K/V into allocated slots' : kv === 'fp8-unit' ? 'k, v = k.to(kv_dtype), v.to(kv_dtype)\n# Missing scale: no division (effective scale=1)\n# set_kv_buffer writes at out_cache_loc' : 'k = (k / layer.k_scale).to(kv_dtype)\nv = (v / layer.v_scale).to(kv_dtype)\n# set_kv_buffer writes at out_cache_loc',
    attention: cycle === 0 ? 'prefill_wrapper_ragged.forward(\n    q, k, v, causal=True, sm_scale=layer.scaling)\n# No prefix: use new BF16 K/V before cache write' : 'decode_wrapper.forward(\n    q, pool.get_kv_buffer(layer.layer_id),\n    k_scale=layer.k_scale, v_scale=layer.v_scale)',
  };
  const snapshot = {preset, kv, low, saved, staticActivation, stages, startup, operations, completed, active, focus, cycle, inStartup,
    phase: completed === 0 ? 'idle' : active ? 'running' : 'done', at, passed, current, passes, weights,
    checkpointView: saved ? weights.codes : WEIGHTS,
    weightView: ready && low ? transpose(weights.codes) : loaded ? saved ? weights.codes : WEIGHTS : null,
    weightShape: ready && low ? [8, 3] : [3, 8],
    weightBytes: loaded ? ready || saved ? weights.payload + weights.metadata : 48 : 0,
    weightQuantizations: preset === 'load-fp8' && ready ? 1 : 0,
    activationQuantizations: low ? passes.filter((_, c) => passed('activation', c)).length : 0,
    allocated, committed, poolReady, loaded, ready, poolBudget, slotBytes, capacity, slots, kvScale, activationScale,
    cacheReadLocations: focus.op === 'attention' && cycle > 0 ? slots.filter(s => s.status === 'written').map(s => s.loc) : [],
    kvWrittenBytes: committed * slotBytes, command, code: code[focus.op], source: ENGINE_SOURCES[focus.op],
    starts: [-1, 0, 1, 2].map(c => stages.findIndex(s => s.cycle === c)),
    shownOps: inStartup ? startup : operations,
  };
  return {...snapshot, flow: deriveEngineFlow(snapshot)};
}

// Visual facts share the execution snapshot; selecting a node never advances it.
export function deriveEngineFlow(m) {
  const has = op => !m.inStartup && m.passed(op);
  const inputReady = has('batch'), castReady = inputReady && (!m.low || has('activation'));
  const projectionReady = has('gemm'), attentionReady = has('attention');
  const nodeFor = {configure:'prepare',load:'checkpoint',prepare:'prepare',pool:'cache',batch:'input',activation:'activation',gemm:'linear',write:'cache',attention:'attention'};
  const focus = nodeFor[m.focus.op];
  const ready = {checkpoint:true, prepare:m.ready, weights:m.ready, input:inputReady, activation:castReady, linear:projectionReady, cache:m.poolReady, attention:attentionReady};
  const opEdges = {configure:[], load:['load'], prepare:['prepare'], pool:[], batch:[], activation:['cast'], gemm:['reuse',m.low ? 'compute' : 'bypass'], write:['write'], attention:[m.cycle === 0 ? 'fresh' : 'query', ...(m.cycle > 0 ? ['read'] : [])]};
  const enabled = {load:true,prepare:true,reuse:true,cast:m.low,compute:m.low,bypass:!m.low,write:true,query:!m.inStartup && m.cycle>0,fresh:!m.inStartup && m.cycle===0,read:!m.inStartup && m.cycle>0};
  const done = {load:m.loaded,prepare:m.ready,reuse:projectionReady,cast:has('activation'),compute:projectionReady,bypass:projectionReady,write:has('write'),query:attentionReady,fresh:attentionReady,read:attentionReady};
  const activeEdges = m.active ? opEdges[m.active.op] : [];
  return {
    focus, inputReady, castReady, projectionReady, attentionReady,
    nodes:Object.fromEntries(Object.entries(ready).map(([id,value]) => [id,{ready:value, active:!!m.active && id===focus}])),
    edges:Object.fromEntries(Object.keys(enabled).map(id => [id,{enabled:enabled[id],status:activeEdges.includes(id) ? 'active' : done[id] ? 'passed' : 'pending'}])),
    inputRows:m.inStartup ? 0 : m.current.count,
    inputBytes:inputReady ? m.current.count*8*2 : 0,
    activationPayload:castReady ? m.current.qx.payload : 0,
    activationMetadata:castReady ? m.current.qx.metadata : 0,
    weightPayload:m.loaded ? m.ready || m.saved ? m.weights.payload : 48 : 0,
    weightMetadata:m.loaded && (m.ready || m.saved) ? m.weights.metadata : 0,
    oldLocations:m.slots.filter(s=>s.status==='written' && s.cycle<m.cycle).map(s=>s.loc),
    newLocations:m.slots.filter(s=>s.status==='written' && s.cycle===m.cycle).map(s=>s.loc),
    // Keep physical cache identity stable; presentation state is separate from slots.
    targetLocations:inputReady ? Array.from({length:m.current.count},(_,i)=>m.current.start+i+1) : [],
  };
}
