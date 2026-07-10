# STILL blackout repro — ABOVE WATER

**Verdict:** `NO_BLACKOUT_ABOVE_WATER_HEADLESS`

Path: setUnderwater(false) / lookAtCubeAbove → LIVE → setAnimateScene(false) → wait samples.

| Setup | LIVE meanY | STILL late | ratio | blacked? |
|-------|----------:|-----------:|------:|:--------:|
| default-above | 108.4 | 111.2 | 1.03 | no |
| horizon | 137.5 | 140.4 | 1.02 | no |
| grazing | 144.4 | 147.8 | 1.02 | no |

PNGs: `notes/GROK/validation/still-blackout-above/`