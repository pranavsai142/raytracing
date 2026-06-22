# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

Oceanscape Web + **Goethe visual book (first code landing)**. Vite + TypeScript + Three.js GPU path tracer: dielectric interface (Fresnel/Snell/TIR), waves, temporal accumulation, submerged rotating cube. **Goethe layer:** chapter panel, 8 book chapters + 6 water presets, `applyChapterPreset`, `#chapter=` URLs, badges (PHYSICAL/MIXED/PHYSIOLOGICAL), neutral water (`scatterTint`, `turbidity`, `absorptionModel`), dual-light shadows, display-post physiology.

**Build:** `npm run build` passes. **Deploy:** gh-pages may lag — redeploy needed. **Validation:** zero PNGs in `notes/GROK/validation/goethe/` yet.

## Hard-Won Lessons

### 1. Port the physics, not the platform
- Metal → WebGL fragment path tracer; analytic intersections.

### 2. Cube is the validation anchor
- Rotating checkerboard cube submerged below water plane. Chapters change lighting/presets, not cube role. **Note:** default `cubeDepth` is -2.2 in code (SOUL_DRIVER still says -3).

### 3. Goethe = two-layer honesty
- Physical: path-traced radiance. Physiological: complement/contrast/bloom/afterimage in **labeled** display pass — never fake water pigment.

## How We Work

- `/init` at session start · `/done` at close
- Build: `npm run build` · Dev: `npm run dev` · Deploy: `npm run deploy`
- Contract: `REQ-goethe-theory-of-colours.md`, `REQ-goethe-water.md`
- Scorecard: latest handoff `2026-06-16-goethe-implementation-handoff.md`

## Next Focus

1. **Validation PNGs** — REQ verification matrix (all chapters + WTR-02/05)
2. **P2 geometry** — WTR-06 vase, WTR-07 water-prism (buttons + shader)
3. **GTC-07** — real `afterimageBuffer`, not fixation tint stub
4. **Gaps** — physiological UI labels, `godRayMode`, candle in shader, deploy
5. See handoff for full PARTIAL/NOT DONE list per REQ ID

---

*Update lightly each session. Detail lives in handoffs.*