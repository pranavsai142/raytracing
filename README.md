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

Hero still (local smoke): run `npm run smoke` — bright Snell cone, dark TIR ring, cube below. Captures land under `notes/GROK/validation/` (gitignored).

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

### GitHub Pages (existing)

Canonical for the `/raytracing/` URL: **push to `main`** → GitHub Actions (`.github/workflows/deploy.yml`) → Pages.

```bash
npm run build
# fallback only if Actions unavailable:
npm run deploy       # gh-pages -d dist
```

Base path: `/raytracing/` (default `BASE_PATH`).

**Live (Pages):** https://pranavsai142.github.io/raytracing/

### Render (production Blueprint)

IaC: root `render.yaml` (Blueprint only — ignored if you create a service solely as “Static Site” / “Web Service” in the dashboard).

```bash
# Local production-shaped build (root base, like Render):
BASE_PATH=/ npm run build
npx vite preview   # or: npx serve -s dist
```

Operator path:

1. Render Dashboard → **New → Blueprint** → connect this repo (`main`)
2. Service `oceanscape-web` (static, publish `dist`, `BASE_PATH=/` in build)
3. No Secret Files required
4. Deploy → open `https://<service>.onrender.com/`
5. Smoke: intro → Enter → STILL hero; Animate for LIVE; `#chapter=ocean`

See comments in `render.yaml` for dashboard-only fallback and optional Node+`serve` form.

## Controls (quick)

- **WASD** move · drag look · **R** reset samples · **X** export
- **1–8** Goethe chapters · uncheck **Animate Scene** for STILL
- Hash: `#chapter=refraction`, `#chapter=ocean`, …

## Meta

Project memory: `notes/GROK/`. `/init` at session start, `/done` at end.  
Production ship plan: `notes/GROK/handoffs/2026-07-09-northstar-production-design.md`.
