import type { AIProvider, SessionSummaryInput, SessionSummaryOutput } from '../ai-provider.interface'

const SYSTEM_PROMPT = `You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.

Schema:
{
  "summary": "2-3 sentence summary of what was accomplished",
  "keyDecisions": ["decision 1", "decision 2"],
  "extractedBlockers": ["blocker 1"],
  "extractedNextSteps": ["next step 1"]
}`

export class OpenAIProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'gpt-4o-mini') {
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`)

    const json = await res.json()
    const text: string = json.choices[0].message.content
    return JSON.parse(text) as SessionSummaryOutput
  }
}
