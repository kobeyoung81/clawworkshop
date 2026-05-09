package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"log"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
	"github.com/supremelosclaws/clawworkshop/backend/internal/db"
)

func main() {
	command := flag.String("command", "up", "migration command: up, down, version")
	steps := flag.Int("steps", 0, "number of down steps to apply when command=down")
	flag.Parse()

	cfg := config.LoadInitial()

	dsn := cfg.MySQL.ConnectionString()
	if dsn == "" {
		log.Fatal("DB_DSN is required to run migrations")
	}

	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	ctx := context.Background()

	switch *command {
	case "up":
		if err := db.EnsureMigrations(ctx, sqlDB); err != nil {
			log.Fatal(err)
		}
		log.Printf("migration command %q completed\n", *command)
		return
	case "down":
		m, err := db.OpenMigrator(sqlDB)
		if err != nil {
			log.Fatal(err)
		}
		defer func() {
			_, _ = m.Close()
		}()
		status, err := db.CurrentMigrationStatus(ctx, sqlDB)
		if err != nil {
			log.Fatal(err)
		}
		if status.Version == nil {
			log.Fatal("database has no recorded migration version; run command=up once to adopt or initialize migration tracking before using down")
		}
		if *steps > 0 {
			err = m.Steps(-*steps)
		} else {
			err = m.Down()
		}
	case "version":
		status, err := db.CurrentMigrationStatus(ctx, sqlDB)
		if err != nil {
			log.Fatal(err)
		}
		if status.Version == nil {
			if status.LegacyBaseline != nil {
				log.Printf("version: none (legacy schema detected; startup or command=up will adopt baseline %d)\n", *status.LegacyBaseline)
				return
			}
			log.Println("version: none")
			return
		}
		log.Printf("version: %d dirty=%t\n", *status.Version, status.Dirty)
		return
	default:
		log.Fatalf("unsupported command %q", *command)
	}

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatal(err)
	}

	log.Printf("migration command %q completed\n", *command)
}
