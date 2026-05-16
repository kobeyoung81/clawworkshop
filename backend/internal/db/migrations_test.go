package db

import (
	"strings"
	"testing"
)

func TestLegacyBaselineFromTables(t *testing.T) {
	baseRuntimeTables := workshopBaseRuntimeTables()
	legacyRuntimeTables := append([]string{}, baseRuntimeTables...)
	legacyRuntimeTables = append(legacyRuntimeTables, "event", "comment")
	appConfigTables := append([]string{}, legacyRuntimeTables...)
	appConfigTables = append(appConfigTables, "app_configs")
	renamedRuntimeTables := append([]string{}, baseRuntimeTables...)
	renamedRuntimeTables = append(renamedRuntimeTables, "runtime_event", "runtime_comment", "app_configs")

	tests := []struct {
		name         string
		tables       []string
		wantBaseline *uint
		wantErr      string
	}{
		{
			name:   "empty database does not adopt baseline",
			tables: nil,
		},
		{
			name:         "legacy runtime schema adopts version one",
			tables:       legacyRuntimeTables,
			wantBaseline: uintPtr(migrationVersionInitialSchema),
		},
		{
			name:         "legacy runtime schema with app configs adopts version two",
			tables:       appConfigTables,
			wantBaseline: uintPtr(migrationVersionAppConfigs),
		},
		{
			name:         "renamed runtime schema adopts version three",
			tables:       renamedRuntimeTables,
			wantBaseline: uintPtr(migrationVersionRuntimeRename),
		},
		{
			name:    "app configs alone is rejected as partial managed state",
			tables:  []string{"app_configs"},
			wantErr: "detected partial workshop schema without migration tracking",
		},
		{
			name:    "partial legacy runtime schema is rejected",
			tables:  []string{"workspace", "workspace_member", "event", "comment"},
			wantErr: "detected partially migrated legacy runtime schema with missing tables",
		},
		{
			name:    "renamed runtime tables without app configs are rejected",
			tables:  append([]string{}, append(baseRuntimeTables, "runtime_event", "runtime_comment")...),
			wantErr: "detected partially migrated runtime schema with renamed tables but missing baseline tables or app_configs",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseline, err := legacyBaselineFromTables(tableSet(tt.tables...))
			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("expected error containing %q, got %q", tt.wantErr, err.Error())
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertUintPtrEqual(t, baseline, tt.wantBaseline)
		})
	}
}

func tableSet(tableNames ...string) map[string]bool {
	tables := make(map[string]bool, len(tableNames))
	for _, tableName := range tableNames {
		tables[tableName] = true
	}
	return tables
}

func assertUintPtrEqual(t *testing.T, got *uint, want *uint) {
	t.Helper()
	if got == nil || want == nil {
		if got != want {
			t.Fatalf("expected %v, got %v", want, got)
		}
		return
	}
	if *got != *want {
		t.Fatalf("expected %d, got %d", *want, *got)
	}
}
