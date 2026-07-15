import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];

if (!target) {
  console.error('Usage: node check-module-conventions.mjs <component.jsx>');
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
check('math renderer', /\bMathFormula\b/, 'Render mathematical notation with MathFormula.');
check('phase state', /\bphase\b/, 'Model idle, running, and done phases.');
check('step state', /\bstep\b/, 'Expose the active execution step.');
check('playback state', /\bisPlaying\b/, 'Track playback explicitly.');
check('next-step handler', /\bhandleNextStep\b/, 'Implement handleNextStep().');
check('reset handler', /\breset\b/, 'Implement reset().');
check('play handler', /\btogglePlay\b/, 'Implement togglePlay().');
check('derived snapshot', /\bget[A-Z][A-Za-z0-9]*State\b|\buseMemo\s*\(/, 'Prefer a pure snapshot function or memoized derived state.', 'WARN');

const hardcodedCjk = />[^\n<{]*[\u3400-\u9fff][^<{]*</.test(source);
results.push({
  name: 'hardcoded JSX prose',
  passed: !hardcodedCjk,
  message: 'Move hardcoded Chinese JSX text into the i18n dictionary.',
  level: 'WARN',
});

const unicodeMath = /[₀-₉ₐ-ₜ⁰-⁹×⊗∑∈]/.test(source);
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
console.log(`\n${required.length - failures}/${required.length} required checks passed; ${warnings} warning(s); ${failures} failure(s).`);
process.exit(failures > 0 ? 1 : 0);
