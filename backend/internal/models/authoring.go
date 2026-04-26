package models

import (
	"encoding/json"
	"time"
)

type ProjectType struct {
	ID               string          `gorm:"column:id;type:char(26);primaryKey"`
	WorkspaceID      string          `gorm:"column:workspace_id;type:char(26);not null;index"`
	Key              string          `gorm:"column:key;size:128;not null"`
	Title            string          `gorm:"column:title;size:255;not null"`
	Description      string          `gorm:"column:description;type:longtext"`
	Status           string          `gorm:"column:status;size:32;not null"`
	CurrentDraftJSON json.RawMessage `gorm:"column:current_draft_json;type:json;not null"`
	Version          int64           `gorm:"column:version;not null"`
	CreatedBy        string          `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy        string          `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt        time.Time       `gorm:"column:created_at;not null"`
	UpdatedAt        time.Time       `gorm:"column:updated_at;not null"`
}

type ValidationReport struct {
	ID            string          `gorm:"column:id;type:char(26);primaryKey"`
	ProjectTypeID string          `gorm:"column:project_type_id;type:char(26);not null;index"`
	DraftVersion  int64           `gorm:"column:draft_version;not null"`
	Severity      string          `gorm:"column:severity;size:32;not null"`
	ReportJSON    json.RawMessage `gorm:"column:report_json;type:json;not null"`
	CreatedBy     string          `gorm:"column:created_by;type:char(26);not null"`
	CreatedAt     time.Time       `gorm:"column:created_at;not null"`
}

type ProjectTypeVersion struct {
	ID                    string          `gorm:"column:id;type:char(26);primaryKey"`
	ProjectTypeID         string          `gorm:"column:project_type_id;type:char(26);not null;index"`
	VersionNo             int             `gorm:"column:version_no;not null"`
	PublishedSnapshotJSON json.RawMessage `gorm:"column:published_snapshot_json;type:json;not null"`
	SummaryJSON           json.RawMessage `gorm:"column:summary_json;type:json"`
	PublishedBy           string          `gorm:"column:published_by;type:char(26);not null"`
	PublishedAt           time.Time       `gorm:"column:published_at;not null"`
}

func (ProjectType) TableName() string {
	return "project_type"
}

func (ValidationReport) TableName() string {
	return "validation_report"
}

func (ProjectTypeVersion) TableName() string {
	return "project_type_version"
}
