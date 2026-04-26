package store

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type ArtifactRepository struct {
	db *gorm.DB
}

func (r *ArtifactRepository) GetByID(ctx context.Context, artifactID string) (*models.ArtifactInstance, error) {
	var artifact models.ArtifactInstance
	err := r.db.WithContext(ctx).First(&artifact, "id = ?", artifactID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &artifact, nil
}

func (r *ArtifactRepository) ListByProject(ctx context.Context, projectID string) ([]models.ArtifactInstance, error) {
	var artifacts []models.ArtifactInstance
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Order("artifact_key ASC").
		Find(&artifacts).Error
	return artifacts, err
}

func (r *ArtifactRepository) ListRevisions(ctx context.Context, artifactID string) ([]models.ArtifactRevision, error) {
	var revisions []models.ArtifactRevision
	err := r.db.WithContext(ctx).
		Where("artifact_instance_id = ?", artifactID).
		Order("revision_no DESC").
		Find(&revisions).Error
	return revisions, err
}

func (r *ArtifactRepository) ListByProjectKeys(ctx context.Context, projectID string, artifactKeys []string) ([]models.ArtifactInstance, error) {
	var artifacts []models.ArtifactInstance
	query := r.db.WithContext(ctx).Where("project_id = ?", projectID)
	if len(artifactKeys) > 0 {
		query = query.Where("artifact_key IN ?", artifactKeys)
	}

	err := query.
		Order("artifact_key ASC").
		Find(&artifacts).Error
	return artifacts, err
}

func (r *ArtifactRepository) GetRevision(ctx context.Context, artifactID string, revisionNo int) (*models.ArtifactRevision, error) {
	var revision models.ArtifactRevision
	err := r.db.WithContext(ctx).
		First(&revision, "artifact_instance_id = ? AND revision_no = ?", artifactID, revisionNo).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &revision, nil
}
