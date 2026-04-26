package auth

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

type Middleware struct {
	validator *TokenValidator
	logger    *slog.Logger
}

func NewMiddleware(validator *TokenValidator, logger *slog.Logger) *Middleware {
	return &Middleware{
		validator: validator,
		logger:    logger,
	}
}

func (m *Middleware) Optional(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m == nil || m.validator == nil {
			next.ServeHTTP(w, r)
			return
		}

		rawToken, source := tokenFromRequest(r, m.validator.CookieName())
		if rawToken == "" {
			next.ServeHTTP(w, r)
			return
		}

		actor, err := m.validator.ValidateToken(r.Context(), rawToken, source)
		if err != nil {
			m.logger.Warn("request authentication failed", "error", err, "path", r.URL.Path)
			writeUnauthorized(w, r, err)
			return
		}

		next.ServeHTTP(w, r.WithContext(ContextWithActor(r.Context(), actor)))
	})
}

func (m *Middleware) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m == nil || m.validator == nil || !m.validator.Enabled() {
			writeAuthError(w, http.StatusServiceUnavailable, "auth_unavailable", "Authentication is not configured.")
			return
		}

		actor, ok := ActorFromContext(r.Context())
		if !ok || actor.ID == "" {
			writeAuthError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func tokenFromRequest(r *http.Request, cookieName string) (string, string) {
	const bearerPrefix = "Bearer "

	authorization := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authorization, bearerPrefix) {
		return strings.TrimSpace(strings.TrimPrefix(authorization, bearerPrefix)), "bearer"
	}

	cookie, err := r.Cookie(cookieName)
	if err == nil && strings.TrimSpace(cookie.Value) != "" {
		return strings.TrimSpace(cookie.Value), "cookie"
	}

	return "", ""
}

func writeUnauthorized(w http.ResponseWriter, r *http.Request, err error) {
	status := http.StatusUnauthorized
	code := "unauthorized"
	message := "Authentication failed."
	if errors.Is(err, ErrAuthDisabled) {
		status = http.StatusServiceUnavailable
		code = "auth_unavailable"
		message = "Authentication is disabled."
	}

	writeAuthError(w, status, code, message)
}

func writeAuthError(w http.ResponseWriter, status int, code string, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = fmt.Fprintf(w, `{"error":{"code":%q,"message":%q}}`, code, message)
}
