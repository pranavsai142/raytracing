#!/usr/bin/env node
/**
 * Regression: Above Water + Animate OFF must not go black (STILL accumulate).
 *
 * Root cause this guards: false water-heightfield misses after air→water transmit
 * terminate as near-black bulk; STILL averages them → solid black frame.
 *
 *   npm run dev
 *   node scripts/test-above-still.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/raytracing/';
const OUT =
  process.env.OUT_DIR ||
  path.join(root, 'notes/GROK/validation/above-still');

function measure(png) {
  const py = `
from PIL import Image
import numpy as np, sys
im = np.array(Image.open(sys.argv[1]).convert('RGB'), dtype=np.float32)
h,w,_=im.shape
view=im[:, int(w*0.28):, :]
Y=0.299*view[:,:,0]+0.587*view[:,:,1]+0.114*view[:,:,2]
print(f"{Y.mean():.2f} {(Y<12).mean():.4f} {(Y<2).mean():.4f}")
`;
  const r = spawnSync('python3', ['-c', py, png], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'measure failed');
  const [meanY, darkFrac, blackFrac] = r.stdout.trim().split(/\s+/).map(Number);
  return { meanY, darkFrac, blackFrac };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, {
    timeout: 20000,
  });

  await page.evaluate(() => {
    const a = window.__oceanscape;
    a.enterOceanscape();
    a.applyChapter('ocean');
    a.setUnderwater(false); // ABOVE WATER
    a.setAnimateScene(false); // STILL — the failure mode
    a.tracer.params.samplesPerFrame = 2;
    a.tracer.params.maxAccumSamples = 64; // hit budget quickly to test post-budget hold
    a.tracer.params.renderScale = 1;
    a.tracer.applyRenderScale();
    a.tracer.markSceneChanged();
  });

  await page.waitForTimeout(400);
  // Reach budget (64)
  const wait = await page.evaluate(async () =>
    window.__oceanscape.waitForSamples(64, 45000),
  );
  const midMeta = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    animate: window.__oceanscape.tracer.params.animateWaves,
    under: window.__oceanscape.tracer.params.underwaterView,
    camY: window.__oceanscape.tracer.cameraPos.y,
    samples: window.__oceanscape.getSamples(),
    stats: window.__oceanscape.getStats(),
  }));
  const pngMid = path.join(OUT, 'above-still-at-budget.png');
  await page.locator('#canvas').screenshot({ path: pngMid });
  const lumMid = measure(pngMid);
  log('At budget: ' + JSON.stringify({ midMeta, wait, lumMid }));

  // Wait well past budget — old rolling-TTL bug pulled surface to black here
  await page.waitForTimeout(5000);
  const lateMeta = await page.evaluate(() => ({
    samples: window.__oceanscape.getSamples(),
    stats: window.__oceanscape.getStats(),
    mode: window.__oceanscape.getMode(),
  }));
  const pngLate = path.join(OUT, 'above-still-after-hold.png');
  await page.locator('#canvas').screenshot({ path: pngLate });
  const lumLate = measure(pngLate);
  log('After 5s hold past budget: ' + JSON.stringify({ lateMeta, lumLate }));

  // Contract: not black at budget OR after hold; samples stay at max (held, not poisoned)
  const stable =
    Math.abs(lumLate.meanY - lumMid.meanY) < 25 && // hold shouldn't crash toward black
    lumLate.meanY > 40 &&
    lumMid.meanY > 40;
  const ok =
    midMeta.animate === false &&
    midMeta.under === false &&
    midMeta.camY > 0.5 &&
    midMeta.mode === 'still' &&
    lateMeta.samples >= 64 &&
    lumMid.darkFrac < 0.35 &&
    lumLate.darkFrac < 0.35 &&
    lumMid.blackFrac < 0.15 &&
    lumLate.blackFrac < 0.15 &&
    stable;

  log(ok ? 'OVERALL PASS' : 'OVERALL FAIL');
  await writeFile(path.join(OUT, 'REPORT.txt'), lines.join('\n') + '\n');
  process.exit(ok ? 0 : 1);
} catch (e) {
  log('FATAL ' + (e instanceof Error ? e.message : String(e)));
  await writeFile(path.join(OUT, 'REPORT.txt'), lines.join('\n') + '\n');
  process.exit(1);
} finally {
  await browser.close();
}
