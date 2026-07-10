#!/usr/bin/env node
/**
 * Drives the real production build path twice and asserts asset URL bases:
 *   default → /raytracing/assets/…  (GitHub Pages)
 *   npm run build:render → /assets/… (Render / root hosts)
 *
 * Run: node scripts/test-build-bases.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SCRATCH =
  process.env.SCRATCH ||
  path.join(root, 'notes/GROK/validation/build-bases');
mkdirSync(SCRATCH, { recursive: true });

const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};

function assetHrefs() {
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const hrefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  return { html, hrefs };
}

function runBuildClean(label, envExtra = {}) {
  const env = { ...process.env, ...envExtra };
  if (!('BASE_PATH' in envExtra)) delete env.BASE_PATH;
  log(`spawn npm run build (${label})`);
  const r = spawnSync('npm', ['run', 'build'], { cwd: root, env, encoding: 'utf8' });
  if (r.status !== 0) {
    log(r.stdout || '');
    log(r.stderr || '');
    throw new Error(`build failed (${label}) status=${r.status}`);
  }
  if (!existsSync(path.join(root, 'dist/index.html'))) {
    throw new Error(`dist/index.html missing after ${label}`);
  }
  return assetHrefs();
}

let fatal = null;
try {
  log('=== default Pages base ===');
  const pages = runBuildClean('pages-default');
  log('hrefs: ' + pages.hrefs.join(', '));
  const pagesOk = pages.hrefs.some((h) => h.includes('/raytracing/assets/'));
  if (!pagesOk) throw new Error('expected /raytracing/assets/ in default dist');
  log('Pages base: PASS');

  log('=== build:render (BASE_PATH=/) ===');
  const rRender = spawnSync('npm', ['run', 'build:render'], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  if (rRender.status !== 0) {
    log(rRender.stdout || '');
    log(rRender.stderr || '');
    throw new Error('build:render failed');
  }
  const rootBuild = assetHrefs();
  log('hrefs: ' + rootBuild.hrefs.join(', '));
  const rootOk =
    rootBuild.hrefs.some((h) => h.startsWith('/assets/')) &&
    !rootBuild.html.includes('/raytracing/');
  if (!rootOk) throw new Error('expected root /assets/ and no /raytracing/');
  log('Render root base: PASS');

  log('=== restore Pages-default dist ===');
  runBuildClean('pages-restore');
  log('OVERALL PASS');
} catch (e) {
  fatal = e instanceof Error ? e.message : String(e);
  log('FATAL: ' + fatal);
}

writeFileSync(path.join(SCRATCH, 'build-bases.log'), lines.join('\n') + '\n');
process.exit(fatal ? 1 : 0);
