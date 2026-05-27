import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const SETTINGS_PATH = join(__dirname, '../../../../settings.json')

export interface AppSettings {
  aiProvider: 'mock' | 'openai' | 'claude'
  openAiApiKey?: string
  openAiModel?: string
  claudeApiKey?: string
  claudeModel?: string
}

const DEFAULTS: AppSettings = { aiProvider: 'mock' }

export function readSettings(): AppSettings {
  try {
    if (!existsSync(SETTINGS_PATH)) return { ...DEFAULTS }
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings()
  const next = { ...current, ...patch }
  writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function getPublicSettings(s: AppSettings) {
  return {
    aiProvider: s.aiProvider,
    hasOpenAiKey: Boolean(s.openAiApiKey),
    openAiModel: s.openAiModel ?? '',
    hasClaudeKey: Boolean(s.claudeApiKey),
    claudeModel: s.claudeModel ?? '',
  }
}
