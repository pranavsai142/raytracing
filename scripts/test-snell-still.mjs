#!/usr/bin/env node
/**
 * Regression: STILL progressive black mean on Snell look-up + above-water ocean.
 *
 * User failure mode (handoff 2026-07-16): Animate off, pixels progressively go
 * black mid-accumulation (never healthy DONE); camera move resets then re-blacks.
 *
 * Gates (PNG luminance of canvas — real path-traced output, not mocked):
 *   - Look-up: upper-center ROI stays bright (escape cone / sky through interface)
 *   - Progressive: late mean must not crash vs early (ratio / delta)
 *   - Above water: mid-frame mean stays lit, not a black plate
 *
 *   npm run dev
 *   npm run test:snell-still
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
  path.join(root, 'notes/GROK/validation/snell-still');

function measure(png, mode) {
  // mode: 'upper' = top-center ROI (Snell disk), 'view' = right-of-UI full view
  const py = `
from PIL import Image
import numpy as np, sys
im = np.array(Image.open(sys.argv[1]).convert('RGB'), dtype=np.float32)
h,w,_=im.shape
# drop left UI column
view=im[:, int(w*0.28):, :]
Y=0.299*view[:,:,0]+0.587*view[:,:,1]+0.114*view[:,:,2]
vh,vw=Y.shape
if sys.argv[2] == 'upper':
  # Overhead Snell cone region
  roi=Y[int(vh*0.02):int(vh*0.42), int(vw*0.2):int(vw*0.8)]
else:
  roi=Y
print(f"{roi.mean():.2f} {(roi<12).mean():.4f} {(roi<2).mean():.4f} {(roi>40).mean():.4f}")
`;
  const r = spawnSync('python3', ['-c', py, png, mode], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'measure failed');
  const [meanY, darkFrac, blackFrac, brightFrac] = r.stdout
    .trim()
    .split(/\s+/)
    .map(Number);
  return { meanY, darkFrac, blackFrac, brightFrac };
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

  // ——— 1) Snell look-up: progressive STILL must keep bright cone ———
  await page.evaluate(() => {
    const a = window.__oceanscape;
    a.enterOceanscape();
    a.applyChapter('ocean');
    a.setUnderwater(true);
    a.setAnimateScene(false);
    const t = a.tracer;
    t.params.samplesPerFrame = 2;
    t.params.maxAccumSamples = 64;
    t.params.renderScale = 1;
    t.params.fov = 90;
    // Classic Snell: deep underwater looking up (matches visual-smoke scene 07)
    t.cameraPos.set(0, -3.5, 3.5);
    t.cameraTarget.set(0, 0.8, 0);
    t.applyRenderScale();
    t.markSceneChanged();
  });

  await page.waitForTimeout(400);
  // Early samples
  await page.evaluate(async () => window.__oceanscape.waitForSamples(8, 30000));
  const pngEarly = path.join(OUT, 'snell-early.png');
  await page.locator('#canvas').screenshot({ path: pngEarly });
  const lumEarly = measure(pngEarly, 'upper');
  const metaEarly = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    samples: window.__oceanscape.getSamples(),
    under: window.__oceanscape.tracer.params.underwaterView,
    camY: window.__oceanscape.tracer.cameraPos.y,
  }));
  log('Snell early: ' + JSON.stringify({ metaEarly, lumEarly }));

  // At budget
  await page.evaluate(async () => window.__oceanscape.waitForSamples(64, 45000));
  const pngLate = path.join(OUT, 'snell-at-budget.png');
  await page.locator('#canvas').screenshot({ path: pngLate });
  const lumLate = measure(pngLate, 'upper');
  const metaLate = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    samples: window.__oceanscape.getSamples(),
    stats: window.__oceanscape.getStats(),
  }));
  log('Snell at budget: ' + JSON.stringify({ metaLate, lumLate }));

  // Hold past budget — must not drift black
  await page.waitForTimeout(4000);
  const pngHold = path.join(OUT, 'snell-after-hold.png');
  await page.locator('#canvas').screenshot({ path: pngHold });
  const lumHold = measure(pngHold, 'upper');
  log('Snell after hold: ' + JSON.stringify({ lumHold }));

  // ——— 2) Camera settle: nudge cam, wait STILL, cone still lit ———
  await page.evaluate(() => {
    const t = window.__oceanscape.tracer;
    t.cameraPos.x += 0.15;
    t.markSceneChanged();
  });
  await page.waitForTimeout(500);
  await page.evaluate(async () => window.__oceanscape.waitForSamples(32, 30000));
  const pngMove = path.join(OUT, 'snell-after-move-still.png');
  await page.locator('#canvas').screenshot({ path: pngMove });
  const lumMove = measure(pngMove, 'upper');
  log('Snell after camera nudge + STILL: ' + JSON.stringify({ lumMove }));

  // ——— 3) Above water ocean: progressive must stay lit ———
  await page.evaluate(() => {
    const a = window.__oceanscape;
    a.applyChapter('ocean');
    a.setUnderwater(false);
    a.setAnimateScene(false);
    const t = a.tracer;
    t.params.samplesPerFrame = 2;
    t.params.maxAccumSamples = 64;
    t.params.renderScale = 1;
    t.applyRenderScale();
    t.lookAtCubeAbove();
    t.markSceneChanged();
  });
  await page.waitForTimeout(400);
  await page.evaluate(async () => window.__oceanscape.waitForSamples(12, 30000));
  const pngAbEarly = path.join(OUT, 'above-early.png');
  await page.locator('#canvas').screenshot({ path: pngAbEarly });
  const lumAbEarly = measure(pngAbEarly, 'view');
  await page.evaluate(async () => window.__oceanscape.waitForSamples(64, 45000));
  const pngAbLate = path.join(OUT, 'above-at-budget.png');
  await page.locator('#canvas').screenshot({ path: pngAbLate });
  const lumAbLate = measure(pngAbLate, 'view');
  log('Above early/late: ' + JSON.stringify({ lumAbEarly, lumAbLate }));

  // ——— Contracts ———
  // Snell cone: upper ROI must be bright (sky escape), not solid black disk
  const snellBright =
    lumLate.meanY > 50 &&
    lumHold.meanY > 50 &&
    lumMove.meanY > 45 &&
    lumLate.blackFrac < 0.08 &&
    lumHold.blackFrac < 0.08;
  // Progressive: late must not crash vs early (user's "pixels go black" loop)
  const snellStable =
    lumLate.meanY > lumEarly.meanY * 0.55 &&
    Math.abs(lumHold.meanY - lumLate.meanY) < 30;
  const aboveOk =
    lumAbLate.meanY > 40 &&
    lumAbLate.blackFrac < 0.12 &&
    lumAbLate.meanY > lumAbEarly.meanY * 0.55 &&
    Math.abs(lumAbLate.meanY - lumAbEarly.meanY) < 50;

  const ok = snellBright && snellStable && aboveOk && metaLate.mode === 'still';
  log(
    `Gates: snellBright=${snellBright} snellStable=${snellStable} aboveOk=${aboveOk} mode=${metaLate.mode}`,
  );
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
