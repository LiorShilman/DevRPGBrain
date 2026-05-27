import { Router, Request, Response } from 'express'
import { getProject } from '../projects/project.service'
import { scanRepo, getLatestScan, parseScan } from './repo-scanner.service'

export const scanRouter = Router({ mergeParams: true })

// POST /api/projects/:id/scan
scanRouter.post('/scan', async (req: Request, res: Response) => {
  const project = await getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const result = await scanRepo(project.id, project.path)
    res.json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Scan failed' })
  }
})

// GET /api/projects/:id/scan
scanRouter.get('/scan', async (req: Request, res: Response) => {
  const raw = await getLatestScan(req.params.id)
  const scan = parseScan(raw)
  if (!scan) return res.status(404).json({ error: 'No scan found. Run a scan first.' })
  res.json(scan)
})
