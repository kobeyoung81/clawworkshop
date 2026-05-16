import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claimTask, completeTask, feedbackTask, getTask, releaseTask, reviewTask } from '../../api/dashboard';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import type { ArtifactSummary, CompleteTaskInput } from '../../types';
import { useDashboardShellContext } from './context';
import { EmptyPanel } from './shared';
import { inferArtifactContentKind, isImageContentKind, statusTone } from './utils';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('file_read_failed'));
        return;
      }
      const [, base64 = ''] = result.split(',', 2);
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

function ArtifactPreview({ artifact }: { artifact: ArtifactSummary }) {
  const { t } = useI18n();
  const revision = artifact.currentRevision;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">{artifact.artifactKey}</div>
        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">{artifact.scopeType}</div>
      </div>

      {revision ? (
        <div className="mt-3 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
            {t('dashboard.current_revision_label', { revision: revision.revisionNo })}
          </div>
          {revision.contentKind === 'image' && revision.bodyBase64 ? (
            <img
              src={`data:${revision.mimeType || 'application/octet-stream'};base64,${revision.bodyBase64}`}
              alt={artifact.artifactKey}
              className="max-h-64 rounded-xl border border-white/8 object-contain"
            />
          ) : revision.bodyText ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-surface/70 p-3 text-xs text-text-muted">
              {revision.bodyText}
            </pre>
          ) : revision.bodyJson ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-surface/70 p-3 text-xs text-text-muted">
              {JSON.stringify(revision.bodyJson, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-text-muted">{revision.mimeType}</div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-sm text-text-muted">{t('dashboard.no_current_revision')}</div>
      )}
    </div>
  );
}

export function TaskView() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { taskId } = useParams();
  const { actor, projects, workspaceById } = useDashboardShellContext();
  const [reviewComment, setReviewComment] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState<'approved' | 'revise'>('approved');
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [outputTexts, setOutputTexts] = useState<Record<string, string>>({});
  const [outputFiles, setOutputFiles] = useState<Record<string, File | null>>({});
  const [localActionError, setLocalActionError] = useState<string | null>(null);

  const taskQuery = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => getTask(taskId!),
    enabled: Boolean(taskId),
  });

  const taskDetail = taskQuery.data;
  const task = taskDetail?.task;
  const project = projects.find((item) => item.id === taskDetail?.projectId);
  const workspace = project ? workspaceById.get(project.workspaceId) : undefined;

  const writeArtifacts: ArtifactSummary[] =
    taskDetail?.artifacts && task?.writes
      ? task.writes
          .map((artifactKey) => taskDetail.artifacts?.find((artifact) => artifact.artifactKey === artifactKey))
          .filter((artifact): artifact is ArtifactSummary => Boolean(artifact))
      : [];

  const readArtifacts: ArtifactSummary[] =
    taskDetail?.artifacts && task?.reads
      ? task.reads
          .map((artifactKey) => taskDetail.artifacts?.find((artifact) => artifact.artifactKey === artifactKey))
          .filter((artifact): artifact is ArtifactSummary => Boolean(artifact))
      : [];

  const invalidateRuntimeQueries = async (projectId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-task-inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['project-flows', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] }),
    ]);
  };

  const claimTaskMutation = useMutation({
    mutationFn: claimTask,
    onSuccess: async () => {
      if (taskDetail) {
        await invalidateRuntimeQueries(taskDetail.projectId);
      }
    },
  });

  const releaseTaskMutation = useMutation({
    mutationFn: releaseTask,
    onSuccess: async () => {
      if (taskDetail) {
        await invalidateRuntimeQueries(taskDetail.projectId);
      }
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: async () => {
      if (taskDetail) {
        await invalidateRuntimeQueries(taskDetail.projectId);
      }
    },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: reviewTask,
    onSuccess: async () => {
      if (taskDetail) {
        await invalidateRuntimeQueries(taskDetail.projectId);
      }
    },
  });

  const feedbackTaskMutation = useMutation({
    mutationFn: feedbackTask,
    onSuccess: async () => {
      if (taskDetail) {
        await invalidateRuntimeQueries(taskDetail.projectId);
      }
    },
  });

  if (!taskId) {
    return <EmptyPanel title={t('dashboard.task_not_found_title')} body={t('dashboard.task_not_found_body')} />;
  }

  if (taskQuery.isPending) {
    return (
      <div className="space-y-6">
        <GlassPanel className="p-6">
          <div className="h-8 w-56 rounded shimmer-bg" />
          <div className="mt-3 h-4 w-80 rounded shimmer-bg" />
        </GlassPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <GlassPanel className="min-h-[360px] p-6">
            <div />
          </GlassPanel>
          <GlassPanel className="min-h-[360px] p-6">
            <div />
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (taskQuery.error || !taskDetail || !task) {
    return <EmptyPanel title={t('dashboard.task_not_found_title')} body={t('dashboard.task_not_found_body')} />;
  }

  const isClaimedByActor = task.claimOwnerId === actor.id;
  const reviewSession = taskDetail.reviewSession;
  const feedbackSession = taskDetail.feedbackSession;

  const handleCompleteTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalActionError(null);

    try {
      const outputs: CompleteTaskInput['outputs'] = await Promise.all(
        writeArtifacts.map(async (artifact) => {
          const contentKind = inferArtifactContentKind(artifact.artifactKey, artifact.currentRevision?.contentKind);
          const baseRevisionNo = artifact.currentRevision?.revisionNo ?? 0;

          if (isImageContentKind(contentKind)) {
            const selectedFile = outputFiles[artifact.artifactKey];
            if (selectedFile) {
              return {
                artifactKey: artifact.artifactKey,
                contentKind,
                mimeType: selectedFile.type || artifact.currentRevision?.mimeType || 'application/octet-stream',
                bodyBase64: await readFileAsBase64(selectedFile),
                baseRevisionNo,
              };
            }
            if (artifact.currentRevision?.bodyBase64) {
              return {
                artifactKey: artifact.artifactKey,
                contentKind,
                mimeType: artifact.currentRevision.mimeType,
                bodyBase64: artifact.currentRevision.bodyBase64,
                baseRevisionNo,
              };
            }
            throw new Error(t('dashboard.task_output_image_required', { artifact: artifact.artifactKey }));
          }

          const bodyText = (outputTexts[artifact.artifactKey] ?? '').trim();
          if (!bodyText) {
            throw new Error(t('dashboard.task_output_text_required', { artifact: artifact.artifactKey }));
          }

          return {
            artifactKey: artifact.artifactKey,
            contentKind,
            mimeType: artifact.currentRevision?.mimeType || 'text/markdown; charset=utf-8',
            bodyText,
            baseRevisionNo,
          };
        }),
      );

      completeTaskMutation.mutate({
        taskId,
        expectedVersion: task.version,
        outputs,
      });
    } catch (error) {
      setLocalActionError(error instanceof Error ? error.message : t('dashboard.task_action_failed'));
    }
  };

  return (
    <div className="space-y-6">
      <GlassPanel accentColor="mag" className="p-6">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-mag/70">{t('dashboard.task_view_eyebrow')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{task.title || task.nodeKey}</h1>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(task.status)}`}>
            {t(`dashboard.statuses.${task.status}`)}
          </span>
          {task.role ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-white">
              {task.role}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{task.description || t('dashboard.task_no_description')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
          <span>{workspace?.name ?? t('dashboard.unknown_workspace')}</span>
          <span className="text-white/15">•</span>
          {project ? <Link to={`/dashboard/projects/${project.id}`} className="text-white hover:text-accent-cyan">{project.name}</Link> : null}
          <span className="text-white/15">•</span>
          <span>{taskDetail.workflowKey}</span>
          <span className="text-white/15">•</span>
          <span>{t('dashboard.flow_label', { flow: taskDetail.flowSequence })}</span>
        </div>
      </GlassPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <GlassPanel className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.task_artifacts_eyebrow')}</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.task_artifacts_title')}</h2>

            <div className="mt-5 space-y-6">
              <div>
                <div className="mb-3 text-sm font-semibold text-white">{t('dashboard.task_reads_title')}</div>
                {readArtifacts.length > 0 ? (
                  <div className="space-y-3">
                    {readArtifacts.map((artifact) => (
                      <ArtifactPreview key={artifact.id} artifact={artifact} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_task_reads')}</div>
                )}
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-white">{t('dashboard.task_writes_title')}</div>
                {writeArtifacts.length > 0 ? (
                  <div className="space-y-3">
                    {writeArtifacts.map((artifact) => (
                      <ArtifactPreview key={artifact.id} artifact={artifact} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_task_writes')}</div>
                )}
              </div>
            </div>
          </GlassPanel>

          {task.nodeKind === 'review' && reviewSession ? (
            <GlassPanel className="p-6">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.task_review_history_title')}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.task_review_title')}</h2>
              <div className="mt-5 space-y-3">
                {reviewSession.decisions && reviewSession.decisions.length > 0 ? (
                  reviewSession.decisions.map((decision) => (
                    <div key={decision.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{decision.reviewerId}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(decision.outcome)}`}>
                          {decision.outcome}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-muted">{decision.commentBody}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_review_decisions')}</div>
                )}
              </div>
            </GlassPanel>
          ) : null}

          {task.nodeKind === 'feedback' && feedbackSession ? (
            <GlassPanel className="p-6">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.task_feedback_history_title')}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.task_feedback_title')}</h2>
              <div className="mt-5 space-y-3">
                {feedbackSession.entries && feedbackSession.entries.length > 0 ? (
                  feedbackSession.entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                      <div className="text-sm font-semibold text-white">{entry.authorId}</div>
                      <p className="mt-2 text-sm text-text-muted">{entry.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_feedback_entries')}</div>
                )}
              </div>
            </GlassPanel>
          ) : null}
        </div>

        <div className="space-y-6">
          <GlassPanel className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.task_actions_eyebrow')}</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.task_actions_title')}</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-text-muted">
                <div>{task.prompt || t('dashboard.task_no_prompt')}</div>
                {task.claimOwnerId ? (
                  <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.16em] text-white/70">
                    {t('dashboard.task_claim_owner_label', { actor: task.claimOwnerId })}
                  </div>
                ) : null}
              </div>

              {task.status === 'ready' ? (
                <button
                  type="button"
                  onClick={() => claimTaskMutation.mutate({ taskId, expectedVersion: task.version })}
                  disabled={claimTaskMutation.isPending}
                  className="btn-cyber w-full px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {claimTaskMutation.isPending ? t('dashboard.task_claiming') : t('dashboard.task_claim_cta')}
                </button>
              ) : null}

              {task.status === 'in_progress' ? (
                <button
                  type="button"
                  onClick={() => releaseTaskMutation.mutate({ taskId, expectedVersion: task.version })}
                  disabled={releaseTaskMutation.isPending}
                  className="btn-cyber-outline w-full px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {releaseTaskMutation.isPending ? t('dashboard.task_releasing') : t('dashboard.task_release_cta')}
                </button>
              ) : null}

              {(claimTaskMutation.error || releaseTaskMutation.error) ? (
                <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                  {claimTaskMutation.error?.message ?? releaseTaskMutation.error?.message}
                </div>
              ) : null}
            </div>
          </GlassPanel>

          {task.nodeKind !== 'review' && task.nodeKind !== 'feedback' && task.status === 'in_progress' ? (
            <GlassPanel className="p-6">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.task_outputs_eyebrow')}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.task_outputs_title')}</h2>
              <p className="mt-2 text-sm leading-7 text-text-muted">{t('dashboard.task_outputs_desc')}</p>

              <form onSubmit={handleCompleteTask} className="mt-5 space-y-5">
                {writeArtifacts.map((artifact) => {
                  const contentKind = inferArtifactContentKind(artifact.artifactKey, artifact.currentRevision?.contentKind);

                  return (
                    <div key={artifact.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                      <div className="mb-3 text-sm font-semibold text-white">{artifact.artifactKey}</div>
                      {isImageContentKind(contentKind) ? (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                            {t('dashboard.output_image_label')}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setOutputFiles((current) => ({
                                ...current,
                                [artifact.artifactKey]: event.target.files?.[0] ?? null,
                              }))
                            }
                            className="block w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white"
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                            {t('dashboard.output_text_label')}
                          </label>
                          <textarea
                            value={outputTexts[artifact.artifactKey] ?? artifact.currentRevision?.bodyText ?? ''}
                            onChange={(event) =>
                              setOutputTexts((current) => ({
                                ...current,
                                [artifact.artifactKey]: event.target.value,
                              }))
                            }
                            className="min-h-[160px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {localActionError || completeTaskMutation.error ? (
                  <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                    {localActionError ?? completeTaskMutation.error?.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={completeTaskMutation.isPending || (Boolean(task.claimOwnerId) && !isClaimedByActor)}
                  className="btn-cyber w-full px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {completeTaskMutation.isPending ? t('dashboard.task_completing') : t('dashboard.task_complete_cta')}
                </button>
              </form>
            </GlassPanel>
          ) : null}

          {task.nodeKind === 'review' && task.status === 'awaiting_review' && reviewSession ? (
            <GlassPanel className="p-6">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.task_review_title')}</div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  reviewTaskMutation.mutate({
                    taskId,
                    expectedVersion: task.version,
                    expectedSessionVersion: reviewSession.version,
                    outcome: reviewOutcome,
                    comment: reviewComment,
                  });
                }}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.review_outcome_label')}
                  </label>
                  <select
                    value={reviewOutcome}
                    onChange={(event) => setReviewOutcome(event.target.value as 'approved' | 'revise')}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  >
                    <option value="approved">{t('dashboard.review_outcome_approve')}</option>
                    <option value="revise">{t('dashboard.review_outcome_revise')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.review_comment_label')}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder={t('dashboard.review_comment_placeholder')}
                    className="min-h-[140px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  />
                </div>
                {reviewTaskMutation.error ? (
                  <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                    {reviewTaskMutation.error.message}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={reviewTaskMutation.isPending}
                  className="btn-cyber w-full px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewTaskMutation.isPending ? t('dashboard.task_review_submitting') : t('dashboard.task_review_cta')}
                </button>
              </form>
            </GlassPanel>
          ) : null}

          {task.nodeKind === 'feedback' && task.status === 'awaiting_feedback' && feedbackSession ? (
            <GlassPanel className="p-6">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.task_feedback_title')}</div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  feedbackTaskMutation.mutate({
                    taskId,
                    expectedVersion: task.version,
                    expectedSessionVersion: feedbackSession.version,
                    summary: feedbackSummary,
                    body: feedbackBody,
                  });
                }}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.feedback_summary_label')}
                  </label>
                  <input
                    value={feedbackSummary}
                    onChange={(event) => setFeedbackSummary(event.target.value)}
                    placeholder={t('dashboard.feedback_summary_placeholder')}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.feedback_body_label')}
                  </label>
                  <textarea
                    value={feedbackBody}
                    onChange={(event) => setFeedbackBody(event.target.value)}
                    placeholder={t('dashboard.feedback_body_placeholder')}
                    className="min-h-[140px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  />
                </div>
                {feedbackTaskMutation.error ? (
                  <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                    {feedbackTaskMutation.error.message}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={feedbackTaskMutation.isPending}
                  className="btn-cyber w-full px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {feedbackTaskMutation.isPending ? t('dashboard.task_feedback_submitting') : t('dashboard.task_feedback_cta')}
                </button>
              </form>
            </GlassPanel>
          ) : null}

          <GlassPanel className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.task_assignments_title')}</div>
            <div className="mt-5 space-y-3">
              {taskDetail.assignments && taskDetail.assignments.length > 0 ? (
                taskDetail.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{assignment.assigneeId}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(assignment.status)}`}>
                        {t(`dashboard.statuses.${assignment.status}`)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-text-muted">
                      {assignment.assigneeType} · {assignment.source}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_task_assignments')}</div>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
