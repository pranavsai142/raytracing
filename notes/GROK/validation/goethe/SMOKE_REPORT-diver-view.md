# Goethe chapter smoke report

Generated: 2026-07-09T18:32:30.789Z
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
| 01 | diver-view | §78 | MIXED | MIXED | yes | 64 | still | **PASS** | `12-diver-view.png` |

## Per-chapter Goethe alignment

### 12-diver-view — diver-view (§78)

- **Status:** PASS
- **Quote:** Everything seen in red light; shadows green
- **Goethe saw:** Underwater diver perspective: red-biased illumination field with green-tending shadows (§78).
- **User should see:** Underwater cube; beer-style absorption; red/green relations; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/12-diver-view.png`
- **Visual checklist (human):** Underwater cube; beer-style absorption; red/green relations; MIXED badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
