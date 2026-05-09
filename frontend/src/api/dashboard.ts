import { apiRequest } from './client';
import type {
  CurrentActorResponse,
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

export function listTaskInbox(): Promise<TaskInboxItem[]> {
  return apiRequest<TaskInboxItem[]>('/api/v1/tasks/inbox');
}
