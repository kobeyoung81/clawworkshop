package api

import (
	"net/http"

	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
)

type currentActorResponse struct {
	Actor auth.Actor      `json:"actor"`
	Audit auth.AuditActor `json:"audit"`
}

func (d Dependencies) handleCurrentActor(w http.ResponseWriter, r *http.Request) {
	actor, ok := auth.ActorFromContext(r.Context())
	if !ok {
		writeError(w, r, http.StatusUnauthorized, "unauthenticated", "Authentication required.")
		return
	}

	writeData(w, http.StatusOK, currentActorResponse{
		Actor: *actor,
		Audit: auth.AuditActorFromActor(*actor),
	})
}
