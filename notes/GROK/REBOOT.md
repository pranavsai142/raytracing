# REBOOT — Continuation Loop for Oceanscape Web

Use this document to restart autonomous execution if a session ends before all work is complete.

## Status Checkpoint (2026-06-16)

| Slice | Status | Notes |
|-------|--------|-------|
| Seed (notes/GROK) | DONE | SOUL_DRIVER, DEV_NOTES, handoffs |
| Scaffold (Vite+Three.js) | DONE | package.json, vite.config.ts |
| Core scene | DONE | Cube y=-3, plane y=0, waves |
| Dielectric physics | DONE | Fresnel/Snell/TIR in GLSL |
| Path tracer | DONE | 8-bounce stochastic PT |
| Volume god rays | DONE | HG scatter on trans legs |
| UI/Polish | DONE | Sliders, orbit, export, tone map |
| Build | DONE | `npm run build` passes |
| Deploy | PARTIAL | gh-pages branch pushed; enable Pages in repo settings OR wait for Actions workflow |

## Immediate Reboot Command

```
/init then continue Oceanscape Web per notes/GROK/REBOOT.md:
1. Verify https://pranavsai142.github.io/raytracing/ loads (if 404: check GitHub repo Settings → Pages → source = gh-pages branch OR GitHub Actions)
2. Run npm run build && npm run preview — confirm path tracer renders
3. /sequential-implement slice 5: MIS/unbiased, spectral dispersion, live volume UI sliders
4. /done
```

## Verification Gates

```bash
cd /Volumes/ssd/projects/raytracing
npm install
npm run build          # must exit 0
npm run preview        # must serve at localhost:4173/raytracing/
```

Visual checks:
- Below-water view shows Snell's window (sky cone, TIR ring)
- Cube visible inside transmission window only
- Auto-orbit cycles camera
- Sliders reset accumulation and change physics live
- Export PNG downloads image

## Files to Read First

1. `notes/GROK/SOUL_DRIVER.md`
2. `notes/GROK/handoffs/2026-06-16-oceanscape-web-threejs-deploy-handoff.md`
3. `src/shaders/pathTracer.frag.glsl` (physics core)
4. `/Users/pranav/projects/oceanscape/notes/GROK/` (Metal reference)

## Remaining Work (Slice 5+)

From Metal Oceanscape Prospect Brief:
- MIS / unbiased path sampling
- Wavelength-dependent IOR (spectral dispersion / chromatic caustics)
- Live volumeSigma/volumeG UI sliders (currently hardcoded)
- Golden frame regression harness (web equivalent of Metal headless capture)
- Mobile Float texture fallback (HalfFloat)

## Loop Protocol

```
WHILE not all slices DONE:
  /init
  read REBOOT.md + latest handoff
  pick next incomplete slice
  /sequential-implement <slice>
  run gates
  IF gates PASS: /done, update REBOOT.md status table
  IF gates FAIL: fix, do not advance
END
```

---
*This file is the durable restart point. Update the status table after each session.*