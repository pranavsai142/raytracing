# Oceanscape Web

Browser path tracer for **accurate light transport at the air–water interface**.  
Simulation, not a stylized ocean shader. Phenomena emerge from Fresnel, Snell, TIR, waves, and volume math.

**Live:** https://pranavsai142.github.io/raytracing/  
*(Redeploy after the 2026-07-09 visual contract lands on `main`.)*

## North star

Literally reproduce light at the water surface:

- Specular reflection, **Snell** refraction, **TIR** (light trapped underwater until the angle allows escape)
- **Caustics** and god rays from path-traced transport + volume scatter
- Submerged **rotating checkerboard cube** as validation geometry

Hero still (local smoke): `notes/GROK/validation/northstar/07-still-look-up-snell.png` — bright Snell cone, dark TIR ring, cube below.

## LIVE vs STILL (critical)

| Mode | Control | Behavior |
|------|---------|----------|
| **LIVE** | Animate Scene **ON** (default) | Realtime path-trace every frame. Noisy. **No temporal ghosting.** |
| **STILL** | Animate Scene **OFF** | Freezes waves **and** cube. Progressive Monte Carlo until sample budget. Clean stills. |

If the image looked “spotty” before: we were blending history while the scene still moved. Uncheck Animate to freeze, or stay LIVE for honest realtime noise.

## Features

- Dielectric interface path tracer (Fresnel / Snell / TIR)
- Animated waves + submerged cube
- Volume scattering (god rays)
- Goethe Theory of Colours chapter shell (expansion layer)
- Above / below views, auto-orbit, PNG export
- Playtest API: `window.__oceanscape`

## Development

```bash
npm install
npm run dev          # http://127.0.0.1:5173/raytracing/
npm run build
npm run smoke        # Playwright north-star visual suite (dev server must be up)
```

Env for smoke: `SAMPLES=64`, `HEADED=1`, `BASE_URL=http://127.0.0.1:5173/raytracing/`

## Deploy

Canonical: **push to `main`** → GitHub Actions (`.github/workflows/deploy.yml`) → Pages.

```bash
npm run build
# fallback only if Actions unavailable:
npm run deploy       # gh-pages -d dist
```

Base path: `/raytracing/`.

## Controls (quick)

- **WASD** move · drag look · **R** reset samples · **X** export
- **1–8** Goethe chapters · uncheck **Animate Scene** for STILL
- Hash: `#chapter=refraction`, `#chapter=ocean`, …

## Meta

Project memory: `notes/GROK/`. `/init` at session start, `/done` at end.  
Production ship plan: `notes/GROK/handoffs/2026-07-09-northstar-production-design.md`.
