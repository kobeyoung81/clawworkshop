import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import { createProjectType, listProjectTypes } from '../api/project-types.ts'
import { listWorkspaces } from '../api/workspaces.ts'

export function TemplatesPage() {
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceId] = useState('')
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })
  const projectTypesQuery = useQuery({
    queryKey: ['project-types'],
    queryFn: listProjectTypes,
  })
  const createProjectTypeMutation = useMutation({
    mutationFn: createProjectType,
    onSuccess: () => {
      setKey('')
      setTitle('')
      setDescription('')
      setFormError(null)
      void queryClient.invalidateQueries({ queryKey: ['project-types'] })
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to create template draft.')
    },
  })

  const authoringWorkspaces = useMemo(
    () => (workspacesQuery.data ?? []).filter((workspace) => workspace.actorRole !== 'viewer'),
    [workspacesQuery.data],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspaceId) {
      setFormError('Select a workspace first.')
      return
    }

    setFormError(null)
    createProjectTypeMutation.mutate({
      workspaceId,
      key,
      title,
      description,
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_400px]">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Authoring surface</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">Template registry</h2>
        <p className="mt-3 text-sm text-cw-muted">
          Open drafts, then validate and publish immutable versions from the detail editor.
        </p>

        <div className="mt-6 space-y-3">
          {projectTypesQuery.data?.map((projectType) => (
            <Link
              key={projectType.id}
              to={`/templates/${projectType.id}`}
              className="flex items-center justify-between rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-magenta/40"
            >
              <div>
                <p className="font-display text-lg font-medium text-white">{projectType.title}</p>
                <p className="text-sm text-cw-muted">
                  {projectType.key} · v{projectType.version}
                </p>
              </div>
              <span className="rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cw-cyan">
                {projectType.status}
              </span>
            </Link>
          ))}
          {projectTypesQuery.isLoading ? (
            <div className="rounded-2xl border border-cw-border bg-white/5 px-4 py-6 text-sm text-cw-muted">
              Loading templates...
            </div>
          ) : null}
          {projectTypesQuery.data?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
              No template drafts yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">New draft</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Workspace</span>
            <select
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
            >
              <option value="">Select workspace</option>
              {authoringWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Key</span>
            <input
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              placeholder="product_discovery_project"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              placeholder="Product Discovery Project"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              placeholder="Describe the draft intent..."
            />
          </label>
          {formError ? <p className="text-sm text-amber-200">{formError}</p> : null}
          <button
            type="submit"
            disabled={createProjectTypeMutation.isPending}
            className="inline-flex rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-4 py-2 text-sm font-medium text-cw-magenta transition hover:bg-cw-magenta/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createProjectTypeMutation.isPending ? 'Creating...' : 'Create draft'}
          </button>
        </form>
      </section>
    </div>
  )
}
