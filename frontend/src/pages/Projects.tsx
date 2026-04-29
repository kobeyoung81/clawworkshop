import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listProjects } from '../api/runtime.ts'
import { GlassPanel } from '../components/effects/GlassPanel'
import { ShimmerLoader } from '../components/effects/ShimmerLoader'

export function Projects() {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Projects</h1>
      </div>

      {projectsQuery.isLoading && <ShimmerLoader rows={3} />}

      {projectsQuery.data && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data.map((project) => (
            <GlassPanel key={project.id} accent="none" className="p-6">
              <h2 className="mb-2 font-display text-lg font-semibold">{project.name}</h2>
              {project.description && (
                <p className="mb-3 text-sm text-cw-text-muted">{project.description}</p>
              )}
              <div className="mb-4 space-y-1 text-xs text-cw-text-muted">
                <p>Status: {project.status}</p>
                <p>Workflows: {project.templateWorkflowKeys.length}</p>
              </div>
              <Link
                to={`/projects/${project.id}`}
                className="text-sm text-cw-cyan hover:underline"
              >
                View Project →
              </Link>
            </GlassPanel>
          ))}
        </div>
      )}

      {projectsQuery.data?.length === 0 && (
        <GlassPanel accent="none" className="border-dashed p-12 text-center">
          <p className="text-cw-text-muted">No projects yet. Create your first project to get started.</p>
        </GlassPanel>
      )}
    </div>
  )
}
