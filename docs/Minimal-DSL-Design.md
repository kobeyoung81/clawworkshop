# Minimal DSL Design for AI Agent Workflow Orchestration Platform

## 1. Purpose

This document defines a minimal JSON-based DSL for describing reusable AI-assisted project types.

The DSL describes the **authoring layer only**. It does not encode runtime state, execution logs, or live actor assignments. Runtime artifact contents live in the project instance, not in the project type definition.

In this document, **workflow** and **node** are authored DSL concepts. The runtime application may refer to executed workflow instances as **flows** and executed node instances as **tasks**, but those runtime terms are out of scope for the DSL itself.

## 2. Design Principles

### 2.1 Node-centric authoring

Workflow nodes directly define the authored work contract, so there is no separate `task_types` layer.

### 2.2 Concrete artifacts

The DSL declares concrete artifacts such as `brief.md` or `prd.md`, not reusable artifact categories. A project type says which artifacts may exist; a project instance stores their contents.

### 2.3 Scoped artifact declarations

Artifacts may be declared at project, workflow, or node scope. The declaration location defines the artifact's visibility.

### 2.4 Direct artifact references

`input` and `work` nodes reference artifacts directly by artifact id using `reads` and `writes`. The DSL does not use named input/output ports or `artifact_map`.

### 2.5 Special interactive nodes

`review` and `feedback` nodes are special human-interaction nodes. They may be multi-round, and the human input they collect is routed internally to downstream nodes rather than modeled as a normal artifact write.

### 2.6 Graph-driven execution

Execution control is expressed through node kinds and edges. Review and feedback are explicit workflow constructs, so the DSL does not need a separate `execution_mode`.

### 2.7 Human and AI compatibility

The model must support both human and AI roles without giving either side a special top-level schema.

## 3. Scope

### 3.1 In scope

- project type definitions
- reusable roles
- project-, workflow-, and node-scoped artifact declarations
- workflow templates
- executable node definitions
- edge routing by outcome
- prompt layering

### 3.2 Out of scope

- runtime project instances
- runtime flow state
- runtime task state and execution logs
- actor scheduling policies
- retry, escalation, or budget rules
- embedded scripting

## 4. Conceptual Model

The DSL root defines a **project type**.

A project type contains:

- metadata
- optional parameters
- roles
- project-scoped artifacts
- workflow types

A workflow type contains:

- workflow-scoped artifacts
- nodes
- edges

A non-terminal node contains:

- a role
- a prompt
- `reads`
- `writes`, if the node is `input` or `work`
- optional node-scoped artifacts

At runtime, the project instance stores the actual content for artifacts declared by the project type, workflows, and nodes.

## 5. Top-level Structure

```json
{
  "project_type": {
    "id": "string",
    "name": "string",
    "version": "string",
    "description": "string",
    "parameters": [],
    "roles": [],
    "artifacts": [],
    "workflow_types": []
  }
}
```

## 6. Core DSL Elements

### 6.1 Project Type

The top-level reusable definition.

#### Fields

- `id`: unique identifier
- `name`: display name
- `version`: definition version
- `description`: human-readable summary
- `parameters`: optional configuration inputs
- `roles`: role definitions
- `artifacts`: project-scoped artifacts
- `workflow_types`: workflow definitions

### 6.2 Parameters

Optional reusable configuration inputs for a project type.

#### Fields

- `id`
- `type`
- `required`
- `default` optional
- `description` optional

### 6.3 Roles

Roles define reusable participant categories.

#### Fields

- `id`
- `kind`: `human` or `agent`
- `description`
- `default_prompt`

#### Example

```json
{
  "id": "coding_agent",
  "kind": "agent",
  "description": "Agent that implements software changes",
  "default_prompt": "You are a senior software engineer. Produce correct, maintainable deliverables."
}
```

### 6.4 Artifacts

Artifacts are concrete deliverables referenced directly by id.

#### Fields

- `id`
- `description`
- `content_kind`
- `schema_hint` optional

#### Supported `content_kind` values for v1

- `markdown`
- `image`

#### Artifact id guidance

Artifact ids should be stable, human-readable names such as:

- `brief.md`
- `prd.md`
- `wireframe.png`

The goal is to model concrete deliverables, not a reusable type with many runtime instances.

#### Scope rules

Artifacts may be declared at exactly one of these scopes:

1. **Project scope**: `project_type.artifacts`
2. **Workflow scope**: `workflow_type.artifacts`
3. **Node scope**: `node.artifacts`

The declaration scope defines visibility:

- project-scoped artifacts are visible to every workflow and node in the project type
- workflow-scoped artifacts are visible to nodes inside that workflow only
- node-scoped artifacts are visible only to the declaring node

If an artifact must be shared across multiple nodes, it should be declared at workflow or project scope rather than node scope.

#### Examples

Project-scoped artifact:

```json
{
  "id": "brief.md",
  "description": "Initial project brief",
  "content_kind": "markdown"
}
```

Workflow-scoped artifact:

```json
{
  "id": "prd.md",
  "description": "Workflow-local PRD",
  "content_kind": "markdown"
}
```

Node-scoped artifact:

```json
{
  "id": "wireframe-preview.png",
  "description": "Local preview image owned by a single node",
  "content_kind": "image"
}
```

### 6.5 Workflow Types

A workflow type defines a reusable graph of nodes and edges.

#### Fields

- `id`
- `description`
- `artifacts` optional
- `nodes`
- `edges`

### 6.6 Node Model

Each workflow node is an authored unit of work.

#### Common node fields

- `id`
- `kind`
- `title` optional
- `description` required except for end nodes
- `role` required except for end nodes
- `prompt` optional
- `reads` required except for end nodes
- `writes` required for `input` and `work` nodes
- `writes` should not be used on `review`, `feedback`, or `end` nodes
- `artifacts` optional, for node-scoped artifact declarations on `input` and `work` nodes

#### `reads`

An array of artifact ids the node requires access to before it can run.

#### `writes`

An array of artifact ids the node may create or update while it runs.

The arrays contain artifact ids directly, not named ports. A node that revises `prd.md` can list `prd.md` in both `reads` and `writes`.

`writes` is part of the normal artifact update path for `input` and `work` nodes only.

#### Supported node kinds

##### `input`

Introduces initial artifacts into the workflow, usually from a human role.

Typical outcome:

- `completed`

##### `work`

Represents productive work performed by a human or AI role.

Typical outcome:

- `completed`

##### `review`

Represents a formal approval decision.

Typical outcomes:

- `approved`
- `revise`

Review is a special interactive node kind:

- it may involve multiple rounds of human discussion before emitting an outcome
- it reads artifacts, but does not model the review conversation as a normal artifact write
- when routed to a downstream node, the engine may provide the collected human input internally as execution context

##### `feedback`

Represents human commentary, clarification, or revision notes that are not themselves the approval gate.

Typical outcome:

- `completed`

Feedback is also a special interactive node kind:

- it may involve multiple rounds of human discussion
- it reads artifacts, but does not use `writes` for that human input
- downstream nodes may receive the collected human input internally from the engine

##### `end`

Marks workflow completion.

End nodes do not define `role`, `description`, `prompt`, `reads`, `writes`, or `artifacts`.

#### Node example

```json
{
  "id": "draft_prd",
  "kind": "work",
  "title": "Draft PRD",
  "description": "Produce a PRD from the project brief",
  "role": "product_agent",
  "prompt": "Turn the brief into a complete PRD with scope and acceptance criteria.",
  "reads": ["brief.md"],
  "writes": ["prd.md"]
}
```

### 6.7 Artifact Resolution

Artifact ids referenced by a node must resolve to an artifact declared on:

1. the node itself
2. the containing workflow
3. the containing project type

The reference must be unambiguous. Validation should reject artifact declarations that cause ambiguous resolution for a node.

### 6.8 Edge Model

Edges connect nodes and determine routing behavior.

An edge becomes active when the source node finishes with the specified outcome.

#### Fields

- `from`
- `to`
- `on`

Edges do not carry artifact maps. Once a node is activated, it reads the artifacts named in its own `reads` array from the current project instance state.

For `review` and `feedback` nodes, outgoing edges may also carry internally managed human input to the downstream node. That human input is runtime state, not a declared artifact.

#### Example

```json
{
  "from": "approve_prd",
  "to": "revise_prd",
  "on": "revise"
}
```

## 7. Prompt Resolution

The runtime engine should compose the effective prompt in this order:

1. role `default_prompt`
2. node `prompt`

This keeps reusable role guidance separate from node-specific instructions.

## 8. Minimal Engine Semantics

The DSL assumes a minimal workflow engine with these behaviors:

### 8.1 Readiness

A node becomes ready when all required incoming dependencies are satisfied and every artifact in `reads` is available in project instance state.

### 8.2 Assignment

A node may only be assigned to an actor compatible with its role.

### 8.3 Completion

A node completion:

- for `input` and `work`, may create or update the artifacts listed in `writes`
- for `review` and `feedback`, may collect multi-round human input that the engine keeps internally
- emits an outcome value

### 8.4 Routing

Outgoing edges are selected by matching the emitted outcome.

### 8.5 Human oversight

- use `review` nodes when the workflow needs an approval decision
- use `feedback` nodes when the workflow needs human guidance without a formal approve/revise gate

The DSL does not define auto/manual execution modes. The workflow graph already expresses where human interaction occurs.

### 8.6 Workflow completion

A workflow is complete when an end node is reached or no valid continuation exists.

## 9. Validation Rules

A valid DSL document should satisfy these conditions:

1. The project type id is unique within the document.
2. Every role id is unique within the project type.
3. Every project-scoped artifact id is unique within the project type.
4. Every workflow id is unique within the project type.
5. Every workflow-scoped artifact id is unique within its workflow.
6. Every node id is unique within its workflow.
7. Every node-scoped artifact id is unique within its node.
8. Every referenced role exists.
9. Every artifact id named in `reads` or `writes` resolves to a visible artifact.
10. Every edge source and target node exists.
11. Review nodes should use `approved` and `revise` outcomes.
12. Feedback nodes should typically use `completed`.
13. `review` and `feedback` nodes should not define `writes`.
14. End nodes do not define role, prompt, reads, writes, or local artifacts.
15. Artifact references should resolve unambiguously for each node.

## 10. JSON Schema Guidance

The accompanying schema should validate:

- top-level object shape
- required fields
- allowed node kinds
- allowed role kinds
- allowed artifact content kinds
- conditional rules for end, review, and feedback nodes
- array shapes for `reads` and `writes`

The schema intentionally does not enforce every semantic rule. Cross-reference validation, scope resolution, and graph integrity should also be checked by the platform after schema validation.

## 11. Summary

This DSL is intentionally minimal.

It defines:

- who can participate
- which concrete artifacts may exist
- where artifact definitions are visible
- which artifacts each node reads and writes
- how nodes connect through explicit graph edges
- where human review and human feedback occur

It does not define runtime state, scheduling policy, or execution modes.
