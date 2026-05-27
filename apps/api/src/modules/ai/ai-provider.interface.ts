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

export interface AIProvider {
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>
}
