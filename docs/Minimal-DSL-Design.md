# Minimal DSL Design for AI Agent Workflow Orchestration Platform

## 1. Purpose

This document defines a minimal JSON-based domain-specific language (DSL) for describing reusable project types for an AI agent workflow orchestration platform.

The DSL is designed to define the **meta layer only**. It does not contain runtime execution state.

The DSL describes:

- role types
- artifact types
- task types
- workflow types
- node and edge structure
- prompt defaults
- task/artifact compatibility
- sprint execution mode defaults

The runtime engine is responsible for instantiating projects and workflows from this definition.

## 2. Design Principles

The DSL is guided by the following principles:

### 2.1 Meta-definition only
The DSL defines reusable project structures and workflow templates, not live project state.

### 2.2 Minimal execution semantics
Execution behavior should be mostly expressed through workflow graph structure, node kinds, and edge conditions rather than a separate policy language.

### 2.3 Artifact-centric orchestration
Tasks consume and produce artifacts. Artifacts are the universal interface between tasks.

### 2.4 Remote actor compatibility
The DSL must support both human and remote AI actors.

### 2.5 Explicit review nodes
Review behavior should be modeled using dedicated review nodes rather than implicit task flags.

### 2.6 No agent-created tasks
All tasks are created by the platform according to predefined workflows.

### 2.7 Configurable sprint execution
The DSL allows project types to declare a default sprint execution mode. This allows teams to define whether agent work proceeds automatically or under explicit human control.

## 3. Scope

## 3.1 In Scope

- project type definitions
- reusable roles
- reusable artifact types
- reusable task types
- reusable workflow templates
- node kinds and edge routing
- prompt layering
- sprint execution mode (auto/manual)

## 3.2 Out of Scope

- runtime project instances
- workflow run state
- task execution logs
- actual actors or assignees
- actual artifact content
- comments and reviews as runtime objects
- retries, budgets, escalations, or advanced rule engines

## 4. Conceptual Model

The DSL root defines a **Project Type**.

A project type contains:

- roles
- artifact types
- task types
- workflow types
- optional parameters and metadata
- sprint execution mode default

A workflow type contains:

- nodes
- edges

Nodes reference task types and role types.

Edges define graph transitions and artifact flow.

## 5. Top-Level Structure

A project type document should have this high-level structure:

```json
{
  "project_type": {
    "id": "string",
    "name": "string",
    "version": "string",
    "description": "string",
    "execution_mode": "auto",
    "parameters": [],
    "roles": [],
    "artifact_types": [],
    "task_types": [],
    "workflow_types": []
  }
}
```

## 6. Core DSL Elements

## 6.1 Project Type

The top-level reusable definition.

### Fields

- `id`: unique identifier
- `name`: display name
- `version`: schema or definition version
- `description`: human-readable summary
- `execution_mode`: default sprint execution mode for project instances (`auto` or `manual`); defaults to `auto`
- `parameters`: optional list of configurable parameters
- `roles`: list of role definitions
- `artifact_types`: list of artifact type definitions
- `task_types`: list of task type definitions
- `workflow_types`: list of workflow definitions

## 6.2 Parameters

Optional reusable configuration inputs for a project type.

### Fields

- `id`
- `type`
- `required`
- `default` optional
- `description` optional

### Example

```json
{
  "id": "primary_language",
  "type": "string",
  "required": false,
  "default": "TypeScript",
  "description": "Primary implementation language"
}
```

## 6.3 Roles

Roles define abstract participant categories.

Roles are **not** concrete runtime actors. They are reusable role types such as human owner, coding agent, or review agent.

### Fields

- `id`
- `kind`: `human` or `agent`
- `description`
- `default_prompt`
- `allowed_task_types`

### Example

```json
{
  "id": "coding_agent",
  "kind": "agent",
  "description": "Remote agent that performs implementation work",
  "default_prompt": "You are a senior software engineer. Produce clean, maintainable, correct code.",
  "allowed_task_types": ["implement_code"]
}
```

## 6.4 Artifact Types

Artifact types define categories of task input and output.

### Recommended fields

- `id`
- `description`
- `content_kind`
- `schema_hint` optional

### Supported `content_kind` values for v1

- `markdown`
- `text`
- `json`
- `code`
- `bundle`

### Example

```json
{
  "id": "architecture_doc",
  "description": "System architecture design document",
  "content_kind": "markdown"
}
```

## 6.5 Task Types

Task types define reusable work contracts.

A task type answers:
- who can do it
- what it consumes
- what it produces
- what its default instructions are

### Fields

- `id`
- `description`
- `allowed_roles`
- `inputs`
- `outputs`
- `default_prompt`

### Input spec fields

- `name`
- `artifact_type`
- `required`

### Output spec fields

- `name`
- `artifact_type`

### Example

```json
{
  "id": "design_architecture",
  "description": "Produce an architecture document from an approved PRD",
  "allowed_roles": ["architect_agent"],
  "inputs": [
    { "name": "prd", "artifact_type": "prd_doc", "required": true }
  ],
  "outputs": [
    { "name": "architecture", "artifact_type": "architecture_doc" }
  ],
  "default_prompt": "Produce a pragmatic architecture covering components, interfaces, data flow, and tradeoffs."
}
```

## 6.6 Workflow Types

A workflow type defines a reusable graph of nodes and edges.

### Fields

- `id`
- `description`
- `nodes`
- `edges`

## 7. Node Model

Each workflow node represents a point in the workflow graph.

Nodes are later instantiated by the runtime engine as executable task instances.

### Common node fields

- `id`
- `kind`
- `title` optional
- `task_type` required except for end nodes
- `role` required except for end nodes
- `prompt_override` optional
- `sprint_eligible` optional; defaults to `true` for `work` nodes; controls whether a node may be included in a manual sprint batch

## 7.1 Supported Node Kinds

### `input`
Used to introduce initial artifacts into the workflow, usually by a human actor.

Typical outcome:
- `completed`

### `work`
Used for productive work performed by a human or agent.

Typical outcome:
- `completed`

Work nodes are sprint-eligible by default. In manual mode they enter a `claimable` state when all dependencies are satisfied, and a human can batch-select them into a sprint.

### `review`
Used to evaluate outputs from prior nodes.

Allowed outcomes:
- `approved`
- `revise`

### `end`
Marks workflow completion.

No task type is required for end nodes.

## 7.2 Node Example

```json
{
  "id": "review_prd_node",
  "kind": "review",
  "task_type": "review_prd",
  "role": "review_agent",
  "title": "Review PRD"
}
```

## 7.3 Sprint-Eligible Work Node Example

```json
{
  "id": "implement_feature_node",
  "kind": "work",
  "task_type": "implement_code",
  "role": "coding_agent",
  "title": "Implement Feature",
  "sprint_eligible": true
}
```

## 8. Edge Model

Edges connect nodes and determine routing behavior.

An edge becomes active when the source node finishes with the specified outcome.

### Fields

- `from`
- `to`
- `on`
- `artifact_map` optional

### `on`
The outcome value emitted by the source node.

Examples:
- `completed`
- `approved`
- `revise`

## 8.1 Artifact Mapping

Artifact mappings describe how source artifacts are bound into target task inputs.

### Mapping fields

- `from_output` optional
- `from_input` optional
- `to_input` required

Only one of `from_output` or `from_input` should be present in a single mapping.

This allows a review node to pass forward an approved upstream artifact using its input binding, without re-emitting it as a new output artifact.

### Output-to-input mapping example

```json
{
  "from": "draft_prd_node",
  "to": "review_prd_node",
  "on": "completed",
  "artifact_map": [
    { "from_output": "prd", "to_input": "prd" }
  ]
}
```

### Review pass-through mapping example

```json
{
  "from": "review_prd_node",
  "to": "design_architecture_node",
  "on": "approved",
  "artifact_map": [
    { "from_input": "prd", "to_input": "prd" }
  ]
}
```

## 9. Prompt Resolution

The runtime engine should compose the final prompt for a node using this order:

1. role `default_prompt`
2. task type `default_prompt`
3. node `prompt_override`

This is an engine convention, not a runtime field stored in the DSL output.

## 10. Minimal Engine Semantics

The DSL assumes a minimal workflow engine with these built-in behaviors.

### 10.1 Readiness
A node becomes ready when all required incoming dependencies are satisfied and all required task inputs are available.

### 10.2 Assignment
A node may only be assigned to an actor compatible with its role.

### 10.3 Completion
A node completion emits:
- its declared outputs
- an outcome value

### 10.4 Routing
Outgoing edges are selected by matching the emitted outcome.

### 10.5 Workflow completion
A workflow is complete when an end node is reached or no valid continuation exists.

### 10.6 Sprint execution
In auto mode, a ready `work` node that is sprint-eligible is started automatically by the engine.

In manual mode, a ready `work` node that is sprint-eligible enters the `claimable` state. A human may then select one or more `claimable` nodes assigned to a compatible role and trigger a sprint. The engine executes all selected nodes in the sprint run.

These are core engine semantics, not configurable policy blocks.

## 11. Validation Rules

A valid DSL document should satisfy these conditions:

1. The project type id is unique within its definition scope.
2. Every role id is unique.
3. Every artifact type id is unique.
4. Every task type id is unique.
5. Every workflow type id is unique.
6. Every node id is unique within a workflow.
7. Every referenced role exists.
8. Every referenced task type exists.
9. Every referenced artifact type exists.
10. Every node role is listed in the task type's `allowed_roles`.
11. Every edge source and target node exists.
12. Every `artifact_map` source name exists in the source task's inputs or outputs as appropriate.
13. Every `artifact_map` target input exists in the target task type.
14. Review nodes only use outcomes `approved` and `revise`.
15. End nodes do not define task types or roles.
16. End nodes should not have outgoing edges.
17. The `execution_mode` field, if present, must be `auto` or `manual`.
18. The `sprint_eligible` field, if present, must be a boolean and may only appear on `work` nodes.

## 12. Recommended Design Constraints

To preserve simplicity in v1, the DSL should avoid:

- embedded code or scripting
- dynamic task generation
- arbitrary conditional expressions
- retry/fallback rule blocks
- multi-review quorum logic
- automatic escalation blocks
- budget and cost policy sections

These can be added later if proven necessary.

## 13. Example Skeleton

```json
{
  "project_type": {
    "id": "example_project_type",
    "name": "Example Project Type",
    "version": "1.0.0",
    "description": "Minimal example",
    "execution_mode": "auto",
    "parameters": [],
    "roles": [
      {
        "id": "human_owner",
        "kind": "human",
        "description": "Human project owner",
        "default_prompt": "Provide direction and judgment.",
        "allowed_task_types": ["provide_brief", "review_output"]
      }
    ],
    "artifact_types": [
      {
        "id": "idea_doc",
        "description": "Initial idea document",
        "content_kind": "markdown"
      }
    ],
    "task_types": [
      {
        "id": "provide_brief",
        "description": "Provide initial brief",
        "allowed_roles": ["human_owner"],
        "inputs": [],
        "outputs": [
          { "name": "brief", "artifact_type": "idea_doc" }
        ],
        "default_prompt": "Provide the initial brief."
      }
    ],
    "workflow_types": [
      {
        "id": "example_flow",
        "description": "Simple workflow",
        "nodes": [
          {
            "id": "start",
            "kind": "input",
            "task_type": "provide_brief",
            "role": "human_owner"
          },
          {
            "id": "finish",
            "kind": "end"
          }
        ],
        "edges": [
          {
            "from": "start",
            "to": "finish",
            "on": "completed",
            "artifact_map": []
          }
        ]
      }
    ]
  }
}
```

## 14. Summary

This DSL is intentionally minimal.

It defines:
- who can participate
- what types of artifacts exist
- what kinds of tasks can be performed
- how tasks are connected in workflows
- how reviews and revisions are routed
- whether project instances run in auto or manual sprint mode

It does not define runtime state or advanced policy logic.

The central design idea is:

- keep definitions declarative
- keep workflow behavior structural
- keep engine semantics small
- keep artifacts as the primary interface between tasks

## 15. JSON Schema for DSL Validation

The DSL should be accompanied by a JSON Schema so that project type files can be validated automatically before being accepted by the platform.

Using JSON Schema allows the platform, CLI tools, editors, and CI pipelines to validate the basic structure of a DSL document.

### 15.1 Recommendation

Use JSON Schema Draft 2020-12 for the DSL schema.

Recommended schema declaration:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

### 15.2 What the JSON Schema Should Validate

The JSON Schema should validate:

- top-level object shape
- required fields
- allowed field types
- enum values such as node kinds, role kinds, and execution mode
- required arrays and nested object structures
- uniqueness constraints where practical
- artifact mapping shape
- node/task/role definition structure
- sprint eligibility field type

### 15.3 What Should Remain Engine Validation

Some validations are better handled by the workflow engine after schema validation.

These include:

- whether a node's role is compatible with the referenced task type
- whether all referenced ids exist across sections
- whether edge mappings reference valid task inputs/outputs
- whether workflow graphs are complete and reachable
- whether review nodes reference appropriate review task types
- whether end nodes appear in valid positions in the graph
- whether sprint-eligible nodes belong to roles that match real agent assignments

### 15.4 JSON Schema

See the accompanying `project-type.schema.json` file for the full JSON Schema for DSL validation.

### 15.5 Notes on the Schema

The schema intentionally validates structure, not all semantics.

For example:
- it checks that non-end nodes require `task_type` and `role`
- it checks that end nodes do not define `task_type` or `role`
- it checks that artifact mappings use either `from_input` or `from_output`, but not both
- it checks that `execution_mode` is either `auto` or `manual`
- it checks that `sprint_eligible` is a boolean

However, it does not guarantee that:
- ids are unique across arrays
- node references match real task definitions
- roles and task types are semantically compatible
- workflow graphs are logically valid
- sprint-eligible nodes are only assigned to agent roles

Those checks should be done by the platform after JSON Schema validation.

### 15.6 Recommended Validation Flow

A practical validation flow should be:

1. Validate the DSL file against the JSON Schema.
2. If schema validation passes, run engine-level semantic validation.
3. If semantic validation passes, accept and register the project type.

This two-layer validation model is recommended because it keeps the JSON Schema simple while still allowing strong correctness checks.

## 16. Sprints Feature

This section defines the design for the sprints feature and its impact on the DSL.

### 16.1 Concept

A **sprint** is a runtime execution unit that groups one or more ready work nodes and executes them together in a single run.

The sprint concept is motivated by two use cases:

1. **Auto mode**: An assigned AI agent should start work immediately when a node becomes ready, without waiting for human coordination.
2. **Manual mode**: A human should be able to select multiple ready work nodes assigned to the same role and trigger them all at once, rather than being required to start each individually.

### 16.2 Runtime Node States

Sprints introduce a `claimable` runtime node state between `waiting` and `in_progress`.

| State | Description |
|---|---|
| `waiting` | Dependencies not yet satisfied |
| `claimable` | Ready; waiting to be included in a sprint |
| `in_progress` | Sprint is running; node is being executed |
| `pending_review` | Work done; awaiting review node |
| `approved` | Review passed |
| `revising` | Sent back for revision |
| `completed` | Terminal success state |

The `claimable` state is a runtime concept. It is not stored in the DSL.

### 16.3 Execution Modes

The platform supports two sprint execution modes.

#### Auto Mode

When a work node becomes ready and is sprint-eligible:

1. The engine identifies the assigned actor compatible with the node's role.
2. The engine automatically starts a sprint for that node.
3. The actor executes the work and emits outputs and an outcome.

In auto mode, the `claimable` state is transient. The engine immediately claims the node on behalf of the assigned actor.

#### Manual Mode

When a work node becomes ready and is sprint-eligible:

1. The node enters the `claimable` state.
2. A human with access to the project sees the node as available.
3. The human may select one or more `claimable` nodes assigned to a compatible role.
4. The human triggers a sprint that executes all selected nodes in one run.

In manual mode, multiple `claimable` nodes may be batched into a single sprint if they share a compatible role.

### 16.4 Sprint Eligibility

Not all nodes should necessarily be sprint-eligible. For example, some nodes may require individual human confirmation before starting.

The DSL introduces an optional `sprint_eligible` field on `work` nodes to allow project type authors to mark specific nodes as not eligible for sprint batching.

- Default value: `true` for `work` nodes
- Nodes with `sprint_eligible: false` must be triggered individually even in auto mode

### 16.5 DSL Changes Required

The sprints feature requires the following additions to the DSL.

#### 16.5.1 New `execution_mode` field on Project Type

A new optional field `execution_mode` is added to the project type root.

```json
{
  "execution_mode": "auto"
}
```

Allowed values:
- `"auto"` (default): nodes are started automatically when ready
- `"manual"`: nodes enter `claimable` state; human triggers sprints

This field defines the **default** execution mode for project instances created from this project type. Individual instances may override this at runtime.

#### 16.5.2 New `sprint_eligible` field on Work Nodes

A new optional boolean field `sprint_eligible` is added to `work` nodes.

```json
{
  "id": "implement_feature_node",
  "kind": "work",
  "task_type": "implement_code",
  "role": "coding_agent",
  "sprint_eligible": true
}
```

Default value: `true`.

This field may only be set on nodes with `kind: "work"`. Setting it on other node kinds has no effect and should be avoided.

#### 16.5.3 No other DSL changes are required

Sprint execution, batching, state transitions, and actor assignment are engine responsibilities. They do not need to be encoded in the project type DSL.

Specifically, the following do **not** require new DSL fields:

- sprint batch size limits
- sprint timeout
- sprint retry behavior
- sprint assignment rules

These are engine-level concerns.

### 16.6 Summary of DSL Impact

| Feature | DSL Change | Engine Change |
|---|---|---|
| Auto vs manual execution mode | `execution_mode` field on project type | Engine reads and respects the mode |
| Claimable node state | None | Engine manages state transitions |
| Sprint batching | None | Engine handles batching |
| Sprint eligibility | `sprint_eligible` field on work nodes | Engine reads field and applies eligibility check |
| Sprint triggering (manual) | None | Engine exposes API for human to trigger sprint |
| Actor assignment | None | Engine handles assignment |

### 16.7 Recommendation

The sprints feature is primarily an engine-level feature with minimal DSL surface area.

The DSL changes are:

1. Add `execution_mode: "auto" | "manual"` to project type (optional, defaults to `"auto"`)
2. Add `sprint_eligible: boolean` to work nodes (optional, defaults to `true`)

All other sprint behavior is handled by the engine and does not need to be expressed in the project type DSL.
