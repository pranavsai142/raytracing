# Goethe on Water: Technical Synopsis for Oceanscape Web

**Purpose:** Map every water-relevant passage in Goethe's *Theory of Colours* to implementable path-tracer demonstrations in Oceanscape Web. This document is design-only — no shader changes.

**Core thesis (Goethe):** Water has **no intrinsic (chemical) colour**. Apparent blues, greens, reds underwater, sea-green dusk shadows, and tinted reflections are **physical** (light + darkness through a colourless medium: thickness, depth, surface vs volume) or **physiological** (retinal complement, coloured shadows, faint-light yellowing). The medium is a *relation* — not a pigment.

**Oceanscape north star** (*SOUL_DRIVER.md*): physically correct air–water interface transport (Snell, Fresnel, TIR, volume scatter). Phenomena must emerge from math, not faked tints.

---

## 1. Goethe's Threefold Classification (Water-Relevant)

| Class | Goethe term | Water role | Path-tracer layer |
|-------|-------------|------------|-------------------|
| Physiological | Eye complement, coloured shadows | Green wave shadows (§57), diver green shadows (§78), moon+candle doubles (§76) | **Not modeled** — post-process or dual-light UI overlay |
| Physical | Colourless medium + light/darkness | Semi-opacity depth (§150–164), refraction edges (§187–308), catoptrics (§80, §224), pellicles (§431, §470) | **Partial** — IOR, TIR, neutral volume attenuation, spectral dispersion |
| Chemical | Substantive pigment in substance | Sea-shell dyes (§637–641), tinted water-prism fill (§342) | **Gap** — no dye/tint volume; cube texture only |

---

## 2. Exhaustive Source Index: Goethe on Water

Paragraph numbers follow *THEORY_OF_COLOURS.md* (Eastlake translation). Categories are synopsis tags for implementation routing.

| § | Quote (abridged) | Category |
|---|------------------|----------|
| **143** | "Colours are called dioptrical when a **colourless medium** is necessary… transparent, or at least capable of transmitting light." | colourless medium |
| **145** | Transparent medium "may be of the nature of air and gas, **may be fluid** or even solid." | colourless medium |
| **150** | Light through a slightly thickened medium → yellow; density/volume ↑ → yellow-red → ruby. | semi-transparent depth |
| **151** | Darkness through semi-transparent medium, itself illumined → **blue**; paler if denser, deeper if more transparent; colourless medium → violet. | semi-transparent depth |
| **161** | "**Fluid mediums**… **water**, deprived in a very slight degree of its transparency, produces the same effects." | colourless medium / semi-transparent depth |
| **162** | Lignum nephriticum liquor: blue in dark cup, yellow toward sun in glass — semi-transparent, not water's colour. | semi-transparent depth |
| **163** | Scented water, varnish, metallic solutions give "various degrees of **opacity to water**" for experiments. | semi-transparent depth |
| **164** | "**Bottom of the sea** appears to **divers** of a **red colour** in bright sunshine… water, owing to its **depth**, acts as semi-transparent medium. Shadows **green** (complement)." | semi-transparent depth / physiological contrast |
| **57** | "**Agitated sea**… light side of waves green in its own colour, shadowed side tinged with **opposite hue**." | physiological contrast |
| **52** | After-image dress "beautiful **sea-green**" — physiological, not water physics. | physiological contrast |
| **75** | Harz snow at sunset: illumined red, shadows "**sea-green**… emerald" → grey twilight → "**moon-and-starlight night**." | physiological contrast / night-faint-light |
| **76** | Full **moon** + **candle** equal: double shadows — moon-shadow red-yellow, candle-shadow blue; crossing black; mutual sea-green enhancement. | night-faint-light / physiological contrast |
| **78** | "**Divers** under water, sunlight in **diving-bell**: everything **red light**, shadows **green** — same as Harz (§75), "depths of the **sea**." | semi-transparent depth / physiological contrast |
| **79** | Winter evening: snow through window opening + candle → snow "**perfectly blue**" (warm paper, cool aperture). | night-faint-light / physiological contrast |
| **80** | Green glass double reflection; "**pouring water** into vessel, inner surface mirror": reflections **colourless** when pure; **opposite hues** when tinted. | catoptrical reflection |
| **83** | Fainter lights → physical colours; "**flames at night** appear redder" with distance. | night-faint-light |
| **84–86** | **Candle** at night = yellow; twilight = yellow + purple-blue shadows; strong light makes fainter lights appear coloured. | night-faint-light |
| **87** | Faint lights: **moon** full splendour → white or light yellow on retina. | night-faint-light |
| **88** | Night: spreading light boundary → yellow, outside red-yellow; transition to halos. | night-faint-light |
| **93** | Subjective halo round "**image of the sun reflected from the surface of water**." | catoptrical reflection / night-faint-light |
| **98** | Retinal undulation compared to "**circles on water**," glass of water tone-rings. | (analogy only) |
| **182** | "Coloured appearances on colourless objects, through **colourless mediums**" — opacity degree known by vision. | colourless medium |
| **187** | Sun diagonally into **cubical vessel**; pour **water** → light reaches bottom, **broken** at entry — refraction. | refraction edge |
| **188** | Eye for sun: pour water → bottom **raised** (elevation); unaware of bent sight-line. | refraction edge |
| **224** | "**Vase full of water**, plane mirror-like bottom" → **double reflection**; coincident = vivid, separated = weak/shadowy. | catoptrical reflection |
| **225** | Tinted medium: under-surface reflection = medium colour (light obj.); upper = **complement**; dark objects reverse. | catoptrical reflection / physiological contrast |
| **287** | Purer air → vapour → **water** → glass: increasing density increases refraction and colour. | refraction edge |
| **308** | Large **water-prism** in sun: refracted bright space, **middle colourless**; colours at horizontal edges only. | refraction edge |
| **321** | Square opening + **water-prism**: coloured edges move with spectrum orientation. | refraction edge |
| **331** | Water-prism + dark disk: colours at outline; red at centre when edges meet. | refraction edge |
| **342–344** | Fill water-prism with **coloured fluids**; coloured images refracted with bordered edges. | chemical (tinted volume) |
| **431** | Fifth condition: "**stagnant water**" pellicles, iron-impregnated; **oil on water**; varnish on aqua fortis. | pellicle / surface film |
| **470** | Stagnant water + iron pellicle; **oil drops on water** — brilliant colour circles. | pellicle / surface film |
| **464** | Soap bubble on straw: remains **white (colourless)** if not agitated. | colourless medium |
| **637** | Creatures in **water** — dense medium, light passes; marine shells brighter than freshwater. | (biology; medium as conduit) |
| **5115–5155** | **Aristotle**: air/water **colourless**; thin = blue, **accumulated = white** (cf. §155–158). **Leonardo**: medium has no colour, assumes qualities of beyond; two kinds — surface (water) vs volume (air). Three causes: light, **medium (water or air)**, local colour. | colourless medium / historical anchor |

---

## 3. Current Oceanscape Water Physics (Baseline)

From `pathTracer.frag.glsl` and `PathTracer.ts`:

| Parameter | Default | Role |
|-----------|---------|------|
| `waterIOR` | 1.33 | Snell refraction; `iorAtWavelength()` + `dispersion` → edge chromatic fringes |
| `interfaceRoughness` | 0.06 | Microfacet perturbation at interface |
| `dispersion` | 0.012 | Spectral IOR spread → caustic colour separation |
| `volumeSigma` | 0.05 | Neutral Beer-style attenuation `exp(-σ·path)` underwater |
| `volumeG` | 0.55 | Henyey–Greenstein scatter; god-ray tint `vec3(0.12, 0.28, 0.48)` |
| `waveAmplitude/Frequency/Speed` | 0.08 / 0.5 / 0.6 | Surface topology → TIR escape angles |
| `sunDir` / `sunIntensity` | UI-driven | Single white sun + analytic sky in `envLight()` |
| Camera | above/below toggle | `inWater` from `cameraPos.y < 0` |

**Implemented well:** Interface trapping/escape, waved normals, spectral dispersion at refractive events, neutral volume scatter/attenuation, submerged cube as path-validated geometry.

**Gaps for Goethe demos:** Wavelength-selective absorption (Goethe §150–164 depth yellowing); dual illuminants (moon+candle, §76); physiological complement layer; mirror-bottom vase geometry; water-prism slab; pellicle thin-film interference; turbidity as adjustable semi-opacity; night faint-light redshift on env radiance.

---

## 4. Implementable Demonstrations (8)

### Demo A — Semi-Transparent Depth: "Water Has No Colour" (§150–151, §161–164)

**Goethe:** Pure water is colourless; depth makes bright seabed **yellow-red** (light through thickened medium) and shadow regions **blue-green** (darkness through illumined medium) — plus diver shadows **green** as complement (§164, §78).

**Scene:** Camera **below** surface (`underwaterView`), sun high (`sunElevation` ~0.85), cube on sandy floor (`cubeDepth` −2.2), **clear** water first.

**Parameters:** `volumeSigma` 0.02→0.12 (path length, not dye); `maxBounces` 8+; future `σ_λ` uniform.

**Goethe vs tracer:** No intrinsic blue; red seabed + green shadows = light/dark through medium + complement (§78). Neutral `volumeSigma` yields blue-green god-ray bias (`vec3(0.12,0.28,0.48)`), not red floor. Proposed `σ_λ` warms long paths; green shadows still need physiological overlay.

**Tension:** Beer's law (selective absorption) vs Goethe §150 (semi-opacity yellowing). Expose `absorptionModel: 'goethe' | 'beer'`.

---

### Demo B — Agitated Sea: Wave Light vs Shadow (§57)

**Goethe:** Compensatory hue on **shadow side** of waves; light side "green in its own colour."

**Scene:** Camera **above** surface, low sun (`sunElevation` 0.15–0.25), `waveAmplitude` 0.12, look grazing across waves.

**Parameters:** `interfaceRoughness` low (0.02) to preserve facet contrast; high sample count.

**Goethe claims:** Physiological simultaneous contrast — not a dye in water.

**Path tracer should show:** Physical glints (Fresnel) and geometric shadowed troughs — **cooler/deeper** in troughs if selective absorption on; will **not** auto-evoke red complement on shadow side without post.

**Tension:** Pure physics ≠ Goethe §57. Needs optional `complementStrength` post-pass keyed to local luminance contrast.

---

### Demo C — Water-Prism: Colourless Centre, Edges Only (§308, §321)

**Goethe:** Large water-prism → bright refracted patch **white in middle**, colour only at **horizontal edges**.

**Scene:** New geometry: rectangular water slab (10°–20° wedge), sun beam through side, white receiver plane below. Or approximate with thin displaced water sheet above cube.

**Parameters:** `dispersion` 0.02; collimated `sunDir`; receiver close to prism.

**Goethe claims:** Refraction without colour except at **boundaries** of circumscribed sun image.

**Path tracer should show:** With current shader on **planar interface only**, not prism volume — **partial**. Full demo needs **two refracting faces** (enter/exit) and finite extent. Edge caustics with colour separation already emerge from `iorAtWavelength` — centre white if beam wider than dispersion spread.

**Gap:** No prism mesh; water is single horizontal interface.

---

### Demo D — Cubical Vessel Refraction + Elevation (§187–188)

Pour water into cube → light reaches floor; eye sees **raised** bottom (§188). Above-water camera, `cubeDepth` −1.5, minimal `volumeSigma`. **Already emergent** from surface refraction; colourless unless beam edges present.

---

### Demo E — Vase Double Reflection + Tint (§80, §224–225)

**Goethe:** Mirror-bottom vase: pure water → **both reflections colourless**; tinted water → **opposite hues** on separated reflections.

**Scene:** New asset: cylinder or box, water volume, **mirror floor** (second interface or `material==mirror`), object (cube fragment) above water line for catoptric paths.

**Parameters:** `waterIOR` 1.33; tint uniform `volumeTint` (proposed RGB absorption); thickness 0.1–0.3 m.

**Goethe claims:** Catoptrical + dioptrical; tint evokes complement on upper reflection (physiological per §225).

**Path tracer should show:** Double paths (surface reflect + bottom reflect) — **needs new geometry & second bounce target**. Tint: physical absorption on each leg. Complement on upper image: **post or dual-wavelength trick**, not automatic in dielectric shader.

**Gap:** No vase; no bottom mirror; single plane interface.

---

### Demo F — Sun Glitter Halo on Water (§93, §88)

Low `sunElevation` (0.05), sight specular on waves — physical glitter disk. §93 halo is **subjective**; needs bloom post. Night: `sunIntensity` 0.08 as moon proxy.

---

### Demo G — Twilight → Moon Ocean (§75, §76, §84–87)

**Goethe:** Sunset snow → red illum + **sea-green** shadows → **grey twilight** → moon night. Moon+candle: balanced double coloured shadows.

**Scene:** Ocean horizon; time slider (proposed) driving `sunElevation`, `sunIntensity`, sky warmth.

**Night/ocean recipe (adapted):**
| Phase | `sunElevation` | `sunIntensity` | Sky `envLight` | Notes |
|-------|----------------|----------------|----------------|-------|
| Sunset red | 0.05 | 1.0 | warm `sky *= (1.2, 0.9, 0.7)` | Long paths → warm water volume if σ_λ |
| Sea-green shadows | 0.08 | 0.6 | twilight | **Physiological** overlay green in shadow mask |
| Grey transition | −0.02 | 0.15 | neutral grey-blue | §75 "lost in grey twilight" |
| Moonlight | −0.2 | 0.04 | cool dim | §87 moon ≈ white/yellow faint |
| Moon+candle | moon 0.04 + point light 0.03 warm | dual | §76 two shadow colours |

Single-sun model: sunset reddening via grazing paths + warm sky only. Sea-green shadows and §76 double shadows need second illuminant + complement pass. **Gap:** no moon disk, candle, or twilight ramp.

---

### Demo H — Stagnant Surface Pellicles (§431, §470)

Oil/iron films on stagnant water — iridescent lamellae, not body colour. Needs thin-film interference BRDF (100–400 nm); **not present** in current shader.

---

## 5. Canonical Preset: "Water Has No Colour"

**Intent:** Prove Goethe §161 + §150–151 in one screenshot pair.

**Preset name:** `goethe-colourless-water`

| Control | Value | Rationale |
|---------|-------|-----------|
| `underwaterView` | false then true | Compare same object through air vs water |
| `volumeSigma` | 0.01 | Minimal — water nearly non-absorbing |
| `waterIOR` | 1.33 | Physical, not tint |
| `dispersion` | 0.008 | Edge fringes only at glints/caustics |
| `sunElevation` | 0.7 | Strong white sun — "highest light colourless" (§150) |
| `waveAmplitude` | 0.02 | Calm — avoid confusing wave contrast |
| `cubeDepth` | −2.2 | Submerged validation cube |
| `exposure` | 1.2 | |

**Procedure:**
1. **Above:** Frame cube through surface — see refractive wobble, specular sun path, **no bulk blue haze** (σ low).
2. **Below:** Increase `volumeSigma` in steps 0.02 → 0.08 — scene should **darken and warm** (implement σ_λ red-preserving), **not** turn chemical blue.
3. **Caption test:** If viewer says "water is blue," raise σ_blue slightly *only* as "darkness through illumined medium" (§151), not as substance colour.

**Success criterion:** Bulk volume remains neutral/colourless at σ→0; colour appears only at **edges** (Fresnel, caustics, dispersion) and **relations** (shadow vs lit).

---

## 6. Vase Experiment — WebGL Replication Sketch (§80, §224–225)

**Geometry (new):**
- Open-top cylinder, radius 0.4 m, height 0.35 m, water level 0.3 m.
- Bottom face: `material = mirror` (perfect reflector) or 95% reflectance dielectric.
- Top: air–water interface shares existing `intersectWaterSurface` or local planar intersection.
- Scene object: high-contrast bar (black/white) mounted vertically outside vase.

**Paths to trace:**
1. Air → water surface → reflect bar (underwater path) → mirror bottom → eye.
2. Air → water surface → reflect bar (surface reflection) → eye.

**Pure water:** Both images greyscale — validates §80.

**Tinted water:** Uniform `volumeTint` (e.g. yellow dye): under-reflection yellowish on white bar; upper reflection should show **blue-violet fringe** per Goethe §225 (physiological) — implement as optional `complementOnReflection` post.

**Shader hooks:** Second water surface (vertical cylinder wall) for side refraction; bottom hit `material == 3` mirror.

---

## 7. Feature Map & Priority Gaps

| Goethe phenomenon | Oceanscape status | Priority |
|-------------------|-------------------|----------|
| Snell + TIR + waves | ✅ Production | — |
| Spectral dispersion at interface | ✅ `dispersion` | — |
| Neutral volume attenuation | ✅ `volumeSigma` | — |
| Selective λ absorption (depth red) | ❌ | **P0** for §164 |
| Turbidity / semi-opacity slider | ❌ (σ fixed meaning) | **P0** |
| Dual illuminant (moon+candle) | ❌ | P1 §76 |
| Physiological complement pass | ❌ | P1 §57, §78 |
| Water-prism / vase geometry | ❌ | P2 §308, §224 |
| Thin-film pellicle (oil/stagnant) | ❌ | P3 §470 |
| Night twilight grey ramp | ❌ | P1 §75 |

---

## 8. Known Theoretical Tensions (Do Not Gloss Over)

1. **Red at depth:** Goethe §164 — semi-transparent medium yellows **bright** objects; modern — **blue absorbed**, red transmitted (Beer's law). Same appearance, incompatible mechanisms. Oceanscape should expose `absorptionModel: 'goethe' | 'beer'`.

2. **Green shadows underwater:** Goethe §78 pairs with §75 — **physiological** complement to red-lit field. Beer-law underwater scenes give dark shadows, not green. Both may be shown side-by-side.

3. **"Blue water":** Goethe §151 — blue when seeing **darkness** through illumined colourless medium (looking down into depth). Shader god-ray `vec3(0.12, 0.28, 0.48)` bakes in a **physical bias** that contradicts strict §161 unless documented as "illumined medium over dark floor" not "water is blue."

4. **Agitated sea §57:** Explicitly **simultaneous contrast** — path tracer's wave shadows are radiometric, not retinal.

5. **Aristotle §5115 vs Goethe §155:** Accumulated water/air → **white**; thin layers → blue. Selective scatter/absorption in modern optics bridges both; Goethe denies atomistic absorption.

6. **Water-prism centre colourless §308:** Aligns with Oceanscape edge-only dispersion **if** geometry provides finite beam with white core; flat ocean surface alone is insufficient.

---

**Roadmap:** (1) canonical preset JSON, (2) `σ_λ` + turbidity slider, (3) twilight/moon `envLight` curves, (4) optional complement post, (5) vase/prism scene modes.

---

*Source: `THEORY_OF_COLOURS.md`. Shader: `src/shaders/pathTracer.frag.glsl`.*