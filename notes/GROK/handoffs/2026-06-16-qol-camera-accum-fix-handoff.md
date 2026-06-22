# 2026-06-16 — QoL, Camera Controls, Accumulation Anti-Ghosting

## What Happened

Session continued Oceanscape Web after initial Three.js port + deploy. User could see path tracing but hit three UX/physics issues in sequence; each was diagnosed and fixed.

### 1. Black screen ("Initializing...")
- **Root cause:** `resize()` ran before `accumTargets` existed → JS crash on init.
- **Fix:** GPU targets + shader material created before first `resize()`; error surfaced in stats line.

### 2. GPU rendering hardening
- `powerPreference: 'high-performance'` on WebGLRenderer
- HalfFloat ping-pong accum buffers (RGBA8 fallback)
- Two-pass pipeline: path trace → accum RT, tone-map → screen
- Shader uniforms: `int`/`bool` → `float` for driver compat
- `vite.config.ts`: `host: true`, `allowedHosts: true` (Tailscale/custom domains)

### 3. Physics fidelity (user validation)
User confirmed underlying geometry/light transport looked correct — TIR trapping until wave **topology** permits escape. Ported/strengthened Metal Oceanscape dielectric math:
- Fresnel (Schlick) reflect vs transmit
- Snell refraction + wavelength-dependent IOR (spectral dispersion slider)
- TIR multi-bounce trapping inside water volume
- HG volume scatter can redirect trapped rays back to interface
- Cube lit only via transmitted paths

### 4. QoL — full configurability + tooltips
- Every sim parameter exposed in scrollable UI sections (Render Quality, Water Physics, Wave Topology, Lighting & Volume, Scene, Camera)
- `data-tip` tooltips on all controls explaining physics/behavior
- WASD + Q/E movement with acceleration/damping (`cameraControls.ts`)
- Mouse drag look on canvas
- All move/mouse params slider-configurable

### 5. Flicker fix (samples vs frame rate)
- **Root cause:** full-FPS path tracing while waves/cube animate → each sample = different scene → fighting accumulation.
- **Fixes:** `sampleFps` (default 20), `samplesPerFrame` default 1, temporal blend only when still, smaller/faster scene defaults (render scale 0.65, time scale 0.15, cube depth -2.2), auto-orbit OFF by default.

### 6. Camera ghosting / "tracers" fix (latest)
User: real life has no tracers — streaks were temporal ghosting, not physics.
- **Root cause:** blending old camera viewpoint with new during WASD/mouse/orbit movement.
- **Fix:** `isCameraInMotion()` + `userInteracting` gate:
  - While moving: `clearAccumBuffers()`, `resetAccum=1`, `temporalBlend=1` (no history blend), trace every frame
  - On stop: 0.4s settle cooldown, then fresh progressive refinement
  - Volume god-ray intensity reduced ~80% (was reading as bright streaks)
- **Expected trade-off:** grain/noise while moving is normal for real-time PT; sharpens when still.

### Goethe shell (in progress, uncommitted)
Substantial P0 work landed locally but not committed:
- `src/chapters.ts` — chapter defs + water presets
- `PathTracer.applyChapterPreset()` — preset param bundles
- `index.html` — Goethe chapter grid + expanded controls
- Goethe uniforms: `scatterTint`, `turbidity`, `absorptionModel`, physiological post knobs
- Build passes: `npm run build` ✓

## Key Decisions

1. **No temporal blend during camera motion** — correctness of viewpoint beats smooth convergence while exploring.
2. **Grain while moving is acceptable** — industry-standard RT compromise; convergence on stillness.
3. **Tracers ≠ physics** — any streak between old/new views is an accumulation bug, not a feature.
4. **Spectral dispersion is hero-wavelength PT** — chromatic effects from IOR variation, not tint filters.
5. **Goethe physiological effects stay labeled** — complement/afterimage are post-process, not water pigment.

## Hard Lessons

- Init order matters: any method touching GPU resources must run after constructor setup completes.
- Path tracers cannot accumulate across camera motion without ghosting — must hard-reset or use per-pixel reprojection (not implemented).
- Animated scenes need decoupled sample rate from display rate.
- Volume scatter intensity easily reads as "god-ray tracers" even when accumulation is correct.

## Current Code State

**Uncommitted changes:**
- `index.html`, `src/PathTracer.ts`, `src/shaders/pathTracer.frag.glsl`, `src/style.css`, `src/ui.ts`
- New: `src/chapters.ts`, `src/cameraControls.ts` (cameraControls may be committed — verify)
- `vite.config.ts` committed in prior work

**Dev server:** `npm run dev` → http://localhost:5173/raytracing/ (port 5173, host + allowedHosts)

**Controls reminder:** WASD/Q/E move · mouse drag look · 1/2 above/below · Space orbit · R reset accum · X export PNG

## What the Next Session Must Start On

1. Run `/init`
2. **Commit** uncommitted Goethe + QoL work with meaningful message
3. Visual-verify each chapter preset against `REQ-goethe-theory-of-colours.md` + `REQ-goethe-water.md` acceptance criteria
4. Remaining P0 gaps (if any after preset audit):
   - Per-chapter quote tooltips on chapter buttons (REQ GTC-00)
   - `diver-view` green shadow physiological toggle wiring
   - Mobile Safari HalfFloat accum verification
5. Optional: MIS/unbiased estimator for faster convergence
6. Enable GitHub Pages if still 404: Settings → Pages → gh-pages or Actions workflow
7. Run `/done` after commit + preset verification

## Open Questions

- Is grain-while-moving acceptable to user, or invest in reprojection/temporal denoiser?
- Commit now vs squash with prior `init oceanscape spiritual successoor`?
- Chunk size warning (511 kB JS) — code-split chapters panel?
- `cubeDepth` moved to -2.2 (from -3) for faster convergence — revert for cube invariant strictness?

---

*End of handoff. Path tracer renders correctly; ghosting fixed; Goethe shell ready to commit and verify.*