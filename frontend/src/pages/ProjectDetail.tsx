import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import { getProject, listProjectFlows, startFlow } from '../api/runtime.ts'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [workflowId, setWorkflowId] = useState('')
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: id !== '',
  })
  const flowsQuery = useQuery({
    queryKey: ['project-flows', id],
    queryFn: () => listProjectFlows(id),
    enabled: id !== '',
  })

  const startFlowMutation = useMutation({
    mutationFn: ({ projectId, nextWorkflowId, expectedVersion }: { projectId: string; nextWorkflowId: string; expectedVersion: number }) =>
      startFlow(projectId, nextWorkflowId, { expectedVersion }),
    onSuccess: async () => {
      setFormMessage('Flow started from the published workflow snapshot.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', id] }),
        queryClient.invalidateQueries({ queryKey: ['project-flows', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-inbox'] }),
      ])
    },
    onError: (error) => {
      setFormMessage(error instanceof ApiError ? error.message : 'Failed to start flow.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedWorkflowId = projectQuery.data?.templateWorkflowKeys.includes(workflowId)
      ? workflowId
      : (projectQuery.data?.templateWorkflowKeys[0] ?? '')
    if (!projectQuery.data || selectedWorkflowId === '') {
      return
    }
    setFormMessage(null)
    startFlowMutation.mutate({
      projectId: projectQuery.data.id,
      nextWorkflowId: selectedWorkflowId,
      expectedVersion: projectQuery.data.version,
    })
  }

  const project = projectQuery.data
  const workflowOptions = project?.templateWorkflowKeys ?? []
  const selectedWorkflowId = workflowOptions.includes(workflowId) ? workflowId : (workflowOptions[0] ?? '')

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <Link to="/projects" className="text-sm text-cw-cyan">
          ← Back to projects
        </Link>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">{project?.name ?? 'Project detail'}</h2>
        <p className="mt-2 text-sm text-cw-muted">
          {project ? `${project.status} · template version ${project.projectTypeVersionId}` : 'Loading project...'}
        </p>
        {project?.description ? <p className="mt-4 max-w-3xl text-sm text-cw-muted">{project.description}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Flow runs</p>
          <div className="mt-4 space-y-3">
            {flowsQuery.data?.map((flow) => (
              <Link
                key={flow.id}
                to={`/flows/${flow.id}`}
                className="block rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-cyan/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {flow.workflowKey} · run {flow.flowSequence}
                    </p>
                    <p className="mt-1 text-sm text-cw-muted">
                      {flow.status}
                      {flow.blockedReason ? ` · ${flow.blockedReason}` : ''}
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cw-cyan">
                    v{flow.version}
                  </span>
                </div>
              </Link>
            ))}
            {flowsQuery.isLoading ? (
              <div className="rounded-2xl border border-cw-border bg-white/5 px-4 py-6 text-sm text-cw-muted">
                Loading flow runs...
              </div>
            ) : null}
            {flowsQuery.data?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
                No flow runs yet.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Start workflow</p>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm text-cw-muted">Workflow</span>
                <select
                  value={selectedWorkflowId}
                  onChange={(event) => setWorkflowId(event.target.value)}
                  className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
                >
                  {project?.templateWorkflowKeys.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              {formMessage ? <p className="text-sm text-amber-200">{formMessage}</p> : null}
              <button
                type="submit"
                disabled={startFlowMutation.isPending || !project || selectedWorkflowId === ''}
                className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {startFlowMutation.isPending ? 'Starting...' : 'Start flow'}
              </button>
            </form>
          </section>

          <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Participants</p>
            <div className="mt-4 space-y-3">
              {project?.participants.map((participant) => (
                <div key={participant.id} className="rounded-2xl border border-cw-border bg-white/5 px-4 py-3">
                  <p className="text-sm text-white">{participant.subjectId}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cw-muted">
                    {participant.subjectType} · {participant.role} · {participant.status}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
