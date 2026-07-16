# 2026-07-16 — STILL Accumulate Pipeline + Snell Escape (Closed)

## Session arc (what actually happened)

User-visible failure (Ocean chapter, Apple M3 / ANGLE):

1. **Below / look-up:** Snell disk and bulk could go black as STILL climbed.
2. **Above water:** surface / view could progressive-black mid-accum (often before DONE).
3. **Smoking gun report:** *“LIVE path looks fine → as soon as it switches to STILL accumulate everything goes black. Move camera → see scene again → black again.”*

First fix pass targeted **path honesty** (medium / interface). That was necessary but **not sufficient**. User confirmed still black until the **accum pipeline** fix landed. Then: **“its working now.”**

This handoff captures both layers so we never re-debug the wrong layer first.

---

## The two failure layers (both real)

### Layer A — Path mean is black (physics / medium)

Open heightfield + `inWater`. Miss while underwater → `underwaterMissRadiance` (~near black), **not** air sky. Correct policy; false miss / wrong dielectric → STILL freezes a black mean.

**Fixes landed:**

| Fix | Why |
|-----|-----|
| `fromInside = inWater` (not `dot(I,N)`) | Steep wave normals misclassify air↔water → wrong eta/TIR → failed Snell escape |
| Hardened `intersectWaterSurface` | Better seed, residual, march, expanded bracket for upward look-up |
| Domain closure + guaranteed upward surface | In-water legs must hit free surface or floor |
| Geometric water→air transmit when escape valid | Microfacet false TIR killed the cone |
| Spawn medium forced after interface events | Trough/peak desync → black residual |
| RR delayed slightly | Barely-alive escape less often zeroed |

**Non-fixes (keep forever):**

- Do **not** put air sky in `underwaterMissRadiance` (white-bar / medium leak history).
- Do **not** reintroduce post-budget rolling EMA with frozen `accumSampleCount` seed.
- Do **not** “fix” by exposure alone.

### Layer B — STILL pipeline reads black history (GPU / RT sampling) ← **user’s “LIVE ok STILL black”**

| Mode | Samples previous accum RT? | If RT sample is broken |
|------|----------------------------|-------------------------|
| **LIVE** | **No** — every frame `resetAccum` / no history | Scene still looks alive (noisy) |
| **STILL** | **Yes** — progressive `mix(prev, color, w)` | `prev ≈ 0` → average dies to black over frames |

**Root cause on Apple/ANGLE:** accum was **HalfFloat + LinearFilter**. Linear filtering of float/half-float RTs is not reliably supported; `texture2D(accumTexture)` can return **0**. LIVE never samples history → looks fine. STILL always does → progressive blackout. Camera move clears / goes LIVE → scene returns → settle STILL → black again. **Exact user loop.**

**Fixes landed (`PathTracer.ts` + shader):**

| Fix | Why |
|-----|-----|
| `NearestFilter` on accum min/mag | Exact texel reads for progressive blend |
| Prefer `FloatType` when `EXT_color_buffer_float` | More reliable color-renderable accum on WebGL2 |
| HalfFloat only as fallback; byte last | |
| NaN/Inf sanitize + re-seed if `prev` empty/black but `color` lit | Poisoned / lost RT doesn’t drag mean to 0 |
| Settle / `markSceneChanged`: force `lastSampleTime = 0` | First STILL sample lands immediately |
| Settle: don’t depend on a pure black plate before first path frame | Less black flash on LIVE→STILL |

GPU string after fix (harness):  
`ANGLE (Apple, Apple M3, OpenGL 4.1) · accum=float32+nearest`

---

## Mental model (why raytracing “wasn’t working”)

```
LIVE  = independent Monte Carlo snapshot each frame (no history)
STILL = progressive estimate of the *true mean* for a frozen scene

If mean is wrong (Layer A)     → STILL freezes a black plate
If history sample is broken (B) → STILL blends toward zero even if paths are lit
If both ok                     → STILL cleans up; Snell cone stays bright; surface stays sand/cube
```

Debugging order next time something “goes black”:

1. **Does LIVE look OK while STILL dies?** → Layer B (accum type/filter/ping-pong) first.
2. **Both die / mean is dark in single samples?** → Layer A (path / medium / miss).
3. **Only after budget, over time?** → rolling EMA / frozen seed (already banned).

---

## Files touched

| File | Role |
|------|------|
| `src/shaders/pathTracer.frag.glsl` | Medium-based dielectric, intersect, domain closure, transmit, NaN/progressive guards |
| `src/PathTracer.ts` | Accum type/filter, settle clear discipline, gpuInfo `accum=…` |
| `scripts/test-snell-still.mjs` | Snell look-up + above progressive luminance |
| `scripts/test-still-switch.mjs` | **LIVE → Animate OFF → STILL stays lit** + static NearestFilter assert |
| `package.json` | `test:snell-still`, `test:still-switch` |
| `notes/GROK/DEV_NOTES.md` | Lessons 5–6 |

---

## Harnesses (run with `npm run dev`)

```bash
npm run build
npm run test:still-switch   # LIVE→STILL switch; NearestFilter invariant
npm run test:above-still    # above water hold past budget
npm run test:snell-still    # look-up cone + progressive
npm run smoke
npm run repro:still-blackout  # optional; headless may under-repro user GPU
```

**User acceptance (confirmed this session):** hard refresh → Ocean → Above / Below look-up → STILL climbs without black plate.

---

## Key decisions to keep

1. Simulation honesty > pretty paint.
2. STILL freezes **geometry**, not “correctness of light.”
3. LIVE must not blend mismatched waves/cube.
4. Accum RT must be **sampleable** (float32 + nearest when possible) or STILL is a lie.
5. Medium tracking for dielectrics beats geometric hemisphere tests on heightfields.
6. Headless green is necessary, not sufficient — trust user GPU loop for progressive black.

---

## What next session starts on

1. `/init` — this handoff + prior Snell spots handoff if needed.
2. Optional: residual 1–5% speckles if still reported.
3. Optional: push / GitHub Pages after confidence.
4. Do **not** reintroduce LinearFilter on float accum or rolling post-budget EMA.

### First commands

```bash
npm run build && npm run dev
# hard refresh; confirm footer shows accum=float32+nearest (or half+nearest)
npm run test:still-switch && npm run test:snell-still && npm run test:above-still
```

---

## Open questions (non-blocking)

- Residual speckles at grazing only?
- Should smoke scene `07` gain a real upper-ROI luminance gate (now covered by `test:snell-still`)?

---

## North star reminder

> Light traps underwater until the angle allows escape.  
> Looking up: bright Snell cone + dark TIR ring.  
> Looking down: interface + cube/floor, not a black plate.  
> STILL must converge to that truth — and the accum buffer must actually hold it.

*End of handoff. User confirmed STILL working after accum pipeline fix.*
