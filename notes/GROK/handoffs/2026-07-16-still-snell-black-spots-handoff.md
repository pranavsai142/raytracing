# 2026-07-16 — STILL Snell Window Black + Above-Water Surface Black (Open)

## What Happened (session arc, short)

Long train on water path + STILL accumulation + production UX. Below-water bulk colour is **noticeably better**. User still sees a **clear failure mode** that is angle-dependent and shows up after STILL accumulates:

1. **Below water, overhead circular patch** (Snell’s window) goes **completely black** after accum.
2. **~1–5% scattered black pixels** appear after accum (same family of failure).
3. **Above water**, the **whole water surface** still goes black (same failure mode, different view).
4. Camera motion / accum interaction still feels wrong (“shouldn’t it reset when the camera moves?”).

This handoff is the durable diagnosis + next-session contract. **Do not paper over with sky paint or fake fill.**

---

## User-visible symptoms (source of truth)

| View | What works | What’s broken |
|------|------------|----------------|
| Below water, looking at cube / bulk | Blue-ish medium / floor / cube read much better | — |
| Below water, looking **up** (overhead disk) | Physics *should* show **bright Snell escape cone** (sky through surface when angle &lt; critical) | After STILL accum, that **circular patch goes solid black** |
| Below water, general STILL | Mostly OK | **1–5% black speckles** after accum settles |
| Above water, looking down at interface | Early frames sometimes OK | **Whole surface band goes black** after time / accum |
| Animate ON (LIVE) | Feels “alive” (noise + refresh) | Hides the bad mean |
| Animate OFF (STILL) | Progressive clean-up | Reveals / freezes the bad mean |

User correctly interprets the overhead disk: **when the incidence angle allows transmission, you see through the interface** (Snell’s window). That patch going black means **escape paths are not returning sky** — they’re dying as near-black residuals or wrong-medium misses.

---

## Root cause model (how the ray tracer fails)

### Core architecture fact

Water is an **open heightfield**, not a closed mesh. Medium is tracked with `inWater`. Miss while `inWater` uses `underwaterMissRadiance` (~near black), **not** air sky (sky only after successful water→air transmit). That policy is correct for honesty; it makes **false misses lethal** in STILL.

### Why LIVE looks fine and STILL looks broken

| Mode | Behaviour | Effect on bugs |
|------|-----------|----------------|
| **LIVE** | Every frame: full path-trace, **no history** (`cameraInteracting` / `resetAccum`) | Noisy; occasional bright hits dominate perception |
| **STILL** | Freeze geometry/time; progressive 1/N then **hold** at `maxAccumSamples` | Average converges to true mean; if mean is black → solid black plate |

So: we are **not** “killing pixels after a TTL” in the successful hold path (rolling TTL was tried and **caused** surface black by re-blending a frozen dark RNG sample — **reverted**). STILL correctly **stops new samples at budget and holds**. The plate is black because **the estimated mean is black**, not because pixels timed out.

### Angle-specific failure: Snell disk (below, looking up)

Expected path for the bright disk:

1. Camera in water, primary ray **up**.
2. Hit free surface from inside.
3. **Transmit** water→air (angle inside critical cone).
4. Medium becomes air; miss → **`envLight` (sky/sun)**.

If that path fails (false surface miss, wrong `fromInside` / spawn side, microfacet sends ray back into water, RR kills with zero residual, domain closure doesn’t re-hit surface), the sample contributes **~0** instead of sky.

STILL averages → **the entire Snell disk goes black**. That is the same failure family as black surface streaks: **underwater path terminated without a valid air escape or floor hit**.

### Above-water surface black (same family, different geometry)

Expected path looking down:

1. Camera in air, hit surface.
2. Mostly **transmit** (low Fresnel near normal).
3. In water: hit floor/cube with volume atten, or reflect/TIR and continue.

If post-refract legs **false-miss** surface/floor → near-black residual. High transmission → pixel dominated by underwater term → **whole surface looks black**. LIVE hides it; STILL freezes it.

### Scattered 1–5% black spots

Same residual: sparse pixels whose Monte Carlo average is dominated by miss/RR-zero samples (grazing heightfield, near-horizontal after microfacet, domain-closure edge cases).

### Camera move / accum (open UX+correctness issue)

Expected:

- Camera moves → **must not** blend old view into new view.
- Code intent: motion → LIVE (no history) → settle → clear → STILL re-accum.

Known friction:

- `markSceneChanged` clears to black + `needsReset`.
- Camera settle path **clears again** after cooldown → extra black flashes.
- User expectation: “when I move, things should update / not freeze wrong.” If settle/clear is wrong or STILL re-enters with a black mean, motion feels broken.

**Next session must verify** the motion → clear → re-accum sequence on real drag/WASD and Above/Below, and simplify if double-clear causes “stuck black.”

---

## What already landed (do not re-litigate)

| Item | Status |
|------|--------|
| Seafloor parametric + presets | Landed |
| Intro / Enter Oceanscape / STILL default / mobile menu | Landed |
| A/D strafe (`flyBasis.ts`) | Landed |
| Drag+WASD shared yaw | Landed |
| Rolling STILL-after-budget EMA | **Removed** (was poisoning average with frozen seed) |
| Classic Newton + march for heightfield | In tree |
| Domain closure (surface up / floor down) | Partially improved; still not enough for Snell disk |
| Default ocean framing deeper + look slightly up (more Snell in frame) | Attempted; may need more |
| Geometric reflect on high-R/TIR | Partial |

---

## What is still broken (ordered fix list)

### P0 — Snell window must not go black in STILL

**Acceptance**

- [ ] Below water, FOV wide enough to see critical angle: **bright escape cone** + **dark TIR surround** (not solid black disk).
- [ ] Hero still spirit of `07-still-look-up-snell` / northstar look-up: cone stays bright after `STILL … DONE`.
- [ ] `npm run smoke` scene look-up / below stills do not regress to black cone.

**Likely code dig**

- `pathTrace` water interface: water→air transmit path, `inWater` flip, spawn into air.
- `intersectWaterSurface` for **upward** rays from underwater (false miss → never transmit).
- Domain closure: must re-hit surface for upward rays reliably.
- After transmit, miss must use `envLight`, not underwater residual.
- Microfacet: do not flip successful escape into TIR incorrectly.

### P0 — Above-water interface must not go black in STILL

**Acceptance**

- [ ] Above water, Animate off, wait until DONE: surface band stays sand/sky/Fresnel, not solid black.
- [ ] Playwright cold: Enter → Above Water → wait 10s → meanY surface band stays high (see cold-black captures).

**Likely dig**

- Post air→water transmit: floor/cube hit rate; domain closure for downward legs.
- Spawn side after refract; no self-hit thrash.
- Do **not** reintroduce rolling EMA with frozen `accumSampleCount` seed.

### P1 — 1–5% black speckles after accum

**Acceptance**

- [ ] After DONE, blackFrac in view &lt; ~0.5% (or only physically dark TIR).
- [ ] No NaN paths (`normalize(0)` already guarded; re-check).

### P1 — Camera motion resets accum cleanly

**Acceptance**

- [ ] Drag or WASD: no ghost of previous view; LIVE while moving.
- [ ] After settle: STILL restarts from clear **then** climbs; no permanent black plate.
- [ ] Optional: single clear (avoid triple clear: markSceneChanged + motion + settle).

### P2 — Product framing

- Default ocean / Snell button: one-click framing that proves cone + TIR + cube without hunting angles.
- Stats: make LIVE vs STILL + sample count obvious when disk goes dark (debug).

---

## Explicit non-fixes

- Do **not** put air sky into `underwaterMissRadiance` (medium leak / white bar return).
- Do **not** re-enable post-budget rolling blend with frozen seed.
- Do **not** “fix” by only raising exposure.
- Do **not** freeze path sampling while still calling it LIVE.

---

## Reproduction (next agent must run)

```bash
npm run dev
# Cold load:
# 1. Enter Oceanscape (Animate OFF default)
# 2. Below water — look up / default ocean if framed for Snell
# 3. Wait until STILL … DONE — watch overhead disk: must stay BRIGHT in cone
# 4. Above Water — wait until DONE — surface must not go solid black
# 5. Drag camera — must re-LIVE then re-STILL cleanly

# Automated partial:
npm run test:above-still
npm run smoke   # especially look-up / above scenes
```

Captures from last session: `notes/GROK/validation/cold-black/` (cold load + wait). Headless Chromium often **does not** go fully black while the user’s GPU still shows black Snell disk — **trust the user angle; fix the escape path, don’t dismiss**.

---

## Code state at handoff

- Branch: `main` (check `git status` for dirty `pathTracer.frag.glsl` / `PathTracer.ts`).
- STILL: progressive 1/N then **hold** at `maxAccumSamples` (DONE).
- Animate default: **off**.
- Production UX intro/gate still present.

---

## What the next session starts on

1. `/init` — this handoff first.
2. **Instrument or carefully step** water→air transmit for upward underwater rays (Snell disk).
3. Fix false miss / wrong medium on that path until cone stays bright at DONE.
4. Re-verify above-water surface + 1–5% speckles + camera settle clear.
5. Only then ship/push.

### First commands

```bash
npm run build && npm run dev
# reproduce Snell disk black + above black
# then fix pathTrace interface + intersect + domain closure only
npm run test:above-still && npm run smoke
```

---

## Key decisions to keep

1. Simulation honesty &gt; pretty defaults.
2. Snell’s window is the north-star proof — black disk = ship blocker.
3. STILL freezes **geometry**, not “correctness of light.”
4. Camera motion must invalidate accum; frozen wrong view is worse than noise.

---

## Open questions

- Is residual black disk pure transmit miss, or TIR misclassification (critical angle bug)?
- HalfFloat accum on Apple GPU vs headless ANGLE (user-only black)?
- Should maxAccum default be lower for faster “DONE” feedback while debugging?

---

## North star reminder

> Light traps underwater until the angle allows escape.  
> Looking up: bright Snell cone + dark TIR ring is the proof.  
> Looking down from air: interface + cube/floor, not a black plate.  
> STILL must converge to that truth — not erase it.

*End of handoff. Next work: Snell escape path + above-water surface mean in STILL; camera clear discipline.*
