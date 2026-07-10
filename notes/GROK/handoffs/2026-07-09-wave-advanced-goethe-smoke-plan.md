# Plan: Advanced Wave Controls + Goethe Chapter Smoke

**Branch:** `feat/wave-advanced-goethe-smoke`  
**Method:** subagent-driven-development (implement → spec review → quality review per task)

---

## Task 1 — Wave Advanced (component model + presets)

### Goal
Give the user robust control over the water surface without typing equations: presets (single sine, standing wave, multi-octave ocean) plus an editable list of wave components whose sum defines height (and normals via derivatives).

### Current baseline
`waveHeight` in `pathTracer.frag.glsl` hard-codes a 4-octave directional sum of sines controlled only by `waveAmplitude`, `waveFrequency`, `waveSpeed`. UI already exposes those three + time scale + animate.

### Spec

1. **Wave model modes / presets** (UI-selectable, physics-honest tips):
   | Preset | Behavior |
   |--------|----------|
   | `multi-octave` (default / “Ocean”) | Preserve **current** 4-octave behavior exactly (or rebuild it as 4 components so one code path) |
   | `single-sine` | Exactly **one** traveling sine, one direction |
   | `standing` | Standing wave: \(A\sin(\mathbf{k}\cdot\mathbf{p}+\phi)\cos(\omega t)\) (or equivalent counter-propagating pair) |
   | `custom` | User-edited component list |

2. **Wave component** (max **4** components — enough, GPU-friendly):
   - `amplitude` (float)
   - `frequency` (spatial k scale)
   - `speed` (temporal ω scale)
   - `directionDeg` (propagation angle in XZ plane, degrees)
   - `phase` (radians or 0–2π slider)
   - `standing` (bool): if true, use standing form; if false, traveling \(\sin(\mathbf{k}\cdot\mathbf{p}-\omega t+\phi)\)

3. **Height contract:**
   \[
   h(\mathbf{p},t)=\sum_i \begin{cases}
   A_i\sin(\mathbf{k}_i\cdot\mathbf{p}+\phi_i)\cos(\omega_i t) & \text{standing}_i \\
   A_i\sin(\mathbf{k}_i\cdot\mathbf{p}-\omega_i t+\phi_i) & \text{else}
   \end{cases}
   \]
   with \(\mathbf{k}_i = f_i\cdot(\cos\theta_i,\sin\theta_i)\), \(\omega_i = s_i\).

4. **Normals:** Analytic derivative of the same sum (extend `waveDeriv`). Intersection loop still uses `waveHeight`.

5. **SimParams / PathTracer:**
   - Keep `waveAmplitude`, `waveFrequency`, `waveSpeed` as **legacy macro knobs** that, when changed in multi-octave or as “global scale”, still work sensibly (e.g. scale all component amps, or rewrite multi-octave components from macros — pick one and document in tip).
   - Preferred: multi-octave preset rebuilds 4 components from the three macros (same ratios as today: amp×0.52, freq×1.85, spd×1.05, angles `i*1.3+0.7` with dir `normalize(cos(ang), sin(ang*0.6))` for **bit-exact legacy** if possible).
   - New: `wavePreset: 'multi-octave' | 'single-sine' | 'standing' | 'custom'`, `waveComponents: WaveComponent[]` (length ≤ 4), optional `waveComponentCount`.

6. **Uniforms:** Pack components into arrays (e.g. two `vec4 waveCompA[4]`, `waveCompB[4]` + `int waveCount`) so the fragment shader has one path.

7. **UI** (`index.html`, `ui.ts`, `style.css`):
   - Collapsible **“Wave Advanced”** section under Wave Topology.
   - Preset `<select>`: Ocean multi-octave / Single sine / Standing wave / Custom.
   - Component editor: select component index 0..N-1, sliders for amp/freq/speed/dir/phase, checkbox standing; “Add component” / “Remove” (clamp 1–4).
   - Switching to a preset overwrites components; editing any component field switches preset to `custom` (or keep preset label but mark dirty — prefer switch to custom).
   - Full `data-tip` tooltips (physics-honest).
   - Wire into existing `applyParamsToUI` / chapter resync if present.
   - Do **not** break LIVE/STILL animate freeze or `__oceanscape` API.

8. **Tests / verify:**
   - `npm run build` passes.
   - Optional: tiny unit-less sanity — single component amp=0 → flat (or document visual check).
   - Do not push remote.

9. **Commit** on current branch with a clear message when done.

### Files
- `src/shaders/pathTracer.frag.glsl`
- `src/PathTracer.ts`
- `src/ui.ts`
- `index.html`
- `src/style.css` (if needed)

### Out of scope
- Gerstner horizontal displacement, FFT ocean, >4 components
- Changing dielectric / path-trace core beyond wave height/normal

---

## Task 2 — Goethe chapter Playwright smoke + text alignment report

### Goal
Full Playwright smoke across **all** Goethe chapters (I–VIII + water phenomena + ocean), capture stills, and produce a report that ties each chapter to Goethe’s actual observations (§ + quote/REQ acceptance), so validation is against the book — not only “did the page load.”

### Spec

1. **Script:** `scripts/goethe-smoke.mjs` (or extend `visual-smoke.mjs` with a mode — prefer **separate** script + npm scripts `smoke:goethe`).

2. **Chapter list:** Every id in `src/chapters.ts` (`CHAPTERS` + `WATER_PRESETS`), including `ocean`.

3. **Per chapter capture:**
   - `applyChapter(id)`
   - STILL freeze (`freezeForCapture` / animate off)
   - Wait for progressive samples (configurable `SAMPLES`, default ~32–48)
   - Screenshot → `notes/GROK/validation/goethe/<nn>-<id>.png`
   - Record runtime: badge class/text, active chapter, sceneMode if exposed, samples, any error

4. **Goethe observation matrix (authoritative sources):**
   - `notes/GROK/REQ-goethe-theory-of-colours.md` verification matrix + per-GTC acceptance
   - `src/chapters.ts` quote + section (§)
   - Optionally short pull from synopsis files
   - Each report row must include:
     - `chapterId`, `section` (§), `quote`
     - `goetheSaw` (1–2 sentences from REQ / book intent)
     - `userShouldSee` (acceptance / visual expectation)
     - `badgeExpected` (PHYSICAL | MIXED | PHYSIOLOGICAL (viewer))
     - `badgeActual` from page
     - `badgeOk` boolean
     - `capturePath`
     - `status`: `PASS` | `FAIL` | `UNVERIFIED_VISUAL` (structural pass but visual needs human eyes)
     - `notes` (gaps vs REQ if known PARTIAL from handoff)

5. **Automated checks (must implement):**
   - App loads; `__oceanscape.ready`
   - Chapter applies without throw
   - Badge matches expected from `chapters.ts`
   - Caption/section present when UI exposes it
   - Screenshot file non-empty
   - Hash `#chapter=<id>` works for at least one spot-check (e.g. `shadows`)

6. **Not required:** Pixel-diff golden images, CI WebGL (local + optional BASE_URL like existing smoke).

7. **Outputs:**
   - `notes/GROK/validation/goethe/SMOKE_REPORT.md`
   - `notes/GROK/validation/goethe/SMOKE_REPORT.json`
   - PNG set
   - `package.json`: `"smoke:goethe": "..."`

8. **Verify:** Run script against local dev/preview if possible; if WebGL headless fails, still ship script + document run recipe. Prefer making it work like existing `npm run smoke`.

9. **Commit** when done. No production push.

### Files
- `scripts/goethe-smoke.mjs` (new)
- `package.json`
- `notes/GROK/validation/goethe/*` (generated + maybe README)
- Possibly tiny `__oceanscape` getters if badge/chapter not queryable

### Out of scope
- Fixing every PARTIAL Goethe REQ implementation
- Deploy

---

## Execution order
1. Task 1 complete + reviews → then Task 2 (smoke can optionally capture a wave preset scene later; not required).
2. Final whole-batch code review.
3. Do **not** merge/push unless user asks.
