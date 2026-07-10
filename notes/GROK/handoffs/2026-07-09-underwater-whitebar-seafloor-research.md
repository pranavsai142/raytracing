# Research — Underwater White Bar + Customizable Seafloor

**Date:** 2026-07-09  
**Trigger:** User report — bright atmosphere-coloured band just below the water surface when going underwater; desire for a real gravel/sand seafloor with full parameter control; Goethe scene fidelity.  
**Scope:** Code-first diagnosis of the white bar, inventory of current floor system, Goethe requirements mapping, recommended design.  
**Handoff:** `2026-07-09-underwater-whitebar-seafloor-handoff.md`

---

## 1. User-visible problem (white bar)

**Symptom (paraphrased):** Immediately after going underwater, a **white / sky-coloured horizontal bar** sits between the visible water surface and the true underwater volume. The surface itself is still visible “under” or “through” that band. Colour matches atmosphere/sky, not water bulk.

**Why this matters for north star:** Underwater framing is the Snell/TIR proof. A sky leak at the interface reads as “broken medium” and steals attention from trap/escape and the cube.

---

## 2. Current geometry contracts (as implemented)

| Object | How it works today | Hard-coded? |
|--------|--------------------|-------------|
| Water interface | Infinite waved plane via Newton-style iteration on `waveHeight` | Surface at ~y=0 + waves |
| Cube | AABB half-extent 0.75, centre `(0, cubeDepth, 0)` | Depth is a param; size fixed |
| Floor | Infinite plane at **y = −5.8** | Yes — magic constant |
| Rod (Goethe shadows) | Cylinder x=0.5, y ∈ [−5.8, −3.8] | Yes — tied to −5.8 |
| Grey plane (afterimage) | Finite plane y=1.5, sceneMode 7 | Chapter-only |
| Miss rays | `envLight` → Rayleigh sky + sun/moon | Atmosphere-coloured |

**Floor albedo today** (`floorAlbedo` in `pathTracer.frag.glsl`):

| `sceneMode` | Albedo |
|-------------|--------|
| 0–2 (default ocean) | Dark blue-grey `vec3(0.05, 0.08, 0.12)` — flat “abyss paint” |
| ≥ 3 | Near-white `0.9` (shadow / vessel demos) |
| 4 | Split yellow \| white (contrast chapter) |

**UI today:** only `floorReflectance` (secondary air-side bounce weight for §224). **No** floor height, roughness, gravel scale, albedo colour, material mode, enable toggle.

---

## 3. Root-cause analysis — white bar

Primary path when a ray **misses all geometry**:

```glsl
if (!hit.hit) {
  accum += throughput * envLight(ray.direction, lambdaNm); // ← sky / atmosphere
  break;
}
```

That is the exact colour family the user describes. So the bar is almost certainly **sky sampled for rays that should have hit the underside of the water interface (or stayed in-water with volume attenuation)**.

### 3.1 Strongest cause — fragile water surface intersection

```162:176:src/shaders/pathTracer.frag.glsl
bool intersectWaterSurface(vec3 ro, vec3 rd, out float t, out vec3 hitN, out vec2 hitXZ) {
  t = (-ro.y) / rd.y;
  if (t < 0.001 || t > 200.0) return false;
  for (int i = 0; i < 4; i++) {
    vec3 p = ro + rd * t;
    hitXZ = p.xz;
    float h = waveHeight(hitXZ, time);
    t = (h - ro.y) / rd.y;
    if (t < 0.001) return false;
  }
  ...
}
```

**Defects that create a horizon/waterline band of misses:**

1. **No `rd.y ≈ 0` guard** — near-horizontal primary/secondary rays divide by a tiny component → unstable `t`, false miss.
2. **Only 4 fixed iterations** from flat-plane guess — grazing angles + multi-component waves often fail to converge; early `t < 0.001` aborts.
3. **No geometric bounds on wave height** — solver does not clamp search to `[minWave, maxWave]` slab; rays that skim the crest/trough band leak.
4. **No medium-aware fallback** — underwater, a miss of the *interface* should still not sample *air sky* without a proper medium exit. Today any miss → full `envLight`.

**Why it looks like a “bar just below the surface”:**  
From an underwater camera (default y ≈ −0.6…−1.0), screen rows near the **visual waterline** are exactly the **grazing / near-horizon** rays that stress this solver. Successful hits still draw the waved surface; failed hits paint a thin strip of atmosphere. That matches “surface still visible underneath/above a white bar.”

### 3.2 Contributing cause — medium flag is camera-Y only

```glsl
bool inWater = cameraPos.y < 0.0; // not wave-height-aware
```

Waves displace the interface by ±amplitude. Camera slightly below y=0 can be **above** a trough or **below** a crest inconsistently vs geometry. This does not alone paint sky, but it mis-attenuates volume and can couple with bad spawns after bounce.

### 3.3 Contributing cause — post-bounce spawn on wave height

After interface events, origin is reset to `(xz, waveHeight) + nextDir * 0.002`. With microfacet normals and roughness, origin can land on the **wrong side** of the true surface for the next ray → next `traceScene` misses the interface and hits sky.

### 3.4 Weaker / secondary

| Hypothesis | Verdict |
|------------|---------|
| Floor y=−5.8 too deep → empty dark | Real, but colour is dark, not atmosphere white |
| Tone map / exposure clipping | Would wash whole frame, not a thin band |
| Accum blend ghost | LIVE already no history; band is spatial not temporal |
| Atmosphere density alone | Only appears when `envLight` is actually sampled |

### 3.5 Recommended fix order (white bar)

| Priority | Fix | Why |
|----------|-----|-----|
| P0 | Harden `intersectWaterSurface` | Directly removes miss → sky band |
| P0 | Underwater miss policy | If `inWater` and ray never exits interface, do **not** use full air `envLight`; use dark/attenuated in-scatter or retry |
| P1 | Slab bounds + more Newton steps / binary refine | Grazing stability |
| P1 | Medium from **local wave height** at camera (`cameraPos.y < waveHeight(cam.xz)`) | Consistent side |
| P2 | Robust spawn offset along geometric normal | Reduce light leaks after bounce |

**Concrete intersection hardening sketch:**

```glsl
bool intersectWaterSurface(vec3 ro, vec3 rd, out float t, out vec3 hitN, out vec2 hitXZ) {
  // Avoid horizon singularity
  if (abs(rd.y) < 1e-4) {
    // Optional: ray-march in XZ along near-horizontal path against waveHeight
    // or return false only after march fails
  }
  float ampMax = /* sum of component amps or uniform waveAmpBound */;
  // Bracket t against plane ± ampMax, then Newton or bisection
  // Validate: |ro.y + rd.y*t - waveHeight(p.xz)| < epsilon
  // Reject if residual large → march fallback
}
```

**Underwater env policy sketch:**

```glsl
if (!hit.hit) {
  if (inWater) {
    // Still underwater: trapped/dark bulk, not clear sky
    accum += throughput * underwaterMissRadiance(ray.direction, lambdaNm);
  } else {
    accum += throughput * envLight(ray.direction, lambdaNm);
  }
  break;
}
```

Where `underwaterMissRadiance` is low-luminance deep water / optional weak scatter — **never** the open Rayleigh sky unless a successful water→air refraction already flipped medium.

**Acceptance (white bar):**

- [ ] Cross surface (Above → Below) with Animate on: no atmosphere-coloured strip between surface and bulk.
- [ ] Grazing look-up / look-across near waterline: continuous Snell cone + TIR dark, no white wedge.
- [ ] Hero still `07-still-look-up-snell` still shows bright cone + dark TIR (no regression).
- [ ] Smoke scenes 01, 02, 06, 07 regenerate without new bright horizon bar.

---

## 4. Seafloor today vs desired

### 4.1 What exists

- Infinite **flat** plane at y=−5.8  
- Diffuse Lambert-ish lighting (sun + fill + rod shadow)  
- SceneMode-driven albedo (dark paint / white / split)  
- `floorReflectance` only for **secondary** air-side reflection estimate (not a full BRDF)

### 4.2 What users / Goethe need

| Need | Source | Today |
|------|--------|-------|
| Sand / gravel seabed under cube | North star realism + Demo A (colourless water over bright seabed) | Dark flat paint |
| Raise / lower floor | Vessel elevation, diver depth, cube-on-bottom | Fixed −5.8 |
| Bump / roughness | Real gravel catches caustics; not mirror-smooth | None |
| Albedo colour + scale | Warm sand vs grey gravel vs white card | sceneMode only |
| White floor for dual shadows | GTC-03 rod shadows | sceneMode ≥ 3 |
| Yellow\|white split | GTC-04 contrast | sceneMode == 4 |
| Mirror / high-reflect bottom | WTR-06 / §224 double reflection | Approx secondary path only |
| Optional disable | Open-ocean abyss demos | Always on |

### 4.3 Proposed parameter surface (full customizability)

All exposed via `PathTracer.params`, uniforms, UI panel **Scene / Seafloor**, and `__oceanscape` for smoke.

| Param | Type | Range (suggest) | Role |
|-------|------|-----------------|------|
| `floorEnabled` | bool | on/off | Infinite plane on/off |
| `floorHeight` | float | −12 … −0.5 | World Y of mean floor (replaces −5.8) |
| `floorBumpAmp` | float | 0 … 0.4 | Procedial height noise amplitude |
| `floorBumpFreq` | float | 0.1 … 8 | Spatial frequency of gravel/sand |
| `floorBumpOctaves` | int | 1 … 4 | Multi-octave gravel vs dunes |
| `floorRoughness` | float | 0 … 1 | Microfacet / normal scatter on bounce |
| `floorAlbedoColor` | vec3 | RGB | Base sand/gravel tint |
| `floorAlbedoScale` | float | 0.05 … 1 | Brightness (0.05 ≈ abyss, 0.9 ≈ white card) |
| `floorCheckerScale` | float | 0 … 8 | Optional checker/grid for science; 0 = off |
| `floorMaterial` | enum | `diffuse` \| `glossy` \| `mirror` | BRDF class |
| `floorSpecular` | float | 0 … 1 | Specular weight when glossy/mirror |
| `floorReflectance` | float | keep | Secondary §224 weight (already exists) |
| `floorPattern` | enum | `uniform` \| `gravel` \| `sand` \| `splitYw` \| `checker` | Goethe + realism presets |
| `floorSplitAxis` | float | x=0 default | Yellow\|white boundary |

**Shader floor intersection (bumpy):**

- Start with plane hit at `floorHeight`.  
- Optional 2–4 Newton steps: `t ← (floorHeight + bump(xz) − ro.y) / rd.y` (same family as water, but lower frequency → more stable).  
- Normal from bump derivatives.  
- Rod Y extent and shadow tests must use **`floorHeight`**, not −5.8.

**Material behaviours:**

| Mode | Behaviour | Goethe use |
|------|-----------|------------|
| `diffuse` | Lambert + sun/fill/caustic gather optional | Ocean gravel, white card |
| `glossy` | Blinn/GGX-ish with `floorRoughness` | Wet sand glints |
| `mirror` | Specular bounce continues path | §224 vase / double reflect bottom |

**Caustics on floor (realism bonus, P1):**  
Reuse reverse-NEE pattern from cube (sample surface → Snell → sun) so gravel shows focused bright patches — strong “real underwater” signal without faking.

### 4.4 Default / chapter presets (suggested)

| Context | floorHeight | pattern | albedoScale | bump | material |
|---------|-------------|---------|-------------|------|----------|
| Ocean default | −3.5 (closer to cube at −2.2) | gravel | 0.35 warm sand | med | diffuse |
| Colourless water demo | −3.0 | sand | 0.55 | low | diffuse |
| Shadows (III) | −5.8 keep or −4.5 | uniform white | 0.9 | 0 | diffuse |
| Contrast (IV) | −5.8 | splitYw | 0.92 | 0 | diffuse |
| Double reflect | −2.5 | uniform | 0.8 | 0 | mirror + high floorReflectance |
| Vessel elevation | just under cube | sand | 0.7 | low | diffuse |
| Open abyss (optional) | enabled=false or height −12, scale 0.05 | uniform | low | 0 | diffuse |

**Cube relationship:** Keep cube sacred. Prefer `floorHeight < cubeDepth − 0.75` so cube rests **on or above** floor, not intersecting. Optional later: snap cube to rest on floor (`cubeDepth = floorHeight + 0.75 + settle`).

---

## 5. Goethe mapping (what seafloor unlocks)

From `goethe-water-synopsis.md`, `REQ-goethe-water.md`, `REQ-goethe-theory-of-colours.md`:

| Demo / REQ | Floor need | White-bar fix need |
|------------|------------|--------------------|
| Demo A colourless water / depth yellowing | Bright sand seabed + depth path | Clean underwater view |
| GTC-03 dual coloured shadows | White flat floor + rod | Clean waterline for underwater variant |
| GTC-04 yellow\|white split | Pattern mode | — |
| WTR-04 vessel elevation | Raised bottom readable | — |
| WTR-06 mirror-bottom double reflect | `floorMaterial=mirror` | — |
| Diver / Snell north star | Optional dim gravel for scale | **Critical** |
| §151 blue as darkness through medium | Dark floor under illumined water (not sky leak) | Sky leak currently fakes “bright medium” |

**Integrity rule (SOUL_DRIVER):** Floor is geometry + BRDF. Water colour must still emerge from path length / absorption / interface — **not** from painting the floor blue and calling it ocean.

---

## 6. Extra realism knobs (worth including if cheap)

Beyond user-requested height/bump:

1. **Floor caustic gather** (above) — highest impact  
2. **Wetness / Fresnel on floor** when shallow (view-dependent darken + specular)  
3. **Absorption on camera→floor path** already via volume — ensure floor hits apply `volumeAttenuation(hit.dist)` when `inWater` (today floor path does **not** clearly apply the same god-beam/atten as cube — check & unify)  
4. **Finite seafloor disk** optional (`floorRadius`) so horizon is water-volume not infinite plane (advanced)  
5. **UI section** “Seafloor” next to Scene/Cube with presets: Abyss / Sand / Gravel / White card / Mirror / Split Y|W  

**Volume atten on floor (bug/gap):** Cube applies `volumeAttenuation` when `inWater`; floor lighting block does not multiply path attenuation the same way. Deep floor can look unnaturally bright/white underwater — related to “white” complaints if floor is bright and shallow-looking.

---

## 7. Files that will change (implementation map)

| File | White bar | Seafloor |
|------|-----------|----------|
| `src/shaders/pathTracer.frag.glsl` | intersection, miss policy, medium | intersectFloor, albedo, BRDF, uniforms |
| `src/PathTracer.ts` | maybe medium helper | params, uniforms, chapter presets |
| `src/ui.ts` + `index.html` | — | sliders / toggles / presets |
| `scripts/visual-smoke.mjs` | assert no horizon bar (optional pixel check) | floor-visible scene |
| `notes/GROK/validation/northstar/` | re-smoke 01/02/06/07 | new still optional |
| Goethe chapter presets | underwater cleaner | white/split/mirror floors via params not magic −5.8 |

---

## 8. Risks & non-goals

| Risk | Mitigation |
|------|------------|
| Bumpy floor Newton as bad as water | Low amp/freq first; plane fallback |
| Breaking Goethe rod Y extent | Single `floorHeight` uniform shared by rod + floor + shadows |
| Mirror floor fireflies | Clamp bounces; roughness floor for mirror |
| Repo / ship distraction | White-bar P0 can ship alone; seafloor P1 |
| Fake blue water via floor | Document sand albedos as **substrate**, not medium colour |

**Non-goals for this train:**  
Full vase mesh, water-prism slab, WebGPU, ML denoise, perfect unbiased MIS.

---

## 9. Verification plan

1. **Manual:** Toggle Below Water repeatedly; orbit near waterline; capture PNG.  
2. **Regression:** `npm run build && npm run smoke` — northstar scenes.  
3. **New still (optional):** `08-still-underwater-waterline.png` — crop waterline, no sky bar.  
4. **Seafloor:** raise floor under cube; bump on/off; white card shadows chapter; mirror double-reflect.  
5. **Goethe smoke:** shadows / contrast / double-reflect / colourless-water still pass narrative checklists.

---

## 10. Open questions

1. Default floor height: keep −5.8 for Goethe parity, or move ocean default closer to cube (−3.5)?  
2. Should ocean default be gravel-on, or abyss-off until user enables? (Recommend **gravel on, modest bump** for north-star underwater.)  
3. Mirror floor: full path continuation vs cheap secondary weight only? (Recommend full for §224 honesty.)  
4. CI pixel assert for white bar — brittle; keep human + smoke PNG for now?

---

## 11. Summary

| Topic | Finding |
|-------|---------|
| White bar | High confidence: **missed water intersection near waterline → `envLight` sky**. Fix intersection + underwater miss policy. |
| Floor | Exists as fixed y=−5.8 flat plane with sceneMode albedo; **not** a customizable seafloor. |
| Goethe | White / split / mirror bottoms are first-class REQs; gravel sand unlocks Demo A realism. |
| Order | P0 white bar → P1 parametric seafloor + UI → P2 caustics/wetness/mirror path. |

*Research complete. Implementation contract lives in the companion handoff.*
