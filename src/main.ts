import { PathTracer } from './PathTracer';
import { setupUI } from './ui';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const tracer = new PathTracer(canvas);
setupUI(tracer);

function animate(): void {
  requestAnimationFrame(animate);
  tracer.render();
}

animate();