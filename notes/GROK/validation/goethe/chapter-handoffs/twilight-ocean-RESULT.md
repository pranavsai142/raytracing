# RESULT — twilight-ocean
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §75 — Harz sunset transposed to ocean: low warm residual light (red–orange vapour / golden sky) with sea-green / emerald tendency in shadowed and fill-lit regions under residual sky light, not midday white water or black void umbrae. MIXED badge correct (dual-light fill + complement post, not pure pigment).
**What you changed:**
- `src/PathTracer.ts` — `case 'twilight-ocean':` only
  - **Root cause:** preset only set `timeOfDay=0.32` + exposure ≥1.9; default cool fill + pale haze → washed cyan field with dark non-green blobs; no red residual or sea-green contrary.
  - **TOD:** keep `timeOfDay=0.32` (sea-green phase) then override sun beyond pure TOD table so residual actually reads: elev `0.07`, az `1.05`, intensity `1.9`.
  - **Warm residual vapour:** `mediumTint [1.35, 0.62, 0.35]`, `atmosphereDensity 0.38`, `mediumThickness 0.55`, `turbidity 0.12`, `volumeSigma 0.01`.
  - **Sea-green contrary:** `fillTint [0.15, 0.98, 0.5]`, intensity `1.25`, dir `[-0.9, 0.35, -0.25]` (anti-sun); `complementStrength 0.8`.
  - **Framing / clarity:** exposure `1.48`, calm waves `0.04`, `interfaceRoughness 0.022`, `cubeDepth -1.4`, `floorReflectance 0.65`; camera `(0.45, 0.95, 3.9)` → target `(0, 0, -0.2)`, FOV `53`.
  - `renderScale` left at chapter quality block `1.0` (smoke `RENDER_SCALE=1`).
**PNG:** `notes/GROK/validation/goethe/15-twilight-ocean.png`
**Remaining gaps:**
- Submerged-cube lighting is caustic/ambient-dominated; dual warm-lit vs emerald-fill faces are softer than textbook dual-umbra floor sticks (§76 shadows chapter).
- Sea-green reads more as field / fill + complement on the cube than as discrete light cast shadows on snow (Goethe’s Harz geometry).
- Sparse dark mid-distance surface marks remain at 64 spp; path-trace grain at smoke `SAMPLES=64` / `SPP=2`.
- No other chapters edited; no push.
