import type { AIProvider, SessionSummaryInput, SessionSummaryOutput, DailyBriefingInput, DailyBriefingOutput, ProjectChatInput, ProjectChatOutput, GlobalChatInput, ChatMessage, CodeAnalysisInput, CodeAnalysisOutput, ContextRestoreInput } from '../ai-provider.interface'
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

const CONTEXT_RESTORE_PROMPT = `You are a developer's AI second brain. Your job is to reconstruct the developer's mental context so they can resume work immediately after a break. Use markdown with bold headers (**Header**) and bullet points.

Structure your response as:
1. **Where You Left Off** — 2-3 sentence recap of the last session and what was in progress
2. **Open Threads** — Unresolved decisions, blockers, and questions that need attention
3. **Next Actions** — The 3 most important concrete things to do right now, ranked by priority
4. **Cognitive Snapshot** — Key context to hold in mind: relevant architecture decisions, gotchas, current git state
5. **Energy Check** — One motivational sentence connecting this work to the bigger picture`

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

  async chatGlobal(input: GlobalChatInput): Promise<ProjectChatOutput> {
    const system = buildGlobalBrainSystemPrompt(input)
    const messages: ChatMessage[] = [...input.history, { role: 'user', content: input.question }]
    const reply = await this.messageMulti(system, messages, 900)
    return { reply }
  }

  async analyzeCode(input: CodeAnalysisInput): Promise<CodeAnalysisOutput> {
    const userContent = `Project: ${input.projectName}\nFile: ${input.filePath}\nLanguage: ${input.language}\n\n${input.content.slice(0, 8000)}`
    const text = await this.message(CODE_ANALYSIS_PROMPT, userContent, 1500)
    return JSON.parse(text) as CodeAnalysisOutput
  }

  async restoreContext(input: ContextRestoreInput, onChunk: (text: string) => void): Promise<void> {
    const lines: string[] = [`Project: ${input.projectName}`]
    if (input.description) lines.push(`Description: ${input.description}`)
    if (input.gitBranch) lines.push(`Git branch: ${input.gitBranch}`)
    if (input.lastCommitMessage) lines.push(`Last commit: ${input.lastCommitMessage}`)
    if (input.lastSession) {
      const s = input.lastSession
      const when = s.endedAt ? new Date(s.endedAt).toLocaleDateString() : 'in progress'
      lines.push(`\nLast session (${when}, ${s.durationMinutes ?? '?'}m):`)
      if (s.aiSummary) lines.push(`  Summary: ${s.aiSummary}`)
      if (s.decisions.length > 0) lines.push(`  Decisions: ${s.decisions.join('; ')}`)
      if (s.blockers.length > 0) lines.push(`  Blockers: ${s.blockers.join('; ')}`)
      if (s.nextSteps.length > 0) lines.push(`  Next steps: ${s.nextSteps.join('; ')}`)
    }
    if (input.openBlockers.length > 0) lines.push(`\nOpen blockers: ${input.openBlockers.join('; ')}`)
    if (input.recentMemories.length > 0) {
      lines.push('\nRecent memories:')
      input.recentMemories.slice(0, 5).forEach((m) => lines.push(`  [${m.type}] ${m.title}: ${m.content.slice(0, 200)}`))
    }
    const userContent = lines.join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: 1500, stream: true, system: CONTEXT_RESTORE_PROMPT, messages: [{ role: 'user', content: userContent }] }),
    })
    if (!res.ok) throw new Error(`Claude error: ${res.status} ${res.statusText}`)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines2 = buffer.split('\n')
      buffer = lines2.pop() ?? ''
      for (const line of lines2) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { type?: string; delta?: { text?: string } }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) onChunk(parsed.delta.text)
        } catch { /* skip */ }
      }
    }
  }

  async analyzeCodeStream(input: CodeAnalysisInput, onChunk: (text: string) => void): Promise<void> {
    const isSection = !!input.sectionName
    const system = isSection ? SECTION_STREAM_PROMPT : FILE_STREAM_PROMPT
    const limit = isSection ? 8000 : 12000
    const userContent = isSection
      ? `Project: ${input.projectName}\nFile: \`${input.filePath}\`\nSection: ${input.sectionName} (${input.sectionType})\n\n\`\`\`${input.language}\n${input.content.slice(0, limit)}\n\`\`\``
      : `Project: ${input.projectName}\nFile: \`${input.filePath}\`\n\n\`\`\`${input.language}\n${input.content.slice(0, limit)}\n\`\`\``

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: 2000, stream: true, system, messages: [{ role: 'user', content: userContent }] }),
    })
    if (!res.ok) throw new Error(`Claude error: ${res.status} ${res.statusText}`)
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
          const parsed = JSON.parse(data) as { type?: string; delta?: { text?: string } }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) onChunk(parsed.delta.text)
        } catch { /* skip non-JSON SSE lines */ }
      }
    }
  }
}
