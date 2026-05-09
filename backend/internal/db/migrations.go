package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"

	mysql "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	migratemysql "github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	sqlmigrations "github.com/supremelosclaws/clawworkshop/backend/migrations"
)

const (
	migrationVersionInitialSchema uint = 1
	migrationVersionAppConfigs    uint = 2
	migrationVersionRuntimeRename uint = 3
)

type MigrationStatus struct {
	Version        *uint
	Dirty          bool
	LegacyBaseline *uint
}

func EnsureMigrations(ctx context.Context, dsn string) error {
	migrator, migrationDB, err := OpenMigrator(dsn)
	if err != nil {
		return err
	}
	defer closeMigrator(migrator, migrationDB)

	if _, err := adoptLegacySchema(ctx, migrationDB, migrator); err != nil {
		return err
	}

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}

	return nil
}

func OpenMigrator(dsn string) (*migrate.Migrate, *sql.DB, error) {
	migrationDB, err := openMigrationDB(dsn)
	if err != nil {
		return nil, nil, err
	}

	driver, err := migratemysql.WithInstance(migrationDB, &migratemysql.Config{})
	if err != nil {
		_ = migrationDB.Close()
		return nil, nil, fmt.Errorf("create mysql migration driver: %w", err)
	}

	source, err := iofs.New(sqlmigrations.Files, ".")
	if err != nil {
		_ = migrationDB.Close()
		return nil, nil, fmt.Errorf("open embedded migrations: %w", err)
	}

	migrator, err := migrate.NewWithInstance("iofs", source, "mysql", driver)
	if err != nil {
		_ = migrationDB.Close()
		return nil, nil, fmt.Errorf("create migrator: %w", err)
	}

	return migrator, migrationDB, nil
}

func CurrentMigrationStatus(ctx context.Context, dsn string) (MigrationStatus, error) {
	migrator, migrationDB, err := OpenMigrator(dsn)
	if err != nil {
		return MigrationStatus{}, err
	}
	defer closeMigrator(migrator, migrationDB)

	version, dirty, err := migrator.Version()
	if err == nil {
		resolvedVersion := version
		return MigrationStatus{
			Version: &resolvedVersion,
			Dirty:   dirty,
		}, nil
	}
	if !errors.Is(err, migrate.ErrNilVersion) {
		return MigrationStatus{}, fmt.Errorf("read migration version: %w", err)
	}

	legacyBaseline, err := detectLegacyBaseline(ctx, migrationDB)
	if err != nil {
		return MigrationStatus{}, err
	}

	return MigrationStatus{
		LegacyBaseline: legacyBaseline,
	}, nil
}

func adoptLegacySchema(ctx context.Context, sqlDB *sql.DB, migrator *migrate.Migrate) (*uint, error) {
	version, dirty, err := migrator.Version()
	if err == nil {
		if dirty {
			recovered, recoverErr := recoverDirtyInitialMigration(ctx, sqlDB, migrator, version)
			if recoverErr != nil {
				return nil, recoverErr
			}
			if recovered {
				return nil, nil
			}
			return nil, fmt.Errorf("database migration state is dirty at version %d", version)
		}
		return nil, nil
	}
	if !errors.Is(err, migrate.ErrNilVersion) {
		return nil, fmt.Errorf("read migration version: %w", err)
	}

	baseline, err := detectLegacyBaseline(ctx, sqlDB)
	if err != nil {
		return nil, err
	}
	if baseline == nil {
		return nil, nil
	}

	if err := migrator.Force(int(*baseline)); err != nil {
		return nil, fmt.Errorf("record legacy migration baseline %d: %w", *baseline, err)
	}

	return baseline, nil
}

func detectLegacyBaseline(ctx context.Context, sqlDB *sql.DB) (*uint, error) {
	tables, err := listTables(ctx, sqlDB)
	if err != nil {
		return nil, err
	}

	baseRuntimeTables := []string{
		"workspace",
		"workspace_member",
		"project_type",
		"validation_report",
		"project_type_version",
		"project",
		"project_participant",
		"flow",
		"task",
		"assignment",
		"artifact_instance",
		"artifact_revision",
		"review_session",
		"review_decision",
		"feedback_session",
		"feedback_entry",
		"notification_cursor",
	}

	hasAllBaseRuntimeTables := hasAllTables(tables, baseRuntimeTables...)
	hasLegacyRuntimeTables := hasAllTables(tables, "event", "comment")
	hasRenamedRuntimeTables := hasAllTables(tables, "runtime_event", "runtime_comment")
	hasAppConfigs := tables["app_configs"]

	if hasRenamedRuntimeTables {
		if !hasAllBaseRuntimeTables || !hasAppConfigs {
			return nil, fmt.Errorf("detected partially migrated runtime schema with renamed tables but missing baseline tables or app_configs")
		}
		return uintPtr(migrationVersionRuntimeRename), nil
	}

	if hasLegacyRuntimeTables {
		if !hasAllBaseRuntimeTables {
			return nil, fmt.Errorf("detected partially migrated legacy runtime schema with missing tables: %s", missingTables(tables, baseRuntimeTables))
		}
		if hasAppConfigs {
			return uintPtr(migrationVersionAppConfigs), nil
		}
		return uintPtr(migrationVersionInitialSchema), nil
	}

	if hasAllBaseRuntimeTables {
		return nil, fmt.Errorf("detected inconsistent runtime schema: base tables exist but neither legacy nor renamed runtime tables are complete")
	}

	if hasAnyTables(tables, append(baseRuntimeTables, "event", "comment", "runtime_event", "runtime_comment")...) {
		return nil, fmt.Errorf("detected partial legacy schema without migration tracking; present tables: %s", strings.Join(sortedPresentTables(tables, append(baseRuntimeTables, "event", "comment", "runtime_event", "runtime_comment", "app_configs")), ", "))
	}

	if hasAppConfigs {
		return nil, nil
	}

	return nil, nil
}

func recoverDirtyInitialMigration(ctx context.Context, sqlDB *sql.DB, migrator *migrate.Migrate, version uint) (bool, error) {
	if version != migrationVersionInitialSchema {
		return false, nil
	}

	tables, err := listTables(ctx, sqlDB)
	if err != nil {
		return false, err
	}

	if tables["runtime_event"] && tables["runtime_comment"] && tables["notification_cursor"] {
		return false, nil
	}
	if tables["event"] && tables["comment"] && tables["notification_cursor"] {
		return false, nil
	}

	runtimeTables := allManagedRuntimeTables()
	presentRuntimeTables := sortedPresentTables(tables, runtimeTables)
	if len(presentRuntimeTables) > 0 {
		if err := dropTables(ctx, sqlDB, reverseStrings(presentRuntimeTables)); err != nil {
			return false, fmt.Errorf("reset partial dirty migration state: %w", err)
		}
	}

	if err := migrator.Force(-1); err != nil {
		return false, fmt.Errorf("clear dirty migration state: %w", err)
	}

	return true, nil
}

func listTables(ctx context.Context, sqlDB *sql.DB) (map[string]bool, error) {
	rows, err := sqlDB.QueryContext(ctx, "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")
	if err != nil {
		return nil, fmt.Errorf("list database tables: %w", err)
	}
	defer rows.Close()

	tables := make(map[string]bool)
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("scan database table name: %w", err)
		}
		tables[tableName] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate database tables: %w", err)
	}

	return tables, nil
}

func hasAllTables(tables map[string]bool, names ...string) bool {
	for _, name := range names {
		if !tables[name] {
			return false
		}
	}
	return true
}

func hasAnyTables(tables map[string]bool, names ...string) bool {
	for _, name := range names {
		if tables[name] {
			return true
		}
	}
	return false
}

func missingTables(tables map[string]bool, names []string) string {
	missing := make([]string, 0, len(names))
	for _, name := range names {
		if !tables[name] {
			missing = append(missing, name)
		}
	}
	sort.Strings(missing)
	return strings.Join(missing, ", ")
}

func dropTables(ctx context.Context, sqlDB *sql.DB, tableNames []string) error {
	for _, tableName := range tableNames {
		if _, err := sqlDB.ExecContext(ctx, fmt.Sprintf("DROP TABLE IF EXISTS `%s`", tableName)); err != nil {
			return fmt.Errorf("drop table %s: %w", tableName, err)
		}
	}
	return nil
}

func sortedPresentTables(tables map[string]bool, names []string) []string {
	present := make([]string, 0, len(names))
	for _, name := range names {
		if tables[name] {
			present = append(present, name)
		}
	}
	sort.Strings(present)
	return present
}

func reverseStrings(values []string) []string {
	reversed := make([]string, len(values))
	copy(reversed, values)
	for left, right := 0, len(reversed)-1; left < right; left, right = left+1, right-1 {
		reversed[left], reversed[right] = reversed[right], reversed[left]
	}
	return reversed
}

func allManagedRuntimeTables() []string {
	return []string{
		"workspace",
		"workspace_member",
		"project_type",
		"validation_report",
		"project_type_version",
		"project",
		"project_participant",
		"flow",
		"task",
		"assignment",
		"artifact_instance",
		"artifact_revision",
		"review_session",
		"review_decision",
		"feedback_session",
		"feedback_entry",
		"notification_cursor",
		"event",
		"comment",
		"runtime_event",
		"runtime_comment",
	}
}

func openMigrationDB(dsn string) (*sql.DB, error) {
	cfg, err := mysql.ParseDSN(strings.TrimSpace(dsn))
	if err != nil {
		return nil, fmt.Errorf("parse mysql dsn for migrations: %w", err)
	}
	cfg.MultiStatements = true

	migrationDB, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("open mysql migration connection: %w", err)
	}
	if err := migrationDB.Ping(); err != nil {
		_ = migrationDB.Close()
		return nil, fmt.Errorf("ping mysql migration connection: %w", err)
	}

	return migrationDB, nil
}

func closeMigrator(migrator *migrate.Migrate, sqlDB *sql.DB) {
	if migrator == nil {
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
		return
	}
	_, _ = migrator.Close()
	if sqlDB != nil {
		_ = sqlDB.Close()
	}
}

func uintPtr(value uint) *uint {
	return &value
}
