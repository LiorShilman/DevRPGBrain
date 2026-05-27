import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput, ProjectChatInput, ProjectChatOutput, ChatMessage } from '../ai-provider.interface'

const SESSION_PROMPT = `You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.
Schema: {"summary":"2-3 sentence summary","keyDecisions":[],"extractedBlockers":[],"extractedNextSteps":[]}`

const BRIEFING_PROMPT = `You are a developer productivity coach. Given the developer's projects, generate a daily briefing. Respond with JSON only — no markdown.
Schema: {"recommendedProject":"project name","why":"1-2 sentences why this project","risk":"1 sentence risk if skipped (empty string if no risk)","suggestedAction":"concrete next action","xpReward":number}`

function buildBrainSystemPrompt(input: ProjectChatInput): string {
  const lines: string[] = [
    `You are the Project Brain for "${input.projectName}", a developer's AI second brain.`,
    `Your role: help the developer remember context, make decisions, and stay focused.`,
    '',
    '## Project context',
  ]
  if (input.projectDescription) lines.push(`Description: ${input.projectDescription}`)
  if (input.language) lines.push(`Language: ${input.language}`)
  if (input.framework) lines.push(`Framework: ${input.framework}`)
  if (input.isGitRepo) {
    if (input.gitBranch) lines.push(`Git branch: ${input.gitBranch}`)
    if (input.lastCommitMessage) lines.push(`Last commit: ${input.lastCommitMessage}`)
  }
  if (input.health) {
    lines.push(`Health: ${input.health.status} (${input.health.score}/100)`)
    if (input.health.recommendations.length > 0) lines.push(`Recommendations: ${input.health.recommendations.join('; ')}`)
  }
  if (input.recentSessions.length > 0) {
    lines.push('', '## Recent sessions (newest first)')
    input.recentSessions.slice(0, 5).forEach((s, i) => {
      const when = s.endedAt ? new Date(s.endedAt).toLocaleDateString() : 'in progress'
      lines.push(`Session ${i + 1} (${when}, ${s.durationMinutes ?? '?'}m):`)
      if (s.summary) lines.push(`  Summary: ${s.summary}`)
      if (s.blockers.length > 0) lines.push(`  Blockers: ${s.blockers.join('; ')}`)
      if (s.nextSteps.length > 0) lines.push(`  Next steps: ${s.nextSteps.join('; ')}`)
    })
  }
  lines.push('', 'Answer concisely and helpfully. You may suggest actions, spot risks, or recall context from sessions above.')
  return lines.join('\n')
}

export class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.apiKey = apiKey
    this.model = model
  }

  private async message(system: string, user: string, maxTokens = 500): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(`Claude error: ${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.content[0].text as string
  }

  private async messageMulti(system: string, messages: ChatMessage[], maxTokens = 700): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system, messages }),
    })
    if (!res.ok) throw new Error(`Claude error: ${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.content[0].text as string
  }

  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const text = await this.message(SESSION_PROMPT, JSON.stringify(input))
    return JSON.parse(text) as SessionSummaryOutput
  }

  async createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
    const text = await this.message(BRIEFING_PROMPT, JSON.stringify(input), 400)
    return JSON.parse(text) as DailyBriefingOutput
  }

  async chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput> {
    const system = buildBrainSystemPrompt(input)
    const messages: ChatMessage[] = [...input.history, { role: 'user', content: input.question }]
    const reply = await this.messageMulti(system, messages)
    return { reply }
  }
}
