import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createProject, listProjectTypes, listProjectTypeVersions } from '../../api/dashboard';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import { useDashboardShellContext } from './context';
import { EmptyPanel } from './shared';

export function ProjectCreateView() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { workspaces } = useDashboardShellContext();
  const [projectTypeIdInput, setProjectTypeIdInput] = useState('');
  const [versionIdInput, setVersionIdInput] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [parameterValuesJson, setParameterValuesJson] = useState('{}');
  const [formError, setFormError] = useState<string | null>(null);

  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null;

  const projectTypesQuery = useQuery({
    queryKey: ['project-types'],
    queryFn: listProjectTypes,
    enabled: Boolean(workspaceId && workspace),
  });

  const availableProjectTypes = useMemo(
    () => (projectTypesQuery.data ?? []).filter((projectType) => projectType.workspaceId === workspaceId),
    [projectTypesQuery.data, workspaceId],
  );

  const selectedProjectTypeId = projectTypeIdInput || availableProjectTypes[0]?.id || '';

  const projectTypeVersionsQuery = useQuery({
    queryKey: ['project-type-versions', selectedProjectTypeId],
    queryFn: () => listProjectTypeVersions(selectedProjectTypeId),
    enabled: selectedProjectTypeId !== '',
  });

  const availableVersions = projectTypeVersionsQuery.data ?? [];
  const selectedVersionId = versionIdInput || availableVersions[0]?.id || '';

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      navigate(`/dashboard/projects/${project.id}`);
    },
  });

  if (!workspaceId || !workspace) {
    return <EmptyPanel title={t('dashboard.workspace_not_found_title')} body={t('dashboard.workspace_not_found_body')} />;
  }

  const submitProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    let parsedParameters: unknown = {};
    try {
      parsedParameters = JSON.parse(parameterValuesJson || '{}');
    } catch {
      setFormError(t('dashboard.invalid_project_parameters'));
      return;
    }

    createProjectMutation.mutate({
      workspaceId,
      projectTypeVersionId: selectedVersionId,
      name: projectName.trim(),
      description: projectDescription.trim(),
      parameterValuesJson: parsedParameters,
      participants: [],
    });
  };

  return (
    <div className="space-y-6">
      <GlassPanel accentColor="cyan" className="p-6">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.project_create_eyebrow')}</div>
        <h1 className="mt-3 text-3xl font-bold text-white">{t('dashboard.project_create_title')}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{t('dashboard.project_create_desc', { workspace: workspace.name })}</p>
      </GlassPanel>

      <GlassPanel className="p-6">
        {projectTypesQuery.isPending ? (
          <div className="space-y-3">
            <div className="h-5 w-40 rounded shimmer-bg" />
            <div className="h-11 rounded shimmer-bg" />
            <div className="h-11 rounded shimmer-bg" />
          </div>
        ) : availableProjectTypes.length === 0 ? (
          <EmptyPanel title={t('dashboard.project_types_empty_title')} body={t('dashboard.project_types_empty_body')} />
        ) : (
          <form onSubmit={submitProject} className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                  {t('dashboard.project_template')}
                </label>
                <select
                  value={selectedProjectTypeId}
                  onChange={(event) => {
                    setProjectTypeIdInput(event.target.value);
                    setVersionIdInput('');
                  }}
                  className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                >
                  {availableProjectTypes.map((projectType) => (
                    <option key={projectType.id} value={projectType.id}>
                      {projectType.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                  {t('dashboard.project_version_label')}
                </label>
                <select
                  value={selectedVersionId}
                  onChange={(event) => setVersionIdInput(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  disabled={projectTypeVersionsQuery.isPending || availableVersions.length === 0}
                >
                  {availableVersions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {t('dashboard.project_version_option', { version: version.versionNo })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProjectTypeId && !projectTypeVersionsQuery.isPending && availableVersions.length === 0 ? (
              <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/8 px-3 py-2 text-sm text-accent-amber">
                {t('dashboard.project_type_versions_empty')}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                {t('dashboard.project_name')}
              </label>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                placeholder={t('dashboard.project_name_placeholder')}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                {t('dashboard.project_description')}
              </label>
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                placeholder={t('dashboard.project_description_placeholder')}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                {t('dashboard.project_parameters_json')}
              </label>
              <textarea
                value={parameterValuesJson}
                onChange={(event) => setParameterValuesJson(event.target.value)}
                className="min-h-[180px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 font-mono text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                placeholder={t('dashboard.project_parameters_placeholder')}
              />
            </div>

            {formError ? (
              <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">{formError}</div>
            ) : null}
            {createProjectMutation.error ? (
              <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                {createProjectMutation.error.message}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createProjectMutation.isPending || selectedVersionId === ''}
                className="btn-cyber px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createProjectMutation.isPending ? t('dashboard.creating_project') : t('dashboard.create_project_cta')}
              </button>
            </div>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
