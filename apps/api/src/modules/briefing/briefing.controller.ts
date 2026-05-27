import { Router, Request, Response } from 'express'
import { generateBriefing } from './briefing.service'

export const briefingRouter = Router()

// GET /api/briefing
briefingRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const briefing = await generateBriefing()
    res.json(briefing)
  } catch (err) {
    if (err instanceof Error) return res.status(500).json({ error: err.message })
    res.status(500).json({ error: 'Failed to generate briefing' })
  }
})
