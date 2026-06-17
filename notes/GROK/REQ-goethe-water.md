# REQ: Goethe on Water — Concrete Path Tracer Features

**Project:** Oceanscape Web (Vite + TypeScript + Three.js GPU path tracer)  
**Source text:** `THEORY_OF_COLOURS.md` — all water, sea, ocean, diver, vase, fluid, water-prism passages  
**Core thesis:** Water has **no intrinsic colour** (§136–143, §161). Apparent hues = light + darkness through a colourless medium (physical) or retinal complement (physiological). **Goethe saw them; we render them.**

**Depends on:** `REQ-goethe-theory-of-colours.md` GTC-00 (chapter shell) for presets and badges.

---

## 1. Goethe Water Phenomena → Feature Map

| ID | Goethe § | Phenomenon | Feature name | Layer |
|----|----------|------------|--------------|-------|
| WTR-01 | 150–151, 161–164 | Colourless water; depth warms brights, cools darks | `absorptionModel` + `turbidity` | Physical |
| WTR-02 | 161 | Canonical "water has no colour" demo | Preset `goethe-colourless-water` | Physical |
| WTR-03 | 57 | Agitated sea: lit green, shadow opposite | `wave-contrast` preset + complement | Mixed |
| WTR-04 | 187–188 | Pour water: refraction + raised bottom | `vessel-elevation` camera preset | Physical (exists) |
| WTR-05 | 78, 164 | Diver: red illumination, green shadows | `diver-view` preset + complement | Mixed |
| WTR-06 | 80, 224–225 | Vase mirror bottom: double reflection | `vase-scene` geometry mode | Physical |
| WTR-07 | 308, 321 | Water-prism: white centre, coloured edges | `water-prism` geometry mode | Physical |
| WTR-08 | 75–76, 84–87 | Twilight ocean → moon + sea-green shadows | `twilight-ocean` time ramp | Mixed |
| WTR-09 | 93, 88 | Sun glitter + subjective halo on water | `sun-glitter` + bloom post | Mixed |
| WTR-10 | 342, 163 | Tinted water (chemical / opacity experiment) | `volumeTint` uniform | Chemical demo |
| WTR-11 | 431, 470 | Oil pellicle on stagnant water | Thin-film BRDF on surface patches | Physical (P3) |

---

## 2. Baseline (Already Shipped)

| Capability | Location | Goethe alignment |
|------------|----------|------------------|
| Snell + Fresnel + TIR | `pathTracer.frag.glsl` | §143 colourless dioptrical medium |
| Spectral dispersion | `dispersion`, `iorAtWavelength()` | §308 edge colours only |
| Wave surface | `waveAmplitude/Frequency/Speed` | §57 agitated sea (physical part) |
| Volume scatter | `volumeSigma`, `volumeG` | §161 semi-transparent depth (partial) |
| Above/below camera | `underwaterView`, `ui.ts` | §164 diver POV |
| God-ray tint `vec3(0.12,0.28,0.48)` | shader line ~287 | **Tension:** implies blue water — must be tunable/neutral for WTR-02 |

---

## 3. Requirements (Detailed)

### WTR-01 — Colourless Medium Physics Core (P0)

**Goethe §150–151, §161:** Water deprived slightly of transparency yields same effects as vapour: light through thickness → yellow-ruby; darkness through illumined medium → blue-violet. **Not** a blue dye in the substance.

**Features:**

1. **`absorptionModel` enum** (`neutral` | `beer` | `goethe`):
   - `neutral`: scalar `volumeSigma` only (current).
   - `beer`: `σ_λ = (σ_R, σ_G, σ_B)` — blue absorbed faster, red survives (modern diver red).
   - `goethe`: thickness-based warm shift on **bright** backgrounds along ray: `L *= lerp(1, (1.2, 0.95, 0.7), turbidity * pathLength)` without wavelength absorption table.

2. **`turbidity` slider** (0–1): maps to effective optical depth; label in UI: *"Semi-opacity (not water colour)"*.

3. **`scatterTint` uniform** (vec3, default `1,1,1`): replace hard-coded `vec3(0.12, 0.28, 0.48)`. At `1,1,1` god-rays are neutral white; user adds blue only for §151 darkness-through-medium demos.

4. **`godRayMode`**: `neutral` | `goethe-blue` (presets old tint for comparison).

**Shader (`pathTracer.frag.glsl`):**
```glsl
uniform float turbidity;
uniform int absorptionModel; // 0 neutral, 1 beer, 2 goethe
uniform vec3 sigmaLambda;    // beer RGB coefficients
uniform vec3 scatterTint;
```

**Files:** `pathTracer.frag.glsl`, `PathTracer.ts`, `ui.ts`, `index.html`

**Acceptance:**
- [ ] `turbidity=0`, `scatterTint=1,1,1`: bulk underwater volume has no blue cast.
- [ ] `beer` + high turbidity: floor/cube warm red at depth (§164).
- [ ] `goethe` mode: bright sun paths yellow without requiring blue absorption.
- [ ] UI documents Beer vs Goethe tension in tooltip.

---

### WTR-02 — Preset: `goethe-colourless-water` (P0)

**Goethe §161:** *"Water, deprived in a very slight degree of its transparency, produces the same effects."*

**Preset values:**

| Param | Value |
|-------|-------|
| `underwaterView` | toggle A/B (false then true) |
| `volumeSigma` / `turbidity` | 0.01 |
| `scatterTint` | 1, 1, 1 |
| `absorptionModel` | neutral |
| `waterIOR` | 1.33 |
| `dispersion` | 0.008 |
| `sunElevation` | 0.7 |
| `waveAmplitude` | 0.02 |
| `cubeDepth` | -2.2 |
| `exposure` | 1.2 |

**UI:** Button **"Water Has No Colour"** in Goethe Chapters panel; caption overlay cites §161.

**Procedure (in-app hint text):**
1. Above: frame cube through surface — refraction + specular, no bulk haze.
2. Below: step turbidity 0.02 → 0.08 — darken/warm, not chemical blue.
3. Colour only at edges (Fresnel, caustics, dispersion).

**Acceptance:**
- [ ] Side-by-side above/below export at σ→0 proves no intrinsic blue.
- [ ] Increasing turbidity changes **relations** (lit vs dark), not albedo of water.

---

### WTR-03 — Agitated Sea: Wave Light vs Shadow (P1)

**Goethe §57:** Light side of waves green; shadowed side opposite hue (physiological complement).

**Features:**
1. Preset `wave-contrast`: `underwaterView=false`, `sunElevation=0.2`, `waveAmplitude=0.12`, `interfaceRoughness=0.02`, grazing camera (pitch 0.1, y=0.5).
2. Reuse `complementStrength` post-pass from GTC-04: boost opponent hue in geometric shadow masks on wave troughs.

**Acceptance:**
- [ ] Physical: glinting crests vs darker troughs visible.
- [ ] `complementStrength>0`: troughs show reddish opponent fringing per §57 (labeled physiological).

---

### WTR-04 — Vessel Elevation (P0 — preset only)

**Goethe §187–188:** Pour water in cube → light reaches bottom; eye sees raised bottom.

**Features:**
1. Preset `vessel-elevation`: camera above surface, look down at cube through water, `volumeSigma` minimal, `cubeDepth=-1.5`.
2. UI caption: elevation is subjective; shader already refracts.

**Acceptance:**
- [ ] Cube apparent position shifts with `waterIOR`.
- [ ] No bulk colour at low σ (pairs with WTR-02).

---

### WTR-05 — Diver View: Red Field + Green Shadows (P0)

**Goethe §78, §164:** *"Everything is seen in a red light… shadows appear green."*

**Features:**
1. Preset `diver-view`: `underwaterView=true`, `sunElevation=0.85`, `absorptionModel=beer`, `turbidity=0.1`, camera y=-1.2.
2. Dual-light from GTC-03: cool `fillTint` from surface.
3. `complementStrength` default 0.35 for shadow regions (badge `MIXED`).

**Acceptance:**
- [ ] Lit seabed/cube faces trend warm red.
- [ ] Cube shadow side greener than sunlit with complement on.
- [ ] Toggle complement off: physical-only dark shadows (honest comparison).

---

### WTR-06 — Vase: Mirror Bottom Double Reflection (P2)

**Goethe §80, §224–225:** Pure water → both reflections colourless; tinted → opposite hues on separated reflections.

**Geometry (`sceneMode=vase`):**
- Open cylinder: radius 0.4 m, height 0.35 m, water level y=0.3 (local origin offset x=-3 to not occlude cube).
- Bottom: `materialId=mirror` (perfect reflector).
- Vertical bar: black/white stripes outside vase.
- Top interface: share `intersectWaterSurface` or local plane.

**Shader paths:**
1. Surface reflect → bar (path A).
2. Transmit → mirror bottom → reflect → eye (path B).

**Uniforms:** `volumeTint` (vec3, default white) for §163 opacity experiments.

**Acceptance:**
- [ ] Pure water: both bar reflections greyscale.
- [ ] `volumeTint` yellow: under-reflection yellowish; upper shows blue-violet with `complementOnReflection` post (§225).
- [ ] Coincident reflections vivid; separated weak/shadowy (§224).

---

### WTR-07 — Water-Prism Slab (P2)

**Goethe §308:** Refracted patch **colourless in middle**; colour at horizontal edges only.

**Geometry:**
- Triangular prism mesh (water IOR), 10°–20° wedge, placed sunward of receiver plane.
- Collimated sun beam through prism onto white floor card.

**Shader:** Two refracting faces (enter/exit); circumscribed sun image on receiver.

**Acceptance:**
- [ ] Centre of patch white at `dispersion>0`.
- [ ] Red/blue edges at boundary displacement.
- [ ] Rotating prism changes edge orientation (§321).

---

### WTR-08 — Twilight → Moon Ocean (P1)

**Goethe §75–76:** Sunset red + sea-green shadows → grey twilight → moon night. Moon+candle double shadows.

**Features:**
1. **`timeOfDay` slider** (0–1): drives `sunElevation`, `sunIntensity`, sky warmth, moon visibility.
2. Phase table (shader or TS):

| Phase | t range | sunElev | sunInt | Notes |
|-------|---------|---------|--------|-------|
| Sunset red | 0.0–0.25 | 0.05 | 1.0 | warm sky |
| Sea-green shadows | 0.25–0.45 | 0.08 | 0.6 | complement on |
| Grey twilight | 0.45–0.65 | -0.02 | 0.15 | §75 grey |
| Moonlight | 0.65–1.0 | -0.2 | 0.04 | moon disk |

3. Preset `twilight-ocean`: starts `timeOfDay=0`, auto-animate optional.

**Acceptance:**
- [ ] Slider sweeps produce visibly distinct phases.
- [ ] Sea-green shadow phase requires `complementStrength>0` (labeled).

---

### WTR-09 — Sun Glitter & Halo (P1)

**Goethe §93:** Halo around sun image reflected from water (subjective).

**Features:**
1. Physical: low `sunElevation`, high `waveAmplitude`, specular glitter on facets (existing Fresnel).
2. Post: `bloomStrength` uniform on display pass for §93 halo (physiological label).

**Preset `sun-glitter`:** `sunElevation=0.05`, `waveAmplitude=0.1`, `bloomStrength=0.4`.

**Acceptance:**
- [ ] Glitter disk visible on waves.
- [ ] Bloom produces halo without changing path-traced radiance.

---

### WTR-10 — Tinted Water Volume (P2)

**Goethe §163, §342:** Opacity agents in water; coloured water-prism fill.

**Features:**
1. `volumeTint` (vec3 absorption multiplier per unit length).
2. UI slider RGB tint with label *"Chemical tint (§163 experiment)"* — not default ocean.

**Acceptance:**
- [ ] Tint affects transmitted/reflected paths physically.
- [ ] Default ocean tint = white (no absorption).

---

### WTR-11 — Surface Pellicles / Oil on Water (P3)

**Goethe §431, §470:** Iridescent films on stagnant water.

**Features:** Thin-film interference BRDF on flat water patches; `filmThickness` nm uniform. **Defer to P3.**

---

## 4. UI: Water Chapter Panel

Add subsection under **Goethe Chapters** in `index.html`:

| Button | Preset ID | REQ |
|--------|-----------|-----|
| Water Has No Colour | `goethe-colourless-water` | WTR-02 |
| Diver (Red / Green) | `diver-view` | WTR-05 |
| Agitated Sea | `wave-contrast` | WTR-03 |
| Vessel Elevation | `vessel-elevation` | WTR-04 |
| Twilight Ocean | `twilight-ocean` | WTR-08 |
| Sun Glitter | `sun-glitter` | WTR-09 |
| Vase Experiment | `vase-scene` | WTR-06 |
| Water Prism | `water-prism` | WTR-07 |

**Sliders (Water Physics section):**
- Turbidity / Semi-opacity (WTR-01)
- Absorption model (dropdown)
- Scatter tint RGB (WTR-01)
- Volume tint RGB (WTR-10)
- Complement strength (WTR-03, WTR-05, WTR-08)

---

## 5. Shader Change Checklist

| Change | File | REQ |
|--------|------|-----|
| Replace hard-coded god-ray blue | `pathTracer.frag.glsl` | WTR-01 |
| `absorptionModel` branch in volume loop | `pathTracer.frag.glsl` | WTR-01 |
| `volumeTint` on underwater paths | `pathTracer.frag.glsl` | WTR-06, WTR-10 |
| Mirror material + vase AABB/cylinder | `pathTracer.frag.glsl` | WTR-06 |
| Prism mesh intersection (wedge) | `pathTracer.frag.glsl` | WTR-07 |
| `timeOfDay` → sun/sky/moon | `pathTracer.frag.glsl`, `PathTracer.ts` | WTR-08 |
| Bloom pass | `PathTracer.ts` | WTR-09 |
| Complement shadow mask post | `PathTracer.ts` | WTR-03, WTR-05 |

---

## 6. Known Tensions (Must Stay Visible in UI)

1. **Red at depth:** Beer (modern) vs Goethe semi-opacity — expose toggle, never merge silently.
2. **Green shadows:** §78 physiological — complement pass labeled, not claimed as water pigment.
3. **Blue god-rays:** Old `vec3(0.12,0.28,0.48)` is §151-style "darkness through medium" only when user opts in.
4. **§57 wave shadows:** Physical troughs ≠ retinal complement without post.

---

## 7. Implementation Order

```
WTR-01 (scatterTint + turbidity + absorptionModel)
  → WTR-02 (canonical preset)
  → WTR-05 (diver preset, uses WTR-01)
  → WTR-04 (elevation preset)
  → WTR-03, WTR-08, WTR-09 (P1, need GTC-03/08 complements)
  → WTR-06, WTR-07, WTR-10 (P2 geometry)
  → WTR-11 (P3)
```

---

## 8. Verification

| REQ | § | Pass criteria |
|-----|---|---------------|
| WTR-02 | 161 | Bulk neutral at σ=0; colour at edges only |
| WTR-05 | 78, 164 | Red lit + green shadows with complement |
| WTR-06 | 224 | Double reflection greyscale when pure |
| WTR-07 | 308 | White patch centre, coloured horizontal edges |
| WTR-08 | 75 | Grey twilight phase at t≈0.55 |

PNG exports: `notes/GROK/validation/goethe/water/`

---

## 9. References

- Synopsis: `notes/GROK/goethe-water-synopsis.md`
- General REQ: `notes/GROK/REQ-goethe-theory-of-colours.md`
- Source: `THEORY_OF_COLOURS.md`
- Shader: `src/shaders/pathTracer.frag.glsl`