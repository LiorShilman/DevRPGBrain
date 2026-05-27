import { Router, Request, Response } from 'express'
import { chatWithProjectBrain } from './brain.service'
import type { ChatMessage } from '../ai/ai-provider.interface'

export const brainRouter = Router({ mergeParams: true })

brainRouter.post('/brain/chat', async (req: Request, res: Response) => {
  const { id } = req.params
  const { question, history } = req.body as { question: string; history?: ChatMessage[] }

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  try {
    const result = await chatWithProjectBrain(id, question.trim(), history ?? [])
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Brain chat failed'
    res.status(500).json({ error: message })
  }
})
