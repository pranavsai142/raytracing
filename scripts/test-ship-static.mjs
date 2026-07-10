#!/usr/bin/env node
/**
 * Static ship gate: intro overlay + enter API + STILL defaults present in source
 * without requiring Playwright. Complements test-production-ux.mjs.
 *
 * Run: node scripts/test-ship-static.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SCRATCH =
  process.env.SCRATCH ||
  path.join(root, 'notes/GROK/validation/ship-static');
mkdirSync(SCRATCH, { recursive: true });

const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
  log('PASS: ' + msg);
};

let fatal = null;
try {
  const index = readFileSync(path.join(root, 'index.html'), 'utf8');
  const main = readFileSync(path.join(root, 'src/main.ts'), 'utf8');
  const ui = readFileSync(path.join(root, 'src/ui.ts'), 'utf8');
  const pt = readFileSync(path.join(root, 'src/PathTracer.ts'), 'utf8');
  const vite = readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
  const render = readFileSync(path.join(root, 'render.yaml'), 'utf8');
  const ci = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');

  must(index.includes('id="intro-overlay"'), 'intro-overlay in index.html');
  must(index.includes('id="enter-oceanscape"'), 'enter button in index.html');
  must(index.includes('Enter Oceanscape'), 'Enter Oceanscape copy');
  must(main.includes('enterOceanscape'), 'enterOceanscape on API');
  must(main.includes('__oceanscape'), '__oceanscape window API');
  must(main.includes('flyGate') && main.includes('enabled: false'), 'fly gated until enter');
  must(ui.includes('setupShellUX') && ui.includes('intro-overlay'), 'shell UX wires intro');
  must(pt.includes('animateWaves: false'), 'default STILL (animateWaves false)');
  must(pt.includes("activeChapter: 'ocean'"), 'default ocean hero chapter');
  must(vite.includes('BASE_PATH') && vite.includes('/raytracing/'), 'vite BASE_PATH override');
  must(
    (render.includes('build:render') || render.includes('BASE_PATH=/')) &&
      render.includes('staticPublishPath: ./dist') &&
      render.includes('runtime: static'),
    'render.yaml static + build:render/BASE_PATH + dist',
  );
  // Blueprint envVars are present at build time. NODE_ENV=production makes
  // npm ci omit devDependencies (vite, tsc) → build:render fails on Render.
  const nodeEnvProduction = /key:\s*NODE_ENV\s*\n\s*value:\s*["']?production["']?/.test(render);
  must(!nodeEnvProduction, 'render.yaml must not set NODE_ENV=production (npm ci keeps devDeps)');
  must(ci.includes('npm ci') && ci.includes('npm run build') && ci.includes('path: dist'), 'Pages CI npm ci/build → dist');
  must(
    readFileSync(path.join(root, 'src/shaders/pathTracer.frag.glsl'), 'utf8').includes('isInWaterAt') ||
      readFileSync(path.join(root, 'src/shaders/pathTracer.frag.glsl'), 'utf8').length > 1000,
    'path tracer fragment present (ship physics shader)',
  );

  log('OVERALL PASS');
} catch (e) {
  fatal = e instanceof Error ? e.message : String(e);
  log('FATAL: ' + fatal);
}

writeFileSync(path.join(SCRATCH, 'ship-static.log'), lines.join('\n') + '\n');
process.exit(fatal ? 1 : 0);
