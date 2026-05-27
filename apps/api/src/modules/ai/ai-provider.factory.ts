import type { AIProvider } from './ai-provider.interface'
import { MockAIProvider } from './providers/mock.provider'
import { OpenAIProvider } from './providers/openai.provider'
import { ClaudeProvider } from './providers/claude.provider'
import { readSettings } from '../settings/settings.service'

let instance: AIProvider | null = null

export function resetAIProvider(): void {
  instance = null
}

export function getAIProvider(): AIProvider {
  if (instance) return instance

  // settings.json takes precedence over env vars
  const settings = readSettings()
  const provider = settings.aiProvider !== 'mock'
    ? settings.aiProvider
    : (process.env.AI_PROVIDER ?? 'mock')

  if (provider === 'openai') {
    const key = settings.openAiApiKey ?? process.env.OPENAI_API_KEY
    if (!key) throw new Error('OpenAI API key is not configured. Add it in Settings.')
    const model = settings.openAiModel || process.env.OPENAI_MODEL || undefined
    instance = new OpenAIProvider(key, model)
  } else if (provider === 'claude') {
    const key = settings.claudeApiKey ?? process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('Claude API key is not configured. Add it in Settings.')
    const model = settings.claudeModel || process.env.CLAUDE_MODEL || undefined
    instance = new ClaudeProvider(key, model)
  } else {
    instance = new MockAIProvider()
  }

  return instance
}
