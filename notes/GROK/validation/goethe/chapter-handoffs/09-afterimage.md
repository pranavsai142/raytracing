# Handoff — Goethe chapter `afterimage`

**You own only this chapter.** Parallel agents own the others — do not edit other chapters' presets casually (touch only the `afterimage` case in `applyChapterPreset`).

## Goethe contract

| | |
|--|--|
| **§** | §50 |
| **Quote** | Opponent colour floats on neutral ground |
| **Badge** | `PHYSIOLOGICAL (viewer)` |
| **Goethe saw** | After saturated colour, opponent floats on neutral ground (viewer). |
| **User must see** | Grey/neutral surround + fixation; PHYSIOLOGICAL badge; viewer-layer not painted water. |

## Run (only your chapter)

Dev server must already be up: `http://127.0.0.1:5173/raytracing/`

```bash
cd /Users/pranav/projects/raytracing
CHAPTER=afterimage SAMPLES=64 RENDER_SCALE=1 SPP=2 npm run smoke:goethe:one
```

Outputs:
- PNG: `notes/GROK/validation/goethe/09-afterimage.png`
- Verdict stub: `notes/GROK/validation/goethe/VERDICT-afterimage.md`
- Report: `notes/GROK/validation/goethe/SMOKE_REPORT-afterimage.md`

## Your job (strict order)

1. Run the smoke command above. Structural must PASS.
2. **Open the PNG with the `read_file` tool** and actually look at it.
3. Judge against Goethe contract (philosophical + visual):
   - Is the subject of the observation **visible and clear**?
   - Is quality clean (renderScale full — not muddy blocky garbage)?
   - Does it match the § intent, not a random pretty ocean?
4. If FAIL visual: edit **only** `case 'afterimage':` inside `src/PathTracer.ts` → `applyChapterPreset`.
   - Prefer: camera framing (cube/geometry in frame), exposure, sun elev/az, density, dispersion, fill, waves.
   - Always keep `renderScale = 1.0` path (chapter quality block at top of applyChapterPreset).
   - Do **not** break other cases.
5. Re-run the same smoke command.
6. Re-open PNG. Iterate until vision matches the contract as well as the path tracer allows.
7. Write final report to `notes/GROK/validation/goethe/chapter-handoffs/afterimage-RESULT.md`:

```markdown
# RESULT — afterimage
**Structural:** PASS|FAIL
**Visual Goethe fidelity:** PASS|PARTIAL|FAIL
**Philosophical alignment:** 1–2 sentences vs §
**What you changed:** files + param bullets (or "none")
**PNG:** path
**Remaining gaps:** honest
```

## Done criteria

- Structural smoke PASS for `afterimage`
- PNG exists and you inspected it with read_file
- RESULT file written
- No production push, no editing other chapters unless a shared bug is truly global (document it)

## Workspace

`/Users/pranav/projects/raytracing` branch `main` (or current).
