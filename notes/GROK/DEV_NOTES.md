# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

**North-star visual contract is fixed locally** (2026-07-09). Next gate is **production deploy**.

- **LIVE** (Animate on): realtime path-trace, no history blend.
- **STILL** (Animate off): freeze waves+cube; progressive 1/N.
- Cameras look at cube; hero Snell still proves TIR trap/escape.
- Smoke: `npm run smoke` → `notes/GROK/validation/northstar/`.
- **Deploy:** not yet pushed — ship plan/design/handoff ready.

**Canonical next docs:**  
`2026-07-09-northstar-visual-deploy-handoff.md` + `2026-07-09-northstar-production-design.md`

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

1. **PR-A** — commit visual + smoke + validation (hero PNG)
2. **PR-B** — push main, verify production checklist
3. **PR-C** — Snell button, mode badge, freeze key
4. Goethe matrix / P2 only after live bar is honest

---

*Update lightly each session. Detail lives in handoffs.*
