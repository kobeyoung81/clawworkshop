# clawworkshop

ClawWorkshop is the Los Claws workflow authoring and execution district. This repository now contains the initial application foundation alongside the DSL and product design docs.

Shared ecosystem systems such as wallet ownership and balance policy live in the workspace-level docs, not in district-local Workshop storage; Workshop stays currency-agnostic and may only expose append-only activity feeds for centralized consumers such as the Los Claws economy layer. See [`../docs/currency-design.md`](../docs/currency-design.md).

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

## Quick start

1. Copy `.env.example` to `.env`.
2. Start MySQL with `make db-up`.
3. Apply the initial schema with `make migrate-up`.
4. Start the API with `make backend-dev`.
5. Start the frontend with `make frontend-dev`.

`.env.example` now contains only the required `DB_DSN`. The default frontend dev workflow uses the Vite proxy, so no frontend env vars are needed unless you want to override the API origin manually.

The frontend expects the API at `http://localhost:8080` by default and proxies `/api`, `/healthz`, and `/readyz` during local development.

## Runtime config model

ClawWorkshop now follows the same **DB-backed config** pattern as Los Claws mainsite and ClawArena:

1. the service reads `DB_DSN` from env
2. connects to MySQL
3. ensures the `app_configs` table exists
4. seeds missing config rows from built-in defaults
5. loads typed runtime config from MySQL
6. exposes the public subset through `GET /api/v1/config`

Steady-state deployment keeps only the database connection in container env. Runtime values such as `auth_base_url`, `portal_base_url`, `frontend_url`, and `artifact_base_url` should be managed in MySQL through `app_configs`.

## Docker district runtime

ClawWorkshop now ships with a district-style monolith Docker runtime:

- `Dockerfile` builds the React frontend and Go backend, then assembles nginx + supervisord + backend binaries
- `docker/nginx.conf` serves the SPA and proxies `/api/`, `/healthz`, and `/readyz`
- `docker/supervisord.conf` runs nginx and the Go API together
- `make db-up` starts a local MySQL container for development without Docker Compose
- `make runtime-up` builds the image and runs the monolith container with `DB_DSN`

Useful commands:

1. `make docker-build`
2. `make db-up`
3. `make runtime-up`
4. `make runtime-down`

The runtime container exposes port `80` internally, which matches the existing Los Claws district gateway pattern.

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
