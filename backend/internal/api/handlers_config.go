package api

import "net/http"

func (d Dependencies) handlePublicConfig(w http.ResponseWriter, r *http.Request) {
	publicConfig := d.Config.Public
	if databaseReady(d) {
		cfg := d.Config
		if err := cfg.LoadFromDB(d.Store.DB); err != nil {
			writeError(w, r, http.StatusInternalServerError, "config_load_failed", "Failed to load public config")
			return
		}
		publicConfig = cfg.Public
	}

	writeData(w, http.StatusOK, publicConfig)
}
