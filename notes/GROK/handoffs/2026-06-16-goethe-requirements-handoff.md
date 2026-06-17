# 2026-06-16 — Goethe Theory of Colours: Research → Requirements Docs

## What Happened

Session continued from Oceanscape Web deploy handoff. User directed work toward Goethe's *Theory of Colours* as the next north-star expansion: turn the path tracer into an interactive visual book — **Goethe saw them; we see them.**

### Research phase
- Read `THEORY_OF_COLOURS.md` (Project Gutenberg / Eastlake trans.) in repo root.
- Extracted all water/sea/ocean/vase/diver/night passages; core thesis: **water has no intrinsic colour** — hues are physical (light + darkness + colourless medium thickness) or physiological (retinal complement).
- Ran `/parallel-implement` with two subagents → technical synopses (design-only).

### Deliverables (this session)
| File | Purpose |
|------|---------|
| `notes/GROK/goethe-general-synopsis.md` | 8-chapter implementation brief (general book) |
| `notes/GROK/goethe-water-synopsis.md` | 36-passage water index + 8 demos |
| `notes/GROK/REQ-goethe-theory-of-colours.md` | **Requirements doc** — GTC-00..08, acceptance criteria, files, order |
| `notes/GROK/REQ-goethe-water.md` | **Requirements doc** — WTR-01..11, presets, shader checklist |

No shader/UI code implemented this session — planning and requirements only.

## Key Decisions

1. **Two-layer honesty:** Physical phenomena in path tracer radiance; physiological (after-image, simultaneous contrast, green diver shadows per §78) in **labeled** post-process — never faked as water pigment.
2. **Beer vs Goethe absorption:** Expose `absorptionModel` toggle — modern selective λ absorption vs Goethe semi-opacity yellowing; same appearance, different mechanism.
3. **Neutral water default:** Replace hard-coded god-ray blue `vec3(0.12,0.28,0.48)` with tunable `scatterTint` defaulting white for WTR-02 "water has no colour" canonical demo.
4. **Cube sacred:** Chapters change lighting, geometry surrounds, and presets — not cube placement/rotation invariants.
5. **Book shell first:** GTC-00 chapter navigation + badges before individual phenomena.

## Goethe Water — Distilled for Implementers

- §161: Water colourless; slight loss of transparency → same effects as vapour.
- §150–151: Light through thickness → warm; darkness through illumined medium → cool.
- §164/§78: Divers — red bottom in sun, green shadows (complement + depth).
- §57: Agitated sea — physiological wave shadow contrast.
- §80/§224: Vase mirror — pure water reflections colourless; tint → opposite hues.
- §308: Water-prism — white centre, colour at edges only.
- §75–76: Twilight → sea-green shadows → grey → moon; moon+candle double shadows.

## Current Code State

- Uncommitted local changes still present from prior session (`index.html`, `PathTracer.ts`, `main.ts`, `pathTracer.frag.glsl`, `ui.ts`, `vite.config.ts`).
- Existing features partially overlap Goethe: Snell/TIR, dispersion, volume scatter, above/below views — Chapter V (refraction) is mostly preset work.

## What the Next Session Must Start On

1. Run `/init`
2. Read `REQ-goethe-theory-of-colours.md` + `REQ-goethe-water.md`
3. Implement **P0 slice:**
   - GTC-00 (chapter shell + `applyChapterPreset`)
   - WTR-01 (`scatterTint`, `turbidity`, `absorptionModel`)
   - WTR-02 (`goethe-colourless-water` preset)
   - GTC-05 (refraction chapter preset — quick win)
   - WTR-05 (`diver-view` preset)
4. `npm run build` + visual verify each preset
5. Run `/done` after P0 lands

## Open Questions

- Float/HalfFloat accum on mobile Safari for new post-process passes?
- Vase/prism geometry: analytic in shader vs sceneMode toggles — REQ assumes shader analytic for P2.
- Rename app subtitle from "Light Physics Simulation" to mention Goethe book mode?

---

*End of handoff. Requirements are the contract; synopses are background. Goethe saw them — next session makes them visible.*