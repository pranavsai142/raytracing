#!/usr/bin/env node
/**
 * Regression: LIVE looks lit but STILL progressive goes black.
 *
 * Root class this guards:
 *   - Accum RT not sampleable (HalfFloat+LinearFilter) → progressive prev=0
 *   - LIVE never reads accumTexture so it still looks fine
 *
 * Also asserts source invariants: NearestFilter on accum targets.
 *
 *   npm run dev
 *   npm run test:still-switch
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173/raytracing/';
const OUT =
  process.env.OUT_DIR ||
  path.join(root, 'notes/GROK/validation/still-switch');

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

const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};

await mkdir(OUT, { recursive: true });

// ——— Static: accum pipeline must use NearestFilter (drives shipped PathTracer.ts) ———
const ptSrc = await readFile(path.join(root, 'src/PathTracer.ts'), 'utf8');
const hasNearest =
  /minFilter:\s*THREE\.NearestFilter/.test(ptSrc) &&
  /magFilter:\s*THREE\.NearestFilter/.test(ptSrc);
const noLinearAccum =
  !/createAccumTarget[\s\S]*?minFilter:\s*THREE\.LinearFilter/.test(ptSrc);
const hasFloatPrefer = /FloatType/.test(ptSrc) && /EXT_color_buffer_float/.test(ptSrc);
log(
  `Static accum: nearest=${hasNearest} noLinearInCreate=${noLinearAccum} floatPrefer=${hasFloatPrefer}`,
);
if (!hasNearest || !noLinearAccum) {
  log('OVERALL FAIL (static accum filter)');
  await writeFile(path.join(OUT, 'REPORT.txt'), lines.join('\n') + '\n');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, {
    timeout: 20000,
  });

  // LIVE (animate on) — must look lit
  await page.evaluate(() => {
    const a = window.__oceanscape;
    a.enterOceanscape();
    a.applyChapter('ocean');
    a.setUnderwater(false);
    a.setAnimateScene(true);
    a.tracer.params.samplesPerFrame = 2;
    a.tracer.params.maxAccumSamples = 96;
    a.tracer.params.renderScale = 1;
    a.tracer.applyRenderScale();
    a.tracer.lookAtCubeAbove();
    a.tracer.markSceneChanged();
  });
  await page.waitForTimeout(700);
  const pngLive = path.join(OUT, '01-live.png');
  await page.locator('#canvas').screenshot({ path: pngLive });
  const lumLive = measure(pngLive);
  const metaLive = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    gpu: window.__oceanscape.tracer.getGpuInfo?.() || '',
    animate: window.__oceanscape.tracer.params.animateWaves,
  }));
  log('LIVE: ' + JSON.stringify({ lumLive, metaLive }));

  // Switch to STILL — user failure: "as soon as it switches … all becomes black"
  await page.evaluate(() => {
    window.__oceanscape.setAnimateScene(false);
  });
  await page.waitForTimeout(300);
  // Early STILL (first progressive frames)
  await page.evaluate(async () => window.__oceanscape.waitForSamples(8, 30000));
  const pngEarly = path.join(OUT, '02-still-early.png');
  await page.locator('#canvas').screenshot({ path: pngEarly });
  const lumEarly = measure(pngEarly);
  log('STILL early: ' + JSON.stringify(lumEarly));

  await page.evaluate(async () => window.__oceanscape.waitForSamples(64, 45000));
  const pngLate = path.join(OUT, '03-still-late.png');
  await page.locator('#canvas').screenshot({ path: pngLate });
  const lumLate = measure(pngLate);
  const metaLate = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    samples: window.__oceanscape.getSamples(),
    stats: window.__oceanscape.getStats(),
  }));
  log('STILL late: ' + JSON.stringify({ lumLate, metaLate }));

  // Hold past budget
  await page.waitForTimeout(3000);
  const pngHold = path.join(OUT, '04-still-hold.png');
  await page.locator('#canvas').screenshot({ path: pngHold });
  const lumHold = measure(pngHold);
  log('STILL hold: ' + JSON.stringify(lumHold));

  // Contract: STILL must stay in the same ballpark as LIVE, not crash to black
  const stillLit =
    lumEarly.meanY > 35 &&
    lumLate.meanY > 35 &&
    lumHold.meanY > 35 &&
    lumLate.blackFrac < 0.12 &&
    lumHold.blackFrac < 0.12;
  const noCrash =
    lumLate.meanY > lumLive.meanY * 0.45 &&
    lumEarly.meanY > lumLive.meanY * 0.4 &&
    Math.abs(lumHold.meanY - lumLate.meanY) < 30;
  const modeOk = metaLate.mode === 'still' && metaLive.mode === 'live';

  const ok = stillLit && noCrash && modeOk && hasNearest;
  log(
    `Gates: stillLit=${stillLit} noCrash=${noCrash} modeOk=${modeOk} (liveY=${lumLive.meanY.toFixed(1)} lateY=${lumLate.meanY.toFixed(1)})`,
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
