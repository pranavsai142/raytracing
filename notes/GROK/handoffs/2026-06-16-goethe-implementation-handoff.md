# 2026-06-16 — Goethe Visual Book: Sequential Implementation Handoff

## What Happened

Continued from `2026-06-16-goethe-requirements-handoff.md`. Ran `/sequential-implement until completed` on the Goethe REQ chain. **First code landing** for the interactive visual book on top of the Oceanscape Web path tracer.

**Gate passed:** `npm run build` → SUCCESS (tsc + vite, 0 errors). **Not yet:** visual validation PNGs, redeploy to gh-pages, browser smoke test logged in handoff.

### Files created / modified (this session)

| File | Change |
|------|--------|
| `src/chapters.ts` | **NEW** — `ChapterId`, badge types, `CHAPTERS[]`, `WATER_PRESETS[]`, `chapterById()` |
| `src/PathTracer.ts` | Extended `SimParams` with Goethe fields; `applyChapterPreset()`, `applyTimeOfDay()`, hash restore `#chapter=`, `onChapterChanged` callback |
| `src/shaders/pathTracer.frag.glsl` | New uniforms; rod/grey-plane geometry; `floorAlbedo()` split floor; dual-light at hits; `volumeAttenuation()` (neutral/beer/goethe); `scatterTint` god-rays; atmosphere in `envLight()`; secondary floor reflect; display post (contrast, complement, bloom, fixation) |
| `src/ui.ts` | Goethe chapter buttons, water sliders, keyboard 1–8, badge/caption sync, preset slider resync |
| `index.html` | Goethe Chapters panel, Water Phenomena buttons, water physics sliders, badge + caption, title/subtitle |
| `src/style.css` | Chapter grid, badge colours (PHYSICAL / MIXED / PHYSIOLOGICAL), select styling |

**Unchanged contract docs (still authoritative):**
- `notes/GROK/REQ-goethe-theory-of-colours.md`
- `notes/GROK/REQ-goethe-water.md`
- `THEORY_OF_COLOURS.md`, `notes/GROK/goethe-*-synopsis.md`

---

## Oceanscape Baseline — What Still Exists vs What Shifted

The **core Oceanscape physics port is intact**: Fresnel/Snell/TIR, spectral dispersion, animated wave surface, submerged rotating checkerboard cube, temporal accumulation, above/below views, WASD + mouse camera.

### Oceanscape params that drifted from original deploy handoff (document for cube-invariant audits)

| Item | Original deploy handoff | Current code default | Notes |
|------|-------------------------|----------------------|-------|
| `cubeDepth` | y = **-3** (SOUL_DRIVER invariant) | **-2.2** | Cube still submerged; depth slider range -4..-1. Sacred *role* preserved; literal -3 default changed pre/post Goethe. **Consider restoring -3 as ocean default.** |
| `cubeRotSpeedY/X` | 0.01 / 0.005 style | 0.004 / 0.002 | Slower spin for accumulation stability |
| Accumulation | Batch-per-frame (no history) | **Ping-pong `accumTexture`** + `temporalBlend` + camera-settle reset | Major renderer upgrade between sessions; not Goethe-specific |
| God-ray colour | Hard-coded `vec3(0.12,0.28,0.48)` | **`scatterTint`** default white | WTR-01; old blue available by setting scatter B > R |
| Title | "Light Physics Simulation" | "Goethe Theory of Colours" | Subtitle: "Goethe saw them — interactive visual book" |

### Oceanscape features NOT regressed (verify on `ocean` preset)

- [ ] Snell window below water
- [ ] TIR trapping with wave topology escape
- [ ] Chromatic caustics via `dispersion`
- [ ] Cube lit only via transmitted paths (plus new optional dual-light overlay on direct hits — see gaps)
- [ ] Export PNG
- [ ] GitHub Pages deploy path `/raytracing/` (unchanged in vite config)

---

## REQ Status — Goethe Theory of Colours (GTC)

Legend: **DONE** = implemented with known limits · **PARTIAL** = stub or missing acceptance criteria · **NOT DONE** = no code

### GTC-00 — Book Navigation Shell

| Acceptance | Status |
|------------|--------|
| Click chapter → preset within 1 frame; accum resets | **DONE** (`markSceneChanged`) |
| Badge matches chapter class | **DONE** (`#chapter-badge`) |
| `#chapter=shadows` restores on load | **DONE** (constructor hash read) |
| `npm run build` passes | **DONE** |
| Per-chapter tooltip quote + § | **PARTIAL** — `title` on some buttons; caption updates on load; not full tooltip on every button |
| Keyboard 1–8 → chapters I–VIII | **DONE** — **conflict:** removed old `1`/`2` above/below view keys per REQ; views are UI-only now |

### GTC-00b — Scene Mode Uniform

| Acceptance | Status |
|------------|--------|
| `sceneMode` uniform, no recompile | **DONE** |
| Chapter III: rod + white floor | **DONE** (`sceneMode >= 3`) |
| Chapter IV: yellow/white floor split | **DONE** (`sceneMode == 4`) |
| `SceneDesc` struct (showOccluderRod, showGlassPanel, etc.) | **NOT DONE** — mode is implicit int, not named flags |
| Default ocean unchanged at `sceneMode == 0` | **DONE** |

### GTC-01 — Primordial (§175)

| Acceptance | Status |
|------------|--------|
| `atmosphereDensity`, `mediumThickness`, `mediumTint` | **DONE** (mediumTint in shader; **no UI slider**) |
| Above-water shell attenuation in `envLight` | **PARTIAL** — thickness/atmosphere in sky path; not full separate above-water shell `T = exp(-β·(1−dir.y))` as spec literal |
| Preset `primordial` | **DONE** |
| Thickness 0 → white sun at high elev | **NOT VERIFIED** (no PNG) |
| Badge PHYSICAL | **DONE** |

### GTC-02 — Atmosphere (§153–160)

| Acceptance | Status |
|------------|--------|
| Rayleigh-style sky in `envLight` | **DONE** (simplified `λ⁻⁴` term) |
| Preset `atmosphere` + auto-orbit + sun animation | **DONE** |
| `sceneMode=2` flame card + blue base fringe | **PARTIAL** — `flameEdgeBoost` adds env hint; **no black/white floor cards**, no actual flame point mesh |
| Badge PHYSICAL | **DONE** |

### GTC-03 — Coloured Shadows (§64–76, §78)

| Acceptance | Status |
|------------|--------|
| `fillDir`, `fillIntensity`, `fillTint` | **DONE** — **fillDir no UI** (hardcoded default) |
| Rod occluder + white floor | **DONE** |
| Dual shadows on floor | **PARTIAL** — analytic rod shadow test; not full path-traced shadow rays |
| Preset `shadows` | **DONE** |
| Preset `shadows-underwater` | **DONE** (extra button) |
| Underwater red lit / cooler shadow | **PARTIAL** — beer absorption + complement post; cube also gets direct dual-light multiply (changes pure path-traced cube look) |
| Badge MIXED | **DONE** |

### GTC-04 — Complementary Contrast (§56–58)

| Acceptance | Status |
|------------|--------|
| Yellow/white split floor | **DONE** |
| `physiologicalContrast` post (16px box opponent) | **DONE** (5×5 tap, display pass) |
| Grey card mesh | **NOT DONE** |
| Purple tint on white near yellow after 128+ samples | **NOT VERIFIED** |
| Badge MIXED | **DONE** |

### GTC-05 — Refraction (§184–227)

| Acceptance | Status |
|------------|--------|
| Preset `refraction` (camera, dispersion, waves) | **DONE** |
| `dispersion=0` vs `>0` fringe comparison | **NOT DONE** — no side-by-side export button |
| Boundary emphasis toggle (wave min 0.04) | **NOT DONE** |
| Badge PHYSICAL | **DONE** |
| Core refraction physics | **DONE** (pre-existing) |

### GTC-06 — Double Reflection (§222–225, §80)

| Acceptance | Status |
|------------|--------|
| Preset `double-reflect` calm water | **DONE** |
| `secondaryReflectWeight` floor bounce on reflect | **PARTIAL** — single extra floor colour add, not traced secondary ray |
| Optional green glass panel | **NOT DONE** |
| Second reflection visibly separable | **NOT VERIFIED** |
| Badge PHYSICAL | **DONE** |

### GTC-07 — Physiological After-Image (§25–33)

| Acceptance | Status |
|------------|--------|
| `afterimageBuffer` RT | **NOT DONE** |
| Fixation hold → opponent on grey | **PARTIAL** — `fixationStrength` tints centre of display; grey plane at y=1.5 (`sceneMode==7`) |
| Decay 30–60s tunable | **PARTIAL** — `fixationHold`/`afterimageDecay` in TS; no persistent opponent buffer |
| Toggle off → zero effect | **DONE** (leaving afterimage preset) |
| Badge PHYSIOLOGICAL | **DONE** |

### GTC-08 — Twilight (§81–87)

| Acceptance | Status |
|------------|--------|
| Moon disk in `envLight` | **DONE** |
| Candle | **PARTIAL** — `candleIntensity` uniform exists; **no point-light falloff in shader** |
| Preset `twilight` | **DONE** |
| `purkinjeStrength` | **NOT DONE** |
| Badge MIXED | **DONE** |

---

## REQ Status — Goethe Water (WTR)

### WTR-01 — Colourless Medium Core (P0)

| Acceptance | Status |
|------------|--------|
| `absorptionModel` neutral/beer/goethe | **DONE** |
| `turbidity` slider + label | **DONE** |
| `scatterTint` replaces hard-coded blue | **DONE** |
| `godRayMode` preset toggle neutral vs goethe-blue | **NOT DONE** — use scatter RGB manually |
| UI tooltip Beer vs Goethe tension | **PARTIAL** — select `data-tip` only |
| turbidity=0, scatterTint=1,1,1 → no bulk blue | **NOT VERIFIED** (no PNG) |

### WTR-02 — `goethe-colourless-water` (P0)

| Acceptance | Status |
|------------|--------|
| Preset values per REQ table | **DONE** (minor: `maxBounces` not forced to REQ) |
| UI button | **DONE** |
| In-app procedure hint text | **NOT DONE** |
| Side-by-side above/below export | **NOT DONE** |

### WTR-03 — Agitated Sea (P1)

| Acceptance | Status |
|------------|--------|
| Preset `wave-contrast` | **DONE** |
| Physical crests vs troughs | **DONE** (waves) |
| Complement on troughs | **PARTIAL** — global luminance mask, not geometric trough mask |

### WTR-04 — Vessel Elevation (P0)

| Acceptance | Status |
|------------|--------|
| Preset `vessel-elevation` | **DONE** |
| Caption about subjective elevation | **NOT DONE** (no overlay hint) |

### WTR-05 — Diver View (P0)

| Acceptance | Status |
|------------|--------|
| Preset `diver-view` | **DONE** |
| beer + turbidity + complement | **DONE** |
| Toggle complement for honest comparison | **DONE** (slider) |
| Red lit + green shadows | **NOT VERIFIED** (no PNG) |

### WTR-06 — Vase Mirror (P2)

| Acceptance | Status |
|------------|--------|
| UI button `vase-scene` | **NOT DONE** |
| Cylinder + mirror bottom geometry | **NOT DONE** |
| Double bar reflections colourless / tinted | **NOT DONE** |

### WTR-07 — Water-Prism (P2)

| Acceptance | Status |
|------------|--------|
| UI button `water-prism` | **NOT DONE** |
| Wedge prism intersection | **NOT DONE** |
| White centre / coloured edges | **NOT DONE** |

### WTR-08 — Twilight Ocean (P1)

| Acceptance | Status |
|------------|--------|
| Preset `twilight-ocean` | **DONE** |
| `timeOfDay` slider + phase table | **PARTIAL** — `applyTimeOfDay()` in TS drives sun/moon; not full §75 grey phase fidelity |
| Sea-green shadow phase needs complement | **PARTIAL** |

### WTR-09 — Sun Glitter (P1)

| Acceptance | Status |
|------------|--------|
| Preset `sun-glitter` | **DONE** |
| Physical glitter (Fresnel) | **DONE** (pre-existing) |
| Bloom halo post | **DONE** (`bloomStrength`) |
| Physiological label in UI | **NOT DONE** |

### WTR-10 — Tinted Volume (P2)

| Acceptance | Status |
|------------|--------|
| `volumeTint` in shader | **DONE** |
| UI RGB sliders | **DONE** |
| Label "Chemical tint (§163)" | **PARTIAL** — tooltip only |

### WTR-11 — Oil Pellicle (P3)

**NOT DONE** — deferred per REQ.

---

## Verification Matrix — Nothing Captured Yet

REQ specifies PNGs under `notes/GROK/validation/goethe/` and `.../water/`. **Directory does not exist; zero validation screenshots.**

| Chapter / REQ | § | Recipe | Status |
|---------------|---|--------|--------|
| Primordial | 175 | Above, sun 0.12, thickness 0/0.6 | **TODO** |
| Atmosphere | 155 | Orbit, sun 0.05 | **TODO** |
| Shadows | 76, 78 | Rod floor + underwater | **TODO** |
| Contrast | 56 | Yellow/white, phys ON | **TODO** |
| Refraction | 227 | Glancing below, disp 0.02 | **TODO** |
| Double | 224 | Calm surface | **TODO** |
| Afterimage | 50 | Fixation 5s | **TODO** |
| Twilight | 85 | Moon+candle | **TODO** |
| WTR-02 | 161 | Bulk neutral σ→0 | **TODO** |
| WTR-05 | 78, 164 | Red + green shadows | **TODO** |

---

## Architectural Gaps (Cross-Cutting)

1. **Dual-light on cube/floor** — REQ implied fill as environment term; implementation adds direct Lambert sun/fill on cube and floor hits **in addition to** path-traced transport. This is a **hybrid** that may violate "cube lit only via transmitted paths" for shadow chapters. Next session should either move dual-light into `envLight` sampling or document as intentional demo shortcut.

2. **Physiological vs physical labelling** — Badge shows MIXED/PHYSIOLOGICAL but complement/bloom/contrast posts are **not** separately labeled in UI (REQ: "labeled post-process").

3. **`godRayMode`** — REQ WTR-01 asked explicit `neutral | goethe-blue` preset; only scatter RGB sliders exist. Add one-click "restore legacy blue god-rays" button.

4. **Missing UI controls** — No sliders for: `fillDir`, `fillTint` RGB, `mediumTint`, `opponentStrength`, `secondaryReflectWeight`, `moon` position, `fixationMode` toggle, `maxAccumSamples`.

5. **Missing water panel buttons** — REQ §4 table lists **Vase Experiment** and **Water Prism**; not in `index.html`.

6. **GTC-00b SceneDesc** — Named boolean uniforms for geometry flags not implemented; chapters use numeric `sceneMode` only.

7. **Candle point light** — `candleIntensity` uniform unused in `pathTracer.frag.glsl`.

8. **Export** — Filename now `goethe-<chapter>-<ts>.png`; no dual-PNG refraction export (GTC-05).

9. **Deploy** — Goethe code is **local uncommitted**; gh-pages may still serve pre-Goethe build.

10. **Mobile Safari** — Float/HalfFloat accum for new post passes still an open question from prior handoff.

---

## Key Decisions (This Session)

1. **Sequential implement in one orchestrator pass** — No per-slice subagent STATUS blocks; build gate only.
2. **`sceneMode` as int ladder** — 0=ocean, 1=primordial env, 2=atmosphere flame hint, 3=rod+floor, 4=split floor, 5=double reflect, 7=grey plane + afterimage.
3. **Display-pass physiology** — Contrast, complement, bloom, fixation implemented in `displayOnly` branch of fragment shader, not separate TS composite (except fixation timing in PathTracer).
4. **Keyboard** — REQ 1–8 for chapters; sacrificed 1/2 view shortcuts.
5. **Cube depth -2.2** — Matches refraction preset; conflicts with SOUL_DRIVER literal y=-3 text.

---

## What the Next Session Must Start On

1. Run `/init`
2. Read **this handoff** + REQ docs
3. **Priority A — Validation:** `npm run dev`, capture PNG matrix into `notes/GROK/validation/goethe/` per REQ §5; mark acceptance checkboxes in REQ files or a `VALIDATION.md`
4. **Priority B — P2 geometry:** WTR-06 vase + WTR-07 prism (shader analytic intersections + UI buttons)
5. **Priority C — GTC-07 proper:** `afterimageBuffer` ping-pong + decay composite
6. **Priority D — Honesty fixes:** Label physiological toggles; resolve cube dual-light vs path-trace purity; add `godRayMode` button
7. **Priority E — Deploy:** `npm run build && npm run deploy`, verify https://pranavsai142.github.io/raytracing/#chapter=goethe-colourless-water
8. Consider restoring **cubeDepth default -3** on `ocean` preset only
9. Run `/done` after validation + deploy

---

## Open Questions

- Restore cube y=-3 as default or update SOUL_DRIVER to "submerged below surface (~-2 to -3)"?
- Vase/prism: analytic shader only vs mini scene graph in TS?
- Is hybrid dual-light on cube acceptable for pedagogy or must shadows be path-traced only?
- HalfFloat afterimage buffer on iOS Safari?
- Subtitle: keep Goethe-forward or dual "Oceanscape · Goethe"?

---

*End of handoff. Goethe book shell + P0/P1 mostly landed; P2 geometry, validation PNGs, physiological labeling, and deploy are the job ahead. REQ docs remain the contract — this handoff is the honest scorecard.*