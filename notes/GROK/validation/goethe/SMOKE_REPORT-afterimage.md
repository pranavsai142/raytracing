# Goethe chapter smoke report

Generated: 2026-07-09T18:33:54.923Z
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
| 01 | afterimage | §50 | PHYSIOLOGICAL (viewer) | PHYSIOLOGICAL (viewer) | yes | 64 | still | **PASS** | `09-afterimage.png` |

## Per-chapter Goethe alignment

### 09-afterimage — afterimage (§50)

- **Status:** PASS
- **Quote:** Opponent colour floats on neutral ground
- **Goethe saw:** After fixation on a colour, the opponent colour appears floating on a neutral ground (physiological).
- **User should see:** Fixation / opponent afterimage layer labeled PHYSIOLOGICAL (viewer); not smuggled into water radiance.
- **Badge:** expected `PHYSIOLOGICAL (viewer)` · actual `PHYSIOLOGICAL (viewer)` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/09-afterimage.png`
- **Notes:** Opponent afterimage is inherently visual/human; STILL freeze ok for structure. Review PNG for fixation plane; colour match not automatable.
- **Visual checklist (human):** Fixation / opponent afterimage layer labeled PHYSIOLOGICAL (viewer); not smuggled into water radiance.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
