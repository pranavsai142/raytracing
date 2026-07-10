# Goethe chapter smoke report

Generated: 2026-07-09T18:23:12.017Z
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
| 01 | shadows | §76 | MIXED | MIXED | yes | 64 | still | **PASS** | `04-shadows.png` |

## Per-chapter Goethe alignment

### 04-shadows — shadows (§76)

- **Status:** PASS
- **Quote:** Contrary light fills the shadow
- **Goethe saw:** Principal light tints the surface; contrary (fill) light fills the shadow → complementary coloured shadows.
- **User should see:** Dual-light rod/floor: two distinct coloured shadows; overlap darker/neutral; MIXED badge.
- **Badge:** expected `MIXED` · actual `MIXED` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/04-shadows.png`
- **Visual checklist (human):** Dual-light rod/floor: two distinct coloured shadows; overlap darker/neutral; MIXED badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
