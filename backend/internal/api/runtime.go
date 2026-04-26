package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/authoring"
	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
	runtimeengine "github.com/supremelosclaws/clawworkshop/backend/internal/runtime"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

type createProjectRequest struct {
	WorkspaceID          string                                  `json:"workspaceId"`
	ProjectTypeVersionID string                                  `json:"projectTypeVersionId"`
	Name                 string                                  `json:"name"`
	Description          string                                  `json:"description"`
	ParameterValuesJSON  json.RawMessage                         `json:"parameterValuesJson"`
	Participants         []runtimeengine.ProjectParticipantInput `json:"participants"`
}

type updateProjectRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	Status          *string `json:"status"`
	ExpectedVersion int64   `json:"expectedVersion"`
}

type startFlowRequest struct {
	ExpectedVersion int64 `json:"expectedVersion"`
}

type assignTaskRequest struct {
	AssigneeID      string `json:"assigneeId"`
	AssigneeType    string `json:"assigneeType"`
	ExpectedVersion int64  `json:"expectedVersion"`
}

type claimTaskRequest struct {
	ExpectedVersion int64 `json:"expectedVersion"`
}

type releaseTaskRequest struct {
	ExpectedVersion int64 `json:"expectedVersion"`
}

type completeTaskRequest struct {
	ExpectedVersion int64                              `json:"expectedVersion"`
	Outputs         []runtimeengine.ArtifactWriteInput `json:"outputs"`
}

type reviewTaskRequest struct {
	ExpectedVersion        int64  `json:"expectedVersion"`
	ExpectedSessionVersion int64  `json:"expectedSessionVersion"`
	Outcome                string `json:"outcome"`
	Comment                string `json:"comment"`
}

type feedbackTaskRequest struct {
	ExpectedVersion        int64  `json:"expectedVersion"`
	ExpectedSessionVersion int64  `json:"expectedSessionVersion"`
	Summary                string `json:"summary"`
	Body                   string `json:"body"`
}

type createArtifactRevisionRequest struct {
	ExpectedVersion int64           `json:"expectedVersion"`
	ContentKind     string          `json:"contentKind"`
	MimeType        string          `json:"mimeType"`
	BodyText        string          `json:"bodyText"`
	BodyJSON        json.RawMessage `json:"bodyJson"`
	BodyBase64      string          `json:"bodyBase64"`
	BaseRevisionNo  int             `json:"baseRevisionNo"`
}

type updateCursorRequest struct {
	LastSeenSeq int64 `json:"lastSeenSeq"`
}

type projectParticipantResponse struct {
	ID          string `json:"id"`
	SubjectID   string `json:"subjectId"`
	SubjectType string `json:"subjectType"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

type projectResponse struct {
	ID                   string                       `json:"id"`
	WorkspaceID          string                       `json:"workspaceId"`
	ProjectTypeID        string                       `json:"projectTypeId,omitempty"`
	ProjectTypeVersionID string                       `json:"projectTypeVersionId"`
	Name                 string                       `json:"name"`
	Description          string                       `json:"description"`
	Status               string                       `json:"status"`
	Version              int64                        `json:"version"`
	ParameterValuesJSON  json.RawMessage              `json:"parameterValuesJson"`
	TemplateWorkflowKeys []string                     `json:"templateWorkflowKeys,omitempty"`
	ActorProjectRole     string                       `json:"actorProjectRole,omitempty"`
	Participants         []projectParticipantResponse `json:"participants,omitempty"`
}

type flowResponse struct {
	ID            string         `json:"id"`
	ProjectID     string         `json:"projectId"`
	WorkflowKey   string         `json:"workflowKey"`
	FlowSequence  int            `json:"flowSequence"`
	Status        string         `json:"status"`
	BlockedReason string         `json:"blockedReason"`
	Version       int64          `json:"version"`
	Tasks         []taskResponse `json:"tasks,omitempty"`
}

type taskResponse struct {
	ID                       string   `json:"id"`
	FlowID                   string   `json:"flowId"`
	NodeKey                  string   `json:"nodeKey"`
	NodeKind                 string   `json:"nodeKind"`
	Title                    string   `json:"title"`
	Description              string   `json:"description,omitempty"`
	Role                     string   `json:"role,omitempty"`
	Prompt                   string   `json:"prompt,omitempty"`
	Status                   string   `json:"status"`
	ClaimOwnerID             string   `json:"claimOwnerId,omitempty"`
	CurrentAssignmentID      string   `json:"currentAssignmentId,omitempty"`
	CurrentReviewSessionID   string   `json:"currentReviewSessionId,omitempty"`
	CurrentFeedbackSessionID string   `json:"currentFeedbackSessionId,omitempty"`
	Version                  int64    `json:"version"`
	Reads                    []string `json:"reads,omitempty"`
	Writes                   []string `json:"writes,omitempty"`
}

type assignmentResponse struct {
	ID           string    `json:"id"`
	AssigneeID   string    `json:"assigneeId"`
	AssigneeType string    `json:"assigneeType"`
	Source       string    `json:"source"`
	Status       string    `json:"status"`
	Version      int64     `json:"version"`
	CreatedBy    string    `json:"createdBy"`
	UpdatedBy    string    `json:"updatedBy"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type reviewDecisionResponse struct {
	ID          string    `json:"id"`
	ReviewerID  string    `json:"reviewerId"`
	Outcome     string    `json:"outcome"`
	CommentBody string    `json:"commentBody"`
	CreatedAt   time.Time `json:"createdAt"`
}

type reviewSessionResponse struct {
	ID         string                   `json:"id"`
	Status     string                   `json:"status"`
	Outcome    string                   `json:"outcome,omitempty"`
	Version    int64                    `json:"version"`
	ResolvedAt *time.Time               `json:"resolvedAt,omitempty"`
	Decisions  []reviewDecisionResponse `json:"decisions,omitempty"`
}

type feedbackEntryResponse struct {
	ID        string    `json:"id"`
	AuthorID  string    `json:"authorId"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
}

type feedbackSessionResponse struct {
	ID         string                  `json:"id"`
	Status     string                  `json:"status"`
	Summary    string                  `json:"summary,omitempty"`
	Version    int64                   `json:"version"`
	ResolvedAt *time.Time              `json:"resolvedAt,omitempty"`
	Entries    []feedbackEntryResponse `json:"entries,omitempty"`
}

type artifactRevisionResponse struct {
	ID             string          `json:"id"`
	RevisionNo     int             `json:"revisionNo"`
	ContentKind    string          `json:"contentKind"`
	MimeType       string          `json:"mimeType"`
	ByteSize       int64           `json:"byteSize"`
	ChecksumSHA256 string          `json:"checksumSha256,omitempty"`
	CreatedBy      string          `json:"createdBy"`
	BaseRevisionNo int             `json:"baseRevisionNo"`
	CreatedAt      time.Time       `json:"createdAt"`
	BodyText       string          `json:"bodyText,omitempty"`
	BodyJSON       json.RawMessage `json:"bodyJson,omitempty"`
	BodyBase64     string          `json:"bodyBase64,omitempty"`
}

type artifactResponse struct {
	ID                string                     `json:"id"`
	ProjectID         string                     `json:"projectId"`
	ArtifactKey       string                     `json:"artifactKey"`
	ScopeType         string                     `json:"scopeType"`
	ScopeRef          string                     `json:"scopeRef"`
	CurrentRevisionNo int                        `json:"currentRevisionNo"`
	Version           int64                      `json:"version"`
	CurrentRevision   *artifactRevisionResponse  `json:"currentRevision,omitempty"`
	Revisions         []artifactRevisionResponse `json:"revisions,omitempty"`
}

type taskDetailResponse struct {
	Task            taskResponse             `json:"task"`
	ProjectID       string                   `json:"projectId"`
	WorkflowKey     string                   `json:"workflowKey"`
	FlowSequence    int                      `json:"flowSequence"`
	Assignments     []assignmentResponse     `json:"assignments,omitempty"`
	Artifacts       []artifactResponse       `json:"artifacts,omitempty"`
	ReviewSession   *reviewSessionResponse   `json:"reviewSession,omitempty"`
	FeedbackSession *feedbackSessionResponse `json:"feedbackSession,omitempty"`
}

type taskInboxItemResponse struct {
	ProjectID        string       `json:"projectId"`
	ProjectName      string       `json:"projectName"`
	WorkspaceID      string       `json:"workspaceId"`
	WorkflowKey      string       `json:"workflowKey"`
	FlowSequence     int          `json:"flowSequence"`
	ActorProjectRole string       `json:"actorProjectRole,omitempty"`
	Task             taskResponse `json:"task"`
}

type eventResponse struct {
	ID             string          `json:"id"`
	Seq            int64           `json:"seq"`
	WorkspaceID    string          `json:"workspaceId"`
	ProjectID      string          `json:"projectId,omitempty"`
	FlowID         string          `json:"flowId,omitempty"`
	Topic          string          `json:"topic"`
	SubjectType    string          `json:"subjectType"`
	SubjectID      string          `json:"subjectId"`
	SubjectVersion int64           `json:"subjectVersion"`
	ActorID        string          `json:"actorId"`
	PayloadJSON    json.RawMessage `json:"payloadJson"`
	CreatedAt      time.Time       `json:"createdAt"`
}

type notificationCursorResponse struct {
	FeedName    string    `json:"feedName"`
	LastSeenSeq int64     `json:"lastSeenSeq"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (d Dependencies) handleListProjects(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	projects, err := d.Store.Projects.ListVisible(r.Context(), actor.ID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_list_failed", "Failed to list projects.")
		return
	}

	response := make([]projectResponse, 0, len(projects))
	for _, project := range projects {
		response = append(response, projectResponse{
			ID:                   project.ID,
			WorkspaceID:          project.WorkspaceID,
			ProjectTypeVersionID: project.ProjectTypeVersionID,
			Name:                 project.Name,
			Description:          project.Description,
			Status:               project.Status,
			Version:              project.Version,
			ParameterValuesJSON:  project.ParameterValuesJSON,
			ActorProjectRole:     project.ActorProjectRole,
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	var request createProjectRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid project payload.")
		return
	}

	request.WorkspaceID = strings.TrimSpace(request.WorkspaceID)
	request.ProjectTypeVersionID = strings.TrimSpace(request.ProjectTypeVersionID)
	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	if request.WorkspaceID == "" || request.ProjectTypeVersionID == "" || request.Name == "" {
		writeError(w, r, http.StatusBadRequest, "missing_fields", "workspaceId, projectTypeVersionId, and name are required.")
		return
	}

	workspaceRole, err := d.Authorizer.WorkspaceRole(r.Context(), request.WorkspaceID, actor)
	if err != nil || !auth.CanCreateProjects(workspaceRole) {
		writeError(w, r, http.StatusForbidden, "project_create_forbidden", "You cannot create projects in this workspace.")
		return
	}

	project, err := d.Runtime.CreateProject(r.Context(), runtimeengine.CreateProjectParams{
		WorkspaceID:          request.WorkspaceID,
		ProjectTypeVersionID: request.ProjectTypeVersionID,
		Name:                 request.Name,
		Description:          request.Description,
		ParameterValuesJSON:  request.ParameterValuesJSON,
		Participants:         request.Participants,
		Actor:                auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrNotFound:
			writeError(w, r, http.StatusNotFound, "project_type_version_not_found", "Published template version not found.")
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "project_create_conflict", "Published template version does not belong to this workspace.")
		default:
			writeError(w, r, http.StatusInternalServerError, "project_create_failed", "Failed to create project.")
		}
		return
	}

	response, err := d.buildProjectResponse(r.Context(), project, actor)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_lookup_failed", "Failed to load project detail.")
		return
	}

	writeData(w, http.StatusCreated, response)
}

func (d Dependencies) handleGetProject(w http.ResponseWriter, r *http.Request) {
	project, actor, _, _, err := d.authorizeProject(r, false)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project access denied.")
		return
	}

	response, err := d.buildProjectResponse(r.Context(), project, actor)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_lookup_failed", "Failed to load project detail.")
		return
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	project, actor, workspaceRole, projectRole, err := d.authorizeProject(r, true)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project access denied.")
		return
	}
	if !canManageProject(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "project_update_forbidden", "You cannot update this project.")
		return
	}

	var request updateProjectRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid project update payload.")
		return
	}
	if request.ExpectedVersion < 0 {
		writeError(w, r, http.StatusBadRequest, "invalid_version", "expectedVersion is required.")
		return
	}

	updates := map[string]any{
		"updated_by": actor.ID,
		"version":    gorm.Expr("version + 1"),
	}
	if request.Name != nil {
		updates["name"] = strings.TrimSpace(*request.Name)
	}
	if request.Description != nil {
		updates["description"] = strings.TrimSpace(*request.Description)
	}
	if request.Status != nil {
		updates["status"] = strings.TrimSpace(*request.Status)
	}

	result := d.Store.DB.WithContext(r.Context()).
		Model(&models.Project{}).
		Where("id = ? AND version = ?", project.ID, request.ExpectedVersion).
		Updates(updates)
	if result.Error != nil {
		writeError(w, r, http.StatusInternalServerError, "project_update_failed", "Failed to update project.")
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, r, http.StatusConflict, "project_conflict", "Project version is stale.")
		return
	}

	updatedProject, err := d.Store.Projects.GetByID(r.Context(), project.ID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_lookup_failed", "Failed to load project detail.")
		return
	}

	response, err := d.buildProjectResponse(r.Context(), updatedProject, actor)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "project_lookup_failed", "Failed to load project detail.")
		return
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleStartFlow(w http.ResponseWriter, r *http.Request) {
	project, actor, workspaceRole, projectRole, err := d.authorizeProject(r, true)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project access denied.")
		return
	}
	if !canManageProject(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "flow_start_forbidden", "You cannot start flows in this project.")
		return
	}

	var request startFlowRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid flow start payload.")
		return
	}

	flow, err := d.Runtime.StartFlow(r.Context(), runtimeengine.StartFlowParams{
		ProjectID:              project.ID,
		WorkflowID:             chi.URLParam(r, "workflowId"),
		ExpectedProjectVersion: request.ExpectedVersion,
		Actor:                  auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "project_conflict", "Project version is stale.")
		case runtimeengine.ErrWorkflowNotFound:
			writeError(w, r, http.StatusNotFound, "workflow_not_found", "Workflow definition not found.")
		default:
			writeError(w, r, http.StatusInternalServerError, "flow_start_failed", "Failed to start flow.")
		}
		return
	}

	response, err := d.buildFlowResponse(r.Context(), flow)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "flow_lookup_failed", "Failed to load flow detail.")
		return
	}

	writeData(w, http.StatusCreated, response)
}

func (d Dependencies) handleListProjectFlows(w http.ResponseWriter, r *http.Request) {
	project, _, _, _, err := d.authorizeProject(r, false)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project access denied.")
		return
	}

	flows, err := d.Store.Flows.ListByProject(r.Context(), project.ID)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "flow_list_failed", "Failed to list project flows.")
		return
	}

	response := make([]flowResponse, 0, len(flows))
	for _, flow := range flows {
		response = append(response, flowResponse{
			ID:            flow.ID,
			ProjectID:     flow.ProjectID,
			WorkflowKey:   flow.WorkflowKey,
			FlowSequence:  flow.FlowSequence,
			Status:        flow.Status,
			BlockedReason: flow.BlockedReason,
			Version:       flow.Version,
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleGetFlow(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	flow, err := d.Store.Flows.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Flow not found.")
		return
	}
	project, err := d.Store.Projects.GetByID(r.Context(), flow.ProjectID)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project not found.")
		return
	}
	if _, _, err := d.authorizeProjectAccess(r.Context(), project, actor, false); err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Flow access denied.")
		return
	}

	response, err := d.buildFlowResponse(r.Context(), flow)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "flow_lookup_failed", "Failed to load flow detail.")
		return
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleAssignTask(w http.ResponseWriter, r *http.Request) {
	task, project, actor, workspaceRole, projectRole, err := d.authorizeTask(r)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !canManageProject(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "task_assign_forbidden", "You cannot assign this task.")
		return
	}

	var request assignTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task assignment payload.")
		return
	}

	updatedTask, err := d.Runtime.AssignTask(r.Context(), runtimeengine.AssignTaskParams{
		TaskID:          task.ID,
		AssigneeID:      strings.TrimSpace(request.AssigneeID),
		AssigneeType:    strings.TrimSpace(request.AssigneeType),
		ExpectedVersion: request.ExpectedVersion,
		Actor:           auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task version is stale.")
		case runtimeengine.ErrTaskNotReady:
			writeError(w, r, http.StatusConflict, "task_not_ready", "Task is not assignable in its current state.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_assign_failed", "Failed to assign task.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
	_ = project
}

func (d Dependencies) handleClaimTask(w http.ResponseWriter, r *http.Request) {
	task, _, actor, workspaceRole, projectRole, err := d.authorizeTask(r)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !canPerformTask(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "task_claim_forbidden", "You cannot claim this task.")
		return
	}

	var request claimTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task claim payload.")
		return
	}

	updatedTask, err := d.Runtime.ClaimTask(r.Context(), runtimeengine.ClaimTaskParams{
		TaskID:          task.ID,
		ExpectedVersion: request.ExpectedVersion,
		Actor:           *actor,
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task version is stale.")
		case runtimeengine.ErrTaskNotReady:
			writeError(w, r, http.StatusConflict, "task_not_ready", "Task is not ready to claim.")
		case runtimeengine.ErrTaskAlreadyClaimed:
			writeError(w, r, http.StatusConflict, "task_already_claimed", "Task is already claimed.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_claim_failed", "Failed to claim task.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
}

func (d Dependencies) handleReleaseTask(w http.ResponseWriter, r *http.Request) {
	task, _, actor, workspaceRole, projectRole, err := d.authorizeTask(r)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !(canManageProject(workspaceRole, projectRole) || task.ClaimOwnerID == actor.ID) {
		writeError(w, r, http.StatusForbidden, "task_release_forbidden", "You cannot release this task.")
		return
	}

	var request releaseTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task release payload.")
		return
	}

	updatedTask, err := d.Runtime.ReleaseTask(r.Context(), runtimeengine.ReleaseTaskParams{
		TaskID:          task.ID,
		ExpectedVersion: request.ExpectedVersion,
		Actor:           auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task version is stale.")
		case runtimeengine.ErrTaskNotInProgress:
			writeError(w, r, http.StatusConflict, "task_not_in_progress", "Task is not currently in progress.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_release_failed", "Failed to release task.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
}

func (d Dependencies) handleCompleteTask(w http.ResponseWriter, r *http.Request) {
	task, _, actor, workspaceRole, projectRole, err := d.authorizeTask(r)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !canPerformTask(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "task_complete_forbidden", "You cannot complete this task.")
		return
	}

	var request completeTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task completion payload.")
		return
	}

	updatedTask, err := d.Runtime.CompleteTask(r.Context(), runtimeengine.CompleteTaskParams{
		TaskID:          task.ID,
		ExpectedVersion: request.ExpectedVersion,
		Outputs:         request.Outputs,
		Actor:           *actor,
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task version is stale.")
		case runtimeengine.ErrTaskNotInProgress:
			writeError(w, r, http.StatusConflict, "task_not_in_progress", "Task is not currently in progress.")
		case runtimeengine.ErrTaskNotClaimed:
			writeError(w, r, http.StatusForbidden, "task_not_claimed", "You do not hold the active claim for this task.")
		case runtimeengine.ErrArtifactOutputMissing:
			writeError(w, r, http.StatusBadRequest, "missing_outputs", "Required artifact outputs are missing.")
		case runtimeengine.ErrArtifactNotFound:
			writeError(w, r, http.StatusNotFound, "artifact_not_found", "One or more declared artifacts do not exist.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_complete_failed", "Failed to complete task.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
}

func (d Dependencies) handleGetTask(w http.ResponseWriter, r *http.Request) {
	task, project, _, _, _, err := d.authorizeTaskAccess(r, false)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}

	flow, err := d.Store.Flows.GetByID(r.Context(), task.FlowID)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Flow not found.")
		return
	}

	response, err := d.buildTaskDetailResponse(r.Context(), task, flow, project)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "task_lookup_failed", "Failed to load task detail.")
		return
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleReviewTask(w http.ResponseWriter, r *http.Request) {
	task, _, actor, workspaceRole, projectRole, err := d.authorizeTaskAccess(r, true)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !canReviewTask(workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "task_review_forbidden", "You cannot review this task.")
		return
	}

	var request reviewTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task review payload.")
		return
	}

	updatedTask, err := d.Runtime.SubmitReview(r.Context(), runtimeengine.SubmitReviewParams{
		TaskID:                 task.ID,
		ExpectedVersion:        request.ExpectedVersion,
		ExpectedSessionVersion: request.ExpectedSessionVersion,
		Outcome:                strings.TrimSpace(request.Outcome),
		Comment:                request.Comment,
		Actor:                  auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task or review session version is stale.")
		case runtimeengine.ErrTaskNotAwaitingReview:
			writeError(w, r, http.StatusConflict, "task_not_awaiting_review", "Task is not awaiting review.")
		case runtimeengine.ErrReviewSessionClosed:
			writeError(w, r, http.StatusConflict, "review_session_closed", "Review session is already closed.")
		case runtimeengine.ErrInvalidReviewOutcome:
			writeError(w, r, http.StatusBadRequest, "invalid_review_outcome", "Review outcome must be approved or revise.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_review_failed", "Failed to submit review.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
}

func (d Dependencies) handleFeedbackTask(w http.ResponseWriter, r *http.Request) {
	task, _, actor, workspaceRole, projectRole, err := d.authorizeTaskAccess(r, true)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Task access denied.")
		return
	}
	if !canProvideFeedback(actor, workspaceRole, projectRole) {
		writeError(w, r, http.StatusForbidden, "task_feedback_forbidden", "You cannot provide feedback for this task.")
		return
	}

	var request feedbackTaskRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid task feedback payload.")
		return
	}

	updatedTask, err := d.Runtime.SubmitFeedback(r.Context(), runtimeengine.SubmitFeedbackParams{
		TaskID:                 task.ID,
		ExpectedVersion:        request.ExpectedVersion,
		ExpectedSessionVersion: request.ExpectedSessionVersion,
		Summary:                request.Summary,
		Body:                   request.Body,
		Actor:                  auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "task_conflict", "Task or feedback session version is stale.")
		case runtimeengine.ErrTaskNotAwaitingFeedback:
			writeError(w, r, http.StatusConflict, "task_not_awaiting_feedback", "Task is not awaiting feedback.")
		case runtimeengine.ErrFeedbackSessionClosed:
			writeError(w, r, http.StatusConflict, "feedback_session_closed", "Feedback session is already closed.")
		case runtimeengine.ErrArtifactOutputMissing:
			writeError(w, r, http.StatusBadRequest, "feedback_body_required", "Feedback body is required.")
		default:
			writeError(w, r, http.StatusInternalServerError, "task_feedback_failed", "Failed to submit feedback.")
		}
		return
	}

	node, _ := d.nodeForTask(r.Context(), updatedTask)
	writeData(w, http.StatusOK, d.toTaskResponse(updatedTask, node))
}

func (d Dependencies) handleGetArtifact(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	artifact, err := d.Store.Artifacts.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Artifact not found.")
		return
	}
	project, err := d.Store.Projects.GetByID(r.Context(), artifact.ProjectID)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project not found.")
		return
	}
	if _, _, err := d.authorizeProjectAccess(r.Context(), project, actor, false); err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Artifact access denied.")
		return
	}

	response, err := d.buildArtifactResponse(r.Context(), artifact, true)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "artifact_lookup_failed", "Failed to load artifact detail.")
		return
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleCreateArtifactRevision(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	artifact, err := d.Store.Artifacts.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Artifact not found.")
		return
	}
	project, err := d.Store.Projects.GetByID(r.Context(), artifact.ProjectID)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Project not found.")
		return
	}

	workspaceRole, projectRole, err := d.authorizeProjectAccess(r.Context(), project, actor, true)
	if err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Artifact access denied.")
		return
	}
	if !(canManageProject(workspaceRole, projectRole) || canPerformTask(workspaceRole, projectRole)) {
		writeError(w, r, http.StatusForbidden, "artifact_write_forbidden", "You cannot create revisions for this artifact.")
		return
	}

	var request createArtifactRevisionRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid artifact revision payload.")
		return
	}

	updatedArtifact, _, err := d.Runtime.CreateArtifactRevision(r.Context(), runtimeengine.CreateArtifactRevisionParams{
		ArtifactID:      artifact.ID,
		ExpectedVersion: request.ExpectedVersion,
		Revision: runtimeengine.ArtifactWriteInput{
			ArtifactKey:    artifact.ArtifactKey,
			ContentKind:    strings.TrimSpace(request.ContentKind),
			MimeType:       strings.TrimSpace(request.MimeType),
			BodyText:       request.BodyText,
			BodyJSON:       request.BodyJSON,
			BodyBase64:     request.BodyBase64,
			BaseRevisionNo: request.BaseRevisionNo,
		},
		Actor: auth.AuditActorFromActor(*actor),
	})
	if err != nil {
		switch err {
		case store.ErrConflict:
			writeError(w, r, http.StatusConflict, "artifact_conflict", "Artifact version is stale.")
		case runtimeengine.ErrArtifactNotFound:
			writeError(w, r, http.StatusNotFound, "artifact_not_found", "Artifact not found.")
		case runtimeengine.ErrArtifactOutputMissing:
			writeError(w, r, http.StatusBadRequest, "invalid_artifact_payload", "Artifact revision requires exactly one body payload.")
		default:
			writeError(w, r, http.StatusInternalServerError, "artifact_revision_failed", "Failed to create artifact revision.")
		}
		return
	}

	response, err := d.buildArtifactResponse(r.Context(), updatedArtifact, true)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "artifact_lookup_failed", "Failed to load artifact detail.")
		return
	}

	writeData(w, http.StatusCreated, response)
}

func (d Dependencies) handleTaskInbox(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	statuses := []string{"ready", "in_progress", "awaiting_review", "awaiting_feedback"}
	if raw := strings.TrimSpace(r.URL.Query().Get("status")); raw != "" {
		statuses = parseCSV(raw)
	}
	limit := 50
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	items, err := d.Store.Flows.ListInbox(r.Context(), actor.ID, statuses, limit)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "task_inbox_failed", "Failed to load task inbox.")
		return
	}

	response := make([]taskInboxItemResponse, 0, len(items))
	for _, item := range items {
		node, _ := d.nodeForTask(r.Context(), &item.Task)
		response = append(response, taskInboxItemResponse{
			ProjectID:        item.ProjectID,
			ProjectName:      item.ProjectName,
			WorkspaceID:      item.WorkspaceID,
			WorkflowKey:      item.WorkflowKey,
			FlowSequence:     item.FlowSequence,
			ActorProjectRole: item.ActorProjectRole,
			Task:             d.toTaskResponse(&item.Task, node),
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleListEvents(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	params := store.ListEventsParams{
		SubjectID:   actor.ID,
		WorkspaceID: strings.TrimSpace(r.URL.Query().Get("workspaceId")),
		ProjectID:   strings.TrimSpace(r.URL.Query().Get("projectId")),
		FlowID:      strings.TrimSpace(r.URL.Query().Get("flowId")),
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("sinceSeq")); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil {
			params.SinceSeq = parsed
		}
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			params.Limit = parsed
		}
	}

	if err := d.authorizeEventScope(r.Context(), actor, params); err != nil {
		writeError(w, r, httpStatusForError(err), errorCodeForError(err), "Event access denied.")
		return
	}

	events, err := d.Store.Events.List(r.Context(), params)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "event_list_failed", "Failed to query activity feed.")
		return
	}

	response := make([]eventResponse, 0, len(events))
	for _, event := range events {
		response = append(response, eventResponse{
			ID:             event.ID,
			Seq:            event.Seq,
			WorkspaceID:    event.WorkspaceID,
			ProjectID:      event.ProjectID,
			FlowID:         event.FlowID,
			Topic:          event.Topic,
			SubjectType:    event.SubjectType,
			SubjectID:      event.SubjectID,
			SubjectVersion: event.SubjectVersion,
			ActorID:        event.ActorID,
			PayloadJSON:    event.PayloadJSON,
			CreatedAt:      event.CreatedAt,
		})
	}

	writeData(w, http.StatusOK, response)
}

func (d Dependencies) handleUpdateEventCursor(w http.ResponseWriter, r *http.Request) {
	actor, ok := currentActor(r)
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	var request updateCursorRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Invalid cursor payload.")
		return
	}

	cursor, err := d.Store.Events.UpsertCursor(r.Context(), actor.ID, chi.URLParam(r, "feedName"), request.LastSeenSeq)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "cursor_update_failed", "Failed to update event cursor.")
		return
	}

	writeData(w, http.StatusOK, notificationCursorResponse{
		FeedName:    cursor.FeedName,
		LastSeenSeq: cursor.LastSeenSeq,
		UpdatedAt:   cursor.UpdatedAt,
	})
}

func (d Dependencies) authorizeProject(r *http.Request, requireParticipant bool) (*models.Project, *auth.Actor, auth.WorkspaceRole, auth.ProjectRole, error) {
	actor, ok := currentActor(r)
	if !ok {
		return nil, nil, "", "", auth.ErrUnauthorized
	}
	project, err := d.Store.Projects.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		return nil, nil, "", "", err
	}
	workspaceRole, projectRole, err := d.authorizeProjectAccess(r.Context(), project, actor, requireParticipant)
	if err != nil {
		return nil, nil, "", "", err
	}

	return project, actor, workspaceRole, projectRole, nil
}

func (d Dependencies) authorizeTask(r *http.Request) (*models.Task, *models.Project, *auth.Actor, auth.WorkspaceRole, auth.ProjectRole, error) {
	return d.authorizeTaskAccess(r, true)
}

func (d Dependencies) authorizeTaskAccess(r *http.Request, requireParticipant bool) (*models.Task, *models.Project, *auth.Actor, auth.WorkspaceRole, auth.ProjectRole, error) {
	actor, ok := currentActor(r)
	if !ok {
		return nil, nil, nil, "", "", auth.ErrUnauthorized
	}
	task, err := d.Store.Flows.GetTaskByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		return nil, nil, nil, "", "", err
	}
	flow, err := d.Store.Flows.GetByID(r.Context(), task.FlowID)
	if err != nil {
		return nil, nil, nil, "", "", err
	}
	project, err := d.Store.Projects.GetByID(r.Context(), flow.ProjectID)
	if err != nil {
		return nil, nil, nil, "", "", err
	}
	workspaceRole, projectRole, err := d.authorizeProjectAccess(r.Context(), project, actor, requireParticipant)
	if err != nil {
		return nil, nil, nil, "", "", err
	}

	return task, project, actor, workspaceRole, projectRole, nil
}

func (d Dependencies) authorizeProjectAccess(ctx context.Context, project *models.Project, actor *auth.Actor, requireParticipant bool) (auth.WorkspaceRole, auth.ProjectRole, error) {
	workspaceRole, err := d.Authorizer.WorkspaceRole(ctx, project.WorkspaceID, actor)
	if err != nil {
		if errors.Is(err, auth.ErrMembershipMissing) {
			return "", "", store.ErrNotFound
		}
		return "", "", err
	}
	if workspaceRole == auth.WorkspaceRoleOwner || workspaceRole == auth.WorkspaceRoleAdmin {
		return workspaceRole, "", nil
	}
	if !requireParticipant {
		projectRole, _ := d.Authorizer.ProjectRole(ctx, project.ID, actor)
		return workspaceRole, projectRole, nil
	}

	projectRole, err := d.Authorizer.ProjectRole(ctx, project.ID, actor)
	if err != nil {
		if errors.Is(err, auth.ErrMembershipMissing) {
			return workspaceRole, "", auth.ErrForbidden
		}
		return workspaceRole, "", err
	}

	return workspaceRole, projectRole, nil
}

func (d Dependencies) buildProjectResponse(ctx context.Context, project *models.Project, actor *auth.Actor) (projectResponse, error) {
	participants, err := d.Store.Projects.ListParticipants(ctx, project.ID)
	if err != nil {
		return projectResponse{}, err
	}
	projectRole, _ := d.Authorizer.ProjectRole(ctx, project.ID, actor)
	version, err := d.Store.ProjectTypes.GetVersion(ctx, project.ProjectTypeVersionID)
	if err != nil {
		return projectResponse{}, err
	}
	document, err := authoring.ParseProjectTypeDocument(version.PublishedSnapshotJSON)
	if err != nil {
		return projectResponse{}, err
	}
	workflowKeys := make([]string, 0, len(document.ProjectType.WorkflowTypes))
	for _, workflow := range document.ProjectType.WorkflowTypes {
		workflowKeys = append(workflowKeys, workflow.ID)
	}

	responseParticipants := make([]projectParticipantResponse, 0, len(participants))
	for _, participant := range participants {
		responseParticipants = append(responseParticipants, projectParticipantResponse{
			ID:          participant.ID,
			SubjectID:   participant.SubjectID,
			SubjectType: participant.SubjectType,
			Role:        participant.Role,
			Status:      participant.Status,
		})
	}

	return projectResponse{
		ID:                   project.ID,
		WorkspaceID:          project.WorkspaceID,
		ProjectTypeID:        version.ProjectTypeID,
		ProjectTypeVersionID: project.ProjectTypeVersionID,
		Name:                 project.Name,
		Description:          project.Description,
		Status:               project.Status,
		Version:              project.Version,
		ParameterValuesJSON:  project.ParameterValuesJSON,
		TemplateWorkflowKeys: workflowKeys,
		ActorProjectRole:     string(projectRole),
		Participants:         responseParticipants,
	}, nil
}

func (d Dependencies) buildFlowResponse(ctx context.Context, flow *models.Flow) (flowResponse, error) {
	tasks, err := d.Store.Flows.ListTasksByFlow(ctx, flow.ID)
	if err != nil {
		return flowResponse{}, err
	}

	workflow, err := authoring.ParseWorkflowDefinition(flow.WorkflowSnapshotJSON)
	if err != nil {
		return flowResponse{}, err
	}

	responseTasks := make([]taskResponse, 0, len(tasks))
	for _, task := range tasks {
		node, _ := workflow.NodeByID(task.NodeKey)
		responseTasks = append(responseTasks, d.toTaskResponse(&task, &node))
	}

	return flowResponse{
		ID:            flow.ID,
		ProjectID:     flow.ProjectID,
		WorkflowKey:   flow.WorkflowKey,
		FlowSequence:  flow.FlowSequence,
		Status:        flow.Status,
		BlockedReason: flow.BlockedReason,
		Version:       flow.Version,
		Tasks:         responseTasks,
	}, nil
}

func (d Dependencies) buildTaskDetailResponse(ctx context.Context, task *models.Task, flow *models.Flow, project *models.Project) (taskDetailResponse, error) {
	node, err := d.nodeForTask(ctx, task)
	if err != nil {
		return taskDetailResponse{}, err
	}

	assignments, err := d.Store.Flows.ListAssignmentsByTask(ctx, task.ID)
	if err != nil {
		return taskDetailResponse{}, err
	}

	artifactKeys := make([]string, 0, len(node.Reads)+len(node.Writes))
	seenKeys := make(map[string]struct{}, len(node.Reads)+len(node.Writes))
	for _, artifactKey := range append(append([]string{}, node.Reads...), node.Writes...) {
		if _, ok := seenKeys[artifactKey]; ok {
			continue
		}
		seenKeys[artifactKey] = struct{}{}
		artifactKeys = append(artifactKeys, artifactKey)
	}

	artifacts, err := d.Store.Artifacts.ListByProjectKeys(ctx, project.ID, artifactKeys)
	if err != nil {
		return taskDetailResponse{}, err
	}

	responseAssignments := make([]assignmentResponse, 0, len(assignments))
	for _, assignment := range assignments {
		responseAssignments = append(responseAssignments, assignmentResponse{
			ID:           assignment.ID,
			AssigneeID:   assignment.AssigneeID,
			AssigneeType: assignment.AssigneeType,
			Source:       assignment.Source,
			Status:       assignment.Status,
			Version:      assignment.Version,
			CreatedBy:    assignment.CreatedBy,
			UpdatedBy:    assignment.UpdatedBy,
			CreatedAt:    assignment.CreatedAt,
			UpdatedAt:    assignment.UpdatedAt,
		})
	}

	responseArtifacts := make([]artifactResponse, 0, len(artifacts))
	for i := range artifacts {
		artifactResponse, err := d.buildArtifactResponse(ctx, &artifacts[i], true)
		if err != nil {
			return taskDetailResponse{}, err
		}
		responseArtifacts = append(responseArtifacts, artifactResponse)
	}

	response := taskDetailResponse{
		Task:         d.toTaskResponse(task, node),
		ProjectID:    project.ID,
		WorkflowKey:  flow.WorkflowKey,
		FlowSequence: flow.FlowSequence,
		Assignments:  responseAssignments,
		Artifacts:    responseArtifacts,
	}
	if task.CurrentReviewSessionID != "" {
		session, err := d.buildReviewSessionResponse(ctx, task.CurrentReviewSessionID)
		if err != nil {
			return taskDetailResponse{}, err
		}
		response.ReviewSession = session
	}
	if task.CurrentFeedbackSessionID != "" {
		session, err := d.buildFeedbackSessionResponse(ctx, task.CurrentFeedbackSessionID)
		if err != nil {
			return taskDetailResponse{}, err
		}
		response.FeedbackSession = session
	}

	return response, nil
}

func (d Dependencies) buildArtifactResponse(ctx context.Context, artifact *models.ArtifactInstance, includeBodies bool) (artifactResponse, error) {
	revisions, err := d.Store.Artifacts.ListRevisions(ctx, artifact.ID)
	if err != nil {
		return artifactResponse{}, err
	}

	response := artifactResponse{
		ID:                artifact.ID,
		ProjectID:         artifact.ProjectID,
		ArtifactKey:       artifact.ArtifactKey,
		ScopeType:         artifact.ScopeType,
		ScopeRef:          artifact.ScopeRef,
		CurrentRevisionNo: artifact.CurrentRevisionNo,
		Version:           artifact.Version,
		Revisions:         make([]artifactRevisionResponse, 0, len(revisions)),
	}
	for _, revision := range revisions {
		revisionResponse := toArtifactRevisionResponse(revision, includeBodies)
		if revision.RevisionNo == artifact.CurrentRevisionNo {
			response.CurrentRevision = &revisionResponse
		}
		response.Revisions = append(response.Revisions, revisionResponse)
	}

	return response, nil
}

func (d Dependencies) buildReviewSessionResponse(ctx context.Context, sessionID string) (*reviewSessionResponse, error) {
	session, err := d.Store.Flows.GetReviewSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	decisions, err := d.Store.Flows.ListReviewDecisions(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	response := &reviewSessionResponse{
		ID:         session.ID,
		Status:     session.Status,
		Outcome:    session.Outcome,
		Version:    session.Version,
		ResolvedAt: session.ResolvedAt,
		Decisions:  make([]reviewDecisionResponse, 0, len(decisions)),
	}
	for _, decision := range decisions {
		response.Decisions = append(response.Decisions, reviewDecisionResponse{
			ID:          decision.ID,
			ReviewerID:  decision.ReviewerID,
			Outcome:     decision.Outcome,
			CommentBody: decision.CommentBody,
			CreatedAt:   decision.CreatedAt,
		})
	}

	return response, nil
}

func (d Dependencies) buildFeedbackSessionResponse(ctx context.Context, sessionID string) (*feedbackSessionResponse, error) {
	session, err := d.Store.Flows.GetFeedbackSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	entries, err := d.Store.Flows.ListFeedbackEntries(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	response := &feedbackSessionResponse{
		ID:         session.ID,
		Status:     session.Status,
		Summary:    session.Summary,
		Version:    session.Version,
		ResolvedAt: session.ResolvedAt,
		Entries:    make([]feedbackEntryResponse, 0, len(entries)),
	}
	for _, entry := range entries {
		response.Entries = append(response.Entries, feedbackEntryResponse{
			ID:        entry.ID,
			AuthorID:  entry.AuthorID,
			Body:      entry.Body,
			CreatedAt: entry.CreatedAt,
		})
	}

	return response, nil
}

func (d Dependencies) nodeForTask(ctx context.Context, task *models.Task) (*authoring.NodeDefinition, error) {
	flow, err := d.Store.Flows.GetByID(ctx, task.FlowID)
	if err != nil {
		return nil, err
	}

	workflow, err := authoring.ParseWorkflowDefinition(flow.WorkflowSnapshotJSON)
	if err != nil {
		return nil, err
	}

	node, ok := workflow.NodeByID(task.NodeKey)
	if !ok {
		return nil, runtimeengine.ErrWorkflowNotFound
	}

	return &node, nil
}

func (d Dependencies) toTaskResponse(task *models.Task, node *authoring.NodeDefinition) taskResponse {
	response := taskResponse{
		ID:                       task.ID,
		FlowID:                   task.FlowID,
		NodeKey:                  task.NodeKey,
		Status:                   task.Status,
		ClaimOwnerID:             task.ClaimOwnerID,
		CurrentAssignmentID:      task.CurrentAssignmentID,
		CurrentReviewSessionID:   task.CurrentReviewSessionID,
		CurrentFeedbackSessionID: task.CurrentFeedbackSessionID,
		Version:                  task.Version,
	}
	if node != nil {
		response.NodeKind = node.Kind
		response.Title = node.Title
		response.Description = node.Description
		response.Role = node.Role
		response.Prompt = node.Prompt
		response.Reads = node.Reads
		response.Writes = node.Writes
	}

	return response
}

func toArtifactRevisionResponse(revision models.ArtifactRevision, includeBodies bool) artifactRevisionResponse {
	response := artifactRevisionResponse{
		ID:             revision.ID,
		RevisionNo:     revision.RevisionNo,
		ContentKind:    revision.ContentKind,
		MimeType:       revision.MimeType,
		ByteSize:       revision.ByteSize,
		ChecksumSHA256: revision.ChecksumSHA256,
		CreatedBy:      revision.CreatedBy,
		BaseRevisionNo: revision.BaseRevisionNo,
		CreatedAt:      revision.CreatedAt,
	}
	if includeBodies {
		response.BodyText = revision.BodyText
		response.BodyJSON = revision.BodyJSON
		if len(revision.BodyBytes) > 0 {
			response.BodyBase64 = base64.StdEncoding.EncodeToString(revision.BodyBytes)
		}
	}

	return response
}

func canManageProject(workspaceRole auth.WorkspaceRole, projectRole auth.ProjectRole) bool {
	return workspaceRole == auth.WorkspaceRoleOwner ||
		workspaceRole == auth.WorkspaceRoleAdmin ||
		auth.CanManageProject(projectRole)
}

func canPerformTask(workspaceRole auth.WorkspaceRole, projectRole auth.ProjectRole) bool {
	return workspaceRole == auth.WorkspaceRoleOwner ||
		workspaceRole == auth.WorkspaceRoleAdmin ||
		auth.CanPerformWork(projectRole)
}

func canReviewTask(workspaceRole auth.WorkspaceRole, projectRole auth.ProjectRole) bool {
	return workspaceRole == auth.WorkspaceRoleOwner ||
		workspaceRole == auth.WorkspaceRoleAdmin ||
		auth.CanReviewWork(projectRole)
}

func canProvideFeedback(actor *auth.Actor, workspaceRole auth.WorkspaceRole, projectRole auth.ProjectRole) bool {
	return workspaceRole == auth.WorkspaceRoleOwner ||
		workspaceRole == auth.WorkspaceRoleAdmin ||
		(actor.SubjectType == auth.SubjectTypeHuman && auth.CanReadProject(projectRole))
}

func (d Dependencies) authorizeEventScope(ctx context.Context, actor *auth.Actor, params store.ListEventsParams) error {
	switch {
	case params.FlowID != "":
		flow, err := d.Store.Flows.GetByID(ctx, params.FlowID)
		if err != nil {
			return err
		}
		project, err := d.Store.Projects.GetByID(ctx, flow.ProjectID)
		if err != nil {
			return err
		}
		_, _, err = d.authorizeProjectAccess(ctx, project, actor, false)
		return err
	case params.ProjectID != "":
		project, err := d.Store.Projects.GetByID(ctx, params.ProjectID)
		if err != nil {
			return err
		}
		_, _, err = d.authorizeProjectAccess(ctx, project, actor, false)
		return err
	case params.WorkspaceID != "":
		workspaceRole, err := d.Authorizer.WorkspaceRole(ctx, params.WorkspaceID, actor)
		if err != nil {
			if errors.Is(err, auth.ErrMembershipMissing) {
				return store.ErrNotFound
			}
			return err
		}
		if !auth.CanReadWorkspace(workspaceRole) {
			return auth.ErrForbidden
		}
	}

	return nil
}

func parseCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		values = append(values, part)
	}

	return values
}

func httpStatusForError(err error) int {
	switch {
	case errors.Is(err, auth.ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(err, store.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, auth.ErrForbidden):
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
}

func errorCodeForError(err error) string {
	switch {
	case errors.Is(err, auth.ErrUnauthorized):
		return "unauthenticated"
	case errors.Is(err, store.ErrNotFound):
		return "not_found"
	case errors.Is(err, auth.ErrForbidden):
		return "forbidden"
	default:
		return "internal_error"
	}
}
