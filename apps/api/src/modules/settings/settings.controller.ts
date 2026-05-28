import { Router, Request, Response } from 'express'
import { readSettings, writeSettings, getPublicSettings } from './settings.service'
import { resetAIProvider } from '../ai/ai-provider.factory'

export const settingsRouter = Router()

settingsRouter.get('/', (_req: Request, res: Response) => {
  const s = readSettings()
  res.json(getPublicSettings(s))
})

settingsRouter.put('/', (req: Request, res: Response) => {
  const { aiProvider, openAiApiKey, openAiModel, claudeApiKey, claudeModel, githubToken } = req.body as {
    aiProvider?: 'mock' | 'openai' | 'claude'
    openAiApiKey?: string
    openAiModel?: string
    claudeApiKey?: string
    claudeModel?: string
    githubToken?: string
  }

  const patch: Record<string, unknown> = {}
  if (aiProvider) patch.aiProvider = aiProvider
  if (openAiModel !== undefined) patch.openAiModel = openAiModel
  if (claudeModel !== undefined) patch.claudeModel = claudeModel
  if (openAiApiKey) patch.openAiApiKey = openAiApiKey
  if (claudeApiKey) patch.claudeApiKey = claudeApiKey
  if (githubToken !== undefined) patch.githubToken = githubToken

  const next = writeSettings(patch)
  resetAIProvider()
  res.json(getPublicSettings(next))
})
