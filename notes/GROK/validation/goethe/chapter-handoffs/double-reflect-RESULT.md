# RESULT — double-reflect
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §224 — “Separated reflections are weak and shadowy.” Calm near-flat water frames a clear primary checkerboard cube; a soft blue-grey secondary of the stand/floor path sits beside and under the cube, weaker and more shadowy than the primary — matching Goethe’s double-reflection observation without inventing a second solid cube image.
**What you changed:** `src/PathTracer.ts` only `case 'double-reflect':` in `applyChapterPreset`
- `waveAmplitude` → 0.005 (near-calm; tiny slope so shader secondary floor path can fire)
- `waveFrequency` → 0.22, `waveSpeed` → 0.15
- `secondaryReflectWeight` 0.55 → 0.95 (secondary path readable but still soft)
- `floorReflectance` 0.35 → 0.85
- `interfaceRoughness` 0.01 → 0.015 (mild microfacet, not choppy)
- `volumeSigma` → 0.014, `turbidity` → 0.01 (clearer so cube + ghost read)
- `atmosphereDensity` → 0.26, `mediumThickness` → 0.16 (less haze washout)
- `sunElevation` 0.55 → 0.4, `sunAzimuth` → 0.75, `sunIntensity` → 1.8
- `exposure` 1.35 → 1.32, `fillIntensity` → 0.16, `maxBounces` → 9
- camera `(0.5, 1.35, 3.8)` → `(1.15, 1.2, 4.0)`; target `(0, -0.4, 0)` → `(0, -0.55, -0.15)`; `fov` 50 → 48
- kept `renderScale = 1.0` path (chapter quality block untouched); no other cases edited
**PNG:** `notes/GROK/validation/goethe/08-double-reflect.png`
**Remaining gaps:** honest
- Smoke still is 64 samples: grain; soft secondary needs higher accum to fully separate from fog.
- Secondary is stand/floor path + volume-softened ghost, not a crisp second cube face (shader adds a fixed dark floor contribution on external reflect, not a true dual-surface plate image of the checkerboard).
- Pale field still reads somewhat foggy rather than a hard mirror plane; path-tracer limit with calm water + above-water framing.
- No push; other chapter cases not edited.
