---
name: launch-npm
description: >
  Launch the Oceanscape Web dev server via npm and return concise access info (local + network URLs, controls).
  Use when the user runs /launch-npm, says "launch npm", "npm run dev", "start the server", or wants to open the sim locally.
---

# /launch-npm — Start Oceanscape Web

## Do this

1. `cd` to repo root (`/Volumes/ssd/projects/raytracing`).
2. If `node_modules` missing: `npm install`.
3. Kill stale Vite on 5173 if needed: `lsof -ti:5173 | xargs kill -9 2>/dev/null`.
4. Start in background: `npm run dev`
   - `host: true` and `allowedHosts: true` are already in `vite.config.ts` — no `--host` flag needed.

## Reply format (keep it short)

```
Oceanscape dev server

Local:   http://localhost:5173/raytracing/
Network: http://<machine-ip>:5173/raytracing/

Controls: 1 above · 2 below · Space orbit · X export PNG
```

Fill in `<machine-ip>` from the Vite "Network:" line in terminal output. If port ≠ 5173, use the actual port shown.

## Rules

- Run the server yourself; don't tell the user to run it.
- No wall of text — URLs + controls only unless they ask for more.
- If already running on 5173, say so and print the URLs without restarting.