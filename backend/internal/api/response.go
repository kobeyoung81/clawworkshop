package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5/middleware"
)

type loggerContextKey struct{}

func writeData[T any](w http.ResponseWriter, status int, payload T) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(dataEnvelope[T]{Data: payload})
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string) {
	if status >= http.StatusInternalServerError {
		if logger := loggerFromContext(r.Context()); logger != nil {
			logger.Error("http request failed",
				"status", status,
				"code", code,
				"message", message,
				"actor_id", actorIDFromContext(r),
				"actor_type", actorTypeFromContext(r),
			)
		}
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorEnvelope{
		Error: apiError{
			Code:      code,
			Message:   message,
			RequestID: middleware.GetReqID(r.Context()),
		},
	})
}

func withLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerContextKey{}, logger)
}

func loggerFromContext(ctx context.Context) *slog.Logger {
	logger, _ := ctx.Value(loggerContextKey{}).(*slog.Logger)
	return logger
}
