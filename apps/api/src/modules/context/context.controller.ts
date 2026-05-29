import { Router } from 'express'
import { prisma } from '../../db/client'
import { getAIProvider } from '../ai/ai-provider.factory'
import type { ContextRestoreInput } from '../ai/ai-provider.interface'

export const contextRouter = Router({ mergeParams: true })

contextRouter.post('/context/restore', async (req, res) => {
  const { id } = req.params as { id: string }

  try {
    const [project, lastSession, gitSnapshot, memories] = await Promise.all([
      prisma.project.findUnique({ where: { id } }),
      prisma.workSession.findFirst({
        where: { projectId: id, endedAt: { not: null } },
        orderBy: { endedAt: 'desc' },
      }),
      prisma.gitSnapshot.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.memoryItem.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    if (!project) { res.status(404).json({ error: 'Project not found' }); return }

    const openBlockers: string[] = lastSession
      ? (JSON.parse(lastSession.blockers ?? '[]') as string[])
      : []

    const input: ContextRestoreInput = {
      projectName: project.name,
      description: project.description,
      gitBranch: gitSnapshot?.branch ?? null,
      lastCommitMessage: gitSnapshot?.lastCommitMessage ?? null,
      openBlockers,
      recentMemories: memories.map((m) => ({ type: m.type, title: m.title, content: m.content })),
      lastSession: lastSession ? {
        startedAt: lastSession.startedAt.toISOString(),
        endedAt: lastSession.endedAt?.toISOString() ?? null,
        durationMinutes: lastSession.durationMinutes,
        aiSummary: lastSession.aiSummary,
        blockers: JSON.parse(lastSession.blockers ?? '[]') as string[],
        decisions: JSON.parse(lastSession.decisions ?? '[]') as string[],
        nextSteps: JSON.parse(lastSession.nextSteps ?? '[]') as string[],
      } : null,
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const ai = getAIProvider()
    await ai.restoreContext(input, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    })

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    try { res.write(`data: ${JSON.stringify({ error: msg })}\n\n`); res.end() } catch { /* already closed */ }
  }
})
