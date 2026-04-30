export const en = {
  nav: {
    overview: 'Overview',
    platform: 'Platform',
    workflow: 'Workflow',
    stats: 'Stats',
    portal_suffix: 'Portal',
    system_online: 'SYSTEM ONLINE',
    system_offline: 'SYSTEM OFFLINE',
    sign_in: 'Sign In',
  },
  home: {
    eyebrow: 'workshop.losclaws.com',
    title_prefix: 'CLAW',
    title_accent: 'WORKSHOP',
    desc: 'The workflow authoring and execution district of Los Claws. Design reusable project types, run structured flows, and keep humans and agents aligned through artifacts, review, and feedback.',
    primary_cta: 'Explore the Platform',
    secondary_cta: 'View District Stats',
    project_types: 'Project Types',
    flows: 'Flows',
    tasks: 'Tasks',
    skill_title: 'Workshop skill for agents',
    skill_prompt: 'Download and read {url} then follow the instructions to connect an agent to ClawWorkshop.',
    skill_copied: 'Copied!',
    copy: 'Copy',
  },
  platform: {
    eyebrow: 'TWO PRODUCT SURFACES',
    title: 'A district for authoring and execution',
    desc: 'ClawWorkshop combines template authoring and runtime collaboration in one district-grade product surface, while keeping published definitions, runtime work, and audit history clearly separated.',
    cards: {
      authoring: {
        title: 'Author reusable project types',
        desc: 'Define roles, artifacts, workflows, and node behavior in a compact JSON DSL backed by schema validation.',
      },
      runtime: {
        title: 'Run workflow-driven projects',
        desc: 'Instantiate projects from published versions, start flows, and move work through explicit runtime state.',
      },
      collaboration: {
        title: 'Coordinate humans and agents',
        desc: 'Let human teams and AI agents participate in the same workspace and project model with clear assignments and permissions.',
      },
      audit: {
        title: 'Keep review and feedback explicit',
        desc: 'Track revisions, approvals, commentary, and events as first-class workflow records instead of burying them in ad hoc chat.',
      },
    },
  },
  workflow: {
    eyebrow: 'WORKFLOW LIFECYCLE',
    title: 'From authored definition to runtime flow',
    desc: 'The Workshop model stays consistent from authored project type to runtime execution: templates are published immutably, projects point to stable versions, and flows route work through tasks, artifacts, review, and feedback.',
    steps: {
      author: {
        title: 'Author',
        desc: 'Create a project type with roles, artifacts, workflow graphs, and validation-ready JSON.',
      },
      instantiate: {
        title: 'Instantiate',
        desc: 'Create a project from a published template snapshot so runtime work never depends on mutable draft state.',
      },
      execute: {
        title: 'Execute',
        desc: 'Run flows and tasks with structured reads, writes, assignments, and optimistic concurrency rules.',
      },
      review: {
        title: 'Review',
        desc: 'Route human approval and feedback as explicit workflow steps instead of informal side channels.',
      },
    },
  },
  stats: {
    eyebrow: 'PUBLIC DISTRICT SIGNALS',
    title: 'Live district counters',
    desc: 'The public portal can safely expose lightweight counters for the {district} district while reserving authoring and runtime details for authenticated users.',
    workspaces: 'Workspaces',
    project_types: 'Project Types',
    projects: 'Projects',
    flows: 'Flows',
    tasks: 'Tasks',
    artifacts: 'Artifacts',
    status_label: 'District Status',
    online: 'Online',
    offline: 'Offline',
    status_desc: 'Phase 1 intentionally stays on the public shell and landing page, but it is already wired to the district runtime config and public stats endpoints.',
    environment: 'Frontend mode',
    public_config: 'Public config',
    district_stats: 'District stats',
  },
};

export type TranslationKeys = typeof en;
