package api

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/ids"
	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

var workspaceSlugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,127}$`)

type createWorkspaceRequest struct {
	Slug          string `json:"slug"`
	Name          string `json:"name"`
	DefaultLocale string `json:"defaultLocale"`
}

type createWorkspaceMemberRequest struct {
	SubjectID   string `json:"subjectId"`
	SubjectType string `json:"subjectType"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

type updateWorkspaceMemberRequest struct {
	Role   *string `json:"role"`
	Status *string `json:"status"`
}

type workspaceResponse struct {
	ID            string `json:"id"`
	Slug          string `json:"slug"`
	Name          string `json:"name"`
	DefaultLocale string `json:"defaultLocale"`
	Status        string `json:"status"`
	ActorRole     string `json:"actorRole,omitempty"`
}

type workspaceMemberResponse struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	SubjectID   string `json:"subjectId"`
	SubjectType string `json:"subjectType"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

func (d Dependencies) handleListWorkspaces(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	workspaces, err := d.Store.Workspaces.ListVisible(r.Context(), actor.ID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "workspace_list_failed", "Failed to list workspaces.")
		return
	}

	response := make([]workspaceResponse, 0, len(workspaces))
	for _, workspace := range workspaces {
		response = append(response, workspaceResponse{
			ID:            workspace.ID,
			Slug:          workspace.Slug,
			Name:          workspace.Name,
			DefaultLocale: workspace.DefaultLocale,
			Status:        workspace.Status,
			ActorRole:     workspace.ActorRole,
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleCreateWorkspace(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}
	if actor.SubjectType != auth.SubjectTypeHuman {
		writeError(w, r, http.StatusForbidden, "workspace_creation_forbidden", "Only human actors can create workspaces.")
		return
	}

	var request createWorkspaceRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid workspace payload.")
		return
	}

	request.Slug = strings.TrimSpace(strings.ToLower(request.Slug))
	request.Name = strings.TrimSpace(request.Name)
	request.DefaultLocale = strings.TrimSpace(request.DefaultLocale)
	if request.DefaultLocale == "" {
		request.DefaultLocale = "en"
	}

	if !workspaceSlugPattern.MatchString(request.Slug) {
		writeError(w, r, http.StatusBadRequest, "invalid_slug", "Workspace slug must be lowercase letters, numbers, or hyphens.")
		return
	}
	if request.Name == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_name", "Workspace name is required.")
		return
	}

	workspace := &models.Workspace{
		ID:            ids.New(),
		Slug:          request.Slug,
		Name:          request.Name,
		DefaultLocale: request.DefaultLocale,
		Status:        "active",
	}
	ownerMembership := &models.WorkspaceMember{
		ID:          ids.New(),
		WorkspaceID: workspace.ID,
		SubjectID:   actor.ID,
		SubjectType: string(actor.SubjectType),
		Role:        string(auth.WorkspaceRoleOwner),
		Status:      "active",
	}

	if err := d.Store.Workspaces.CreateWorkspaceWithOwner(r.Context(), workspace, ownerMembership); err != nil {
		if isDuplicateKey(err) {
			writeError(w, r, http.StatusConflict, "workspace_slug_conflict", "Workspace slug already exists.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "workspace_create_failed", "Failed to create workspace.")
		return
	}

	writeData(w, http.StatusCreated, workspaceResponse{
		ID:            workspace.ID,
		Slug:          workspace.Slug,
		Name:          workspace.Name,
		DefaultLocale: workspace.DefaultLocale,
		Status:        workspace.Status,
		ActorRole:     string(auth.WorkspaceRoleOwner),
	})
}

func (d Dependencies) handleGetWorkspace(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	workspaceID := chi.URLParam(r, "id")
	role, err := d.Authorizer.WorkspaceRole(r.Context(), workspaceID, actor)
	if err != nil {
		status := http.StatusForbidden
		code := "workspace_forbidden"
		if err == auth.ErrMembershipMissing {
			status = http.StatusNotFound
			code = "workspace_not_found"
		}
		writeError(w, r, status, code, "Workspace access denied.")
		return
	}

	workspace, err := d.Store.Workspaces.GetByID(r.Context(), workspaceID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "workspace_not_found", "Workspace not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "workspace_lookup_failed", "Failed to load workspace.")
		return
	}

	writeData(w, http.StatusOK, workspaceResponse{
		ID:            workspace.ID,
		Slug:          workspace.Slug,
		Name:          workspace.Name,
		DefaultLocale: workspace.DefaultLocale,
		Status:        workspace.Status,
		ActorRole:     string(role),
	})
}

func (d Dependencies) handleListWorkspaceMembers(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	workspaceID := chi.URLParam(r, "id")
	if _, err := d.Authorizer.WorkspaceRole(r.Context(), workspaceID, actor); err != nil {
		status := http.StatusForbidden
		code := "workspace_forbidden"
		if err == auth.ErrMembershipMissing {
			status = http.StatusNotFound
			code = "workspace_not_found"
		}
		writeError(w, r, status, code, "Workspace access denied.")
		return
	}

	members, err := d.Store.Workspaces.ListMembers(r.Context(), workspaceID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "member_list_failed", "Failed to load workspace members.")
		return
	}

	response := make([]workspaceMemberResponse, 0, len(members))
	for _, member := range members {
		response = append(response, workspaceMemberResponse{
			ID:          member.ID,
			WorkspaceID: member.WorkspaceID,
			SubjectID:   member.SubjectID,
			SubjectType: member.SubjectType,
			Role:        member.Role,
			Status:      member.Status,
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleCreateWorkspaceMember(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	workspaceID := chi.URLParam(r, "id")
	role, err := d.Authorizer.WorkspaceRole(r.Context(), workspaceID, actor)
	if err != nil || !auth.CanManageMembership(role) {
		writeError(w, r, http.StatusForbidden, "member_management_forbidden", "You cannot manage workspace members.")
		return
	}

	var request createWorkspaceMemberRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid member payload.")
		return
	}

	request.SubjectID = strings.TrimSpace(request.SubjectID)
	request.SubjectType = strings.TrimSpace(request.SubjectType)
	request.Role = strings.TrimSpace(request.Role)
	if request.Status == "" {
		request.Status = "active"
	}

	if request.SubjectID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_subject", "subjectId is required.")
		return
	}
	if err := validateWorkspaceMemberRole(request.SubjectType, request.Role); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_role", err.Error())
		return
	}

	member := &models.WorkspaceMember{
		ID:          ids.New(),
		WorkspaceID: workspaceID,
		SubjectID:   request.SubjectID,
		SubjectType: request.SubjectType,
		Role:        request.Role,
		Status:      request.Status,
	}
	if err := d.Store.Workspaces.AddMember(r.Context(), member); err != nil {
		if isDuplicateKey(err) {
			writeError(w, r, http.StatusConflict, "member_conflict", "Member already exists in this workspace.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "member_create_failed", "Failed to add workspace member.")
		return
	}

	writeData(w, http.StatusCreated, workspaceMemberResponse{
		ID:          member.ID,
		WorkspaceID: member.WorkspaceID,
		SubjectID:   member.SubjectID,
		SubjectType: member.SubjectType,
		Role:        member.Role,
		Status:      member.Status,
	})
}

func (d Dependencies) handleUpdateWorkspaceMember(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	workspaceID := chi.URLParam(r, "id")
	role, err := d.Authorizer.WorkspaceRole(r.Context(), workspaceID, actor)
	if err != nil || !auth.CanManageMembership(role) {
		writeError(w, r, http.StatusForbidden, "member_management_forbidden", "You cannot manage workspace members.")
		return
	}

	memberID := chi.URLParam(r, "memberId")
	currentMember, err := d.Store.Workspaces.GetMemberByID(r.Context(), workspaceID, memberID)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "member_not_found", "Workspace member not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "member_lookup_failed", "Failed to load workspace member.")
		return
	}

	var request updateWorkspaceMemberRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid member update payload.")
		return
	}

	nextRole := currentMember.Role
	if request.Role != nil {
		nextRole = strings.TrimSpace(*request.Role)
	}
	nextStatus := currentMember.Status
	if request.Status != nil {
		nextStatus = strings.TrimSpace(*request.Status)
	}
	if request.Role == nil && request.Status == nil {
		writeError(w, r, http.StatusBadRequest, "empty_update", "At least one field must be updated.")
		return
	}
	if err := validateWorkspaceMemberRole(currentMember.SubjectType, nextRole); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_role", err.Error())
		return
	}

	if currentMember.Role == string(auth.WorkspaceRoleOwner) &&
		(nextRole != string(auth.WorkspaceRoleOwner) || nextStatus != "active") {
		ownerCount, countErr := d.Store.Workspaces.CountActiveOwners(r.Context(), workspaceID)
		if countErr != nil {
			writeError(w, r, http.StatusInternalServerError, "owner_count_failed", "Failed to validate workspace ownership.")
			return
		}
		if ownerCount <= 1 {
			writeError(w, r, http.StatusConflict, "last_owner_conflict", "Workspace must keep at least one active owner.")
			return
		}
	}

	updatedMember, err := d.Store.Workspaces.UpdateMember(r.Context(), workspaceID, memberID, nextRole, nextStatus)
	if err != nil {
		if err == store.ErrNotFound {
			writeError(w, r, http.StatusNotFound, "member_not_found", "Workspace member not found.")
			return
		}
		writeError(w, r, http.StatusInternalServerError, "member_update_failed", "Failed to update workspace member.")
		return
	}

	writeData(w, http.StatusOK, workspaceMemberResponse{
		ID:          updatedMember.ID,
		WorkspaceID: updatedMember.WorkspaceID,
		SubjectID:   updatedMember.SubjectID,
		SubjectType: updatedMember.SubjectType,
		Role:        updatedMember.Role,
		Status:      updatedMember.Status,
	})
}

func validateWorkspaceMemberRole(subjectType string, role string) error {
	switch auth.SubjectType(subjectType) {
	case auth.SubjectTypeHuman:
		switch auth.WorkspaceRole(role) {
		case auth.WorkspaceRoleOwner, auth.WorkspaceRoleAdmin, auth.WorkspaceRoleMember, auth.WorkspaceRoleViewer:
			return nil
		}
	case auth.SubjectTypeAgent:
		if auth.WorkspaceRole(role) == auth.WorkspaceRoleMember {
			return nil
		}
	}

	return auth.ErrForbidden
}
