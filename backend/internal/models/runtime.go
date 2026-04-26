package models

import (
	"encoding/json"
	"time"
)

type Project struct {
	ID                   string          `gorm:"column:id;type:char(26);primaryKey"`
	WorkspaceID          string          `gorm:"column:workspace_id;type:char(26);not null;index"`
	ProjectTypeVersionID string          `gorm:"column:project_type_version_id;type:char(26);not null;index"`
	Name                 string          `gorm:"column:name;size:255;not null"`
	Description          string          `gorm:"column:description;type:longtext"`
	Status               string          `gorm:"column:status;size:32;not null"`
	ParameterValuesJSON  json.RawMessage `gorm:"column:parameter_values_json;type:json"`
	Version              int64           `gorm:"column:version;not null"`
	CreatedBy            string          `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy            string          `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt            time.Time       `gorm:"column:created_at;not null"`
	UpdatedAt            time.Time       `gorm:"column:updated_at;not null"`
}

type ProjectParticipant struct {
	ID          string    `gorm:"column:id;type:char(26);primaryKey"`
	ProjectID   string    `gorm:"column:project_id;type:char(26);not null;index"`
	SubjectID   string    `gorm:"column:subject_id;type:char(26);not null;index"`
	SubjectType string    `gorm:"column:subject_type;size:32;not null"`
	Role        string    `gorm:"column:role;size:32;not null"`
	Status      string    `gorm:"column:status;size:32;not null"`
	CreatedAt   time.Time `gorm:"column:created_at;not null"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null"`
}

type Flow struct {
	ID                   string          `gorm:"column:id;type:char(26);primaryKey"`
	ProjectID            string          `gorm:"column:project_id;type:char(26);not null;index"`
	WorkflowKey          string          `gorm:"column:workflow_key;size:128;not null"`
	FlowSequence         int             `gorm:"column:flow_sequence;not null"`
	Status               string          `gorm:"column:status;size:32;not null"`
	BlockedReason        string          `gorm:"column:blocked_reason;type:longtext"`
	WorkflowSnapshotJSON json.RawMessage `gorm:"column:workflow_snapshot_json;type:json"`
	Version              int64           `gorm:"column:version;not null"`
	CreatedBy            string          `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy            string          `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt            time.Time       `gorm:"column:created_at;not null"`
	UpdatedAt            time.Time       `gorm:"column:updated_at;not null"`
}

type Task struct {
	ID                       string    `gorm:"column:id;type:char(26);primaryKey"`
	FlowID                   string    `gorm:"column:flow_id;type:char(26);not null;index"`
	NodeKey                  string    `gorm:"column:node_key;size:128;not null"`
	Status                   string    `gorm:"column:status;size:32;not null"`
	ClaimOwnerID             string    `gorm:"column:claim_owner_id;type:char(26)"`
	CurrentAssignmentID      string    `gorm:"column:current_assignment_id;type:char(26)"`
	CurrentReviewSessionID   string    `gorm:"column:current_review_session_id;type:char(26)"`
	CurrentFeedbackSessionID string    `gorm:"column:current_feedback_session_id;type:char(26)"`
	Version                  int64     `gorm:"column:version;not null"`
	CreatedAt                time.Time `gorm:"column:created_at;not null"`
	UpdatedAt                time.Time `gorm:"column:updated_at;not null"`
}

type Assignment struct {
	ID           string    `gorm:"column:id;type:char(26);primaryKey"`
	TaskID       string    `gorm:"column:task_id;type:char(26);not null;index"`
	AssigneeID   string    `gorm:"column:assignee_id;type:char(26);not null;index"`
	AssigneeType string    `gorm:"column:assignee_type;size:32;not null"`
	Source       string    `gorm:"column:source;size:32;not null"`
	Status       string    `gorm:"column:status;size:32;not null"`
	Version      int64     `gorm:"column:version;not null"`
	CreatedBy    string    `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy    string    `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt    time.Time `gorm:"column:created_at;not null"`
	UpdatedAt    time.Time `gorm:"column:updated_at;not null"`
}

type ArtifactInstance struct {
	ID                string    `gorm:"column:id;type:char(26);primaryKey"`
	ProjectID         string    `gorm:"column:project_id;type:char(26);not null;index"`
	ArtifactKey       string    `gorm:"column:artifact_key;size:191;not null"`
	ScopeType         string    `gorm:"column:scope_type;size:32;not null"`
	ScopeRef          string    `gorm:"column:scope_ref;size:191;not null"`
	CurrentRevisionNo int       `gorm:"column:current_revision_no;not null"`
	Version           int64     `gorm:"column:version;not null"`
	CreatedAt         time.Time `gorm:"column:created_at;not null"`
	UpdatedAt         time.Time `gorm:"column:updated_at;not null"`
}

type ArtifactRevision struct {
	ID                 string          `gorm:"column:id;type:char(26);primaryKey"`
	ArtifactInstanceID string          `gorm:"column:artifact_instance_id;type:char(26);not null;index"`
	RevisionNo         int             `gorm:"column:revision_no;not null"`
	ContentKind        string          `gorm:"column:content_kind;size:32;not null"`
	BodyText           string          `gorm:"column:body_text;type:longtext"`
	BodyJSON           json.RawMessage `gorm:"column:body_json;type:json"`
	BodyBytes          []byte          `gorm:"column:body_bytes;type:longblob"`
	MimeType           string          `gorm:"column:mime_type;size:255;not null"`
	ByteSize           int64           `gorm:"column:byte_size;not null"`
	ChecksumSHA256     string          `gorm:"column:checksum_sha256;size:64"`
	CreatedBy          string          `gorm:"column:created_by;type:char(26);not null"`
	BaseRevisionNo     int             `gorm:"column:base_revision_no"`
	CreatedAt          time.Time       `gorm:"column:created_at;not null"`
}

type ReviewSession struct {
	ID                     string          `gorm:"column:id;type:char(26);primaryKey"`
	TaskID                 string          `gorm:"column:task_id;type:char(26);not null;index"`
	Status                 string          `gorm:"column:status;size:32;not null"`
	Outcome                string          `gorm:"column:outcome;size:32"`
	RequestedReviewersJSON json.RawMessage `gorm:"column:requested_reviewers_json;type:json;not null"`
	ResolvedAt             *time.Time      `gorm:"column:resolved_at"`
	Version                int64           `gorm:"column:version;not null"`
	CreatedBy              string          `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy              string          `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt              time.Time       `gorm:"column:created_at;not null"`
	UpdatedAt              time.Time       `gorm:"column:updated_at;not null"`
}

type ReviewDecision struct {
	ID              string    `gorm:"column:id;type:char(26);primaryKey"`
	ReviewSessionID string    `gorm:"column:review_session_id;type:char(26);not null;index"`
	ReviewerID      string    `gorm:"column:reviewer_id;type:char(26);not null"`
	Outcome         string    `gorm:"column:outcome;size:32;not null"`
	CommentBody     string    `gorm:"column:comment_body;type:longtext"`
	CreatedAt       time.Time `gorm:"column:created_at;not null"`
}

type FeedbackSession struct {
	ID         string     `gorm:"column:id;type:char(26);primaryKey"`
	TaskID     string     `gorm:"column:task_id;type:char(26);not null;index"`
	Status     string     `gorm:"column:status;size:32;not null"`
	Summary    string     `gorm:"column:summary;type:longtext"`
	ResolvedAt *time.Time `gorm:"column:resolved_at"`
	Version    int64      `gorm:"column:version;not null"`
	CreatedBy  string     `gorm:"column:created_by;type:char(26);not null"`
	UpdatedBy  string     `gorm:"column:updated_by;type:char(26);not null"`
	CreatedAt  time.Time  `gorm:"column:created_at;not null"`
	UpdatedAt  time.Time  `gorm:"column:updated_at;not null"`
}

type FeedbackEntry struct {
	ID                string    `gorm:"column:id;type:char(26);primaryKey"`
	FeedbackSessionID string    `gorm:"column:feedback_session_id;type:char(26);not null;index"`
	AuthorID          string    `gorm:"column:author_id;type:char(26);not null"`
	Body              string    `gorm:"column:body;type:longtext;not null"`
	CreatedAt         time.Time `gorm:"column:created_at;not null"`
}

type Comment struct {
	ID         string    `gorm:"column:id;type:char(26);primaryKey"`
	ParentType string    `gorm:"column:parent_type;size:32;not null"`
	ParentID   string    `gorm:"column:parent_id;type:char(26);not null;index"`
	AuthorID   string    `gorm:"column:author_id;type:char(26);not null"`
	Body       string    `gorm:"column:body;type:longtext;not null"`
	CreatedAt  time.Time `gorm:"column:created_at;not null"`
}

type Event struct {
	ID             string          `gorm:"column:id;type:char(26);primaryKey"`
	Seq            int64           `gorm:"column:seq;autoIncrement;uniqueIndex"`
	WorkspaceID    string          `gorm:"column:workspace_id;type:char(26);not null;index"`
	ProjectID      string          `gorm:"column:project_id;type:char(26);index"`
	FlowID         string          `gorm:"column:flow_id;type:char(26);index"`
	Topic          string          `gorm:"column:topic;size:96;not null"`
	SubjectType    string          `gorm:"column:subject_type;size:32;not null"`
	SubjectID      string          `gorm:"column:subject_id;type:char(26);not null"`
	SubjectVersion int64           `gorm:"column:subject_version"`
	ActorID        string          `gorm:"column:actor_id;type:char(26);not null"`
	PayloadJSON    json.RawMessage `gorm:"column:payload_json;type:json;not null"`
	CreatedAt      time.Time       `gorm:"column:created_at;not null"`
}

type NotificationCursor struct {
	ActorID     string    `gorm:"column:actor_id;type:char(26);primaryKey"`
	FeedName    string    `gorm:"column:feed_name;size:96;primaryKey"`
	LastSeenSeq int64     `gorm:"column:last_seen_seq;not null"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null"`
}

func (Project) TableName() string {
	return "project"
}

func (ProjectParticipant) TableName() string {
	return "project_participant"
}

func (Flow) TableName() string {
	return "flow"
}

func (Task) TableName() string {
	return "task"
}

func (Assignment) TableName() string {
	return "assignment"
}

func (ArtifactInstance) TableName() string {
	return "artifact_instance"
}

func (ArtifactRevision) TableName() string {
	return "artifact_revision"
}

func (ReviewSession) TableName() string {
	return "review_session"
}

func (ReviewDecision) TableName() string {
	return "review_decision"
}

func (FeedbackSession) TableName() string {
	return "feedback_session"
}

func (FeedbackEntry) TableName() string {
	return "feedback_entry"
}

func (Comment) TableName() string {
	return "comment"
}

func (Event) TableName() string {
	return "event"
}

func (NotificationCursor) TableName() string {
	return "notification_cursor"
}
