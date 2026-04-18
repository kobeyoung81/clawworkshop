# Product Requirements Document
# AI Agent Workflow Orchestration Platform

## 1. Overview

This product defines a minimal platform for authoring reusable AI-assisted project types and executing them as workflow-driven projects. A project type describes roles, concrete artifact definitions, workflows, and executable nodes using a JSON DSL backed by JSON Schema.

The current DSL model is intentionally compact:

- nodes and tasks are merged into one concept
- artifacts are concrete named deliverables such as `prd.md`, not artifact types
- artifact definitions are scoped to project, workflow, or node
- nodes reference artifacts directly by id through `reads` and `writes`
- execution flow is encoded in the graph rather than a separate execution-mode setting

## 2. Problem Statement

Teams building with AI agents still hand-wire prompts, review steps, and artifact flow on a per-project basis. That makes projects hard to repeat, validate, and govern.

The platform should provide a reusable structure for:

- defining who participates in a project
- defining which concrete artifacts exist in that project type
- expressing the workflow graph, including human review and human feedback
- validating project type files before they are used at runtime

## 3. Goals

- Define a minimal, machine-readable DSL for reusable project types
- Support both human and AI roles in the same workflow
- Model executable work directly as workflow nodes
- Define concrete artifacts once in the schema and keep their runtime content in the project instance
- Support artifact definitions at project, workflow, and node scope
- Let nodes read and write artifacts directly by artifact id
- Represent human approval and human feedback as first-class workflow constructs
- Keep the schema and example aligned with the design docs

## 4. Non-Goals (v1)

- Billing and cost management
- Real-time collaboration features
- Dynamic task generation at runtime
- Embedded scripting or rule engines
- Multi-tenant access control beyond basic role assignment
- Advanced retry, escalation, or scheduling policies

## 5. Core Concepts

### 5.1 Project Type

A project type is a reusable template for a class of projects. It defines:

- roles
- project-scoped artifacts
- workflow types
- optional parameters

### 5.2 Project Instance

A project instance is the runtime realization of a project type. It stores the actual artifact contents for the concrete artifacts declared by the project type and its workflows.

### 5.3 Workflow Type

A workflow type is a directed graph of executable nodes and edges. It may also define workflow-scoped artifacts that are visible only within that workflow.

### 5.4 Artifact

An artifact is a concrete deliverable declared in the schema, such as `brief.md`, `prd.md`, `prd-feedback.md`, or `wireframe.png`.

- the schema declares that the artifact may exist
- the project instance stores the actual content for that artifact

Artifacts may be defined at exactly one scope:

- **project**: reusable across workflows
- **workflow**: reusable inside one workflow
- **node**: local to one node

### 5.5 Node

A node is the unit of authored work in the DSL. It combines the former task contract and workflow placement into a single object. A non-terminal node defines:

- the role responsible for the node
- the prompt or instructions for that node
- which artifacts it reads
- which artifacts it writes
- optional node-scoped artifact declarations

### 5.6 Review Node

A `review` node captures an approval decision. Its important outcomes are `approved` and `revise`.

### 5.7 Feedback Node

A `feedback` node captures human commentary without serving as the formal approval gate. It is used when the workflow needs human direction, clarification, or revision notes but not a yes/no decision.

## 6. Execution Model

The workflow graph drives execution.

- nodes become ready when required upstream conditions are satisfied and the artifacts in `reads` are available
- nodes may create or update the artifacts listed in `writes`
- edges route control by outcome
- human approval is modeled through `review` nodes
- human commentary is modeled through `feedback` nodes

The DSL does **not** define an `execution_mode` such as auto or manual. The graph already expresses when work proceeds directly and when human participation is required.

## 7. Product Requirements

The platform must:

1. Accept project type definitions as JSON documents
2. Validate structure with JSON Schema before runtime registration
3. Support role definitions for both human and AI actors
4. Support project-, workflow-, and node-scoped artifact declarations
5. Restrict artifact `content_kind` to `markdown` and `image`
6. Support node kinds `input`, `work`, `review`, `feedback`, and `end`
7. Support direct artifact-id references from nodes through `reads` and `writes`
8. Keep edges focused on control-flow outcomes rather than artifact port mapping
9. Allow prompt composition from role defaults and node-specific instructions

## 8. Success Criteria

| Criterion | Measure |
|---|---|
| DSL is machine-readable | Project type files validate against JSON Schema |
| Example is trustworthy | Example JSON validates against the schema |
| Docs are aligned | README, PRD, design doc, schema, and example describe the same model |
| Human oversight is explicit | Review and feedback are both modeled in the graph |
| Artifact identity is concrete | Example artifacts are modeled as concrete ids such as `prd.md`, not abstract types |

## 9. Out of Scope for v1

- Runtime budgeting
- Task marketplaces
- Automatic retries and fallback policies
- Visual workflow editing
- Runtime policy languages
