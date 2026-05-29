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

export interface GlobalChatProjectSummary {
  name: string
  description: string | null
  language: string | null
  framework: string | null
  detectedStack: string[]
  detectedLanguages: string[]
  isGitRepo: boolean
  isPrivate: boolean
  healthScore: number | null
  healthStatus: string | null
  lastSessionDate: string | null
  lastSessionSummary: string | null
  openBlockers: string[]
  nextSteps: string[]
  sessionCount: number
}

export interface GlobalChatInput {
  projects: GlobalChatProjectSummary[]
  rpgLevel: number
  totalXp: number
  history: ChatMessage[]
  question: string
}

export interface CodeAnalysisInput {
  filePath: string
  content: string
  language: string
  projectName: string
  sectionName?: string
  sectionType?: string
}

export interface CodeAnalysisOutput {
  summary: string
  howItWorks: string
  keyDecisions: string[]
  dependencies: string[]
  suggestions: string[]
}

export interface ContextRestoreInput {
  projectName: string
  description: string | null
  lastSession: {
    startedAt: string
    endedAt: string | null
    durationMinutes: number | null
    aiSummary: string | null
    blockers: string[]
    decisions: string[]
    nextSteps: string[]
  } | null
  gitBranch: string | null
  lastCommitMessage: string | null
  openBlockers: string[]
  recentMemories: { type: string; title: string; content: string }[]
}

export interface AIProvider {
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>
  chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput>
  chatGlobal(input: GlobalChatInput): Promise<ProjectChatOutput>
  analyzeCode(input: CodeAnalysisInput): Promise<CodeAnalysisOutput>
  analyzeCodeStream(input: CodeAnalysisInput, onChunk: (text: string) => void): Promise<void>
  restoreContext(input: ContextRestoreInput, onChunk: (text: string) => void): Promise<void>
}
