import { fetchJson } from './http.ts'

export type DraftJson = Record<string, unknown>

export interface ProjectType {
  id: string
  workspaceId: string
  key: string
  title: string
  description: string
  status: string
  version: number
  currentDraftJson: DraftJson
}

export interface ValidationFinding {
  severity: string
  code: string
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  highestSeverity: string
  findings: ValidationFinding[]
}

export interface ValidateProjectTypeResponse {
  projectTypeId: string
  draftVersion: number
  result: ValidationResult
}

export interface ProjectTypeVersion {
  id: string
  projectTypeId: string
  versionNo: number
  publishedSnapshotJson: DraftJson
  summaryJson: Record<string, unknown>
  publishedBy: string
  publishedAt: string
}

export interface CreateProjectTypeInput {
  workspaceId: string
  key: string
  title: string
  description: string
  draftJson?: DraftJson
}

export interface UpdateProjectTypeInput {
  title?: string
  description?: string
  draftJson?: DraftJson
  expectedVersion: number
}

export async function listProjectTypes() {
  const response = await fetchJson<{ data: ProjectType[] }>('/api/v1/project-types')
  return response.data
}

export async function createProjectType(input: CreateProjectTypeInput) {
  const response = await fetchJson<{ data: ProjectType }>('/api/v1/project-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getProjectType(projectTypeId: string) {
  const response = await fetchJson<{ data: ProjectType }>(`/api/v1/project-types/${projectTypeId}`)
  return response.data
}

export async function updateProjectType(projectTypeId: string, input: UpdateProjectTypeInput) {
  const response = await fetchJson<{ data: ProjectType }>(`/api/v1/project-types/${projectTypeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function validateProjectType(projectTypeId: string) {
  const response = await fetchJson<{ data: ValidateProjectTypeResponse }>(
    `/api/v1/project-types/${projectTypeId}/validate`,
    {
      method: 'POST',
    },
  )
  return response.data
}

export async function publishProjectType(projectTypeId: string, expectedVersion: number) {
  const response = await fetchJson<{ data: ProjectTypeVersion }>(`/api/v1/project-types/${projectTypeId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion }),
  })
  return response.data
}

export async function listProjectTypeVersions(projectTypeId: string) {
  const response = await fetchJson<{ data: ProjectTypeVersion[] }>(`/api/v1/project-types/${projectTypeId}/versions`)
  return response.data
}

export async function getProjectTypeVersion(projectTypeId: string, versionId: string) {
  const response = await fetchJson<{ data: ProjectTypeVersion }>(
    `/api/v1/project-types/${projectTypeId}/versions/${versionId}`,
  )
  return response.data
}
