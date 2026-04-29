import { fetchJson } from './http.ts'

export interface ProjectParticipant {
  id: string
  subjectId: string
  subjectType: string
  role: string
  status: string
}

export interface Project {
  id: string
  workspaceId: string
  projectTypeId?: string
  projectTypeVersionId: string
  name: string
  description: string
  status: string
  version: number
  parameterValuesJson: Record<string, unknown> | null
  templateWorkflowKeys: string[]
  actorProjectRole?: string
  participants: ProjectParticipant[]
}

export interface Task {
  id: string
  flowId: string
  nodeKey: string
  nodeKind: string
  title: string
  description?: string
  role?: string
  prompt?: string
  status: string
  claimOwnerId?: string
  currentAssignmentId?: string
  currentReviewSessionId?: string
  currentFeedbackSessionId?: string
  version: number
  reads: string[]
  writes: string[]
}

export interface Flow {
  id: string
  projectId: string
  workflowKey: string
  flowSequence: number
  status: string
  blockedReason: string
  version: number
  tasks?: Task[]
}

export interface Assignment {
  id: string
  assigneeId: string
  assigneeType: string
  source: string
  status: string
  version: number
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface ReviewDecision {
  id: string
  reviewerId: string
  outcome: string
  commentBody: string
  createdAt: string
}

export interface ReviewSession {
  id: string
  status: string
  outcome?: string
  version: number
  resolvedAt?: string
  decisions: ReviewDecision[]
}

export interface FeedbackEntry {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface FeedbackSession {
  id: string
  status: string
  summary?: string
  version: number
  resolvedAt?: string
  entries: FeedbackEntry[]
}

export interface ArtifactRevision {
  id: string
  revisionNo: number
  contentKind: string
  mimeType: string
  byteSize: number
  checksumSha256?: string
  createdBy: string
  baseRevisionNo: number
  createdAt: string
  bodyText?: string
  bodyJson?: Record<string, unknown>
  bodyBase64?: string
}

export interface Artifact {
  id: string
  projectId: string
  artifactKey: string
  scopeType: string
  scopeRef: string
  currentRevisionNo: number
  version: number
  currentRevision?: ArtifactRevision
  revisions: ArtifactRevision[]
}

export interface TaskDetail {
  task: Task
  projectId: string
  workflowKey: string
  flowSequence: number
  assignments: Assignment[]
  artifacts: Artifact[]
  reviewSession?: ReviewSession
  feedbackSession?: FeedbackSession
}

export interface TaskInboxItem {
  projectId: string
  projectName: string
  workspaceId: string
  workflowKey: string
  flowSequence: number
  actorProjectRole?: string
  task: Task
}

export interface RuntimeEvent {
  id: string
  seq: number
  workspaceId: string
  projectId?: string
  flowId?: string
  topic: string
  subjectType: string
  subjectId: string
  subjectVersion: number
  actorId: string
  payloadJson: Record<string, unknown> | null
  createdAt: string
}

export interface NotificationCursor {
  feedName: string
  lastSeenSeq: number
  updatedAt: string
}

export interface CreateProjectInput {
  workspaceId: string
  projectTypeVersionId: string
  name: string
  description: string
}

export interface StartFlowInput {
  expectedVersion: number
}

export interface ReviewTaskInput {
  expectedVersion: number
  expectedSessionVersion: number
  outcome: 'approved' | 'revise'
  comment: string
}

export interface FeedbackTaskInput {
  expectedVersion: number
  expectedSessionVersion: number
  summary: string
  body: string
}

export interface ArtifactWriteInput {
  artifactKey: string
  contentKind: string
  mimeType: string
  bodyText?: string
  bodyJson?: Record<string, unknown>
  bodyBase64?: string
  baseRevisionNo?: number
}

export interface CreateArtifactRevisionInput {
  expectedVersion: number
  contentKind: string
  mimeType: string
  bodyText?: string
  bodyJson?: Record<string, unknown>
  bodyBase64?: string
  baseRevisionNo?: number
}

export interface EventListParams {
  workspaceId?: string
  projectId?: string
  flowId?: string
  sinceSeq?: number
  limit?: number
  order?: 'asc' | 'desc'
}

export async function listProjects() {
  const response = await fetchJson<{ data: Project[] }>('/api/v1/projects')
  return response.data
}

export async function createProject(input: CreateProjectInput) {
  const response = await fetchJson<{ data: Project }>('/api/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getProject(projectId: string) {
  const response = await fetchJson<{ data: Project }>(`/api/v1/projects/${projectId}`)
  return response.data
}

export async function listProjectFlows(projectId: string) {
  const response = await fetchJson<{ data: Flow[] }>(`/api/v1/projects/${projectId}/flows`)
  return response.data
}

export async function startFlow(projectId: string, workflowId: string, input: StartFlowInput) {
  const response = await fetchJson<{ data: Flow }>(`/api/v1/projects/${projectId}/workflows/${workflowId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getFlow(flowId: string) {
  const response = await fetchJson<{ data: Flow }>(`/api/v1/flows/${flowId}`)
  return response.data
}

export async function getTask(taskId: string) {
  const response = await fetchJson<{ data: TaskDetail }>(`/api/v1/tasks/${taskId}`)
  return response.data
}

export async function listTaskInbox(status?: string[], limit = 50) {
  const query = new URLSearchParams()
  if (status && status.length > 0) {
    query.set('status', status.join(','))
  }
  query.set('limit', String(limit))

  const response = await fetchJson<{ data: TaskInboxItem[] }>(`/api/v1/tasks/inbox?${query.toString()}`)
  return response.data
}

export async function claimTask(taskId: string, expectedVersion: number) {
  const response = await fetchJson<{ data: Task }>(`/api/v1/tasks/${taskId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion }),
  })
  return response.data
}

export async function releaseTask(taskId: string, expectedVersion: number) {
  const response = await fetchJson<{ data: Task }>(`/api/v1/tasks/${taskId}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion }),
  })
  return response.data
}

export async function completeTask(taskId: string, expectedVersion: number, outputs: ArtifactWriteInput[]) {
  const response = await fetchJson<{ data: Task }>(`/api/v1/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion, outputs }),
  })
  return response.data
}

export async function reviewTask(taskId: string, input: ReviewTaskInput) {
  const response = await fetchJson<{ data: Task }>(`/api/v1/tasks/${taskId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function feedbackTask(taskId: string, input: FeedbackTaskInput) {
  const response = await fetchJson<{ data: Task }>(`/api/v1/tasks/${taskId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getArtifact(artifactId: string) {
  const response = await fetchJson<{ data: Artifact }>(`/api/v1/artifacts/${artifactId}`)
  return response.data
}

export async function createArtifactRevision(artifactId: string, input: CreateArtifactRevisionInput) {
  const response = await fetchJson<{ data: Artifact }>(`/api/v1/artifacts/${artifactId}/revisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function listEvents(params: EventListParams = {}) {
  const query = new URLSearchParams()
  if (params.workspaceId) {
    query.set('workspaceId', params.workspaceId)
  }
  if (params.projectId) {
    query.set('projectId', params.projectId)
  }
  if (params.flowId) {
    query.set('flowId', params.flowId)
  }
  if (typeof params.sinceSeq === 'number') {
    query.set('sinceSeq', String(params.sinceSeq))
  }
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (params.order) {
    query.set('order', params.order)
  }

  const suffix = query.toString() === '' ? '' : `?${query.toString()}`
  const response = await fetchJson<{ data: RuntimeEvent[] }>(`/api/v1/events${suffix}`)
  return response.data
}

export async function updateEventCursor(feedName: string, lastSeenSeq: number) {
  const response = await fetchJson<{ data: NotificationCursor }>(`/api/v1/events/cursors/${feedName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastSeenSeq }),
  })
  return response.data
}
