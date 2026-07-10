# North-star visual smoke report

Generated: 2026-07-10T01:52:37.415Z
Base URL: http://127.0.0.1:5173/raytracing/
Still sample target: 48
Pass: **YES**

## North star

Reproduce light at the air–water interface: Fresnel, Snell, TIR trap/escape, caustics — simulation not faked shading.

## Rendering contract

LIVE never blends mismatched wave/cube frames; STILL freezes waves+cube and progressive-averages 1/N.

| Scene | Mode | Samples | OK | Expect | PNG |
|-------|------|---------|----|--------|-----|
| 01-live-underwater | live | 2 | yes | Realtime path-trace; checkerboard cube visible; waves move; no temporal ghosting | `notes/GROK/validation/northstar/01-live-underwater.png` |
| 02-still-snell-tir-cube | still | 48 | yes | Checkerboard cube framed; surface above with Snell window / TIR dark band; caustic patches from wave topology | `notes/GROK/validation/northstar/02-still-snell-tir-cube.png` |
| 03-still-refraction-caustics | still | 48 | yes | Dispersion + wave focus caustics on cube; progressive clean-up | `notes/GROK/validation/northstar/03-still-refraction-caustics.png` |
| 04-still-above-cube | still | 48 | yes | Submerged checkerboard cube through interface; Fresnel + refraction | `notes/GROK/validation/northstar/04-still-above-cube.png` |
| 05-still-colourless-water | still | 48 | yes | Cube through colourless medium; no bulk blue pigment | `notes/GROK/validation/northstar/05-still-colourless-water.png` |
| 06-still-diver | still | 48 | yes | Underwater cube; beer absorption; still path-trace | `notes/GROK/validation/northstar/06-still-diver.png` |
| 07-still-look-up-snell | still | 48 | yes | Looking upward: bright Snell cone of sky; dark TIR outside; ocean light trap visualization | `notes/GROK/validation/northstar/07-still-look-up-snell.png` |


## How to re-run

```bash
npm run dev
npm run smoke
```
