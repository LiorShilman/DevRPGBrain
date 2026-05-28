import { Router, Request, Response } from 'express'
import { prisma } from '../../db/client'
import { getFileTree, getFileContent, searchFiles } from './files.service'
import { getAIProvider } from '../ai/ai-provider.factory'

export const filesRouter = Router({ mergeParams: true })

filesRouter.get('/files', async (req: Request, res: Response) => {
  const { id } = req.params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  try {
    const tree = await getFileTree(project.path)
    res.json(tree)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

filesRouter.get('/files/content', async (req: Request, res: Response) => {
  const { id } = req.params
  const relPath = req.query.path as string
  if (!relPath) {
    res.status(400).json({ error: 'path query param required' })
    return
  }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  try {
    const result = await getFileContent(project.path, relPath)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

filesRouter.get('/search', async (req: Request, res: Response) => {
  const { id } = req.params
  const q = req.query.q as string
  if (!q) {
    res.status(400).json({ error: 'q query param required' })
    return
  }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  try {
    const results = await searchFiles(project.path, q)
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

filesRouter.post('/files/analyze/stream', async (req: Request, res: Response) => {
  const { id } = req.params
  const { filePath, content, language, sectionName, sectionType } = req.body as {
    filePath?: string; content?: string; language?: string; sectionName?: string; sectionType?: string
  }
  if (!filePath || !content) {
    res.status(400).json({ error: 'filePath and content required' })
    return
  }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  try {
    const ai = getAIProvider()
    await ai.analyzeCodeStream(
      { filePath, content, language: language ?? 'plaintext', projectName: project.name, sectionName, sectionType },
      (chunk) => { res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`) }
    )
    res.write('data: [DONE]\n\n')
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`)
  }
  res.end()
})

filesRouter.post('/files/analyze', async (req: Request, res: Response) => {
  const { id } = req.params
  const { filePath, content, language } = req.body as { filePath?: string; content?: string; language?: string }
  if (!filePath || !content) {
    res.status(400).json({ error: 'filePath and content required' })
    return
  }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  try {
    const ai = getAIProvider()
    const result = await ai.analyzeCode({ filePath, content, language: language ?? 'plaintext', projectName: project.name })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
