---
name: render-blueprint
description: >
  One-shot create everything Render needs for instant deploy: root render.yaml
  Blueprint (web service, buildCommand, startCommand, healthCheckPath, envVars,
  runtime/plan), optional start script, and dashboard checklist. Covers Blueprint
  vs Web Service gotchas, foreground process model, secret files, diskless
  scaling, and auto-deploy from branch. Use when the user runs /render-blueprint,
  says "create render blueprint", "deploy to render", "render.yaml", "one-shot
  render deploy", or needs a complete Render IaC setup for a web app branch.
---

# /render-blueprint — One-Shot Render Deploy Spec

Produce a complete, deployable Render Blueprint setup for the current repo so a
branch can go live via **New → Blueprint** (or documented manual Web Service
settings). Prefer shipping real files over long explanation.

## Usage

```text
/render-blueprint
/render-blueprint python flask gunicorn with pipenv
/render-blueprint node express, starter plan, health at /healthz
```

## Core Loop

1. **Prospect the repo (read, don't invent)**
   - Detect language/runtime: `package.json`, `Pipfile`/`requirements.txt`/`pyproject.toml`, `go.mod`, `Dockerfile`, etc.
   - Detect entrypoint: existing `start.sh`, `Procfile`, WSGI/ASGI module, `npm start`.
   - Note secrets already expected (env names, secret-file paths) from README/start scripts/code.
   - Prefer existing production start path over inventing a new one.

2. **Write root `render.yaml`**
   - Spec: https://render.com/docs/blueprint-spec
   - Minimum web service fields: `type`, `name`, `runtime` (or `dockerfilePath`), `buildCommand`, `startCommand`, `healthCheckPath`, `envVars`.
   - Optional: `plan`, `branch`, `numInstances`, `autoDeployTrigger`, `domains`.
   - **Critical comment block at top** (Blueprint is ignored for services created only as "Web Service" in the dashboard — settings must then be copied manually).

3. **Align build + start with process model**
   - **Build** = install deps only (or build assets). Idempotent, no long-running servers.
   - **Start** = one **foreground** process bound to `$PORT` (Render sets `PORT`).
   - Prefer `exec` in shell start scripts so PID 1 is the app (backgrounding the server → start script exits → Render treats service as crashed).
   - Logs to **stdout/stderr** only (not files).

4. **Secrets & env**
   - Non-secret config → `envVars` with `value` or `generateValue: true` (e.g. session secrets).
   - Sensitive files → **Secret Files** (dashboard); document exact filename + mount path (commonly under `/etc/secrets/`).
   - Document that Secret Files are **manual** even when Blueprint defines env paths pointing at them.

5. **Health + scaling notes**
   - `healthCheckPath` must return 2xx when process is ready (prefer shallow check; optional deep check behind query flag).
   - Diskless by default for horizontal scale: **persistent disks block multi-instance scaling**.
   - Comment scaling path (manual instance count vs Pro+ autoscaling) without inventing infra the app does not support.

6. **Verify & hand off**
   - Confirm files exist; start command is executable if shell script.
   - Give operator checklist: Blueprint connect → Secret File upload → env review → deploy → hit health URL.
   - If inside a pragmatic meta-system repo: brief note for `/done` handoff (deploy path only, no project-specific narrative dumps).

## Gotchas (Do Not Skip)

| Gotcha | Correct behavior |
|--------|------------------|
| Blueprint vs Web Service | `render.yaml` applies only when service is created/updated **via Blueprint**. Dashboard-only Web Services ignore the file. |
| Backgrounded start | Never `app &` / nohup-and-exit in the start command. Use `exec` + foreground. |
| `$PORT` | Bind `0.0.0.0:$PORT`. Hardcoded 5000/3000 breaks platform routing. |
| Multi-worker sessions | Shared stable secret (`SECRET_KEY` env or `generateValue`) — not per-process random. |
| Secret Files | Not git; attach in dashboard. Blueprint can only set *path* envs that *expect* the mount. |
| Disk + scale | Attached disk ⇒ single instance only. Stateless apps should stay diskless. |
| Build vs start | Heavy compile in build; serve in start. Don't install deps on every request. |
| Health too deep | Health that always hits DB can flap; shallow default + optional deep is safer. |
| Auto-deploy | Repo connected + auto-deploy on: push to the tracked branch deploys. Treat main/push as release gate. |
| Runtime version | Pin via Blueprint env (`PYTHON_VERSION`, `NODE_VERSION`) and/or `runtime.txt` / engine fields when the stack supports it. |

## Minimal Blueprint Skeleton (generic)

```yaml
# render.yaml — Blueprint IaC. Used only when deploying via New → Blueprint.
# Manual Web Service: copy buildCommand / startCommand / healthCheckPath into dashboard.
# Spec: https://render.com/docs/blueprint-spec
#
# Operator checklist:
#   1. New → Blueprint → this repo (or sync existing Blueprint)
#   2. Attach Secret Files if required (exact names documented below)
#   3. Review envVars; set OPERATOR/allowlist secrets as needed
#   4. Deploy → curl https://<service>/healthz

services:
  - type: web
    name: app          # unique per Blueprint; reusing name updates existing service
    runtime: python    # or node, go, docker, ...
    plan: starter
    buildCommand: "<install deps>"
    startCommand: "./start.sh"   # or "npm start", "gunicorn ...", etc.
    healthCheckPath: /healthz
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: NODE_ENV   # example only
        value: production
```

### Start script pattern (shell)

```bash
#!/usr/bin/env bash
# Production start: FOREGROUND only. Logs to stdout/stderr.
set -euo pipefail
PORT=${PORT:-10000}
# install path already done in buildCommand
exec <process-manager> --bind 0.0.0.0:"$PORT" <app-entry>
```

Make executable (`chmod +x`). Prefer `exec` so signals reach the app.

### Build command examples (abstract)

- Python + pipenv: `pip install --upgrade pip && pip install pipenv && pipenv install --deploy --ignore-pipfile`
- Python + pip: `pip install -r requirements.txt`
- Node: `npm ci` or `npm install --production=false && npm run build`
- Docker: omit native buildCommand; use `dockerfilePath` + Docker runtime

## Rules

- One-shot: leave the repo with a **working** `render.yaml` (+ start script if needed), not a design essay.
- Detect stack from repo; do not hardcode a language the project does not use.
- Never commit real secrets or private key material; only document Secret File **names** and env keys.
- Prefer Blueprint-first docs + dashboard fallback block for non-Blueprint services.
- Stateless default; call out disks only if the app truly requires them (and warn about scale limits).
- Use `todo_write` when multi-step (detect → write yaml → start script → verify → operator checklist).
- Stay project-agnostic in skill-internal wording; when *executing* the skill inside a real repo, use that repo's real module names and paths.

## Example (abstract)

**Mission:** Deploy a Python WSGI web app already using a lockfile installer and a foreground process manager.

**Do:**
1. Read lockfile + existing start entry.
2. Write `render.yaml` with `buildCommand` = install-from-lockfile, `startCommand` = `./start.sh`, `healthCheckPath` = `/healthz`.
3. Ensure `start.sh` uses `exec`, `$PORT`, stdout logs.
4. Env: generate session secret; path env pointing at Secret File mount for admin credentials if used.
5. Comment block: Blueprint-only, Secret File manual step, diskless scale note.
6. Operator: Blueprint connect → upload secret → deploy → health check.

## Success Criteria

- Root `render.yaml` exists and is valid Blueprint YAML for at least one `web` service.
- `buildCommand` and `startCommand` match the repo's real stack and process model.
- Start path is foreground + `$PORT`; health path is defined.
- Secrets are documented (env vs Secret File) without secrets in git.
- Operator can deploy via Blueprint with a short checklist; no silent Blueprint-ignore trap.
- Skill content has **zero** hard-coded project/product names (portable across repos).

## References

- https://render.com/docs/blueprint-spec
- https://render.com/docs/web-services
- https://render.com/docs/deploys (ephemeral filesystem, start process)
- https://render.com/docs/disks (scale limitation)
- Meta-system (if present): `/init` durable layer, `/done` handoffs for deploy notes only
