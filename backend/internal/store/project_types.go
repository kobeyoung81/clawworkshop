package store

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type ProjectTypeRepository struct {
	db *gorm.DB
}

type UpdateProjectTypeDraftParams struct {
	ID               string
	ExpectedVersion  int64
	Title            string
	Description      string
	CurrentDraftJSON []byte
	UpdatedBy        string
}

type PublishProjectTypeParams struct {
	ProjectTypeID         string
	VersionID             string
	ExpectedVersion       int64
	PublishedSnapshotJSON []byte
	SummaryJSON           []byte
	PublishedBy           string
}

type PublicProjectTypeSummary struct {
	ID              string    `gorm:"column:id"`
	WorkspaceID     string    `gorm:"column:workspace_id"`
	WorkspaceName   string    `gorm:"column:workspace_name"`
	Key             string    `gorm:"column:key"`
	Title           string    `gorm:"column:title"`
	Description     string    `gorm:"column:description"`
	Status          string    `gorm:"column:status"`
	LatestVersionID string    `gorm:"column:latest_version_id"`
	LatestVersionNo int       `gorm:"column:latest_version_no"`
	PublishedAt     time.Time `gorm:"column:published_at"`
}

func (r *ProjectTypeRepository) ListVisible(ctx context.Context, subjectID string) ([]models.ProjectType, error) {
	var projectTypes []models.ProjectType
	err := r.db.WithContext(ctx).
		Table("project_type").
		Joins("JOIN workspace_member ON workspace_member.workspace_id = project_type.workspace_id").
		Where("workspace_member.subject_id = ? AND workspace_member.status = ?", subjectID, "active").
		Order("project_type.updated_at DESC").
		Find(&projectTypes).Error
	return projectTypes, err
}

func (r *ProjectTypeRepository) ListPublishedPublic(ctx context.Context) ([]PublicProjectTypeSummary, error) {
	var projectTypes []PublicProjectTypeSummary
	latestVersionSubquery := r.db.WithContext(ctx).
		Table("project_type_version").
		Select("project_type_id, MAX(version_no) AS latest_version_no").
		Group("project_type_id")

	err := r.db.WithContext(ctx).
		Table("project_type").
		Select(`
			project_type.id,
			project_type.workspace_id,
			workspace.name AS workspace_name,
			project_type.key,
			project_type.title,
			project_type.description,
			project_type.status,
			project_type_version.id AS latest_version_id,
			project_type_version.version_no AS latest_version_no,
			project_type_version.published_at
		`).
		Joins("JOIN workspace ON workspace.id = project_type.workspace_id").
		Joins("JOIN (?) latest_version ON latest_version.project_type_id = project_type.id", latestVersionSubquery).
		Joins("JOIN project_type_version ON project_type_version.project_type_id = project_type.id AND project_type_version.version_no = latest_version.latest_version_no").
		Where("project_type.status = ?", "published").
		Order("project_type_version.published_at DESC").
		Find(&projectTypes).Error
	return projectTypes, err
}

func (r *ProjectTypeRepository) Create(ctx context.Context, projectType *models.ProjectType) error {
	return r.db.WithContext(ctx).Create(projectType).Error
}

func (r *ProjectTypeRepository) GetByID(ctx context.Context, projectTypeID string) (*models.ProjectType, error) {
	var projectType models.ProjectType
	err := r.db.WithContext(ctx).First(&projectType, "id = ?", projectTypeID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &projectType, nil
}

func (r *ProjectTypeRepository) UpdateDraft(ctx context.Context, params UpdateProjectTypeDraftParams) (*models.ProjectType, error) {
	result := r.db.WithContext(ctx).
		Model(&models.ProjectType{}).
		Where("id = ? AND version = ?", params.ID, params.ExpectedVersion).
		Updates(map[string]any{
			"title":              params.Title,
			"description":        params.Description,
			"current_draft_json": params.CurrentDraftJSON,
			"status":             "draft",
			"updated_by":         params.UpdatedBy,
			"version":            gorm.Expr("version + 1"),
		})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		_, err := r.GetByID(ctx, params.ID)
		if err != nil {
			return nil, err
		}
		return nil, ErrConflict
	}

	return r.GetByID(ctx, params.ID)
}

func (r *ProjectTypeRepository) CreateValidationReport(ctx context.Context, report *models.ValidationReport) error {
	return r.db.WithContext(ctx).Create(report).Error
}

func (r *ProjectTypeRepository) Publish(ctx context.Context, params PublishProjectTypeParams) (*models.ProjectTypeVersion, error) {
	var publishedVersion *models.ProjectTypeVersion

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var projectType models.ProjectType
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&projectType, "id = ?", params.ProjectTypeID).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}

		if projectType.Version != params.ExpectedVersion {
			return ErrConflict
		}

		var latestVersion struct {
			VersionNo int
		}
		if err := tx.Model(&models.ProjectTypeVersion{}).
			Select("COALESCE(MAX(version_no), 0) AS version_no").
			Where("project_type_id = ?", params.ProjectTypeID).
			Scan(&latestVersion).Error; err != nil {
			return err
		}

		version := &models.ProjectTypeVersion{
			ID:                    params.VersionID,
			ProjectTypeID:         params.ProjectTypeID,
			VersionNo:             latestVersion.VersionNo + 1,
			PublishedSnapshotJSON: params.PublishedSnapshotJSON,
			SummaryJSON:           params.SummaryJSON,
			PublishedBy:           params.PublishedBy,
			PublishedAt:           time.Now().UTC(),
		}
		if err := tx.Create(version).Error; err != nil {
			return err
		}

		result := tx.Model(&models.ProjectType{}).
			Where("id = ? AND version = ?", params.ProjectTypeID, params.ExpectedVersion).
			Updates(map[string]any{
				"status":     "published",
				"updated_by": params.PublishedBy,
				"version":    gorm.Expr("version + 1"),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrConflict
		}

		publishedVersion = version
		return nil
	})
	if err != nil {
		return nil, err
	}

	return publishedVersion, nil
}

func (r *ProjectTypeRepository) ListVersions(ctx context.Context, projectTypeID string) ([]models.ProjectTypeVersion, error) {
	var versions []models.ProjectTypeVersion
	err := r.db.WithContext(ctx).
		Where("project_type_id = ?", projectTypeID).
		Order("version_no DESC").
		Find(&versions).Error
	return versions, err
}

func (r *ProjectTypeRepository) GetVersionByID(ctx context.Context, projectTypeID string, versionID string) (*models.ProjectTypeVersion, error) {
	var version models.ProjectTypeVersion
	err := r.db.WithContext(ctx).
		Where("project_type_id = ? AND id = ?", projectTypeID, versionID).
		First(&version).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &version, nil
}

func (r *ProjectTypeRepository) GetVersion(ctx context.Context, versionID string) (*models.ProjectTypeVersion, error) {
	var version models.ProjectTypeVersion
	err := r.db.WithContext(ctx).
		First(&version, "id = ?", versionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &version, nil
}
