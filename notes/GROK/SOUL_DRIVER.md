# SOUL_DRIVER — Oceanscape Web (Three.js)

**What this project actually is, right now.**

Oceanscape Web is a browser-based port of the Oceanscape light physics simulation. Its purpose is to accurately reproduce the physics of light moving through the air-water interface — specular reflection, refraction (Snell's law), and total internal reflection that traps light underwater until the angle allows escape. This is how the real ocean gets lit from above.

The north star is to **literally reproduce every display of light** from rays hitting the water surface. The liked rotating textured cube remains the core test geometry — submerged below the water plane as a proxy for objects the light interacts with.

This is a **simulation project**, not an artistic ocean renderer. Phenomena (Snell's window, caustics, god rays, trapping/escape) must emerge from the math, not from faked shading.

## Current North Star

Deliver a deployed, interactive Three.js path tracer that demonstrates physically correct light transport at the water interface with the rotating cube as validation geometry. See the latest handoff for immediate slice and deployment status.

## Operating Philosophy

- Physics correctness is the primary test: does light trap underwater and only escape at the right angles?
- The cube is sacred — preserve rotation, texturing, and submerged placement (y=-3).
- Prefer literal path tracing over raster approximations when they conflict.
- Web deployment must work: build, verify, deploy to GitHub Pages.
- Narrative handoffs capture physics decisions and validation.

## How This Document Is Used

- Every new session starts by reading this (via `/init`).
- Update only when the fundamental "why" or core invariants change.

The project succeeds when the deployed web demo shows physically correct interface behavior on the cube — trapping, selective escape, caustics, and god rays emerging from dielectric + volume math.