package api

import (
	"fmt"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
)

func NewRouter(deps Dependencies) http.Handler {
	router := chi.NewRouter()

	router.Use(chimiddleware.RequestID)
	router.Use(chimiddleware.RealIP)
	router.Use(chimiddleware.Timeout(60 * time.Second))
	router.Use(limitRequestBody(deps.Config.HTTP.MaxBodyBytes))
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   deps.Config.HTTP.AllowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "If-Match", "X-Requested-With"},
		ExposedHeaders:   []string{"ETag"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	if deps.Auth != nil {
		router.Use(deps.Auth.Optional)
	}
	router.Use(requestLogger(deps))
	router.Use(recoverer(deps))

	router.Get("/healthz", deps.handleHealth)
	router.Get("/readyz", deps.handleReady)
	router.Get("/api/stats", deps.handleDistrictStats)

	router.Route("/api/v1", func(r chi.Router) {
		r.Get("/config", deps.handlePublicConfig)
		if deps.Auth != nil {
			r.With(deps.Auth.Require).Get("/auth/me", deps.handleCurrentActor)
			r.With(deps.Auth.Require).Route("/workspaces", func(workspaces chi.Router) {
				workspaces.Get("/", deps.handleListWorkspaces)
				workspaces.Post("/", deps.handleCreateWorkspace)
				workspaces.Get("/{id}", deps.handleGetWorkspace)
				workspaces.Get("/{id}/members", deps.handleListWorkspaceMembers)
				workspaces.Post("/{id}/members", deps.handleCreateWorkspaceMember)
				workspaces.Patch("/{id}/members/{memberId}", deps.handleUpdateWorkspaceMember)
			})
			r.With(deps.Auth.Require).Route("/project-types", func(projectTypes chi.Router) {
				projectTypes.Get("/", deps.handleListProjectTypes)
				projectTypes.Post("/", deps.handleCreateProjectType)
				projectTypes.Get("/{id}", deps.handleGetProjectType)
				projectTypes.Patch("/{id}", deps.handleUpdateProjectType)
				projectTypes.Post("/{id}/validate", deps.handleValidateProjectType)
				projectTypes.Post("/{id}/publish", deps.handlePublishProjectType)
				projectTypes.Get("/{id}/versions", deps.handleListProjectTypeVersions)
				projectTypes.Get("/{id}/versions/{versionId}", deps.handleGetProjectTypeVersion)
			})
			r.With(deps.Auth.Require).Route("/projects", func(projects chi.Router) {
				projects.Get("/", deps.handleListProjects)
				projects.Post("/", deps.handleCreateProject)
				projects.Get("/{id}", deps.handleGetProject)
				projects.Patch("/{id}", deps.handleUpdateProject)
				projects.Post("/{id}/workflows/{workflowId}/start", deps.handleStartFlow)
				projects.Get("/{id}/flows", deps.handleListProjectFlows)
			})
			r.With(deps.Auth.Require).Get("/flows/{id}", deps.handleGetFlow)
			r.With(deps.Auth.Require).Route("/tasks", func(tasks chi.Router) {
				tasks.Get("/inbox", deps.handleTaskInbox)
				tasks.Get("/{id}", deps.handleGetTask)
				tasks.Post("/{id}/assign", deps.handleAssignTask)
				tasks.Post("/{id}/claim", deps.handleClaimTask)
				tasks.Post("/{id}/release", deps.handleReleaseTask)
				tasks.Post("/{id}/complete", deps.handleCompleteTask)
				tasks.Post("/{id}/review", deps.handleReviewTask)
				tasks.Post("/{id}/feedback", deps.handleFeedbackTask)
			})
			r.With(deps.Auth.Require).Get("/artifacts/{id}", deps.handleGetArtifact)
			r.With(deps.Auth.Require).Post("/artifacts/{id}/revisions", deps.handleCreateArtifactRevision)
			r.With(deps.Auth.Require).Get("/events", deps.handleListEvents)
			r.With(deps.Auth.Require).Put("/events/cursors/{feedName}", deps.handleUpdateEventCursor)
		}
	})

	return router
}

func requestLogger(deps Dependencies) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			started := time.Now()
			ww := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			deps.Logger.Info("http request completed",
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"duration_ms", time.Since(started).Milliseconds(),
				"request_id", chimiddleware.GetReqID(r.Context()),
				"actor_id", actorIDFromContext(r),
				"actor_type", actorTypeFromContext(r),
			)
		})
	}
}

func recoverer(deps Dependencies) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					deps.Logger.Error("panic recovered",
						"request_id", chimiddleware.GetReqID(r.Context()),
						"panic", fmt.Sprint(rec),
						"stack", string(debug.Stack()),
					)
					writeError(w, r, http.StatusInternalServerError, "internal_error", "An unexpected error occurred.")
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

func actorIDFromContext(r *http.Request) string {
	actor, ok := auth.ActorFromContext(r.Context())
	if !ok {
		return ""
	}

	return actor.ID
}

func actorTypeFromContext(r *http.Request) string {
	actor, ok := auth.ActorFromContext(r.Context())
	if !ok {
		return ""
	}

	return string(actor.SubjectType)
}

func limitRequestBody(maxBytes int64) func(http.Handler) http.Handler {
	if maxBytes <= 0 {
		return func(next http.Handler) http.Handler { return next }
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodPost, http.MethodPut, http.MethodPatch:
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}

			next.ServeHTTP(w, r)
		})
	}
}
