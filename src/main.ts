import { PathTracer } from './PathTracer';
import { setupCameraControls } from './cameraControls';
import { setupUI } from './ui';

const statsEl = document.getElementById('stats');

try {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const tracer = new PathTracer(canvas);
  setupUI(tracer);
  setupCameraControls(tracer, canvas);

  if (statsEl) {
    statsEl.textContent = `GPU: ${tracer.getGpuInfo()} — drag mouse + WASD to explore`;
  }

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