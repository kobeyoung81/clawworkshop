import { apiRequest } from './client';
import type {
  ArtifactSummary,
  CreateProjectInput,
  CurrentActorResponse,
  FlowSummary,
  ProjectDetail,
  ProjectTypeSummary,
  ProjectTypeVersionSummary,
  ProjectSummary,
  TaskInboxItem,
  WorkspaceCreateInput,
  WorkspaceSummary,
} from '../types';

export function getCurrentActor(): Promise<CurrentActorResponse> {
  return apiRequest<CurrentActorResponse>('/api/v1/auth/me');
}

export function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return apiRequest<WorkspaceSummary[]>('/api/v1/workspaces');
}

export function createWorkspace(input: WorkspaceCreateInput): Promise<WorkspaceSummary> {
  return apiRequest<WorkspaceSummary>('/api/v1/workspaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listProjects(): Promise<ProjectSummary[]> {
  return apiRequest<ProjectSummary[]>('/api/v1/projects');
}

export function getProject(projectId: string): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listProjectFlows(projectId: string): Promise<FlowSummary[]> {
  return apiRequest<FlowSummary[]>(`/api/v1/projects/${projectId}/flows`);
}

export function listTaskInbox(): Promise<TaskInboxItem[]> {
  return apiRequest<TaskInboxItem[]>('/api/v1/tasks/inbox');
}

export function getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
  return apiRequest<WorkspaceSummary>(`/api/v1/workspaces/${workspaceId}`);
}

export function listWorkspaceArtifacts(workspaceId: string): Promise<ArtifactSummary[]> {
  return apiRequest<ArtifactSummary[]>(`/api/v1/workspaces/${workspaceId}/artifacts`);
}

export function listProjectTypes(): Promise<ProjectTypeSummary[]> {
  return apiRequest<ProjectTypeSummary[]>('/api/v1/project-types');
}

export function listProjectTypeVersions(projectTypeId: string): Promise<ProjectTypeVersionSummary[]> {
  return apiRequest<ProjectTypeVersionSummary[]>(`/api/v1/project-types/${projectTypeId}/versions`);
}
