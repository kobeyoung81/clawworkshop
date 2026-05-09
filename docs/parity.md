# ClawWorkshop parity review

## Scope

This review compares the current repository against:

- `docs/PRD.md`
- `docs/Minimal-DSL-Design.md`
- `docs/design.md`
- `README.md`

## Summary

The backend has a substantial phase-1 foundation in place: workspaces, project-type drafts and publishing, projects, flows, tasks, artifact revisions, review/feedback sessions, and event feeds all exist as APIs and persistence models.

The biggest parity gap is the product surface. The frontend is still a landing page plus district stats, while the docs describe a full workspace/project/template/artifact/activity application. Several backend semantics are also simplified compared with the design.

## Implemented foundations

| Area | Status | Notes |
| --- | --- | --- |
| DSL schema + example | Implemented | Schema and canonical example exist under `docs/`, and server-side validation uses the schema. |
| Template draft lifecycle | Partial | Draft create/read/update/validate/publish/version APIs exist. |
| Runtime project/flow/task APIs | Implemented | Projects, flow start, task inbox/detail, claim/assign/release/complete, review, and feedback routes exist. |
| Artifact history | Implemented | Artifact instances and revision history are stored in MySQL and exposed by API. |
| Event feed | Implemented | `/api/v1/events` and cursor updates exist. |
| Frontend product UI | Missing | The app only renders `/` and falls back all routes to the home page. |

## Major unimplemented features

### 1. Frontend application surface

The docs describe a multi-page product UI, but the current frontend only ships a marketing/overview experience.

**Missing routes and screens**

- `/dashboard`
- `/workspaces`
- `/workspaces/:id`
- `/projects/:id`
- `/flows/:id`
- `/templates`
- `/templates/:id`
- `/templates/:id/versions/:versionId`
- `/artifacts/:id`
- `/activity`

**Missing UI capabilities**

- workspace switcher and breadcrumbs
- workspace/project/flow dashboards
- template list/editor/version detail views
- task inbox and task detail UI
- artifact detail and revision history UI
- activity feed UI
- review queue UX
- graph visualization modal/editor UX

**Evidence**

- `frontend/src/App.tsx` defines only `/` and `*`.
- `frontend/src/pages/` contains only `Home.tsx`.
- README claims "frontend pages for workspaces, templates, projects, task inbox, flow detail, and activity feed", but those pages are not present.

### 2. Comments and threaded discussion

The design treats comments as a first-class collaboration surface, but that layer is not wired.

- A `comment` table/model exists in the schema and models.
- There are no comment repositories, handlers, routes, or frontend screens.
- Comments cannot currently attach to workspaces, project types, projects, flows, tasks, artifacts, or review sessions through the public API.

### 3. Review and feedback behavior is simplified

Review/feedback nodes exist, but the richer collaboration semantics from the docs are not implemented yet.

- review sessions are created with `requested_reviewers_json = []`
- there is no requested participant/reviewer management
- the first review decision resolves the review session
- the first feedback entry resolves the feedback session
- sessions are not anchored to specific artifact revision ids
- downstream nodes do not receive structured internal review/feedback context beyond what clients can infer from separate task/session/artifact reads

This means the documented "multi-round" interaction model is only partially implemented.

### 4. Task compatibility, assignment, and inbox policy

The docs describe compatibility-aware assignment and personal inbox behavior. Current behavior is broader and simpler.

- claim/assign permissions are based on workspace/project roles, not authored node-role compatibility
- there is no enforcement that a task assignee/claimant matches the DSL role kind or specific role id on the node
- `/api/v1/tasks/inbox` returns all visible tasks in selected statuses, not a filtered personal/compatible inbox
- requested reviewers are not enforced during review submission

### 5. Authoring validation and publication depth

The authoring surface exists, but it does not yet match the full design depth.

- schema validation is implemented
- semantic validation covers duplicates, role existence, artifact visibility, invalid writes, and missing edge endpoints
- ambiguous artifact resolution detection is not implemented
- there is no richer template diffing, graph-aware authoring projection, or review workflow around publication
- published versions store `publishedBy`, snapshot JSON, and summary JSON, but not the fuller publication metadata described in `design.md`
- the broader draft lifecycle (`in_review`, `superseded`, `archived`) is not exposed

### 6. Conflict and idempotency contract

The backend uses optimistic version checks, but the full mutation contract from the design is not complete.

- many mutations accept `expectedVersion`
- conflict responses are generic error envelopes and do not return fresh state/version metadata
- there is no `ETag`/`If-Match` support
- high-value mutations do not accept idempotency keys

### 7. Prompt composition and review/feedback context propagation

The DSL docs call for role `default_prompt` plus node `prompt` composition, and for review/feedback context to flow downstream internally.

- `default_prompt` is parsed from the DSL but not applied anywhere in runtime/task responses
- task responses expose only the node-level `prompt`
- review/feedback outputs are stored as session data, but the runtime does not inject that context into downstream task payloads

## Documentation drift worth fixing later

- `docs/design.md` references `ui-design.md`, but that file is not present under `docs/`.
- README overstates the current frontend surface by describing pages that are not implemented yet.
- `docs/design.md` says the frontend should check `/auth/v1/humans/me`, while the backend currently exposes `/api/v1/auth/me` and the frontend does not perform that session bootstrap.

## Bottom line

ClawWorkshop already has a meaningful backend foundation for authoring and runtime execution, but it is not yet at parity with the documented product. The main remaining work is the actual application UI plus deeper collaboration/runtime semantics around comments, reviewer management, compatibility-aware assignment, and richer conflict handling.
