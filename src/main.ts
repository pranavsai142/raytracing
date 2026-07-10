import { PathTracer } from './PathTracer';
import type { ChapterId } from './chapters';
import { setupCameraControls } from './cameraControls';
import type { FlyGate } from './flyBasis';
import { applyParamsToUI, setupUI, syncOrbitUI, setupShellUX } from './ui';

const statsEl = document.getElementById('stats');

/** Playtest / Playwright surface — north-star / Goethe visual smoke uses this. */
export interface OceanscapeAPI {
  tracer: PathTracer;
  ready: boolean;
  /** False until user dismisses the Enter Oceanscape intro. */
  entered: boolean;
  enterOceanscape: () => void;
  freezeForCapture: () => void;
  unfreezeLive: () => void;
  setAnimateScene: (on: boolean) => void;
  applyChapter: (id: ChapterId) => void;
  setUnderwater: (under: boolean) => void;
  getMode: () => 'live' | 'still';
  getSamples: () => number;
  getStats: () => string;
  getChapterInfo: () => { id: string; badge: string; caption: string };
  waitForSamples: (target: number, timeoutMs?: number) => Promise<{ samples: number; mode: string; ok: boolean }>;
  exportPNG: () => string;
}

declare global {
  interface Window {
    __oceanscape?: OceanscapeAPI;
  }
}

try {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const tracer = new PathTracer(canvas);

  // Production hero: north-star ocean STILL (Snell/TIR + cube), frozen for progressive clean-up.
  // Skip hash override only when no chapter deep-link is present.
  const hash = window.location.hash.replace('#chapter=', '');
  if (!hash) {
    tracer.applyChapterPreset('ocean', false);
    tracer.setAnimateScene(false);
    // Prefer slightly higher quality for the first still
    tracer.params.renderScale = Math.max(tracer.params.renderScale, 0.85);
    tracer.params.samplesPerFrame = Math.max(tracer.params.samplesPerFrame, 2);
    tracer.applyRenderScale();
    tracer.markSceneChanged();
  } else {
    // Deep-link still opens STILL by default for production readability
    tracer.setAnimateScene(false);
  }

  const flyGate: FlyGate = { enabled: false };
  setupUI(tracer);
  setupCameraControls(tracer, canvas, flyGate);

  const shell = setupShellUX(tracer, flyGate);

  if (statsEl) {
    statsEl.textContent = `GPU: ${tracer.getGpuInfo()} — Enter Oceanscape to explore`;
  }

  const api: OceanscapeAPI = {
    tracer,
    ready: true,
    get entered() {
      return shell.entered;
    },
    enterOceanscape: () => shell.enter(),
    freezeForCapture: () => {
      tracer.freezeForCapture();
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = false;
      const leg = document.getElementById('legend-animate') as HTMLInputElement | null;
      if (leg) leg.checked = false;
      syncOrbitUI(tracer);
      shell.refreshLegendMode();
    },
    unfreezeLive: () => {
      tracer.unfreezeLive();
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = true;
      const leg = document.getElementById('legend-animate') as HTMLInputElement | null;
      if (leg) leg.checked = true;
      shell.refreshLegendMode();
    },
    setAnimateScene: (on) => {
      tracer.setAnimateScene(on);
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = on;
      const leg = document.getElementById('legend-animate') as HTMLInputElement | null;
      if (leg) leg.checked = on;
      syncOrbitUI(tracer);
      shell.refreshLegendMode();
    },
    applyChapter: (id) => {
      tracer.applyChapterPreset(id);
      document.querySelectorAll('[data-chapter]').forEach((el) => {
        el.classList.toggle('active', (el as HTMLElement).dataset.chapter === id);
      });
      applyParamsToUI(tracer);
      shell.refreshLegendMode();
    },
    setUnderwater: (under) => tracer.setUnderwaterView(under),
    getMode: () => tracer.getRenderMode(),
    getSamples: () => tracer.getAccumSampleCount(),
    getStats: () => tracer.getStats(),
    getChapterInfo: () => {
      const badge = (document.getElementById('chapter-badge')?.textContent || '').trim();
      const caption = (document.getElementById('chapter-caption')?.textContent || '').trim();
      return {
        id: tracer.params.activeChapter,
        badge: badge || tracer.getChapterBadge(),
        caption,
      };
    },
    waitForSamples: (target, timeoutMs = 20000) =>
      new Promise((resolve) => {
        const start = performance.now();
        const tick = () => {
          const samples = tracer.getAccumSampleCount();
          const mode = tracer.getRenderMode();
          if (mode === 'still' && samples >= target) {
            resolve({ samples, mode, ok: true });
            return;
          }
          if (performance.now() - start > timeoutMs) {
            resolve({ samples, mode, ok: false });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    exportPNG: () => tracer.exportPNG(),
  };
  window.__oceanscape = api;

  applyParamsToUI(tracer);
  shell.refreshLegendMode();

  function animate(): void {
    requestAnimationFrame(animate);
    tracer.render();
    if (shell.entered && statsEl) {
      statsEl.textContent = tracer.getStats();
    }
  }
  animate();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Oceanscape init failed:', err);
  if (statsEl) {
    statsEl.textContent = `Error: ${msg}`;
    statsEl.style.color = '#ff6b6b';
  }
}
