import type { AIProvider, SessionSummaryInput, SessionSummaryOutput } from '../ai-provider.interface'

const SYSTEM_PROMPT = `You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.

Schema:
{
  "summary": "2-3 sentence summary of what was accomplished",
  "keyDecisions": ["decision 1", "decision 2"],
  "extractedBlockers": ["blocker 1"],
  "extractedNextSteps": ["next step 1"]
}`

export class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'claude-haiku-4-5-20251001') {
    this.apiKey = apiKey
    this.model = model
  }

  async summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
    const userContent = JSON.stringify({
      project: input.projectName,
      durationMinutes: input.durationMinutes,
      userNotes: input.userNotes,
      blockers: input.blockers,
      nextSteps: input.nextSteps,
      changedFiles: input.changedFiles ?? [],
      commitMessages: input.commitMessages ?? [],
    })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!res.ok) throw new Error(`Claude error: ${res.status} ${res.statusText}`)

    const json = await res.json()
    const text: string = json.content[0].text
    return JSON.parse(text) as SessionSummaryOutput
  }
}
