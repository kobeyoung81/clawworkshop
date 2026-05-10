import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject, listProjectFlows } from '../../api/dashboard';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import { EmptyPanel } from './shared';
import { statusTone } from './utils';

export function ProjectView() {
  const { t } = useI18n();
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
            <div className="mt-5 flex flex-wrap gap-2">
              {project.templateWorkflowKeys && project.templateWorkflowKeys.length > 0 ? (
                project.templateWorkflowKeys.map((workflowKey) => (
                  <span key={workflowKey} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-white">
                    {workflowKey}
                  </span>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_project_template_workflows')}</div>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
