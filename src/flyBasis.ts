/**
 * Pure flat-move basis for the fly camera (no Three.js / GPU deps).
 * Matches PathTracer.updateCameraTargetFromAngles: look XZ = (sin yaw, cos yaw).
 */

export type Vec3 = { x: number; y: number; z: number };

/** When false (intro screen), look/move input is ignored. */
export type FlyGate = { enabled: boolean };

export function moveBasisFromYaw(yaw: number): { right: Vec3; flatForward: Vec3 } {
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const flatForward: Vec3 = { x: sy, y: 0, z: cy };
  // right = cross(flatForward, worldUp) → looking +Z, right is −X (screen right)
  const right: Vec3 = { x: -cy, y: 0, z: sy };
  return { right, flatForward };
}

/** Wish: x = −1 A / +1 D, z = +1 W / −1 S, y = +1 E / −1 Q. Returns unit world dir. */
export function wishToWorldDir(
  wishX: number,
  wishY: number,
  wishZ: number,
  yaw: number,
): Vec3 {
  const { right, flatForward } = moveBasisFromYaw(yaw);
  let x = right.x * wishX + flatForward.x * wishZ;
  let y = wishY;
  let z = right.z * wishX + flatForward.z * wishZ;
  const len = Math.hypot(x, y, z);
  if (len > 1e-10) {
    x /= len;
    y /= len;
    z /= len;
  }
  return { x, y, z };
}
