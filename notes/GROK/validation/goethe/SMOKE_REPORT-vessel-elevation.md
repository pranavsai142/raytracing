# Goethe chapter smoke report

Generated: 2026-07-09T18:37:57.965Z
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
| 01 | vessel-elevation | §187 | PHYSICAL | PHYSICAL | yes | 64 | still | **PASS** | `13-vessel-elevation.png` |

## Per-chapter Goethe alignment

### 13-vessel-elevation — vessel-elevation (§187)

- **Status:** PASS
- **Quote:** The bottom appears raised
- **Goethe saw:** Looking into a vessel of water, the bottom appears raised by refraction.
- **User should see:** Apparent elevation of submerged geometry / bottom plane; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/13-vessel-elevation.png`
- **Visual checklist (human):** Apparent elevation of submerged geometry / bottom plane; PHYSICAL badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
