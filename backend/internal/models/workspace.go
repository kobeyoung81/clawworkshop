package models

import "time"

type Workspace struct {
	ID            string    `gorm:"column:id;type:char(26);primaryKey"`
	Slug          string    `gorm:"column:slug;size:128;not null;uniqueIndex"`
	Name          string    `gorm:"column:name;size:255;not null"`
	DefaultLocale string    `gorm:"column:default_locale;size:16;not null"`
	Status        string    `gorm:"column:status;size:32;not null"`
	CreatedAt     time.Time `gorm:"column:created_at;not null"`
	UpdatedAt     time.Time `gorm:"column:updated_at;not null"`
}

type WorkspaceMember struct {
	ID          string    `gorm:"column:id;type:char(26);primaryKey"`
	WorkspaceID string    `gorm:"column:workspace_id;type:char(26);not null;index"`
	SubjectID   string    `gorm:"column:subject_id;type:char(26);not null;index"`
	SubjectType string    `gorm:"column:subject_type;size:32;not null"`
	Role        string    `gorm:"column:role;size:32;not null"`
	Status      string    `gorm:"column:status;size:32;not null"`
	CreatedAt   time.Time `gorm:"column:created_at;not null"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null"`
}

func (Workspace) TableName() string {
	return "workspace"
}

func (WorkspaceMember) TableName() string {
	return "workspace_member"
}
