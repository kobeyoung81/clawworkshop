import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject, listProjectFlows, startFlow } from '../../api/dashboard';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import { EmptyPanel } from './shared';
import { statusTone } from './utils';

export function ProjectView() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { projectId } = useParams();

  const projectQuery = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });

  const flowsQuery = useQuery({
    queryKey: ['project-flows', projectId],
    queryFn: () => listProjectFlows(projectId!),
    enabled: Boolean(projectId),
  });

  const startFlowMutation = useMutation({
    mutationFn: ({ workflowId, expectedVersion }: { workflowId: string; expectedVersion: number }) =>
      startFlow({
        projectId: projectId!,
        workflowId,
        expectedVersion,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project-flows', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-task-inbox'] }),
      ]);
    },
  });

  if (!projectId) {
    return <EmptyPanel title={t('dashboard.project_not_found_title')} body={t('dashboard.project_not_found_body')} />;
  }

  if (projectQuery.isPending || flowsQuery.isPending) {
    return (
      <div className="space-y-6">
        <GlassPanel className="p-6">
          <div className="h-8 w-56 rounded shimmer-bg" />
          <div className="mt-3 h-4 w-80 rounded shimmer-bg" />
        </GlassPanel>
        <div className="grid gap-6 xl:grid-cols-2">
          <GlassPanel className="min-h-[240px] p-6">
            <div />
          </GlassPanel>
          <GlassPanel className="min-h-[240px] p-6">
            <div />
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (projectQuery.error || !projectQuery.data) {
    return <EmptyPanel title={t('dashboard.project_not_found_title')} body={t('dashboard.project_not_found_body')} />;
  }

  const project = projectQuery.data;
  const flows = flowsQuery.data ?? [];
  const workflowRuns = flows.reduce<Record<string, number>>((accumulator, flow) => {
    accumulator[flow.workflowKey] = (accumulator[flow.workflowKey] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="space-y-6">
      <GlassPanel accentColor="amber" className="p-6">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.project_view_eyebrow')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(project.status)}`}>
            {t(`dashboard.statuses.${project.status}`)}
          </span>
          {project.actorProjectRole ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-white">
              {project.actorProjectRole}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{project.description || t('dashboard.project_no_description')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
          <span>{t('dashboard.project_template_version')}</span>
          <span className="text-white/15">•</span>
          <span>{project.projectTypeVersionId}</span>
        </div>
      </GlassPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <GlassPanel className="p-6">
          <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.project_workflows_eyebrow')}</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.project_workflows_title')}</h2>
          <div className="mt-5 space-y-3">
            {flows.length > 0 ? (
              flows.map((flow) => (
                <div key={flow.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{flow.workflowKey}</div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(flow.status)}`}>
                      {t(`dashboard.statuses.${flow.status}`)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                    <span>{t('dashboard.flow_label', { flow: flow.flowSequence })}</span>
                    <span className="text-white/15">•</span>
                    <span>{t('dashboard.project_tasks_count', { count: flow.tasks?.length ?? 0 })}</span>
                  </div>
                  {flow.tasks && flow.tasks.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {flow.tasks.map((task) => (
                        <Link
                          key={task.id}
                          to={`/dashboard/tasks/${task.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2 transition-colors hover:border-accent-cyan/15"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{task.title || task.nodeKey}</div>
                            <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                              {task.nodeKind}
                              {task.role ? ` • ${task.role}` : ''}
                            </div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(task.status)}`}>
                            {t(`dashboard.statuses.${task.status}`)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_project_workflows')}</div>
            )}
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.project_participants_eyebrow')}</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.project_participants_title')}</h2>
            <div className="mt-5 space-y-3">
              {project.participants && project.participants.length > 0 ? (
                project.participants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{participant.subjectId}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-white">
                        {participant.role}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-text-muted">{participant.subjectType} · {participant.status}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_project_participants')}</div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.project_template_workflows_eyebrow')}</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.project_template_workflows_title')}</h2>
            <div className="mt-5 grid gap-3">
              {project.templateWorkflowKeys && project.templateWorkflowKeys.length > 0 ? (
                project.templateWorkflowKeys.map((workflowKey) => (
                  <div key={workflowKey} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{workflowKey}</div>
                        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                          {t('dashboard.workflow_runs_count', { count: workflowRuns[workflowKey] ?? 0 })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startFlowMutation.mutate({ workflowId: workflowKey, expectedVersion: project.version })}
                        disabled={startFlowMutation.isPending}
                        className="btn-cyber px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {startFlowMutation.isPending ? t('dashboard.starting_workflow') : t('dashboard.start_workflow_cta')}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_project_template_workflows')}</div>
              )}
            </div>
            {startFlowMutation.error ? (
              <div className="mt-4 rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                {startFlowMutation.error.message}
              </div>
            ) : null}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
