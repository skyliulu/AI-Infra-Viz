#!/usr/bin/env node
import { MODULE_LABELS } from '../src/lib/module-titles.js';
/**
 * Visual rendering check for LLM-Infra-Explorer modules.
 *
 * Usage:
 *   node scripts/visual-check.js [--module <tab-id>] [--port <n>] [--no-screenshots]
 *
 * Examples:
 *   node scripts/visual-check.js                        # check all modules
 *   node scripts/visual-check.js --module linearattn    # check one module
 *   node scripts/visual-check.js --port 5174            # custom dev server port
 *
 * What it checks (per module, per step):
 *   1. No JS console errors
 *   2. No horizontal overflow (scrollWidth > clientWidth on body)
 *   3. Key structural elements present (control bar, pseudocode panel)
 *   4. Step counter advances correctly (Next button works)
 *   5. Reset returns to step 0
 *   6. Language toggle switches label text
 *   7. Mode B steps (if the module has a second mode)
 *   8. Screenshot saved for each step (unless --no-screenshots)
 *
 * Output: exit 0 on pass, exit 1 on any failure.
 * Screenshots: screenshots/<module>-step-<n>.png
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use createRequire to load the global Playwright CJS package
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const PORT = getArg('--port') || '5173';
const BASE_URL = `http://localhost:${PORT}`;
const ONLY_MODULE = getArg('--module');
const NO_SCREENSHOTS = hasFlag('--no-screenshots');
const SCREENSHOT_DIR = join(__dirname, '..', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// All registered tab IDs (must match TABS in MainDashboard.jsx)
const ALL_MODULES = [
  'llm', 'parallel', 'flash', 'flashdecode',
  'engram', 'radixcache', 'dpattention', 'linearattn',
];

// English card titles from HomeLanding featureCards — used to click the feature card
// that navigates into a module (the app uses React useState routing, not URL hashes).
// Add your new module here when following the new-module skill.
const MODULE_CARD_TITLE = MODULE_LABELS;

// Per-module step counts — add your module here when using the new-module skill.
// Format: { default: N }  or  { default: N, modeB: M } for two-mode modules.
const MODULE_STEPS = {
  llm:          { default: 6 },
  parallel:     { default: 7 },
  flash:        { default: 6 },
  flashdecode:  { default: 6 },
  engram:       { default: 7 },
  radixcache:   { default: 8 },
  dpattention:  { default: 7 },
  linearattn:   { default: 5, modeB: 7 },  // standard=5, gla=7
};

// ── Helpers ───────────────────────────────────────────────────────────────────
let failures = [];
let totalChecks = 0;

const pass = (msg) => { totalChecks++; process.stdout.write(`  ✓ ${msg}\n`); };
const fail = (msg) => { totalChecks++; failures.push(msg); process.stdout.write(`  ✗ ${msg}\n`); };
const info = (msg) => process.stdout.write(`\n▶ ${msg}\n`);

async function checkNoOverflow(page, label) {
  const hasOverflow = await page.evaluate(
    () => document.body.scrollWidth > document.body.clientWidth
  );
  hasOverflow
    ? fail(`${label}: horizontal overflow (body.scrollWidth > clientWidth)`)
    : pass(`${label}: no horizontal overflow`);
}

async function checkConsoleErrors(errors, label) {
  errors.length > 0
    ? fail(`${label}: ${errors.length} console error(s): ${errors.slice(0, 3).join(' | ')}`)
    : pass(`${label}: no console errors`);
}

async function checkStructure(page, label) {
  const controlBar = await page.$('button:has(svg)');
  controlBar ? pass(`${label}: control bar present`) : fail(`${label}: control bar not found`);

  // Note: CSS attribute value is a plain string — no escaping needed for [ ] # inside quotes
  const pseudocode = await page.$('[class*="bg-[#0d1117]"]');
  pseudocode
    ? pass(`${label}: pseudocode panel present`)
    : fail(`${label}: pseudocode panel (bg-[#0d1117]) not found`);
}

async function saveScreenshot(page, name) {
  if (NO_SCREENSHOTS) return;
  if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
}

// The app uses React useState routing (not URL hashes), so we navigate by:
//   1. Loading the home page (always starts at activeTab='home')
//   2. Clicking the feature card that calls onExplore(moduleId)
// If already on a non-home page, the sidebar is visible; we click the sidebar button.
async function navigateToModule(page, moduleId) {
  const cardTitle = MODULE_CARD_TITLE[moduleId] ?? moduleId;

  // Check current page state
  const isHome = await page.evaluate(() => !document.querySelector('nav'));
  if (isHome || (await page.url()) === 'about:blank') {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  }

  // Try sidebar first (visible when activeTab !== 'home')
  const sidebarBtn = page.locator('nav button').filter({ hasText: cardTitle }).first();
  if (await sidebarBtn.count() > 0) {
    await sidebarBtn.click();
  } else {
    // Home page: click the feature card button by title text
    const cardBtn = page.locator('button').filter({ hasText: cardTitle }).first();
    if (await cardBtn.count() === 0) {
      throw new Error(`Cannot find navigation entry for module "${moduleId}" (looking for card title: "${cardTitle}")`);
    }
    await cardBtn.click();
  }

  // Wait for the lazy-loaded component (Suspense fallback) to disappear
  await page.waitForFunction(
    () => !document.querySelector('.animate-pulse'),
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

async function clickNext(page) {
  // Try locating the SkipForward SVG button; fall back to the third enabled button
  const svgBtn = page.locator('svg[class*="lucide-skip-forward"]').first().locator('..');
  if (await svgBtn.count() > 0 && !(await svgBtn.getAttribute('disabled'))) {
    await svgBtn.click();
  } else {
    const buttons = page.locator('button:not([disabled])');
    if (await buttons.count() >= 3) await buttons.nth(2).click();
  }
  await page.waitForTimeout(300);
}

async function clickReset(page) {
  const btn = page.locator('svg[class*="lucide-rotate-ccw"]').first().locator('..');
  if (await btn.count() > 0) await btn.click();
  await page.waitForTimeout(300);
}

async function getStepCounter(page) {
  return page.evaluate(() => {
    const span = [...document.querySelectorAll('span')]
      .find(el => /^\[\d+\/\d+\]$/.test(el.textContent?.trim()));
    return span?.textContent?.trim() ?? null;
  });
}

async function clickModeB(page) {
  const btn = page.locator('div.bg-slate-100.rounded-lg button').nth(1);
  if (await btn.count() > 0) await btn.click();
  await page.waitForTimeout(400);
}

// ── Per-module check ──────────────────────────────────────────────────────────
async function checkModule(page, moduleId) {
  info(`Module: ${moduleId}`);
  const consoleErrors = [];
  // Collect console errors; exclude known external-API CORS failures from HomeLanding
  // (github.com/repos, ipapi.co) which are expected to fail in local dev and are not
  // rendering bugs in the module under test.
  const CORS_NOISE = [/api\.github\.com/, /ipapi\.co/, /CORS policy/, /ERR_FAILED/];
  const isNoise = (msg) => CORS_NOISE.some(re => re.test(msg));
  page.on('console', msg => {
    if (msg.type() === 'error' && !isNoise(msg.text())) consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    if (!isNoise(err.message)) consoleErrors.push(`[pageerror] ${err.message}`);
  });

  await navigateToModule(page, moduleId);
  await saveScreenshot(page, `${moduleId}-step-0`);

  // 1. Structure
  await checkStructure(page, `${moduleId} idle`);

  // 2. Overflow at idle
  await checkNoOverflow(page, `${moduleId} idle`);

  // 3. Step through mode A
  const maxSteps = MODULE_STEPS[moduleId]?.default ?? 6;
  for (let i = 1; i <= maxSteps; i++) {
    await clickNext(page);
    await saveScreenshot(page, `${moduleId}-step-${i}`);
    await checkNoOverflow(page, `${moduleId} step-${i}`);
  }

  const counterA = await getStepCounter(page);
  if (counterA) {
    const [cur] = counterA.replace(/[\[\]]/g, '').split('/').map(Number);
    cur === maxSteps
      ? pass(`${moduleId}: reached step ${maxSteps}/${maxSteps}`)
      : fail(`${moduleId}: expected step ${maxSteps}, got ${cur} (counter: "${counterA}")`);
  } else {
    pass(`${moduleId}: stepped through ${maxSteps} steps (no counter visible)`);
  }

  // 4. Reset
  await clickReset(page);
  const counterAfterReset = await getStepCounter(page);
  if (counterAfterReset === null) {
    pass(`${moduleId}: reset (no counter visible)`);
  } else {
    const [cur] = counterAfterReset.replace(/[\[\]]/g, '').split('/').map(Number);
    cur === 0
      ? pass(`${moduleId}: reset returns to step 0`)
      : fail(`${moduleId}: after reset, counter shows "${counterAfterReset}" (expected [0/...])`);
  }

  // 5. Mode B (if applicable)
  const modeBSteps = MODULE_STEPS[moduleId]?.modeB;
  if (modeBSteps !== undefined) {
    await clickModeB(page);
    await saveScreenshot(page, `${moduleId}-modeB-step-0`);
    await checkNoOverflow(page, `${moduleId} modeB idle`);

    for (let i = 1; i <= modeBSteps; i++) {
      await clickNext(page);
      await saveScreenshot(page, `${moduleId}-modeB-step-${i}`);
      await checkNoOverflow(page, `${moduleId} modeB step-${i}`);
    }

    const counterB = await getStepCounter(page);
    if (counterB) {
      const [cur] = counterB.replace(/[\[\]]/g, '').split('/').map(Number);
      cur === modeBSteps
        ? pass(`${moduleId} modeB: reached step ${modeBSteps}/${modeBSteps}`)
        : fail(`${moduleId} modeB: expected step ${modeBSteps}, got ${cur}`);
    } else {
      pass(`${moduleId} modeB: stepped through ${modeBSteps} steps`);
    }
  }

  // 6. Language toggle
  await clickReset(page);
  const langBtn = page.locator('button:has(svg[class*="lucide-globe"])').first();
  if (await langBtn.count() > 0) {
    const before = await langBtn.textContent();
    await langBtn.click();
    await page.waitForTimeout(300);
    const after = await langBtn.textContent();
    before !== after
      ? pass(`${moduleId}: language toggle ("${before?.trim()}" → "${after?.trim()}")`)
      : fail(`${moduleId}: language toggle did not change button label`);
    await langBtn.click();
    await page.waitForTimeout(200);
  } else {
    fail(`${moduleId}: language toggle button (Globe icon) not found`);
  }

  // 7. Console errors
  await checkConsoleErrors(consoleErrors, moduleId);

  // 8. Mobile viewport
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.waitForTimeout(400);
  await checkNoOverflow(page, `${moduleId} mobile (390px)`);
  await saveScreenshot(page, `${moduleId}-mobile`);
  await page.setViewportSize(VIEWPORT);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const modules = ONLY_MODULE ? [ONLY_MODULE] : ALL_MODULES;
const unknown = modules.filter(m => !ALL_MODULES.includes(m));
if (unknown.length > 0) {
  console.error(`Unknown module(s): ${unknown.join(', ')}\nValid: ${ALL_MODULES.join(', ')}`);
  process.exit(1);
}

console.log(`\n╔═══════════════════════════════════════════╗`);
console.log(`║  LLM-Infra-Explorer  Visual Check         ║`);
console.log(`╚═══════════════════════════════════════════╝`);
console.log(`  Base URL   : ${BASE_URL}`);
console.log(`  Modules    : ${modules.join(', ')}`);
console.log(`  Viewport   : ${VIEWPORT.width}×${VIEWPORT.height} + mobile ${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height}`);
console.log(`  Screenshots: ${NO_SCREENSHOTS ? 'disabled' : SCREENSHOT_DIR}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: VIEWPORT });

// Quick connectivity check
const probe = await context.newPage();
try {
  await probe.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
} catch {
  console.error(`\n✗ Cannot reach ${BASE_URL} — is the dev server running?\n  Run: npm run dev`);
  await browser.close();
  process.exit(1);
}
await probe.close();

for (const moduleId of modules) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  try {
    await checkModule(page, moduleId);
  } catch (err) {
    fail(`${moduleId}: unexpected error — ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${totalChecks - failures.length}/${totalChecks} passed`);
if (failures.length > 0) {
  console.log(`\nFailed checks (${failures.length}):`);
  failures.forEach(f => console.log(`  ✗ ${f}`));
  console.log('');
  process.exit(1);
} else {
  console.log(`\nAll checks passed ✓`);
  if (!NO_SCREENSHOTS) console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log('');
}
