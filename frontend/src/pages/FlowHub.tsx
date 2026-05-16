import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProjectType, getCurrentActor, listProjectTypes, listWorkspaces, publishProjectType } from '../api/dashboard';
import { UnauthorizedError } from '../api/client';
import { listPublicProjectTypes } from '../api/public';
import { GlassPanel } from '../components/effects/GlassPanel';
import { DistrictBackground } from '../components/effects/DistrictBackground';
import { getSignInUrl } from '../config';
import { useI18n } from '../i18n';
import { EmptyPanel } from './dashboard/shared';

function statusTone(status: string): string {
  if (status === 'published') {
    return 'border-accent-cyan/20 bg-accent-cyan/8 text-accent-cyan';
  }

  if (status === 'draft') {
    return 'border-accent-amber/20 bg-accent-amber/8 text-accent-amber';
  }

  return 'border-white/10 bg-white/5 text-text-muted';
}

function formatPublishedAt(value: string, lang: 'en' | 'zh'): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function buildDraftTemplate({
  key,
  title,
  description,
}: {
  key: string;
  title: string;
  description: string;
}): string {
  const projectTypeId = key.trim() || 'sample_project_type';
  const projectTypeTitle = title.trim() || 'Sample Project Type';
  const projectTypeDescription = description.trim() || 'A starter project type ready for editing and publishing in FlowHub.';

  return JSON.stringify(
    {
      project_type: {
        id: projectTypeId,
        name: projectTypeTitle,
        version: '1.0.0',
        description: projectTypeDescription,
        parameters: [],
        roles: [
          {
            id: 'human_owner',
            kind: 'human',
            description: 'Human owner who provides direction and approves the outcome.',
            default_prompt: 'You are the human owner for this project type.',
          },
          {
            id: 'project_agent',
            kind: 'agent',
            description: 'Agent that turns the brief into a first deliverable.',
            default_prompt: 'You are the agent responsible for producing the first draft deliverable.',
          },
        ],
        artifacts: [
          {
            id: 'brief.md',
            description: 'Initial brief provided by the human owner.',
            content_kind: 'markdown',
          },
        ],
        workflow_types: [
          {
            id: 'starter_workflow',
            description: 'A simple starter workflow that goes from brief to first draft.',
            artifacts: [
              {
                id: 'deliverable.md',
                description: 'Primary deliverable created from the brief.',
                content_kind: 'markdown',
              },
            ],
            nodes: [
              {
                id: 'provide_brief',
                kind: 'input',
                title: 'Provide Brief',
                description: 'Capture the initial brief.',
                role: 'human_owner',
                prompt: 'Provide the initial brief for this project.',
                reads: [],
                writes: ['brief.md'],
              },
              {
                id: 'draft_deliverable',
                kind: 'work',
                title: 'Draft Deliverable',
                description: 'Create the first deliverable from the brief.',
                role: 'project_agent',
                prompt: 'Produce the first deliverable using the provided brief.',
                reads: ['brief.md'],
                writes: ['deliverable.md'],
              },
              {
                id: 'finish',
                kind: 'end',
                title: 'Workflow Complete',
              },
            ],
            edges: [
              {
                from: 'provide_brief',
                to: 'draft_deliverable',
                on: 'completed',
              },
              {
                from: 'draft_deliverable',
                to: 'finish',
                on: 'completed',
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
}

export function FlowHub() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const signInUrl = getSignInUrl('/flowhub');
  const [workspaceIdInput, setWorkspaceIdInput] = useState('');
  const [projectTypeKey, setProjectTypeKey] = useState('');
  const [projectTypeTitle, setProjectTypeTitle] = useState('');
  const [projectTypeDescription, setProjectTypeDescription] = useState('');
  const [draftJson, setDraftJson] = useState(() => buildDraftTemplate({ key: '', title: '', description: '' }));
  const [formError, setFormError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishingProjectTypeId, setPublishingProjectTypeId] = useState<string | null>(null);

  const publicProjectTypesQuery = useQuery({
    queryKey: ['public-flowhub-project-types'],
    queryFn: listPublicProjectTypes,
  });

  const actorQuery = useQuery({
    queryKey: ['current-actor'],
    queryFn: getCurrentActor,
    retry: false,
    staleTime: 60_000,
  });

  const workspacesQuery = useQuery({
    queryKey: ['dashboard-workspaces'],
    queryFn: listWorkspaces,
    enabled: actorQuery.isSuccess,
  });

  const projectTypesQuery = useQuery({
    queryKey: ['project-types'],
    queryFn: listProjectTypes,
    enabled: actorQuery.isSuccess,
  });

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);
  const managedProjectTypes = useMemo(() => projectTypesQuery.data ?? [], [projectTypesQuery.data]);
  const selectedWorkspaceId = workspaceIdInput || workspaces[0]?.id || '';
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  const createProjectTypeMutation = useMutation({
    mutationFn: createProjectType,
    onSuccess: async () => {
      setFormError(null);
      setPublishMessage(t('flowhub.create_success'));
      setProjectTypeKey('');
      setProjectTypeTitle('');
      setProjectTypeDescription('');
      setDraftJson(buildDraftTemplate({ key: '', title: '', description: '' }));
      await queryClient.invalidateQueries({ queryKey: ['project-types'] });
    },
  });

  const publishProjectTypeMutation = useMutation({
    mutationFn: publishProjectType,
    onSuccess: async () => {
      setPublishMessage(t('flowhub.publish_success'));
      setPublishingProjectTypeId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-types'] }),
        queryClient.invalidateQueries({ queryKey: ['public-flowhub-project-types'] }),
      ]);
    },
    onError: () => {
      setPublishingProjectTypeId(null);
    },
  });

  const actorError = actorQuery.error;
  const isUnauthorized = actorError instanceof UnauthorizedError || (actorError && 'status' in actorError && actorError.status === 401);

  const submitProjectType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setPublishMessage(null);

    if (selectedWorkspaceId === '') {
      setFormError(t('flowhub.workspace_required'));
      return;
    }

    let parsedDraftJson: unknown;
    try {
      parsedDraftJson = JSON.parse(draftJson);
    } catch {
      setFormError(t('flowhub.invalid_draft_json'));
      return;
    }

    createProjectTypeMutation.mutate({
      workspaceId: selectedWorkspaceId,
      key: projectTypeKey.trim(),
      title: projectTypeTitle.trim(),
      description: projectTypeDescription.trim(),
      draftJson: parsedDraftJson,
    });
  };

  const handlePublish = (projectTypeId: string, expectedVersion: number) => {
    setPublishMessage(null);
    setPublishingProjectTypeId(projectTypeId);
    publishProjectTypeMutation.mutate({
      projectTypeId,
      expectedVersion,
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
        <DistrictBackground className="opacity-60" />
        <div className="relative space-y-6">
          <GlassPanel accentColor="cyan" className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.eyebrow')}</div>
            <h1 className="mt-3 text-3xl font-bold text-white">{t('flowhub.title')}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{t('flowhub.desc')}</p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.catalog_eyebrow')}</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t('flowhub.catalog_title')}</h2>
              </div>
              <div className="text-sm text-text-muted">{t('flowhub.catalog_count', { count: publicProjectTypesQuery.data?.length ?? 0 })}</div>
            </div>

            {publicProjectTypesQuery.isPending ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/8 p-5">
                    <div className="h-5 w-40 rounded shimmer-bg" />
                    <div className="mt-4 h-4 w-24 rounded shimmer-bg" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 rounded shimmer-bg" />
                      <div className="h-3 rounded shimmer-bg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : publicProjectTypesQuery.error ? (
              <EmptyPanel title={t('flowhub.catalog_error_title')} body={t('flowhub.catalog_error_body')} />
            ) : (publicProjectTypesQuery.data?.length ?? 0) > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {publicProjectTypesQuery.data?.map((projectType) => (
                  <div key={projectType.id} className="rounded-2xl border border-white/8 bg-black/10 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-white">{projectType.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(projectType.status)}`}>
                        {t(`flowhub.statuses.${projectType.status}`)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                      <span>{projectType.workspaceName}</span>
                      <span className="text-white/15">•</span>
                      <span>{projectType.key}</span>
                      <span className="text-white/15">•</span>
                      <span>{t('flowhub.latest_version', { version: projectType.latestVersionNo })}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-text-muted">{projectType.description || t('flowhub.no_description')}</p>
                    <div className="mt-4 text-xs font-mono uppercase tracking-[0.16em] text-text-muted">
                      {t('flowhub.published_at', { date: formatPublishedAt(projectType.publishedAt, lang) })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('flowhub.no_public_project_types')}</div>
            )}
          </GlassPanel>

          {actorQuery.isPending ? (
            <GlassPanel className="p-6">
              <div className="space-y-3">
                <div className="h-5 w-48 rounded shimmer-bg" />
                <div className="h-12 rounded shimmer-bg" />
                <div className="h-12 rounded shimmer-bg" />
                <div className="h-40 rounded shimmer-bg" />
              </div>
            </GlassPanel>
          ) : isUnauthorized ? (
            <EmptyPanel title={t('flowhub.auth_required_title')} body={t('flowhub.auth_required_body')} actionLabel={t('flowhub.sign_in_cta')} actionHref={signInUrl} />
          ) : actorQuery.error || workspacesQuery.error || projectTypesQuery.error ? (
            <EmptyPanel title={t('flowhub.authoring_error_title')} body={t('flowhub.authoring_error_body')} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <GlassPanel className="p-6">
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.authoring_eyebrow')}</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t('flowhub.authoring_title')}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">{t('flowhub.authoring_desc')}</p>

                {workspaces.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('flowhub.no_workspaces')}</div>
                ) : (
                  <form onSubmit={submitProjectType} className="mt-5 space-y-5">
                    <div>
                      <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                        {t('flowhub.workspace_label')}
                      </label>
                      <select
                        value={selectedWorkspaceId}
                        onChange={(event) => setWorkspaceIdInput(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                      >
                        {workspaces.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('flowhub.key_label')}</label>
                        <input
                          value={projectTypeKey}
                          onChange={(event) => setProjectTypeKey(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                          placeholder={t('flowhub.key_placeholder')}
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('flowhub.title_label')}</label>
                        <input
                          value={projectTypeTitle}
                          onChange={(event) => setProjectTypeTitle(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                          placeholder={t('flowhub.title_placeholder')}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('flowhub.description_label')}</label>
                      <textarea
                        value={projectTypeDescription}
                        onChange={(event) => setProjectTypeDescription(event.target.value)}
                        className="min-h-[120px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                        placeholder={t('flowhub.description_placeholder')}
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('flowhub.draft_json_label')}</label>
                        <button
                          type="button"
                          onClick={() => setDraftJson(buildDraftTemplate({ key: projectTypeKey, title: projectTypeTitle, description: projectTypeDescription }))}
                          className="rounded-xl border border-white/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted transition-colors hover:border-white/20 hover:text-white"
                        >
                          {t('flowhub.reset_draft_cta')}
                        </button>
                      </div>
                      <textarea
                        value={draftJson}
                        onChange={(event) => setDraftJson(event.target.value)}
                        className="min-h-[320px] w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 font-mono text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                        placeholder={t('flowhub.draft_json_placeholder')}
                      />
                    </div>

                    {formError ? (
                      <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">{formError}</div>
                    ) : null}
                    {createProjectTypeMutation.error ? (
                      <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                        {createProjectTypeMutation.error.message}
                      </div>
                    ) : null}
                    {publishMessage ? (
                      <div className="rounded-xl border border-accent-cyan/20 bg-accent-cyan/8 px-3 py-2 text-sm text-accent-cyan">{publishMessage}</div>
                    ) : null}

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={createProjectTypeMutation.isPending}
                        className="btn-cyber px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {createProjectTypeMutation.isPending ? t('flowhub.creating_project_type') : t('flowhub.create_project_type_cta')}
                      </button>
                    </div>
                  </form>
                )}
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.manage_eyebrow')}</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{t('flowhub.manage_title')}</h2>
                  </div>
                  <div className="text-sm text-text-muted">{t('flowhub.manage_count', { count: managedProjectTypes.length })}</div>
                </div>

                {projectTypesQuery.isPending ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-white/8 p-4">
                        <div className="h-5 w-40 rounded shimmer-bg" />
                        <div className="mt-4 h-4 w-24 rounded shimmer-bg" />
                      </div>
                    ))}
                  </div>
                ) : managedProjectTypes.length > 0 ? (
                  <div className="space-y-3">
                    {managedProjectTypes.map((projectType) => (
                      <div key={projectType.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold text-white">{projectType.title}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(projectType.status)}`}>
                                {t(`flowhub.statuses.${projectType.status}`)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                              <span>{workspaceById.get(projectType.workspaceId)?.name ?? t('flowhub.unknown_workspace')}</span>
                              <span className="text-white/15">•</span>
                              <span>{projectType.key}</span>
                              <span className="text-white/15">•</span>
                              <span>{t('flowhub.draft_version', { version: projectType.version })}</span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-text-muted">{projectType.description || t('flowhub.no_description')}</p>
                          </div>
                          {projectType.status !== 'published' ? (
                            <button
                              type="button"
                              onClick={() => handlePublish(projectType.id, projectType.version)}
                              disabled={publishProjectTypeMutation.isPending}
                              className="btn-cyber whitespace-nowrap px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {publishProjectTypeMutation.isPending && publishingProjectTypeId === projectType.id
                                ? t('flowhub.publishing_project_type')
                                : t('flowhub.publish_project_type_cta')}
                            </button>
                          ) : (
                            <div className="rounded-full border border-accent-cyan/20 bg-accent-cyan/8 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-accent-cyan">
                              {t('flowhub.public_badge')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('flowhub.no_managed_project_types')}</div>
                )}

                {publishProjectTypeMutation.error ? (
                  <div className="mt-4 rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                    {publishProjectTypeMutation.error.message}
                  </div>
                ) : null}
              </GlassPanel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
