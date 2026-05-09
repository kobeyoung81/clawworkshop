SET @has_comment := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'comment'
);
SET @has_runtime_comment := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'runtime_comment'
);
SET @restore_comment_sql := IF(
  @has_runtime_comment > 0 AND @has_comment = 0,
  'RENAME TABLE runtime_comment TO comment',
  'SELECT 1'
);
PREPARE restore_comment_stmt FROM @restore_comment_sql;
EXECUTE restore_comment_stmt;
DEALLOCATE PREPARE restore_comment_stmt;

SET @has_event := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'event'
);
SET @has_runtime_event := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'runtime_event'
);
SET @restore_event_sql := IF(
  @has_runtime_event > 0 AND @has_event = 0,
  'RENAME TABLE runtime_event TO event',
  'SELECT 1'
);
PREPARE restore_event_stmt FROM @restore_event_sql;
EXECUTE restore_event_stmt;
DEALLOCATE PREPARE restore_event_stmt;
