# Plan: Wave presets + amp physics + Auto Orbit UI sync

**Branch:** `feat/wave-advanced-goethe-smoke` (continue)

## Task 1 — Wave Advanced: more presets, amp limits, physics shakeout

### Problems
- Amplitude can go too high (macro max 0.25, comp max 0.5); multi-octave **sums** amps → wild peaks and insane slopes (`∂h ∝ A·k`).
- Few presets; user wants more diverse eye-readable situations.
- Need clamp + sensible defaults so Snell/TIR topology stays pedagogical, not broken.

### Spec

1. **Hard limits (CPU + UI):**
   - Macro `waveAmplitude` max **0.12** (default stays ~0.08).
   - Per-component amp max **0.12** (UI + clamp on write/pack).
   - Soft **total peak budget**: sum of |amp| ≤ **0.22** (or normalize/scale down on pack if over) so 4-octave stack can’t explode.
   - Cap slope pressure: when packing, clamp effective `amp * frequency` per component if needed (e.g. max `amp*freq ≤ 0.35`) OR reduce amp to satisfy — document choice.
   - Freq ranges stay wide enough for multi-octave harmonics but defaults stay gentle.

2. **Clamp on every path:** packWaveUniforms, component edit, macro rebuild, setWavePreset, add component.

3. **More presets** (diverse, all moderate amp):

| id | Visual intent |
|----|----------------|
| `multi-octave` | Current ocean (macros; ensure within new limits) |
| `single-sine` | One pure traveling sine |
| `standing` | One standing wave |
| `calm` | Near-flat, tiny swell (amp ~0.02) |
| `long-swell` | Long wavelength, moderate amp, 1–2 dirs |
| `chop` | Short choppy high-freq low-amp multi |
| `cross-sea` | Two traveling components ~90° apart |
| `opposing` | Two counter-propagating (standing-like interference) |
| `ripple` | Tiny high-freq ripples |
| `dual-standing` | Two standing waves different dirs |
| `flat` | Zero amp (calm mirror) |
| `custom` | User-owned |

4. **UI:** Expand `#wave-preset` options with clear labels + data-tips on select/summary. Preset change uses `setWavePreset` with builders that set **both** macros and components sensibly.

5. **Builders:** Add `buildWavePresetComponents(preset, macros?)` or individual builders; keep multi-octave legacy ratios but under amp budget.

6. **Shader:** Prefer no math change unless a slope clamp is chosen in GLSL; CPU clamp is enough if limits are tight. Optional: soft normalize height — **prefer CPU only**.

7. **Verify:** `npm run build`. Spot-check defaults not crazy. No push.

### Files
- `src/PathTracer.ts`, `src/ui.ts`, `index.html`, maybe `pathTracer.frag.glsl` only if needed

---

## Task 2 — Auto Orbit button sync when Animate off

### Bug
`setAnimateScene(false)` / `freezeForCapture()` set `params.autoOrbit = false` but **Auto Orbit button** still shows ON until `applyParamsToUI` runs.

### Spec
1. When Animate is unchecked (or freezeForCapture / setAnimateScene(false)), force autoOrbit false **and** update button text/class to OFF.
2. Extract small `syncAutoOrbitButton(tracer)` used by animate checkbox, freeze API paths if UI can reach them, and keep `applyParamsToUI` using the same helper.
3. Optional: turning auto orbit ON while animate is off should either re-enable animate LIVE or refuse orbit (prefer: enabling Auto Orbit turns Animate on + LIVE so state is consistent). Document choice.

### Files
- `src/ui.ts` primarily; maybe `main.ts` freezeForCapture if it needs UI sync callback

### Verify
- Manual logic: start chapter with autoOrbit (atmosphere), uncheck Animate → button says OFF and orbit stops.
- `npm run build`
