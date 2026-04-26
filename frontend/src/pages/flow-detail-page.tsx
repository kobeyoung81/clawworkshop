import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import {
  claimTask,
  completeTask,
  createArtifactRevision,
  feedbackTask,
  getFlow,
  getTask,
  releaseTask,
  reviewTask,
} from '../api/runtime.ts'
import type { Artifact, ArtifactWriteInput } from '../api/runtime.ts'

export function FlowDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [reviewOutcome, setReviewOutcome] = useState<'approved' | 'revise'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  const [feedbackSummary, setFeedbackSummary] = useState('')
  const [feedbackBody, setFeedbackBody] = useState('')
  const [outputBodies, setOutputBodies] = useState<Record<string, string>>({})
  const [artifactDrafts, setArtifactDrafts] = useState<Record<string, string>>({})

  const flowQuery = useQuery({
    queryKey: ['flow', id],
    queryFn: () => getFlow(id),
    enabled: id !== '',
  })

  const selectedTaskId = searchParams.get('task') ?? ''
  const selectedTask = useMemo(
    () => flowQuery.data?.tasks?.find((task) => task.id === selectedTaskId) ?? flowQuery.data?.tasks?.[0],
    [flowQuery.data?.tasks, selectedTaskId],
  )

  useEffect(() => {
    if (!selectedTask && flowQuery.data?.tasks && flowQuery.data.tasks.length > 0) {
      setSearchParams({ task: flowQuery.data.tasks[0].id }, { replace: true })
      return
    }
    if (selectedTask && selectedTask.id !== selectedTaskId) {
      setSearchParams({ task: selectedTask.id }, { replace: true })
    }
  }, [flowQuery.data?.tasks, selectedTask, selectedTaskId, setSearchParams])

  const taskDetailQuery = useQuery({
    queryKey: ['task', selectedTask?.id],
    queryFn: () => getTask(selectedTask?.id ?? ''),
    enabled: Boolean(selectedTask?.id),
  })

  useEffect(() => {
    if (!taskDetailQuery.data) {
      return
    }

    const nextOutputs: Record<string, string> = {}
    const nextArtifactDrafts: Record<string, string> = {}
    for (const artifact of taskDetailQuery.data.artifacts) {
      const body = artifact.currentRevision?.bodyText ?? stringifyArtifactJson(artifact)
      nextArtifactDrafts[artifact.id] = body
      if (taskDetailQuery.data.task.writes.includes(artifact.artifactKey)) {
        nextOutputs[artifact.artifactKey] = body
      }
    }
    setOutputBodies(nextOutputs)
    setArtifactDrafts(nextArtifactDrafts)
    setFeedbackSummary(taskDetailQuery.data.feedbackSession?.summary ?? '')
  }, [taskDetailQuery.data])

  const invalidateRuntime = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['flow', id] }),
      queryClient.invalidateQueries({ queryKey: ['task', selectedTask?.id] }),
      queryClient.invalidateQueries({ queryKey: ['task-inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['project-flows'] }),
    ])
  }

  const claimTaskMutation = useMutation({
    mutationFn: ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) => claimTask(taskId, expectedVersion),
    onSuccess: async () => {
      setMessage('Task claimed.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to claim task.'),
  })

  const releaseTaskMutation = useMutation({
    mutationFn: ({ taskId, expectedVersion }: { taskId: string; expectedVersion: number }) => releaseTask(taskId, expectedVersion),
    onSuccess: async () => {
      setMessage('Task released back to the ready queue.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to release task.'),
  })

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, expectedVersion, outputs }: { taskId: string; expectedVersion: number; outputs: ArtifactWriteInput[] }) =>
      completeTask(taskId, expectedVersion, outputs),
    onSuccess: async () => {
      setMessage('Task completed.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to complete task.'),
  })

  const reviewTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      expectedVersion,
      expectedSessionVersion,
      outcome,
      comment,
    }: {
      taskId: string
      expectedVersion: number
      expectedSessionVersion: number
      outcome: 'approved' | 'revise'
      comment: string
    }) =>
      reviewTask(taskId, {
        expectedVersion,
        expectedSessionVersion,
        outcome,
        comment,
      }),
    onSuccess: async () => {
      setReviewComment('')
      setMessage('Review submitted.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to submit review.'),
  })

  const feedbackTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      expectedVersion,
      expectedSessionVersion,
      summary,
      body,
    }: {
      taskId: string
      expectedVersion: number
      expectedSessionVersion: number
      summary: string
      body: string
    }) =>
      feedbackTask(taskId, {
        expectedVersion,
        expectedSessionVersion,
        summary,
        body,
      }),
    onSuccess: async () => {
      setFeedbackBody('')
      setMessage('Feedback submitted.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to submit feedback.'),
  })

  const artifactMutation = useMutation({
    mutationFn: ({ artifactId, artifact }: { artifactId: string; artifact: Artifact }) =>
      createArtifactRevision(artifactId, {
        expectedVersion: artifact.version,
        contentKind: artifact.currentRevision?.contentKind ?? 'markdown',
        mimeType: artifact.currentRevision?.mimeType ?? 'text/markdown; charset=utf-8',
        bodyText: artifactDrafts[artifact.id] ?? '',
        baseRevisionNo: artifact.currentRevisionNo,
      }),
    onSuccess: async () => {
      setMessage('Artifact revision stored.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to create artifact revision.'),
  })

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskDetailQuery.data) {
      return
    }

    const outputs = taskDetailQuery.data.artifacts
      .filter((artifact) => taskDetailQuery.data?.task.writes.includes(artifact.artifactKey))
      .map((artifact) => ({
        artifactKey: artifact.artifactKey,
        contentKind: artifact.currentRevision?.contentKind ?? 'markdown',
        mimeType: artifact.currentRevision?.mimeType ?? 'text/markdown; charset=utf-8',
        bodyText: outputBodies[artifact.artifactKey] ?? '',
        baseRevisionNo: artifact.currentRevisionNo,
      }))

    completeTaskMutation.mutate({
      taskId: taskDetailQuery.data.task.id,
      expectedVersion: taskDetailQuery.data.task.version,
      outputs,
    })
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskDetailQuery.data?.reviewSession) {
      return
    }

    reviewTaskMutation.mutate({
      taskId: taskDetailQuery.data.task.id,
      expectedVersion: taskDetailQuery.data.task.version,
      expectedSessionVersion: taskDetailQuery.data.reviewSession.version,
      outcome: reviewOutcome,
      comment: reviewComment,
    })
  }

  function handleFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskDetailQuery.data?.feedbackSession) {
      return
    }

    feedbackTaskMutation.mutate({
      taskId: taskDetailQuery.data.task.id,
      expectedVersion: taskDetailQuery.data.task.version,
      expectedSessionVersion: taskDetailQuery.data.feedbackSession.version,
      summary: feedbackSummary,
      body: feedbackBody,
    })
  }

  const detail = taskDetailQuery.data

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <Link to="/flows" className="text-sm text-cw-cyan">
          ← Back to inbox
        </Link>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">
          {flowQuery.data ? `${flowQuery.data.workflowKey} run ${flowQuery.data.flowSequence}` : 'Flow detail'}
        </h2>
        <p className="mt-2 text-sm text-cw-muted">
          {flowQuery.data ? `${flowQuery.data.status}${flowQuery.data.blockedReason ? ` · ${flowQuery.data.blockedReason}` : ''}` : 'Loading flow...'}
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-[24px] border border-cw-border bg-cw-panel p-4 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Tasks</p>
          {flowQuery.data?.tasks?.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSearchParams({ task: task.id })}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedTask?.id === task.id
                  ? 'border-cw-cyan/40 bg-cw-cyan/10'
                  : 'border-cw-border bg-white/5 hover:border-cw-cyan/30'
              }`}
            >
              <p className="text-sm font-medium text-white">{task.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cw-muted">
                {task.nodeKind} · {task.status}
              </p>
            </button>
          ))}
        </aside>

        <section className="space-y-6">
          <article className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Current task</p>
            {detail ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">{detail.task.title}</h3>
                  <p className="mt-2 text-sm text-cw-muted">
                    {detail.task.nodeKind} · {detail.task.status} · role {detail.task.role || 'n/a'}
                  </p>
                  {detail.task.description ? <p className="mt-3 text-sm text-cw-muted">{detail.task.description}</p> : null}
                  {detail.task.prompt ? (
                    <pre className="mt-4 overflow-x-auto rounded-2xl border border-cw-border bg-cw-panel-strong p-4 text-sm whitespace-pre-wrap text-cw-text">
                      {detail.task.prompt}
                    </pre>
                  ) : null}
                </div>

                {message ? <p className="text-sm text-amber-200">{message}</p> : null}

                <div className="flex flex-wrap gap-3">
                  {detail.task.status === 'ready' ? (
                    <button
                      type="button"
                      onClick={() => claimTaskMutation.mutate({ taskId: detail.task.id, expectedVersion: detail.task.version })}
                      className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan"
                    >
                      Claim task
                    </button>
                  ) : null}
                  {detail.task.status === 'in_progress' ? (
                    <button
                      type="button"
                      onClick={() => releaseTaskMutation.mutate({ taskId: detail.task.id, expectedVersion: detail.task.version })}
                      className="inline-flex rounded-full border border-cw-amber/30 bg-cw-amber/10 px-4 py-2 text-sm font-medium text-cw-amber"
                    >
                      Release task
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-cw-muted">Select a task to inspect its current runtime state.</p>
            )}
          </article>

          {detail && (detail.task.nodeKind === 'input' || detail.task.nodeKind === 'work') && detail.task.status === 'in_progress' ? (
            <form className="space-y-4 rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur" onSubmit={handleComplete}>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Complete task</p>
              {detail.artifacts
                .filter((artifact) => detail.task.writes.includes(artifact.artifactKey))
                .map((artifact) => (
                  <label key={artifact.id} className="block">
                    <span className="mb-2 block text-sm text-cw-muted">{artifact.artifactKey}</span>
                    <textarea
                      value={outputBodies[artifact.artifactKey] ?? ''}
                      onChange={(event) =>
                        setOutputBodies((current) => ({
                          ...current,
                          [artifact.artifactKey]: event.target.value,
                        }))
                      }
                      rows={8}
                      className="w-full rounded-2xl border border-cw-border bg-cw-panel-strong px-4 py-3 text-sm text-cw-text outline-none transition focus:border-cw-cyan/40"
                    />
                  </label>
                ))}
              <button
                type="submit"
                disabled={completeTaskMutation.isPending}
                className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan"
              >
                {completeTaskMutation.isPending ? 'Completing...' : 'Complete task'}
              </button>
            </form>
          ) : null}

          {detail?.task.status === 'awaiting_review' && detail.reviewSession ? (
            <form className="space-y-4 rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur" onSubmit={handleReview}>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Review session</p>
              <select
                value={reviewOutcome}
                onChange={(event) => setReviewOutcome(event.target.value === 'revise' ? 'revise' : 'approved')}
                className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-magenta/40"
              >
                <option value="approved">approved</option>
                <option value="revise">revise</option>
              </select>
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-cw-border bg-cw-panel-strong px-4 py-3 text-sm text-cw-text outline-none transition focus:border-cw-magenta/40"
                placeholder="Review rationale or revision requests."
              />
              <button
                type="submit"
                disabled={reviewTaskMutation.isPending}
                className="inline-flex rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-4 py-2 text-sm font-medium text-cw-magenta"
              >
                {reviewTaskMutation.isPending ? 'Submitting...' : 'Submit review'}
              </button>
            </form>
          ) : null}

          {detail?.task.status === 'awaiting_feedback' && detail.feedbackSession ? (
            <form className="space-y-4 rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur" onSubmit={handleFeedback}>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Feedback session</p>
              <input
                value={feedbackSummary}
                onChange={(event) => setFeedbackSummary(event.target.value)}
                className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-amber/40"
                placeholder="Short summary"
              />
              <textarea
                value={feedbackBody}
                onChange={(event) => setFeedbackBody(event.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-cw-border bg-cw-panel-strong px-4 py-3 text-sm text-cw-text outline-none transition focus:border-cw-amber/40"
                placeholder="Detailed feedback"
              />
              <button
                type="submit"
                disabled={feedbackTaskMutation.isPending}
                className="inline-flex rounded-full border border-cw-amber/30 bg-cw-amber/10 px-4 py-2 text-sm font-medium text-cw-amber"
              >
                {feedbackTaskMutation.isPending ? 'Submitting...' : 'Submit feedback'}
              </button>
            </form>
          ) : null}

          <article className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Artifacts</p>
            <div className="mt-4 space-y-4">
              {detail?.artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-cw-border bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{artifact.artifactKey}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cw-muted">
                        {artifact.scopeType} · revision {artifact.currentRevisionNo}
                      </p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-cw-cyan">
                      v{artifact.version}
                    </span>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-cw-border bg-cw-panel-strong p-4 text-sm whitespace-pre-wrap text-cw-text">
                    {formatArtifactBody(artifact)}
                  </pre>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm text-cw-muted">New revision draft</span>
                    <textarea
                      value={artifactDrafts[artifact.id] ?? ''}
                      onChange={(event) =>
                        setArtifactDrafts((current) => ({
                          ...current,
                          [artifact.id]: event.target.value,
                        }))
                      }
                      rows={6}
                      className="w-full rounded-2xl border border-cw-border bg-cw-panel-strong px-4 py-3 text-sm text-cw-text outline-none transition focus:border-cw-cyan/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => artifactMutation.mutate({ artifactId: artifact.id, artifact })}
                    className="mt-4 inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan"
                  >
                    Save artifact revision
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}

function formatArtifactBody(artifact: Artifact) {
  if (!artifact.currentRevision) {
    return 'No revisions yet.'
  }
  if (artifact.currentRevision.bodyText) {
    return artifact.currentRevision.bodyText
  }
  if (artifact.currentRevision.bodyJson) {
    return JSON.stringify(artifact.currentRevision.bodyJson, null, 2)
  }
  if (artifact.currentRevision.bodyBase64) {
    return `<binary ${artifact.currentRevision.mimeType} ${artifact.currentRevision.byteSize} bytes>`
  }
  return 'No body stored.'
}

function stringifyArtifactJson(artifact: Artifact) {
  if (artifact.currentRevision?.bodyJson) {
    return JSON.stringify(artifact.currentRevision.bodyJson, null, 2)
  }
  return ''
}
