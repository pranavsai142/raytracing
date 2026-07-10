# Goethe chapter smoke report

Generated: 2026-07-09T18:27:02.129Z
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
| 01 | double-reflect | §224 | PHYSICAL | PHYSICAL | yes | 64 | still | **PASS** | `08-double-reflect.png` |

## Per-chapter Goethe alignment

### 08-double-reflect — double-reflect (§224)

- **Status:** PASS
- **Quote:** Separated reflections are weak and shadowy
- **Goethe saw:** When surface reflections are separated (double reflection), secondary images appear weak and shadowy.
- **User should see:** Calm surface; secondary reflection path weaker than primary; PHYSICAL badge.
- **Badge:** expected `PHYSICAL` · actual `PHYSICAL` · ok=true
- **Mode / samples:** still / 64
- **Capture:** `notes/GROK/validation/goethe/08-double-reflect.png`
- **Visual checklist (human):** Calm surface; secondary reflection path weaker than primary; PHYSICAL badge.

## How to re-run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or: npm run smoke:goethe:headed
# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe
```

Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.
