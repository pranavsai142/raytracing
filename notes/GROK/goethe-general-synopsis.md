# Goethe Theory of Colours: General Technical Synopsis for Oceanscape Web

**Purpose.** Turn the Oceanscape Web path tracer into an interactive *visual book* of Goethe's *Theory of Colours* — not by faking painterly effects, but by staging phenomena that emerge from (or are honestly paired with) physically correct light transport. The rotating submerged cube remains sacred validation geometry; Goethe chapters add scene presets, lighting rigs, and post-process modes that make each doctrine legible to the eye.

**Alignment with SOUL_DRIVER.** Physics correctness is still primary. Where Goethe describes *physiological* colour (retinal opposition), we implement a separate display pass or viewer mode and label it honestly. Where he describes *physical/dioptrical* colour through colourless media, we extend the existing dielectric + volume + spectral stack.

**Already partially demonstrated today**

| Goethe theme | Existing feature |
|---|---|
| Refraction through transparent medium | Snell refraction, Fresnel, TIR in `pathTracer.frag.glsl` |
| Spectral fringes at boundaries | `dispersion` + `iorAtWavelength()` hero-wavelength sampling |
| Semi-transparent medium before darkness | `volumeSigma` / `volumeG` underwater scattering; blue god-ray tint |
| Underwater red illumination + green shadows | Underwater camera (`underwaterView`), volume attenuation reddening deep paths (§78, §164) |
| Light through thickened medium | Sun low on horizon (`sunElevation` ↓) + volume scatter |
| Above/below comparative observation | `view-above` / `view-below` presets in `ui.ts` |

---

## Chapter 1 — Primordial Phenomenon: Light + Darkness + Colourless Medium

**Goethe citation (§175).** *"We see on the one side light, brightness; on the other darkness, obscurity: we bring the semi-transparent medium between the two, and from these contrasts and this medium the colours develop themselves, contrasted, in like manner, but soon, through a reciprocal relation, directly tending again to a point of union."*

**Phenomenon.** Viewer sees yellow-to-ruby when bright sun is viewed through thickened colourless medium, and blue-to-violet when darkness (deep water, night sky, shadowed volume) is viewed through the same medium illuminated from the side. Colours are *transient*, *edge-biased*, and *relational* — not pigment on objects.

**Physics mapping.** Modern optics: wavelength-selective scattering and absorption in turbid media (Rayleigh/Mie), plus Beer–Lambert attenuation. Goethe unifies these under "semi-transparent medium between light and darkness" without invoking decomposition of white light. Both accounts predict: bright backgrounds through haze → warm; dark backgrounds through lit haze → cool. Goethe's "primordial" status is phenomenological, not a rival dispersion model.

**Direct implementation.**

- **`pathTracer.frag.glsl`:** Split `volumeSigma` into `sigmaForward` (sunward) and `sigmaReturn` (eye path); add `mediumTint` uniform (vec3, default white) for neutral thickening. Modulate `envLight()` sky term by `exp(-sigma * pathLength)` toward `mediumTint` when ray traverses air above water (extend volume model above y=0 as thin atmosphere shell).
- **`PathTracer.ts`:** Preset `primordialThickness` (0–1) lerping `volumeSigma` and atmosphere opacity.
- **Scene:** Camera above interface at sunset (`sunElevation` ≈ 0.08–0.15); below, camera looks up at Snell window (darkness beyond) vs down at sun shaft (brightness beyond).
- **`ui.ts`:** Slider "Medium thickness" + chapter preset button.

**Validation.** Above water: sun disk shifts yellow → red as thickness increases; horizon sky near dark ocean stays blue. Below water: overhead Snell disk blue-violet; sun rays through water column warm. Compare `sunElevation` 0.8 vs 0.12 at `volumeSigma` 0.02 / 0.15.

**Priority.** **P0** — conceptual anchor for all other chapters; extends existing volume + sun controls.

---

## Chapter 2 — Atmospheric & Dioptrical First Class (§153–160)

**Goethe citation (§155).** *"If the darkness of infinite space is seen through atmospheric vapours illumined by the day-light, the blue colour appears."* **(§154)** *"The sun seen through a certain degree of vapour appears with a yellow disk… ruby-red"* through thick mist.

**Phenomenon.** Day sky blue (thin vapour + darkness behind); distant mountains blue; snow at distance yellowish; low sun and horizon red. Candle flame: blue at base before black, invisible before white (§159).

**Physics mapping.** Atmospheric Rayleigh scattering (λ⁻⁴) explains sky blue without Goethe's darkness-through-medium framing; sunset reddening is multiple scattering + increased path length. Flame base blue is molecular CH/C₂ emission and black-body gradient — Goethe's dark-background rule still describes the *appearance*.

**Direct implementation.**

- Add **analytic atmosphere** along `envLight(dir)`: `T = exp(-β(λ)·(1−dir.y))` for `dir.y > 0`; sun disk `L_sun(λ)` multiplied by `exp(−β·airmass)`. Reuse spectral `lambdaNm` per sample.
- **`sunElevation` + `sunIntensity`** already drive airmass; wire `β` to new uniform `atmosphereDensity`.
- **Candle chapter (§159):** Add small area light below interface + black/white cards on floor; compare flame silhouette on each ground — expect blue fringe only on black side (shader: emissive point + thin volumetric shell with Goethe-style view-dependent hue boost on dark-background rays only, labeled "appearance layer").

**Validation.** Orbit camera (`autoOrbit` ON), `sunElevation` sweep 0.05→0.9: zenith blue intensifies at low sun; sun colour warms. Export PNG at 128 accum samples for strip comparison.

**Priority.** **P0** — makes the sky model Goethe-legible while staying physically motivated.

---

## Chapter 3 — Coloured Shadows (§62–76, §78)

**Goethe citation (§64–65).** *"Two conditions are necessary… first, that the principal light tinge the white surface with some hue; secondly, that a contrary light illumine to a certain extent the cast shadow."* — candle shadow at twilight *"of the most beautiful blue."* **(§78)** *"When divers are under water… everything is seen in a red light… while the shadows appear green."*

**Phenomenon.** Dual illuminants: warm key + cool fill → shadow of key is blue; shadow of fill is yellow-orange. Crossing shadows black. Underwater: red body light, green shadow volumes.

**Physics mapping.** Modern: subtractive mixing of illuminants (blue fill in shadow of yellow key is physically correct if fill reaches shadow region). Goethe adds retinal complement evoked by the *lit* surround tinting — especially visible at twilight contrast. Underwater: selective red absorption with green residual in scatter paths matches §164/§78; both Goethe and modern water optics agree qualitatively.

**Direct implementation.**

- **Second light:** `fillDir`, `fillIntensity`, `fillTint` (vec3) uniforms; shadow = region where key contribution blocked but fill reaches (ray-traced: sample both lights at hit point with occlusion for each).
- **Geometry:** Thin vertical occluder (rod) + white floor plane at y = −5.8 (replace flat floor albedo with 0.9 white).
- **Underwater preset:** `fillTint` cool blue from surface, key sun red-shifted via `spectrumWeight` and increased `volumeSigma`; `underwaterView` ON, camera near cube.
- **`PathTracer.ts`:** `applyChapterPreset('coloured-shadows')` sets `sunElevation` low, warm `sunIntensity`, cool fill from sky hemisphere.

**Validation.** Two-shadow rig: occluder between sun and fill; one shadow leg blue, other yellow; overlap neutral. Underwater: cube shadow side greener than sunlit side redder. Screenshot matches §76 moon/candle logic qualitatively.

**Priority.** **P0** — high pedagogical impact; minimal new geometry.

---

## Chapter 4 — Complementary Contrast at Boundaries (§56–58, §239–241)

**Goethe citation (§56).** *"If a white paper is placed on a yellow wall, we shall see the white tinged with a purple hue."* **(§239)** *"Where dark passes over light… yellow appears; where a light outline passes over the dark background, blue appears."*

**Phenomenon.** Simultaneous contrast: neutral grey beside saturated field acquires opponent tint. At refracted edges: yellow-red on one side of boundary, blue-violet on other — "accessory image" clinging to outline.

**Physics mapping.** Simultaneous contrast is largely **physiological** (retinal opponency) — not explained by radiance alone. Prismatic edge colours: modern dispersion + diffraction; Goethe interprets as semi-transparent accessory images (§226–241). Path tracer can render **physical** edge spectra via `dispersion`; **physiological** surround tint needs post-process or split-screen demo.

**Direct implementation.**

- **Physical edge:** Increase `dispersion` to 0.03–0.05; place sharp white cube face against dark water interior (already have high-contrast cube/water boundary). Add `edgeContrastBoost` in tonemap for demonstration only (optional, flagged).
- **Physiological mode:** Full-screen pass in `PathTracer.ts` render chain: local average chroma → subtract scaled opponent from surround (`opponentStrength` uniform). Toggle `physiologicalContrast` in UI.
- **Scene:** Yellow-painted half of floor vs white half; grey card mesh between them.

**Validation.** With physiological toggle OFF: measure spectral fringes at water–cube silhouette (dispersion ON). With ON: grey on yellow field shows purple fringe in stabilized accum (128+ samples). Compare to §56 paper-on-wall.

**Priority.** **P1** — split physical (in-shader) vs physiological (honest post) is central to Goethe fidelity.

---

## Chapter 5 — Refraction: Dioptrical Second Class (§178–185)

**Goethe citation (§184).** *"Objects seen through mediums more or less transparent do not appear to us in the place which they should occupy according to the laws of perspective. On this fact the dioptrical colours of the second class depend."* **(§227)** *"A surface without a boundary exhibits no appearance of colour when refracted."*

**Phenomenon.** Cube underwater appears displaced and fringed at silhouettes; flat water alone shows little colour until waves create boundaries. Dispersion separates wavelengths at glancing transmission.

**Physics mapping.** Snell + Cauchy dispersion matches modern optics; Goethe's "displacement" and accessory fringes are phenomenological descriptions of the same boundary-heavy behaviour. No conflict when boundaries are required.

**Direct implementation.**

- Already core: `refractDir`, `iorAtWavelength`, waved normals (`waveAmplitude`, `waveFrequency`).
- **Enhance:** `maxBounces` 8–10 for underwater glancing paths; `interfaceRoughness` low (0.02) for crisp Snell window.
- **Camera presets:** Glancing view along interface (pitch ≈ −0.4, y ≈ −0.3) to maximize refractive displacement of cube edges.
- **UI:** "Boundary emphasis" locks `waveAmplitude` > 0 so plane never fully boundary-free.

**Validation.** Side-by-side: `dispersion` 0 vs 0.02 at same camera — coloured edge only with dispersion and visible silhouette. Cube apparent position shifts with `waterIOR` slider (1.33 default).

**Priority.** **P0** — already implemented; chapter = presets + UI labels + accum comparison export.

---

## Chapter 6 — Double Reflection at Parallel Surfaces (§222–225, §80)

**Goethe citation (§223).** *"When… the reflecting body is transparent, and has two parallel surfaces… an image may be reflected from both surfaces, and thus arise double images."* **(§225)** *"A light object reflected from the under surface is of the colour of the medium, while that reflected from the upper surface presents the complemental colour."*

**Phenomenon.** Window-bar double reflection in thick glass; water surface + bottom mirror give separated weak second image; green glass makes under-reflection green, upper reflection red (§80).

**Physics mapping.** Fresnel reflections at two interfaces — standard multilayer optics. Goethe's complement rule maps to path length through tinted medium + physiological contrast on faint secondary image. Implement **real** double bounce at water: sky reflection + subsurface weak reflection from floor/cube.

**Direct implementation.**

- **Water as two-interface slab:** On external reflection, spawn secondary ray from `hit.point` with offset into water, reflect off `y = cubeDepth` floor or cube top, add weighted contribution (`secondaryWeight`, `interfaceThickness` uniforms).
- **§80 demo:** Add optional `tintedGlassPanel` mesh (green transmittance 0.7) between camera and scene; dual reflection paths with `ior` 1.5.
- **`maxBounces`:** Must allow air→water→floor→water→air chains.

**Validation.** Calm water (`waveAmplitude` 0): duplicate faint cube reflection below surface; thicken virtual slab — separation increases. Green panel: secondary image greener, primary fringed red on white card.

**Priority.** **P1** — extends interface model; ties catoptrical to existing water plane.

---

## Chapter 7 — Physiological Colours & After-Vision (§25–33, §49–50)

**Goethe citation (§33).** *"The eye cannot for a moment remain in a particular state… it is forced to a sort of opposition."* **(§50)** *"Yellow demands purple; orange, blue; red, green."*

**Phenomenon.** After staring at sun/cube face, grey field shows opponent halo; coloured after-images float on neutral ground; simultaneous induced hues near saturated objects (§52 scarlet bodice → green after-figure).

**Physics mapping.** **Purely physiological** — opponency, adaptation, McCollough effect. Not produced by path tracing radiance. Must be a **viewer/subject** layer, not faked in water shader.

**Direct implementation.**

- **`PathTracer.ts`:** `afterimageBuffer` RT; on gaze fixation (click-hold or timer), accumulate `1 − color` opponent of central foveal patch; decay with `afterimageDecay` uniform (§25: "disappear by degrees").
- **`ui.ts`:** "Fixation mode" — crosshair on cube face 5 s, then look at grey floor plane.
- **Do not** mix into `pathTrace()` radiance — separate composite in `displayOnly` branch.

**Validation.** Fixate on orange cube face → grey floor shows blue-green bloom that fades over ~30–60 s (user-tunable). Toggle off: bloom absent. Matches §49 spectrum wheel pairs.

**Priority.** **P2** — essential for book completeness; clearly labeled non-physical overlay.

---

## Chapter 8 — Faint Lights & Twilight (§81–87)

**Goethe citation (§82).** *"An appearance of colour presently manifests itself in fainter lights."* **(§85)** *"Candle-light at twilight acts powerfully as a yellow light… purple blue shadows."* **(§87)** *"The moon… white, or at the most, light yellow… Rotten wood has even a kind of bluish light."*

**Phenomenon.** Distant lights redden; candle near vs far colour shift; twilight makes weak lights look yellow and shadows intensely blue; moon white-yellow; bioluminescence bluish.

**Physics mapping.** Mesopic vision + Purkinje shift (physiological); atmospheric extinction (physical). Candle yellow is black-body ~2000 K; moon 6500 K appears white at moderate luminance — Goethe's "faint = coloured" is observer-centric.

**Direct implementation.**

- **`exposure` + `sunIntensity`:** Twilight preset: `sunIntensity` 0.15, `exposure` 2.0, warm `sunDir` near horizon.
- **Add `moonDir` / `moonIntensity`** to `envLight` (cooler spectrum, disk angular size 0.5°).
- **Bioluminescence:** Weak emissive `vec3(0.1, 0.4, 0.6)` on floor patches or cube base — `emissiveStrength` uniform.
- **Tonemap:** Optional `purkinjeStrength` — boost blue in `(L < threshold)` for twilight chapter only.

**Validation.** Night preset: moon path white-yellow; candle point light yellow near, redder in fog (`atmosphereDensity` ↑). §85: twilight + dual-light rig → blue shadows deepen vs midday same rig.

**Priority.** **P1** — leverages existing sun/exposure; adds moon + emissive for variety.

---

## Book Navigation (Proposed UI)

Add a **"Chapters"** panel in `ui.ts` — each button calls `PathTracer.applyChapterPreset(id)` (new method), resets accum, sets camera, and highlights active chapter.

| Button label | Preset ID | Camera / key uniforms |
|---|---|---|
| **I. Primordial** | `primordial` | Split above/below; `sunElevation` 0.12; `volumeSigma` 0.12 |
| **II. Atmosphere** | `atmosphere` | Above; `autoOrbit`; `atmosphereDensity` high; sun sweep |
| **III. Coloured Shadows** | `shadows` | Twilight dual-light; occluder rod; white floor |
| **IV. Complementary** | `contrast` | Yellow/white floor split; `physiologicalContrast` ON |
| **V. Refraction** | `refraction` | Underwater glancing; `dispersion` 0.02; low roughness |
| **VI. Double Reflection** | `double-reflect` | Calm surface; floor mirror; optional green panel |
| **VII. After-Image** | `afterimage` | Fixation mode; grey surround |
| **VIII. Faint Lights** | `twilight` | Low sun + moon + candle; `exposure` high |

**Navigation UX:** Keyboard `3`–`0` map to chapters; persistent URL hash `#chapter=shadows` for shareable demos; chapter name in stats overlay next to sample count.

---

## Cross-Cutting Implementation Notes

1. **Scene graph:** Move cube/floor/occluder/glass panel out of hard-coded `traceScene()` into uniform structs (`SceneDesc`) so chapters swap geometry without shader recompile.
2. **Honesty labels:** On-screen badge: `PHYSICAL` vs `PHYSIOLOGICAL (viewer)` per chapter — Goethe explicitly distinguished these (§302).
3. **Aristotle / Leonardo resonance (Note M, ~§5115):** "Air in depth appears blue owing to darkness beyond" — Chapter II is the project's bridge to historical colour theory; optional caption quotes in UI tooltips.
4. **Validation discipline:** Each chapter needs one **screenshot recipe** (camera position, 128 accum samples, three slider positions) stored in `notes/GROK/handoffs/` when implemented.
5. **Do not break cube invariants:** `cubeDepth` ≈ −2.2, rotation preserved; chapters adjust *lighting and surroundings*, not the sacred test body.

---

## Priority Summary

| Priority | Chapters |
|---|---|
| **P0** | Primordial (1), Atmosphere (2), Coloured Shadows (3), Refraction (5) |
| **P1** | Complementary (4), Double Reflection (6), Faint Lights (8) |
| **P2** | Physiological After-Image (7) |

**Estimated scope:** P0 = atmosphere uniform + dual-light + presets (~1–2 sessions). P1 = secondary reflections + post-process contrast + moon. P2 = fixation afterimage buffer.

The deployed Oceanscape demo already *is* a partial Goethe text — interface trapping, spectral caustics, and underwater red/green are §164–§178 made literal. This synopsis turns implicit overlap into navigable, citable chapters aligned with paragraph numbers in `THEORY_OF_COLOURS.md`.