# 2026-07-09 — Underwater White Bar Fix + Customizable Seafloor Handoff

## What This Is

Research-backed implementation handoff for two linked underwater fidelity slices:

1. **Fix the atmosphere-coloured white bar** just below the water surface when going underwater.  
2. **Add a real, fully parameterised seafloor** (gravel/sand/science cards/mirror) so ocean + Goethe scenes have a bottom you can raise, lower, roughen, recolour, and re-materialise.

**Research (detail, root causes, tables):**  
`notes/GROK/handoffs/2026-07-09-underwater-whitebar-seafloor-research.md`

**North star reminder:** Simulation of light at the air–water interface. Cube remains validation geometry. Floor is substrate geometry — not a substitute for dielectric + volume math.

---

## Diagnosis (one paragraph)

Underwater near the waterline, many primary/secondary rays **fail `intersectWaterSurface`** (no near-horizontal guard, only 4 Newton steps, early abort). Misses fall through to **`envLight`** (Rayleigh sky) — same colour as the atmosphere. Neighbouring rays that hit still show the surface, so the user sees a **white sky bar between surface and underwater bulk**. Separately, the “seafloor” is a **hard-coded y=−5.8 flat plane** with sceneMode albedo only; no height, bump, gravel, or material UI — inadequate for ocean realism and for Goethe white/split/mirror bottoms.

---

## Goals

### G1 — White bar gone (P0)

- Crossing Above → Below never shows an atmosphere strip at the interface.  
- Grazing underwater look: continuous Snell window + TIR, no sky wedge from failed hits.  
- No regression on hero Snell still / northstar smoke.

### G2 — Customizable seafloor (P1)

Expose and implement:

| Control | Intent |
|---------|--------|
| Enable floor | On/off |
| Height | Raise / lower mean bed |
| Bump amp + freq (+ optional octaves) | More/less gravel / dunes |
| Albedo colour + scale | Sand tint vs white card vs abyss |
| Pattern | uniform / gravel / sand / split Y\|W / checker |
| Material | diffuse / glossy / mirror |
| Specular / roughness | Wet sand ↔ science card ↔ mirror bottom |
| Keep `floorReflectance` | §224 secondary weight |

### G3 — Goethe honesty (P1/P2)

- Shadows chapter: white flat floor via params (not only `sceneMode≥3` magic).  
- Contrast: yellow\|white split pattern.  
- Double reflect: mirror material path.  
- Colourless-water / diver: sand under cube with volume atten so depth reads as medium, not paint.

### Non-goals

- Full vase mesh / water-prism slab (later WTR).  
- Artistic ocean foam/skybox.  
- Blocking production deploy of current north-star build (this train can follow or interleave after PR-A ship).

---

## Technical Requirements

| ID | Requirement | Pri |
|----|-------------|-----|
| UB-01 | Water intersection stable for \|rd.y\| small and for wave amplitudes in use | P0 |
| UB-02 | Valid hit residual: \|hit.y − waveHeight(xz)\| below epsilon | P0 |
| UB-03 | If path medium is water and ray never exited interface, miss ≠ full air sky | P0 |
| UB-04 | Optional: medium from `cameraPos.y < waveHeight(cam.xz)` | P1 |
| SF-01 | `floorHeight` uniform replaces magic −5.8 everywhere (floor, rod, shadows, secondary tFl) | P0/P1 |
| SF-02 | Parametric albedo + patterns (uniform, gravel noise, sand, split, checker) | P1 |
| SF-03 | Bump height field + derived normals | P1 |
| SF-04 | Materials: diffuse, glossy, mirror (mirror continues path) | P1 |
| SF-05 | UI panel + `__oceanscape` getters/setters for all floor params | P1 |
| SF-06 | Volume attenuation on camera→floor when in water (parity with cube) | P1 |
| SF-07 | Optional reverse-NEE caustics on floor (reuse cube gather) | P2 |
| SF-08 | Chapter presets set floor params explicitly | P1 |
| DOC-01 | Handoff + brief README/UI tooltips: floor is substrate; water colour from physics | P1 |

---

## Implementation Plan (ordered slices)

### Slice A — White bar (do first, small blast radius)

**Files:** `pathTracer.frag.glsl` primarily; smoke re-run.

1. Guard `abs(rd.y) < ε`: near-horizontal march or safe reject without NaN.  
2. Bracket Newton against `±waveAmpBound` slab; increase iterations or add bisection.  
3. Validate residual; on failure try short ray-march along rd.  
4. `if (!hit && inWater) accum += underwaterMissRadiance(...)` — dim bulk / scatter, **not** `envLight`.  
5. Only sample full sky after medium has become air (successful transmit out) or camera in air.

**Verify:** Manual Below Water waterline; `npm run smoke`; compare 01/02/06/07.

### Slice B — Floor height + shared constant kill

1. Add `uniform float floorHeight` (default −5.8 for Goethe parity, or −3.5 ocean — decide in open Q).  
2. Replace every `-5.8` in floor/rod/shadow/secondary reflect.  
3. Wire `params.floorHeight` + UI slider + chapter presets.

**Verify:** Raise floor under cube; rod still casts on floor in shadows chapter.

### Slice C — Look & materials

1. `floorPattern`, `floorAlbedoColor`, `floorAlbedoScale`, bump uniforms.  
2. `floorAlbedo()` noise for gravel/sand; keep split + white.  
3. `floorMaterial` + specular path; mirror: reflect and continue bounce.  
4. Apply `volumeAttenuation` on floor hits when `inWater`.

**Verify:** Gravel readable under cube; white card shadows; mirror double-reflect chapter.

### Slice D — Polish + Goethe presets + optional caustics

1. Chapter `applyChapter` sets floor bundle explicitly.  
2. Preset buttons: Abyss / Sand / Gravel / White card / Mirror / Split.  
3. Optional floor caustic gather (P2).  
4. Update smoke still or Goethe observation notes.

---

## Boilerplate (starter contracts)

### Params (TypeScript)

```ts
// PathTracerParams additions
floorEnabled: boolean;
floorHeight: number;       // world Y, e.g. -3.5
floorBumpAmp: number;
floorBumpFreq: number;
floorBumpOctaves: number;  // 1..4
floorRoughness: number;
floorAlbedoColor: [number, number, number];
floorAlbedoScale: number;
floorCheckerScale: number;
floorMaterial: 0 | 1 | 2;  // diffuse | glossy | mirror
floorSpecular: number;
floorPattern: 0 | 1 | 2 | 3 | 4; // uniform gravel sand split checker
// floorReflectance already exists
```

### Defaults (ocean-first proposal)

```ts
floorEnabled: true,
floorHeight: -3.5,
floorBumpAmp: 0.06,
floorBumpFreq: 2.5,
floorBumpOctaves: 3,
floorRoughness: 0.55,
floorAlbedoColor: [0.55, 0.48, 0.32], // warm sand
floorAlbedoScale: 0.4,
floorCheckerScale: 0,
floorMaterial: 0,
floorSpecular: 0.05,
floorPattern: 1, // gravel
floorReflectance: 0.15,
```

### Shader miss policy (conceptual)

```glsl
if (!hit.hit) {
  if (inWater) {
    // Deep bulk: weak isotropic in-scatter, no clear sky
    vec3 deep = scatterTint * volumeTint * spectrumWeight(lambdaNm) * 0.02;
    accum += throughput * deep;
  } else {
    accum += throughput * envLight(ray.direction, lambdaNm);
  }
  break;
}
```

### UI block (index.html sketch)

```html
<details class="panel-section" open>
  <summary>Seafloor</summary>
  <div class="section-body">
    <label><input type="checkbox" id="floor-enabled" checked /> Floor enabled</label>
    <label>Height <input type="range" id="floor-height" min="-12" max="-0.5" step="0.1" /></label>
    <label>Bump amp <input type="range" id="floor-bump-amp" min="0" max="0.4" step="0.01" /></label>
    <label>Bump freq <input type="range" id="floor-bump-freq" min="0.1" max="8" step="0.1" /></label>
    <label>Albedo scale <input type="range" id="floor-albedo-scale" min="0.05" max="1" step="0.01" /></label>
    <label>Roughness <input type="range" id="floor-rough" min="0" max="1" step="0.01" /></label>
    <!-- pattern + material selects -->
  </div>
</details>
```

---

## PR Plan

| PR | Title | Depends | Verify |
|----|-------|---------|--------|
| **PR-UB** | Fix underwater waterline sky leak (white bar) | none | build + smoke + waterline manual |
| **PR-SF-A** | `floorHeight` + kill −5.8 magic + enable flag | PR-UB optional | shadows chapter still OK |
| **PR-SF-B** | Patterns, bump, materials, UI, volume atten | PR-SF-A | gravel + white + mirror |
| **PR-SF-C** | Chapter presets + optional floor caustics + docs | PR-SF-B | Goethe smoke narrative |

Can land PR-UB alone before production ship if white bar is visible on live; seafloor can follow.

---

## Definition of done

- [ ] No atmosphere white bar at underwater waterline (manual + smoke PNGs)  
- [ ] `npm run build` clean  
- [ ] `npm run smoke` northstar pass  
- [ ] Floor height / bump / albedo / pattern / material controllable from UI  
- [ ] Rod + floor + secondary reflect share `floorHeight`  
- [ ] Ocean default shows sand/gravel under cube (or documented abyss default)  
- [ ] Goethe shadows / contrast / double-reflect still make sense (or improved)  
- [ ] Research + this handoff committed with code  

---

## Key decisions

1. **White bar is a miss → sky bug**, not a “missing fog” feature — fix intersection + miss policy first.  
2. **Floor is substrate**, not water colour.  
3. **One height uniform** for floor, rod, shadows, secondary tFl.  
4. **Ocean default: modest gravel** under the cube so underwater feels like a place; chapters override for science cards.  
5. **Mirror is a real bounce**, not only `floorReflectance` hacks (keep hacks as cheap fill until path is solid).

---

## Hard lessons (carry forward)

1. Any path miss that samples sky will show as “atmosphere pollution” underwater.  
2. Waved surfaces need **grazing-safe** intersection or the waterline always lies.  
3. Magic constants (−5.8) couple geometry systems; one height param prevents rod/floor desync.  
4. Bright unattenuated floors underwater look like white bars of a different kind — always apply volume atten in-water.

---

## What the next session must start on

1. `/init` — this handoff + research.  
2. **Implement Slice A (white bar)** end-to-end; verify waterline.  
3. Then Slice B–C seafloor params + UI.  
4. Re-smoke northstar; optional Goethe chapter floor presets.  
5. `/done` after bar fixed + seafloor usable.

### Exact first commands

```bash
npm run build
npm run dev
# Reproduce: Below Water, look toward surface/waterline — note white bar
# After fix:
npm run smoke
```

---

## Open questions (resolve during implement)

1. Ocean default `floorHeight`: **−3.5** (near cube) vs keep **−5.8**?  
2. `floorEnabled` default on or off for pure open-water Snell demos?  
3. Ship PR-UB before or after production north-star deploy PR-A/B?

---

## Related artifacts

| Artifact | Role |
|----------|------|
| `2026-07-09-underwater-whitebar-seafloor-research.md` | Full diagnosis + param tables |
| `2026-07-09-northstar-visual-deploy-handoff.md` | Ship gate (orthogonal; don’t block forever) |
| `goethe-water-synopsis.md` / REQ docs | Floor patterns for GTC/WTR |
| `src/shaders/pathTracer.frag.glsl` | Intersection, floor, envLight |
| Live target | https://pranavsai142.github.io/raytracing/ |

---

*End of handoff. Research is the deep dive; this file is the execution contract. Slice A first.*
