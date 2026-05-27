# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DevRPG Brain** is a local-first developer desktop app that solves context loss between coding sessions. It combines:
- An **AI Second Brain**: tracks progress, remembers decisions, summarizes sessions, and restores the exact context where you stopped.
- A **Developer RPG layer**: translates real work (commits, sessions, resolving blockers) into XP, levels, achievements, and boss fights.

The planning document is `DevRPG_Brain_Project_Plan_for_Claude_Code.md` (Hebrew). Refer to it for full specs.

## Tech Stack

- **Desktop**: Electron + React + TypeScript + Vite (`apps/desktop/`)
- **Backend API**: Node.js + TypeScript + Express or Fastify (`apps/api/`)
- **Database**: Prisma + SQLite (MVP), structured for future PostgreSQL migration
- **Git integration**: `simple-git` npm package
- **AI**: Abstracted `AIProvider` interface — never hardcode a specific provider
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
    renderer/     # React UI (pages/, components/, hooks/, services/)
    shared/       # Shared types and constants between main/renderer
  api/src/
    modules/      # Feature modules (projects, git, scans, sessions, ai, rpg, briefing, health)
    db/           # Prisma client and helpers
    shared/       # Shared types
prisma/
  schema.prisma   # Database schema
  migrations/
```

Each API module follows the pattern: `<feature>.types.ts` / `<feature>.service.ts` / `<feature>.controller.ts`.

### Core Modules

| Module | Responsibility |
|---|---|
| **Project Manager** | CRUD for local projects; validates path existence and Git status |
| **Git Analyzer** | `simple-git` wrapper; produces `GitSnapshot` (branch, commits, changed files) |
| **Repo Scanner** | File tree scan; detects stack, counts TODO/FIXME; skips `node_modules`, `dist`, `.git`, `build`, `.next`, `coverage` |
| **Session Tracker** | Manual start/end sessions; on end: collects notes + Git diff metadata + runs AI summary |
| **AI Memory Engine** | Stores `MemoryItem` records (SESSION_SUMMARY, DECISION, BLOCKER, NEXT_STEP, MILESTONE, PATTERN) per project |
| **AI Provider Layer** | Single `AIProvider` interface implemented by OpenAIProvider, ClaudeProvider, GeminiProvider, MockAIProvider |
| **Prompt Templates** | All prompts live in `apps/api/src/modules/ai/prompts/` as separate `.prompt.ts` files |
| **RPG Engine** | XP events, level formula `Math.floor(Math.sqrt(totalXp / 100)) + 1`, achievements, boss fights |
| **Project Health** | 0–100 score from Git activity + sessions + TODO count + open blockers + docs presence |
| **Daily Briefing** | Morning dashboard card: recommended project, next action, risk warnings, XP opportunity |

### Key Data Flow

**End Session:**
1. Save end time → calculate duration
2. Collect Git diff metadata
3. Ask user 3 questions (worked on / blocked by / next step)
4. Send context to `AIProvider.summarizeSession()` → JSON response
5. Save `WorkSession` with `aiSummary`, `blockers`, `decisions`, `nextSteps`
6. Create `MemoryItem` records automatically
7. Award XP via `XpEvent`; check achievement unlocks; update `ProjectHealth`

**AI calls always send a transparent data policy object:**
```ts
{ provider, purpose, dataSent: { projectName, changedFiles, commitMessages, fullCode: false, envFiles: false } }
```

### AI Provider Interface

```ts
interface AIProvider {
  generateText(input: AIGenerateInput): Promise<AIGenerateOutput>;
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>;
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>;
  analyzeProjectHealth(input: ProjectHealthInput): Promise<ProjectHealthOutput>;
}
```

All AI prompts return **JSON only**. `MockAIProvider` must be created first so the app is testable without API keys.

### Electron IPC Boundary

Maintain strict separation: the **main process** handles file system, Git, and DB access; the **renderer** communicates only through IPC channels defined in `ipc.ts` and exposed via `preload.ts`. Never import Node.js modules directly in renderer code.

## Implementation Phases (from planning doc)

Implement in order: Phase 0 (bootstrap) → Phase 1 (DB + projects) → Phase 2 (Git) → Phase 3 (Repo scanner) → Phase 4 (sessions) → Phase 5 (AI summary) → Phase 6 (continue card) → Phase 7 (RPG basics) → Phase 8 (achievements) → Phase 9 (health score) → Phase 10 (briefing) → Phase 11 (Ask Project Brain chat) → Phase 12 (polish + packaging).

After each phase verify: app still runs, new feature has acceptance criteria met, tests pass.

## Critical Constraints

- **TypeScript strict mode** throughout.
- **Never bind to a single AI provider** — always use `AIProvider` interface.
- **Never scan** `.env`, secrets, private keys, or credential files.
- **Never send full source code to AI** by default — only metadata and summaries.
- **SQLite first** — design Prisma schema so switching to PostgreSQL only requires a provider change.
- API keys stored locally only; privacy mode must be an available setting.

## UI Design Tokens

Dark professional developer aesthetic:

| Token | Value |
|---|---|
| Background | `#0f172a` |
| Cards | `#111827` |
| Primary | `#38bdf8` |
| Success | `#22c55e` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Text | `#e5e7eb` |
