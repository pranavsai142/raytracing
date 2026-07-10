# Goethe chapter smoke report

Generated: 2026-07-09T18:37:28.538Z
Base URL: `http://127.0.0.1:5173/raytracing/`
Still sample target: 64
Pass: **YES**
Chapters: 1 / 16

## Purpose

Full Playwright still capture across all Goethe chapters (I–VIII + water phenomena + ocean).
Each row ties the scene to Goethe’s observation (§ + quote) so validation is against the **book**, not only page load.

**Automated checks:** app ready, chapter apply, badge match, non-empty caption, non-empty PNG, still samples progressed, hash restore.
**Visual Goethe match** (colours, fringes, afterimages) is **human-reviewed** via the PNG set — see visual checklist per row.

## Hash spot-check

_not run_

## Observation matrix

| # | Chapter | § | Badge exp | Badge act | Badge OK | Samples | Mode | Status | PNG |
|---|---------|---|-----------|-----------|----------|---------|------|--------|-----|
| 01 | twilight-ocean | §75 | MIXED | MIXED | yes | 64 | still | **PASS** | `15-twilight-ocean.png` |

## Per-chapter Goethe alignment

### 15-twilight-ocean — twilight-ocean (§75)

- **Status:** PASS
- **Quote:** Sea-green shadows at twilight
- **Goethe saw:** At twilight the sea shows green-tending shadows under residual sky light.
- **User should see:** Low sun ocean; sea-green shadow tendency; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/15-twilight-ocean.png`
- **Visual checklist (human):** Low sun ocean; sea-green shadow tendency; MIXED badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
