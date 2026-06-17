import * as THREE from 'three';
import { PathTracer } from './PathTracer';

const KEYS = new Set<string>();

export function setupCameraControls(tracer: PathTracer, canvas: HTMLCanvasElement): void {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    KEYS.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => KEYS.delete(e.key.toLowerCase()));

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      dragging = true;
      tracer.setUserInteracting(true);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    tracer.setUserInteracting(false);
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    tracer.applyMouseLook(dx, dy);
  });

  const vel = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;

  // Sync initial yaw/pitch from camera
  const forward = new THREE.Vector3()
    .subVectors(tracer.cameraTarget, tracer.cameraPos)
    .normalize();
  yaw = Math.atan2(forward.x, forward.z);
  pitch = Math.asin(THREE.MathUtils.clamp(forward.y, -0.99, 0.99));

  tracer.onCameraMoved = () => {
    const f = new THREE.Vector3().subVectors(tracer.cameraTarget, tracer.cameraPos).normalize();
    yaw = Math.atan2(f.x, f.z);
    pitch = Math.asin(THREE.MathUtils.clamp(f.y, -0.99, 0.99));
  };

  function tick(dt: number): void {
    const p = tracer.params;
    const maxSpeed = p.moveSpeed;
    const accel = p.moveAccel;

    const wish = new THREE.Vector3();
    if (KEYS.has('w')) wish.z -= 1;
    if (KEYS.has('s')) wish.z += 1;
    if (KEYS.has('a')) wish.x -= 1;
    if (KEYS.has('d')) wish.x += 1;
    if (KEYS.has('q')) wish.y -= 1;
    if (KEYS.has('e')) wish.y += 1;

    if (wish.lengthSq() > 0) {
      wish.normalize();
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const right = new THREE.Vector3(cy, 0, -sy);
      const flatForward = new THREE.Vector3(sy, 0, cy);
      const moveDir = new THREE.Vector3()
        .addScaledVector(right, wish.x)
        .addScaledVector(flatForward, -wish.z)
        .addScaledVector(new THREE.Vector3(0, 1, 0), -wish.y)
        .normalize();

      vel.addScaledVector(moveDir, accel * dt);
      if (vel.length() > maxSpeed) vel.setLength(maxSpeed);
    } else {
      vel.multiplyScalar(Math.max(0, 1 - p.moveDamping * dt));
    }

    if (vel.lengthSq() > 1e-8) {
      tracer.cameraPos.addScaledVector(vel, dt);
      tracer.updateCameraTargetFromAngles(yaw, pitch);
    }
  }

  tracer.preRender = tick;
}