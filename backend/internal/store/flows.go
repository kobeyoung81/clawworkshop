package store

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type FlowRepository struct {
	db *gorm.DB
}

type TaskInboxItem struct {
	models.Task
	ProjectID        string `gorm:"column:project_id"`
	ProjectName      string `gorm:"column:project_name"`
	WorkspaceID      string `gorm:"column:workspace_id"`
	WorkflowKey      string `gorm:"column:workflow_key"`
	FlowSequence     int    `gorm:"column:flow_sequence"`
	ActorProjectRole string `gorm:"column:actor_project_role"`
}

func (r *FlowRepository) GetByID(ctx context.Context, flowID string) (*models.Flow, error) {
	var flow models.Flow
	err := r.db.WithContext(ctx).First(&flow, "id = ?", flowID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &flow, nil
}

func (r *FlowRepository) ListByProject(ctx context.Context, projectID string) ([]models.Flow, error) {
	var flows []models.Flow
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Order("flow_sequence ASC").
		Find(&flows).Error
	return flows, err
}

func (r *FlowRepository) GetTaskByID(ctx context.Context, taskID string) (*models.Task, error) {
	var task models.Task
	err := r.db.WithContext(ctx).First(&task, "id = ?", taskID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &task, nil
}

func (r *FlowRepository) ListTasksByFlow(ctx context.Context, flowID string) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Where("flow_id = ?", flowID).
		Order("created_at ASC").
		Find(&tasks).Error
	return tasks, err
}

func (r *FlowRepository) GetAssignmentByID(ctx context.Context, assignmentID string) (*models.Assignment, error) {
	var assignment models.Assignment
	err := r.db.WithContext(ctx).First(&assignment, "id = ?", assignmentID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &assignment, nil
}

func (r *FlowRepository) ListAssignmentsByTask(ctx context.Context, taskID string) ([]models.Assignment, error) {
	var assignments []models.Assignment
	err := r.db.WithContext(ctx).
		Where("task_id = ?", taskID).
		Order("created_at DESC").
		Find(&assignments).Error
	return assignments, err
}

func (r *FlowRepository) GetReviewSession(ctx context.Context, sessionID string) (*models.ReviewSession, error) {
	var session models.ReviewSession
	err := r.db.WithContext(ctx).First(&session, "id = ?", sessionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &session, nil
}

func (r *FlowRepository) ListReviewDecisions(ctx context.Context, sessionID string) ([]models.ReviewDecision, error) {
	var decisions []models.ReviewDecision
	err := r.db.WithContext(ctx).
		Where("review_session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&decisions).Error
	return decisions, err
}

func (r *FlowRepository) GetFeedbackSession(ctx context.Context, sessionID string) (*models.FeedbackSession, error) {
	var session models.FeedbackSession
	err := r.db.WithContext(ctx).First(&session, "id = ?", sessionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &session, nil
}

func (r *FlowRepository) ListFeedbackEntries(ctx context.Context, sessionID string) ([]models.FeedbackEntry, error) {
	var entries []models.FeedbackEntry
	err := r.db.WithContext(ctx).
		Where("feedback_session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&entries).Error
	return entries, err
}

func (r *FlowRepository) ListInbox(ctx context.Context, actorID string, statuses []string, limit int) ([]TaskInboxItem, error) {
	query := r.db.WithContext(ctx).
		Table("task").
		Select("task.*, flow.project_id, project.name AS project_name, project.workspace_id, flow.workflow_key, flow.flow_sequence, project_participant.role AS actor_project_role").
		Joins("JOIN flow ON flow.id = task.flow_id").
		Joins("JOIN project ON project.id = flow.project_id").
		Joins("JOIN workspace_member ON workspace_member.workspace_id = project.workspace_id AND workspace_member.subject_id = ? AND workspace_member.status = ?", actorID, "active").
		Joins("LEFT JOIN project_participant ON project_participant.project_id = project.id AND project_participant.subject_id = ? AND project_participant.status = ?", actorID, "active")
	if len(statuses) > 0 {
		query = query.Where("task.status IN ?", statuses)
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}

	var items []TaskInboxItem
	err := query.
		Order("task.updated_at DESC").
		Limit(limit).
		Find(&items).Error
	return items, err
}
