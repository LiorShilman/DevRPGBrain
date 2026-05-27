import { prisma } from '../../db/client'
import { getAIProvider } from '../ai/ai-provider.factory'
import type { ChatMessage } from '../ai/ai-provider.interface'

export async function chatWithProjectBrain(
  projectId: string,
  question: string,
  history: ChatMessage[],
) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } })

  const [gitSnapshot, recentSessionsRaw, healthRecord] = await Promise.allSettled([
    prisma.gitSnapshot.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
    prisma.workSession.findMany({
      where: { projectId, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
      take: 5,
    }),
    prisma.projectHealth.findFirst({ where: { projectId }, orderBy: { calculatedAt: 'desc' } }),
  ])

  const git = gitSnapshot.status === 'fulfilled' ? gitSnapshot.value : null
  const sessions = recentSessionsRaw.status === 'fulfilled' ? recentSessionsRaw.value : []
  const health = healthRecord.status === 'fulfilled' ? healthRecord.value : null

  const ai = getAIProvider()
  const result = await ai.chatWithProject({
    projectName: project.name,
    projectDescription: project.description,
    language: project.primaryLanguage,
    framework: project.framework,
    isGitRepo: project.isGitRepo,
    gitBranch: git?.branch ?? null,
    lastCommitMessage: git?.lastCommitMessage ?? null,
    recentSessions: sessions.map((s) => ({
      summary: s.aiSummary,
      nextSteps: JSON.parse(s.nextSteps ?? '[]') as string[],
      blockers: JSON.parse(s.blockers ?? '[]') as string[],
      durationMinutes: s.durationMinutes,
      endedAt: s.endedAt?.toISOString() ?? null,
    })),
    health: health
      ? {
          score: health.score,
          status: health.status,
          recommendations: JSON.parse(health.recommendations ?? '[]') as string[],
        }
      : null,
    history,
    question,
  })

  return result
}
