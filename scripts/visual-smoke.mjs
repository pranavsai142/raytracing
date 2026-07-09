#!/usr/bin/env node
/**
 * North-star visual smoke — Playwright captures of path-traced ocean physics.
 *
 * Proves LIVE vs STILL modes and captures the SOUL_DRIVER phenomena:
 *   - Snell's window (below water, escape cone)
 *   - TIR trapping (underwater looking up / around cube)
 *   - Chromatic caustics (refraction + dispersion, frozen accum)
 *   - Above-water transmitted lighting on submerged cube
 *
 * Usage:
 *   npm run dev   # terminal A, port 5173
 *   npm run smoke # terminal B
 *
 * Env:
 *   BASE_URL   default http://127.0.0.1:5173/
 *   OUT_DIR    default notes/GROK/validation/northstar
 *   SAMPLES    default 48 (still-mode target before screenshot)
 *   HEADED     set 1 to show browser
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173/';
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'notes/GROK/validation/northstar');
const SAMPLES = Number(process.env.SAMPLES || 48);
const HEADED = process.env.HEADED === '1';

/** @type {{ id: string, label: string, chapter: string, underwater?: boolean, live?: boolean, spp?: number, expect: string }[]} */
const SCENES = [
  {
    id: '01-live-underwater',
    label: 'LIVE underwater path-trace (noisy, no ghost blend)',
    chapter: 'ocean',
    underwater: true,
    live: true,
    expect: 'Realtime path-trace; checkerboard cube visible; waves move; no temporal ghosting',
  },
  {
    id: '02-still-snell-tir-cube',
    label: 'STILL underwater — cube + surface (Snell / TIR / caustics)',
    chapter: 'ocean',
    underwater: true,
    live: false,
    spp: 2,
    expect: 'Checkerboard cube framed; surface above with Snell window / TIR dark band; caustic patches from wave topology',
  },
  {
    id: '03-still-refraction-caustics',
    label: 'STILL refraction chapter — spectral caustics',
    chapter: 'refraction',
    underwater: true,
    live: false,
    spp: 2,
    expect: 'Dispersion + wave focus caustics on cube; progressive clean-up',
  },
  {
    id: '04-still-above-cube',
    label: 'STILL above water looking into volume',
    chapter: 'ocean',
    underwater: false,
    live: false,
    spp: 2,
    expect: 'Submerged checkerboard cube through interface; Fresnel + refraction',
  },
  {
    id: '05-still-colourless-water',
    label: 'STILL Goethe colourless water (neutral medium)',
    chapter: 'goethe-colourless-water',
    live: false,
    spp: 2,
    expect: 'Cube through colourless medium; no bulk blue pigment',
  },
  {
    id: '06-still-diver',
    label: 'STILL diver view — depth + absorption',
    chapter: 'diver-view',
    live: false,
    spp: 2,
    expect: 'Underwater cube; beer absorption; still path-trace',
  },
  {
    id: '07-still-look-up-snell',
    label: 'STILL look up — pure Snell window / TIR trap',
    chapter: 'ocean',
    underwater: true,
    live: false,
    spp: 2,
    lookUp: true,
    expect: 'Looking upward: bright Snell cone of sky; dark TIR outside; ocean light trap visualization',
  },
];

async function waitForApi(page, timeoutMs = 15000) {
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, { timeout: timeoutMs });
}

async function captureScene(page, scene) {
  await page.evaluate(
    ({ chapter, underwater, live, spp, lookUp }) => {
      const api = window.__oceanscape;
      const t = api.tracer;
      if (spp) t.params.samplesPerFrame = spp;
      t.params.renderScale = Math.max(t.params.renderScale, 0.85);
      t.applyRenderScale();
      api.applyChapter(chapter);
      if (typeof underwater === 'boolean') api.setUnderwater(underwater);
      if (lookUp) {
        // Classic Snell window: deep underwater looking up. FOV edges past critical
        // angle (~48.6°) → bright escape cone, dark TIR surround, cube below.
        t.params.fov = 90;
        t.cameraPos.set(0, -3.5, 3.5);
        t.cameraTarget.set(0, 0.8, 0);
      }
      if (live) api.unfreezeLive();
      else api.freezeForCapture();
    },
    {
      chapter: scene.chapter,
      underwater: scene.underwater,
      live: !!scene.live,
      spp: scene.spp || 1,
      lookUp: !!scene.lookUp,
    },
  );

  // Let a few frames settle after chapter/camera change
  await page.waitForTimeout(500);

  let sampleResult = { samples: 0, mode: '?', ok: false };
  if (scene.live) {
    await page.waitForTimeout(900);
    sampleResult = await page.evaluate(() => ({
      samples: window.__oceanscape.getSamples(),
      mode: window.__oceanscape.getMode(),
      ok: window.__oceanscape.getMode() === 'live',
    }));
  } else {
    sampleResult = await page.evaluate(async (target) => {
      return window.__oceanscape.waitForSamples(target, 35000);
    }, SAMPLES);
  }

  const stats = await page.evaluate(() => window.__oceanscape.getStats());
  const pngPath = path.join(OUT_DIR, `${scene.id}.png`);
  await page.locator('#canvas').screenshot({ path: pngPath });

  return {
    ...scene,
    stats,
    samples: sampleResult.samples,
    mode: sampleResult.mode,
    ok: sampleResult.ok,
    png: path.relative(root, pngPath),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = [];
  let fatal = null;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForApi(page);

    for (const scene of SCENES) {
      process.stdout.write(`· ${scene.id} … `);
      const r = await captureScene(page, scene);
      results.push(r);
      console.log(`${r.mode} samples=${r.samples} ${r.ok ? 'OK' : 'WARN'} → ${r.png}`);
    }
  } catch (err) {
    fatal = err instanceof Error ? err.message : String(err);
    console.error('FATAL:', fatal);
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    samplesTarget: SAMPLES,
    northStar:
      'Reproduce light at the air–water interface: Fresnel, Snell, TIR trap/escape, caustics — simulation not faked shading.',
    rootCauseFixed:
      'LIVE never blends mismatched wave/cube frames; STILL freezes waves+cube and progressive-averages 1/N.',
    results,
    fatal,
    pass: !fatal && results.every((r) => r.ok),
  };

  const reportPath = path.join(OUT_DIR, 'SMOKE_REPORT.json');
  const mdPath = path.join(OUT_DIR, 'SMOKE_REPORT.md');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  const md = [
    '# North-star visual smoke report',
    '',
    `Generated: ${report.generatedAt}`,
    `Base URL: ${BASE_URL}`,
    `Still sample target: ${SAMPLES}`,
    `Pass: **${report.pass ? 'YES' : 'NO'}**`,
    '',
    '## North star',
    '',
    report.northStar,
    '',
    '## Rendering contract',
    '',
    report.rootCauseFixed,
    '',
    '| Scene | Mode | Samples | OK | Expect | PNG |',
    '|-------|------|---------|----|--------|-----|',
    ...results.map(
      (r) =>
        `| ${r.id} | ${r.mode} | ${r.samples} | ${r.ok ? 'yes' : 'no'} | ${r.expect} | \`${r.png}\` |`,
    ),
    '',
    fatal ? `## Fatal\n\n${fatal}\n` : '',
    '## How to re-run',
    '',
    '```bash',
    'npm run dev',
    'npm run smoke',
    '```',
    '',
  ].join('\n');

  await writeFile(mdPath, md);
  console.log(`\nReport: ${path.relative(root, mdPath)}`);
  process.exit(report.pass ? 0 : 1);
}

main();
