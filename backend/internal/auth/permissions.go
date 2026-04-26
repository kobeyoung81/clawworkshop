package auth

type WorkspaceRole string
type ProjectRole string

const (
	WorkspaceRoleOwner  WorkspaceRole = "owner"
	WorkspaceRoleAdmin  WorkspaceRole = "admin"
	WorkspaceRoleMember WorkspaceRole = "member"
	WorkspaceRoleViewer WorkspaceRole = "viewer"

	ProjectRoleMaintainer ProjectRole = "maintainer"
	ProjectRoleWorker     ProjectRole = "worker"
	ProjectRoleReviewer   ProjectRole = "reviewer"
	ProjectRoleObserver   ProjectRole = "observer"
)

func CanReadWorkspace(role WorkspaceRole) bool {
	switch role {
	case WorkspaceRoleOwner, WorkspaceRoleAdmin, WorkspaceRoleMember, WorkspaceRoleViewer:
		return true
	default:
		return false
	}
}

func CanManageWorkspace(role WorkspaceRole) bool {
	return role == WorkspaceRoleOwner || role == WorkspaceRoleAdmin
}

func CanManageMembership(role WorkspaceRole) bool {
	return role == WorkspaceRoleOwner || role == WorkspaceRoleAdmin
}

func CanAuthorTemplates(role WorkspaceRole) bool {
	return role == WorkspaceRoleOwner || role == WorkspaceRoleAdmin || role == WorkspaceRoleMember
}

func CanCreateProjects(role WorkspaceRole) bool {
	return role == WorkspaceRoleOwner || role == WorkspaceRoleAdmin || role == WorkspaceRoleMember
}

func CanReadProject(role ProjectRole) bool {
	switch role {
	case ProjectRoleMaintainer, ProjectRoleWorker, ProjectRoleReviewer, ProjectRoleObserver:
		return true
	default:
		return false
	}
}

func CanManageProject(role ProjectRole) bool {
	return role == ProjectRoleMaintainer
}

func CanPerformWork(role ProjectRole) bool {
	return role == ProjectRoleMaintainer || role == ProjectRoleWorker
}

func CanReviewWork(role ProjectRole) bool {
	return role == ProjectRoleMaintainer || role == ProjectRoleReviewer
}
