import { prisma } from '../../db/client'

export function calcLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100
}

export function xpProgress(totalXp: number) {
  const level = calcLevel(totalXp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const progress = totalXp - currentLevelXp
  const needed = nextLevelXp - currentLevelXp
  return { level, currentLevelXp, nextLevelXp, progress, needed, percent: Math.floor((progress / needed) * 100) }
}

export async function getOrCreateProfile() {
  const existing = await prisma.rpgProfile.findFirst()
  if (existing) return existing
  return prisma.rpgProfile.create({ data: {} })
}

export async function awardXp(opts: {
  amount: number
  reason: string
  category: string
  projectId?: string
  sessionId?: string
}) {
  const profile = await getOrCreateProfile()
  const newTotal = profile.totalXp + opts.amount
  const newLevel = calcLevel(newTotal)
  const leveledUp = newLevel > profile.level

  const [updated] = await Promise.all([
    prisma.rpgProfile.update({
      where: { id: profile.id },
      data: { totalXp: newTotal, level: newLevel },
    }),
    prisma.xpEvent.create({
      data: {
        amount: opts.amount,
        reason: opts.reason,
        category: opts.category,
        projectId: opts.projectId ?? null,
        sessionId: opts.sessionId ?? null,
      },
    }),
  ])

  return { profile: updated, xpAwarded: opts.amount, leveledUp, newLevel }
}

export function calcSessionXp(opts: {
  durationMinutes: number
  hasNotes: boolean
  blockerCount: number
  nextStepCount: number
}): number {
  const base = 5
  const timeBonusRaw = Math.floor(opts.durationMinutes)
  const timeBonus = Math.min(timeBonusRaw, 60)
  const notesBonus = opts.hasNotes ? 5 : 0
  const blockerBonus = Math.min(opts.blockerCount * 3, 15)
  const nextStepBonus = Math.min(opts.nextStepCount * 2, 10)
  return base + timeBonus + notesBonus + blockerBonus + nextStepBonus
}

export async function getProfile() {
  const profile = await getOrCreateProfile()
  const { level, progress, needed, percent } = xpProgress(profile.totalXp)
  const recentEvents = await prisma.xpEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  return { ...profile, level, xpProgress: progress, xpNeeded: needed, progressPercent: percent, recentEvents }
}
