package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	migratemysql "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
)

func main() {
	command := flag.String("command", "up", "migration command: up, down, version")
	steps := flag.Int("steps", 0, "number of down steps to apply when command=down")
	dir := flag.String("dir", "migrations", "migration directory")
	flag.Parse()

	cfg := config.LoadInitial()

	dsn := cfg.MySQL.ConnectionString()
	if dsn == "" {
		log.Fatal("mysql configuration is required to run migrations")
	}

	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer sqlDB.Close()

	driver, err := migratemysql.WithInstance(sqlDB, &migratemysql.Config{})
	if err != nil {
		log.Fatal(err)
	}

	sourceURL := fmt.Sprintf("file://%s", filepath.Clean(*dir))
	m, err := migrate.NewWithDatabaseInstance(sourceURL, "mysql", driver)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		_, _ = m.Close()
	}()

	switch *command {
	case "up":
		err = m.Up()
	case "down":
		if *steps > 0 {
			err = m.Steps(-*steps)
		} else {
			err = m.Down()
		}
	case "version":
		version, dirty, versionErr := m.Version()
		if errors.Is(versionErr, migrate.ErrNilVersion) {
			log.Println("version: none")
			return
		}
		if versionErr != nil {
			log.Fatal(versionErr)
		}
		log.Printf("version: %d dirty=%t\n", version, dirty)
		return
	default:
		log.Fatalf("unsupported command %q", *command)
	}

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatal(err)
	}

	log.Printf("migration command %q completed\n", *command)
}
