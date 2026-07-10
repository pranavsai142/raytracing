# RESULT — shadows
**Structural:** PASS
**Visual Goethe fidelity:** PASS
**Philosophical alignment:** §76 — principal (warm sun) tints the lit floor; contrary (cool fill) occupies the sun umbra → blue shadow; warm sun occupies the fill umbra → yellow shadow; umbrae cross darker at the rod base. Dual-light stick-on-floor geometry makes “contrary light fills the shadow” readable without painted pigment.
**What you changed:**
- `src/PathTracer.ts` — `case 'shadows':` only
  - Warm sun elev/az `0.38` / `0.9`, intensity `2.25`
  - Cool contrary fill dir `[-0.75, 0.5, -0.4]`, tint `[0.12, 0.32, 1.0]`, intensity `1.4`
  - Clear volume (`volumeSigma 0.003`), calm waves (`0`), cube parked below floor (`cubeDepth -9`)
  - In-water camera close above white floor framing rod + both umbra fans
  - Exposure `1.15`, FOV `48`
- `src/shaders/pathTracer.frag.glsl` — **shared rod bug** (required for §76; not a chapter-preset tweak)
  - `intersectRod` / `shadowedByRod` were sphere math with a Y clip → pinhead occluder, no elongated dual shadows
  - Replaced with finite vertical cylinder (r=`0.09`, y ∈ `[-5.8, -3.8]`) so the stick casts long umbrae
**PNG:** `notes/GROK/validation/goethe/04-shadows.png`
**Remaining gaps:**
- Floor lighting is direct dual-light NEE (MIXED), not full underwater caustic transport of sun/fill through the interface.
- Rod is matte black (albedo 0.02), not a naturalistic stick; pedagogy over material realism.
- Overlap umbra is dark but thin where the two coloured bands meet at the base; classical textbook diagrams exaggerate the neutral cross region.
- Cylinder radius increased slightly (0.09) for didactic width; other sceneMode≥3 chapters that use the rod inherit this geometry.
