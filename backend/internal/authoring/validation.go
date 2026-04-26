package authoring

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/xeipuuv/gojsonschema"
)

type ValidationFinding struct {
	Severity string `json:"severity"`
	Code     string `json:"code"`
	Path     string `json:"path"`
	Message  string `json:"message"`
}

type ValidationResult struct {
	Valid           bool                `json:"valid"`
	HighestSeverity string              `json:"highestSeverity"`
	Findings        []ValidationFinding `json:"findings"`
}

func ValidateDraft(raw json.RawMessage) (ValidationResult, error) {
	findings := make([]ValidationFinding, 0)

	schemaBytes, err := loadSchema()
	if err != nil {
		return ValidationResult{}, err
	}

	schemaResult, err := gojsonschema.Validate(
		gojsonschema.NewBytesLoader(schemaBytes),
		gojsonschema.NewBytesLoader(raw),
	)
	if err != nil {
		return ValidationResult{}, err
	}

	for _, schemaErr := range schemaResult.Errors() {
		findings = append(findings, ValidationFinding{
			Severity: "error",
			Code:     "schema_violation",
			Path:     schemaErr.Field(),
			Message:  schemaErr.Description(),
		})
	}

	var document ProjectTypeDocument
	if err := json.Unmarshal(raw, &document); err == nil {
		findings = append(findings, semanticFindings(document)...)
	}

	return ValidationResult{
		Valid:           !hasErrors(findings),
		HighestSeverity: highestSeverity(findings),
		Findings:        findings,
	}, nil
}

func semanticFindings(document ProjectTypeDocument) []ValidationFinding {
	findings := make([]ValidationFinding, 0)

	roleIDs := make(map[string]struct{})
	for _, role := range document.ProjectType.Roles {
		if _, exists := roleIDs[role.ID]; exists {
			findings = append(findings, duplicateFinding("project_type.roles", role.ID))
			continue
		}
		roleIDs[role.ID] = struct{}{}
	}

	projectArtifacts := uniqueArtifactMap("project_type.artifacts", document.ProjectType.Artifacts, &findings)
	workflowIDs := make(map[string]struct{})

	for _, workflow := range document.ProjectType.WorkflowTypes {
		if _, exists := workflowIDs[workflow.ID]; exists {
			findings = append(findings, duplicateFinding("project_type.workflow_types", workflow.ID))
			continue
		}
		workflowIDs[workflow.ID] = struct{}{}

		workflowArtifacts := uniqueArtifactMap(fmt.Sprintf("workflow_types[%s].artifacts", workflow.ID), workflow.Artifacts, &findings)
		nodeIDs := make(map[string]struct{})
		nodeArtifacts := make(map[string]map[string]struct{})

		for _, node := range workflow.Nodes {
			if _, exists := nodeIDs[node.ID]; exists {
				findings = append(findings, duplicateFinding(fmt.Sprintf("workflow_types[%s].nodes", workflow.ID), node.ID))
				continue
			}
			nodeIDs[node.ID] = struct{}{}

			if node.Kind != "end" {
				if _, ok := roleIDs[node.Role]; !ok {
					findings = append(findings, ValidationFinding{
						Severity: "error",
						Code:     "missing_role",
						Path:     fmt.Sprintf("workflow_types[%s].nodes[%s].role", workflow.ID, node.ID),
						Message:  fmt.Sprintf("role %q is not defined", node.Role),
					})
				}
			}

			nodeScopedArtifacts := uniqueArtifactMap(
				fmt.Sprintf("workflow_types[%s].nodes[%s].artifacts", workflow.ID, node.ID),
				node.Artifacts,
				&findings,
			)
			nodeArtifacts[node.ID] = nodeScopedArtifacts

			if (node.Kind == "review" || node.Kind == "feedback" || node.Kind == "end") && len(node.Writes) > 0 {
				findings = append(findings, ValidationFinding{
					Severity: "error",
					Code:     "invalid_writes",
					Path:     fmt.Sprintf("workflow_types[%s].nodes[%s].writes", workflow.ID, node.ID),
					Message:  fmt.Sprintf("%s nodes cannot declare artifact writes", node.Kind),
				})
			}

			for _, artifactID := range node.Reads {
				if !artifactVisibleToNode(artifactID, node.ID, projectArtifacts, workflowArtifacts, nodeArtifacts) {
					findings = append(findings, missingArtifactFinding(workflow.ID, node.ID, "reads", artifactID))
				}
			}

			for _, artifactID := range node.Writes {
				if !artifactVisibleToNode(artifactID, node.ID, projectArtifacts, workflowArtifacts, nodeArtifacts) {
					findings = append(findings, missingArtifactFinding(workflow.ID, node.ID, "writes", artifactID))
				}
			}
		}

		for _, edge := range workflow.Edges {
			if _, ok := nodeIDs[edge.From]; !ok {
				findings = append(findings, ValidationFinding{
					Severity: "error",
					Code:     "missing_edge_source",
					Path:     fmt.Sprintf("workflow_types[%s].edges", workflow.ID),
					Message:  fmt.Sprintf("edge source %q does not exist", edge.From),
				})
			}
			if _, ok := nodeIDs[edge.To]; !ok {
				findings = append(findings, ValidationFinding{
					Severity: "error",
					Code:     "missing_edge_target",
					Path:     fmt.Sprintf("workflow_types[%s].edges", workflow.ID),
					Message:  fmt.Sprintf("edge target %q does not exist", edge.To),
				})
			}
		}
	}

	return findings
}

func loadSchema() ([]byte, error) {
	candidates := []string{
		filepath.Join("..", "docs", "project-type.schema.json"),
		filepath.Join("..", "..", "docs", "project-type.schema.json"),
	}

	for _, candidate := range candidates {
		schemaBytes, err := os.ReadFile(candidate)
		if err == nil {
			return schemaBytes, nil
		}
	}

	return nil, errors.New("project type schema file not found")
}

func uniqueArtifactMap(path string, artifacts []ArtifactDefinition, findings *[]ValidationFinding) map[string]struct{} {
	artifactIDs := make(map[string]struct{})
	for _, artifact := range artifacts {
		if _, exists := artifactIDs[artifact.ID]; exists {
			*findings = append(*findings, duplicateFinding(path, artifact.ID))
			continue
		}
		artifactIDs[artifact.ID] = struct{}{}
	}

	return artifactIDs
}

func artifactVisibleToNode(
	artifactID string,
	nodeID string,
	projectArtifacts map[string]struct{},
	workflowArtifacts map[string]struct{},
	nodeArtifacts map[string]map[string]struct{},
) bool {
	if _, ok := projectArtifacts[artifactID]; ok {
		return true
	}
	if _, ok := workflowArtifacts[artifactID]; ok {
		return true
	}
	if scopedArtifacts, ok := nodeArtifacts[nodeID]; ok {
		if _, ok := scopedArtifacts[artifactID]; ok {
			return true
		}
	}

	return false
}

func duplicateFinding(path string, id string) ValidationFinding {
	return ValidationFinding{
		Severity: "error",
		Code:     "duplicate_id",
		Path:     path,
		Message:  fmt.Sprintf("duplicate id %q", id),
	}
}

func missingArtifactFinding(workflowID string, nodeID string, direction string, artifactID string) ValidationFinding {
	return ValidationFinding{
		Severity: "error",
		Code:     "missing_artifact_reference",
		Path:     fmt.Sprintf("workflow_types[%s].nodes[%s].%s", workflowID, nodeID, direction),
		Message:  fmt.Sprintf("artifact %q is not visible to node %q", artifactID, nodeID),
	}
}

func hasErrors(findings []ValidationFinding) bool {
	for _, finding := range findings {
		if finding.Severity == "error" {
			return true
		}
	}
	return false
}

func highestSeverity(findings []ValidationFinding) string {
	if hasErrors(findings) {
		return "error"
	}
	if len(findings) > 0 {
		return findings[0].Severity
	}
	return "ok"
}
