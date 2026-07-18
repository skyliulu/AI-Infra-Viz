import fs from 'node:fs';
import path from 'node:path';

const usage = 'Usage: node check-qa-matrix.mjs <qa-matrix.json> | --self-test';

const cartesian = (axes, dimensions) => axes.reduce(
  (rows, axis) => rows.flatMap((row) => dimensions[axis].map((value) => ({ ...row, [axis]: value }))),
  [{}],
);

const describeState = (state, axes) => axes
  .map((axis) => `${axis}=${JSON.stringify(state[axis])}`)
  .join(', ');

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['Manifest must be a JSON object.'];
  }

  const dimensions = manifest.dimensions;
  if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    return ['"dimensions" must be an object of non-empty value arrays.'];
  }

  const dimensionNames = Object.keys(dimensions);
  if (dimensionNames.length === 0) errors.push('Declare at least one affected dimension.');
  for (const [name, values] of Object.entries(dimensions)) {
    if (!Array.isArray(values) || values.length === 0) {
      errors.push(`Dimension ${JSON.stringify(name)} must contain at least one value.`);
      continue;
    }
    if (values.some((value) => value !== null && !['string', 'number', 'boolean'].includes(typeof value))) {
      errors.push(`Dimension ${JSON.stringify(name)} values must be JSON scalars.`);
    }
    if (new Set(values.map((value) => JSON.stringify(value))).size !== values.length) {
      errors.push(`Dimension ${JSON.stringify(name)} contains duplicate values.`);
    }
  }

  const cases = manifest.cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    errors.push('"cases" must contain at least one QA case.');
  }

  const validCases = Array.isArray(cases) ? cases : [];
  const names = new Set();
  for (const [index, testCase] of validCases.entries()) {
    const label = `Case ${index + 1}`;
    if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
      errors.push(`${label} must be an object.`);
      continue;
    }
    if (typeof testCase.name !== 'string' || testCase.name.trim() === '') {
      errors.push(`${label} needs a non-empty name.`);
    } else if (names.has(testCase.name)) {
      errors.push(`Duplicate case name: ${JSON.stringify(testCase.name)}.`);
    } else {
      names.add(testCase.name);
    }
    if (!testCase.state || typeof testCase.state !== 'object' || Array.isArray(testCase.state)) {
      errors.push(`${label} needs a state object.`);
    } else {
      for (const [axis, value] of Object.entries(testCase.state)) {
        if (!(axis in dimensions)) {
          errors.push(`${label} references undeclared dimension ${JSON.stringify(axis)}.`);
        } else if (!dimensions[axis].some((candidate) => Object.is(candidate, value))) {
          errors.push(`${label} uses undeclared value ${JSON.stringify(value)} for ${JSON.stringify(axis)}.`);
        }
      }
    }
    if (!Array.isArray(testCase.checks)
      || testCase.checks.length === 0
      || testCase.checks.some((item) => typeof item !== 'string' || item.trim() === '')) {
      errors.push(`${label} needs at least one non-empty check.`);
    }
  }

  let groups = dimensionNames.map((name) => [name]);
  if (manifest.requiredCrossProducts !== undefined) {
    if (!Array.isArray(manifest.requiredCrossProducts)) {
      errors.push('"requiredCrossProducts" must be an array of dimension-name arrays.');
    } else {
      for (const [index, group] of manifest.requiredCrossProducts.entries()) {
        if (!Array.isArray(group) || group.length < 2) {
          errors.push(`Cross-product ${index + 1} must name at least two dimensions.`);
          continue;
        }
        if (new Set(group).size !== group.length) {
          errors.push(`Cross-product ${index + 1} repeats a dimension.`);
        }
        for (const axis of group) {
          if (!dimensionNames.includes(axis)) {
            errors.push(`Cross-product ${index + 1} references undeclared dimension ${JSON.stringify(axis)}.`);
          }
        }
      }
      groups = [...groups, ...manifest.requiredCrossProducts.filter(
        (group) => Array.isArray(group)
          && group.length >= 2
          && group.every((axis) => dimensionNames.includes(axis)),
      )];
    }
  }

  if (errors.length === 0) {
    for (const axes of groups) {
      for (const required of cartesian(axes, dimensions)) {
        const covered = validCases.some((testCase) => testCase.state && axes.every(
          (axis) => Object.is(testCase.state[axis], required[axis]),
        ));
        if (!covered) errors.push(`Missing coverage: ${describeState(required, axes)}.`);
      }
    }
  }

  return errors;
}

const runSelfTest = () => {
  const complete = {
    dimensions: { mode: ['a', 'b'], width: ['wide', 'narrow'] },
    requiredCrossProducts: [['mode', 'width']],
    cases: [
      ['a', 'wide'],
      ['a', 'narrow'],
      ['b', 'wide'],
      ['b', 'narrow'],
    ].map(([mode, width]) => ({
      name: `${mode}-${width}`,
      state: { mode, width },
      checks: ['snapshot'],
    })),
  };
  const incomplete = structuredClone(complete);
  incomplete.cases.pop();
  const completeErrors = validateManifest(complete);
  const incompleteErrors = validateManifest(incomplete);
  if (completeErrors.length !== 0
    || !incompleteErrors.some((error) => error.includes('mode="b", width="narrow"'))) {
    console.error('FAIL  self-test');
    process.exit(1);
  }
  console.log('PASS  self-test: complete matrices pass and missing combinations fail.');
};

const target = process.argv[2];
if (!target || target === '--help') {
  console.error(usage);
  process.exit(target === '--help' ? 0 : 2);
}
if (target === '--self-test') {
  runSelfTest();
  process.exit(0);
}

const absolute = path.resolve(process.cwd(), target);
if (!fs.existsSync(absolute)) {
  console.error(`FAIL  matrix not found: ${absolute}`);
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(absolute, 'utf8'));
} catch (error) {
  console.error(`FAIL  invalid JSON: ${error.message}`);
  process.exit(2);
}

const errors = validateManifest(manifest);
if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL  ${error}`);
  console.error(`\n${errors.length} coverage problem(s).`);
  process.exit(1);
}

console.log(`PASS  ${manifest.cases.length} QA cases cover ${Object.keys(manifest.dimensions).length} affected dimension(s).`);
