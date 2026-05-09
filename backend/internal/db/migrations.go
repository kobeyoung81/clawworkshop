package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"

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

func EnsureMigrations(ctx context.Context, sqlDB *sql.DB) error {
	migrator, err := OpenMigrator(sqlDB)
	if err != nil {
		return err
	}
	defer closeMigrator(migrator)

	if _, err := adoptLegacySchema(ctx, sqlDB, migrator); err != nil {
		return err
	}

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}

	return nil
}

func OpenMigrator(sqlDB *sql.DB) (*migrate.Migrate, error) {
	driver, err := migratemysql.WithInstance(sqlDB, &migratemysql.Config{})
	if err != nil {
		return nil, fmt.Errorf("create mysql migration driver: %w", err)
	}

	source, err := iofs.New(sqlmigrations.Files, ".")
	if err != nil {
		return nil, fmt.Errorf("open embedded migrations: %w", err)
	}

	migrator, err := migrate.NewWithInstance("iofs", source, "mysql", driver)
	if err != nil {
		return nil, fmt.Errorf("create migrator: %w", err)
	}

	return migrator, nil
}

func CurrentMigrationStatus(ctx context.Context, sqlDB *sql.DB) (MigrationStatus, error) {
	migrator, err := OpenMigrator(sqlDB)
	if err != nil {
		return MigrationStatus{}, err
	}
	defer closeMigrator(migrator)

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

	legacyBaseline, err := detectLegacyBaseline(ctx, sqlDB)
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

func closeMigrator(migrator *migrate.Migrate) {
	if migrator == nil {
		return
	}
	_, _ = migrator.Close()
}

func uintPtr(value uint) *uint {
	return &value
}
