# RESULT — goethe-colourless-water
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §161 holds that water has no colour of its own and that slight loss of transparency (semi-opacity) is not pigment. The still frames a large checkerboard cube through a pale, nearly colourless medium with white/neutral scatter and no bulk blue dye — colour appears only as surface relations and the cube’s own albedo, not as dyed volume.
**What you changed:** `src/PathTracer.ts` only `case 'goethe-colourless-water':` in `applyChapterPreset`
- `sceneMode` → 5 (shader floor for mode≥3 is light grey `0.9`, not default dark-blue seabed `0.05,0.08,0.12` that was misread as bulk blue dye)
- `volumeSigma` → 0.004; `turbidity` → 0.02 (slight semi-opacity per “deprived slightly of transparency”)
- `scatterTint` / `volumeTint` / `mediumTint` white; `absorptionModel` neutral
- `dispersion` → 0.008 (edge fringes only)
- `sunElevation` → 0.82, `sunAzimuth` → 0.4, `sunIntensity` → 1.7 (high white sun)
- `fillIntensity` → 0.2, `fillTint` → `[1,1,0.98]` (no cool blue fill wash)
- `atmosphereDensity` → 0.14, `mediumThickness` → 0.08 (cut Rayleigh blue-as-water)
- `waveAmplitude` → 0.018, `interfaceRoughness` → 0.02, `floorReflectance` → 0.55
- `exposure` → 1.35; `cubeDepth` → −1.7 (shorter water path)
- camera `(0.55, 2.15, 3.7)` target `cubeDepth+0.2`; `fov` → 48; above-water
- kept `renderScale = 1.0` path (chapter quality block untouched); no other cases edited
**PNG:** `notes/GROK/validation/goethe/11-goethe-colourless-water.png`
**Remaining gaps:** honest
- 64-sample still is grainy; pale field needs higher accumulation for a smoother neutral veil.
- Mild green-channel lift remains (tone-map / residual sky path; B−R ≈ 0 after fix) — not bulk blue dye, but not pure laboratory white either.
- `sceneMode` 5 also enables the stand/rod geometry; useful as a through-medium scale cue but not Goethe’s minimal vessel demo.
- Surface plane is soft/pale rather than a crisp Fresnel strip; path-tracer + above-water framing limit.
- No push; other chapter cases not edited.
