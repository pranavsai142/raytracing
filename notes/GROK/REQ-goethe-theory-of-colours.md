# REQ: Goethe Theory of Colours — Interactive Visual Book

**Project:** Oceanscape Web (Vite + TypeScript + Three.js GPU path tracer)  
**Source text:** `THEORY_OF_COLOURS.md` (Goethe, Eastlake trans.)  
**Goal:** Goethe saw these phenomena; the user sees them in the browser — each chapter is a concrete scene preset + shader/UI mode, not a PDF.

**North star constraint** (`SOUL_DRIVER.md`): Physical path tracing remains primary. Physiological phenomena get a **separate, labeled** display layer — never smuggled into water radiance as fake pigment.

**Sacred invariants:** Rotating checkerboard cube submerged below y=0 water plane; rotation preserved; chapters change lighting/surroundings, not the cube's role as validation geometry.

---

## 1. Scope Summary

| Phase | REQ IDs | Deliverable |
|-------|---------|-------------|
| **P0** | GTC-00, GTC-01, GTC-02, GTC-03, GTC-05 | Book shell + 4 physical chapters |
| **P1** | GTC-04, GTC-06, GTC-08 | Contrast, catoptrics, twilight |
| **P2** | GTC-07 | After-image (physiological) |

**Out of scope (v1):** Newton polemics, chemical colours of plants/animals, entoptic entoptic plates, full historical part.

---

## 2. Cross-Cutting Requirements

### GTC-00 — Book Navigation Shell

**Goethe basis:** §302 — physiological / physical / chemical classification; user must know which mode is active.

**Features:**
1. New UI panel **"Goethe Chapters"** in `index.html` + `src/ui.ts`.
2. `PathTracer.applyChapterPreset(id: ChapterId)` in `src/PathTracer.ts`:
   - Sets `params`, camera pose, `sceneMode` uniform, resets accumulation.
   - Updates URL hash `#chapter=<id>` for shareable links.
3. On-screen badge (canvas overlay or stats line): `PHYSICAL` | `PHYSIOLOGICAL (viewer)` | `MIXED`.
4. Per-chapter tooltip: one-line Goethe quote + § reference from `THEORY_OF_COLOURS.md`.
5. Keyboard shortcuts `1`–`8` map to chapters I–VIII.

**Files:** `index.html`, `src/ui.ts`, `src/PathTracer.ts`, `src/style.css`

**Acceptance:**
- [ ] Clicking any chapter button loads preset within 1 frame; accum resets.
- [ ] Badge matches chapter class (see table in §3).
- [ ] `#chapter=shadows` restores preset on page load.
- [ ] `npm run build` passes.

---

### GTC-00b — Scene Mode Uniform

**Features:**
1. `uniform int sceneMode` in `pathTracer.frag.glsl` (0=ocean default, 1–8=chapter-specific geometry flags).
2. `SceneDesc` struct (or uniform block) for optional geometry:
   - `showOccluderRod`, `showWhiteFloor`, `showYellowFloorHalf`, `showGlassPanel`, `showGreyFixationPlane`, `showCandleLight`, `showMoon`.
3. Chapters toggle geometry without shader recompile.

**Files:** `src/shaders/pathTracer.frag.glsl`, `src/PathTracer.ts`

**Acceptance:**
- [ ] Chapter III enables rod + white floor; Chapter IV enables yellow/white floor split.
- [ ] Default ocean scene unchanged when `sceneMode == 0`.

---

## 3. Chapter Requirements

### GTC-01 — Chapter I: Primordial Phenomenon (§175, §150–151)

**Goethe saw:** Light + darkness + colourless semi-transparent medium → contrasting colours tending toward union.

**User sees:**
- Above water at low sun: sun disk yellow → ruby as **medium thickness** increases.
- Below water: Snell window (darkness beyond) blue-violet; sun shaft through column warm.
- Bulk water never looks like blue paint at σ→0.

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `atmosphereDensity` (float 0–2), `mediumThickness` (float 0–1), `mediumTint` (vec3, default 1,1,1) |
| Shader | Extend `envLight()`: above-water rays through shell `T = exp(-β·(1−dir.y))`; underwater keep `volumeSigma` path attenuation |
| UI | Slider "Medium thickness" maps `mediumThickness` → lerp `volumeSigma` + `atmosphereDensity` |
| Preset `primordial` | `sunElevation=0.12`, `mediumThickness=0.6`, camera above then prompt Below view |

**Acceptance:**
- [ ] Thickness 0: sun appears white at high elevation.
- [ ] Thickness max + low sun: horizon warm, overhead cool (above) / inverse relations visible below.
- [ ] Badge: `PHYSICAL`.

---

### GTC-02 — Chapter II: Atmosphere & Dioptrical First Class (§153–160)

**Goethe saw:** Sky blue = darkness through thin illumined vapour; sun through mist yellow→ruby; flame base blue before black only.

**User sees:**
- Orbit: zenith blue deepens as sun lowers; sun warms.
- Optional candle+flame card demo: blue fringe at flame base against black card, absent against white (§159).

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `atmosphereDensity`, spectral `betaR/G/B` or single `beta` scaled per `lambdaNm` |
| Shader | Rayleigh-style `β ∝ λ⁻⁴` in `envLight`; sun disk `L *= exp(-airmass·β)` |
| Geometry | Small emissive flame point + black/white floor cards (`sceneMode=2`) |
| Preset `atmosphere` | `autoOrbit=true`, `atmosphereDensity=1.2`, `sunElevation` animated 0.05→0.9 |

**Acceptance:**
- [ ] Sky gradient visible; blue at zenith when sun low.
- [ ] Flame-on-black shows blue base fringe when `sceneMode=2` (appearance boost uniform `flameEdgeBoost`, labeled).
- [ ] Badge: `PHYSICAL`.

---

### GTC-03 — Chapter III: Coloured Shadows (§64–76, §78)

**Goethe saw:** Principal light tints surface; contrary light fills shadow → complement. Candle twilight → blue shadow. Divers: red field, green shadows.

**User sees:**
- Two-shadow rig: warm key + cool fill → blue shadow on one side, yellow on other, black overlap.
- Underwater variant: warm sun paths, cool fill from surface hemisphere; shadow regions visibly cooler/greener with optional physiological pass.

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `fillDir` (vec3), `fillIntensity` (float), `fillTint` (vec3) |
| Shader | At each hit: `L = sunTerm * V_sun + fillTerm * V_fill`; shadow = blocked key, unblocked fill |
| Geometry | Vertical rod occluder (radius 0.03, height 2) at x=0.5; white floor albedo 0.9 at y=-5.8 |
| Preset `shadows` | `sunElevation=0.15`, warm `sunIntensity`, `fillTint=(0.7,0.85,1.0)`, twilight `exposure=1.8` |
| Preset `shadows-underwater` | `underwaterView=true`, `volumeSigma=0.08`, same dual lights |

**Acceptance:**
- [ ] Two distinct coloured shadows visible on white floor with rod.
- [ ] Crossing region neutral/dark.
- [ ] Underwater preset shows red-biased lit vs cooler shadow on cube (physical); with `complementStrength>0` shadows trend green (§78).
- [ ] Badge: `MIXED` (physical dual-light + optional physiological).

---

### GTC-04 — Chapter IV: Complementary Contrast (§56–58, §239–241)

**Goethe saw:** White on yellow wall → purple tint; refracted edges carry yellow-red vs blue-violet accessory images.

**User sees:**
- Split floor: yellow half / white half; grey card — purple fringe on white near yellow (physiological ON).
- Cube silhouette at water: spectral fringes with dispersion ON (physical).

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `physiologicalContrast` (bool/float), `opponentStrength` (0–1), `dispersion` |
| Post-pass | `PathTracer.ts` composite: local 16px box avg chroma → add opponent to surround |
| Geometry | Floor: left half `albedo=(0.9,0.85,0.1)`, right half white; grey card mesh |
| Preset `contrast` | `physiologicalContrast=1`, `dispersion=0.03`, camera on yellow/white boundary |

**Acceptance:**
- [ ] OFF: only physical edge spectra at cube/water boundary.
- [ ] ON: purple tint on white adjacent yellow after 128+ ray frames.
- [ ] Badge: `MIXED`.

---

### GTC-05 — Chapter V: Refraction — Dioptrical Second Class (§184–227)

**Goethe saw:** Displacement at boundaries produces colour; unbroken surface through prism stays colourless.

**User sees:**
- Glancing underwater view: cube edges displaced + fringed; calm flat water little bulk colour; waves restore boundaries.

**Implementation:**
| Item | Spec |
|------|------|
| Params | `dispersion=0.02`, `interfaceRoughness=0.02`, `maxBounces=8`, `waveAmplitude≥0.04` |
| Preset `refraction` | Camera pitch −0.4, y=−0.3, z=2.5, target cube center |
| UI | Toggle "Boundary emphasis" locks `waveAmplitude` min 0.04 |
| Export | Button captures side-by-side `dispersion` 0 vs 0.02 (two PNGs or split view) |

**Acceptance:**
- [ ] `dispersion=0`: no chromatic edge at silhouette.
- [ ] `dispersion>0`: visible fringes at cube/water interface.
- [ ] `waterIOR` slider visibly shifts apparent cube position.
- [ ] Badge: `PHYSICAL`. **Mostly exists today — chapter = preset + labels + export.**

---

### GTC-06 — Chapter VI: Double Reflection (§222–225, §80)

**Goethe saw:** Thick glass / vase water: double reflection; separated images weak; tinted medium → complement on upper reflection.

**User sees:**
- Calm water: faint second cube reflection below surface.
- Optional green glass panel: dual reflections with colour separation.

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `secondaryReflectWeight`, `floorReflectance` |
| Shader | On water external reflect: trace secondary ray to floor y=`cubeDepth-0.5`, add Fresnel-weighted contribution |
| Geometry | Optional `tintedGlassPanel` (green transmittance 0.7) at z=1.5 |
| Preset `double-reflect` | `waveAmplitude=0`, `secondaryReflectWeight=0.4` |

**Acceptance:**
- [ ] Second reflection visible on calm water.
- [ ] Increasing separation (roughness/thickness) weakens secondary image.
- [ ] Badge: `PHYSICAL`.

---

### GTC-07 — Chapter VII: Physiological After-Image (§25–33, §49–50)

**Goethe saw:** After dazzling or saturated colour, opponent colour floats on neutral ground; decays over seconds.

**User sees:**
- Fixate crosshair on orange cube face 5s → look at grey plane → blue-green bloom fades ~30–60s.

**Implementation:**
| Item | Spec |
|------|------|
| RT | `afterimageBuffer` same size as accum |
| Logic | On fixation hold: accumulate `opponent(centerPatch)`; decay `afterimageDecay` per frame |
| Composite | Add to display buffer only — **not** in `pathTrace()` radiance |
| UI | "Fixation mode" toggle + crosshair; grey plane `sceneMode=7` |
| Preset `afterimage` | Fixation on cube, grey surround visible |

**Acceptance:**
- [ ] Fixation produces visible opponent on grey after release.
- [ ] Decay to invisible within tunable 30–60s.
- [ ] Toggle off: zero afterimage.
- [ ] Badge: `PHYSIOLOGICAL (viewer)`.

---

### GTC-08 — Chapter VIII: Faint Lights & Twilight (§81–87)

**Goethe saw:** Faint lights coloured; candle yellow at night; twilight purple-blue shadows; moon white-yellow; rotten wood bluish.

**User sees:**
- Twilight: low warm sun, elevated exposure, deep blue shadows (with dual-light from GTC-03).
- Night: moon disk in sky + optional warm candle point; distant lights redder.

**Implementation:**
| Item | Spec |
|------|------|
| Uniforms | `moonDir`, `moonIntensity`, `moonTint`; `candlePos`, `candleIntensity` (point light) |
| Shader | Add moon disk to `envLight`; candle `1/r²` falloff, blackbody ~2000K tint |
| Optional | `purkinjeStrength` in tonemap for low-luminance blue boost (labeled physiological) |
| Preset `twilight` | `sunElevation=0.06`, `sunIntensity=0.15`, `exposure=2.2`, moon+candle on |

**Acceptance:**
- [ ] Moon visible as faint disk at night preset.
- [ ] Candle warm near, redder with `atmosphereDensity` high.
- [ ] Badge: `MIXED`.

---

## 4. Data Model Extensions

Add to `SimParams` / shader uniforms (P0 minimum):

```typescript
// PathTracer.ts — new fields
atmosphereDensity: number;
mediumThickness: number;
mediumTint: [number, number, number];
fillDir: [number, number, number];
fillIntensity: number;
fillTint: [number, number, number];
sceneMode: number;
activeChapter: string | null;
physiologicalContrast: boolean;
opponentStrength: number;
complementStrength: number;
absorptionModel: 'neutral' | 'beer' | 'goethe';
```

---

## 5. Verification Matrix

| Chapter | Goethe § | Screenshot recipe | Min rays/frame × frames |
|---------|----------|-------------------|-------------------------|
| I Primordial | 175 | Above, sun 0.12, thickness 0/0.6 | 5 × 40 |
| II Atmosphere | 155 | Orbit, sun 0.05 | 5 × 60 |
| III Shadows | 76, 78 | Rod floor + underwater | 5 × 50 |
| IV Contrast | 56 | Yellow/white split, phys ON | 5 × 50 |
| V Refraction | 227 | Glancing below, disp 0.02 | 5 × 40 |
| VI Double | 224 | Calm surface | 5 × 40 |
| VII Afterimage | 50 | Fixation 5s | display pass |
| VIII Twilight | 85 | Moon+candle night | 5 × 40 |

Store validation PNGs in `notes/GROK/validation/goethe/` when implemented.

---

## 6. Implementation Order

```
GTC-00 (shell) → GTC-05 (refraction preset, quick win)
  → GTC-01 (primordial uniforms)
  → GTC-02 (atmosphere)
  → GTC-03 (dual light + rod)
  → GTC-04, GTC-06, GTC-08 (P1 parallel)
  → GTC-07 (P2)
```

**Depends on water REQ:** GTC-03 underwater preset uses `REQ-goethe-water.md` WTR-01 (σ_λ) and WTR-05 (complement pass).

---

## 7. References

- Synopsis: `notes/GROK/goethe-general-synopsis.md`
- Water REQ: `notes/GROK/REQ-goethe-water.md`
- Source: `THEORY_OF_COLOURS.md`
- Shader: `src/shaders/pathTracer.frag.glsl`
- UI: `src/ui.ts`, `index.html`