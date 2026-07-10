# RESULT — shadows-underwater
**Structural:** PASS
**Visual Goethe fidelity:** PARTIAL
**Philosophical alignment:** §78 — divers under sunlight in the diving-bell see a red-biased field with green shadows (complement of the warm surround). This preset makes the dual-light reading on the submerged cube: warm/olive sun-lit checkers vs cooler teal–green fill-lit flanks, with physiological `complementStrength` boosting dark umbrae green. The overall ambient still leans mint rather than full Goethe “everything in red light,” limited by underwater miss/floor paths that lack beer reddening.
**What you changed:**
- `src/PathTracer.ts` — `case 'shadows-underwater':` only
  - High sun elev/az `0.88` / `0.35`, intensity `2.0` (diving-bell sunlight)
  - Green contrary fill dir `[0.25, 0.35, 0.9]`, tint `[0.3, 0.98, 0.45]`, intensity `0.72`
  - Beer absorption + `sigmaLambda [0.02, 0.2, 0.85]`, `volumeSigma 0.11`, `turbidity 0.14`
  - Warm scatter/volume/medium tints for red-biased paths (`mediumTint [1.9, 0.5, 0.28]`)
  - `complementStrength 0.8` for green-tending dark umbrae (MIXED badge)
  - Deeper eye `(0.55, -1.05, 3.35)` looking slightly up at cube + surface band; FOV `52`, exposure `1.45`, calm waves `0.02`
**PNG:** `notes/GROK/validation/goethe/05-shadows-underwater.png`
**Remaining gaps:**
- Full-frame red “diving-bell” field is only partial: surface band warms peach; bulk mid-water/env still mint-green (miss rays skip volume attenuation; floor lighting has no beer path filter).
- Cube top can read dark purple rather than sun-warm depending on rotation/caustic gather; warm vs green is clearest on front flanks.
- Green shadows are dual-light fill + labeled complement post, not pure water pigment (correct MIXED honesty; toggle complement off for physical-only dark umbrae).
- `mediumTint` / `sigmaLambda` / `volumeTint` are not reset in the shared `applyChapterPreset` header (pre-existing leak pattern); this case sets them explicitly.
