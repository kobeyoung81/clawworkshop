package store

import "gorm.io/gorm"

type Store struct {
	DB           *gorm.DB
	Workspaces   *WorkspaceRepository
	Projects     *ProjectRepository
	ProjectTypes *ProjectTypeRepository
	Flows        *FlowRepository
	Artifacts    *ArtifactRepository
	Events       *EventRepository
}

func New(db *gorm.DB) *Store {
	if db == nil {
		return &Store{}
	}

	return &Store{
		DB:           db,
		Workspaces:   &WorkspaceRepository{db: db},
		Projects:     &ProjectRepository{db: db},
		ProjectTypes: &ProjectTypeRepository{db: db},
		Flows:        &FlowRepository{db: db},
		Artifacts:    &ArtifactRepository{db: db},
		Events:       &EventRepository{db: db},
	}
}
