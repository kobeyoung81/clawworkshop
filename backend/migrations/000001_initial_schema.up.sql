CREATE TABLE workspace (
  id CHAR(26) NOT NULL PRIMARY KEY,
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_locale VARCHAR(16) NOT NULL DEFAULT 'en',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_workspace_slug (slug)
);

CREATE TABLE workspace_member (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  subject_id CHAR(26) NOT NULL,
  subject_type VARCHAR(32) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_workspace_member_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
  UNIQUE KEY uq_workspace_member_subject (workspace_id, subject_id),
  KEY idx_workspace_member_subject (subject_id)
);

CREATE TABLE project_type (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  `key` VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_draft_json JSON NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_project_type_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_type_workspace_key (workspace_id, `key`)
);

CREATE TABLE validation_report (
  id CHAR(26) NOT NULL PRIMARY KEY,
  project_type_id CHAR(26) NOT NULL,
  draft_version BIGINT NOT NULL,
  severity VARCHAR(32) NOT NULL,
  report_json JSON NOT NULL,
  created_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_validation_report_project_type FOREIGN KEY (project_type_id) REFERENCES project_type(id) ON DELETE CASCADE,
  KEY idx_validation_report_project_type (project_type_id, draft_version)
);

CREATE TABLE project_type_version (
  id CHAR(26) NOT NULL PRIMARY KEY,
  project_type_id CHAR(26) NOT NULL,
  version_no INT NOT NULL,
  published_snapshot_json JSON NOT NULL,
  summary_json JSON NULL,
  published_by CHAR(26) NOT NULL,
  published_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_project_type_version_project_type FOREIGN KEY (project_type_id) REFERENCES project_type(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_type_version (project_type_id, version_no)
);

CREATE TABLE project (
  id CHAR(26) NOT NULL PRIMARY KEY,
  workspace_id CHAR(26) NOT NULL,
  project_type_version_id CHAR(26) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  parameter_values_json JSON NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_project_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_project_type_version FOREIGN KEY (project_type_version_id) REFERENCES project_type_version(id) ON DELETE RESTRICT,
  KEY idx_project_workspace (workspace_id)
);

CREATE TABLE project_participant (
  id CHAR(26) NOT NULL PRIMARY KEY,
  project_id CHAR(26) NOT NULL,
  subject_id CHAR(26) NOT NULL,
  subject_type VARCHAR(32) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_project_participant_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_participant_subject (project_id, subject_id),
  KEY idx_project_participant_subject (subject_id)
);

CREATE TABLE flow (
  id CHAR(26) NOT NULL PRIMARY KEY,
  project_id CHAR(26) NOT NULL,
  workflow_key VARCHAR(128) NOT NULL,
  flow_sequence INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  blocked_reason LONGTEXT NULL,
  workflow_snapshot_json JSON NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_flow_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  UNIQUE KEY uq_flow_sequence (project_id, workflow_key, flow_sequence)
);

CREATE TABLE task (
  id CHAR(26) NOT NULL PRIMARY KEY,
  flow_id CHAR(26) NOT NULL,
  node_key VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  claim_owner_id CHAR(26) NULL,
  current_assignment_id CHAR(26) NULL,
  current_review_session_id CHAR(26) NULL,
  current_feedback_session_id CHAR(26) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_task_flow FOREIGN KEY (flow_id) REFERENCES flow(id) ON DELETE CASCADE,
  UNIQUE KEY uq_task_flow_node (flow_id, node_key)
);

CREATE TABLE assignment (
  id CHAR(26) NOT NULL PRIMARY KEY,
  task_id CHAR(26) NOT NULL,
  assignee_id CHAR(26) NOT NULL,
  assignee_type VARCHAR(32) NOT NULL,
  source VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  active_guard TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED,
  CONSTRAINT fk_assignment_task FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  UNIQUE KEY uq_assignment_active (task_id, active_guard),
  KEY idx_assignment_assignee (assignee_id, status)
);

CREATE TABLE artifact_instance (
  id CHAR(26) NOT NULL PRIMARY KEY,
  project_id CHAR(26) NOT NULL,
  artifact_key VARCHAR(191) NOT NULL,
  scope_type VARCHAR(32) NOT NULL,
  scope_ref VARCHAR(191) NOT NULL,
  current_revision_no INT NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_artifact_instance_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE,
  UNIQUE KEY uq_artifact_instance_project_key (project_id, artifact_key)
);

CREATE TABLE artifact_revision (
  id CHAR(26) NOT NULL PRIMARY KEY,
  artifact_instance_id CHAR(26) NOT NULL,
  revision_no INT NOT NULL,
  content_kind VARCHAR(32) NOT NULL,
  body_text LONGTEXT NULL,
  body_json JSON NULL,
  body_bytes LONGBLOB NULL,
  mime_type VARCHAR(255) NOT NULL,
  byte_size BIGINT NOT NULL DEFAULT 0,
  checksum_sha256 CHAR(64) NULL,
  created_by CHAR(26) NOT NULL,
  base_revision_no INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_artifact_revision_instance FOREIGN KEY (artifact_instance_id) REFERENCES artifact_instance(id) ON DELETE CASCADE,
  UNIQUE KEY uq_artifact_revision_no (artifact_instance_id, revision_no),
  KEY idx_artifact_revision_created_at (created_at)
);

CREATE TABLE review_session (
  id CHAR(26) NOT NULL PRIMARY KEY,
  task_id CHAR(26) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  outcome VARCHAR(32) NULL,
  requested_reviewers_json JSON NOT NULL,
  resolved_at DATETIME(6) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_review_session_task FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  KEY idx_review_session_task_status (task_id, status)
);

CREATE TABLE review_decision (
  id CHAR(26) NOT NULL PRIMARY KEY,
  review_session_id CHAR(26) NOT NULL,
  reviewer_id CHAR(26) NOT NULL,
  outcome VARCHAR(32) NOT NULL,
  comment_body LONGTEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_review_decision_session FOREIGN KEY (review_session_id) REFERENCES review_session(id) ON DELETE CASCADE,
  UNIQUE KEY uq_review_decision_reviewer (review_session_id, reviewer_id)
);

CREATE TABLE feedback_session (
  id CHAR(26) NOT NULL PRIMARY KEY,
  task_id CHAR(26) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  summary LONGTEXT NULL,
  resolved_at DATETIME(6) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_by CHAR(26) NOT NULL,
  updated_by CHAR(26) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_feedback_session_task FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  KEY idx_feedback_session_task_status (task_id, status)
);

CREATE TABLE feedback_entry (
  id CHAR(26) NOT NULL PRIMARY KEY,
  feedback_session_id CHAR(26) NOT NULL,
  author_id CHAR(26) NOT NULL,
  body LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_feedback_entry_session FOREIGN KEY (feedback_session_id) REFERENCES feedback_session(id) ON DELETE CASCADE,
  KEY idx_feedback_entry_session_created (feedback_session_id, created_at)
);

CREATE TABLE comment (
  id CHAR(26) NOT NULL PRIMARY KEY,
  parent_type VARCHAR(32) NOT NULL,
  parent_id CHAR(26) NOT NULL,
  author_id CHAR(26) NOT NULL,
  body LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY idx_comment_parent (parent_type, parent_id, created_at)
);

CREATE TABLE event (
  id CHAR(26) NOT NULL PRIMARY KEY,
  seq BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id CHAR(26) NOT NULL,
  project_id CHAR(26) NULL,
  flow_id CHAR(26) NULL,
  topic VARCHAR(96) NOT NULL,
  subject_type VARCHAR(32) NOT NULL,
  subject_id CHAR(26) NOT NULL,
  subject_version BIGINT NULL,
  actor_id CHAR(26) NOT NULL,
  payload_json JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_event_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE SET NULL,
  CONSTRAINT fk_event_flow FOREIGN KEY (flow_id) REFERENCES flow(id) ON DELETE SET NULL,
  UNIQUE KEY uq_event_seq (seq),
  KEY idx_event_workspace_seq (workspace_id, seq),
  KEY idx_event_project_seq (project_id, seq),
  KEY idx_event_flow_seq (flow_id, seq)
);

CREATE TABLE notification_cursor (
  actor_id CHAR(26) NOT NULL,
  feed_name VARCHAR(96) NOT NULL,
  last_seen_seq BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (actor_id, feed_name)
);
