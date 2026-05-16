import { apiRequest } from './client';
import type {
  ArtifactSummary,
  CompleteTaskInput,
  CreateProjectInput,
  CurrentActorResponse,
  FeedbackTaskInput,
  FlowSummary,
  ProjectDetail,
  ProjectTypeSummary,
  ProjectTypeVersionSummary,
  ReviewTaskInput,
  StartFlowInput,
  TaskDetail,
  ProjectSummary,
  TaskSummary,
  TaskInboxItem,
  TaskVersionInput,
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

export function startFlow(input: StartFlowInput): Promise<FlowSummary> {
  return apiRequest<FlowSummary>(`/api/v1/projects/${input.projectId}/workflows/${input.workflowId}/start`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: input.expectedVersion }),
  });
}

export function getTask(taskId: string): Promise<TaskDetail> {
  return apiRequest<TaskDetail>(`/api/v1/tasks/${taskId}`);
}

export function claimTask(input: TaskVersionInput): Promise<TaskSummary> {
  return apiRequest<TaskSummary>(`/api/v1/tasks/${input.taskId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: input.expectedVersion }),
  });
}

export function releaseTask(input: TaskVersionInput): Promise<TaskSummary> {
  return apiRequest<TaskSummary>(`/api/v1/tasks/${input.taskId}/release`, {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: input.expectedVersion }),
  });
}

export function completeTask(input: CompleteTaskInput): Promise<TaskSummary> {
  return apiRequest<TaskSummary>(`/api/v1/tasks/${input.taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: input.expectedVersion,
      outputs: input.outputs,
    }),
  });
}

export function reviewTask(input: ReviewTaskInput): Promise<TaskSummary> {
  return apiRequest<TaskSummary>(`/api/v1/tasks/${input.taskId}/review`, {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: input.expectedVersion,
      expectedSessionVersion: input.expectedSessionVersion,
      outcome: input.outcome,
      comment: input.comment,
    }),
  });
}

export function feedbackTask(input: FeedbackTaskInput): Promise<TaskSummary> {
  return apiRequest<TaskSummary>(`/api/v1/tasks/${input.taskId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: input.expectedVersion,
      expectedSessionVersion: input.expectedSessionVersion,
      summary: input.summary,
      body: input.body,
    }),
  });
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
