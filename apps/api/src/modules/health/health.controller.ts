import { Router, Request, Response } from 'express'
import { calculateHealth, getLatestHealth } from './health.service'

export const healthRouter = Router({ mergeParams: true })

// POST /api/projects/:id/health/calculate
healthRouter.post('/health/calculate', async (req: Request, res: Response) => {
  try {
    const result = await calculateHealth(req.params.id)
    res.json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Failed to calculate health' })
  }
})

// GET /api/projects/:id/health
healthRouter.get('/health', async (req: Request, res: Response) => {
  const result = await getLatestHealth(req.params.id)
  if (!result) return res.status(404).json({ error: 'No health data. Run a calculation first.' })
  res.json(result)
})
