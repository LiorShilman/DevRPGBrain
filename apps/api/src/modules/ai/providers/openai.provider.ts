import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput, ProjectChatInput, ProjectChatOutput, GlobalChatInput, ChatMessage, CodeAnalysisInput, CodeAnalysisOutput } from '../ai-provider.interface'
import { buildGlobalBrainSystemPrompt } from '../prompts/global-brain.prompt'

const CODE_ANALYSIS_PROMPT = `You are a senior software engineer performing a code review. Analyze the provided file and respond with a JSON object only — no markdown, no explanation.
Schema: {"summary":"1-2 sentence overview of what this file does","howItWorks":"paragraph explaining the main logic flow and patterns used","keyDecisions":["architectural or design decision 1","decision 2"],"dependencies":["imported module or dep 1","dep 2"],"suggestions":["concrete improvement suggestion 1","suggestion 2"]}`

const SECTION_STREAM_PROMPT = `You are a code analysis expert. Analyze the provided code section and explain it clearly. Use markdown with bold headers (**Header**).

Structure:
1. **Summary** — What does this code do? (1-2 sentences)
2. **How it works** — Step-by-step explanation of the logic
3. **Key concepts** — Important patterns, techniques, or APIs used
4. **Dependencies** — What this code depends on
5. **Potential issues** — Edge cases, performance concerns, or improvements`

const FILE_STREAM_PROMPT = `You are a senior code analysis expert. Analyze this complete file. Use markdown with bold headers (**Header**).

Structure:
1. **File Purpose** — What this file is responsible for (2-3 sentences)
2. **Architecture Overview** — How the file is structured; main building blocks
3. **Key Functionality** — Each major function/component and what it does
4. **Data Flow** — How data moves through this file; inputs and outputs
5. **Dependencies** — External libraries and project integrations
6. **Patterns & Techniques** — Design patterns or coding techniques used
7. **Potential Improvements** — Suggestions for refactoring or quality`

const SESSION_PROMPT =`You are a developer productivity assistant. Analyze the session data and respond with a JSON object only — no markdown, no explanation.
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

export class OpenAIProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'gpt-5.4-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  private async throwOpenAIError(res: Response): Promise<never> {
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message ?? res.statusText
    throw new Error(`OpenAI ${res.status}: ${msg}`)
  }

  private async chat(system: string, user: string, maxTokens = 500): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3,
        max_completion_tokens: maxTokens,
      }),
    })
    if (!res.ok) return this.throwOpenAIError(res)
    const json = await res.json()
    return json.choices[0].message.content as string
  }

  private async chatMulti(messages: ChatMessage[], system: string, maxTokens = 700): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.5,
        max_completion_tokens: maxTokens,
      }),
    })
    if (!res.ok) return this.throwOpenAIError(res)
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

  async chatWithProject(input: ProjectChatInput): Promise<ProjectChatOutput> {
    const system = buildBrainSystemPrompt(input)
    const messages: ChatMessage[] = [...input.history, { role: 'user', content: input.question }]
    const reply = await this.chatMulti(messages, system)
    return { reply }
  }

  async chatGlobal(input: GlobalChatInput): Promise<ProjectChatOutput> {
    const system = buildGlobalBrainSystemPrompt(input)
    const messages: ChatMessage[] = [...input.history, { role: 'user', content: input.question }]
    const reply = await this.chatMulti(messages, system, 900)
    return { reply }
  }

  async analyzeCode(input: CodeAnalysisInput): Promise<CodeAnalysisOutput> {
    const userContent = `Project: ${input.projectName}\nFile: ${input.filePath}\nLanguage: ${input.language}\n\n${input.content.slice(0, 8000)}`
    const text = await this.chat(CODE_ANALYSIS_PROMPT, userContent, 1500)
    return JSON.parse(text) as CodeAnalysisOutput
  }

  async analyzeCodeStream(input: CodeAnalysisInput, onChunk: (text: string) => void): Promise<void> {
    const isSection = !!input.sectionName
    const system = isSection ? SECTION_STREAM_PROMPT : FILE_STREAM_PROMPT
    const limit = isSection ? 8000 : 12000
    const userContent = isSection
      ? `Project: ${input.projectName}\nFile: \`${input.filePath}\`\nSection: ${input.sectionName} (${input.sectionType})\n\n\`\`\`${input.language}\n${input.content.slice(0, limit)}\n\`\`\``
      : `Project: ${input.projectName}\nFile: \`${input.filePath}\`\n\n\`\`\`${input.language}\n${input.content.slice(0, limit)}\n\`\`\``

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, max_completion_tokens: 2000, stream: true, messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }] }),
    })
    if (!res.ok) return this.throwOpenAIError(res)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
          const text = parsed.choices?.[0]?.delta?.content
          if (text) onChunk(text)
        } catch { /* skip */ }
      }
    }
  }
}
