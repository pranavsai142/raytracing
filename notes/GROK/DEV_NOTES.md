# DEV_NOTES — Oceanscape Web (Narrative State of Play)

**Purpose**: Lightweight, living summary of where the project actually is right now.

The real work is driven by:
- This file (current narrative)
- `SOUL_DRIVER.md`
- The most recent handoffs in `notes/GROK/handoffs/`

## Current Big Picture

**STILL accumulate works again (user-confirmed on Apple M3).** Two-layer fix:

1. **Path honesty** — medium-based dielectric (`fromInside = inWater`), upward surface hits, domain closure, water→air escape.
2. **Accum pipeline** — STILL samples history; LIVE does not. Use **float32 + NearestFilter** (not HalfFloat+Linear) or progressive blend reads 0 → black plate.

- Production UX: intro → Enter; default Animate OFF (STILL).
- STILL: progressive 1/N then **hold** at budget (no rolling post-budget EMA).

**Canonical next doc:**  
`notes/GROK/handoffs/2026-07-16-still-live-accum-pipeline-handoff.md`

## Hard-Won Lessons

1. Never blend path-trace samples across changing waves/cube.
2. LIVE hides a black mean; STILL freezes it — fix paths, not “more refresh” alone.
3. Post-budget rolling EMA with frozen RNG seed → surface goes black (do not reintroduce).
4. Snell disk black = water→air escape failed (false miss / wrong medium), not “kill pixels.”
5. Dielectric `fromInside` = tracked medium (`inWater`), never `dot(I,N)` alone on heightfields.
6. **LIVE ok / STILL black** = accum RT not sampleable (HalfFloat+Linear). Prefer float32 + **NearestFilter**. Harness: `npm run test:still-switch`.
7. Debug order: LIVE-ok/STILL-black → pipeline first; both dark → path mean; only after budget → banned EMA.
8. One yaw for look + strafe or drag→WASD snaps.

## How We Work

- `/init` · `/done` · `npm run build` · `npm run dev`
- `npm run smoke` · `npm run test:above-still` · `npm run test:snell-still` · `npm run test:still-switch` · `npm run test:strafe`
- API: `window.__oceanscape` (`entered`, `enterOceanscape`, freeze/animate, chapters)
- Footer GPU line should show `accum=float32+nearest` (or half+nearest)

## Next Focus

1. Optional: residual speckles if still seen on grazing angles.
2. Push / live Pages when ready.
3. Keep accum NearestFilter + no rolling post-budget blend.

---

*Update lightly each session. Detail lives in handoffs.*
