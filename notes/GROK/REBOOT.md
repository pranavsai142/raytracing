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
| QoL + tooltips | DONE | All params exposed, `data-tip` on every control |
| Camera controls | DONE | WASD/Q/E + mouse drag, accel/damping (`cameraControls.ts`) |
| Anti-ghosting accum | DONE | No temporal blend during camera motion; reset on move |
| Spectral dispersion | DONE | Hero-wavelength IOR variation in shader |
| Goethe chapter shell | IN PROGRESS | `chapters.ts`, presets, UI — **uncommitted** |
| Build | DONE | `npm run build` passes |
| Deploy | PARTIAL | gh-pages branch pushed; enable Pages in repo settings OR wait for Actions workflow |

## Immediate Reboot Command

```
/init then continue Oceanscape Web per notes/GROK/REBOOT.md:
1. Read notes/GROK/handoffs/2026-06-16-qol-camera-accum-fix-handoff.md
2. Commit uncommitted Goethe + QoL work
3. Visual-verify chapter presets vs REQ-goethe-*.md acceptance criteria
4. Close P0 gaps: chapter quote tooltips, diver physiological toggle, mobile HalfFloat
5. Optional: MIS/unbiased estimator, enable GitHub Pages if 404
6. /done
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
- WASD/mouse move: no ghost trails between old/new viewpoints
- Hold still: image sharpens progressively (sample counter climbs)
- Goethe chapter buttons switch presets; badge updates
- Export PNG downloads image

## Files to Read First

1. `notes/GROK/SOUL_DRIVER.md`
2. `notes/GROK/handoffs/2026-06-16-qol-camera-accum-fix-handoff.md`
3. `notes/GROK/REQ-goethe-theory-of-colours.md` + `REQ-goethe-water.md`
4. `src/shaders/pathTracer.frag.glsl` (physics core)

## Remaining Work (Slice 5+)

- Commit + verify Goethe P0 presets
- Per-chapter quote tooltips on chapter buttons (REQ GTC-00)
- `diver-view` physiological toggle wiring
- MIS / unbiased path sampling
- Golden frame regression harness (web equivalent of Metal headless capture)
- Mobile HalfFloat accum verification

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