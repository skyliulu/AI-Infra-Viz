// Deterministic teaching fixtures, not checkpoint inference or a hardware benchmark.
export const WEIGHTS = [
  [.12, -.37, .64, -.91, 1.23, -.18, .43, -.72],
  [-.28, .51, -.83, .16, -.62, 1.07, -.34, .79],
  [.93, -.14, .32, -.56, .21, -.78, 1.16, -.45],
];
export const clone = a => a.map(r => [...r]);
export const MODES = ['fp16', 'w4', 'w8', 'fp8'];
export const ALGORITHMS = ['rtn', 'awq', 'gptq', 'smooth'];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const maxAbs = a => Math.max(0, ...a.flat().map(Math.abs));
export const mse = (a, b) => a.flat().reduce((sum, v, i) => sum + (v - b.flat()[i]) ** 2, 0) / a.flat().length;
export const linear = (x, w) => x.map(row => w.map(out => out.reduce((sum, v, i) => sum + v * row[i], 0)));
export function fixture(outliers = true) {
  return Array.from({length: 12}, (_, r) => Array.from({length: 8}, (_, c) => {
    const v = Math.sin((r + 1) * (c + 2) * .71) + .35 * Math.cos(r * .6 + c);
    return outliers && c === 2 ? v * 9 + Math.sign(v) * 3 : v;
  }));
}
export function roundEven(x) {
  const f = Math.floor(x), d = x - f;
  return d === .5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x);
}
// Binary16 reference for the primer, separate from the high-precision experiment.
// Its selectable examples are all finite normals; reject other classes explicitly.
export function describeFP16(value) {
  const magnitude = Math.abs(value);
  if (!Number.isFinite(value) || magnitude < 2 ** -14 || magnitude > 65504) throw new Error('FP16 primer expects a finite normal value');
  let power = Math.floor(Math.log2(magnitude));
  let fraction = roundEven((magnitude / 2 ** power - 1) * 1024);
  if (fraction === 1024) { fraction = 0; power++; }
  const sign = +(value < 0), exponent = power + 15, significand = 1 + fraction / 1024;
  const fields = [String(sign), exponent.toString(2).padStart(5, '0'), fraction.toString(2).padStart(10, '0')];
  const represented = (-1) ** sign * significand * 2 ** power;
  return {input:value, sign, exponent, fraction, power, significand, fields, bits:fields.join(''), represented, error:represented-value};
}
// Positive finite E4M3FN encodings, including subnormals, excluding NaN (0x7f).
export const FP8_VALUES = Array.from({length: 127}, (_, code) => {
  const e = code >> 3, m = code & 7;
  return e === 0 ? m * 2 ** -9 : (1 + m / 8) * 2 ** (e - 7);
});
export function nearestFP8(x) {
  let best = 0;
  FP8_VALUES.forEach((v, i) => {
    const d = Math.abs(v - Math.abs(x)), prev = Math.abs(FP8_VALUES[best] - Math.abs(x));
    if (d < prev || (d === prev && i % 2 === 0)) best = i;
  });
  return Math.sign(x) * FP8_VALUES[best];
}
export function quantize(matrix, {format = 'int4', group = 8, clip = 1, affine = false, fixedScale} = {}) {
  if (!matrix.length || !matrix[0].length || matrix.some(r => r.length !== matrix[0].length || r.some(v => !Number.isFinite(v)))) throw new Error('Expected a finite rectangular matrix');
  if (!['fp16','int4','int8','fp8'].includes(format)) throw new Error('Unsupported format');
  if (fixedScale !== undefined && (!Number.isFinite(fixedScale) || fixedScale <= 0)) throw new Error('Scale must be positive');
  const rows = matrix.length, cols = matrix[0].length;
  clip = clamp(Number.isFinite(clip) ? clip : 1, .01, 1);
  if (group !== 'tensor' && (!Number.isInteger(group) || group < 1 || cols % group !== 0)) throw new Error('Group must divide the row width');
  const bits = format === 'int4' ? 4 : format === 'fp16' ? 16 : 8;
  const fp = format === 'fp8', limit = fp ? 448 : 2 ** (bits - 1) - 1;
  const size = group === 'tensor' ? rows * cols : Number(group);
  const flat = matrix.flat(), params = [], codes = [], values = [], ids = [];
  for (let start = 0; start < flat.length; start += size) {
    const chunk = flat.slice(start, start + size);
    const bound = maxAbs(chunk) * clip;
    const lo = Math.min(0, ...chunk) * clip, hi = Math.max(0, ...chunk) * clip;
    const isAffine = affine && !fp;
    const scale = fixedScale ?? (format === 'fp16' ? 1 : (isAffine ? (hi - lo) / (2 ** bits - 1) : bound / limit) || 1);
    const zero = isAffine ? clamp(roundEven(-lo / scale), 0, 2 ** bits - 1) : 0;
    const p = {scale, zero, bound, start, count: chunk.length};
    params.push(p);
    chunk.forEach(v => {
      const q = format === 'fp16' ? v : fp ? nearestFP8(v / scale) :
        clamp(roundEven(v / scale) + zero, isAffine ? 0 : -limit, isAffine ? 2 ** bits - 1 : limit);
      codes.push(q); values.push(format === 'fp16' ? v : (q - zero) * scale); ids.push(params.length - 1);
    });
  }
  const reshape = a => Array.from({length: rows}, (_, r) => a.slice(r * cols, (r + 1) * cols));
  return {values: reshape(values), codes: reshape(codes), ids: reshape(ids), params, bits,
    payload: Math.ceil(flat.length * bits / 8), metadata: format === 'fp16' ? 0 : params.length * (affine && !fp ? 5 : 4),
    error: mse(matrix, reshape(values))};
}
function inverse(a) {
  const n = a.length, m = a.map((r, i) => [...r, ...Array.from({length: n}, (_, j) => +(i === j))]);
  for (let i = 0; i < n; i++) {
    const pivot = m[i][i];
    for (let c = 0; c < 2 * n; c++) m[i][c] /= pivot;
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = m[r][i];
      for (let c = 0; c < 2 * n; c++) m[r][c] -= f * m[i][c];
    }
  }
  return m.map(r => r.slice(n));
}
export function deriveAlgorithmModel(algorithm = 'awq', outliers = true, step = 0, alpha = .5) {
  if (!ALGORITHMS.includes(algorithm)) algorithm = 'awq';
  alpha = clamp(Number.isFinite(alpha) ? alpha : .5, 0, 1);
  const x = fixture(outliers), w = clone(WEIGHTS), reference = linear(x, w);
  const baseline = quantize(w), scores = [], snapshots = [];
  let scales = Array(8).fill(1), transformed = w, input = x, q = baseline, finalW = baseline.values;
  let stages = ['calibrate', 'quantWeights', 'pack'];
  if (algorithm === 'awq' || algorithm === 'smooth') {
    const a = Array.from({length: 8}, (_, c) => algorithm === 'awq'
      ? x.reduce((s, r) => s + Math.abs(r[c]), 0) / x.length : Math.max(...x.map(r => Math.abs(r[c]))));
    const tryScale = exponent => {
      let s = a.map((v, c) => algorithm === 'awq' ? v ** exponent : v ** exponent / Math.max(...w.map(r => Math.abs(r[c]))) ** (1 - exponent));
      const norm = Math.sqrt(Math.max(...s) * Math.min(...s)); s = s.map(v => v / norm);
      const tw = w.map(r => r.map((v, c) => v * s[c])), tx = x.map(r => r.map((v, c) => v / s[c]));
      const qw = quantize(tw, {format: algorithm === 'smooth' ? 'int8' : 'int4'});
      const qx = algorithm === 'smooth' ? quantize(tx, {format: 'int8'}).values : tx;
      return {s, tw, tx, qw, qx, error: mse(reference, linear(qx, qw.values))};
    };
    const candidates = algorithm === 'awq' ? Array.from({length: 11}, (_, i) => tryScale(i / 10)) : [tryScale(alpha)];
    candidates.forEach((v, i) => scores.push({alpha: i / 10, error: v.error}));
    const best = candidates.reduce((a, b) => a.error <= b.error ? a : b);
    scales = best.s; transformed = best.tw; input = best.qx; q = best.qw;
    finalW = q.values;
    stages = ['calibrate', algorithm === 'awq' ? 'search' : 'smoothScale', 'quantWeights', 'pack'];
  } else if (algorithm === 'gptq') {
    const h = Array.from({length: 8}, (_, i) => Array.from({length: 8}, (_, j) => x.reduce((s, r) => s + r[i] * r[j], 0) / x.length));
    const damping = h.reduce((s, r, i) => s + r[i], 0) / 8 * .01;
    h.forEach((r, i) => { r[i] += damping; });
    let inv = inverse(h), current = clone(w);
    for (let c = 0; c < 8; c++) {
      const before = clone(current);
      current.forEach((r, ri) => {
        const scale = baseline.params[ri].scale;
        const target = clamp(roundEven(r[c] / scale), -7, 7) * scale;
        const error = r[c] - target;
        for (let j = c + 1; j < 8; j++) r[j] -= error * inv[0][j - c] / inv[0][0];
        r[c] = target;
      });
      snapshots.push({before, after: clone(current), column: c});
      inv = inv.slice(1).map((r, i) => r.slice(1).map((v, j) => v - inv[i + 1][0] * inv[0][j + 1] / inv[0][0]));
    }
    finalW = current;
    stages = ['calibrate', ...Array.from({length: 8}, (_, i) => `column${i}`), 'pack'];
  }
  const completed = clamp(Math.floor(Number.isFinite(step) ? step : 0), 0, stages.length);
  let visibleW = w, visibleX = x, committed = 0;
  if (algorithm === 'gptq') {
    committed = clamp(completed - 1, 0, 8);
    visibleW = committed ? snapshots[committed - 1].after : w;
  } else {
    const scaled = (algorithm === 'awq' || algorithm === 'smooth') && completed >= 2;
    visibleW = scaled ? transformed : w;
    visibleX = scaled ? x.map(r => r.map((v, c) => v / scales[c])) : x;
    if (completed >= stages.indexOf('quantWeights') + 1) {visibleW = finalW; visibleX = input; committed = 8;}
  }
  return {algorithm, x, w, reference, stages, completed, scales, scores, snapshots, visibleW, visibleX, committed,
    visibleOutput: linear(visibleX, visibleW), finalW, finalOutput: linear(input, finalW),
    error: mse(reference, linear(visibleX, visibleW)), finalError: mse(reference, linear(input, finalW)),
    baselineError: mse(reference, linear(x, baseline.values)), q};
}
export const modeFormat = mode => ({fp16:'fp16', w4:'int4', w8:'int8', fp8:'fp8'}[mode] || 'int4');
export function deriveCapacityModel({mode = 'w4', batch = 1, context = 2048, kv = 'fp16', prefill = false} = {}) {
  if (!MODES.includes(mode)) mode = 'w4';
  batch = clamp(Math.round(Number.isFinite(batch) ? batch : 1), 1, 8);
  context = clamp(Math.round((Number.isFinite(context) ? context : 2048) / 256) * 256, 256, 8192);
  const d = 4096, layers = 32, heads = 8, hd = 128, ffn = 11008;
  const weights = layers * (2 * d * d + 2 * d * heads * hd + 3 * d * ffn);
  const wb = mode === 'fp16' ? 16 : mode === 'w4' ? 4 : 8;
  const ab = mode === 'w8' || mode === 'fp8' ? 8 : 16;
  const kb = kv === 'fp16' ? 16 : 8;
  const weightPayload = weights * wb / 8, weightScales = wb === 16 ? 0 : Math.ceil(weights / 128) * 4;
  const kvElements = 2 * layers * batch * context * heads * hd;
  const kvScales = kb === 16 ? 0 : 2 * layers * batch * context * heads * 4;
  const highWeights = weights * 2, highKV = kvElements * 2;
  const tokens = batch * (prefill ? context : 1);
  return {shape:{layers, batch, context, heads, headDim:hd}, kvElements, kvPayload:kvElements * kb / 8,
    weights, weightPayload, weightScales, weightBytes:weightPayload + weightScales,
    kvBytes:kvElements * kb / 8 + kvScales, kvScales, highWeights, highKV,
    baseline:highWeights + highKV, total:weightPayload + weightScales + kvElements * kb / 8 + kvScales,
    activation:tokens * d * ab / 8, highActivation:tokens * d * 2,
    weightBytesPerToken:(weightPayload + weightScales) / tokens, tokens, wb, ab, kb};
}
export function deriveNumericModel({mode = 'w4', group = 8, clip = 1, affine = false, outliers = true, selected = 2, floatSource = 'example'} = {}) {
  const x = fixture(outliers), w = clone(WEIGHTS), format = modeFormat(mode);
  const q = quantize(w, {format, group, clip, affine});
  const i = clamp(Math.floor(Number.isFinite(selected) ? selected : 0), 0, 23), r = Math.floor(i / 8), c = i % 8, p = q.params[q.ids[r][c]];
  const input = mode === 'w8' || mode === 'fp8' ? quantize(x, {format, group:8}).values : x;
  const baselineBytes = w.flat().length * 2, totalBytes = q.payload + q.metadata;
  // Real low-precision bit patterns; the high-precision baseline remains a
  // storage budget, not a fabricated FP16 rounding simulation.
  const packedCodes = format === 'fp16' ? [] : q.codes.flat().map(value => {
    const raw = format === 'fp8' ? FP8_VALUES.indexOf(Math.abs(value)) + (value < 0 ? 128 : 0)
      : (value + 2 ** q.bits) % 2 ** q.bits;
    return raw.toString(2).padStart(q.bits, '0');
  });
  const contributions = w[r].map((value, col) => (q.values[r][col] - value) * x[0][col]);
  const extraActivationError = input[0].reduce((sum, value, col) => sum + (value - x[0][col]) * q.values[r][col], 0);
  return {x, w, q, r, c, p, selected:i, selectedGroup:format === 'fp16' ? null : q.ids[r][c],
    format, low:format !== 'fp16', affine:affine && format !== 'fp8' && format !== 'fp16',
    float16:describeFP16(floatSource === 'selected' ? w[r][c] : .75),
    storage:{count:w.flat().length, baselineBytes, totalBytes, extent:Math.max(baselineBytes,totalBytes),
      savedBytes:baselineBytes-totalBytes, packedCodes, scaleBytes:format === 'fp16' ? 0 : q.params.length * 4,
      zeroBytes:format !== 'fp16' && format !== 'fp8' && affine ? q.params.length : 0},
    contributions, extraActivationError, weightDelta:q.values[r][c]-w[r][c],
    inputExtent:maxAbs([fixture(true)[0],fixture(false)[0]]), contribution:contributions[c],
    groupCount:format === 'fp16' ? 0 : q.params.length, emphasisColumn:outliers ? 2 : null,
    input, output:linear(input, q.values), reference:linear(x, w),
    error:mse(linear(x, w), linear(input, q.values)), value:w[r][c], code:q.codes[r][c], restored:q.values[r][c],
    ticks:format === 'fp8' ? [...FP8_VALUES.slice(1).reverse().map(v => -v * p.scale), ...FP8_VALUES.map(v => v * p.scale)] :
      format === 'fp16' ? [] : Array.from({length:affine ? 2 ** q.bits : 2 ** q.bits - 1}, (_, j) => (j - (affine ? p.zero : 2 ** (q.bits - 1) - 1)) * p.scale)};
}
export function deriveRuntimeModel({mode = 'w4', scene = 'linear', scaling = 'dynamic', kv = 'fp8', step = 0, token = 0, outliers = true} = {}) {
  if (!MODES.includes(mode)) mode = 'w4';
  if (!['fp16','fp8'].includes(kv)) kv = 'fp8';
  token = clamp(Math.floor(Number.isFinite(token) ? token : 0), 0, 2);
  const format = modeFormat(mode), lowActivation = mode === 'w8' || mode === 'fp8';
  const x = fixture(outliers), input = [x[token % 3].map(v => v * [1, 1.8, 3][token % 3])];
  const stages = scene === 'kv'
    ? (kv === 'fp16' ? ['produceKV','writeKV','readKV','attention'] : ['produceKV',scaling === 'dynamic' ? 'kvDynamic':'kvStatic','quantKV','writeKV','readKV','attention'])
    : ['loadWeights', ...(lowActivation ? [scaling === 'dynamic' ? 'dynamicScale':'staticScale','quantActivation'] : []),
      ...(mode === 'w4' ? ['unpack'] : []), mode === 'w8' ? 'intGemm' : mode === 'fp8' ? 'fp8Gemm' : 'fpGemm', 'writeOutput'];
  const completed = clamp(Math.floor(Number.isFinite(step) ? step : 0), 0, stages.length), active = completed < stages.length ? stages[completed] : null;
  const type = scene === 'kv' ? kv : lowActivation ? format : 'fp16';
  const limit = type === 'fp8' ? 448 : 127;
  const fixedScale = scaling === 'static' && type !== 'fp16' ? maxAbs(x) / limit : undefined;
  const q = quantize(input, {format:type, group:8, fixedScale});
  const weights = quantize(WEIGHTS, {format});
  const output = linear(q.values, weights.values);
  const committed = scene === 'kv' && completed > stages.indexOf('writeKV');
  const slots = Array.from({length:token + +committed}, (_, i) => {
    const row = [x[i % 3].map(v => v * [1, 1.8, 3][i % 3])];
    const stored = quantize(row, {format:kv, group:8, fixedScale:scaling === 'static' ? maxAbs(x) / 448 : undefined});
    return {token:i, scale:stored.params[0].scale, bytes:2 * (stored.payload + stored.metadata), values:stored.values[0]};
  });
  return {stages, completed, active, phase:completed === 0 ? 'idle' : completed === stages.length ? 'done' : 'running',
    input, q, weights, output, reference:linear(input, WEIGHTS), error:mse(output, linear(input, WEIGHTS)),
    committed, slots, cacheBytes:slots.reduce((sum, slot) => sum + slot.bytes, 0),
    clipped:input[0].filter(v => type !== 'fp16' && Math.abs(v) > q.params[0].scale * limit).length,
    outputReady:completed === stages.length, weightRead:completed > 0 ? weights.payload + weights.metadata : 0};
}
