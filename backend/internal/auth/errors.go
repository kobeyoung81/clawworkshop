package auth

import "errors"

var (
	ErrAuthDisabled      = errors.New("authentication is disabled")
	ErrTokenMissing      = errors.New("token missing")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrMembershipMissing = errors.New("membership missing")
	ErrForbidden         = errors.New("forbidden")
)
