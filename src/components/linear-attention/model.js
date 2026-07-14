export const MODES = ['exact', 'linear', 'gla'];

export const TRACKS = {
  exact: ['exactScores', 'exactMask', 'exactAggregate', 'exactBottleneck'],
  linear: ['linearMap', 'linearReorder', 'linearRecurrence', 'linearOutput'],
  gla: ['glaProblem', 'glaGate', 'glaRecurrence', 'glaOutput'],
};

export const FORMULAS = {
  projections: String.raw`\begin{aligned}q_t&=x_tW_Q\\k_t&=x_tW_K\\v_t&=x_tW_V\end{aligned}`,
  exactScore: String.raw`s_{tj}=\frac{q_t^\top k_j}{\sqrt{d_k}}`,
  exactWeights: String.raw`a_{tj}=\operatorname{softmax}(s_{t,1:t})_j`,
  exactOutput: String.raw`o_t=\sum_{j\le t}a_{tj}v_j`,
  exactMatrix: String.raw`\operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}+M\right)V`,
  featureMap: String.raw`\phi(x)=\operatorname{ELU}(x)+1`,
  outerUpdate: String.raw`\Delta S_t=\phi(k_t)v_t^\top`,
  associationLeft: String.raw`\bigl(\phi(Q)\phi(K)^\top\bigr)V`,
  associationRight: String.raw`\phi(Q)\bigl(\phi(K)^\top V\bigr)`,
  state: String.raw`S_t=S_{t-1}+\phi(k_t)v_t^\top`,
  normalizer: String.raw`z_t=z_{t-1}+\phi(k_t)`,
  linearOutput: String.raw`o_t=\frac{\phi(q_t)^\top S_t}{\phi(q_t)^\top z_t+\varepsilon}`,
  gate: String.raw`\alpha_t=\sigma(W_\alpha x_t+b_\alpha)`,
  glaMapGate: String.raw`\bar k_t=\phi(k_t),\quad \alpha_t=\sigma(W_\alpha x_t+b_\alpha)`,
  glaDecay: String.raw`\widetilde S_{t-1}=\operatorname{Diag}(\alpha_t)S_{t-1}`,
  glaWrite: String.raw`S_t=\widetilde S_{t-1}+\phi(k_t)v_t^\top`,
  gatedState: String.raw`S_t=\operatorname{Diag}(\alpha_t)S_{t-1}+\phi(k_t)v_t^\top`,
  gatedNormalizer: String.raw`z_t=\alpha_t\odot z_{t-1}+\phi(k_t)`,
};

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const round = (value) => Math.round(value * 100) / 100;

export const vectorFor = (index, salt = 0, size = 4) => Array.from({ length: size }, (_, dim) => {
  const wave = Math.sin((index + 1) * (dim + 1) * 0.71 + salt * 1.37);
  const detail = Math.cos((index + 2) * (dim + 1) * 0.29 + salt * 0.61);
  return round(wave * 0.72 + detail * 0.28);
});

export const featureMap = (vector) => vector.map((value) => round(value >= 0 ? value + 1 : Math.exp(value)));

const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);

const outer = (left, right) => left.map((leftValue) => right.map((rightValue) => round(leftValue * rightValue)));

const zeroMatrix = (rows = 4, columns = 4) => Array.from({ length: rows }, () => Array(columns).fill(0));

const addMatrix = (left, right) => left.map((row, rowIndex) => row.map((value, columnIndex) => round(value + right[rowIndex][columnIndex])));

const scaleRows = (matrix, scale) => matrix.map((row, rowIndex) => row.map((value) => round(value * scale[rowIndex])));

const softmax = (values) => {
  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
};

const weightedSum = (weights, values) => values[0].map((_, dim) => round(values.reduce((sum, value, index) => sum + weights[index] * value[dim], 0)));

const matrixRead = (query, matrix) => matrix[0].map((_, column) => round(matrix.reduce((sum, row, rowIndex) => sum + query[rowIndex] * row[column], 0)));

const accumulate = (endIndex, gated, gateStrength) => {
  let state = zeroMatrix();
  let normalizer = Array(4).fill(0);
  let previousState = zeroMatrix();
  let previousNormalizer = Array(4).fill(0);
  let decayedState = zeroMatrix();
  let decayedNormalizer = Array(4).fill(0);
  let update = zeroMatrix();
  let retention = Array(4).fill(1);

  for (let index = 0; index <= endIndex; index += 1) {
    const key = featureMap(vectorFor(index, 2));
    const value = vectorFor(index, 3);
    retention = key.map((_, dim) => gated
      ? round(clamp(1 - gateStrength * (0.42 + 0.42 * ((Math.sin((index + 1) * (dim + 2)) + 1) / 2)), 0.08, 0.98))
      : 1);
    previousState = state;
    previousNormalizer = normalizer;
    update = outer(key, value);
    decayedState = scaleRows(previousState, retention);
    decayedNormalizer = previousNormalizer.map((entry, dim) => round(entry * retention[dim]));
    state = addMatrix(decayedState, update);
    normalizer = decayedNormalizer.map((entry, dim) => round(entry + key[dim]));
  }

  return {
    state,
    normalizer,
    previousState,
    previousNormalizer,
    decayedState,
    decayedNormalizer,
    update,
    retention,
  };
};

export const getAttentionState = ({ mode, step, tokenIndex, n, dk, dv, gateStrength }) => {
  const query = vectorFor(tokenIndex, 1);
  const key = vectorFor(tokenIndex, 2);
  const value = vectorFor(tokenIndex, 3);
  const phiQuery = featureMap(query);
  const phiKey = featureMap(key);
  const prefixKeys = Array.from({ length: tokenIndex + 1 }, (_, index) => vectorFor(index, 2));
  const prefixValues = Array.from({ length: tokenIndex + 1 }, (_, index) => vectorFor(index, 3));
  const scores = prefixKeys.map((entry) => round(dot(query, entry) / 2));
  const weights = softmax(scores);
  const exactOutput = weightedSum(weights, prefixValues);
  const recurrent = accumulate(tokenIndex, mode === 'gla', gateStrength);
  const plainRecurrent = accumulate(tokenIndex, false, gateStrength);
  const numerator = matrixRead(phiQuery, recurrent.state);
  const denominator = Math.max(0.001, dot(phiQuery, recurrent.normalizer));
  const linearOutput = numerator.map((entry) => round(entry / denominator));
  const plainNumerator = matrixRead(phiQuery, plainRecurrent.state);
  const plainDenominator = Math.max(0.001, dot(phiQuery, plainRecurrent.normalizer));
  const plainOutput = plainNumerator.map((entry) => round(entry / plainDenominator));
  const sampledN = Math.min(n, 8);
  const currentSampleRow = Math.min(sampledN - 1, Math.round((tokenIndex / Math.max(1, n - 1)) * (sampledN - 1)));

  return {
    mode,
    step,
    tokenIndex,
    n,
    dk,
    dv,
    query,
    key,
    value,
    phiQuery,
    phiKey,
    scores,
    weights,
    exactOutput,
    numerator,
    denominator: round(denominator),
    linearOutput,
    plainOutput,
    plainState: plainRecurrent.state,
    plainNormalizer: plainRecurrent.normalizer,
    sampledN,
    currentSampleRow,
    scoreCells: n * n,
    exactScoreBytes: n * n * 2,
    recurrentBytes: (dk * dv + dk) * 2,
    ...recurrent,
  };
};

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
