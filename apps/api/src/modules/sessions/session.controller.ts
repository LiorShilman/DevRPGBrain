import { Router, Request, Response } from 'express'
import { startSession, endSession, getActiveSession, getLastSession, listSessions } from './session.service'

export const sessionRouter = Router({ mergeParams: true })

// POST /api/projects/:id/sessions/start
sessionRouter.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const session = await startSession({ projectId: req.params.id, title: req.body.title })
    res.json(session)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Failed to start session' })
  }
})

// POST /api/sessions/:sessionId/end
sessionRouter.post('/sessions/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const session = await endSession(req.params.sessionId, req.body)
    res.json(session)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Failed to end session' })
  }
})

// GET /api/projects/:id/sessions/active
sessionRouter.get('/sessions/active', async (req: Request, res: Response) => {
  const session = await getActiveSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'No active session' })
  res.json(session)
})

// GET /api/projects/:id/sessions/last
sessionRouter.get('/sessions/last', async (req: Request, res: Response) => {
  const session = await getLastSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'No sessions yet' })
  res.json(session)
})

// GET /api/projects/:id/sessions
sessionRouter.get('/sessions', async (req: Request, res: Response) => {
  const sessions = await listSessions(req.params.id)
  res.json(sessions)
})
