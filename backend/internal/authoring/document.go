package authoring

import (
	"encoding/json"
	"errors"
)

type ProjectTypeDocument struct {
	ProjectType ProjectTypeDefinition `json:"project_type"`
}

type ProjectTypeDefinition struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	Version       string               `json:"version"`
	Description   string               `json:"description"`
	Roles         []RoleDefinition     `json:"roles"`
	Artifacts     []ArtifactDefinition `json:"artifacts"`
	WorkflowTypes []WorkflowDefinition `json:"workflow_types"`
}

type RoleDefinition struct {
	ID            string `json:"id"`
	Kind          string `json:"kind"`
	Description   string `json:"description"`
	DefaultPrompt string `json:"default_prompt"`
}

type ArtifactDefinition struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	ContentKind string `json:"content_kind"`
	SchemaHint  string `json:"schema_hint"`
}

type WorkflowDefinition struct {
	ID          string               `json:"id"`
	Description string               `json:"description"`
	Artifacts   []ArtifactDefinition `json:"artifacts"`
	Nodes       []NodeDefinition     `json:"nodes"`
	Edges       []EdgeDefinition     `json:"edges"`
}

type NodeDefinition struct {
	ID          string               `json:"id"`
	Kind        string               `json:"kind"`
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Role        string               `json:"role"`
	Prompt      string               `json:"prompt"`
	Reads       []string             `json:"reads"`
	Writes      []string             `json:"writes"`
	Artifacts   []ArtifactDefinition `json:"artifacts"`
}

type EdgeDefinition struct {
	From string `json:"from"`
	To   string `json:"to"`
	On   string `json:"on"`
}

func ParseProjectTypeDocument(raw json.RawMessage) (ProjectTypeDocument, error) {
	var document ProjectTypeDocument
	if err := json.Unmarshal(raw, &document); err != nil {
		return ProjectTypeDocument{}, err
	}

	if document.ProjectType.ID == "" {
		return ProjectTypeDocument{}, errors.New(`project_type.id is required`)
	}

	return document, nil
}

func ParseWorkflowDefinition(raw json.RawMessage) (WorkflowDefinition, error) {
	var workflow WorkflowDefinition
	if err := json.Unmarshal(raw, &workflow); err != nil {
		return WorkflowDefinition{}, err
	}
	if workflow.ID == "" {
		return WorkflowDefinition{}, errors.New("workflow id is required")
	}

	return workflow, nil
}

func (d ProjectTypeDocument) WorkflowByID(workflowID string) (WorkflowDefinition, bool) {
	for _, workflow := range d.ProjectType.WorkflowTypes {
		if workflow.ID == workflowID {
			return workflow, true
		}
	}

	return WorkflowDefinition{}, false
}

func (w WorkflowDefinition) NodeByID(nodeID string) (NodeDefinition, bool) {
	for _, node := range w.Nodes {
		if node.ID == nodeID {
			return node, true
		}
	}

	return NodeDefinition{}, false
}

func (w WorkflowDefinition) OutgoingEdges(nodeID string, on string) []EdgeDefinition {
	edges := make([]EdgeDefinition, 0)
	for _, edge := range w.Edges {
		if edge.From != nodeID {
			continue
		}
		if on != "" && edge.On != on {
			continue
		}
		edges = append(edges, edge)
	}

	return edges
}

func (w WorkflowDefinition) IncomingEdges(nodeID string) []EdgeDefinition {
	edges := make([]EdgeDefinition, 0)
	for _, edge := range w.Edges {
		if edge.To == nodeID {
			edges = append(edges, edge)
		}
	}

	return edges
}
