# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

**North-star visual contract is fixed locally** (2026-07-09). Production ship still a gate.

- **LIVE** / **STILL** path-trace contract; cameras on cube; hero Snell still.
- Smoke: `npm run smoke` → `notes/GROK/validation/northstar/`.
- **Underwater white bar (P0):** fixed in seafloor/waterline train (parametric floor + miss→sky leak closed when present).
- **Seafloor train landed:** `floorHeight` / pattern / albedo / bump / material UI + chapter floor bundles + Abyss/Sand/Gravel/White/Mirror/Split presets. Floor is substrate; water colour from physics.

**Canonical next docs:**  
`2026-07-09-underwater-whitebar-seafloor-handoff.md` (+ research sibling)  
`2026-07-09-northstar-visual-deploy-handoff.md` (ship)

## Hard-Won Lessons

1. Never blend path-trace samples across changing waves/cube.
2. Cube must be in frame or “physics” looks broken.
3. Snell window needs FOV past critical angle to show dark TIR ring.
4. Physics demo ships before full Goethe REQ matrix.

## How We Work

- `/init` · `/done` · `npm run build` · `npm run dev` · `npm run smoke` · push → Actions Pages
- API: `window.__oceanscape`
- Live URL target: https://pranavsai142.github.io/raytracing/

## Next Focus

1. **Seafloor train landed** (Slices A–D) — white bar fix, parametric floor, materials/patterns/UI, chapter bundles + presets. Optional floor caustics (P2) still skippable.
2. **PR-A/B** — production ship of north-star visual (if not already live).
3. **PR-C** — Snell button, mode badge, freeze key.
4. Goethe matrix completeness / polish now that waterline + floor are honest.

---

*Update lightly each session. Detail lives in handoffs.*
