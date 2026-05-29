import { prisma } from '../../db/client'
import { awardXp } from '../rpg/rpg.service'

const BOSS_CONFIGS: Record<string, { name: string; description: string; xpReward: number }> = {
  ABANDONED: {
    name: 'The Forsaken Codebase',
    description: 'A once-promising project lost to time. Its unfinished features haunt the git history. Defeat it by completing a focused work session.',
    xpReward: 750,
  },
  RISKY: {
    name: 'The Crumbling Service',
    description: 'Mounting technical debt and neglected blockers threaten to collapse this project. Clear the blockers and get back on track.',
    xpReward: 500,
  },
}

export async function checkAndSpawnBossFight(projectId: string, healthStatus: string) {
  const config = BOSS_CONFIGS[healthStatus]
  if (!config) return null

  const existing = await prisma.bossFight.findFirst({
    where: { projectId, status: 'ACTIVE' },
  })
  if (existing) return existing

  return prisma.bossFight.create({
    data: { projectId, name: config.name, description: config.description, xpReward: config.xpReward, status: 'ACTIVE' },
  })
}

export async function defeatBossFight(projectId: string, sessionId: string) {
  const boss = await prisma.bossFight.findFirst({
    where: { projectId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
  if (!boss) return null

  await prisma.bossFight.update({
    where: { id: boss.id },
    data: { status: 'DEFEATED', defeatedAt: new Date() },
  })

  const { leveledUp, newLevel } = await awardXp({
    amount: boss.xpReward,
    reason: `Defeated "${boss.name}"`,
    category: 'BOSS_FIGHT',
    projectId,
    sessionId,
  })

  return { bossName: boss.name, xpReward: boss.xpReward, leveledUp, newLevel }
}

export async function getActiveBossFight(projectId: string) {
  return prisma.bossFight.findFirst({
    where: { projectId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function listActiveBossFights() {
  const fights = await prisma.bossFight.findMany({
    where: { status: 'ACTIVE' },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return fights.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    defeatedAt: f.defeatedAt?.toISOString() ?? null,
    projectName: f.project.name,
  }))
}
