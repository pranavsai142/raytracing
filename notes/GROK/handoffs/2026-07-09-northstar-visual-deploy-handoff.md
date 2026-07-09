# 2026-07-09 — North Star Visual Push + Production Deploy Handoff

## What Happened

Session continued from Goethe implementation scorecard. User reported the product felt **spotty**: path tracing only “settled” when paused; realtime did not feel like a real path-trace of ocean light. Directed a **Playwright visual smoke push** aimed at the SOUL_DRIVER north star — Snell, TIR trap/escape, caustics, cube as validation geometry — not more Goethe surface area.

### Diagnosis (proven in browser captures)

1. **Invalid temporal blend** — STILL-style EMA blended frames while waves **and** cube still advanced → ghosted/spotty image. Pause felt better only because geometry stopped.
2. **Cameras looked the wrong way** — `updateCameraTargetFromAngles(0, pitch)` looks along **+Z**; cube sits at origin. Default views often showed **empty water**.
3. **Snell look-up FOV trap** — narrow FOV looking straight up stays entirely inside the critical cone → solid bright sky; need FOV/edges past ~48.6° to see dark TIR ring.

### Fixes landed (local working tree — not yet pushed)

| Area | Change |
|------|--------|
| LIVE mode | Scene dynamic or camera moving → every frame fresh path-trace, **no history** |
| STILL mode | `animateWaves` off freezes **simTime + cube spin**; progressive `spp/(n+spp)` accumulate |
| API | `freezeForCapture`, `unfreezeLive`, `getRenderMode`, `waitForSamples` |
| Playtest | `window.__oceanscape` for Playwright |
| Cameras | `lookAtCubeUnderwater()`, `lookAtCubeAbove()`; ocean/refraction/diver/etc. |
| Cube lighting | Reverse NEE caustic gather through waved surface (Snell/TIR → sun) |
| Smoke | `scripts/visual-smoke.mjs`, `npm run smoke` |
| Validation | `notes/GROK/validation/northstar/` PNGs + reports |
| UI copy | LIVE/STILL explained in panel + help text |

### Hero proof still

**`notes/GROK/validation/northstar/07-still-look-up-snell.png`**

Bright Snell escape cone + dark TIR surround + checkerboard cube below — the literal “why the ocean has light / light waits for the right angle” image.

### Gates

| Gate | Status |
|------|--------|
| `npm run build` | PASS |
| `npm run smoke` (local dev) | PASS (7 scenes) |
| Commit / push to main | **NOT DONE** (local mods) |
| Production Pages live with this build | **NOT DONE** |
| Snell one-click button | **NOT DONE** (framing known; design has boilerplate) |
| README LIVE/STILL update | **NOT DONE** |

---

## Artifacts produced this handoff package

| File | Role |
|------|------|
| `2026-07-09-northstar-production-plan.md` | Ordered ship plan P0–P3 |
| `2026-07-09-northstar-production-design.md` | Full design: REQs, stories, PR plan, boilerplate |
| `2026-07-09-northstar-visual-deploy-handoff.md` | **This** done-style handoff (start here next session) |
| `notes/GROK/validation/northstar/*` | Smoke PNGs + SMOKE_REPORT |

---

## Key Decisions

1. **North star > Goethe completeness for ship** — deploy honest physics first; book REQs are P3.
2. **LIVE default / STILL for clean stills** — industry-standard path-tracer UX; matches user “pause then it cleans up” intuition with correct freeze.
3. **Actions workflow is canonical deploy** (`.github/workflows/deploy.yml`); avoid fighting `gh-pages` branch unless Actions is broken.
4. **Caustic NEE is pedagogical approximation** — interface TIR/Snell remain exact stochastic dielectric; cube gather is 4-sample reverse estimate.
5. **cubeDepth stays −2.2** for now; SOUL_DRIVER still mentions −3 — document, don’t silently thrash.

---

## Hard Lessons

1. **Never accumulate across changing geometry.** Path tracers that temporal-blend animated waves will look “haunted.”
2. **If the cube isn’t in frame, the project has no validation.** Camera math bugs present as “physics broken.”
3. **Snell window needs FOV beyond the critical angle** or the user only ever sees the bright disk.
4. **Playwright + `__oceanscape` API** is the right harness: smoke the *visual contract*, not only `tsc`.

---

## Current Code State (honest)

**Uncommitted / untracked relative to origin/main:**

- `src/PathTracer.ts`, `pathTracer.frag.glsl`, `main.ts`, `ui.ts`, `index.html`
- `package.json` / lock (playwright, smoke scripts)
- `scripts/visual-smoke.mjs`
- `notes/GROK/validation/`, handoffs, DEV_NOTES
- Various skill dirs under `.grok/skills/` (meta; not required for deploy)

**Intact and still true:**

- Dielectric path (Fresnel/Snell/TIR) in fragment path tracer
- Goethe chapter shell + presets (scorecard still has PARTIAL/NOT DONE items)
- Vite base `/raytracing/`
- Actions deploy workflow on push to main

---

## Production Definition of Done (from design)

- [ ] PR-A merged (visual contract + smoke + hero validation)
- [ ] `https://pranavsai142.github.io/raytracing/` serves this build
- [ ] LIVE cube visible; no ghost trails while animating
- [ ] STILL freeze accumulates; Snell look-up shows cone + TIR dark
- [ ] `#chapter=` works on production
- [ ] README documents LIVE/STILL, smoke, north star, URL

---

## What the Next Session Must Start On

1. **`/init`** — read this handoff + production design  
2. **PR-A:** commit visual/smoke/validation (decide PNG bulk vs hero-only)  
3. **Push main** → confirm Actions Pages deploy  
4. **Live checklist** (design §6.6 / US-4)  
5. **PR-C polish if time:** Snell Window button, mode badge, freeze key (`F`/`Space`)  
6. **Only then** Goethe validation matrix / P2 geometry  
7. **`/done`** after deploy verified  

### Exact first commands

```bash
npm run build
npm run dev   # or preview after build
npm run smoke
# then commit PR-A contents, push, watch Actions
# open https://pranavsai142.github.io/raytracing/
```

---

## Open Questions (carry to next session)

- CI smoke with headless WebGL — now or later?  
- Git LFS / hero-only PNG policy?  
- cubeDepth −3 restore on ocean preset?  
- Landing title: Oceanscape-first vs Goethe-first?  
- Pure-path lighting toggle vs hybrid fill for shadow chapters?

---

## North Star Reminder (do not dilute)

> Literally reproduce every display of light from rays at the water surface.  
> Light traps underwater until the angle allows escape — that is how the ocean is lit.  
> The rotating textured cube is the validation geometry.  
> Simulation, not artistic ocean.

Success when the **deployed** demo shows trapping, selective escape, caustics, and interface behavior **without** the spotty-ghost failure mode.

---

*End of handoff. Design + plan saved alongside. Ship PR-A → production verify → polish. Goethe is the expansion layer, not the ship gate.*
