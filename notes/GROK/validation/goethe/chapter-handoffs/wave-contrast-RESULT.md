# RESULT — wave-contrast

**Structural:** PASS  
**Visual Goethe fidelity:** PASS  
**Philosophical alignment:** §57 concerns agitated sea surfaces where lit faces read differently from opposite shadow sides (green-tending light, physiological complement in umbra). The still shows clear multi-octave wave slopes with cyan–green lit faces and reddish-purple trough/shadow fringing via `complementStrength`, not a flat grey soup or cube-as-hero frame.

**What you changed:** `src/PathTracer.ts` — only `case 'wave-contrast':` in `applyChapterPreset`

- Low side-raking sun: `sunElevation=0.16`, `sunAzimuth=0.2` (~+X cross-light), `sunIntensity=2.15`
- Fill dialed down for face contrast: `fillIntensity=0.12`
- Wave topology matching the readable sun-glitter setup: `waveAmplitude=0.12` (max), `waveFrequency=0.72`, multi-octave (default rebuild path)
- Sharp microfacet peaks: `interfaceRoughness=0.01`
- Physiological opposite in umbra: `complementStrength=0.58`
- Volume/haze cleaned so surface reads: `volumeSigma=0.025`, `turbidity=0.02`, `atmosphereDensity=0.34`, `exposure=1.42`
- Cube parked off-stage: `cubeDepth=-5.5`
- Camera over open water looking out to horizon (not look-down soup): pos `(0.05, 0.95, 4.8)` → target `(0, 0.02, -4.5)`, `fov=48`

**PNG:** `notes/GROK/validation/goethe/14-wave-contrast.png`  
**Remaining gaps:** Still-mode SAMPLES=64 leaves visible noise; full progressive accumulation would clean microfacet noise. Lit green is relation/tint (Fresnel + volume + complement) rather than a strong pigmented green face; shadow opposite is reddish via post complement mask, labeled physiological (MIXED) as intended. No other chapters touched; no push.
