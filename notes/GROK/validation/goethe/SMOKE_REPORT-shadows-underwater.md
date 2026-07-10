# Goethe chapter smoke report

Generated: 2026-07-09T18:30:50.952Z
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
| 01 | shadows-underwater | §78 | MIXED | MIXED | yes | 64 | still | **PASS** | `05-shadows-underwater.png` |

## Per-chapter Goethe alignment

### 05-shadows-underwater — shadows-underwater (§78)

- **Status:** PASS
- **Quote:** Divers: red field, green shadows
- **Goethe saw:** Divers report a red-biased field with green-tending shadows under water.
- **User should see:** Underwater dual-light: warm lit faces, cooler/greener shadow regions on cube/floor.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/05-shadows-underwater.png`
- **Visual checklist (human):** Underwater dual-light: warm lit faces, cooler/greener shadow regions on cube/floor.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
