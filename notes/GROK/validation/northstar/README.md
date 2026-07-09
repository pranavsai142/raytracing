# North-star visual validation

Captures that the path tracer is doing the **ocean light physics** job — not just a pretty UI.

## What we are proving

From `SOUL_DRIVER.md`:

1. **Snell / Fresnel** at the air–water interface
2. **TIR trapping** — light underwater stays down until the angle allows escape (this is why the ocean has light at depth)
3. **Caustics** from wave topology + spectral dispersion (emergent, not painted)
4. **Submerged cube** as sacred validation geometry

**Hero still:** `07-still-look-up-snell.png` — bright Snell escape cone, dark TIR outside critical angle, cube below.

## LIVE vs STILL (the spotty-look fix)

| Mode | When | What you see |
|------|------|----------------|
| **LIVE** | Animate Scene ON (default) | Realtime path-trace every frame. Noisy. **No temporal blend** — waves/cube move without ghosting. |
| **STILL** | Animate Scene OFF | Freezes waves **and** cube. Progressive Monte Carlo 1/N until max samples. Clean caustics/TIR. |

**Root causes fixed this push:**

1. Blending history while wave phase + cube rotation still changed → ghost/spotty.
2. Default cameras looked along **+Z into empty water** → cube often invisible.

## How to smoke

```bash
npm run dev          # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke        # terminal B — writes PNGs + SMOKE_REPORT.md here
```

Env: `SAMPLES=64`, `BASE_URL=...`, `HEADED=1`. API: `window.__oceanscape`.
