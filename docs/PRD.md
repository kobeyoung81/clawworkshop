# Product Requirements Document
# AI Agent Workflow Orchestration Platform

## 1. Overview

This document defines the product requirements for an AI Agent Workflow Orchestration Platform. The platform enables teams to define reusable project types composed of roles, tasks, artifacts, and workflows, and to instantiate and run those projects using a combination of human actors and remote AI agents.

---

## 2. Problem Statement

Building software products with AI agents today requires manually wiring together agents, prompts, tools, and review cycles. There is no standard way to:

- define the shape of a collaborative AI-assisted project
- describe reusable roles, task contracts, and artifact flows
- orchestrate multi-agent workflows with explicit review gates
- allow human oversight and intervention at defined points

This platform addresses all of the above.

---

## 3. Goals

- Define a minimal, reusable DSL for describing AI agent project types
- Enable instantiation and execution of projects from project type definitions
- Support both human and AI actors in the same workflow
- Provide explicit review and revision loops
- Enable both automatic and manual sprint execution modes
- Keep the core platform simple and extensible

---

## 4. Non-Goals (v1)

- Real-time collaboration features
- Billing and cost management
- Advanced retry and escalation policies
- Agent marketplace or discovery
- Multi-tenant access control beyond basic role assignment
- Dynamic task generation at runtime

---

## 5. Core Concepts

### 5.1 Project Type

A project type is a reusable template that defines the complete structure of a class of projects. It contains roles, artifact types, task types, and workflow types. It is defined using the minimal DSL described in the accompanying design document.

### 5.2 Project Instance

A project instance is a live instantiation of a project type. It is created by the platform when a user starts a new project from a project type. The instance holds runtime state, actual actor assignments, and artifact content.

### 5.3 Roles

Roles are abstract participant categories defined in the project type. Examples include `human_owner`, `coding_agent`, and `review_agent`. Roles are not concrete runtime actors.

### 5.4 Artifact Types

Artifact types define the categories of inputs and outputs that flow between tasks. Examples include `prd_doc`, `architecture_doc`, `code_bundle`, and `review_feedback`.

### 5.5 Task Types

Task types define reusable work contracts. Each task type specifies which roles can perform it, what artifacts it consumes and produces, and what the default prompt is.

### 5.6 Workflow Types

Workflow types define a directed graph of nodes and edges. Nodes reference task types and roles. Edges define graph transitions triggered by node outcomes.

### 5.7 Sprint

A sprint is a runtime execution unit. Sprints can be triggered automatically (in auto mode) or manually (in manual mode). In auto mode, an assigned agent starts a sprint automatically when a work node becomes ready. In manual mode, a human selects one or more ready work nodes suitable for a role and triggers a sprint that executes all selected nodes in a single run.

---

## 6. Execution Modes

The platform supports two execution modes for project instances.

### 6.1 Auto Mode

In auto mode, nodes become ready according to the workflow graph and are automatically assigned to compatible actors. The assigned actor starts execution immediately without waiting for human approval.

This mode is suitable for fully automated pipelines where human intervention is limited to review gates.

### 6.2 Manual Mode

In manual mode, a human actor explicitly initiates execution for one or more ready work nodes. The human selects all or a subset of ready work nodes assigned to a specific role, and triggers a sprint that executes all selected nodes in one run.

This mode provides maximum human control over the pacing and scope of agent work.

---

## 7. Node States (Runtime)

Each workflow node instance goes through the following runtime states:

| State | Description |
|---|---|
| `waiting` | Not yet ready; upstream dependencies are not satisfied |
| `claimable` | Ready for execution; actor has not yet started |
| `in_progress` | Actor is actively working |
| `pending_review` | Work complete; awaiting review |
| `approved` | Review passed |
| `revising` | Sent back for revision |
| `completed` | Terminal success state |

---

## 8. Workflow Engine Requirements

The workflow engine must implement these behaviors:

1. Activate nodes when all required upstream dependencies are satisfied
2. Assign nodes to actors compatible with the node's role
3. Respect execution mode (auto vs manual) when starting nodes
4. Collect outputs and emit outcome values on completion
5. Select outgoing edges based on emitted outcome
6. Support sprint grouping in manual mode

---

## 9. Review and Revision Flow

Review nodes produce two outcomes: `approved` and `revise`.

- When `approved`, the workflow follows the edge leading forward
- When `revise`, the workflow follows the edge leading back to the target work node

This creates an explicit revision loop without requiring a separate policy construct.

---

## 10. Prompt Layering

The final prompt for a node is composed in this order:

1. Role `default_prompt`
2. Task type `default_prompt`
3. Node `prompt_override`

Later layers override earlier layers. This allows general role guidance to be refined by task-specific instructions and further adjusted per node if needed.

---

## 11. Success Criteria

| Criterion | Measure |
|---|---|
| Project type DSL is machine-readable | JSON Schema validation passes |
| Example project type is structurally valid | Validates against schema without errors |
| Workflow graph is executable | Engine can traverse nodes and edges |
| Sprint mode is configurable | Auto and manual modes are supported |
| Review loops are explicit | Graph structure encodes review-revision cycles |

---

## 12. Appendix: Out-of-Scope Features for v1

- Retry policy blocks
- Budget and cost tracking
- Escalation rules
- Multi-review quorum voting
- Dynamic task creation at runtime
- Embedded scripting or conditional expressions
- Agent marketplace

These may be considered for later versions if proven necessary.
