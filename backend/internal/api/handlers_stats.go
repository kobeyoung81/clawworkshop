package api

import (
	"encoding/json"
	"net/http"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

type districtStatsResponse struct {
	District string           `json:"district"`
	Status   string           `json:"status"`
	Stats    districtCounters `json:"stats"`
}

type districtCounters struct {
	Workspaces    int64 `json:"workspaces"`
	ProjectTypes  int64 `json:"projectTypes"`
	Projects      int64 `json:"projects"`
	Flows         int64 `json:"flows"`
	Tasks         int64 `json:"tasks"`
	ArtifactCount int64 `json:"artifacts"`
}

func (d Dependencies) handleDistrictStats(w http.ResponseWriter, r *http.Request) {
	response := districtStatsResponse{
		District: "workshop",
		Status:   "online",
	}

	if !databaseReady(d) {
		response.Status = "offline"
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(response)
		return
	}

	counts := []struct {
		model  any
		target *int64
	}{
		{model: &models.Workspace{}, target: &response.Stats.Workspaces},
		{model: &models.ProjectType{}, target: &response.Stats.ProjectTypes},
		{model: &models.Project{}, target: &response.Stats.Projects},
		{model: &models.Flow{}, target: &response.Stats.Flows},
		{model: &models.Task{}, target: &response.Stats.Tasks},
		{model: &models.ArtifactInstance{}, target: &response.Stats.ArtifactCount},
	}
	for _, count := range counts {
		if err := d.Store.DB.WithContext(r.Context()).Model(count.model).Count(count.target).Error; err != nil {
			writeError(w, r, http.StatusInternalServerError, "stats_query_failed", "Failed to load district stats.")
			return
		}
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}
