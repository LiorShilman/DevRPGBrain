import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { projectRouter } from './modules/projects/project.controller'
import { gitRouter } from './modules/git/git.controller'
import { scanRouter } from './modules/scans/repo-scanner.controller'
import { sessionRouter } from './modules/sessions/session.controller'

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.1.0' })
})

app.use('/api/projects', projectRouter)
app.use('/api/projects/:id', gitRouter)
app.use('/api/projects/:id', scanRouter)
app.use('/api/projects/:id', sessionRouter)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
