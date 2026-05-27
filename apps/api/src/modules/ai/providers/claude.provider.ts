import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput } from '../ai-provider.interface'

const SESSION_PROMPT = `You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.
Schema: {"summary":"2-3 sentence summary","keyDecisions":[],"extractedBlockers":[],"extractedNextSteps":[]}`

const BRIEFING_PROMPT = `You are a developer productivity coach. Given the developer's projects, generate a daily briefing. Respond with JSON only — no markdown.
Schema: {"recommendedProject":"project name","why":"1-2 sentences why this project","risk":"1 sentence risk if skipped (empty string if no risk)","suggestedAction":"concrete next action","xpReward":number}`

export class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'claude-haiku-4-5-20251001') {
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

  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const text = await this.message(SESSION_PROMPT, JSON.stringify(input))
    return JSON.parse(text) as SessionSummaryOutput
  }

  async createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
    const text = await this.message(BRIEFING_PROMPT, JSON.stringify(input), 400)
    return JSON.parse(text) as DailyBriefingOutput
  }
}
