import { Router, Request, Response } from 'express'
import { chatWithGlobalBrain } from './global-brain.service'
import type { ChatMessage } from '../ai/ai-provider.interface'

export const globalBrainRouter = Router()

globalBrainRouter.post('/chat', async (req: Request, res: Response) => {
  const { question, history } = req.body as { question: string; history?: ChatMessage[] }

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  try {
    const result = await chatWithGlobalBrain(question.trim(), history ?? [])
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Global brain chat failed'
    res.status(500).json({ error: message })
  }
})
