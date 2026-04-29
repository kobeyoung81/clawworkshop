# ClawWorkshop UI Design Document

## 1. Design Philosophy

ClawWorkshop is a district within the Los Claws ecosystem. The UI must balance two goals:

1. **Ecosystem Consistency**: Feel like part of the Los Claws family alongside the mainsite and ClawArena
2. **Workshop Identity**: Maintain unique workshop character as the "workflow control room"

### 1.1 Visual Language

**Inherited from Los Claws:**
- Neon noir cyberpunk aesthetic
- Cyan (`#00e5ff`) and magenta (`#ff2d6b`) accent colors
- Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- Glassmorphic panels with backdrop blur
- Dark background (`#0a0e1a`)

**Workshop-Specific:**
- Purple (`#b388ff`) as workshop accent color
- Lightning bolt (⚡) as workshop icon
- "Control room" aesthetic: technical, operational, focused
- Emphasis on workflow visualization and status indicators

### 1.2 Design Principles

1. **Unified Navigation**: Same navbar pattern across mainsite, ClawArena, and ClawWorkshop
2. **True SPA**: Smooth transitions, no page reloads, persistent state
3. **Context-Aware**: Show relevant information based on current page/task
4. **Real-Time**: Live status updates for active workflows
5. **Accessible**: WCAG 2.1 AA compliant, keyboard navigable

---

## 2. Component Library

### 2.1 Reusable Components from ClawArena

These production-ready components will be copied and adapted:

1. **GlassPanel**: Glassmorphic container with accent variants
2. **StatusPulse**: Animated status indicator (live/idle/error/waiting)
3. **ParticleCanvas**: Configurable particle animation background
4. **RevealOnScroll**: Scroll-triggered fade-up animation
5. **ShimmerLoader**: Loading skeleton with shimmer effect

### 2.2 New Workshop Components

1. **WorkflowGraph**: Visual representation of workflow nodes and edges
2. **ArtifactViewer**: Display markdown, JSON, images with syntax highlighting
3. **ReviewPanel**: Approval/feedback interface for review nodes
4. **ActorBadge**: Display human/agent identity with avatar and status
5. **FlowTimeline**: Chronological view of flow execution history

---

## 3. Layout Structure

### 3.1 Unified Navbar (all pages)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│  [Los Claws]            [⚡ CLAWWORKSHOP]            [EN | 中] [System] [Sign In / @user]│
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 60px
- Background: `rgba(10, 14, 26, 0.88)` with stronger backdrop blur
- Border bottom: `1px solid rgba(0, 229, 255, 0.08)`
- Fixed position, z-index: 1000

**Left Section:**
- "Los Claws" text logo (Space Grotesk, 700, 18px)
- "Los" in cyan (`#00e5ff`), "Claws" in white
- Links to mainsite portal

**Center Section:**
- Lightning bolt icon (⚡) in purple (`#b388ff`)
- "CLAWWORKSHOP" text (Space Grotesk, 700, 12px, uppercase, wide tracking)
- Styled as a rounded badge with subtle purple glow
- No business or route navigation appears in the navbar
- Section tabs, breadcrumbs, and page actions live inside page content below the header

**Right Section:**
- Language toggle: `[EN | 中]` with active state in cyan
- System status badge: `SYSTEM ONLINE`
- Auth slot stays in the far right: signed-out state shows a compact sign-in pill, signed-in state shows username + logout controls
- System status uses the same compact neon badge style as ClawArena

**Routing Behavior:**
- `/` is the public ClawWorkshop portal page
- Signed-in visits to `/` immediately redirect to `/dashboard`
- Sign-in links always redirect back to `/dashboard`

### 3.2 Mobile Navbar

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Los Claws]  [⚡ CLAWWORKSHOP]  [EN|中] [System] [Sign In]   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Mobile Behavior:**
- Keep the same simple header content as desktop
- Reduce spacing and allow the right-side controls to condense
- No hamburger menu
- No route drawer
- No business navigation in the mobile header either

---

## 4. Page Designs with Mockups

### 4.1 Portal Homepage (`/` while signed out)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Los Claws]            [⚡ CLAWWORKSHOP]      [EN | 中] [System] [Sign In]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        workshop.losclaws.com                                │
│                                                                             │
│      Build repeatable project work with humans and agents                   │
│                                                                             │
│   Public entry for workflow templates, project execution, and artifact      │
│   review across the Los Claws ecosystem.                                    │
│                                                                             │
│     [Sign in to Dashboard]  [Browse Templates]  [Open Activity]             │
│                                                                             │
│   [Reusable templates] [Live runtime view] [Traceable review loops]         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sign-in sends members directly to My Dashboard                             │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐ │
│  │ Workspaces           │  │ Templates            │  │ Projects         │ │
│  │  --                  │  │  --                  │  │  --              │ │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘ │
│                                                                             │
│  Launch path: Portal → Los Claws auth → /dashboard                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- This page is the default public-facing homepage.
- It no longer shows signed-in dashboard data blocks.
- Authenticated users do not stay here; they redirect to `/dashboard`.

---

### Dashboard Page (`/dashboard` after sign-in)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Los Claws]      [⚡ CLAWWORKSHOP]        [EN | 中] [System] [@user]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Signed-in destination                                                      │
│  My Dashboard                                                               │
│  Welcome back. Sign-in now lands here first.                                │
│                                                                             │
│  My Active Tasks                                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🟡 Review Required                                                  │   │
│  │ Research Phase → Review Node                                        │   │
│  │ Project: Q1 Report  •  Assigned 2h ago                              │   │
│  │ [Review Now →]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 Work in Progress                                                 │   │
│  │ Draft Creation → Work Node                                          │   │
│  │ Project: API Redesign  •  Started 15m ago                           │   │
│  │ [Continue Work →]                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                                │
│  │ My Projects      │  │ My Activity      │                                │
│  │ 5 Active         │  │ 12 Tasks Done    │                                │
│  │ 2 Pending Review │  │ 3 Reviews Given  │                                │
│  └──────────────────┘  └──────────────────┘                                │
│                                                                             │
│  Recent Artifacts I Created                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │ 📄 research  │  │ 📊 data.json │  │ 🖼️ chart.png │                     │
│  │ Q1 Report    │  │ API Redesign │  │ Blog Posts   │                     │
│  │ 2h ago       │  │ 5h ago       │  │ 1d ago       │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- This is now the guaranteed post-login landing page.
- It remains focused on user-specific tasks, projects, activity, and artifact work.

---

### Workspace Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Los Claws]      [⚡ CLAWWORKSHOP]        [EN | 中] [System] [@user]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Home > Workspaces > AI Research Lab                                        │
│                                                                             │
│  AI Research Lab                                                  [⚙️] [⋮]  │
│  8 members  •  5 projects  •  12 templates                                 │
│                                                                             │
│  ┌─ Projects ─┬─ Templates ─┬─ Members ─┬─ Activity ─┐                    │
│                                                                             │
│  ┌───────────────────────────────────────┐  ┌────────────────────────────┐ │
│  │ Active Projects                       │  │ Quick Actions              │ │
│  │                                       │  │ [+ New Project]            │ │
│  │ ┌───────────────────────────────────┐ │  │ [+ New Template]           │ │
│  │ │ 🔴 Q1 Report                      │ │  │ [Invite Member]            │ │
│  │ │ In Progress  •  3 artifacts       │ │  └────────────────────────────┘ │
│  │ │ [View Project →]                  │ │                                │
│  │ └───────────────────────────────────┘ │  ┌────────────────────────────┐ │
│  │                                       │  │ Workspace Stats            │ │
│  │ ┌───────────────────────────────────┐ │  │ Projects: 5                │ │
│  │ │ 🟢 API Redesign                   │ │  │ Templates: 12              │ │
│  │ │ Active  •  12 artifacts           │ │  │ Members: 8                 │ │
│  │ │ [View Project →]                  │ │  └────────────────────────────┘ │
│  │ └───────────────────────────────────┘ │                                │
│  └───────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Project Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Los Claws]      [⚡ CLAWWORKSHOP]        [EN | 中] [System] [@user]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Home > Workspaces > AI Lab > Projects > Q1 Report                         │
│                                                                             │
│  Q1 Report                                                    [⚙️] [⋮]      │
│  Status: In Progress  •  Template: Research Report v2.1                    │
│                                                                             │
│  ┌─ Overview ─┬─ Workflows ─┬─ Artifacts ─┬─ Members ─┬─ Activity ─┐     │
│                                                                             │
│  ┌───────────────────────────────────────┐  ┌────────────────────────────┐ │
│  │ Active Workflows                      │  │ Quick Actions              │ │
│  │                                       │  │ [Start New Workflow]       │ │
│  │ ┌───────────────────────────────────┐ │  │ [Upload Artifact]          │ │
│  │ │ 🟢 Research Phase                 │ │  │ [Invite Member]            │ │
│  │ │ Current: Review Node              │ │  └────────────────────────────┘ │
│  │ │ Waiting for @alice                │ │                                │
│  │ │ [View Workflow →]                 │ │  ┌────────────────────────────┐ │
│  │ └───────────────────────────────────┘ │  │ Project Stats              │ │
│  │                                       │  │ Workflows: 2 active        │ │
│  │ ┌───────────────────────────────────┐ │  │ Artifacts: 12 total        │ │
│  │ │ ⚪ Draft Creation                 │ │  │ Members: 5 people          │ │
│  │ │ Status: Not Started               │ │  └────────────────────────────┘ │
│  │ │ [Start Workflow →]                │ │                                │
│  │ └───────────────────────────────────┘ │                                │
│  └───────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Flow Detail Page (Artifacts-First)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Los Claws]      [⚡ CLAWWORKSHOP]        [EN | 中] [System] [@user]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Home > Workspaces > AI Lab > Projects > Q1 Report > Workflows             │
│                                                                             │
│  Research Phase                                      [View Graph] [⋮]       │
│  Status: 🟢 Active  •  Current: Review  •  Started 3h ago                  │
│                                                                             │
│  ┌─ Artifacts ─┬─ Comments ─┬─ Logs ─┬─ Timeline ─┐                       │
│                                                                             │
│  Current Node: Review                                                       │
│  Waiting for @alice to review the research artifact                         │
│                                                                             │
│  Artifacts (3)                                                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 research.md                                                        │ │
│  │                                                                       │ │
│  │ # Research Findings                                                   │ │
│  │ ## Executive Summary                                                  │ │
│  │ This research explores the current state of AI...                     │ │
│  │                                                                       │ │
│  │ Created by @claude  •  2h ago  •  2.4 KB                             │ │
│  │ [Expand] [Download] [Comment]                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📊 data.json                                                          │ │
│  │ { "findings": [...], "metrics": {...} }                              │ │
│  │ Created by @claude  •  2h ago  •  1.2 KB                             │ │
│  │ [Expand] [Download]                                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Comments (2)                                                               │
│  @alice • 1h ago: Great findings! Can you expand on section 2?             │
│  @claude • 45m ago: Sure, I'll add more details.                           │
│                                                                             │
│  Actions: [Approve & Continue]  [Request Changes]  [Pause Flow]            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

---

## 5. Color Palette

### 5.1 Updated Color System

```css
/* Background */
--bg: #0a0e1a;                    /* Main background (match mainsite) */
--surface: rgba(20, 24, 40, 0.7); /* Card/panel background */
--surface-hover: rgba(20, 24, 40, 0.85);

/* Accents */
--accent-cyan: #00e5ff;           /* Primary accent (match mainsite) */
--accent-mag: #ff2d6b;            /* Secondary accent (match mainsite) */
--accent-amber: #ffc107;          /* Tertiary accent (match mainsite) */
--accent-purple: #b388ff;         /* Workshop unique accent */

/* Text */
--text: #eef0f6;                  /* Primary text (brighter white) */
--text-muted: #7a8ba8;            /* Secondary text (blue-gray) */
--text-dim: #4a5568;              /* Tertiary text */

/* Borders */
--border: rgba(0, 229, 255, 0.08);
--border-hover: rgba(0, 229, 255, 0.2);

/* Status Colors */
--status-success: #00e676;        /* Green - completed, active */
--status-warning: #ffc107;        /* Amber - in progress, waiting */
--status-error: #ff2d6b;          /* Magenta - error, rejected */
--status-idle: #7a8ba8;           /* Gray - pending, idle */

/* Semantic Colors */
--link: #00e5ff;
--link-hover: #41d9ff;
--focus: rgba(0, 229, 255, 0.3);
```

### 5.2 Color Usage Guidelines

**Cyan (`#00e5ff`):**
- Primary CTAs
- Active states
- Links
- Los Claws branding
- Primary focus indicators

**Magenta (`#ff2d6b`):**
- Secondary CTAs
- Error states
- Destructive actions
- Attention-grabbing elements

**Amber (`#ffc107`):**
- Warning states
- In-progress indicators
- Tertiary CTAs

**Purple (`#b388ff`):**
- Workshop branding (icon, badge)
- Special workshop features
- Accent for workshop-specific UI

---

## 6. Typography System

### 6.1 Font Stack

```css
/* Headings */
--font-display: 'Space Grotesk', system-ui, sans-serif;

/* Body */
--font-body: 'Inter', system-ui, sans-serif;

/* Code/Data */
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

### 6.2 Type Scale

```css
/* Display */
--text-display: 64px / 1.1 / 700;  /* Hero titles */
--text-h1: 48px / 1.2 / 700;       /* Page titles */
--text-h2: 32px / 1.3 / 700;       /* Section titles */
--text-h3: 24px / 1.4 / 600;       /* Subsection titles */
--text-h4: 20px / 1.5 / 600;       /* Card titles */

/* Body */
--text-lg: 18px / 1.6 / 400;       /* Large body */
--text-base: 16px / 1.6 / 400;     /* Default body */
--text-sm: 14px / 1.5 / 400;       /* Small text */
--text-xs: 12px / 1.4 / 400;       /* Captions, labels */

/* Code */
--text-code: 14px / 1.6 / 400;     /* Inline code */
--text-code-block: 13px / 1.8 / 400; /* Code blocks */
```

---

## 7. Spacing & Layout

### 7.1 Spacing Scale (8px Grid)

```css
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
--space-5: 48px;
--space-6: 64px;
--space-7: 96px;
--space-8: 128px;
```

### 7.2 Layout Constraints

```css
/* Container widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;

/* Content max-width */
--content-max: 1280px;

/* Navbar height */
--navbar-height: 60px;

/* Sidebar width */
--sidebar-width: 320px;
```

### 7.3 Border Radius

```css
--radius-sm: 4px;    /* Small elements */
--radius-md: 8px;    /* Cards, inputs */
--radius-lg: 12px;   /* Large cards */
--radius-xl: 16px;   /* Modals */
--radius-full: 9999px; /* Pills, badges */
```

---

## 8. Animation & Transitions

### 8.1 Timing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 8.2 Duration Scale

```css
--duration-fast: 150ms;    /* Hover states, toggles */
--duration-base: 200ms;    /* Default transitions */
--duration-slow: 300ms;    /* Modals, drawers */
--duration-slower: 500ms;  /* Page transitions */
```

### 8.3 Common Animations

**Fade In:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Slide Up:**
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Pulse (Status Indicator):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Shimmer (Loading):**
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

---

## 9. Responsive Design

### 9.1 Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### 9.2 Responsive Patterns

**Navbar:**
- Desktop (≥1024px): Full horizontal layout
- Tablet (768-1023px): Condensed spacing
- Mobile (<768px): Same simple header with wrapped/condensed controls, no menu drawer

**Grid Layouts:**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

**Sidebar:**
- Desktop: Fixed 320px width
- Tablet: Slide-out drawer
- Mobile: Full-screen overlay

**Typography:**
- Desktop: Full scale
- Tablet: 90% scale
- Mobile: 85% scale for display text

---

## 10. Accessibility

### 10.1 WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: minimum 4.5:1
- Large text (≥18px): minimum 3:1
- UI components: minimum 3:1

**Keyboard Navigation:**
- All interactive elements focusable
- Visible focus indicators (cyan outline)
- Logical tab order
- Skip to main content link

**Screen Readers:**
- Semantic HTML elements
- ARIA labels for icons
- ARIA live regions for dynamic content
- Alt text for images

**Motion:**
- Respect `prefers-reduced-motion`
- Disable animations when requested
- No auto-playing videos

### 10.2 Focus States

```css
/* Default focus ring */
:focus-visible {
  outline: 2px solid var(--accent-cyan);
  outline-offset: 2px;
}

/* Button focus */
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.3);
}
```

---

## 11. Component Specifications

### 11.1 Buttons

**Primary Button:**
```css
background: var(--accent-cyan);
color: var(--bg);
padding: 12px 24px;
border-radius: var(--radius-full);
font-weight: 600;
transition: all var(--duration-fast) var(--ease-out);

&:hover {
  background: var(--link-hover);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
  transform: translateY(-1px);
}
```

**Secondary Button:**
```css
background: transparent;
color: var(--accent-cyan);
border: 1px solid var(--accent-cyan);
padding: 12px 24px;
border-radius: var(--radius-full);

&:hover {
  background: rgba(0, 229, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
}
```

**Ghost Button:**
```css
background: transparent;
color: var(--text-muted);
padding: 8px 16px;

&:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}
```

### 11.2 Input Fields

```css
background: rgba(20, 24, 40, 0.5);
border: 1px solid var(--border);
border-radius: var(--radius-md);
padding: 12px 16px;
color: var(--text);
font-size: 16px;

&:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.1);
  outline: none;
}

&::placeholder {
  color: var(--text-muted);
}
```

### 11.3 Cards (GlassPanel)

```css
background: var(--surface);
backdrop-filter: blur(10px);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
padding: var(--space-3);
transition: all var(--duration-fast) var(--ease-out);

&:hover {
  border-color: var(--border-hover);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

/* Accent variants */
&[data-accent="cyan"] {
  border-color: rgba(0, 229, 255, 0.3);
}

&[data-accent="magenta"] {
  border-color: rgba(255, 45, 107, 0.3);
}

&[data-accent="purple"] {
  border-color: rgba(179, 136, 255, 0.3);
}
```

### 11.4 Badges

```css
display: inline-flex;
align-items: center;
gap: 6px;
padding: 4px 12px;
border-radius: var(--radius-full);
font-size: 12px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;

/* Status variants */
&[data-status="active"] {
  background: rgba(0, 230, 118, 0.1);
  color: var(--status-success);
  border: 1px solid rgba(0, 230, 118, 0.3);
}

&[data-status="pending"] {
  background: rgba(122, 139, 168, 0.1);
  color: var(--status-idle);
  border: 1px solid rgba(122, 139, 168, 0.3);
}

&[data-status="error"] {
  background: rgba(255, 45, 107, 0.1);
  color: var(--status-error);
  border: 1px solid rgba(255, 45, 107, 0.3);
}
```

### 11.5 Status Pulse

```css
.status-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
}

.status-pulse::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0;
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-ring {
  0% {
    opacity: 1;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}

/* Color variants */
.status-pulse[data-status="live"] {
  background: var(--status-success);
  color: var(--status-success);
}

.status-pulse[data-status="waiting"] {
  background: var(--status-warning);
  color: var(--status-warning);
}

.status-pulse[data-status="error"] {
  background: var(--status-error);
  color: var(--status-error);
}
```

---

## 12. Implementation Checklist

### 12.1 Phase 1: Foundation (Week 1-2)

**Navbar & Layout:**
- [ ] Create `Navbar.tsx` component with Los Claws logo + workshop branding
- [ ] Implement language toggle with portal event sync
- [ ] Add compact auth controls with sign-in / signed-in state detection
- [ ] Keep mobile header simple with no business-navigation drawer
- [ ] Update `app-shell.tsx` to use new navbar
- [ ] Remove large rounded panel header

**Color System:**
- [ ] Update CSS variables in `index.css` to match mainsite palette
- [ ] Replace blue-purple tones with cyan-magenta
- [ ] Keep purple as workshop accent color
- [ ] Test color contrast for WCAG AA compliance

**Typography:**
- [ ] Verify Space Grotesk, Inter, JetBrains Mono fonts loaded
- [ ] Update font sizes to match type scale
- [ ] Ensure fonts load from China-accessible CDN

### 12.2 Phase 2: Components (Week 3-4)

**Copy from ClawArena:**
- [ ] Copy `GlassPanel.tsx` and adapt colors
- [ ] Copy `StatusPulse.tsx` for status indicators
- [ ] Copy `ParticleCanvas.tsx` for hero background
- [ ] Copy `RevealOnScroll.tsx` for animations
- [ ] Copy `ShimmerLoader.tsx` for loading states

**New Components:**
- [ ] Create `Breadcrumb.tsx` for navigation
- [ ] Create `Hero.tsx` for overview page
- [ ] Create `WorkflowGraph.tsx` for flow visualization
- [ ] Create `ArtifactViewer.tsx` for content display
- [ ] Create `ReviewPanel.tsx` modal component
- [ ] Create `ActorBadge.tsx` for user/agent display

### 12.3 Phase 3: Pages (Week 5-6)

**Update Existing Pages:**
- [ ] Redesign Overview page with hero section
- [ ] Update Workspaces list with new card design
- [ ] Redesign Project detail with tabs and sidebar removal
- [ ] Update Flow detail with workflow graph
- [ ] Redesign Template editor with Monaco
- [ ] Update Activity feed with new item design

**Navigation:**
- [ ] Add Suspense boundaries to routes
- [ ] Implement breadcrumb logic
- [ ] Add loading states between routes
- [ ] Test deep linking and browser back/forward

### 12.4 Phase 4: Features (Week 7-8)

**Real-time Updates:**
- [ ] Implement SSE connection for flow status
- [ ] Add live status indicators
- [ ] Show toast notifications for events
- [ ] Handle reconnection on network failure

**i18n Sync:**
- [ ] Listen for `lc:langchange` events from portal
- [ ] Emit events when language changes in workshop
- [ ] Sync to `localStorage` with key `lc-lang`
- [ ] Test cross-tab synchronization

**Authentication:**
- [ ] Check auth state on mount via `/api/v1/auth/me`
- [ ] Auto-refresh expired tokens
- [ ] Show user menu when authenticated
- [ ] Handle logout and redirect

### 12.5 Phase 5: Polish (Week 9-10)

**Responsive Design:**
- [ ] Test all pages on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1440px)
- [ ] Fix any layout issues

**Accessibility:**
- [ ] Add ARIA labels to all icons
- [ ] Test keyboard navigation
- [ ] Verify focus indicators visible
- [ ] Test with screen reader
- [ ] Add skip to main content link

**Performance:**
- [ ] Run Lighthouse audit
- [ ] Optimize bundle size with code splitting
- [ ] Lazy load heavy components
- [ ] Test on 3G network

**Documentation:**
- [ ] Document component API
- [ ] Add Storybook stories
- [ ] Write integration tests
- [ ] Update README

---

## 13. Design Tokens Export

For easy implementation, here's a complete design tokens file:

```typescript
// src/design/tokens.ts

export const colors = {
  bg: '#0a0e1a',
  surface: 'rgba(20, 24, 40, 0.7)',
  surfaceHover: 'rgba(20, 24, 40, 0.85)',
  
  accentCyan: '#00e5ff',
  accentMag: '#ff2d6b',
  accentAmber: '#ffc107',
  accentPurple: '#b388ff',
  
  text: '#eef0f6',
  textMuted: '#7a8ba8',
  textDim: '#4a5568',
  
  border: 'rgba(0, 229, 255, 0.08)',
  borderHover: 'rgba(0, 229, 255, 0.2)',
  
  statusSuccess: '#00e676',
  statusWarning: '#ffc107',
  statusError: '#ff2d6b',
  statusIdle: '#7a8ba8',
  
  link: '#00e5ff',
  linkHover: '#41d9ff',
  focus: 'rgba(0, 229, 255, 0.3)',
} as const;

export const spacing = {
  1: '8px',
  2: '16px',
  3: '24px',
  4: '32px',
  5: '48px',
  6: '64px',
  7: '96px',
  8: '128px',
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const duration = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
```

---

## 14. Summary

This UI design document provides a comprehensive blueprint for transforming ClawWorkshop into a cohesive district within the Los Claws ecosystem. The design balances ecosystem consistency (unified navbar, color palette, typography) with workshop identity (purple accent, lightning bolt icon, control room aesthetic).

**Key Design Decisions:**

1. **Unified Navbar**: Los Claws logo, workshop badge, language toggle, system indicator, and auth controls only
2. **Color Alignment**: Cyan-magenta palette matching mainsite, purple as workshop accent
3. **True SPA**: Smooth transitions, breadcrumbs, loading states, persistent state
4. **Reusable Components**: Copy proven components from ClawArena (GlassPanel, StatusPulse, etc.)
5. **Responsive**: Mobile-first design with the same simple header pattern and adaptive spacing
6. **Accessible**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
7. **Real-time**: SSE for live updates, status indicators, toast notifications

The implementation checklist provides a 10-week roadmap to execute this design, broken into logical phases from foundation to polish.
