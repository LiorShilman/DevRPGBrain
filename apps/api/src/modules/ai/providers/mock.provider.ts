import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput, ProjectChatInput, ProjectChatOutput, GlobalChatInput } from '../ai-provider.interface'

export class MockAIProvider implements AIProvider {
  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const summary = `Worked on ${input.projectName} for ${input.durationMinutes} minute${input.durationMinutes !== 1 ? 's' : ''}.${input.userNotes ? ` ${input.userNotes.slice(0, 120)}${input.userNotes.length > 120 ? '…' : ''}` : ''}`
    return { summary, keyDecisions: [], extractedBlockers: input.blockers, extractedNextSteps: input.nextSteps }
  }

  async createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
    const top = input.projects[0]
    if (!top) {
      return { recommendedProject: 'No projects', why: 'Add a project to get started.', risk: '', suggestedAction: 'Add your first project.', xpReward: 0 }
    }
    const dayStr = top.daysSinceLastSession === 0 ? 'today' : top.daysSinceLastSession === 1 ? 'yesterday' : `${top.daysSinceLastSession} days ago`
    return {
      recommendedProject: top.name,
      why: `Last worked on ${dayStr}. ${top.lastSessionSummary ?? ''}`.trim(),
      risk: top.healthStatus !== 'HEALTHY' ? `Project health is ${top.healthStatus.toLowerCase()} — continuing to delay may make context harder to recover.` : '',
      suggestedAction: top.nextSteps[0] ?? 'Start a new session and pick up where you left off.',
      xpReward: top.xpPotential,
    }
  }

  async chatGlobal(input: GlobalChatInput): Promise<ProjectChatOutput> {
    const risky = input.projects.filter((p) => p.healthStatus === 'RISKY' || p.healthStatus === 'ABANDONED')
    const withBlockers = input.projects.filter((p) => p.openBlockers.length > 0)
    const parts = [`[Mock Global Brain — ${input.projects.length} projects, Level ${input.rpgLevel}]`]
    if (risky.length > 0) parts.push(`At-risk projects: ${risky.map((p) => p.name).join(', ')}.`)
    if (withBlockers.length > 0) parts.push(`Projects with blockers: ${withBlockers.map((p) => p.name).join(', ')}.`)
    parts.push(`You asked: "${input.question}"`)
    parts.push('Set AI_PROVIDER=openai or claude and add an API key to get real cross-project analysis.')
    return { reply: parts.join(' ') }
  }

  async chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput> {
    const sessionCount = input.recentSessions.length
    const lastNext = input.recentSessions[0]?.nextSteps[0]
    const parts: string[] = [`[Mock Brain for ${input.projectName}]`]
    if (sessionCount > 0) parts.push(`You have ${sessionCount} recorded session${sessionCount !== 1 ? 's' : ''}.`)
    if (lastNext) parts.push(`Last planned next step: "${lastNext}".`)
    if (input.health) parts.push(`Health: ${input.health.status} (${input.health.score}/100).`)
    parts.push(`You asked: "${input.question}"`)
    parts.push('Set AI_PROVIDER=openai or AI_PROVIDER=claude and add an API key to get real answers.')
    return { reply: parts.join(' ') }
  }
}
