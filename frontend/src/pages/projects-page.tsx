import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import { listProjectTypeVersions, listProjectTypes } from '../api/project-types.ts'
import { createProject, listProjects } from '../api/runtime.ts'
import { listWorkspaces } from '../api/workspaces.ts'

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [workspaceId, setWorkspaceId] = useState('')
  const [projectTypeId, setProjectTypeId] = useState('')
  const [projectTypeVersionId, setProjectTypeVersionId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })
  const projectTypesQuery = useQuery({
    queryKey: ['project-types'],
    queryFn: listProjectTypes,
  })
  const versionsQuery = useQuery({
    queryKey: ['project-type-versions', projectTypeId],
    queryFn: () => listProjectTypeVersions(projectTypeId),
    enabled: projectTypeId !== '',
  })

  useEffect(() => {
    if (workspaceId === '' && workspacesQuery.data && workspacesQuery.data.length > 0) {
      setWorkspaceId(workspacesQuery.data[0].id)
    }
  }, [workspaceId, workspacesQuery.data])

  const filteredProjectTypes = useMemo(() => {
    if (!projectTypesQuery.data) {
      return []
    }
    if (workspaceId === '') {
      return projectTypesQuery.data
    }
    return projectTypesQuery.data.filter((projectType) => projectType.workspaceId === workspaceId)
  }, [projectTypesQuery.data, workspaceId])

  useEffect(() => {
    if (filteredProjectTypes.length === 0) {
      setProjectTypeId('')
      return
    }
    const stillSelected = filteredProjectTypes.some((projectType) => projectType.id === projectTypeId)
    if (!stillSelected) {
      setProjectTypeId(filteredProjectTypes[0].id)
    }
  }, [filteredProjectTypes, projectTypeId])

  useEffect(() => {
    if (!versionsQuery.data || versionsQuery.data.length === 0) {
      setProjectTypeVersionId('')
      return
    }
    const stillSelected = versionsQuery.data.some((version) => version.id === projectTypeVersionId)
    if (!stillSelected) {
      setProjectTypeVersionId(versionsQuery.data[versionsQuery.data.length - 1].id)
    }
  }, [projectTypeVersionId, versionsQuery.data])

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      setName('')
      setDescription('')
      setFormMessage('Project created from the selected published version.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['project', project.id] }),
      ])
    },
    onError: (error) => {
      setFormMessage(error instanceof ApiError ? error.message : 'Failed to create project.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage(null)
    createProjectMutation.mutate({
      workspaceId,
      projectTypeVersionId,
      name,
      description,
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Runtime surface</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">Projects from published versions</h2>
        <p className="mt-3 text-sm text-cw-muted">
          Launch new projects from immutable template versions and inspect active flow orchestration.
        </p>

        <div className="mt-6 space-y-3">
          {projectsQuery.data?.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-cyan/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-medium text-white">{project.name}</p>
                  <p className="mt-1 text-sm text-cw-muted">
                    {project.status} · {project.templateWorkflowKeys.length} workflow
                    {project.templateWorkflowKeys.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cw-magenta">
                  {project.actorProjectRole || 'workspace'}
                </span>
              </div>
              {project.description ? <p className="mt-3 text-sm text-cw-muted">{project.description}</p> : null}
            </Link>
          ))}
          {projectsQuery.isLoading ? (
            <div className="rounded-2xl border border-cw-border bg-white/5 px-4 py-6 text-sm text-cw-muted">
              Loading projects...
            </div>
          ) : null}
          {projectsQuery.data?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
              No projects yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Create project</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Workspace</span>
            <select
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
            >
              {workspacesQuery.data?.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Template</span>
            <select
              value={projectTypeId}
              onChange={(event) => setProjectTypeId(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
            >
              {filteredProjectTypes.map((projectType) => (
                <option key={projectType.id} value={projectType.id}>
                  {projectType.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Published version</span>
            <select
              value={projectTypeVersionId}
              onChange={(event) => setProjectTypeVersionId(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
            >
              {versionsQuery.data?.map((version) => (
                <option key={version.id} value={version.id}>
                  Version {version.versionNo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Project name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              placeholder="Night market layout sprint"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              placeholder="Reference implementation using a published template snapshot."
            />
          </label>

          {versionsQuery.data?.length === 0 ? (
            <p className="text-sm text-amber-200">Select a template that already has a published version.</p>
          ) : null}
          {formMessage ? <p className="text-sm text-amber-200">{formMessage}</p> : null}

          <button
            type="submit"
            disabled={
              createProjectMutation.isPending ||
              workspaceId === '' ||
              projectTypeVersionId === '' ||
              name.trim() === ''
            }
            className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createProjectMutation.isPending ? 'Creating...' : 'Create project'}
          </button>
        </form>
      </section>
    </div>
  )
}
