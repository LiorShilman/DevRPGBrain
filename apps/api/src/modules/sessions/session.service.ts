import { prisma } from '../../db/client'
import { getAIProvider } from '../ai/ai-provider.factory'
import { awardXp, calcSessionXp } from '../rpg/rpg.service'
import { checkSessionAchievements } from '../rpg/achievement.service'
import type { StartSessionInput, EndSessionInput } from './session.types'

type RawSession = Awaited<ReturnType<typeof prisma.workSession.findFirst>>

export function parseSession(session: RawSession) {
  if (!session) return null
  return {
    ...session,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    blockers:  JSON.parse(session.blockers  ?? '[]') as string[],
    decisions: JSON.parse(session.decisions ?? '[]') as string[],
    nextSteps: JSON.parse(session.nextSteps ?? '[]') as string[],
  }
}

export async function startSession(input: StartSessionInput) {
  const existing = await prisma.workSession.findFirst({
    where: { projectId: input.projectId, endedAt: null },
  })
  if (existing) throw new Error('A session is already active for this project')

  const session = await prisma.workSession.create({
    data: { projectId: input.projectId, title: input.title ?? null, startedAt: new Date() },
  })
  return parseSession(session)
}

export async function endSession(sessionId: string, input: EndSessionInput) {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    include: { project: true },
  })
  if (!session) throw new Error('Session not found')
  if (session.endedAt) throw new Error('Session already ended')

  const endedAt = new Date()
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000))

  // Run AI summary (non-blocking failure — never fail session end because of AI)
  let aiSummary: string | null = null
  try {
    const ai = getAIProvider()
    const result = await ai.summarizeSession({
      projectName: session.project.name,
      durationMinutes,
      userNotes: input.userNotes ?? '',
      blockers: input.blockers ?? [],
      nextSteps: input.nextSteps ?? [],
    })
    aiSummary = result.summary
  } catch (err) {
    console.warn('[AI] summarizeSession failed:', err instanceof Error ? err.message : err)
  }

  const xpAmount = calcSessionXp({
    durationMinutes,
    hasNotes: !!(input.userNotes?.trim()),
    blockerCount: (input.blockers ?? []).length,
    nextStepCount: (input.nextSteps ?? []).length,
  })

  const { leveledUp, newLevel } = await awardXp({
    amount: xpAmount,
    reason: `Completed ${durationMinutes}m session`,
    category: 'SESSION',
    projectId: session.projectId,
    sessionId,
  })

  const updated = await prisma.workSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMinutes,
      userNotes: input.userNotes ?? null,
      blockers:  JSON.stringify(input.blockers  ?? []),
      decisions: JSON.stringify(input.decisions ?? []),
      nextSteps: JSON.stringify(input.nextSteps ?? []),
      aiSummary,
      xpAwarded: xpAmount,
    },
  })

  // Check achievements after XP is awarded
  const completedSessions = await prisma.workSession.count({ where: { projectId: session.projectId, endedAt: { not: null } } })
  const totalMinutesAgg = await prisma.workSession.aggregate({ where: { projectId: session.projectId, endedAt: { not: null } }, _sum: { durationMinutes: true } })
  const newAchievements = await checkSessionAchievements({
    sessionId,
    projectId: session.projectId,
    durationMinutes,
    blockerCount: (input.blockers ?? []).length,
    nextStepCount: (input.nextSteps ?? []).length,
    totalSessions: completedSessions,
    totalMinutes: totalMinutesAgg._sum.durationMinutes ?? 0,
    currentLevel: newLevel,
  })

  const parsed = parseSession(updated)
  return { ...parsed, leveledUp, newLevel, newAchievements }
}

export async function getActiveSession(projectId: string) {
  const session = await prisma.workSession.findFirst({
    where: { projectId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  })
  return parseSession(session)
}

export async function getLastSession(projectId: string) {
  const session = await prisma.workSession.findFirst({
    where: { projectId, endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  })
  return parseSession(session)
}

export async function listSessions(projectId: string, limit = 20) {
  const sessions = await prisma.workSession.findMany({
    where: { projectId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
  return sessions.map(parseSession)
}
