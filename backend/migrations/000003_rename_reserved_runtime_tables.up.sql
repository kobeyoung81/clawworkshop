SET @has_runtime_comment := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'runtime_comment'
);
SET @has_comment := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'comment'
);
SET @rename_comment_sql := IF(
  @has_comment > 0 AND @has_runtime_comment = 0,
  'RENAME TABLE comment TO runtime_comment',
  'SELECT 1'
);
PREPARE rename_comment_stmt FROM @rename_comment_sql;
EXECUTE rename_comment_stmt;
DEALLOCATE PREPARE rename_comment_stmt;

SET @has_runtime_event := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'runtime_event'
);
SET @has_event := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'event'
);
SET @rename_event_sql := IF(
  @has_event > 0 AND @has_runtime_event = 0,
  'RENAME TABLE event TO runtime_event',
  'SELECT 1'
);
PREPARE rename_event_stmt FROM @rename_event_sql;
EXECUTE rename_event_stmt;
DEALLOCATE PREPARE rename_event_stmt;
