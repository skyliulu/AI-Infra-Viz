import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MODULE_LABELS } from '../src/lib/module-titles.js';

const expectedLabels = ['LLM Inference','Parallel Strategy','Flash Attention','Flash Decode','Spec Decode','Quantization','Engram','Radix Cache','DP Attention','Linear Attention'];
const source = path => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
assert.deepEqual(Object.values(MODULE_LABELS),expectedLabels);
assert.ok(Object.values(MODULE_LABELS).every(label=>typeof label==='string'));
assert.ok(source('MainDashboard.jsx').includes('const title = MODULE_LABELS[tab.id];'));
assert.ok(source('components/HomeLanding.jsx').includes('titleText: MODULE_LABELS[card.id],'));
assert.ok(!source('components/Quantization.jsx').includes('MODULE_LABELS'));
console.log('Navigation: 10 fixed English labels shared by homepage and sidebar; independent of content language and body titles.');
