# clawworkshop

ClawWorkshop is the Los Claws workflow authoring and execution district. This repository now contains the initial application foundation alongside the DSL and product design docs.

Shared cross-district integration policies live in workspace-level docs, not in district-local Workshop storage. Workshop may expose append-only activity feeds for external consumers, but its own design should stay focused on workflow authoring and execution.

## Stack

| Area | Tech |
|---|---|
| Backend | Go 1.26, Chi, GORM, MySQL |
| Frontend | React 19, TypeScript, Vite 8, TanStack Query, Tailwind CSS v4, i18next |
| Storage | MySQL for metadata and content |

## Repository guide

| Path | Purpose |
|---|---|
| `docs/Minimal-DSL-Design.md` | Core design document for the DSL |
| `docs/design.md` | Software design document for the full ClawWorkshop district app |
| `docs/PRD.md` | Product requirements for the platform and DSL |
| `docs/project-type.schema.json` | JSON Schema for validating project type files |
| `docs/project-type-example.json` | Example DSL document that matches the schema |
| `backend/` | Go API, config, health endpoints, migration runner, and future domain modules |
| `frontend/` | React app shell, routing, i18n bootstrap, runtime config, and district UI foundation |
| `skill/` | Published OpenClaw skill instructions exposed at `/skill/SKILL.md` |

## Quick start

1. Copy `.env.example` to `.env`.
2. Start MySQL 8 and point `DB_DSN` at the target `clawworkshop` schema.
3. Apply migrations with `cd backend && go run ./cmd/migrate up`.
4. Start the API with `cd backend && go run .`.
5. Start the frontend with `cd frontend && npm install && npm run dev`.

`.env.example` now contains only the required `DB_DSN`. The default frontend dev workflow uses the Vite proxy, so no frontend env vars are needed unless you want to override the API origin manually.

The frontend expects the API at `http://localhost:8080` by default and proxies `/api`, `/healthz`, and `/readyz` during local development.

## Database migrations

ClawWorkshop keeps its existing embedded SQL + `schema_migrations` model.

- startup runs `internal/db.EnsureMigrations(...)` before config seeding/loading
- `backend/cmd/migrate` uses the same migration code path for manual operations
- if migration tracking is missing but a known pre-existing Workshop schema is present, `up` records the matching baseline instead of replaying version `1`
- if only part of the managed schema is present, startup/CLI fail fast instead of guessing

Useful commands from `clawworkshop/backend`:

1. `go run ./cmd/migrate up`
2. `go run ./cmd/migrate status`
3. `go run ./cmd/migrate version` (`status` is the clearer alias)
4. `go run ./cmd/migrate down -steps 1`

## Runtime config model

ClawWorkshop now follows the same **DB-backed config** pattern as Los Claws mainsite and ClawArena:

1. the service reads `DB_DSN` from env
2. connects to MySQL
3. runs `EnsureMigrations` so `schema_migrations`-tracked SQL is current, including `app_configs`
4. seeds missing config rows from built-in defaults
5. loads typed runtime config from MySQL
6. exposes the public subset through `GET /api/v1/config`

Steady-state deployment keeps only the database connection in container env. Runtime values such as `auth_base_url`, `portal_base_url`, `frontend_url`, `artifact_base_url`, and `clawworkshop_skill_url` should be managed in MySQL through `app_configs`.

## Docker district runtime

ClawWorkshop now ships with a district-style monolith Docker runtime:

- `Dockerfile` builds the React frontend and Go backend, then assembles nginx + supervisord + backend binaries
- the same image also contains `/app/migrate` for one-shot migration jobs before rollout
- `docker/nginx.conf` serves the SPA, publishes `/skill/SKILL.md`, and proxies `/api/`, `/healthz`, and `/readyz`
- `docker/entrypoint.sh` renders same-deployment URLs into the published Workshop skill before nginx starts
- `docker/supervisord.conf` runs nginx and the Go API together
- startup still calls `EnsureMigrations`, so the runtime container keeps a safety-net migration check even when operators run the one-shot job first

Useful commands:

1. `docker build -t clawworkshop .`
2. `docker run --rm -e DB_DSN='...' --entrypoint /app/migrate clawworkshop status`
3. `docker run --rm -e DB_DSN='...' --entrypoint /app/migrate clawworkshop up`

The runtime container exposes port `80` internally, which matches the existing Los Claws district gateway pattern.

Agents can install the published ClawWorkshop skill from `/skill/SKILL.md` on the deployed district host.

## Foundation features already wired

- JSON health and readiness endpoints
- lightweight district stats endpoint at `GET /api/stats`
- public runtime config endpoint for the frontend
- local MySQL development stack plus migration runner
- DB-backed `app_configs` bootstrap and loading flow
- JWT auth middleware with `Authorization: Bearer` and `lc_access` cookie support
- reusable workspace/project permission helpers and actor audit context

## Runtime and collaboration surface

- workspace and membership management with simplified roles: `owner`, `admin`, `member`, `viewer`
- JSON-first template drafting, validation, publishing, and immutable version history
- project creation from published versions and flow start from authored workflow ids
- task inbox, task detail, claim/release/complete, review, and feedback APIs
- artifact detail and revision history with inline MySQL storage for markdown, JSON, and binary payloads
- poll-friendly event feed and cursor updates for human clients or AI agents
- frontend pages for workspaces, templates, projects, task inbox, flow detail, and activity feed

## Poll-based agent workflow

For the full agent-facing publication and runtime instructions, see [`skill/SKILL.md`](skill/SKILL.md).

Agents use the same authenticated APIs as human actors. The intended v1 loop is:

1. Poll `GET /api/v1/tasks/inbox` for ready or assigned work.
2. Read `GET /api/v1/tasks/:id` for prompt, artifact context, and open review/feedback sessions.
3. Mutate task state with claim, complete, review, feedback, and artifact revision endpoints.
4. Track incremental changes via `GET /api/v1/events?sinceSeq=...` and persist cursors with `PUT /api/v1/events/cursors/:feedName`.

## Example template data

Use `docs/project-type-example.json` as the starter published-template payload for local or staging setup. It matches `docs/project-type.schema.json` and exercises the current JSON DSL shape end to end.

## Current DSL shape

- **Node-centric authoring model**: workflows contain executable nodes directly; there is no separate `task_types` layer.
- **Concrete artifacts**: the schema declares concrete artifacts such as `brief.md`, `prd.md`, or `wireframe.png`, not reusable artifact types.
- **Scoped artifacts**: artifacts may be declared at **project**, **workflow**, or **node** scope, and each artifact is defined in exactly one scope.
- **Direct artifact references**: `input` and `work` nodes declare `reads` and `writes` using artifact ids directly, with no named input/output ports and no `artifact_map`.
- **Special interactive nodes**: `review` and `feedback` nodes may be multi-round; they read artifacts but deliver human input internally to downstream nodes instead of writing normal artifact outputs.
- **Graph-driven execution**: workflow behavior is expressed through node kinds and edges; there is no `execution_mode` field.
- **Built-in node kinds**: `input`, `work`, `review`, `feedback`, and `end`.
