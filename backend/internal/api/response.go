package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5/middleware"
)

func writeData[T any](w http.ResponseWriter, status int, payload T) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(dataEnvelope[T]{Data: payload})
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string) {
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
