import { prisma } from '../../db/client'
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
  const session = await prisma.workSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.endedAt) throw new Error('Session already ended')

  const endedAt = new Date()
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000))

  const updated = await prisma.workSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMinutes,
      userNotes: input.userNotes ?? null,
      blockers:  JSON.stringify(input.blockers  ?? []),
      decisions: JSON.stringify(input.decisions ?? []),
      nextSteps: JSON.stringify(input.nextSteps ?? []),
    },
  })
  return parseSession(updated)
}

export async function getActiveSession(projectId: string) {
  const session = await prisma.workSession.findFirst({
    where: { projectId, endedAt: null },
    orderBy: { startedAt: 'desc' },
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
