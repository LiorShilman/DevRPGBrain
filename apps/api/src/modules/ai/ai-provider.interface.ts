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

export interface AIProvider {
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>
}
