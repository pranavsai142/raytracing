# STILL blackout repro

**Verdict:** `NO_BLACKOUT_IN_HEADLESS`

Luminance from screenshot PNGs (not WebGL readPixels). Headless ANGLE may differ from your GPU.

| Scenario | LIVE meanY | STILL late meanY | ratio | dark% | blacked? |
|----------|----------:|-----------------:|------:|------:|:--------:|
| ocean-underwater | 93.4 | 94.6 | 1.01 | 0.0 | no |
| ocean-abyss | 34.9 | 36.1 | 1.04 | 0.6 | no |
| ocean-lookup | 127.4 | 127.9 | 1.00 | 0.6 | no |
| mirror-floor | 57.4 | 67.1 | 1.17 | 0.0 | no |
| double-reflect | 75.6 | 79.3 | 1.05 | 22.4 | no |
| high-sigma-underwater | 74.0 | 75.8 | 1.02 | 0.1 | no |

PNGs: `notes/GROK/validation/still-blackout/*__*.png`
