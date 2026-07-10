# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

**Production first-run UX + seafloor/waterline train landed** (2026-07-09). Next gate is **push + live Pages verify**.

- Cold load: **Enter Oceanscape** intro → free-fly gated; underlay is STILL ocean hero.
- Default: `animateWaves: false` (STILL accumulate); Controls open; other panels collapsed.
- Fly: shared yaw/pitch (drag + WASD); A/D via `src/flyBasis.ts` (left/right of look).
- Seafloor: parametric height/bump/pattern/material + presets; substrate only.
- Water path: heightfield march + normal-offset dielectric spawn (no sky-while-underwater fudge).
- Smoke: `npm run smoke` (auto-enters intro); `npm run test:strafe`.

**Canonical next docs:**  
`2026-07-09-production-ux-physics-handoff.md`  
`2026-07-09-northstar-visual-deploy-handoff.md` (ship checklist)

## Hard-Won Lessons

1. Never blend path-trace samples across changing waves/cube.
2. Cube must be in frame or “physics” looks broken.
3. Snell window needs FOV past critical angle to show dark TIR ring.
4. False water miss / self-hit → STILL black streaks; fix geometry/medium, not paint.
5. One yaw for look + strafe or drag→WASD snaps.
6. Physics demo ships before full Goethe REQ matrix.

## How We Work

- `/init` · `/done` · `npm run build` · `npm run dev` · `npm run smoke` · `npm run test:strafe` · push → Actions Pages
- API: `window.__oceanscape` (`entered`, `enterOceanscape`, freeze/animate, chapters)
- Live URL target: https://pranavsai142.github.io/raytracing/

## Next Focus

1. Commit dirty `pathTracer.frag.glsl` if still uncommitted; push `main`.
2. Live checklist on Pages (intro → Enter → STILL → LIVE; A/D; mobile Menu).
3. Optional PR-C: Snell button, mode badge, freeze key.
4. Optional P2: floor reverse-NEE caustics; Goethe completeness.

---

*Update lightly each session. Detail lives in handoffs.*
