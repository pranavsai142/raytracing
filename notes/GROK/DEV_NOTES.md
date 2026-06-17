# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

Greenfield Three.js port of the Metal Oceanscape simulation, seeded from `/Users/pranav/projects/oceanscape/notes/GROK`. Building a Vite + TypeScript + Three.js GPU path tracer with dielectric interface physics, volume scattering, UI controls, and GitHub Pages deployment.

## Hard-Won Lessons

### 1. Port the physics, not the platform
- Metal ray tracing → WebGL fragment shader path tracer with analytic intersections.
- Dielectric math (Fresnel/Snell/TIR) ports directly; acceleration structures become manual ray-box/plane tests.

### 2. Cube is the validation anchor
- Rotating textured cube at y=-3, water plane at y=0.
- All interface phenomena must be visible on/through the cube.

## How We Work

- Run `/init` at the start of every session.
- Run `/done` when finishing meaningful work.
- Build: `npm run build`
- Dev: `npm run dev`
- Deploy: `npm run deploy` (build + gh-pages)
- Verify: app loads, path tracer renders, controls work, no console errors.

## Next Focus

Complete implementation slices: core scene → dielectric path tracer → volume god rays → UI/polish → deploy. See latest handoff.

---

*Update this file lightly at the end of significant sessions. Put the real detail in the handoff.*