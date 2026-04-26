package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/supremelosclaws/clawworkshop/backend/internal/api"
	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
	"github.com/supremelosclaws/clawworkshop/backend/internal/db"
	"github.com/supremelosclaws/clawworkshop/backend/internal/observability"
	runtimeengine "github.com/supremelosclaws/clawworkshop/backend/internal/runtime"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("service exited", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.LoadInitial()

	logger := observability.NewLogger(cfg.Environment)
	slog.SetDefault(logger)

	database, err := db.Open(cfg.MySQL)
	if err != nil {
		return err
	}
	defer database.Close()

	if database.Ready && database.Gorm != nil {
		if err := config.EnsureBootstrapSchema(database.Gorm); err != nil {
			return err
		}
		if err := config.SeedDefaults(database.Gorm, cfg); err != nil {
			return err
		}
		if err := cfg.LoadFromDB(database.Gorm); err != nil {
			return err
		}

		logger = observability.NewLogger(cfg.Environment)
		slog.SetDefault(logger)
	}

	repositories := store.New(database.Gorm)
	authenticator := auth.NewMiddleware(auth.NewTokenValidator(cfg.Auth), logger)
	authorizer := auth.NewAuthorizer(repositories)
	runtimeService := runtimeengine.NewService(repositories)

	router := api.NewRouter(api.Dependencies{
		Config:     cfg,
		Logger:     logger,
		DB:         database,
		Store:      repositories,
		Auth:       authenticator,
		Authorizer: authorizer,
		Runtime:    runtimeService,
	})

	server := &http.Server{
		Addr:              cfg.HTTP.Address,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("http server listening", "addr", cfg.HTTP.Address, "env", cfg.Environment)
		if serveErr := server.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- serveErr
		}
	}()

	stopCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-errCh:
		return err
	case <-stopCtx.Done():
		logger.Info("shutdown requested")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	return server.Shutdown(shutdownCtx)
}
