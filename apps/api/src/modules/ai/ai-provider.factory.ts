import type { AIProvider } from './ai-provider.interface'
import { MockAIProvider } from './providers/mock.provider'
import { OpenAIProvider } from './providers/openai.provider'
import { ClaudeProvider } from './providers/claude.provider'

let instance: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (instance) return instance

  const provider = process.env.AI_PROVIDER ?? 'mock'

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY is not set')
    instance = new OpenAIProvider(key, process.env.OPENAI_MODEL)
  } else if (provider === 'claude') {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
    instance = new ClaudeProvider(key, process.env.CLAUDE_MODEL)
  } else {
    instance = new MockAIProvider()
  }

  return instance
}
