import type { AIProvider, SessionSummaryInput, SessionSummaryOutput } from '../ai-provider.interface'

export class MockAIProvider implements AIProvider {
  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const summary = `Worked on ${input.projectName} for ${input.durationMinutes} minute${input.durationMinutes !== 1 ? 's' : ''}.${input.userNotes ? ` ${input.userNotes.slice(0, 120)}${input.userNotes.length > 120 ? '…' : ''}` : ''}`

    return {
      summary,
      keyDecisions: [],
      extractedBlockers: input.blockers,
      extractedNextSteps: input.nextSteps,
    }
  }
}
