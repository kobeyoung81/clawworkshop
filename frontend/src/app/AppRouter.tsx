import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell.tsx'
import { GlassPanel } from '../components/effects/GlassPanel.tsx'
import { useCurrentActor } from '../hooks/useCurrentActor.ts'
import { Activity } from '../pages/Activity.tsx'
import { Dashboard } from '../pages/Dashboard.tsx'
import { FlowDetail } from '../pages/FlowDetail.tsx'
import { Flows } from '../pages/Flows.tsx'
import { NotFound } from '../pages/NotFound.tsx'
import { Overview } from '../pages/Overview.tsx'
import { ProjectDetail } from '../pages/ProjectDetail.tsx'
import { Projects } from '../pages/Projects.tsx'
import { TemplateDetail } from '../pages/TemplateDetail.tsx'
import { TemplateVersion } from '../pages/TemplateVersion.tsx'
import { Templates } from '../pages/Templates.tsx'
import { WorkspaceDetail } from '../pages/WorkspaceDetail.tsx'
import { Workspaces } from '../pages/Workspaces.tsx'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
          <Route path="/templates/:id/versions/:versionId" element={<TemplateVersion />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/flows" element={<Flows />} />
          <Route path="/flows/:id" element={<FlowDetail />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

function RootRoute() {
  const currentActorQuery = useCurrentActor()

  if (currentActorQuery.isLoading) {
    return <SessionStatePanel accent="cyan" title="Checking session" message="Loading the ClawWorkshop portal." />
  }

  if (currentActorQuery.data) {
    return <Navigate to="/dashboard" replace />
  }

  return <Overview />
}

function DashboardRoute() {
  const currentActorQuery = useCurrentActor()

  if (currentActorQuery.isLoading) {
    return <SessionStatePanel accent="cyan" title="Checking session" message="Loading your dashboard." />
  }

  if (currentActorQuery.error) {
    const message = currentActorQuery.error instanceof Error ? currentActorQuery.error.message : 'Unable to confirm sign-in state.'

    return <SessionStatePanel accent="magenta" title="Session unavailable" message={message} />
  }

  if (!currentActorQuery.data) {
    return <Navigate to="/" replace />
  }

  return <Dashboard />
}

function SessionStatePanel({
  title,
  message,
  accent,
}: {
  title: string
  message: string
  accent: 'cyan' | 'magenta'
}) {
  return (
    <GlassPanel accent={accent} className="mx-auto max-w-xl p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-cw-text-muted">{title}</p>
      <p className="mt-3 text-sm text-cw-text-muted">{message}</p>
    </GlassPanel>
  )
}
