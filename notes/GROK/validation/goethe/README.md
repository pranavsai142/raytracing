# Goethe chapter visual validation

Playwright smoke across **all** Goethe chapters (I–VIII + water presets + ocean default).

Validation is against the **book** (REQ + `chapters.ts` § / quote / badge), not only “did the page load.”

## What we capture

For each of 16 chapter ids:

1. `applyChapter(id)` via `window.__oceanscape`
2. STILL freeze (`freezeForCapture`)
3. Progressive samples (`SAMPLES`, default 32)
4. Canvas PNG → `NN-<chapterId>.png`
5. Badge expected vs actual (`#chapter-badge`)
6. Observation matrix row: Goethe saw / user should see / notes

Plus a **hash spot-check**: load `#chapter=shadows` and verify restore.

## Outputs

| File | Role |
|------|------|
| `SMOKE_REPORT.md` | Human-readable matrix + per-chapter alignment |
| `SMOKE_REPORT.json` | Machine-readable results |
| `NN-<id>.png` | Still captures for human visual review |

**Automated PASS** = ready, apply, badge match, caption, non-empty PNG, still samples, hash OK.  
**Colour / fringe / afterimage match** = human review of PNGs (see visual checklist in the report).

## How to run

```bash
npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/
npm run smoke:goethe        # terminal B
# or headed:
npm run smoke:goethe:headed
```

Env: `SAMPLES=48`, `BASE_URL=http://127.0.0.1:4173/raytracing/` (preview), `HEADED=1`.

Script: `scripts/goethe-smoke.mjs`.
