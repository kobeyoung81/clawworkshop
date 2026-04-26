package api

import (
	"net/http"
	"time"
)

type dependencyStatus struct {
	Ready   bool   `json:"ready"`
	Message string `json:"message,omitempty"`
}

type healthResponse struct {
	Service      string                      `json:"service"`
	Environment  string                      `json:"environment"`
	Status       string                      `json:"status"`
	TimestampUTC string                      `json:"timestampUtc"`
	Dependencies map[string]dependencyStatus `json:"dependencies"`
}

func (d Dependencies) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeData(w, http.StatusOK, d.healthPayload())
}

func (d Dependencies) handleReady(w http.ResponseWriter, r *http.Request) {
	payload := d.healthPayload()
	if d.DB == nil || !d.DB.Ready {
		payload.Status = "degraded"
		writeError(w, r, http.StatusServiceUnavailable, "service_not_ready", "ClawWorkshop API is not ready yet.")
		return
	}

	writeData(w, http.StatusOK, payload)
}

func (d Dependencies) healthPayload() healthResponse {
	mysqlStatus := dependencyStatus{Ready: false}
	if d.DB != nil {
		mysqlStatus.Ready = d.DB.Ready
		mysqlStatus.Message = d.DB.ReadyError
	}

	status := "ok"
	if !mysqlStatus.Ready {
		status = "degraded"
	}

	return healthResponse{
		Service:      d.Config.ServiceName,
		Environment:  d.Config.Environment,
		Status:       status,
		TimestampUTC: time.Now().UTC().Format(time.RFC3339),
		Dependencies: map[string]dependencyStatus{
			"mysql": mysqlStatus,
		},
	}
}
