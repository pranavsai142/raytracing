# Goethe chapter smoke report

Generated: 2026-07-09T17:11:20.435Z
Base URL: `http://127.0.0.1:5173/raytracing/`
Still sample target: 32
Pass: **YES**
Chapters: 16 / 16

## Purpose

Full Playwright still capture across all Goethe chapters (I–VIII + water phenomena + ocean).
Each row ties the scene to Goethe’s observation (§ + quote) so validation is against the **book**, not only page load.

**Automated checks:** app ready, chapter apply, badge match, non-empty caption, non-empty PNG, still samples progressed, hash restore.
**Visual Goethe match** (colours, fringes, afterimages) is **human-reviewed** via the PNG set — see visual checklist per row.

## Hash spot-check

- URL: `http://127.0.0.1:5173/raytracing/?goetheHashCheck=1783617048992#chapter=shadows`
- activeChapter: `shadows` (expect `shadows`)
- badge: `MIXED` (expect `MIXED`)
- hash: `#chapter=shadows`
- OK: **yes**

## Observation matrix

| # | Chapter | § | Badge exp | Badge act | Badge OK | Samples | Mode | Status | PNG |
|---|---------|---|-----------|-----------|----------|---------|------|--------|-----|
| 01 | ocean | — | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `01-ocean.png` |
| 02 | primordial | §175 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `02-primordial.png` |
| 03 | atmosphere | §155 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `03-atmosphere.png` |
| 04 | shadows | §76 | MIXED | MIXED | yes | 32 | still | **PASS** | `04-shadows.png` |
| 05 | shadows-underwater | §78 | MIXED | MIXED | yes | 32 | still | **PASS** | `05-shadows-underwater.png` |
| 06 | contrast | §56 | MIXED | MIXED | yes | 32 | still | **PASS** | `06-contrast.png` |
| 07 | refraction | §227 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `07-refraction.png` |
| 08 | double-reflect | §224 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `08-double-reflect.png` |
| 09 | afterimage | §50 | PHYSIOLOGICAL (viewer) | PHYSIOLOGICAL (viewer) | yes | 32 | still | **PASS** | `09-afterimage.png` |
| 10 | twilight | §85 | MIXED | MIXED | yes | 32 | still | **PASS** | `10-twilight.png` |
| 11 | goethe-colourless-water | §161 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `11-goethe-colourless-water.png` |
| 12 | diver-view | §78 | MIXED | MIXED | yes | 32 | still | **PASS** | `12-diver-view.png` |
| 13 | vessel-elevation | §187 | PHYSICAL | PHYSICAL | yes | 32 | still | **PASS** | `13-vessel-elevation.png` |
| 14 | wave-contrast | §57 | MIXED | MIXED | yes | 32 | still | **PASS** | `14-wave-contrast.png` |
| 15 | twilight-ocean | §75 | MIXED | MIXED | yes | 32 | still | **PASS** | `15-twilight-ocean.png` |
| 16 | sun-glitter | §93 | MIXED | MIXED | yes | 32 | still | **PASS** | `16-sun-glitter.png` |

## Per-chapter Goethe alignment

### 01-ocean — ocean (—)

- **Status:** PASS
- **Quote:** Dielectric interface path tracer
- **Goethe saw:** North-star dielectric ocean: Fresnel, Snell window, TIR trap/escape, and spectral caustics at the air–water interface (not a Goethe paragraph — physics baseline).
- **User should see:** Submerged checkerboard cube; realistic interface; Snell/TIR/cube framing; no fake bulk pigment.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/01-ocean.png`
- **Notes:** Physics north-star; visual Goethe match N/A — structural + dielectric proof.
- **Visual checklist (human):** Submerged checkerboard cube; realistic interface; Snell/TIR/cube framing; no fake bulk pigment.

### 02-primordial — primordial (§175)

- **Status:** PASS
- **Quote:** Light, darkness, and a colourless medium
- **Goethe saw:** Light + darkness + a colourless semi-transparent medium produce colour; thickness of the medium modulates the appearance.
- **User should see:** Low sun through medium: warm near horizon / cool overhead relations; thickness changes colour; bulk water not blue paint at low opacity.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/02-primordial.png`
- **Visual checklist (human):** Low sun through medium: warm near horizon / cool overhead relations; thickness changes colour; bulk water not blue paint at low opacity.

### 03-atmosphere — atmosphere (§155)

- **Status:** PASS
- **Quote:** Darkness seen through illumined vapour
- **Goethe saw:** Sky blue is darkness seen through thin illumined vapour; the sun through mist warms yellow→ruby.
- **User should see:** Zenith blue deepens with denser atmosphere / low sun; sun disk warms; optional flame-edge demo when sceneMode=2.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/03-atmosphere.png`
- **Visual checklist (human):** Zenith blue deepens with denser atmosphere / low sun; sun disk warms; optional flame-edge demo when sceneMode=2.

### 04-shadows — shadows (§76)

- **Status:** PASS
- **Quote:** Contrary light fills the shadow
- **Goethe saw:** Principal light tints the surface; contrary (fill) light fills the shadow → complementary coloured shadows.
- **User should see:** Dual-light rod/floor: two distinct coloured shadows; overlap darker/neutral; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/04-shadows.png`
- **Visual checklist (human):** Dual-light rod/floor: two distinct coloured shadows; overlap darker/neutral; MIXED badge.

### 05-shadows-underwater — shadows-underwater (§78)

- **Status:** PASS
- **Quote:** Divers: red field, green shadows
- **Goethe saw:** Divers report a red-biased field with green-tending shadows under water.
- **User should see:** Underwater dual-light: warm lit faces, cooler/greener shadow regions on cube/floor.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/05-shadows-underwater.png`
- **Visual checklist (human):** Underwater dual-light: warm lit faces, cooler/greener shadow regions on cube/floor.

### 06-contrast — contrast (§56)

- **Status:** PASS
- **Quote:** White on yellow → purple tint
- **Goethe saw:** White against a yellow field takes on a purple (physiological) tint at the boundary.
- **User should see:** Yellow/white split floor; purple fringe when physiological layer enabled; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/06-contrast.png`
- **Notes:** Physiological fringe may need human eyes on PNG; structural badge + scene load required.
- **Visual checklist (human):** Yellow/white split floor; purple fringe when physiological layer enabled; MIXED badge.

### 07-refraction — refraction (§227)

- **Status:** PASS
- **Quote:** Displacement at boundaries produces colour
- **Goethe saw:** At refracting boundaries, displacement of the image produces coloured fringes.
- **User should see:** Spectral edges / dispersion at water boundaries and cube silhouette; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/07-refraction.png`
- **Visual checklist (human):** Spectral edges / dispersion at water boundaries and cube silhouette; PHYSICAL badge.

### 08-double-reflect — double-reflect (§224)

- **Status:** PASS
- **Quote:** Separated reflections are weak and shadowy
- **Goethe saw:** When surface reflections are separated (double reflection), secondary images appear weak and shadowy.
- **User should see:** Calm surface; secondary reflection path weaker than primary; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/08-double-reflect.png`
- **Visual checklist (human):** Calm surface; secondary reflection path weaker than primary; PHYSICAL badge.

### 09-afterimage — afterimage (§50)

- **Status:** PASS
- **Quote:** Opponent colour floats on neutral ground
- **Goethe saw:** After fixation on a colour, the opponent colour appears floating on a neutral ground (physiological).
- **User should see:** Fixation / opponent afterimage layer labeled PHYSIOLOGICAL (viewer); not smuggled into water radiance.
- **Badge:** expected `PHYSIOLOGICAL (viewer)` · actual `PHYSIOLOGICAL (viewer)` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/09-afterimage.png`
- **Notes:** Opponent afterimage is inherently visual/human; STILL freeze ok for structure. Review PNG for fixation plane; colour match not automatable.
- **Visual checklist (human):** Fixation / opponent afterimage layer labeled PHYSIOLOGICAL (viewer); not smuggled into water radiance.

### 10-twilight — twilight (§85)

- **Status:** PASS
- **Quote:** Faint lights appear coloured at night
- **Goethe saw:** At night / twilight, faint lights (moon, candle) appear distinctly coloured.
- **User should see:** Low ambient with moon/candle-style lights tinted; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/10-twilight.png`
- **Visual checklist (human):** Low ambient with moon/candle-style lights tinted; MIXED badge.

### 11-goethe-colourless-water — goethe-colourless-water (§161)

- **Status:** PASS
- **Quote:** Water deprived slightly of transparency
- **Goethe saw:** Water itself has no colour; slight semi-opacity (not pigment) yields the dioptrical effects.
- **User should see:** Cube through colourless medium; no bulk blue pigment; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/11-goethe-colourless-water.png`
- **Visual checklist (human):** Cube through colourless medium; no bulk blue pigment; PHYSICAL badge.

### 12-diver-view — diver-view (§78)

- **Status:** PASS
- **Quote:** Everything seen in red light; shadows green
- **Goethe saw:** Underwater diver perspective: red-biased illumination field with green-tending shadows (§78).
- **User should see:** Underwater cube; beer-style absorption; red/green relations; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/12-diver-view.png`
- **Visual checklist (human):** Underwater cube; beer-style absorption; red/green relations; MIXED badge.

### 13-vessel-elevation — vessel-elevation (§187)

- **Status:** PASS
- **Quote:** The bottom appears raised
- **Goethe saw:** Looking into a vessel of water, the bottom appears raised by refraction.
- **User should see:** Apparent elevation of submerged geometry / bottom plane; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/13-vessel-elevation.png`
- **Visual checklist (human):** Apparent elevation of submerged geometry / bottom plane; PHYSICAL badge.

### 14-wave-contrast — wave-contrast (§57)

- **Status:** PASS
- **Quote:** Lit side green; shadow opposite
- **Goethe saw:** On an agitated sea, lit faces and shadow sides show strong contrast (green-tending lit, opposite in shadow).
- **User should see:** Waves with clear lit/shadow contrast across slopes; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/14-wave-contrast.png`
- **Visual checklist (human):** Waves with clear lit/shadow contrast across slopes; MIXED badge.

### 15-twilight-ocean — twilight-ocean (§75)

- **Status:** PASS
- **Quote:** Sea-green shadows at twilight
- **Goethe saw:** At twilight the sea shows green-tending shadows under residual sky light.
- **User should see:** Low sun ocean; sea-green shadow tendency; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/15-twilight-ocean.png`
- **Visual checklist (human):** Low sun ocean; sea-green shadow tendency; MIXED badge.

### 16-sun-glitter — sun-glitter (§93)

- **Status:** PASS
- **Quote:** Halo around the sun image on water
- **Goethe saw:** The reflected sun image on water is surrounded by a glittering halo / dazzle.
- **User should see:** Bright sun glitter path on surface with halo-like bloom or sparkle; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 32
- **Capture:** `notes/GROK/validation/goethe/16-sun-glitter.png`
- **Visual checklist (human):** Bright sun glitter path on surface with halo-like bloom or sparkle; MIXED badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
