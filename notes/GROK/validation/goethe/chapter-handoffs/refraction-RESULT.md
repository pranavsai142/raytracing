# RESULT — refraction
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §227 holds that displacement at refracting boundaries produces colour (not bulk pigment). The hero frames a checkered cube near a sharp air–water interface so the silhouette meets Snell bright / TIR dark; wavelength-dependent IOR (`dispersion` maxed) drives spectral edges and chromatic caustics rather than painted rainbows.
**What you changed:** `src/PathTracer.ts` only `case 'refraction':` in `applyChapterPreset`
- `cubeDepth` −2.2 → −1.7 (cube nearer interface so boundary displacement reads)
- `dispersion` 0.028 → 0.05 (UI max — λ-dependent IOR fringes / chromatic caustics)
- `interfaceRoughness` 0.015 → 0.008 (sharper water plane)
- `maxBounces` 9 → 10
- `waveAmplitude` 0.07 → 0.035 (mild caustic topology without washout)
- `sunElevation` 0.7 → 0.92, `sunAzimuth` → 0.28, `sunIntensity` → 1.9
- `exposure` 1.4 → 1.5; `volumeSigma` → 0.022; `fillIntensity` → 0.22
- camera `(0.4, -0.45, 2.9)` → `(0.25, -0.48, 2.95)`; target `cubeDepth+0.35`; `fov` 58 → 54
- kept `renderScale = 1.0` path (chapter quality block untouched)
**PNG:** `notes/GROK/validation/goethe/07-refraction.png`
**Remaining gaps:** honest
- 64-sample still is grainy; true red/blue edge fringes and fine chromatic caustics need higher accumulation to fully separate from spectral Monte Carlo noise.
- Underwater opaque-cube view shows dispersion mainly as warm caustic shifts on faces + interface glints, not textbook prismatic accessory images (Goethe’s subjective prism experiments).
- Surface band is readable but thin; trading more Snell window for less cube would weaken the circumscribed-object cue §227 requires.
- No push; other chapter cases not edited.
