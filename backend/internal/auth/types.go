package auth

import "github.com/golang-jwt/jwt/v5"

type SubjectType string

const (
	SubjectTypeHuman SubjectType = "human"
	SubjectTypeAgent SubjectType = "agent"
)

type Actor struct {
	ID          string      `json:"id"`
	SubjectType SubjectType `json:"subjectType"`
	Name        string      `json:"name,omitempty"`
	Email       string      `json:"email,omitempty"`
	Roles       []string    `json:"roles,omitempty"`
	AuthSource  string      `json:"authSource,omitempty"`
}

type Claims struct {
	jwt.RegisteredClaims
	SubjectType       string   `json:"subject_type"`
	ActorType         string   `json:"actor_type"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	PreferredUsername string   `json:"preferred_username"`
	Roles             []string `json:"roles"`
}

func (c Claims) ToActor(source string) *Actor {
	subjectType := c.SubjectType
	if subjectType == "" {
		subjectType = c.ActorType
	}
	if subjectType == "" {
		subjectType = string(SubjectTypeHuman)
	}

	name := c.Name
	if name == "" {
		name = c.PreferredUsername
	}
	if name == "" {
		name = c.Subject
	}

	return &Actor{
		ID:          c.Subject,
		SubjectType: SubjectType(subjectType),
		Name:        name,
		Email:       c.Email,
		Roles:       c.Roles,
		AuthSource:  source,
	}
}
