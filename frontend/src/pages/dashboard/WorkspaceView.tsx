import { useMemo } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listWorkspaceArtifacts } from '../../api/dashboard';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import { useDashboardShellContext } from './context';
import { EmptyPanel } from './shared';
import { statusTone } from './utils';

export function WorkspaceView() {
  const { t } = useI18n();
  const { workspaceId } = useParams();
  const { workspaces, projects } = useDashboardShellContext();

  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null;
  const workspaceProjects = useMemo(
    () => projects.filter((project) => project.workspaceId === workspaceId),
    [projects, workspaceId],
  );

  const workspaceArtifactsQuery = useQuery({
    queryKey: ['workspace-artifacts', workspaceId],
    queryFn: () => listWorkspaceArtifacts(workspaceId!),
    enabled: Boolean(workspaceId && workspace),
  });

  const projectNameById = useMemo(() => new Map(workspaceProjects.map((project) => [project.id, project.name])), [workspaceProjects]);

  if (!workspaceId || !workspace) {
    return <EmptyPanel title={t('dashboard.workspace_not_found_title')} body={t('dashboard.workspace_not_found_body')} />;
  }

  return (
    <div className="space-y-6">
      <GlassPanel accentColor="cyan" className="p-6">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.workspace_view_eyebrow')}</div>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{workspace.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-text-muted">{t('dashboard.workspace_view_desc')}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-text-muted">
            {workspace.actorRole ?? t('dashboard.role_unknown')}
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
        <GlassPanel className="p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.workspace_artifacts_eyebrow')}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.workspace_artifacts_title')}</h2>
            </div>
            <div className="text-sm text-text-muted">{t('dashboard.workspace_artifacts_count', { count: workspaceArtifactsQuery.data?.length ?? 0 })}</div>
          </div>

          {workspaceArtifactsQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-white/8 p-4">
                  <div className="h-4 w-40 rounded shimmer-bg" />
                  <div className="mt-3 h-3 rounded shimmer-bg" />
                </div>
              ))}
            </div>
          ) : workspaceArtifactsQuery.data && workspaceArtifactsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {workspaceArtifactsQuery.data.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{artifact.artifactKey}</div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-white">
                      {projectNameById.get(artifact.projectId) ?? t('dashboard.unknown_project')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                    <span>{artifact.scopeType}</span>
                    <span className="text-white/15">•</span>
                    <span>{artifact.scopeRef}</span>
                    <span className="text-white/15">•</span>
                    <span>{t('dashboard.artifact_revision_label', { revision: artifact.currentRevisionNo })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_workspace_artifacts')}</div>
          )}
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-amber/70">{t('dashboard.workspace_projects_eyebrow')}</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.workspace_projects_title')}</h2>
            </div>
            <div className="text-sm text-text-muted">{t('dashboard.workspace_projects_count', { count: workspaceProjects.length })}</div>
          </div>

          {workspaceProjects.length > 0 ? (
            <div className="space-y-3">
              {workspaceProjects.map((project) => (
                <NavLink key={project.id} to={`/dashboard/projects/${project.id}`} className="block rounded-2xl border border-white/8 bg-black/10 p-4 transition-colors hover:border-accent-cyan/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{project.name}</div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(project.status)}`}>
                      {t(`dashboard.statuses.${project.status}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{project.description || t('dashboard.project_no_description')}</p>
                </NavLink>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_projects_in_workspace')}</div>
          )}

          <div className="mt-4">
            <NavLink to={`/dashboard/workspaces/${workspace.id}/projects/new`} className="btn-cyber-outline flex w-full items-center justify-center px-4 py-3 text-xs">
              {t('dashboard.new_project')}
            </NavLink>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
