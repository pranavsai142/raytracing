import { PathTracer } from './PathTracer';
import type { ChapterId } from './chapters';
import { setupCameraControls } from './cameraControls';
import { applyParamsToUI, setupUI } from './ui';

const statsEl = document.getElementById('stats');

/** Playtest / Playwright surface — north-star visual smoke uses this. */
export interface OceanscapeAPI {
  tracer: PathTracer;
  ready: boolean;
  freezeForCapture: () => void;
  unfreezeLive: () => void;
  setAnimateScene: (on: boolean) => void;
  applyChapter: (id: ChapterId) => void;
  setUnderwater: (under: boolean) => void;
  getMode: () => 'live' | 'still';
  getSamples: () => number;
  getStats: () => string;
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
  setupUI(tracer);
  setupCameraControls(tracer, canvas);

  if (statsEl) {
    statsEl.textContent = `GPU: ${tracer.getGpuInfo()} — drag mouse + WASD · LIVE until you freeze Animate`;
  }

  const api: OceanscapeAPI = {
    tracer,
    ready: true,
    freezeForCapture: () => {
      tracer.freezeForCapture();
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = false;
    },
    unfreezeLive: () => {
      tracer.unfreezeLive();
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = true;
    },
    setAnimateScene: (on) => {
      tracer.setAnimateScene(on);
      const cb = document.getElementById('animate-waves') as HTMLInputElement | null;
      if (cb) cb.checked = on;
    },
    applyChapter: (id) => {
      tracer.applyChapterPreset(id);
      document.querySelectorAll('[data-chapter]').forEach((el) => {
        el.classList.toggle('active', (el as HTMLElement).dataset.chapter === id);
      });
      applyParamsToUI(tracer);
    },
    setUnderwater: (under) => tracer.setUnderwaterView(under),
    getMode: () => tracer.getRenderMode(),
    getSamples: () => tracer.getAccumSampleCount(),
    getStats: () => tracer.getStats(),
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

  function animate(): void {
    requestAnimationFrame(animate);
    tracer.render();
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