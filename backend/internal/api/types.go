package api

import (
	"log/slog"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
	"github.com/supremelosclaws/clawworkshop/backend/internal/db"
	runtimeengine "github.com/supremelosclaws/clawworkshop/backend/internal/runtime"
	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

type Dependencies struct {
	Config     config.Config
	Logger     *slog.Logger
	DB         *db.Connection
	Store      *store.Store
	Auth       *auth.Middleware
	Authorizer *auth.Authorizer
	Runtime    *runtimeengine.Service
}

type dataEnvelope[T any] struct {
	Data T `json:"data"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}
