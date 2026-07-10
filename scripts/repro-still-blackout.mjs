#!/usr/bin/env node
/**
 * Repro: STILL accumulation turns black — **ABOVE WATER** path (user report).
 *
 * Flow:
 *   1. Ocean chapter, **Above Water** camera
 *   2. LIVE snapshot
 *   3. Animate OFF (setAnimateScene false)
 *   4. Wait for STILL samples (16 → 48 → 96 → TARGET)
 *   5. Measure luminance from screenshot PNGs (not WebGL readback)
 *
 * Also runs horizon / grazing above-water variants.
 *
 *   npm run dev
 *   npm run repro:still-blackout
 *   HEADED=1 npm run repro:still-blackout:headed
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173/raytracing/';
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'notes/GROK/validation/still-blackout-above');
const HEADED = process.env.HEADED === '1';
const TARGET = Number(process.env.TARGET || 128);

function measurePng(pngPath) {
  const py = `
from PIL import Image
import numpy as np, sys
im = np.array(Image.open(sys.argv[1]).convert('RGB'), dtype=np.float32)
h,w,_=im.shape
im=im[:, int(w*0.26):, :]
Y=0.299*im[:,:,0]+0.587*im[:,:,1]+0.114*im[:,:,2]
vh=Y.shape[0]
top,mid,bot=Y[:vh//3],Y[vh//3:2*vh//3],Y[2*vh//3:]
print(Y.mean(), (Y<2).mean(), (Y<12).mean(), (Y>40).mean(), top.mean(), mid.mean(), bot.mean())
`;
  const r = spawnSync('python3', ['-c', py, pngPath], { encoding: 'utf8' });
  if (r.status !== 0) return { ok: false, error: r.stderr };
  const [meanY, blackFrac, darkFrac, brightFrac, topY, midY, botY] = r.stdout
    .trim()
    .split(/\s+/)
    .map(Number);
  return { ok: true, meanY, blackFrac, darkFrac, brightFrac, topY, midY, botY };
}

async function waitForApi(page) {
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, { timeout: 20000 });
}

async function snap(page, name) {
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  await page.locator('#canvas').screenshot({ path: pngPath });
  const lum = measurePng(pngPath);
  const meta = await page.evaluate(() => {
    const a = window.__oceanscape;
    const t = a.tracer;
    return {
      mode: a.getMode(),
      samples: a.getSamples(),
      stats: a.getStats(),
      animate: t.params.animateWaves,
      underwaterView: t.params.underwaterView,
      camY: t.cameraPos.y,
      cam: [t.cameraPos.x, t.cameraPos.y, t.cameraPos.z],
      target: [t.cameraTarget.x, t.cameraTarget.y, t.cameraTarget.z],
    };
  });
  console.log(
    `  ${name.padEnd(32)} meanY=${lum.meanY?.toFixed(1)} top=${lum.topY?.toFixed(1)} bot=${lum.botY?.toFixed(1)} dark=${((lum.darkFrac || 0) * 100).toFixed(1)}% samples=${meta.samples} mode=${meta.mode} camY=${meta.camY?.toFixed(2)}`,
  );
  return { name, png: path.relative(root, pngPath), lum, meta };
}

async function waitSamples(page, target) {
  return page.evaluate(
    async (t) => window.__oceanscape.waitForSamples(t, 90000),
    target,
  );
}

/** Core user path: ABOVE water → freeze → wait */
async function runAboveWaterWait(page, id, setupFn) {
  console.log(`\n=== ${id} ===`);
  await page.evaluate((setupId) => {
    const a = window.__oceanscape;
    const t = a.tracer;
    t.params.samplesPerFrame = 2;
    t.params.maxAccumSamples = 256;
    t.params.renderScale = 1;
    t.applyRenderScale();
    a.applyChapter('ocean');
    // CRITICAL: above water
    a.setUnderwater(false);

    if (setupId === 'default-above') {
      a.tracer.lookAtCubeAbove();
    } else if (setupId === 'horizon') {
      t.params.fov = 70;
      t.cameraPos.set(0, 1.2, 6);
      t.cameraTarget.set(0, 0.3, 0);
      t.markSceneChanged();
    } else if (setupId === 'grazing') {
      t.params.fov = 55;
      t.cameraPos.set(0, 0.4, 8);
      t.cameraTarget.set(0, 0.05, 0);
      t.markSceneChanged();
    }
    a.unfreezeLive();
  }, id);

  // LIVE a bit
  await page.waitForTimeout(1000);
  const steps = [];
  steps.push(await snap(page, `${id}__01-live`));

  // User: turn Animate OFF, then wait
  console.log('  → Animate OFF … waiting for STILL accum');
  await page.evaluate(() => {
    window.__oceanscape.setAnimateScene(false);
    window.__oceanscape.tracer.params.autoOrbit = false;
  });
  await page.waitForTimeout(700);
  steps.push(await snap(page, `${id}__02-still-t0`));

  for (const t of [16, 48, 96, TARGET].filter((v, i, a) => a.indexOf(v) === i && v > 0)) {
    console.log(`  → wait samples ≥ ${t}`);
    await waitSamples(page, t);
    await page.waitForTimeout(150);
    steps.push(await snap(page, `${id}__03-still-s${t}`));
  }

  const live = steps[0];
  const late = steps[steps.length - 1];
  const ratio = (late.lum.meanY || 0) / Math.max(live.lum.meanY || 1e-3, 1e-3);
  const blacked =
    late.lum.ok &&
    (late.lum.meanY < 8 ||
      late.lum.darkFrac > 0.85 ||
      (ratio < 0.28 && (live.lum.meanY || 0) > 20));
  console.log(
    `  → ${blacked ? 'BLACKOUT' : 'ok'} LIVE ${live.lum.meanY?.toFixed(1)} → STILL ${late.lum.meanY?.toFixed(1)} (×${ratio.toFixed(2)})`,
  );
  return { id, blacked, ratio, liveMean: live.lum.meanY, lateMean: late.lum.meanY, steps };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const results = [];
  let fatal = null;

  try {
    console.log(`goto ${BASE_URL}`);
    console.log('FOCUS: ABOVE WATER + Animate OFF + wait for STILL accum');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForApi(page);

    results.push(await runAboveWaterWait(page, 'default-above'));
    results.push(await runAboveWaterWait(page, 'horizon'));
    results.push(await runAboveWaterWait(page, 'grazing'));
  } catch (err) {
    fatal = err instanceof Error ? err.message : String(err);
    console.error('FATAL:', fatal);
  } finally {
    await browser.close();
  }

  const anyBlack = results.some((r) => r.blacked);
  const verdict = fatal ? 'ERROR' : anyBlack ? 'REPRODUCED_BLACKOUT' : 'NO_BLACKOUT_ABOVE_WATER_HEADLESS';

  const report = {
    generatedAt: new Date().toISOString(),
    focus: 'ABOVE_WATER_THEN_STILL_WAIT',
    baseUrl: BASE_URL,
    targetSamples: TARGET,
    verdict,
    results,
    fatal,
  };
  await writeFile(path.join(OUT_DIR, 'REPRO_REPORT.json'), JSON.stringify(report, null, 2));
  const md = [
    '# STILL blackout repro — ABOVE WATER',
    '',
    `**Verdict:** \`${verdict}\``,
    '',
    'Path: setUnderwater(false) / lookAtCubeAbove → LIVE → setAnimateScene(false) → wait samples.',
    '',
    '| Setup | LIVE meanY | STILL late | ratio | blacked? |',
    '|-------|----------:|-----------:|------:|:--------:|',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.liveMean?.toFixed(1)} | ${r.lateMean?.toFixed(1)} | ${r.ratio?.toFixed(2)} | ${r.blacked ? 'YES' : 'no'} |`,
    ),
    '',
    `PNGs: \`${path.relative(root, OUT_DIR)}/\``,
  ].join('\n');
  await writeFile(path.join(OUT_DIR, 'REPRO_REPORT.md'), md);

  console.log('\n======== SUMMARY (ABOVE WATER) ========');
  for (const r of results) {
    console.log(
      `${r.blacked ? 'BLACK' : 'ok   '} ${r.id}: ${r.liveMean?.toFixed(1)} → ${r.lateMean?.toFixed(1)} (×${r.ratio?.toFixed(2)})`,
    );
  }
  console.log(`Verdict: ${verdict}`);
  console.log(`Report: ${path.relative(root, path.join(OUT_DIR, 'REPRO_REPORT.md'))}`);
  process.exit(fatal ? 1 : anyBlack ? 2 : 0);
}

main();
