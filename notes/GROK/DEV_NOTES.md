# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

**Below-water bulk looks better; STILL still has angle-dependent black failure modes.**

- Production UX: intro → Enter; default **Animate OFF** (STILL); controls legend; mobile menu.
- STILL: progressive 1/N then **hold** at budget (rolling TTL **removed** — it poisoned averages).
- **Open P0:** Snell overhead disk goes black after accum; above-water surface can still go black; ~1–5% black speckles. Same family: paths that should escape/hit instead die as near-black residual.

**Canonical next doc:**  
`notes/GROK/handoffs/2026-07-16-still-snell-black-spots-handoff.md`

## Hard-Won Lessons

1. Never blend path-trace samples across changing waves/cube.
2. LIVE hides a black mean; STILL freezes it — fix paths, not “more refresh” alone.
3. Post-budget rolling EMA with frozen RNG seed → surface goes black over time (do not reintroduce).
4. Snell disk black = water→air escape failed (false miss / wrong medium), not “kill pixels.”
5. One yaw for look + strafe or drag→WASD snaps.

## How We Work

- `/init` · `/done` · `npm run build` · `npm run dev` · `npm run smoke` · `npm run test:strafe` · `npm run test:above-still`
- API: `window.__oceanscape` (`entered`, `enterOceanscape`, freeze/animate, chapters)

## Next Focus

1. **P0** Fix STILL Snell window (overhead bright cone must survive DONE).
2. **P0** Fix above-water surface black mean in STILL.
3. **P1** Speckles + clean camera-move accum reset.
4. Push / live Pages only after P0 honest.

---

*Update lightly each session. Detail lives in handoffs.*
