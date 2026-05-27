import { prisma } from '../../db/client'
import { awardXp } from './rpg.service'
import { ACHIEVEMENTS, getAchievement } from './achievements'

export async function getUnlockedKeys(): Promise<Set<string>> {
  const unlocked = await prisma.achievementUnlock.findMany({ select: { achievementKey: true } })
  return new Set(unlocked.map((u) => u.achievementKey))
}

async function unlock(key: string, projectId?: string): Promise<string | null> {
  const def = getAchievement(key)
  if (!def) return null

  try {
    await prisma.achievementUnlock.create({ data: { achievementKey: key } })
    await awardXp({ amount: def.xpReward, reason: `Achievement: ${def.title}`, category: 'ACHIEVEMENT', projectId })
    return key
  } catch {
    // unique constraint = already unlocked
    return null
  }
}

export interface SessionContext {
  sessionId: string
  projectId: string
  durationMinutes: number
  blockerCount: number
  nextStepCount: number
  totalSessions: number
  totalMinutes: number
  currentLevel: number
}

export async function checkSessionAchievements(ctx: SessionContext): Promise<string[]> {
  const unlocked = await getUnlockedKeys()
  const newUnlocks: string[] = []

  const checks: Array<{ key: string; condition: boolean }> = [
    { key: 'first_session',    condition: ctx.totalSessions >= 1 },
    { key: 'five_sessions',    condition: ctx.totalSessions >= 5 },
    { key: 'ten_sessions',     condition: ctx.totalSessions >= 10 },
    { key: 'first_hour',       condition: ctx.totalMinutes >= 60 },
    { key: 'deep_work',        condition: ctx.durationMinutes >= 60 },
    { key: 'no_blockers',      condition: ctx.blockerCount === 0 },
    { key: 'three_next_steps', condition: ctx.nextStepCount >= 3 },
    { key: 'level_5',          condition: ctx.currentLevel >= 5 },
    { key: 'level_10',         condition: ctx.currentLevel >= 10 },
  ]

  for (const { key, condition } of checks) {
    if (condition && !unlocked.has(key)) {
      const result = await unlock(key, ctx.projectId)
      if (result) newUnlocks.push(result)
    }
  }

  return newUnlocks
}

export async function checkProjectCountAchievement(): Promise<string[]> {
  const count = await prisma.project.count({ where: { archivedAt: null } })
  const unlocked = await getUnlockedKeys()
  const newUnlocks: string[] = []
  if (count >= 3 && !unlocked.has('three_projects')) {
    const result = await unlock('three_projects')
    if (result) newUnlocks.push(result)
  }
  return newUnlocks
}

export async function listAchievements() {
  const unlocked = await prisma.achievementUnlock.findMany({ orderBy: { unlockedAt: 'desc' } })
  const unlockedKeys = new Set(unlocked.map((u) => u.achievementKey))
  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlockedKeys.has(def.key),
    unlockedAt: unlocked.find((u) => u.achievementKey === def.key)?.unlockedAt?.toISOString() ?? null,
  }))
}
