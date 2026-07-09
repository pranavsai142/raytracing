# Design — North Star Production Deploy + Polish

**Date:** 2026-07-09  
**Plan:** `2026-07-09-northstar-production-plan.md`  
**North star:** Deployed interactive path tracer of air–water light transport; cube validates Snell / TIR / caustics / trap–escape.

---

## 1. Overview / Background & Motivation

Oceanscape Web is a **simulation** of light at the dielectric water interface, not a stylized ocean shader. After the Goethe book shell landed, the product felt “spotty”: accumulation fought animated geometry, and cameras often missed the cube. The 2026-07-09 visual push restored honesty:

- **LIVE** path-trace (no invalid history blend)
- **STILL** progressive accumulate (freeze waves + cube)
- Cameras look at the cube
- Interface-aware caustic gather on the cube
- Playwright smoke + hero Snell still

What remains is to **put that truth on production**, polish the first-run story so a visitor *sees* the physics without reading a thesis, and only then continue Goethe completeness.

---

## 2. Goals & Non-Goals

### Goals

1. **Deploy** current physics-correct build to GitHub Pages (`/raytracing/`).
2. **Gate** ship on build + north-star visual smoke (local and ideally post-deploy).
3. **Polish** UX so LIVE/STILL and Snell trap/escape are self-explanatory.
4. **Document** for humans and next agents (README + this design + handoff).
5. Keep **cube sacred** and phenomena **emergent from math**.

### Non-Goals

- Faked water pigment / pretty sky replacements.
- Completing all Goethe REQ IDs before ship.
- WebGPU, denoiser ML, full unbiased MIS.
- Perfect mobile parity on day one.

---

## 3. Technical Requirements

### Functional

| ID | Requirement | Priority |
|----|-------------|----------|
| NS-01 | Dielectric path: Fresnel, Snell, TIR, critical angle | P0 (exists) |
| NS-02 | LIVE: every frame independent path-trace when scene dynamic | P0 (exists) |
| NS-03 | STILL: freeze waves+cube; progressive 1/N to maxAccumSamples | P0 (exists) |
| NS-04 | Default underwater + above cameras frame submerged cube | P0 (exists) |
| NS-05 | Hero Snell framing available (button or API) | P1 |
| NS-06 | `window.__oceanscape` playtest API stable for smoke | P0 (exists) |
| NS-07 | `npm run smoke` regenerates northstar validation report | P0 (exists) |
| NS-08 | Production URL serves latest `dist` with base `/raytracing/` | P0 |
| NS-09 | Hash `#chapter=<id>` restores chapter on load | P0 (exists) |
| NS-10 | Export PNG includes mode + chapter in filename | P1 |
| NS-11 | Visible LIVE / STILL accum indicator in UI | P1 |
| NS-12 | README: physics north star, LIVE/STILL, smoke, deploy | P0 |
| NS-13 | Cube lighting documents caustic NEE as approximation | P1 (docs) |
| NS-14 | Console free of hard errors on cold load (desktop Chrome) | P0 |

### Non-functional

| ID | Requirement |
|----|-------------|
| NF-01 | `npm run build` = tsc + vite, 0 errors |
| NF-02 | STILL 64 samples on M-class GPU in < ~20s at renderScale ≥ 0.75 |
| NF-03 | HalfFloat accum fallback already; no UnsignedByte regression on desktop |
| NF-04 | Validation PNGs either compressed / selective commit or gitignored + regenerate |
| NF-05 | Single deploy path: prefer Actions on push to main |

---

## 4. User Stories

### US-1 — First visitor sees trapped ocean light

**As a** first-time visitor  
**I want** the default view to show the submerged cube and water interface  
**So that** I immediately understand this is light physics, not a stock water shader.

**Acceptance**

- [ ] Cold load underwater: checkerboard cube in frame within 1s
- [ ] Stats or badge says LIVE path-trace
- [ ] Caption or help mentions: uncheck Animate for clean still / caustics

### US-2 — Researcher freezes and exports a clean still

**As a** user validating Snell/TIR  
**I want** one control to freeze the scene and accumulate  
**So that** noise clears without ghosting.

**Acceptance**

- [ ] Uncheck Animate → mode STILL, samples increase
- [ ] Waves and cube rotation stop
- [ ] Export PNG captures current still
- [ ] Optional: `F` or `Space` toggles freeze

### US-3 — Demo Snell’s window in one click

**As a** presenter  
**I want** a “Snell window” action  
**So that** I can show the bright escape cone and dark TIR without hunting camera angles.

**Acceptance**

- [ ] Button sets FOV≈90, camera deep underwater looking up (hero framing)
- [ ] Freezes for STILL (or offers freeze)
- [ ] Matches spirit of `07-still-look-up-snell.png`

### US-4 — Deployed link always works

**As a** collaborator with only a URL  
**I want** `https://pranavsai142.github.io/raytracing/` to load the current build  
**So that** I don’t need local Node.

**Acceptance**

- [ ] After merge to main, Actions deploys `dist`
- [ ] Assets resolve under `/raytracing/`
- [ ] WebGL init succeeds on desktop Chrome/Safari
- [ ] `#chapter=ocean` works on production

### US-5 — Agent / CI can smoke visuals

**As an** automated agent  
**I want** `npm run smoke` against dev or preview  
**So that** we don’t ship empty-water regressions.

**Acceptance**

- [ ] Smoke pass requires LIVE + STILL scenes OK
- [ ] Writes report under `notes/GROK/validation/northstar/`
- [ ] Documented BASE_URL for preview vs dev

---

## 5. Technical Guidelines (Invariants)

1. **Physics over paint** — no bulk blue as “water color”; `scatterTint` default neutral/white for Goethe colourless demos.
2. **Cube sacred** — submerged, textured, rotatable; chapters may reframe camera but not remove cube’s role.
3. **Never blend dynamic samples** — if `animateWaves` or camera motion or autoOrbit, LIVE only.
4. **STILL freezes all dielectric time** — `simTime` and `cubeRot*` both stop.
5. **Base path** `/raytracing/` for Pages.
6. **Playtest API** stays on `window.__oceanscape` for smoke; don’t break without updating smoke script.
7. **Two-layer Goethe honesty** — physiological effects labeled post only.
8. **Prefer path-traced energy** — hybrid dual-light / caustic NEE must not replace TIR correctness on the interface itself.

---

## 6. Proposed Design

### 6.1 Deploy architecture

```
main push
  → Actions: npm ci → npm run build → upload dist → deploy-pages
  → https://pranavsai142.github.io/raytracing/

Local emergency:
  npm run deploy  (gh-pages -d dist)  — avoid dual-write if Actions is source of truth
```

**Recommendation:** Treat **GitHub Actions** as canonical. Document `npm run deploy` as fallback only. Ensure repo Settings → Pages → Source = GitHub Actions.

### 6.2 LIVE / STILL (current — preserve)

```
render():
  sceneDynamic = animateWaves && (cubeSpin || waves || autoOrbit)
  live = camMoving || sceneDynamic || !cameraSettled
  if live:
    resetAccum each sample path  // cameraInteracting=1
  else:
    progressive mix weight = spp / (n + spp)
```

### 6.3 Snell demo (P1)

Add `PathTracer.lookAtSnellWindow()`:

```ts
lookAtSnellWindow(): void {
  this.params.underwaterView = true;
  this.params.fov = 90;
  this.params.waveAmplitude = Math.min(this.params.waveAmplitude, 0.06);
  this.cameraPos.set(0, -3.5, 3.5);
  this.cameraTarget.set(0, 0.8, 0);
  this.freezeForCapture(); // or leave LIVE optional
}
```

Wire button `#view-snell` + water phenomenon button.

### 6.4 Mode badge (P1)

In `ui.ts` refreshStats:

```ts
const mode = tracer.getRenderMode();
badgeMode.textContent = mode === 'live'
  ? 'LIVE path-trace'
  : `STILL ${tracer.getAccumSampleCount()}/${tracer.params.maxAccumSamples}`;
badgeMode.className = mode === 'live' ? 'mode-live' : 'mode-still';
```

### 6.5 Validation assets policy

| Keep in git | Regenerate / optional |
|-------------|----------------------|
| `07-still-look-up-snell.png` (hero) | Full 01–06 set if large |
| `SMOKE_REPORT.md` | Re-run smoke each ship |
| `README.md` in validation folder | |

If PNGs > ~2MB each × 7: prefer `git lfs` or ship only hero + report; CI regenerates rest as artifacts.

### 6.6 Production verify checklist (human or agent)

1. Cold load production URL  
2. LIVE cube visible, drag mouse — no ghost trails  
3. Uncheck Animate — STILL samples climb  
4. Click Snell (or set look-up) — bright cone + dark ring  
5. Chapter V Refraction — cube + surface  
6. Export PNG works  
7. Console clean  

---

## 7. Boilerplate / Placeholder Code

### Snell button (index.html)

```html
<button id="view-snell" class="tip"
  data-tip="Deep underwater look-up: Snell escape cone + TIR dark surround — how light is trapped in the ocean.">
  Snell Window
</button>
```

### PathTracer method (add near lookAtCube*)

```ts
/** Hero north-star framing: Snell's window + TIR trap. */
lookAtSnellWindow(freeze = true): void {
  this.params.underwaterView = true;
  this.params.fov = 90;
  this.params.autoOrbit = false;
  this.cameraPos.set(0, -3.5, 3.5);
  this.cameraTarget.set(0, 0.8, 0);
  if (freeze) this.freezeForCapture();
  else this.markSceneChanged();
}
```

### Smoke against preview

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173 &
BASE_URL=http://127.0.0.1:4173/raytracing/ SAMPLES=48 npm run smoke
```

### Optional CI smoke job (future)

```yaml
# after build, not blocking Pages if flaky headless WebGL:
# - run: npx playwright install chromium
# - run: npm run preview & npx wait-on http://127.0.0.1:4173/raytracing/
# - run: BASE_URL=... npm run smoke
```

Headless WebGL may be limited on Actions; keep smoke **local gate** until proven in CI.

---

## 8. Alternatives Considered

| Option | Why not (now) |
|--------|----------------|
| Always accumulate with EMA while animating | Causes the spotty bug |
| Default STILL on load | Feels frozen; LIVE shows “realtime path-trace” intent |
| Dual gh-pages + Actions deploys | Race / stale site |
| Commit all 7×2MB PNGs forever | Repo bloat; prefer hero + regenerate |
| Delay ship until all Goethe REQs done | Violates north star: **physics demo first** |

---

## 9. Key Decisions

1. **Ship physics fix before more Goethe features** — north star is interface light, not book completeness.  
2. **Actions is canonical deploy** — `npm run deploy` fallback only.  
3. **LIVE default, STILL for beauty/science stills** — matches path-tracer industry UX.  
4. **Hero Snell still is the marketing/proof image** — `07-still-look-up-snell.png`.  
5. **cubeDepth −2.2 remains** until ocean preset explicitly restores −3; document divergence from old SOUL_DRIVER literal.  
6. **Caustic NEE is documented approximation** — interface TIR/Snell remain the hard truth; cube gather is pedagogical.

---

## 10. PR Plan

### PR-A — Visual path-trace contract + smoke (ship core)

**Depends on:** nothing  
**Files:**  
`src/PathTracer.ts`, `src/shaders/pathTracer.frag.glsl`, `src/main.ts`, `src/ui.ts`, `index.html`, `package.json`, `package-lock.json`, `scripts/visual-smoke.mjs`, `notes/GROK/validation/northstar/*`, `notes/GROK/DEV_NOTES.md`, handoffs  

**Do:**  
- Commit LIVE/STILL, camera framing, caustic gather, smoke, hero PNGs, handoffs  
- Update README LIVE/STILL + smoke + URL  

**Verify:** `npm run build` && `npm run smoke`  

### PR-B — Production deploy verify

**Depends on:** PR-A merged to main  

**Do:**  
- Confirm Actions green  
- Manual/live checklist US-4  
- If Actions not configured in repo settings, enable Pages → Actions  
- Optional: one `workflow_dispatch` redeploy  

**Verify:** production URL checklist  

### PR-C — North-star polish (Snell button, mode badge, freeze key)

**Depends on:** PR-A  

**Files:** `PathTracer.ts`, `ui.ts`, `index.html`, `style.css`, `main.ts`  

**Do:** US-2/US-3 polish  
**Verify:** smoke + manual Snell button  

### PR-D — README / meta dual-title polish

**Depends on:** PR-A  

**Do:** Subtitle “Light physics at the water surface · Goethe visual book”; document playtest API  

### PR-E — Goethe completeness (post-ship)

**Depends on:** production bar met  

**Do:** validation matrix, vase/prism, afterimage buffer — per older Goethe handoff scorecard  

---

## 11. Open Questions

1. Enable smoke in CI, or keep local-only until headless WebGL is reliable?  
2. Git LFS for validation PNGs?  
3. Restore cubeDepth −3 on `ocean` only?  
4. Dual title: Oceanscape-first vs Goethe-first on deployed landing?  
5. Is hybrid fill light on Goethe shadow chapters still acceptable after pure-path toggle exists?

---

## 12. References

- `notes/GROK/SOUL_DRIVER.md`  
- `notes/GROK/DEV_NOTES.md`  
- `notes/GROK/validation/northstar/SMOKE_REPORT.md`  
- `notes/GROK/handoffs/2026-06-16-goethe-implementation-handoff.md` (REQ scorecard)  
- `notes/GROK/handoffs/2026-06-16-oceanscape-web-threejs-deploy-handoff.md` (first deploy)  
- `.github/workflows/deploy.yml`  
- Live target: https://pranavsai142.github.io/raytracing/

---

*Design ready for sequential-implement / execute-plan style work. Ship PR-A → PR-B first.*
