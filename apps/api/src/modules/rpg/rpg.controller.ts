import { Router, Request, Response } from 'express'
import { getProfile } from './rpg.service'

export const rpgRouter = Router()

// GET /api/rpg/profile
rpgRouter.get('/profile', async (_req: Request, res: Response) => {
  try {
    const profile = await getProfile()
    res.json(profile)
  } catch (err) {
    if (err instanceof Error) return res.status(500).json({ error: err.message })
    res.status(500).json({ error: 'Failed to load RPG profile' })
  }
})
