import { Router } from 'express'
import { prisma } from '../../db/client'

export const knowledgeRouter = Router({ mergeParams: true })

interface KnowledgeNode {
  id: string
  type: 'session' | 'decision' | 'blocker' | 'nextStep' | 'memory'
  label: string
  detail: string
  date: string
}

interface KnowledgeEdge {
  id: string
  source: string
  target: string
  label: string
}

knowledgeRouter.get('/knowledge', async (req, res) => {
  const { id } = req.params as { id: string }

  try {
    const [sessions, memories] = await Promise.all([
      prisma.workSession.findMany({
        where: { projectId: id, endedAt: { not: null } },
        orderBy: { endedAt: 'desc' },
        take: 15,
      }),
      prisma.memoryItem.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const nodes: KnowledgeNode[] = []
    const edges: KnowledgeEdge[] = []

    for (const session of sessions) {
      const sessionId = `session_${session.id}`
      const date = session.endedAt?.toISOString() ?? session.startedAt.toISOString()
      nodes.push({
        id: sessionId,
        type: 'session',
        label: session.title ?? `Session ${new Date(date).toLocaleDateString()}`,
        detail: session.aiSummary ?? `${session.durationMinutes ?? '?'}m session`,
        date,
      })

      const decisions: string[] = JSON.parse(session.decisions ?? '[]')
      decisions.forEach((d, i) => {
        const nodeId = `decision_${session.id}_${i}`
        nodes.push({ id: nodeId, type: 'decision', label: d.slice(0, 60), detail: d, date })
        edges.push({ id: `e_${sessionId}_${nodeId}`, source: sessionId, target: nodeId, label: 'decided' })
      })

      const blockers: string[] = JSON.parse(session.blockers ?? '[]')
      blockers.forEach((b, i) => {
        const nodeId = `blocker_${session.id}_${i}`
        nodes.push({ id: nodeId, type: 'blocker', label: b.slice(0, 60), detail: b, date })
        edges.push({ id: `e_${sessionId}_${nodeId}`, source: sessionId, target: nodeId, label: 'blocked by' })
      })

      const nextSteps: string[] = JSON.parse(session.nextSteps ?? '[]')
      nextSteps.slice(0, 2).forEach((n, i) => {
        const nodeId = `next_${session.id}_${i}`
        nodes.push({ id: nodeId, type: 'nextStep', label: n.slice(0, 60), detail: n, date })
        edges.push({ id: `e_${sessionId}_${nodeId}`, source: sessionId, target: nodeId, label: 'next' })
      })
    }

    for (const memory of memories) {
      const nodeId = `memory_${memory.id}`
      nodes.push({
        id: nodeId,
        type: 'memory',
        label: memory.title.slice(0, 60),
        detail: memory.content.slice(0, 200),
        date: memory.createdAt.toISOString(),
      })

      // Connect memory to the most temporally-close session
      const memDate = memory.createdAt.getTime()
      const closest = sessions.reduce<{ id: string; diff: number } | null>((best, s) => {
        const diff = Math.abs((s.endedAt ?? s.startedAt).getTime() - memDate)
        return best === null || diff < best.diff ? { id: `session_${s.id}`, diff } : best
      }, null)
      if (closest) {
        edges.push({ id: `e_${nodeId}_${closest.id}`, source: closest.id, target: nodeId, label: 'noted' })
      }
    }

    res.json({ nodes, edges })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})
