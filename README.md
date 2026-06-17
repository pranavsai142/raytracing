# Oceanscape Web

Browser-based path tracer simulating accurate light transport at the air-water interface. Ported from the [Oceanscape](https://github.com/) Metal simulation.

## Features

- **Dielectric interface physics**: Fresnel (Schlick), Snell's law refraction, total internal reflection
- **Rotating textured cube** submerged below the water plane (validation geometry)
- **Animated wave surface** perturbing interface normals
- **Volume scattering** (god rays) inside water
- **Interactive controls**: IOR, roughness, sun, volume density, samples/pixel
- **Above/below water views** demonstrating Snell's window
- **Auto-orbit** cinematic demo mode
- **PNG export**

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
npm run deploy   # GitHub Pages → /raytracing/
```

## Physics

All phenomena emerge from the math:
- Light traps underwater via TIR (critical angle ~48.6° for IOR 1.33)
- Escape only at allowed angles (Snell's window when viewed from below)
- Caustics and god rays from path-traced transmission + volume scatter
- No faked shading — stochastic path tracing with energy-conserving Fresnel decisions

## Meta System

Project memory lives in `notes/GROK/`. Run `/init` at session start, `/done` at session end.
