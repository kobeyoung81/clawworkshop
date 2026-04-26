package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/supremelosclaws/clawworkshop/backend/internal/store"
)

type Authorizer struct {
	store *store.Store
}

func NewAuthorizer(store *store.Store) *Authorizer {
	return &Authorizer{store: store}
}

func (a *Authorizer) WorkspaceRole(ctx context.Context, workspaceID string, actor *Actor) (WorkspaceRole, error) {
	if a == nil || a.store == nil || a.store.Workspaces == nil {
		return "", ErrMembershipMissing
	}
	if actor == nil {
		return "", ErrUnauthorized
	}

	member, err := a.store.Workspaces.GetMembership(ctx, workspaceID, actor.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", ErrMembershipMissing
		}
		return "", fmt.Errorf("load workspace membership: %w", err)
	}

	return WorkspaceRole(member.Role), nil
}

func (a *Authorizer) ProjectRole(ctx context.Context, projectID string, actor *Actor) (ProjectRole, error) {
	if a == nil || a.store == nil || a.store.Projects == nil {
		return "", ErrMembershipMissing
	}
	if actor == nil {
		return "", ErrUnauthorized
	}

	participant, err := a.store.Projects.GetParticipant(ctx, projectID, actor.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", ErrMembershipMissing
		}
		return "", fmt.Errorf("load project participant: %w", err)
	}

	return ProjectRole(participant.Role), nil
}

func RequireWorkspaceRole(role WorkspaceRole, allowed func(WorkspaceRole) bool) error {
	if !allowed(role) {
		return ErrForbidden
	}

	return nil
}

func RequireProjectRole(role ProjectRole, allowed func(ProjectRole) bool) error {
	if !allowed(role) {
		return ErrForbidden
	}

	return nil
}
