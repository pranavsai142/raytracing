# Plan — North Star Production Deploy + Polish

**Date:** 2026-07-09  
**Source:** Visual/playwright push + SOUL_DRIVER + Goethe shell landing  
**Goal:** Ship a deployed demo that honestly shows ocean light transport, with polish that serves the physics story — not decorative clutter.

---

## Situation

Visual/playtest push fixed the two blockers that made the product feel broken:

1. **LIVE vs STILL path-trace contract** — no more ghost-blend while waves/cube move.
2. **Camera framing** — cube is in frame; Snell window still (`07-still-look-up-snell.png`) proves TIR trap/escape.

Build is green. Smoke harness exists. Code is **local uncommitted** relative to origin. gh-pages / Actions deploy may still serve pre-fix or pre-Goethe builds.

North star success criterion (SOUL_DRIVER):

> Deployed interactive Three.js path tracer showing physically correct interface behavior on the cube — trapping, selective escape, caustics, god rays from dielectric + volume math.

---

## Plan slices (ordered)

### P0 — Ship the physics demo (production bar)

1. **Commit** visual/render fixes + smoke harness + validation PNGs (or LFS/ignore policy for large PNGs).
2. **Preflight:** `npm run build` + `npm run smoke` (or smoke against `preview`).
3. **Deploy:** push main → GitHub Actions Pages **or** `npm run deploy`; verify live URL.
4. **Live smoke:** open production URL, confirm LIVE cube, STILL Snell still, `#chapter=` deep links.
5. **README:** LIVE/STILL, north-star physics, smoke, deploy URL, controls.

### P1 — Product polish that serves north star

1. **First-run story:** default load = underwater cube + short stats/caption explaining LIVE → uncheck Animate for clean STILL.
2. **Snell demo button:** one-click framing matching hero still (deep look-up, FOV 90).
3. **Mode badge in UI:** LIVE / STILL ACCUM % always visible (not only in stats text).
4. **Export naming:** `oceanscape-<mode>-<chapter>-<samples>.png`.
5. **Keyboard:** freeze/unfreeze (e.g. `Space` or `F`), keep chapter 1–8.
6. **Mobile:** HalfFloat already; clamp renderScale floor; hide densest panels behind “Advanced”.

### P2 — Physics polish (still simulation-honest)

1. Stronger caustic NEE (more samples, better surface PDF).
2. Optional pure-path cube lighting toggle (disable hybrid fill for science mode).
3. Snell-window preset as first-class chapter/water button.
4. Restore or document cubeDepth default (−2.2 vs SOUL_DRIVER −3).

### P3 — Goethe completeness (secondary to interface physics)

1. Validation PNGs for REQ matrix (only after production physics is live).
2. WTR-06 vase / WTR-07 water-prism.
3. GTC-07 real afterimage buffer.
4. Physiological UI labels.

### Explicit non-goals for this deploy train

- Artistic ocean post (foam, skyboxes, water “color looks pretty”).
- WebGPU rewrite.
- Perfect unbiased MIS estimator (nice later, not ship gate).

---

## Definition of done (production)

- [ ] `main` contains visual fixes + smoke script
- [ ] `https://pranavsai142.github.io/raytracing/` loads without console errors
- [ ] LIVE: cube + waves visible, no ghost trails
- [ ] STILL freeze: samples climb; Snell look-up shows bright cone + dark TIR
- [ ] `#chapter=refraction` and `#chapter=ocean` restore
- [ ] README documents LIVE/STILL + deploy + smoke
- [ ] Smoke report regenerable from CI or local

---

## Risks

| Risk | Mitigation |
|------|------------|
| Large PNGs bloat repo | Commit 07 hero + report; gitignore bulk or compress |
| Actions Pages vs gh-pages conflict | Prefer Actions workflow already in repo; avoid dual deploys |
| Mobile Safari half-float | Already HalfFloat path; smoke on desktop first |
| Goethe title confuses physics mission | Dual subtitle: “Light physics · Goethe book mode” |

---

*This plan is the input to the design doc and the production handoff.*
