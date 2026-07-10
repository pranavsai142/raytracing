import * as THREE from 'three';
import { PathTracer } from './PathTracer';
import { syncOrbitUI } from './ui';
import { wishToWorldDir, type FlyGate } from './flyBasis';

export { moveBasisFromYaw, wishToWorldDir, type FlyGate } from './flyBasis';

const KEYS = new Set<string>();

function isTypingTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement ||
    (t instanceof HTMLElement && t.isContentEditable)
  );
}

/**
 * Fly camera: pointer-drag look + WASD/QE move.
 * Orientation is owned here. Mouse look MUST update the same yaw/pitch WASD uses.
 * When `gate.enabled` is false (intro screen), look/move input is ignored.
 */
export function setupCameraControls(
  tracer: PathTracer,
  canvas: HTMLCanvasElement,
  gate: FlyGate = { enabled: true },
): void {
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (!gate.enabled) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    KEYS.add(k);
  });
  window.addEventListener('keyup', (e) => {
    KEYS.delete(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => KEYS.clear());

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let activePointerId: number | null = null;

  const vel = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;

  const syncLookFromTracer = () => {
    const f = new THREE.Vector3()
      .subVectors(tracer.cameraTarget, tracer.cameraPos)
      .normalize();
    if (f.lengthSq() < 1e-10) return;
    yaw = Math.atan2(f.x, f.z);
    pitch = Math.asin(THREE.MathUtils.clamp(f.y, -0.99, 0.99));
  };

  const onExternalCameraMove = () => {
    syncLookFromTracer();
    vel.set(0, 0, 0);
  };

  syncLookFromTracer();
  tracer.onCameraMoved = onExternalCameraMove;

  const stopOrbitIfNeeded = () => {
    if (!tracer.params.autoOrbit) return;
    tracer.params.autoOrbit = false;
    syncOrbitUI(tracer);
  };

  const endDrag = (pointerId?: number) => {
    if (!dragging) return;
    if (pointerId != null && activePointerId != null && pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    tracer.setUserInteracting(false);
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!gate.enabled) return;
    if (e.button !== 0) return;
    dragging = true;
    activePointerId = e.pointerId;
    stopOrbitIfNeeded();
    tracer.setUserInteracting(true);
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!gate.enabled || !dragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const sens = tracer.params.mouseSensitivity;
    yaw -= dx * sens;
    pitch -= dy * sens;
    pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    tracer.updateCameraTargetFromAngles(yaw, pitch);
  });

  canvas.addEventListener('pointerup', (e) => endDrag(e.pointerId));
  canvas.addEventListener('pointercancel', (e) => endDrag(e.pointerId));
  canvas.addEventListener('lostpointercapture', () => endDrag());
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function tick(dt: number): void {
    if (!gate.enabled) {
      vel.set(0, 0, 0);
      KEYS.clear();
      return;
    }

    if (tracer.params.autoOrbit) {
      syncLookFromTracer();
      vel.set(0, 0, 0);
      return;
    }

    const p = tracer.params;
    const maxSpeed = p.moveSpeed;
    const accel = p.moveAccel;

    let wishX = 0;
    let wishY = 0;
    let wishZ = 0;
    if (KEYS.has('a')) wishX -= 1;
    if (KEYS.has('d')) wishX += 1;
    if (KEYS.has('w')) wishZ += 1;
    if (KEYS.has('s')) wishZ -= 1;
    if (KEYS.has('e')) wishY += 1;
    if (KEYS.has('q')) wishY -= 1;

    if (wishX !== 0 || wishY !== 0 || wishZ !== 0) {
      stopOrbitIfNeeded();
      const d = wishToWorldDir(wishX, wishY, wishZ, yaw);
      const moveDir = new THREE.Vector3(d.x, d.y, d.z);
      vel.addScaledVector(moveDir, accel * dt);
      if (vel.length() > maxSpeed) vel.setLength(maxSpeed);
    } else {
      vel.multiplyScalar(Math.max(0, 1 - p.moveDamping * dt));
      if (vel.lengthSq() < 1e-10) vel.set(0, 0, 0);
    }

    if (vel.lengthSq() > 1e-8) {
      tracer.cameraPos.addScaledVector(vel, dt);
      tracer.updateCameraTargetFromAngles(yaw, pitch);
    }
  }

  tracer.preRender = tick;
}
