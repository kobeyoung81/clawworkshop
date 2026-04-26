package api

import "net/http"

func (d Dependencies) handlePublicConfig(w http.ResponseWriter, _ *http.Request) {
	writeData(w, http.StatusOK, d.Config.Public)
}
