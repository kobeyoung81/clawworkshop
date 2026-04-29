import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import {
  getProjectType,
  listProjectTypeVersions,
  publishProjectType,
  updateProjectType,
  validateProjectType,
  type ValidateProjectTypeResponse,
} from '../api/project-types.ts'

export function TemplateDetail() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [validationResponse, setValidationResponse] = useState<ValidateProjectTypeResponse | null>(null)
  const projectTypeQuery = useQuery({
    queryKey: ['project-type', id],
    queryFn: () => getProjectType(id),
    enabled: id !== '',
  })
  const versionsQuery = useQuery({
    queryKey: ['project-type-versions', id],
    queryFn: () => listProjectTypeVersions(id),
    enabled: id !== '',
  })

  const saveMutation = useMutation({
    mutationFn: ({
      projectTypeId,
      input,
    }: {
      projectTypeId: string
      input: {
        title?: string
        description?: string
        draftJson?: Record<string, unknown>
        expectedVersion: number
      }
    }) => updateProjectType(projectTypeId, input),
    onSuccess: async () => {
      setFormMessage('Draft saved.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-type', id] }),
        queryClient.invalidateQueries({ queryKey: ['project-types'] }),
      ])
    },
    onError: (error) => {
      setFormMessage(error instanceof ApiError ? error.message : 'Failed to save draft.')
    },
  })

  const validateMutation = useMutation({
    mutationFn: validateProjectType,
    onSuccess: (response) => {
      setValidationResponse(response)
      setFormMessage(response.result.valid ? 'Draft is valid.' : 'Draft has validation errors.')
    },
    onError: (error) => {
      setFormMessage(error instanceof ApiError ? error.message : 'Failed to validate draft.')
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({
      projectTypeId,
      expectedVersion,
    }: {
      projectTypeId: string
      expectedVersion: number
    }) => publishProjectType(projectTypeId, expectedVersion),
    onSuccess: async () => {
      setFormMessage('Published a new immutable version.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-type', id] }),
        queryClient.invalidateQueries({ queryKey: ['project-type-versions', id] }),
        queryClient.invalidateQueries({ queryKey: ['project-types'] }),
      ])
    },
    onError: (error) => {
      setFormMessage(error instanceof ApiError ? error.message : 'Failed to publish draft.')
    },
  })

  const projectType = projectTypeQuery.data

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <Link to="/templates" className="text-sm text-cw-cyan">
          ← Back to templates
        </Link>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">
          {projectType?.title ?? 'Template draft'}
        </h2>
        <p className="mt-2 text-sm text-cw-muted">
          {projectType ? `${projectType.key} · status ${projectType.status} · version ${projectType.version}` : 'Loading draft...'}
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        {projectType ? (
          <TemplateEditorForm
            key={`${projectType.id}:${projectType.version}`}
            projectType={projectType}
            formMessage={formMessage}
            savePending={saveMutation.isPending}
            validatePending={validateMutation.isPending}
            publishPending={publishMutation.isPending}
            onSave={(title, description, draftText) => {
              try {
                const draftJson = JSON.parse(draftText) as Record<string, unknown>
                setFormMessage(null)
                saveMutation.mutate({
                  projectTypeId: id,
                  input: {
                    title,
                    description,
                    draftJson,
                    expectedVersion: projectType.version,
                  },
                })
              } catch {
                setFormMessage('Draft JSON must be valid JSON.')
              }
            }}
            onValidate={() => validateMutation.mutate(projectType.id)}
            onPublish={() =>
              publishMutation.mutate({
                projectTypeId: projectType.id,
                expectedVersion: projectType.version,
              })
            }
          />
        ) : (
          <form className="space-y-6 rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="text-sm text-cw-muted">Loading draft editor...</p>
          </form>
        )}

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Validation</p>
            {validationResponse ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-cw-muted">
                  {validationResponse.result.valid ? 'Valid draft' : 'Errors found'} · highest severity{' '}
                  {validationResponse.result.highestSeverity}
                </p>
                <div className="space-y-3">
                  {validationResponse.result.findings.map((finding, index) => (
                    <article key={`${finding.path}-${index}`} className="rounded-2xl border border-cw-border bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cw-amber">{finding.code}</p>
                      <p className="mt-2 text-sm text-white">{finding.message}</p>
                      <p className="mt-1 text-xs text-cw-muted">{finding.path}</p>
                    </article>
                  ))}
                  {validationResponse.result.findings.length === 0 ? (
                    <div className="rounded-2xl border border-cw-border bg-white/5 p-4 text-sm text-cw-muted">
                      No validation findings.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-cw-muted">Run validation to inspect schema and semantic findings.</p>
            )}
          </section>

          <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Published versions</p>
            <div className="mt-4 space-y-3">
              {versionsQuery.data?.map((version) => (
                <Link
                  key={version.id}
                  to={`/templates/${id}/versions/${version.id}`}
                  className="block rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-cyan/30"
                >
                  <p className="font-medium text-white">Version {version.versionNo}</p>
                  <p className="mt-1 text-sm text-cw-muted">{version.publishedAt}</p>
                </Link>
              ))}
              {versionsQuery.data?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
                  No published versions yet.
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function TemplateEditorForm({
  projectType,
  formMessage,
  savePending,
  validatePending,
  publishPending,
  onSave,
  onValidate,
  onPublish,
}: {
  projectType: {
    id: string
    title: string
    description: string
    currentDraftJson: Record<string, unknown>
  }
  formMessage: string | null
  savePending: boolean
  validatePending: boolean
  publishPending: boolean
  onSave: (title: string, description: string, draftText: string) => void
  onValidate: () => void
  onPublish: () => void
}) {
  const [title, setTitle] = useState(projectType.title)
  const [description, setDescription] = useState(projectType.description)
  const [draftText, setDraftText] = useState(JSON.stringify(projectType.currentDraftJson, null, 2))

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(title, description, draftText)
  }

  return (
    <form className="space-y-6 rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur" onSubmit={handleSave}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-cw-muted">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-cw-muted">Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-cw-muted">current_draft_json</span>
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={24}
          className="min-h-[520px] w-full rounded-[24px] border border-cw-border bg-cw-panel-strong px-4 py-4 font-mono text-sm text-cw-text outline-none transition focus:border-cw-magenta/40"
        />
      </label>

      {formMessage ? <p className="text-sm text-amber-200">{formMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={savePending}
          className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savePending ? 'Saving...' : 'Save draft'}
        </button>
        <button
          type="button"
          disabled={validatePending}
          onClick={onValidate}
          className="inline-flex rounded-full border border-cw-amber/30 bg-cw-amber/10 px-4 py-2 text-sm font-medium text-cw-amber transition hover:bg-cw-amber/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {validatePending ? 'Validating...' : 'Validate'}
        </button>
        <button
          type="button"
          disabled={publishPending}
          onClick={onPublish}
          className="inline-flex rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-4 py-2 text-sm font-medium text-cw-magenta transition hover:bg-cw-magenta/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {publishPending ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </form>
  )
}
