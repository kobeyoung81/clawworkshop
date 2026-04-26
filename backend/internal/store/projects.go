package store

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type ProjectRepository struct {
	db *gorm.DB
}

type ProjectSummary struct {
	models.Project
	ActorProjectRole string `gorm:"column:actor_project_role"`
}

func (r *ProjectRepository) GetParticipant(ctx context.Context, projectID string, subjectID string) (*models.ProjectParticipant, error) {
	var participant models.ProjectParticipant
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND subject_id = ? AND status = ?", projectID, subjectID, "active").
		First(&participant).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &participant, nil
}

func (r *ProjectRepository) GetByID(ctx context.Context, projectID string) (*models.Project, error) {
	var project models.Project
	err := r.db.WithContext(ctx).First(&project, "id = ?", projectID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &project, nil
}

func (r *ProjectRepository) ListVisible(ctx context.Context, subjectID string) ([]ProjectSummary, error) {
	var projects []ProjectSummary
	err := r.db.WithContext(ctx).
		Table("project").
		Select("project.*, project_participant.role AS actor_project_role").
		Joins("JOIN workspace_member ON workspace_member.workspace_id = project.workspace_id AND workspace_member.subject_id = ? AND workspace_member.status = ?", subjectID, "active").
		Joins("LEFT JOIN project_participant ON project_participant.project_id = project.id AND project_participant.subject_id = ? AND project_participant.status = ?", subjectID, "active").
		Order("project.updated_at DESC").
		Find(&projects).Error
	return projects, err
}

func (r *ProjectRepository) ListParticipants(ctx context.Context, projectID string) ([]models.ProjectParticipant, error) {
	var participants []models.ProjectParticipant
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Order("created_at ASC").
		Find(&participants).Error
	return participants, err
}
