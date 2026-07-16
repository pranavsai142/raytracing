# STILL blackout repro — ABOVE WATER

**Verdict:** `NO_BLACKOUT_ABOVE_WATER_HEADLESS`

Path: setUnderwater(false) / lookAtCubeAbove → LIVE → setAnimateScene(false) → wait samples.

| Setup | LIVE meanY | STILL late | ratio | blacked? |
|-------|----------:|-----------:|------:|:--------:|
| default-above | 43.7 | 44.7 | 1.02 | no |
| horizon | 50.8 | 51.4 | 1.01 | no |
| grazing | 52.1 | 52.8 | 1.01 | no |

PNGs: `notes/GROK/validation/still-blackout-above/`