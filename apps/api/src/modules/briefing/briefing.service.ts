import { prisma } from '../../db/client'
import { getAIProvider } from '../ai/ai-provider.factory'
import { calcSessionXp } from '../rpg/rpg.service'

function daysSince(date: Date | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

export async function generateBriefing() {
  const [projects, rpgProfile] = await Promise.all([
    prisma.project.findMany({ where: { archivedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.rpgProfile.findFirst(),
  ])

  const projectInputs = await Promise.all(projects.map(async (p) => {
    const [lastSession, lastHealth] = await Promise.all([
      prisma.workSession.findFirst({ where: { projectId: p.id, endedAt: { not: null } }, orderBy: { endedAt: 'desc' } }),
      prisma.projectHealth.findFirst({ where: { projectId: p.id }, orderBy: { calculatedAt: 'desc' } }),
    ])

    const nextSteps: string[] = JSON.parse(lastSession?.nextSteps ?? '[]')
    const blockers: string[] = JSON.parse(lastSession?.blockers ?? '[]')
    const xpPotential = calcSessionXp({ durationMinutes: 45, hasNotes: true, blockerCount: blockers.length, nextStepCount: nextSteps.length })

    return {
      name: p.name,
      healthScore: lastHealth?.score ?? 50,
      healthStatus: lastHealth?.status ?? 'UNKNOWN',
      daysSinceLastSession: daysSince(lastSession?.endedAt ?? null),
      lastSessionSummary: lastSession?.aiSummary ?? lastSession?.userNotes ?? null,
      nextSteps,
      blockers,
      xpPotential,
    }
  }))

  // Sort: prefer projects with recent sessions and lower health
  const sorted = [...projectInputs].sort((a, b) => {
    const aScore = (a.daysSinceLastSession ?? 999) * 10 - a.healthScore
    const bScore = (b.daysSinceLastSession ?? 999) * 10 - b.healthScore
    return aScore - bScore
  })

  const ai = getAIProvider()
  const briefing = await ai.createDailyBriefing({
    projects: sorted,
    currentLevel: rpgProfile?.level ?? 1,
    totalXp: rpgProfile?.totalXp ?? 0,
  })

  return { ...briefing, generatedAt: new Date().toISOString(), projectCount: projects.length }
}
