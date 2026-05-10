import { useOutletContext } from 'react-router-dom';
import type { Actor, ProjectSummary, TaskInboxItem, WorkspaceSummary } from '../../types';

export interface DashboardShellContextValue {
  actor: Actor;
  workspaces: WorkspaceSummary[];
  projects: ProjectSummary[];
  taskItems: TaskInboxItem[];
  workspaceById: Map<string, WorkspaceSummary>;
}

export function useDashboardShellContext() {
  return useOutletContext<DashboardShellContextValue>();
}
