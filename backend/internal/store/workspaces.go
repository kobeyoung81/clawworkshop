package store

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type WorkspaceRepository struct {
	db *gorm.DB
}

type WorkspaceSummary struct {
	models.Workspace
	ActorRole string `gorm:"column:actor_role"`
}

func (r *WorkspaceRepository) ListVisible(ctx context.Context, subjectID string) ([]WorkspaceSummary, error) {
	var workspaces []WorkspaceSummary
	err := r.db.WithContext(ctx).
		Table("workspace").
		Select("workspace.*, workspace_member.role AS actor_role").
		Joins("JOIN workspace_member ON workspace_member.workspace_id = workspace.id").
		Where("workspace_member.subject_id = ? AND workspace_member.status = ?", subjectID, "active").
		Order("workspace.name ASC").
		Find(&workspaces).Error
	return workspaces, err
}

func (r *WorkspaceRepository) CreateWorkspaceWithOwner(ctx context.Context, workspace *models.Workspace, owner *models.WorkspaceMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(workspace).Error; err != nil {
			return err
		}

		return tx.Create(owner).Error
	})
}

func (r *WorkspaceRepository) GetByID(ctx context.Context, workspaceID string) (*models.Workspace, error) {
	var workspace models.Workspace
	err := r.db.WithContext(ctx).First(&workspace, "id = ?", workspaceID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &workspace, nil
}

func (r *WorkspaceRepository) GetMembership(ctx context.Context, workspaceID string, subjectID string) (*models.WorkspaceMember, error) {
	var member models.WorkspaceMember
	err := r.db.WithContext(ctx).
		Where("workspace_id = ? AND subject_id = ? AND status = ?", workspaceID, subjectID, "active").
		First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &member, nil
}

func (r *WorkspaceRepository) ListMembers(ctx context.Context, workspaceID string) ([]models.WorkspaceMember, error) {
	var members []models.WorkspaceMember
	err := r.db.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Order("created_at ASC").
		Find(&members).Error
	return members, err
}

func (r *WorkspaceRepository) AddMember(ctx context.Context, member *models.WorkspaceMember) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *WorkspaceRepository) GetMemberByID(ctx context.Context, workspaceID string, memberID string) (*models.WorkspaceMember, error) {
	var member models.WorkspaceMember
	err := r.db.WithContext(ctx).
		Where("workspace_id = ? AND id = ?", workspaceID, memberID).
		First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &member, nil
}

func (r *WorkspaceRepository) UpdateMember(ctx context.Context, workspaceID string, memberID string, role string, status string) (*models.WorkspaceMember, error) {
	result := r.db.WithContext(ctx).
		Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND id = ?", workspaceID, memberID).
		Updates(map[string]any{
			"role":   role,
			"status": status,
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	return r.GetMemberByID(ctx, workspaceID, memberID)
}

func (r *WorkspaceRepository) CountActiveOwners(ctx context.Context, workspaceID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND role = ? AND status = ?", workspaceID, "owner", "active").
		Count(&count).Error
	return count, err
}
