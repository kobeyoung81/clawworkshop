# clawworkshop

Documentation workspace for a minimal JSON DSL used to describe AI-assisted project workflows.

## Current DSL shape

- **Merged node/task model**: workflows contain executable nodes directly; there is no separate `task_types` layer.
- **Concrete artifacts**: the schema declares concrete artifacts such as `brief.md`, `prd.md`, or `wireframe.png`, not reusable artifact types.
- **Scoped artifacts**: artifacts may be declared at **project**, **workflow**, or **node** scope, and each artifact is defined in exactly one scope.
- **Direct artifact references**: `input` and `work` nodes declare `reads` and `writes` using artifact ids directly, with no named input/output ports and no `artifact_map`.
- **Special interactive nodes**: `review` and `feedback` nodes may be multi-round; they read artifacts but deliver human input internally to downstream nodes instead of writing normal artifact outputs.
- **Graph-driven execution**: workflow behavior is expressed through node kinds and edges; there is no `execution_mode` field.
- **Built-in node kinds**: `input`, `work`, `review`, `feedback`, and `end`.

## Repository guide

| File | Purpose |
|---|---|
| `docs/Minimal-DSL-Design.md` | Core design document for the DSL |
| `docs/design.md` | Software design document for the full ClawWorkshop district app |
| `docs/PRD.md` | Product requirements for the platform and DSL |
| `docs/project-type.schema.json` | JSON Schema for validating project type files |
| `docs/project-type-example.json` | Example DSL document that matches the schema |

## Design highlights

- Use **project-scoped artifacts** for deliverables shared across workflows.
- Use **workflow-scoped artifacts** for files shared inside one workflow.
- Use **node-scoped artifacts** for local artifacts owned by a single node.
- Use **artifact ids directly** in node `reads` and `writes`, for example `prd.md`.
- Treat **review** and **feedback** as special interactive nodes whose human input is routed internally, not modeled as a single artifact write.
- Use **review** nodes for approval decisions and **feedback** nodes for human commentary that does not itself approve or reject work.
