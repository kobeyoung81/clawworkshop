package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
)

type Connection struct {
	Gorm       *gorm.DB
	SQL        *sql.DB
	Ready      bool
	ReadyError string
}

func Open(cfg config.MySQLConfig, log *slog.Logger) (*Connection, error) {
	dsn := cfg.ConnectionString()
	if dsn == "" {
		log.Warn("mysql configuration missing; readiness will remain false")
		return &Connection{
			Ready:      false,
			ReadyError: "mysql configuration is incomplete",
		}, nil
	}

	gormDB, err := gorm.Open(mysqlDriver.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		if cfg.Required {
			return nil, fmt.Errorf("open mysql: %w", err)
		}

		log.Warn("mysql unavailable during startup", "error", err)
		return &Connection{
			Ready:      false,
			ReadyError: err.Error(),
		}, nil
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("extract sql db: %w", err)
	}

	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(25)

	if err := sqlDB.Ping(); err != nil {
		if cfg.Required {
			return nil, fmt.Errorf("ping mysql: %w", err)
		}

		log.Warn("mysql ping failed during startup", "error", err)
		return &Connection{
			Gorm:       gormDB,
			SQL:        sqlDB,
			Ready:      false,
			ReadyError: err.Error(),
		}, nil
	}

	return &Connection{
		Gorm:  gormDB,
		SQL:   sqlDB,
		Ready: true,
	}, nil
}

func (c *Connection) Close() {
	if c == nil || c.SQL == nil {
		return
	}

	_ = c.SQL.Close()
}
