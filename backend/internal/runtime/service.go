package runtime

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/authoring"
	"github.com/supremelosclaws/clawworkshop/backend/internal/ids"
	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

type Service struct {
	store *store.Store
}

type ProjectParticipantInput struct {
	SubjectID   string
	SubjectType string
	Role        string
}

type CreateProjectParams struct {
	WorkspaceID          string
	ProjectTypeVersionID string
	Name                 string
	Description          string
	ParameterValuesJSON  json.RawMessage
	Participants         []ProjectParticipantInput
	Actor                auth.AuditActor
}

type StartFlowParams struct {
	ProjectID              string
	WorkflowID             string
	ExpectedProjectVersion int64
	Actor                  auth.AuditActor
}

type AssignTaskParams struct {
	TaskID          string
	AssigneeID      string
	AssigneeType    string
	ExpectedVersion int64
	Actor           auth.AuditActor
}

type ClaimTaskParams struct {
	TaskID          string
	ExpectedVersion int64
	Actor           auth.Actor
}

type ReleaseTaskParams struct {
	TaskID          string
	ExpectedVersion int64
	Actor           auth.AuditActor
}

type ArtifactWriteInput struct {
	ArtifactKey    string          `json:"artifactKey"`
	ContentKind    string          `json:"contentKind"`
	MimeType       string          `json:"mimeType"`
	BodyText       string          `json:"bodyText"`
	BodyJSON       json.RawMessage `json:"bodyJson"`
	BodyBase64     string          `json:"bodyBase64"`
	BaseRevisionNo int             `json:"baseRevisionNo"`
}

type CompleteTaskParams struct {
	TaskID          string
	ExpectedVersion int64
	Outputs         []ArtifactWriteInput
	Actor           auth.Actor
}

type CreateArtifactRevisionParams struct {
	ArtifactID      string
	ExpectedVersion int64
	Revision        ArtifactWriteInput
	Actor           auth.AuditActor
}

type SubmitReviewParams struct {
	TaskID                 string
	ExpectedVersion        int64
	ExpectedSessionVersion int64
	Outcome                string
	Comment                string
	Actor                  auth.AuditActor
}

type SubmitFeedbackParams struct {
	TaskID                 string
	ExpectedVersion        int64
	ExpectedSessionVersion int64
	Summary                string
	Body                   string
	Actor                  auth.AuditActor
}

func NewService(store *store.Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateProject(ctx context.Context, params CreateProjectParams) (*models.Project, error) {
	var project *models.Project

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		version, err := s.store.ProjectTypes.GetVersion(ctx, params.ProjectTypeVersionID)
		if err != nil {
			return err
		}

		projectType, err := s.store.ProjectTypes.GetByID(ctx, version.ProjectTypeID)
		if err != nil {
			return err
		}
		if projectType.WorkspaceID != params.WorkspaceID {
			return store.ErrConflict
		}

		document, err := authoring.ParseProjectTypeDocument(version.PublishedSnapshotJSON)
		if err != nil {
			return err
		}

		project = &models.Project{
			ID:                   ids.New(),
			WorkspaceID:          params.WorkspaceID,
			ProjectTypeVersionID: params.ProjectTypeVersionID,
			Name:                 params.Name,
			Description:          params.Description,
			Status:               "active",
			ParameterValuesJSON:  params.ParameterValuesJSON,
			Version:              0,
			CreatedBy:            params.Actor.ID,
			UpdatedBy:            params.Actor.ID,
		}
		if err := tx.Create(project).Error; err != nil {
			return err
		}

		for _, artifact := range document.ProjectType.Artifacts {
			if err := seedArtifactInstance(tx, project.ID, artifact.ID, "project", document.ProjectType.ID); err != nil {
				return err
			}
		}

		participants := normalizedParticipants(params.Actor, params.Participants)
		for _, participant := range participants {
			projectParticipant := &models.ProjectParticipant{
				ID:          ids.New(),
				ProjectID:   project.ID,
				SubjectID:   participant.SubjectID,
				SubjectType: participant.SubjectType,
				Role:        participant.Role,
				Status:      "active",
			}
			if err := tx.Create(projectParticipant).Error; err != nil {
				return err
			}
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			Topic:          "project_created",
			SubjectType:    "project",
			SubjectID:      project.ID,
			SubjectVersion: project.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"name":    project.Name,
				"version": project.Version,
			},
		})
	})
	if err != nil {
		return nil, err
	}

	return project, nil
}

func (s *Service) StartFlow(ctx context.Context, params StartFlowParams) (*models.Flow, error) {
	var flow *models.Flow

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var project models.Project
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&project, "id = ?", params.ProjectID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return store.ErrNotFound
			}
			return err
		}
		if project.Version != params.ExpectedProjectVersion {
			return store.ErrConflict
		}

		version, err := s.store.ProjectTypes.GetVersion(ctx, project.ProjectTypeVersionID)
		if err != nil {
			return err
		}

		document, err := authoring.ParseProjectTypeDocument(version.PublishedSnapshotJSON)
		if err != nil {
			return err
		}

		workflow, ok := document.WorkflowByID(params.WorkflowID)
		if !ok {
			return ErrWorkflowNotFound
		}

		var sequenceResult struct {
			NextSequence int
		}
		if err := tx.Model(&models.Flow{}).
			Select("COALESCE(MAX(flow_sequence), 0) + 1 AS next_sequence").
			Where("project_id = ? AND workflow_key = ?", project.ID, workflow.ID).
			Scan(&sequenceResult).Error; err != nil {
			return err
		}

		workflowSnapshot, err := json.Marshal(workflow)
		if err != nil {
			return err
		}

		flow = &models.Flow{
			ID:                   ids.New(),
			ProjectID:            project.ID,
			WorkflowKey:          workflow.ID,
			FlowSequence:         sequenceResult.NextSequence,
			Status:               "active",
			WorkflowSnapshotJSON: workflowSnapshot,
			Version:              0,
			CreatedBy:            params.Actor.ID,
			UpdatedBy:            params.Actor.ID,
		}
		if err := tx.Create(flow).Error; err != nil {
			return err
		}

		for _, artifact := range workflow.Artifacts {
			if err := seedArtifactInstance(tx, project.ID, artifact.ID, "workflow", workflow.ID); err != nil {
				return err
			}
		}
		for _, node := range workflow.Nodes {
			for _, artifact := range node.Artifacts {
				if err := seedArtifactInstance(tx, project.ID, artifact.ID, "node", node.ID); err != nil {
					return err
				}
			}
		}

		incomingCount := make(map[string]int, len(workflow.Nodes))
		for _, edge := range workflow.Edges {
			incomingCount[edge.To]++
		}

		for _, node := range workflow.Nodes {
			task := &models.Task{
				ID:      ids.New(),
				FlowID:  flow.ID,
				NodeKey: node.ID,
				Status:  "pending",
				Version: 0,
			}
			if err := tx.Create(task).Error; err != nil {
				return err
			}
		}

		for _, node := range workflow.Nodes {
			if incomingCount[node.ID] == 0 {
				if err := activateNodeTask(tx, flow, workflow, node.ID, params.Actor.ID); err != nil {
					return err
				}
			}
		}

		if err := tx.Model(&models.Project{}).
			Where("id = ? AND version = ?", project.ID, params.ExpectedProjectVersion).
			Updates(map[string]any{
				"updated_by": params.Actor.ID,
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := refreshFlowStatus(tx, flow.ID, workflow, params.Actor.ID); err != nil {
			return err
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         flow.ID,
			Topic:          "flow_started",
			SubjectType:    "flow",
			SubjectID:      flow.ID,
			SubjectVersion: flow.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"workflowKey":  flow.WorkflowKey,
				"flowSequence": flow.FlowSequence,
			},
		})
	})
	if err != nil {
		return nil, err
	}

	return flow, nil
}

func (s *Service) AssignTask(ctx context.Context, params AssignTaskParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "ready" && task.Status != "in_progress" {
			return ErrTaskNotReady
		}

		if err := closeActiveAssignments(tx, task.ID, "cancelled"); err != nil {
			return err
		}

		assignment := &models.Assignment{
			ID:           ids.New(),
			TaskID:       task.ID,
			AssigneeID:   params.AssigneeID,
			AssigneeType: params.AssigneeType,
			Source:       "maintainer_assignment",
			Status:       "active",
			Version:      0,
			CreatedBy:    params.Actor.ID,
			UpdatedBy:    params.Actor.ID,
		}
		if err := tx.Create(assignment).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"current_assignment_id": assignment.ID,
				"version":               gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "task_assigned",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"assigneeId":   params.AssigneeID,
				"assigneeType": params.AssigneeType,
			},
		})
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

func (s *Service) ClaimTask(ctx context.Context, params ClaimTaskParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "ready" {
			return ErrTaskNotReady
		}
		if task.ClaimOwnerID != "" {
			return ErrTaskAlreadyClaimed
		}

		var assignment models.Assignment
		if task.CurrentAssignmentID != "" {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&assignment, "id = ?", task.CurrentAssignmentID).Error; err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
			}
			if assignment.ID != "" && assignment.AssigneeID != params.Actor.ID {
				return ErrTaskAlreadyClaimed
			}
		}
		if assignment.ID == "" {
			assignment = models.Assignment{
				ID:           ids.New(),
				TaskID:       task.ID,
				AssigneeID:   params.Actor.ID,
				AssigneeType: string(params.Actor.SubjectType),
				Source:       "self_claim",
				Status:       "active",
				Version:      0,
				CreatedBy:    params.Actor.ID,
				UpdatedBy:    params.Actor.ID,
			}
			if err := tx.Create(&assignment).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":                "in_progress",
				"claim_owner_id":        params.Actor.ID,
				"current_assignment_id": assignment.ID,
				"version":               gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "task_claimed",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"claimOwnerId": params.Actor.ID,
			},
		})
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

func (s *Service) ReleaseTask(ctx context.Context, params ReleaseTaskParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "in_progress" {
			return ErrTaskNotInProgress
		}

		if task.CurrentAssignmentID != "" {
			if err := tx.Model(&models.Assignment{}).
				Where("id = ?", task.CurrentAssignmentID).
				Updates(map[string]any{
					"status":     "released",
					"updated_by": params.Actor.ID,
					"version":    gorm.Expr("version + 1"),
				}).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":         "ready",
				"claim_owner_id": "",
				"version":        gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "task_released",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"status": updatedTask.Status,
			},
		})
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

func (s *Service) CompleteTask(ctx context.Context, params CompleteTaskParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "in_progress" {
			return ErrTaskNotInProgress
		}
		if task.ClaimOwnerID != params.Actor.ID {
			return ErrTaskNotClaimed
		}

		flow, err := lockFlow(tx, task.FlowID)
		if err != nil {
			return err
		}

		workflow, err := authoring.ParseWorkflowDefinition(flow.WorkflowSnapshotJSON)
		if err != nil {
			return err
		}

		node, ok := workflow.NodeByID(task.NodeKey)
		if !ok {
			return ErrWorkflowNotFound
		}
		if node.Kind != "input" && node.Kind != "work" {
			return ErrTaskUnsupported
		}

		if err := applyTaskOutputs(tx, flow.ProjectID, node, params.Outputs, params.Actor.ID); err != nil {
			return err
		}

		if task.CurrentAssignmentID != "" {
			if err := tx.Model(&models.Assignment{}).
				Where("id = ?", task.CurrentAssignmentID).
				Updates(map[string]any{
					"status":     "completed",
					"updated_by": params.Actor.ID,
					"version":    gorm.Expr("version + 1"),
				}).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":         "completed",
				"claim_owner_id": "",
				"version":        gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := routeSuccessors(tx, flow, workflow, node.ID, "completed", params.Actor.ID); err != nil {
			return err
		}
		if err := refreshFlowStatus(tx, flow.ID, workflow, params.Actor.ID); err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		if err := emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "task_completed",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"nodeKey": task.NodeKey,
			},
		}); err != nil {
			return err
		}

		return maybeEmitFlowCompleted(tx, flow.ID, workflow, project, params.Actor.ID)
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

func (s *Service) CreateArtifactRevision(ctx context.Context, params CreateArtifactRevisionParams) (*models.ArtifactInstance, *models.ArtifactRevision, error) {
	var updatedArtifact *models.ArtifactInstance
	var createdRevision *models.ArtifactRevision

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		artifact, err := lockArtifact(tx, params.ArtifactID)
		if err != nil {
			return err
		}
		if artifact.Version != params.ExpectedVersion {
			return store.ErrConflict
		}

		revisionInput := params.Revision
		if revisionInput.ArtifactKey == "" {
			revisionInput.ArtifactKey = artifact.ArtifactKey
		}
		if revisionInput.ArtifactKey != artifact.ArtifactKey {
			return store.ErrConflict
		}

		createdRevision, err = createArtifactRevisionForInstance(tx, artifact, revisionInput, params.Actor.ID)
		if err != nil {
			return err
		}

		updatedArtifact, err = lockArtifact(tx, artifact.ID)
		if err != nil {
			return err
		}

		project, err := projectForArtifact(tx, artifact.ID)
		if err != nil {
			return err
		}

		return emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			Topic:          "artifact_revised",
			SubjectType:    "artifact",
			SubjectID:      artifact.ID,
			SubjectVersion: updatedArtifact.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"artifactKey": artifact.ArtifactKey,
				"revisionNo":  createdRevision.RevisionNo,
				"mimeType":    createdRevision.MimeType,
			},
		})
	})
	if err != nil {
		return nil, nil, err
	}

	return updatedArtifact, createdRevision, nil
}

func (s *Service) SubmitReview(ctx context.Context, params SubmitReviewParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "awaiting_review" || task.CurrentReviewSessionID == "" {
			return ErrTaskNotAwaitingReview
		}

		flow, err := lockFlow(tx, task.FlowID)
		if err != nil {
			return err
		}
		workflow, err := authoring.ParseWorkflowDefinition(flow.WorkflowSnapshotJSON)
		if err != nil {
			return err
		}
		node, ok := workflow.NodeByID(task.NodeKey)
		if !ok {
			return ErrWorkflowNotFound
		}
		if node.Kind != "review" {
			return ErrTaskUnsupported
		}

		session, err := lockReviewSession(tx, task.CurrentReviewSessionID)
		if err != nil {
			return err
		}
		if session.Version != params.ExpectedSessionVersion {
			return store.ErrConflict
		}
		if session.Status != "open" {
			return ErrReviewSessionClosed
		}

		outcome := strings.TrimSpace(params.Outcome)
		if outcome != "approved" && outcome != "revise" {
			return ErrInvalidReviewOutcome
		}

		decision := &models.ReviewDecision{
			ID:              ids.New(),
			ReviewSessionID: session.ID,
			ReviewerID:      params.Actor.ID,
			Outcome:         outcome,
			CommentBody:     strings.TrimSpace(params.Comment),
		}
		if err := tx.Create(decision).Error; err != nil {
			return err
		}

		now := time.Now().UTC()
		if err := tx.Model(&models.ReviewSession{}).
			Where("id = ? AND version = ?", session.ID, session.Version).
			Updates(map[string]any{
				"status":      "decided",
				"outcome":     outcome,
				"resolved_at": now,
				"updated_by":  params.Actor.ID,
				"version":     gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":  "completed",
				"version": gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := routeSuccessors(tx, flow, workflow, node.ID, outcome, params.Actor.ID); err != nil {
			return err
		}
		if err := refreshFlowStatus(tx, flow.ID, workflow, params.Actor.ID); err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		if err := emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "review_submitted",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"outcome": outcome,
			},
		}); err != nil {
			return err
		}

		return maybeEmitFlowCompleted(tx, flow.ID, workflow, project, params.Actor.ID)
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

func (s *Service) SubmitFeedback(ctx context.Context, params SubmitFeedbackParams) (*models.Task, error) {
	var updatedTask *models.Task

	err := s.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		task, err := lockTask(tx, params.TaskID)
		if err != nil {
			return err
		}
		if task.Version != params.ExpectedVersion {
			return store.ErrConflict
		}
		if task.Status != "awaiting_feedback" || task.CurrentFeedbackSessionID == "" {
			return ErrTaskNotAwaitingFeedback
		}

		flow, err := lockFlow(tx, task.FlowID)
		if err != nil {
			return err
		}
		workflow, err := authoring.ParseWorkflowDefinition(flow.WorkflowSnapshotJSON)
		if err != nil {
			return err
		}
		node, ok := workflow.NodeByID(task.NodeKey)
		if !ok {
			return ErrWorkflowNotFound
		}
		if node.Kind != "feedback" {
			return ErrTaskUnsupported
		}

		session, err := lockFeedbackSession(tx, task.CurrentFeedbackSessionID)
		if err != nil {
			return err
		}
		if session.Version != params.ExpectedSessionVersion {
			return store.ErrConflict
		}
		if session.Status != "open" {
			return ErrFeedbackSessionClosed
		}

		body := strings.TrimSpace(params.Body)
		if body == "" {
			return ErrArtifactOutputMissing
		}

		entry := &models.FeedbackEntry{
			ID:                ids.New(),
			FeedbackSessionID: session.ID,
			AuthorID:          params.Actor.ID,
			Body:              body,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		now := time.Now().UTC()
		summary := strings.TrimSpace(params.Summary)
		if summary == "" {
			summary = body
		}
		if err := tx.Model(&models.FeedbackSession{}).
			Where("id = ? AND version = ?", session.ID, session.Version).
			Updates(map[string]any{
				"status":      "submitted",
				"summary":     summary,
				"resolved_at": now,
				"updated_by":  params.Actor.ID,
				"version":     gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":  "completed",
				"version": gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		if err := routeSuccessors(tx, flow, workflow, node.ID, "completed", params.Actor.ID); err != nil {
			return err
		}
		if err := refreshFlowStatus(tx, flow.ID, workflow, params.Actor.ID); err != nil {
			return err
		}

		updatedTask, err = lockTask(tx, task.ID)
		if err != nil {
			return err
		}

		project, err := projectForTask(tx, task.ID)
		if err != nil {
			return err
		}

		if err := emitEvent(tx, eventInput{
			WorkspaceID:    project.WorkspaceID,
			ProjectID:      project.ID,
			FlowID:         task.FlowID,
			Topic:          "feedback_submitted",
			SubjectType:    "task",
			SubjectID:      task.ID,
			SubjectVersion: updatedTask.Version,
			ActorID:        params.Actor.ID,
			Payload: map[string]any{
				"summary": summary,
			},
		}); err != nil {
			return err
		}

		return maybeEmitFlowCompleted(tx, flow.ID, workflow, project, params.Actor.ID)
	})
	if err != nil {
		return nil, err
	}

	return updatedTask, nil
}

type eventInput struct {
	WorkspaceID    string
	ProjectID      string
	FlowID         string
	Topic          string
	SubjectType    string
	SubjectID      string
	SubjectVersion int64
	ActorID        string
	Payload        map[string]any
}

func emitEvent(tx *gorm.DB, input eventInput) error {
	payloadJSON, err := json.Marshal(input.Payload)
	if err != nil {
		return err
	}

	event := &models.Event{
		ID:             ids.New(),
		WorkspaceID:    input.WorkspaceID,
		ProjectID:      input.ProjectID,
		FlowID:         input.FlowID,
		Topic:          input.Topic,
		SubjectType:    input.SubjectType,
		SubjectID:      input.SubjectID,
		SubjectVersion: input.SubjectVersion,
		ActorID:        input.ActorID,
		PayloadJSON:    payloadJSON,
	}

	return tx.Create(event).Error
}

func normalizedParticipants(actor auth.AuditActor, requested []ProjectParticipantInput) []ProjectParticipantInput {
	participants := make([]ProjectParticipantInput, 0, len(requested)+1)
	seen := map[string]struct{}{}

	creator := ProjectParticipantInput{
		SubjectID:   actor.ID,
		SubjectType: actor.SubjectType,
		Role:        string(auth.ProjectRoleMaintainer),
	}
	participants = append(participants, creator)
	seen[creator.SubjectID] = struct{}{}

	for _, participant := range requested {
		if participant.SubjectID == "" {
			continue
		}
		if _, ok := seen[participant.SubjectID]; ok {
			continue
		}
		participants = append(participants, participant)
		seen[participant.SubjectID] = struct{}{}
	}

	return participants
}

func seedArtifactInstance(tx *gorm.DB, projectID string, artifactKey string, scopeType string, scopeRef string) error {
	artifact := &models.ArtifactInstance{
		ID:                ids.New(),
		ProjectID:         projectID,
		ArtifactKey:       artifactKey,
		ScopeType:         scopeType,
		ScopeRef:          scopeRef,
		CurrentRevisionNo: 0,
		Version:           0,
	}

	return tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "project_id"}, {Name: "artifact_key"}},
		DoNothing: true,
	}).Create(artifact).Error
}

func lockTask(tx *gorm.DB, taskID string) (*models.Task, error) {
	var task models.Task
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&task, "id = ?", taskID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &task, nil
}

func lockFlow(tx *gorm.DB, flowID string) (*models.Flow, error) {
	var flow models.Flow
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&flow, "id = ?", flowID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &flow, nil
}

func lockArtifact(tx *gorm.DB, artifactID string) (*models.ArtifactInstance, error) {
	var artifact models.ArtifactInstance
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&artifact, "id = ?", artifactID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &artifact, nil
}

func lockReviewSession(tx *gorm.DB, sessionID string) (*models.ReviewSession, error) {
	var session models.ReviewSession
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&session, "id = ?", sessionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &session, nil
}

func lockFeedbackSession(tx *gorm.DB, sessionID string) (*models.FeedbackSession, error) {
	var session models.FeedbackSession
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&session, "id = ?", sessionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &session, nil
}

func closeActiveAssignments(tx *gorm.DB, taskID string, nextStatus string) error {
	return tx.Model(&models.Assignment{}).
		Where("task_id = ? AND status = ?", taskID, "active").
		Updates(map[string]any{
			"status":  nextStatus,
			"version": gorm.Expr("version + 1"),
		}).Error
}

func projectForTask(tx *gorm.DB, taskID string) (*models.Project, error) {
	var project models.Project
	err := tx.Table("project").
		Joins("JOIN flow ON flow.project_id = project.id").
		Joins("JOIN task ON task.flow_id = flow.id").
		Where("task.id = ?", taskID).
		First(&project).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &project, nil
}

func projectForArtifact(tx *gorm.DB, artifactID string) (*models.Project, error) {
	var project models.Project
	err := tx.Table("project").
		Joins("JOIN artifact_instance ON artifact_instance.project_id = project.id").
		Where("artifact_instance.id = ?", artifactID).
		First(&project).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}

	return &project, nil
}

func applyTaskOutputs(tx *gorm.DB, projectID string, node authoring.NodeDefinition, outputs []ArtifactWriteInput, actorID string) error {
	requiredWrites := slices.Clone(node.Writes)
	if len(requiredWrites) > 0 && len(outputs) == 0 {
		return ErrArtifactOutputMissing
	}

	outputByKey := make(map[string]ArtifactWriteInput, len(outputs))
	for _, output := range outputs {
		outputByKey[output.ArtifactKey] = output
	}

	for _, artifactKey := range requiredWrites {
		output, ok := outputByKey[artifactKey]
		if !ok {
			return fmt.Errorf("%w: %s", ErrArtifactOutputMissing, artifactKey)
		}
		if err := createProjectArtifactRevision(tx, projectID, output, actorID); err != nil {
			return err
		}
	}

	return nil
}

func createProjectArtifactRevision(tx *gorm.DB, projectID string, output ArtifactWriteInput, actorID string) error {
	var artifact models.ArtifactInstance
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&artifact, "project_id = ? AND artifact_key = ?", projectID, output.ArtifactKey).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrArtifactNotFound
		}
		return err
	}

	_, err = createArtifactRevisionForInstance(tx, &artifact, output, actorID)
	return err
}

func createArtifactRevisionForInstance(tx *gorm.DB, artifact *models.ArtifactInstance, output ArtifactWriteInput, actorID string) (*models.ArtifactRevision, error) {
	revision := &models.ArtifactRevision{
		ID:                 ids.New(),
		ArtifactInstanceID: artifact.ID,
		RevisionNo:         artifact.CurrentRevisionNo + 1,
		ContentKind:        output.ContentKind,
		MimeType:           defaultMimeType(output.ContentKind, output.MimeType),
		CreatedBy:          actorID,
		BaseRevisionNo:     output.BaseRevisionNo,
	}

	payloadCount := 0
	if output.BodyText != "" {
		revision.BodyText = output.BodyText
		revision.ByteSize = int64(len([]byte(output.BodyText)))
		payloadCount++
	}
	if len(output.BodyJSON) > 0 {
		revision.BodyJSON = output.BodyJSON
		revision.ByteSize = int64(len(output.BodyJSON))
		payloadCount++
	}
	if output.BodyBase64 != "" {
		decoded, err := base64.StdEncoding.DecodeString(output.BodyBase64)
		if err != nil {
			return nil, err
		}
		revision.BodyBytes = decoded
		revision.ByteSize = int64(len(decoded))
		payloadCount++
	}
	if payloadCount != 1 {
		return nil, fmt.Errorf("%w: artifact %s requires exactly one payload field", ErrArtifactOutputMissing, output.ArtifactKey)
	}

	checksum := sha256.Sum256(selectChecksumBody(revision))
	revision.ChecksumSHA256 = hex.EncodeToString(checksum[:])

	if err := tx.Create(revision).Error; err != nil {
		return nil, err
	}

	if err := tx.Model(&models.ArtifactInstance{}).
		Where("id = ? AND version = ?", artifact.ID, artifact.Version).
		Updates(map[string]any{
			"current_revision_no": revision.RevisionNo,
			"version":             gorm.Expr("version + 1"),
		}).Error; err != nil {
		return nil, err
	}

	return revision, nil
}

func selectChecksumBody(revision *models.ArtifactRevision) []byte {
	if revision.BodyText != "" {
		return []byte(revision.BodyText)
	}
	if len(revision.BodyJSON) > 0 {
		return revision.BodyJSON
	}
	return revision.BodyBytes
}

func defaultMimeType(contentKind string, provided string) string {
	if provided != "" {
		return provided
	}

	switch contentKind {
	case "markdown":
		return "text/markdown; charset=utf-8"
	case "json":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}

func routeSuccessors(tx *gorm.DB, flow *models.Flow, workflow authoring.WorkflowDefinition, nodeID string, trigger string, actorID string) error {
	for _, edge := range workflow.OutgoingEdges(nodeID, trigger) {
		if !incomingEdgesSatisfied(tx, flow.ID, workflow, edge.To) {
			continue
		}
		if err := activateNodeTask(tx, flow, workflow, edge.To, actorID); err != nil {
			return err
		}
	}

	return nil
}

func incomingEdgesSatisfied(tx *gorm.DB, flowID string, workflow authoring.WorkflowDefinition, nodeID string) bool {
	incoming := workflow.IncomingEdges(nodeID)
	for _, edge := range incoming {
		var predecessor models.Task
		err := tx.First(&predecessor, "flow_id = ? AND node_key = ?", flowID, edge.From).Error
		if err != nil || predecessor.Status != "completed" {
			return false
		}
	}

	return true
}

func activateNodeTask(tx *gorm.DB, flow *models.Flow, workflow authoring.WorkflowDefinition, nodeID string, actorID string) error {
	var task models.Task
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&task, "flow_id = ? AND node_key = ?", flow.ID, nodeID).Error; err != nil {
		return err
	}
	if task.Status != "pending" {
		return nil
	}

	node, ok := workflow.NodeByID(nodeID)
	if !ok {
		return ErrWorkflowNotFound
	}

	switch node.Kind {
	case "input", "work":
		return tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, task.Version).
			Updates(map[string]any{
				"status":  "ready",
				"version": gorm.Expr("version + 1"),
			}).Error
	case "review":
		session := &models.ReviewSession{
			ID:                     ids.New(),
			TaskID:                 task.ID,
			Status:                 "open",
			RequestedReviewersJSON: []byte("[]"),
			Version:                0,
			CreatedBy:              actorID,
			UpdatedBy:              actorID,
		}
		if err := tx.Create(session).Error; err != nil {
			return err
		}
		return tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, task.Version).
			Updates(map[string]any{
				"status":                    "awaiting_review",
				"current_review_session_id": session.ID,
				"version":                   gorm.Expr("version + 1"),
			}).Error
	case "feedback":
		session := &models.FeedbackSession{
			ID:        ids.New(),
			TaskID:    task.ID,
			Status:    "open",
			Version:   0,
			CreatedBy: actorID,
			UpdatedBy: actorID,
		}
		if err := tx.Create(session).Error; err != nil {
			return err
		}
		return tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, task.Version).
			Updates(map[string]any{
				"status":                      "awaiting_feedback",
				"current_feedback_session_id": session.ID,
				"version":                     gorm.Expr("version + 1"),
			}).Error
	case "end":
		return tx.Model(&models.Task{}).
			Where("id = ? AND version = ?", task.ID, task.Version).
			Updates(map[string]any{
				"status":  "completed",
				"version": gorm.Expr("version + 1"),
			}).Error
	default:
		return ErrTaskUnsupported
	}
}

func refreshFlowStatus(tx *gorm.DB, flowID string, workflow authoring.WorkflowDefinition, actorID string) error {
	var flow models.Flow
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&flow, "id = ?", flowID).Error; err != nil {
		return err
	}

	var tasks []models.Task
	if err := tx.Where("flow_id = ?", flowID).Find(&tasks).Error; err != nil {
		return err
	}

	hasCompletedEnd := false
	hasActive := false
	hasPending := false

	for _, task := range tasks {
		node, ok := workflow.NodeByID(task.NodeKey)
		if ok && node.Kind == "end" && task.Status == "completed" {
			hasCompletedEnd = true
		}
		switch task.Status {
		case "ready", "in_progress", "awaiting_review", "awaiting_feedback":
			hasActive = true
		case "pending":
			hasPending = true
		}
	}

	nextStatus := "active"
	blockedReason := ""
	switch {
	case hasCompletedEnd:
		nextStatus = "completed"
	case hasActive:
		nextStatus = "active"
	case hasPending:
		nextStatus = "blocked"
		blockedReason = "waiting_for_upstream_transition"
	default:
		nextStatus = "completed"
	}

	if nextStatus == flow.Status && blockedReason == flow.BlockedReason {
		return nil
	}

	return tx.Model(&models.Flow{}).
		Where("id = ? AND version = ?", flow.ID, flow.Version).
		Updates(map[string]any{
			"status":         nextStatus,
			"blocked_reason": blockedReason,
			"updated_by":     actorID,
			"version":        gorm.Expr("version + 1"),
		}).Error
}

func maybeEmitFlowCompleted(tx *gorm.DB, flowID string, workflow authoring.WorkflowDefinition, project *models.Project, actorID string) error {
	var flow models.Flow
	if err := tx.First(&flow, "id = ?", flowID).Error; err != nil {
		return err
	}
	if flow.Status != "completed" {
		return nil
	}

	return emitEvent(tx, eventInput{
		WorkspaceID:    project.WorkspaceID,
		ProjectID:      project.ID,
		FlowID:         flow.ID,
		Topic:          "flow_completed",
		SubjectType:    "flow",
		SubjectID:      flow.ID,
		SubjectVersion: flow.Version,
		ActorID:        actorID,
		Payload: map[string]any{
			"workspace_id":          project.WorkspaceID,
			"project_id":            project.ID,
			"flow_id":               flow.ID,
			"completed_by_auth_uid": actorID,
			"workflow_key":          workflow.ID,
			"status":                flow.Status,
		},
	})
}
