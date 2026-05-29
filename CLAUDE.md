# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DevRPG Brain** is a local-first developer desktop app that solves context loss between coding sessions. It combines:
- An **AI Second Brain**: tracks progress, remembers decisions, summarizes sessions, and restores the exact context where you stopped.
- A **Developer RPG layer**: translates real work (commits, sessions, resolving blockers) into XP, levels, achievements, and boss fights.

The planning document is `DevRPG_Brain_Project_Plan_for_Claude_Code.md` (Hebrew). Refer to it for full specs.

## Tech Stack

- **Desktop**: Electron + React + TypeScript + Vite (`apps/desktop/`)
- **Backend API**: Node.js + TypeScript + Express (`apps/api/`)
- **Database**: Prisma + SQLite (MVP), structured for future PostgreSQL migration
- **Git integration**: `simple-git` npm package
- **AI**: Abstracted `AIProvider` interface — never hardcode a specific provider
- **Graph UI**: `@xyflow/react` + `@dagrejs/dagre` for dependency, architecture, and knowledge graphs
- **Syntax highlighting**: `highlight.js` v11 (clear `el.dataset['highlighted']` before re-highlighting)
- **Monorepo**: Turbo (`turbo.json`)

## Commands

```bash
npm install
npm run dev           # Both desktop + API together
npm run dev:api       # API only
npm run dev:desktop   # Desktop only
npm run prisma:migrate
npm run prisma:studio
npm run test
npm run lint
npm run build
```

## Architecture

### Monorepo Structure

```
apps/
  desktop/src/
    main/         # Electron main process (main.ts, preload.ts, ipc.ts)
    renderer/src/
      pages/      # ProjectDetailPage, DashboardPage, RpgPage, etc.
      components/ # DependencyGraph, etc.
      services/   # api.ts — all HTTP calls to the API
      utils/      # parseCodeSections.ts (TS/JS/Python/CSS parser)
      styles/     # global.css (single CSS file, ~3200 lines)
    shared/       # Shared types and constants between main/renderer
  api/src/
    modules/      # Feature modules (see table below)
    db/           # Prisma client: import from '../../db/client'
prisma/
  schema.prisma
  migrations/
```

Each API module follows the pattern: `<feature>.service.ts` / `<feature>.controller.ts` (types in `.service.ts` or a separate `.types.ts`).

### Core Modules

| Module | Location | Responsibility |
| --- | --- | --- |
| **Project Manager** | `modules/projects/` | CRUD for local projects; validates path existence |
| **Git Analyzer** | `modules/git/` | `simple-git` wrapper; produces `GitSnapshot` |
| **Repo Scanner** | `modules/scans/` | File tree scan; detects stack, TODO/FIXME counts; import graph; architecture detection |
| **Session Tracker** | `modules/sessions/` | Start/end sessions; AI summary; XP award; boss fight defeat on end |
| **AI Memory Engine** | (via MemoryItem model) | Stores `MemoryItem` records per project |
| **AI Provider Layer** | `modules/ai/` | `AIProvider` interface + Claude, OpenAI, Mock implementations |
| **RPG Engine** | `modules/rpg/` | XP events, `Math.floor(Math.sqrt(totalXp / 100)) + 1` level formula, achievements |
| **Project Health** | `modules/health/` | 0–100 score; triggers boss fight spawn when RISKY/ABANDONED |
| **Daily Briefing** | `modules/briefing/` | Morning dashboard card |
| **Brain / Chat** | `modules/brain/` | Per-project and global AI chat |
| **Files** | `modules/files/` | File tree, content, search, AI code analysis (stream + JSON) |
| **Boss Fights** | `modules/boss-fight/` | Spawn on RISKY/ABANDONED health; defeat on session end; +XP reward |
| **Context Restore** | `modules/context/` | SSE streaming AI card: reconstructs mental context from last session |
| **Knowledge Graph** | `modules/knowledge/` | Builds node/edge graph from sessions + memories |
| **Settings** | `modules/settings/` | AI provider config, API keys |
| **Import** | `modules/import/` | GitHub repo import |

### API Endpoints (key ones)

```
GET/POST /api/projects/:id/sessions/start|end|active|last
POST     /api/projects/:id/files/analyze/stream   ← SSE streaming code analysis
POST     /api/projects/:id/context/restore         ← SSE streaming context restoration
GET      /api/projects/:id/knowledge               ← knowledge graph nodes+edges
GET      /api/boss-fights                          ← all active boss fights
GET      /api/projects/:id/boss-fight              ← active boss for project
GET      /api/projects/:id/dependencies            ← import edges + architecture
```

### AI Provider Interface (current)

```ts
interface AIProvider {
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>
  chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput>
  chatGlobal(input: GlobalChatInput): Promise<ProjectChatOutput>
  analyzeCode(input: CodeAnalysisInput): Promise<CodeAnalysisOutput>
  analyzeCodeStream(input: CodeAnalysisInput, onChunk: (text: string) => void): Promise<void>
  restoreContext(input: ContextRestoreInput, onChunk: (text: string) => void): Promise<void>
}
```

All streaming methods follow SSE pattern: `res.flushHeaders()` → `res.write('data: ...\n\n')` → `res.write('data: [DONE]\n\n')`.
MockAIProvider must implement every method.

### Key Data Flows

**End Session:**
1. Save end time → calculate duration
2. Run `AIProvider.summarizeSession()` (non-blocking failure)
3. Award XP via `XpEvent`; check achievements
4. Call `defeatBossFight(projectId, sessionId)` → bonus XP if active boss
5. Recalculate health → `checkAndSpawnBossFight()` for new health status

**Context Restore Card:**

- `POST /api/projects/:id/context/restore` → SSE
- Gathers: last session (summary, decisions, blockers, nextSteps), git snapshot, recent memories
- Streams AI response: Where You Left Off → Open Threads → Next Actions → Cognitive Snapshot → Energy Check

**Knowledge Graph:**

- Sessions = blue nodes; decisions/blockers/nextSteps = colored child nodes; memories = gold nodes
- Edges connect session → its items; memories connected to closest session by date
- Layout via Dagre (`rankdir: TB`)

### ProjectDetailPage Tabs

`overview | graph | architecture | branches | radar | files | search | brain | knowledge`

- **overview**: project info + health + sessions + **Context Restoration Card** (AI streaming)
- **graph**: import dependency graph (ReactFlow + Dagre)
- **architecture**: detected components diagram (ReactFlow + Dagre)
- **radar**: Tech Radar SVG (4 quadrants, 4 rings)
- **files**: file tree + CodeViewer + CodeMap (per-section AI analysis, streaming)
- **search**: fuzzy file/content search
- **brain**: per-project AI chat
- **knowledge**: knowledge graph (ReactFlow + Dagre, 5 node types)

### CSS Conventions

**No JSX `style` prop** — the linter flags ALL `style={{ }}` attributes.

Allowed patterns:

```tsx
// 1. Imperative via useRef (preferred for dynamic values)
const ref = useRef<HTMLDivElement>(null)
useEffect(() => { ref.current?.style.setProperty('--var', value) }, [value])
return <div ref={ref} className="..." />

// 2. Fixed-set values → CSS classes per index/type
className={`blip-q${quadrantIndex}`}   // CSS: .blip-q0 { --blip-col: #8B5CF6; }
className={`cm-type-${section.type}`}  // CSS: .cm-type-function { --cm-color: #22C55E; }
```

All styles live in `apps/desktop/src/renderer/src/styles/global.css` (single file, append new styles at the end).

### Electron IPC Boundary

The **main process** handles file system, Git, and DB. The **renderer** communicates only through IPC channels defined in `ipc.ts`/`preload.ts`. Never import Node.js modules in renderer code.

## Critical Constraints

- **TypeScript strict mode** throughout.
- **Never bind to a single AI provider** — always use `AIProvider` interface.
- **Never scan** `.env`, secrets, private keys, or credential files.
- **Never send full source code to AI** — only metadata, summaries, file paths.
- **SQLite first** — schema designed so switching to PostgreSQL only requires a provider change.
- API keys stored locally only.

## UI Design Tokens

| Token | Value |
|---|---|
| Background | `#0f172a` |
| Surface | `#111827` |
| Surface-2 | `#1e293b` |
| Primary | `#38bdf8` |
| Success | `#22c55e` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Accent | `#a78bfa` |
| Text | `#f1f5f9` |
| Text muted | `#94a3b8` |
