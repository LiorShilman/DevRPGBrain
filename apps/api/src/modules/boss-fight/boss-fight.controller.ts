import { Router } from 'express'
import { listActiveBossFights, getActiveBossFight } from './boss-fight.service'

export const bossFightRouter = Router()

bossFightRouter.get('/', async (_req, res) => {
  try {
    const fights = await listActiveBossFights()
    res.json(fights)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

export const projectBossFightRouter = Router({ mergeParams: true })

projectBossFightRouter.get('/boss-fight', async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    const boss = await getActiveBossFight(id)
    res.json(boss ?? null)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})
