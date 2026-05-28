import { Router, Request, Response } from 'express'
import { getProject } from '../projects/project.service'
import { scanGit, getLatestSnapshot, getRecentCommits, getLocalBranches } from './git.service'

export const gitRouter = Router({ mergeParams: true })

// POST /api/projects/:id/git-scan
gitRouter.post('/git-scan', async (req: Request, res: Response) => {
  const project = await getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const result = await scanGit(project.id, project.path)
    res.json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Git scan failed' })
  }
})

// GET /api/projects/:id/git
gitRouter.get('/git', async (req: Request, res: Response) => {
  const snapshot = await getLatestSnapshot(req.params.id)
  if (!snapshot) return res.status(404).json({ error: 'No git snapshot found. Run a scan first.' })
  res.json(snapshot)
})

// GET /api/projects/:id/git/branches
gitRouter.get('/git/branches', async (req: Request, res: Response) => {
  const project = await getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  try {
    const branches = await getLocalBranches(project.path)
    res.json(branches)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Failed to fetch branches' })
  }
})

// GET /api/projects/:id/git/commits
gitRouter.get('/git/commits', async (req: Request, res: Response) => {
  const project = await getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const limit = parseInt(req.query.limit as string) || 10
    const commits = await getRecentCommits(project.path, limit)
    res.json(commits)
  } catch (err) {
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Failed to fetch commits' })
  }
})
