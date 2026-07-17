import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = args[0];
const allowedCapabilities = new Set([
  'timeline',
  'multiple-modes',
  'resource-metrics',
  'structural-comparison',
  'data-movement',
  'dense-layout',
  'math',
]);

if (!target || target === '--help') {
  console.error('Usage: node check-module-conventions.mjs <component.jsx> [--capabilities timeline,math,...]');
  console.error(`Capabilities: ${[...allowedCapabilities].join(', ')}`);
  process.exit(2);
}

let rawCapabilities = '';
for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--capabilities') {
    rawCapabilities = args[index + 1] || '';
    index += 1;
  } else if (arg.startsWith('--capabilities=')) {
    rawCapabilities = arg.slice('--capabilities='.length);
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }
}

const capabilities = new Set(rawCapabilities.split(',').map((value) => value.trim()).filter(Boolean));
const unknownCapabilities = [...capabilities].filter((value) => !allowedCapabilities.has(value));
if (unknownCapabilities.length > 0) {
  console.error(`Unknown capabilities: ${unknownCapabilities.join(', ')}`);
  console.error(`Allowed capabilities: ${[...allowedCapabilities].join(', ')}`);
  process.exit(2);
}

const absolute = path.resolve(process.cwd(), target);
if (!fs.existsSync(absolute)) {
  console.error(`FAIL  component not found: ${absolute}`);
  process.exit(2);
}

const collectModuleSource = (file, seen = new Set()) => {
  const resolved = path.resolve(file);
  if (seen.has(resolved) || !fs.existsSync(resolved)) return '';
  seen.add(resolved);

  const text = fs.readFileSync(resolved, 'utf8');
  const directory = path.dirname(resolved);
  const imports = [...text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1]);
  const children = imports.map((specifier) => {
    const base = path.resolve(directory, specifier);
    return [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')]
      .find((candidate) => fs.existsSync(candidate));
  }).filter(Boolean);

  return [text, ...children.map((child) => collectModuleSource(child, seen))].join('\n');
};

const source = collectModuleSource(absolute);
const results = [];

const check = (name, pattern, message, level = 'FAIL') => {
  const passed = pattern.test(source);
  results.push({ name, passed, message, level });
};

check('translation route', /\bt\s*\(/, 'Route visible prose through t(key).');
check(
  'derived model',
  /\b(?:get|derive|create|build)[A-Z][A-Za-z0-9]*(?:State|Model)\b|\buseMemo\s*\(/,
  'Derive views from a pure state/model function or memoized snapshot.',
);

if (capabilities.has('math')) {
  check('math renderer', /\bMathFormula\b/, 'Render mathematical notation with MathFormula.');
}

if (capabilities.has('timeline')) {
  check('phase state', /\bphase\b/, 'Model idle, running, and done phases.');
  check('step state', /\bstep\b/, 'Expose the active execution step.');
  check('playback state', /\bisPlaying\b/, 'Track playback explicitly.');
  check('next-step handler', /\bhandleNextStep\b/, 'Implement handleNextStep().');
  check('reset handler', /\breset\b/, 'Implement reset().');
  check('play handler', /\btogglePlay\b/, 'Implement togglePlay().');
}

const hardcodedCjk = />[^\n<{]*[\u3400-\u9fff][^<{]*</.test(source);
results.push({
  name: 'hardcoded JSX prose',
  passed: !hardcodedCjk,
  message: 'Move hardcoded Chinese JSX text into the i18n dictionary.',
  level: 'WARN',
});

const unicodeMath = /[\u2080-\u2089\u2090-\u209c\u2070-\u2079\u00d7\u2297\u2211\u2208]/.test(source);
results.push({
  name: 'unicode math lookalikes',
  passed: !unicodeMath,
  message: 'Review Unicode math-like characters and render formulas as LaTeX.',
  level: 'WARN',
});

let failures = 0;
let warnings = 0;
for (const result of results) {
  if (result.passed) {
    console.log(`PASS  ${result.name}`);
  } else {
    console.log(`${result.level.padEnd(5)} ${result.name}: ${result.message}`);
    if (result.level === 'FAIL') failures += 1;
    if (result.level === 'WARN') warnings += 1;
  }
}

const required = results.filter((result) => result.level === 'FAIL');
const declared = capabilities.size > 0 ? [...capabilities].join(', ') : 'none';
console.log(`\nCapabilities: ${declared}`);
console.log(`${required.length - failures}/${required.length} required checks passed; ${warnings} warning(s); ${failures} failure(s).`);

const manualCapabilities = [...capabilities].filter((capability) => !['timeline', 'math'].includes(capability));
if (manualCapabilities.length > 0) {
  console.log(`Manual rendered QA required for: ${manualCapabilities.join(', ')}.`);
}
if (capabilities.size === 0) {
  console.log('NOTE  No capabilities declared; only common static conventions were checked.');
}
process.exit(failures > 0 ? 1 : 0);
