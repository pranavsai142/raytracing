#!/usr/bin/env node
/**
 * Production first-run UX: intro → enter → STILL hero → controls legend.
 * Writes evidence under SCRATCH.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SCRATCH =
  process.env.SCRATCH ||
  '/var/folders/h9/sn160jkx6hb87vp9683ptqr00000gn/T/grok-goal-6cec87b1f3bf/implementer';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173/raytracing/';
const lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};

await mkdir(SCRATCH, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let fatal = null;

try {
  log(`goto ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, { timeout: 20000 });

  const cold = await page.evaluate(() => {
    const intro = document.getElementById('intro-overlay');
    const canvas = document.getElementById('canvas');
    const legend = document.getElementById('controls-legend');
    const api = window.__oceanscape;
    return {
      hasIntro: !!intro && !intro.classList.contains('intro-hidden'),
      hasCanvas: !!canvas,
      legendHidden: legend ? legend.hidden : true,
      entered: api.entered,
      animate: api.tracer.params.animateWaves,
      chapter: api.tracer.params.activeChapter,
      mode: api.getMode(),
    };
  });
  log('cold load: ' + JSON.stringify(cold));

  if (!cold.hasIntro) throw new Error('intro overlay missing on cold load');
  if (!cold.hasCanvas) throw new Error('canvas missing');
  if (cold.entered) throw new Error('should not be entered yet');
  if (cold.animate !== false) throw new Error('animateWaves should be false (STILL) on load');
  if (cold.chapter !== 'ocean') throw new Error('hero chapter should be ocean');

  // Enter via button
  await page.click('#enter-oceanscape');
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => {
    const intro = document.getElementById('intro-overlay');
    const legend = document.getElementById('controls-legend');
    const api = window.__oceanscape;
    const openPanels = [...document.querySelectorAll('details.panel-section[open]')].map(
      (d) => d.querySelector('summary')?.textContent?.trim() || '?',
    );
    const allPanels = [...document.querySelectorAll('details.panel-section')].length;
    return {
      introHidden: intro?.classList.contains('intro-hidden') || intro?.getAttribute('aria-hidden') === 'true',
      legendVisible: legend && !legend.hidden,
      legendText: legend?.innerText?.slice(0, 120) || '',
      entered: api.entered,
      animate: api.tracer.params.animateWaves,
      mode: api.getMode(),
      samples: api.getSamples(),
      openPanels,
      allPanels,
    };
  });
  log('after enter: ' + JSON.stringify(after));

  if (!after.entered) throw new Error('entered flag false after enter');
  if (!after.introHidden) throw new Error('intro still visible');
  if (!after.legendVisible) throw new Error('controls legend not visible');
  if (after.animate !== false) throw new Error('should stay STILL after enter');
  if (after.mode !== 'still' && after.mode !== 'live') {
    // live only if camera still settling — wait
  }
  // Prefer still
  await page.waitForTimeout(800);
  const mode2 = await page.evaluate(() => window.__oceanscape.getMode());
  log('mode after settle: ' + mode2);
  if (mode2 !== 'still') {
    // force freeze
    await page.evaluate(() => window.__oceanscape.freezeForCapture());
    await page.waitForTimeout(400);
  }
  const mode3 = await page.evaluate(() => ({
    mode: window.__oceanscape.getMode(),
    animate: window.__oceanscape.tracer.params.animateWaves,
  }));
  log('mode after freeze: ' + JSON.stringify(mode3));
  if (mode3.animate !== false) throw new Error('animate still on');
  if (mode3.mode !== 'still') throw new Error('expected STILL mode, got ' + mode3.mode);

  // Only Controls section should start open (or few)
  log('open panel summaries: ' + after.openPanels.join(', '));
  log('total panel sections: ' + after.allPanels);
  if (after.allPanels < 5) throw new Error('menus missing — expected full panel tree');

  // Mobile: menu toggle exists
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const mobile = await page.evaluate(() => {
    const btn = document.getElementById('menu-toggle');
    const style = btn ? getComputedStyle(btn) : null;
    return {
      menuDisplay: style?.display,
      menuVisible: style && style.display !== 'none',
    };
  });
  log('mobile menu: ' + JSON.stringify(mobile));
  if (!mobile.menuVisible) throw new Error('menu toggle not visible on narrow viewport');

  await page.locator('#canvas').screenshot({ path: path.join(SCRATCH, 'enter-hero.png') });
  log('screenshot: enter-hero.png');

  // Drag + W regression (orientation hold)
  const box = await page.locator('#canvas').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55 + 80, box.y + box.height * 0.5 - 20, { steps: 5 });
    await page.mouse.up();
    const mid = await page.evaluate(() => {
      const t = window.__oceanscape.tracer;
      return { pos: [t.cameraPos.x, t.cameraPos.y, t.cameraPos.z], tgt: [t.cameraTarget.x, t.cameraTarget.y, t.cameraTarget.z] };
    });
    await page.keyboard.down('w');
    await page.waitForTimeout(300);
    await page.keyboard.up('w');
    const afterW = await page.evaluate(() => {
      const t = window.__oceanscape.tracer;
      return { pos: [t.cameraPos.x, t.cameraPos.y, t.cameraPos.z], tgt: [t.cameraTarget.x, t.cameraTarget.y, t.cameraTarget.z] };
    });
    const dir = (p, t) => {
      const d = [t[0] - p[0], t[1] - p[1], t[2] - p[2]];
      const L = Math.hypot(...d) || 1;
      return d.map((v) => v / L);
    };
    const d0 = dir(mid.pos, mid.tgt);
    const d1 = dir(afterW.pos, afterW.tgt);
    const lookDot = d0[0] * d1[0] + d0[1] * d1[1] + d0[2] * d1[2];
    log(`drag+W lookDot=${lookDot.toFixed(4)} moved=${Math.hypot(afterW.pos[0]-mid.pos[0], afterW.pos[2]-mid.pos[2]).toFixed(3)}`);
    if (lookDot < 0.95) throw new Error('look snapped after WASD');
  }

  log('OVERALL PASS');
} catch (e) {
  fatal = e instanceof Error ? e.message : String(e);
  log('FATAL: ' + fatal);
} finally {
  await browser.close();
}

await writeFile(path.join(SCRATCH, 'intro-flow.log'), lines.join('\n') + '\n');
process.exit(fatal ? 1 : 0);
