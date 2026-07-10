# Goethe chapter smoke report

Generated: 2026-07-09T18:34:17.265Z
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
| 01 | goethe-colourless-water | §161 | PHYSICAL | PHYSICAL | yes | 64 | still | **PASS** | `11-goethe-colourless-water.png` |

## Per-chapter Goethe alignment

### 11-goethe-colourless-water — goethe-colourless-water (§161)

- **Status:** PASS
- **Quote:** Water deprived slightly of transparency
- **Goethe saw:** Water itself has no colour; slight semi-opacity (not pigment) yields the dioptrical effects.
- **User should see:** Cube through colourless medium; no bulk blue pigment; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/11-goethe-colourless-water.png`
- **Visual checklist (human):** Cube through colourless medium; no bulk blue pigment; PHYSICAL badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
