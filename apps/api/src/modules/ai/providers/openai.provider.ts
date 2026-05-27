import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput } from '../ai-provider.interface'

const SESSION_PROMPT = `You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.
Schema: {"summary":"2-3 sentence summary","keyDecisions":[],"extractedBlockers":[],"extractedNextSteps":[]}`

const BRIEFING_PROMPT = `You are a developer productivity coach. Given the developer's projects, generate a daily briefing. Respond with JSON only — no markdown.
Schema: {"recommendedProject":"project name","why":"1-2 sentences why this project","risk":"1 sentence risk if skipped (empty string if no risk)","suggestedAction":"concrete next action","xpReward":number}`

export class OpenAIProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  private async chat(system: string, user: string, maxTokens = 500): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.choices[0].message.content as string
  }

  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const text = await this.chat(SESSION_PROMPT, JSON.stringify(input))
    return JSON.parse(text) as SessionSummaryOutput
  }

  async createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
    const text = await this.chat(BRIEFING_PROMPT, JSON.stringify(input), 400)
    return JSON.parse(text) as DailyBriefingOutput
  }
}
