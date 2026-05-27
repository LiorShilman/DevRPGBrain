export interface SessionSummaryInput {
  projectName: string
  durationMinutes: number
  userNotes: string
  blockers: string[]
  nextSteps: string[]
  changedFiles?: string[]
  commitMessages?: string[]
}

export interface SessionSummaryOutput {
  summary: string
  keyDecisions: string[]
  extractedBlockers: string[]
  extractedNextSteps: string[]
}

export interface BriefingProjectInput {
  name: string
  healthScore: number
  healthStatus: string
  daysSinceLastSession: number | null
  lastSessionSummary: string | null
  nextSteps: string[]
  blockers: string[]
  xpPotential: number
}

export interface DailyBriefingInput {
  projects: BriefingProjectInput[]
  currentLevel: number
  totalXp: number
}

export interface DailyBriefingOutput {
  recommendedProject: string
  why: string
  risk: string
  suggestedAction: string
  xpReward: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProjectChatInput {
  projectName: string
  projectDescription: string | null
  language: string | null
  framework: string | null
  isGitRepo: boolean
  gitBranch: string | null
  lastCommitMessage: string | null
  recentSessions: {
    summary: string | null
    nextSteps: string[]
    blockers: string[]
    durationMinutes: number | null
    endedAt: string | null
  }[]
  health: { score: number; status: string; recommendations: string[] } | null
  history: ChatMessage[]
  question: string
}

export interface ProjectChatOutput {
  reply: string
}

export interface AIProvider {
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>
  chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput>
}
