package store

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type EventRepository struct {
	db *gorm.DB
}

type ListEventsParams struct {
	SubjectID   string
	WorkspaceID string
	ProjectID   string
	FlowID      string
	SinceSeq    int64
	Limit       int
}

func (r *EventRepository) List(ctx context.Context, params ListEventsParams) ([]models.Event, error) {
	query := r.db.WithContext(ctx).
		Model(&models.Event{}).
		Joins("JOIN workspace_member ON workspace_member.workspace_id = event.workspace_id AND workspace_member.subject_id = ? AND workspace_member.status = ?", params.SubjectID, "active").
		Order("seq ASC")

	if params.WorkspaceID != "" {
		query = query.Where("workspace_id = ?", params.WorkspaceID)
	}
	if params.ProjectID != "" {
		query = query.Where("project_id = ?", params.ProjectID)
	}
	if params.FlowID != "" {
		query = query.Where("flow_id = ?", params.FlowID)
	}
	if params.SinceSeq > 0 {
		query = query.Where("seq > ?", params.SinceSeq)
	}

	limit := params.Limit
	if limit <= 0 || limit > 200 {
		limit = 100
	}

	var events []models.Event
	err := query.Limit(limit).Find(&events).Error
	return events, err
}

func (r *EventRepository) GetCursor(ctx context.Context, actorID string, feedName string) (*models.NotificationCursor, error) {
	var cursor models.NotificationCursor
	err := r.db.WithContext(ctx).First(&cursor, "actor_id = ? AND feed_name = ?", actorID, feedName).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &cursor, nil
}

func (r *EventRepository) UpsertCursor(ctx context.Context, actorID string, feedName string, lastSeenSeq int64) (*models.NotificationCursor, error) {
	cursor := &models.NotificationCursor{
		ActorID:     actorID,
		FeedName:    feedName,
		LastSeenSeq: lastSeenSeq,
		UpdatedAt:   time.Now().UTC(),
	}

	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "actor_id"}, {Name: "feed_name"}},
		DoUpdates: clause.AssignmentColumns([]string{"last_seen_seq", "updated_at"}),
	}).Create(cursor).Error
	if err != nil {
		return nil, err
	}

	return cursor, nil
}
