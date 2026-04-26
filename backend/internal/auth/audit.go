package auth

import "context"

type AuditActor struct {
	ID          string `json:"id"`
	SubjectType string `json:"subjectType"`
}

func AuditActorFromContext(ctx context.Context) (AuditActor, bool) {
	actor, ok := ActorFromContext(ctx)
	if !ok {
		return AuditActor{}, false
	}

	return AuditActorFromActor(*actor), true
}

func AuditActorFromActor(actor Actor) AuditActor {
	return AuditActor{
		ID:          actor.ID,
		SubjectType: string(actor.SubjectType),
	}
}
