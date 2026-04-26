package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/authoring"
	"github.com/supremelosclaws/clawworkshop/backend/internal/ids"
	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

type createProjectTypeRequest struct {
	WorkspaceID string          `json:"workspaceId"`
	Key         string          `json:"key"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	DraftJSON   json.RawMessage `json:"draftJson"`
}

type updateProjectTypeRequest struct {
	Title           *string         `json:"title"`
	Description     *string         `json:"description"`
	DraftJSON       json.RawMessage `json:"draftJson"`
	ExpectedVersion int64           `json:"expectedVersion"`
}

type publishProjectTypeRequest struct {
	ExpectedVersion int64 `json:"expectedVersion"`
}

type projectTypeResponse struct {
	ID               string          `json:"id"`
	WorkspaceID      string          `json:"workspaceId"`
	Key              string          `json:"key"`
	Title            string          `json:"title"`
	Description      string          `json:"description"`
	Status           string          `json:"status"`
	Version          int64           `json:"version"`
	CurrentDraftJSON json.RawMessage `json:"currentDraftJson"`
}

type projectTypeVersionResponse struct {
	ID                    string          `json:"id"`
	ProjectTypeID         string          `json:"projectTypeId"`
	VersionNo             int             `json:"versionNo"`
	PublishedSnapshotJSON json.RawMessage `json:"publishedSnapshotJson"`
	SummaryJSON           json.RawMessage `json:"summaryJson"`
	PublishedBy           string          `json:"publishedBy"`
	PublishedAt           string          `json:"publishedAt"`
}

type validateProjectTypeResponse struct {
	ProjectTypeID string                     `json:"projectTypeId"`
	DraftVersion  int64                      `json:"draftVersion"`
	Result        authoring.ValidationResult `json:"result"`
}

func (d Dependencies) handleListProjectTypes(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypes, err := d.Store.ProjectTypes.ListVisible(r.Context(), actor.ID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_type_list_failed", "Failed to list project types.")
		return
	}

	response := make([]projectTypeResponse, 0, len(projectTypes))
	for _, projectType := range projectTypes {
		response = append(response, toProjectTypeResponse(projectType))
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleCreateProjectType(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	var request createProjectTypeRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid project type payload.")
		return
	}

	request.WorkspaceID = strings.TrimSpace(request.WorkspaceID)
	request.Key = strings.TrimSpace(request.Key)
	request.Title = strings.TrimSpace(request.Title)
	request.Description = strings.TrimSpace(request.Description)
	if request.WorkspaceID == "" || request.Key == "" || request.Title == "" {
		writeError(w, r, http.StatusBadRequest, "missing_fields", "workspaceId, key, and title are required.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), request.WorkspaceID, actor)
	if err != nil || !auth.CanAuthorTemplates(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot author templates in this workspace.")
		return
	}

	draftJSON, err := authoring.NormalizeDraft(request.DraftJSON, authoring.DraftMetadata{
		Key:         request.Key,
		Title:       request.Title,
		Description: request.Description,
	})
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_draft_json", err.Error())
		return
	}

	projectType := &models.ProjectType{
		ID:               ids.New(),
		WorkspaceID:      request.WorkspaceID,
		Key:              request.Key,
		Title:            request.Title,
		Description:      request.Description,
		Status:           "draft",
		CurrentDraftJSON: draftJSON,
		Version:          0,
		CreatedBy:        actor.ID,
		UpdatedBy:        actor.ID,
	}

	if err := d.Store.ProjectTypes.Create(r.Context(), projectType); err != nil {
		if isDuplicateKey(err) {
			writeError(w, r, http.StatusConflict, "project_type_conflict", "A template with this key already exists in the workspace.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_create_failed", "Failed to create template draft.")
		return
	}

	writeData(w, http.StatusCreated, toProjectTypeResponse(*projectType))
}

func (d Dependencies) handleGetProjectType(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	projectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), projectType.WorkspaceID, actor)
	if err != nil || !auth.CanReadWorkspace(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot access this template draft.")
		return
	}

	writeData(w, http.StatusOK, toProjectTypeResponse(*projectType))
}

func (d Dependencies) handleUpdateProjectType(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	currentProjectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), currentProjectType.WorkspaceID, actor)
	if err != nil || !auth.CanAuthorTemplates(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot modify this template draft.")
		return
	}

	var request updateProjectTypeRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid template update payload.")
		return
	}
	if request.ExpectedVersion < 0 {
		writeError(w, r, http.StatusBadRequest, "invalid_version", "expectedVersion is required.")
		return
	}

	title := currentProjectType.Title
	if request.Title != nil {
		title = strings.TrimSpace(*request.Title)
	}
	description := currentProjectType.Description
	if request.Description != nil {
		description = strings.TrimSpace(*request.Description)
	}
	if title == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_title", "Template title cannot be empty.")
		return
	}

	draftSource := currentProjectType.CurrentDraftJSON
	if len(request.DraftJSON) > 0 {
		draftSource = request.DraftJSON
	}

	normalizedDraft, err := authoring.NormalizeDraft(draftSource, authoring.DraftMetadata{
		Key:         currentProjectType.Key,
		Title:       title,
		Description: description,
	})
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_draft_json", err.Error())
		return
	}

	updatedProjectType, err := d.Store.ProjectTypes.UpdateDraft(r.Context(), store.UpdateProjectTypeDraftParams{
		ID:               projectTypeID,
		ExpectedVersion:  request.ExpectedVersion,
		Title:            title,
		Description:      description,
		CurrentDraftJSON: normalizedDraft,
		UpdatedBy:        actor.ID,
	})
	if err != nil {
		switch err {
		case store.ErrNotFound:
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "project_type_conflict", "Template draft version is stale.")
		default:
			writeError(w, r, http.StatusInternalServerError, "project_type_update_failed", "Failed to update template draft.")
		}
		return
	}

	writeData(w, http.StatusOK, toProjectTypeResponse(*updatedProjectType))
}

func (d Dependencies) handleValidateProjectType(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	projectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), projectType.WorkspaceID, actor)
	if err != nil || !auth.CanAuthorTemplates(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot validate this template draft.")
		return
	}

	validationResult, err := authoring.ValidateDraft(projectType.CurrentDraftJSON)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "validation_failed", "Failed to validate template draft.")
		return
	}

	reportJSON, err := json.Marshal(validationResult)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "validation_failed", "Failed to serialize validation report.")
		return
	}

	report := &models.ValidationReport{
		ID:            ids.New(),
		ProjectTypeID: projectType.ID,
		DraftVersion:  projectType.Version,
		Severity:      validationResult.HighestSeverity,
		ReportJSON:    reportJSON,
		CreatedBy:     actor.ID,
	}
	if err := d.Store.ProjectTypes.CreateValidationReport(r.Context(), report); err != nil {
		writeError(w, r, http.StatusInternalServerError, "validation_report_failed", "Failed to store validation report.")
		return
	}

	writeData(w, http.StatusOK, validateProjectTypeResponse{
		ProjectTypeID: projectType.ID,
		DraftVersion:  projectType.Version,
		Result:        validationResult,
	})
}

func (d Dependencies) handlePublishProjectType(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	projectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), projectType.WorkspaceID, actor)
	if err != nil || !auth.CanAuthorTemplates(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot publish this template draft.")
		return
	}

	var request publishProjectTypeRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid publish payload.")
		return
	}

	validationResult, err := authoring.ValidateDraft(projectType.CurrentDraftJSON)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "publish_validation_failed", "Failed to validate template draft before publishing.")
		return
	}
	if !validationResult.Valid {
		writeData(w, http.StatusUnprocessableEntity, validateProjectTypeResponse{
			ProjectTypeID: projectType.ID,
			DraftVersion:  projectType.Version,
			Result:        validationResult,
		})
		return
	}

	summaryJSON, err := json.Marshal(map[string]any{
		"key":         projectType.Key,
		"title":       projectType.Title,
		"description": projectType.Description,
		"publishedBy": actor.ID,
	})
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "publish_failed", "Failed to build publish summary.")
		return
	}

	version, err := d.Store.ProjectTypes.Publish(r.Context(), store.PublishProjectTypeParams{
		ProjectTypeID:         projectType.ID,
		VersionID:             ids.New(),
		ExpectedVersion:       request.ExpectedVersion,
		PublishedSnapshotJSON: projectType.CurrentDraftJSON,
		SummaryJSON:           summaryJSON,
		PublishedBy:           actor.ID,
	})
	if err != nil {
		switch err {
		case store.ErrNotFound:
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "project_type_conflict", "Template draft version is stale.")
		default:
			writeError(w, r, http.StatusInternalServerError, "publish_failed", "Failed to publish template draft.")
		}
		return
	}

	writeData(w, http.StatusCreated, toProjectTypeVersionResponse(*version))
}

func (d Dependencies) handleListProjectTypeVersions(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	projectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), projectType.WorkspaceID, actor)
	if err != nil || !auth.CanReadWorkspace(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot access template versions in this workspace.")
		return
	}

	versions, err := d.Store.ProjectTypes.ListVersions(r.Context(), projectTypeID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_type_versions_failed", "Failed to list template versions.")
		return
	}

	response := make([]projectTypeVersionResponse, 0, len(versions))
	for _, version := range versions {
		response = append(response, toProjectTypeVersionResponse(version))
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleGetProjectTypeVersion(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projectTypeID := chi.URLParam(r, "id")
	projectType, err := d.Store.ProjectTypes.GetByID(r.Context(), projectTypeID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_not_found", "Template draft not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_lookup_failed", "Failed to load template draft.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), projectType.WorkspaceID, actor)
	if err != nil || !auth.CanReadWorkspace(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_type_forbidden", "You cannot access this template version.")
		return
	}

	version, err := d.Store.ProjectTypes.GetVersionByID(r.Context(), projectTypeID, chi.URLParam(r, "versionId"))
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "project_type_version_not_found", "Template version not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "project_type_version_lookup_failed", "Failed to load template version.")
		return
	}

	writeData(w, http.StatusOK, toProjectTypeVersionResponse(*version))
}

func toProjectTypeResponse(projectType models.ProjectType) projectTypeResponse {
	return projectTypeResponse{
		ID:               projectType.ID,
		WorkspaceID:      projectType.WorkspaceID,
		Key:              projectType.Key,
		Title:            projectType.Title,
		Description:      projectType.Description,
		Status:           projectType.Status,
		Version:          projectType.Version,
		CurrentDraftJSON: projectType.CurrentDraftJSON,
	}
}

func toProjectTypeVersionResponse(version models.ProjectTypeVersion) projectTypeVersionResponse {
	return projectTypeVersionResponse{
		ID:                    version.ID,
		ProjectTypeID:         version.ProjectTypeID,
		VersionNo:             version.VersionNo,
		PublishedSnapshotJSON: version.PublishedSnapshotJSON,
		SummaryJSON:           version.SummaryJSON,
		PublishedBy:           version.PublishedBy,
		PublishedAt:           version.PublishedAt.UTC().Format(time.RFC3339),
	}
}
