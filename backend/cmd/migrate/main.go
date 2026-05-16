package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
	"github.com/supremelosclaws/clawworkshop/backend/internal/db"
)

func main() {
	commandFlag := flag.String("command", "", "migration command: up, down, version, status")
	steps := flag.Int("steps", 0, "number of down steps to apply when command=down")
	flag.Parse()

	command, err := resolveCommand(*commandFlag, flag.Args())
	if err != nil {
		log.Fatal(err)
	}
	if *steps < 0 {
		log.Fatal("steps must be >= 0")
	}

	cfg := config.LoadInitial()

	dsn := cfg.MySQL.ConnectionString()
	if dsn == "" {
		log.Fatal("DB_DSN is required to run migrations")
	}

	ctx := context.Background()

	switch command {
	case "up":
		if err := db.EnsureMigrations(ctx, dsn); err != nil {
			log.Fatal(err)
		}
		log.Printf("migration command %q completed\n", command)
		return
	case "down":
		m, migrationDB, err := db.OpenMigrator(dsn)
		if err != nil {
			log.Fatal(err)
		}
		defer func() {
			_, _ = m.Close()
			_ = migrationDB.Close()
		}()
		status, err := db.CurrentMigrationStatus(ctx, dsn)
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
		if err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatal(err)
		}
		log.Printf("migration command %q completed\n", command)
		return
	case "version", "status":
		status, err := db.CurrentMigrationStatus(ctx, dsn)
		if err != nil {
			log.Fatal(err)
		}
		logMigrationStatus(command, status)
		return
	default:
		log.Fatalf("unsupported command %q", command)
	}
}

func resolveCommand(commandFlag string, args []string) (string, error) {
	commandFlag = strings.TrimSpace(commandFlag)
	if len(args) == 0 {
		if commandFlag == "" {
			return "up", nil
		}
		return commandFlag, nil
	}

	commandArg := strings.TrimSpace(args[0])
	if commandArg == "" {
		return "", errors.New("migration command cannot be empty")
	}
	if len(args) > 1 {
		return "", errors.New("unexpected extra arguments after migration command")
	}
	if commandFlag != "" && commandFlag != commandArg {
		return "", errors.New("received conflicting migration commands from positional argument and -command flag")
	}
	if commandFlag != "" {
		return commandFlag, nil
	}
	return commandArg, nil
}

func logMigrationStatus(command string, status db.MigrationStatus) {
	if status.Version == nil {
		if status.LegacyBaseline != nil {
			if command == "status" {
				log.Printf("status: version=none adoptableBaseline=%d\n", *status.LegacyBaseline)
				return
			}
			log.Printf("version: none (existing schema detected; startup or command=up will adopt baseline %d)\n", *status.LegacyBaseline)
			return
		}
		if command == "status" {
			log.Println("status: version=none")
			return
		}
		log.Println("version: none")
		return
	}
	if command == "status" {
		log.Printf("status: version=%d dirty=%t\n", *status.Version, status.Dirty)
		return
	}
	log.Printf("version: %d dirty=%t\n", *status.Version, status.Dirty)
}
