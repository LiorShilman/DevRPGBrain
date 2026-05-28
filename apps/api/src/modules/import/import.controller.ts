import { Router, Request, Response } from 'express'
import { listGitHubRepos, cloneAndRegisterRepo } from './import.service'
import type { GitHubRepo } from './import.types'

export const importRouter = Router()

importRouter.get('/github/repos', async (req: Request, res: Response) => {
  const { username, token } = req.query as { username?: string; token?: string }
  if (!username?.trim()) {
    return res.status(400).json({ error: 'username is required' })
  }
  try {
    const repos = await listGitHubRepos(username.trim(), token?.trim() || undefined)
    res.json({ repos })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'GitHub API error' })
  }
})

importRouter.post('/github/clone', async (req: Request, res: Response) => {
  const { repos, baseDir, token } = req.body as { repos?: GitHubRepo[]; baseDir?: string; token?: string }
  if (!repos?.length || !baseDir?.trim()) {
    return res.status(400).json({ error: 'repos and baseDir are required' })
  }

  const results = []
  for (const repo of repos) {
    const result = await cloneAndRegisterRepo(repo, baseDir.trim(), token?.trim() || undefined)
    results.push(result)
  }

  res.json({ results })
})
