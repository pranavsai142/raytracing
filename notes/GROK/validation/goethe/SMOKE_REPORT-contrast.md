# Goethe chapter smoke report

Generated: 2026-07-09T18:24:52.510Z
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
| 01 | contrast | §56 | MIXED | MIXED | yes | 64 | still | **PASS** | `06-contrast.png` |

## Per-chapter Goethe alignment

### 06-contrast — contrast (§56)

- **Status:** PASS
- **Quote:** White on yellow → purple tint
- **Goethe saw:** White against a yellow field takes on a purple (physiological) tint at the boundary.
- **User should see:** Yellow/white split floor; purple fringe when physiological layer enabled; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/06-contrast.png`
- **Notes:** Physiological fringe may need human eyes on PNG; structural badge + scene load required.
- **Visual checklist (human):** Yellow/white split floor; purple fringe when physiological layer enabled; MIXED badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
