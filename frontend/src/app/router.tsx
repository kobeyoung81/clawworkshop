import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/app-shell.tsx'
import { ActivityPage } from '../pages/activity-page.tsx'
import { DashboardPage } from '../pages/dashboard-page.tsx'
import { FlowDetailPage } from '../pages/flow-detail-page.tsx'
import { FlowsPage } from '../pages/flows-page.tsx'
import { NotFoundPage } from '../pages/not-found-page.tsx'
import { OverviewPage } from '../pages/overview-page.tsx'
import { ProjectDetailPage } from '../pages/project-detail-page.tsx'
import { ProjectsPage } from '../pages/projects-page.tsx'
import { TemplateDetailPage } from '../pages/template-detail-page.tsx'
import { TemplateVersionPage } from '../pages/template-version-page.tsx'
import { TemplatesPage } from '../pages/templates-page.tsx'
import { WorkspaceDetailPage } from '../pages/workspace-detail-page.tsx'
import { WorkspacesPage } from '../pages/workspaces-page.tsx'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/templates/:id/versions/:versionId" element={<TemplateVersionPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/flows/:id" element={<FlowDetailPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
