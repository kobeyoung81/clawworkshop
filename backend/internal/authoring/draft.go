package authoring

import (
	"encoding/json"
	"errors"
)

type DraftMetadata struct {
	Key         string
	Title       string
	Description string
}

func NormalizeDraft(raw json.RawMessage, metadata DraftMetadata) (json.RawMessage, error) {
	var document map[string]any

	if len(raw) == 0 {
		document = map[string]any{
			"project_type": map[string]any{
				"id":             metadata.Key,
				"name":           metadata.Title,
				"version":        "0.1.0",
				"description":    metadata.Description,
				"parameters":     []any{},
				"roles":          []any{},
				"artifacts":      []any{},
				"workflow_types": []any{},
			},
		}
	} else {
		if err := json.Unmarshal(raw, &document); err != nil {
			return nil, errors.New("draftJson must be valid JSON")
		}
	}

	projectTypeRaw, ok := document["project_type"]
	if !ok {
		return nil, errors.New(`draftJson must contain a "project_type" object`)
	}

	projectType, ok := projectTypeRaw.(map[string]any)
	if !ok {
		return nil, errors.New(`draftJson.project_type must be an object`)
	}

	projectType["id"] = metadata.Key
	projectType["name"] = metadata.Title
	projectType["description"] = metadata.Description
	if _, ok := projectType["version"]; !ok {
		projectType["version"] = "0.1.0"
	}
	ensureArray(projectType, "parameters")
	ensureArray(projectType, "roles")
	ensureArray(projectType, "artifacts")
	ensureArray(projectType, "workflow_types")

	normalized, err := json.Marshal(document)
	if err != nil {
		return nil, err
	}

	return normalized, nil
}

func ensureArray(target map[string]any, key string) {
	if _, ok := target[key]; !ok {
		target[key] = []any{}
	}
}
