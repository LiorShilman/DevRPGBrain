import { Router, Request, Response } from 'express'
import { ZodError } from 'zod'
import { CreateProjectSchema, UpdateProjectSchema } from './project.types'
import * as projectService from './project.service'

export const projectRouter = Router()

projectRouter.get('/', async (_req: Request, res: Response) => {
  const projects = await projectService.listProjects()
  res.json(projects)
})

projectRouter.get('/:id', async (req: Request, res: Response) => {
  const project = await projectService.getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  await projectService.touchProject(project.id)
  res.json(project)
})

projectRouter.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateProjectSchema.parse(req.body)
    const project = await projectService.createProject(input)
    res.status(201).json(project)
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues })
    if (err instanceof Error) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Unknown error' })
  }
})

projectRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const input = UpdateProjectSchema.parse(req.body)
    const project = await projectService.updateProject(req.params.id, input)
    res.json(project)
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues })
    res.status(500).json({ error: 'Unknown error' })
  }
})

projectRouter.delete('/:id/archive', async (req: Request, res: Response) => {
  await projectService.archiveProject(req.params.id)
  res.json({ success: true })
})

projectRouter.delete('/:id', async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.id)
  res.status(204).send()
})
