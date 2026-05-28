import { prisma } from '../../db/client'
import { getAIProvider } from '../ai/ai-provider.factory'
import type { ChatMessage, GlobalChatInput, GlobalChatProjectSummary } from '../ai/ai-provider.interface'

export async function chatWithGlobalBrain(question: string, history: ChatMessage[]) {
  const [projects, rpgProfile] = await Promise.all([
    prisma.project.findMany({ where: { archivedAt: null }, orderBy: { lastOpenedAt: { sort: 'desc', nulls: 'last' } } }),
    prisma.rpgProfile.findFirst(),
  ])

  const summaries: GlobalChatProjectSummary[] = await Promise.all(
    projects.map(async (p) => {
      const [lastSession, health, sessionCount] = await Promise.all([
        prisma.workSession.findFirst({
          where: { projectId: p.id, endedAt: { not: null } },
          orderBy: { endedAt: 'desc' },
        }),
        prisma.projectHealth.findFirst({ where: { projectId: p.id }, orderBy: { calculatedAt: 'desc' } }),
        prisma.workSession.count({ where: { projectId: p.id } }),
      ])

      const blockers = lastSession?.blockers ? (JSON.parse(lastSession.blockers) as string[]) : []
      const nextSteps = lastSession?.nextSteps ? (JSON.parse(lastSession.nextSteps) as string[]) : []

      return {
        name: p.name,
        description: p.description,
        language: p.primaryLanguage,
        framework: p.framework,
        isGitRepo: p.isGitRepo,
        isPrivate: p.isPrivate,
        healthScore: health?.score ?? null,
        healthStatus: health?.status ?? null,
        lastSessionDate: lastSession?.endedAt?.toISOString() ?? null,
        lastSessionSummary: lastSession?.aiSummary ?? null,
        openBlockers: blockers,
        nextSteps,
        sessionCount,
      }
    })
  )

  const input: GlobalChatInput = {
    projects: summaries,
    rpgLevel: rpgProfile?.level ?? 1,
    totalXp: rpgProfile?.totalXp ?? 0,
    history,
    question,
  }

  const ai = getAIProvider()
  return ai.chatGlobal(input)
}
