# RESULT — vessel-elevation
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §187 elevation (*hebung*): looking diagonally into a vessel of water, the bottom appears raised by refraction without the eye noticing the bent path. The still frames an air-side diagonal look-down through calm clear water at a submerged checkerboard cube (and floor/rod bottom cues); physical IOR refraction raises apparent depth. Calm clear medium, not a random ocean seascape.
**What you changed:** `src/PathTracer.ts` only `case 'vessel-elevation':` in `applyChapterPreset`
- `sceneMode` → 5 (light floor + rod as vessel-bottom scale cues; not dark seabed void)
- `volumeSigma` → 0.005; `turbidity` → 0.015 (slight path presence, not murk)
- `scatterTint` / `volumeTint` / `mediumTint` white; `absorptionModel` neutral; `waterIOR` 1.33
- `cubeDepth` → −1.55 (submerged; air→water refract raises apparent position)
- `waveAmplitude` → 0.006, `waveFrequency` → 0.28, `waveSpeed` → 0.2 (near-calm; mild caustic cue)
- `interfaceRoughness` → 0.014; `floorReflectance` → 0.85
- `atmosphereDensity` → 0.22; `mediumThickness` → 0.12
- `sunElevation` → 0.78, `sunAzimuth` → 0.42, `sunIntensity` → 1.85
- `fillIntensity` → 0.18, `fillTint` → `[1,1,0.98]`; `exposure` → 1.4; `dispersion` → 0.012; `maxBounces` → 9
- camera `(0.95, 1.95, 3.85)` target `cubeDepth+0.45` (diagonal look over “rim”); `fov` → 50; above-water
- kept `renderScale = 1.0` path (chapter quality block untouched); no other cases edited
**PNG:** `notes/GROK/validation/goethe/13-vessel-elevation.png`
**Remaining gaps:** honest
- 64-sample still is grainy; pale clear field needs higher accumulation for a cleaner vessel reading.
- Calm clear water at moderate incidence shows almost no Fresnel strip, so the air–water plane is soft/implicit rather than a hard vessel rim (Goethe’s cubical vessel walls are not geometry in this tracer).
- Elevation is physically present via Snell refraction but has no dry side-by-side reference in-frame; the “raised bottom” is a single wet view, not the empty-vs-filled pour demo from the text.
- Rod lives on the deep floor band (`y≈−5.8…−3.8`) and reads as a stand/scale cue, not a true vessel wall.
- No push; other chapter cases not edited.
