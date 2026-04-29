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

export function FlowDetail() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

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
      setMessage('Feedback submitted.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to submit feedback.'),
  })

  const artifactMutation = useMutation({
    mutationFn: ({ artifactId, artifact, bodyText }: { artifactId: string; artifact: Artifact; bodyText: string }) =>
      createArtifactRevision(artifactId, {
        expectedVersion: artifact.version,
        contentKind: artifact.currentRevision?.contentKind ?? 'markdown',
        mimeType: artifact.currentRevision?.mimeType ?? 'text/markdown; charset=utf-8',
        bodyText,
        baseRevisionNo: artifact.currentRevisionNo,
      }),
    onSuccess: async () => {
      setMessage('Artifact revision stored.')
      await invalidateRuntime()
    },
    onError: (error) => setMessage(error instanceof ApiError ? error.message : 'Failed to create artifact revision.'),
  })

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
          {detail ? (
            <TaskDetailPanels
              key={`${detail.task.id}:${detail.task.version}:${detail.reviewSession?.version ?? 0}:${detail.feedbackSession?.version ?? 0}`}
              detail={detail}
              message={message}
              claimPending={claimTaskMutation.isPending}
              releasePending={releaseTaskMutation.isPending}
              completePending={completeTaskMutation.isPending}
              reviewPending={reviewTaskMutation.isPending}
              feedbackPending={feedbackTaskMutation.isPending}
              artifactPending={artifactMutation.isPending}
              onClaim={() => claimTaskMutation.mutate({ taskId: detail.task.id, expectedVersion: detail.task.version })}
              onRelease={() => releaseTaskMutation.mutate({ taskId: detail.task.id, expectedVersion: detail.task.version })}
              onComplete={(outputs) =>
                completeTaskMutation.mutate({
                  taskId: detail.task.id,
                  expectedVersion: detail.task.version,
                  outputs,
                })
              }
              onReview={(outcome, comment) =>
                detail.reviewSession &&
                reviewTaskMutation.mutate({
                  taskId: detail.task.id,
                  expectedVersion: detail.task.version,
                  expectedSessionVersion: detail.reviewSession.version,
                  outcome,
                  comment,
                })
              }
              onFeedback={(summary, body) =>
                detail.feedbackSession &&
                feedbackTaskMutation.mutate({
                  taskId: detail.task.id,
                  expectedVersion: detail.task.version,
                  expectedSessionVersion: detail.feedbackSession.version,
                  summary,
                  body,
                })
              }
              onSaveArtifact={(artifact, bodyText) =>
                artifactMutation.mutate({
                  artifactId: artifact.id,
                  artifact,
                  bodyText,
                })
              }
            />
          ) : (
            <article className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Current task</p>
              <p className="mt-4 text-sm text-cw-muted">Select a task to inspect its current runtime state.</p>
            </article>
          )}
        </section>
      </div>
    </div>
  )
}

function TaskDetailPanels({
  detail,
  message,
  claimPending,
  releasePending,
  completePending,
  reviewPending,
  feedbackPending,
  artifactPending,
  onClaim,
  onRelease,
  onComplete,
  onReview,
  onFeedback,
  onSaveArtifact,
}: {
  detail: NonNullable<ReturnType<typeof getTask> extends Promise<infer T> ? T : never>
  message: string | null
  claimPending: boolean
  releasePending: boolean
  completePending: boolean
  reviewPending: boolean
  feedbackPending: boolean
  artifactPending: boolean
  onClaim: () => void
  onRelease: () => void
  onComplete: (outputs: ArtifactWriteInput[]) => void
  onReview: (outcome: 'approved' | 'revise', comment: string) => void
  onFeedback: (summary: string, body: string) => void
  onSaveArtifact: (artifact: Artifact, bodyText: string) => void
}) {
  const [reviewOutcome, setReviewOutcome] = useState<'approved' | 'revise'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  const [feedbackSummary, setFeedbackSummary] = useState(detail.feedbackSession?.summary ?? '')
  const [feedbackBody, setFeedbackBody] = useState('')
  const [outputBodies, setOutputBodies] = useState<Record<string, string>>(() => buildOutputBodies(detail))
  const [artifactDrafts, setArtifactDrafts] = useState<Record<string, string>>(() => buildArtifactDrafts(detail))

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const outputs = detail.artifacts
      .filter((artifact) => detail.task.writes.includes(artifact.artifactKey))
      .map((artifact) => ({
        artifactKey: artifact.artifactKey,
        contentKind: artifact.currentRevision?.contentKind ?? 'markdown',
        mimeType: artifact.currentRevision?.mimeType ?? 'text/markdown; charset=utf-8',
        bodyText: outputBodies[artifact.artifactKey] ?? '',
        baseRevisionNo: artifact.currentRevisionNo,
      }))

    onComplete(outputs)
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onReview(reviewOutcome, reviewComment)
  }

  function handleFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onFeedback(feedbackSummary, feedbackBody)
  }

  return (
    <>
      <article className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Current task</p>
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
                onClick={onClaim}
                disabled={claimPending}
                className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan disabled:opacity-60"
              >
                Claim task
              </button>
            ) : null}
            {detail.task.status === 'in_progress' ? (
              <button
                type="button"
                onClick={onRelease}
                disabled={releasePending}
                className="inline-flex rounded-full border border-cw-amber/30 bg-cw-amber/10 px-4 py-2 text-sm font-medium text-cw-amber disabled:opacity-60"
              >
                Release task
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {(detail.task.nodeKind === 'input' || detail.task.nodeKind === 'work') && detail.task.status === 'in_progress' ? (
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
            disabled={completePending}
            className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan disabled:opacity-60"
          >
            {completePending ? 'Completing...' : 'Complete task'}
          </button>
        </form>
      ) : null}

      {detail.task.status === 'awaiting_review' && detail.reviewSession ? (
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
            disabled={reviewPending}
            className="inline-flex rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-4 py-2 text-sm font-medium text-cw-magenta disabled:opacity-60"
          >
            {reviewPending ? 'Submitting...' : 'Submit review'}
          </button>
        </form>
      ) : null}

      {detail.task.status === 'awaiting_feedback' && detail.feedbackSession ? (
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
            disabled={feedbackPending}
            className="inline-flex rounded-full border border-cw-amber/30 bg-cw-amber/10 px-4 py-2 text-sm font-medium text-cw-amber disabled:opacity-60"
          >
            {feedbackPending ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      ) : null}

      <article className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Artifacts</p>
        <div className="mt-4 space-y-4">
          {detail.artifacts.map((artifact) => (
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
                onClick={() => onSaveArtifact(artifact, artifactDrafts[artifact.id] ?? '')}
                disabled={artifactPending}
                className="mt-4 inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan disabled:opacity-60"
              >
                Save artifact revision
              </button>
            </div>
          ))}
        </div>
      </article>
    </>
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

function buildArtifactDrafts(detail: {
  artifacts: Artifact[]
}) {
  const drafts: Record<string, string> = {}
  for (const artifact of detail.artifacts) {
    drafts[artifact.id] = artifact.currentRevision?.bodyText ?? stringifyArtifactJson(artifact)
  }
  return drafts
}

function buildOutputBodies(detail: {
  artifacts: Artifact[]
  task: {
    writes: string[]
  }
}) {
  const outputs: Record<string, string> = {}
  for (const artifact of detail.artifacts) {
    if (detail.task.writes.includes(artifact.artifactKey)) {
      outputs[artifact.artifactKey] = artifact.currentRevision?.bodyText ?? stringifyArtifactJson(artifact)
    }
  }
  return outputs
}
