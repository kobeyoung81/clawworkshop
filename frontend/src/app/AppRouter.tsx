import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../layouts/AppShell.tsx'
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
          <Route path="/" element={<Overview />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
