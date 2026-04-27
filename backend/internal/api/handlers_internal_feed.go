package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type internalFeedEvent struct {
	Seq         int64           `json:"seq"`
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	SubjectType string          `json:"subject_type"`
	SubjectID   string          `json:"subject_id"`
	OccurredAt  time.Time       `json:"occurred_at"`
	Payload     json.RawMessage `json:"payload"`
}

type internalFeedResponse struct {
	Source       string              `json:"source"`
	Events       []internalFeedEvent `json:"events"`
	NextAfterSeq int64               `json:"next_after_seq"`
	HasMore      bool                `json:"has_more"`
}

func (d Dependencies) handleInternalActivityFeed(w http.ResponseWriter, r *http.Request) {
	expected := strings.TrimSpace(d.Config.InternalActivityFeedToken)
	if expected == "" {
		writeError(w, r, http.StatusServiceUnavailable, "feed_not_configured", "Internal activity feed is not configured.")
		return
	}
	if strings.TrimSpace(r.Header.Get("Authorization")) != "Bearer "+expected {
		writeError(w, r, http.StatusUnauthorized, "unauthorized", "Unauthorized.")
		return
	}
	if !databaseReady(d) {
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Database connection is unavailable.")
		return
	}

	afterSeq, err := parseInt64QueryParam(r, "after_seq")
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_after_seq", "The after_seq query parameter must be a non-negative integer.")
		return
	}
	limit, err := parsePositiveIntQueryParam(r, "limit", 100, 200)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_limit", "The limit query parameter must be a positive integer.")
		return
	}

	var records []models.Event
	if err := d.Store.DB.WithContext(r.Context()).
		Model(&models.Event{}).
		Where("seq > ?", afterSeq).
		Order("seq ASC").
		Limit(limit + 1).
		Find(&records).Error; err != nil {
		writeError(w, r, http.StatusInternalServerError, "feed_query_failed", "Failed to load activity feed.")
		return
	}

	hasMore := len(records) > limit
	if hasMore {
		records = records[:limit]
	}

	nextAfterSeq := afterSeq
	events := make([]internalFeedEvent, 0, len(records))
	for _, record := range records {
		nextAfterSeq = record.Seq
		events = append(events, internalFeedEvent{
			Seq:         record.Seq,
			EventID:     fmt.Sprintf("clawworkshop:%d", record.Seq),
			EventType:   record.Topic,
			SubjectType: record.SubjectType,
			SubjectID:   record.SubjectID,
			OccurredAt:  record.CreatedAt,
			Payload:     record.PayloadJSON,
		})
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(internalFeedResponse{
		Source:       "clawworkshop",
		Events:       events,
		NextAfterSeq: nextAfterSeq,
		HasMore:      hasMore,
	})
}

func parseInt64QueryParam(r *http.Request, key string) (int64, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return 0, nil
	}

	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		return 0, fmt.Errorf("invalid %s", key)
	}

	return value, nil
}

func parsePositiveIntQueryParam(r *http.Request, key string, fallback int, max int) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("invalid %s", key)
	}
	if value > max {
		value = max
	}

	return value, nil
}
