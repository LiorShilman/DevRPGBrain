import { prisma } from '../../db/client'

export type HealthStatus = 'HEALTHY' | 'STALLED' | 'RISKY' | 'ABANDONED' | 'UNKNOWN'

function daysSince(date: Date | string | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export async function calculateHealth(projectId: string) {
  const [lastSession, recentSessions, lastScan] = await Promise.all([
    prisma.workSession.findFirst({
      where: { projectId, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
    }),
    prisma.workSession.count({
      where: {
        projectId,
        endedAt: { not: null },
        startedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
    prisma.repoScan.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
  ])

  const reasons: string[] = []
  const recommendations: string[] = []
  let score = 0

  // 1. Session recency (0–40 pts)
  const daysSinceSession = daysSince(lastSession?.endedAt ?? null)
  if (daysSinceSession === null) {
    reasons.push('No sessions recorded')
    recommendations.push('Start your first work session')
  } else if (daysSinceSession === 0) {
    score += 40
  } else if (daysSinceSession < 3) {
    score += 30
  } else if (daysSinceSession < 7) {
    score += 20
    recommendations.push('Pick this project up again soon')
  } else if (daysSinceSession < 14) {
    score += 10
    reasons.push('No session in over a week')
    recommendations.push('Schedule time for this project')
  } else if (daysSinceSession < 30) {
    score += 5
    reasons.push('No session in over 2 weeks')
    recommendations.push('Project may be losing momentum')
  } else {
    reasons.push(`No session in ${daysSinceSession} days`)
    recommendations.push('Consider archiving or reviving this project')
  }

  // 2. Session frequency last 30 days (0–25 pts)
  if (recentSessions >= 4) {
    score += 25
  } else if (recentSessions >= 2) {
    score += 18
  } else if (recentSessions === 1) {
    score += 10
  } else {
    reasons.push('No sessions in the last 30 days')
  }

  // 3. Code cleanliness via scan (0–20 pts)
  if (!lastScan) {
    score += 10  // neutral — no data
  } else {
    if (lastScan.todoCount === 0 && lastScan.fixmeCount === 0) {
      score += 20
    } else if (lastScan.todoCount + lastScan.fixmeCount < 10) {
      score += 15
    } else if (lastScan.todoCount + lastScan.fixmeCount < 30) {
      score += 10
    } else if (lastScan.todoCount + lastScan.fixmeCount < 60) {
      score += 5
      reasons.push(`${lastScan.todoCount} TODOs and ${lastScan.fixmeCount} FIXMEs`)
      recommendations.push('Consider tackling some TODOs')
    } else {
      reasons.push(`High technical debt: ${lastScan.todoCount} TODOs, ${lastScan.fixmeCount} FIXMEs`)
      recommendations.push('Allocate time to reduce technical debt')
    }
  }

  // 4. Blocker status from last session (0–15 pts)
  if (!lastSession) {
    score += 15  // neutral
  } else {
    const blockers: string[] = JSON.parse(lastSession.blockers ?? '[]')
    if (blockers.length === 0) {
      score += 15
    } else if (blockers.length === 1) {
      score += 10
      reasons.push('1 open blocker from last session')
      recommendations.push(`Resolve: ${blockers[0]}`)
    } else if (blockers.length === 2) {
      score += 5
      reasons.push(`${blockers.length} open blockers`)
    } else {
      reasons.push(`${blockers.length} open blockers`)
      recommendations.push('Clear blockers before continuing')
    }
  }

  const clampedScore = Math.min(100, Math.max(0, score))

  let status: HealthStatus
  if (daysSinceSession === null && recentSessions === 0) {
    status = 'UNKNOWN'
  } else if (clampedScore >= 80) {
    status = 'HEALTHY'
  } else if (clampedScore >= 60) {
    status = 'STALLED'
  } else if (clampedScore >= 35) {
    status = 'RISKY'
  } else {
    status = 'ABANDONED'
  }

  const saved = await prisma.projectHealth.create({
    data: {
      projectId,
      score: clampedScore,
      status,
      reasons: JSON.stringify(reasons),
      recommendations: JSON.stringify(recommendations),
    },
  })

  return {
    ...saved,
    score: clampedScore,
    status,
    reasons,
    recommendations,
    calculatedAt: saved.calculatedAt.toISOString(),
  }
}

export async function getLatestHealth(projectId: string) {
  const h = await prisma.projectHealth.findFirst({
    where: { projectId },
    orderBy: { calculatedAt: 'desc' },
  })
  if (!h) return null
  return {
    ...h,
    reasons: JSON.parse(h.reasons) as string[],
    recommendations: JSON.parse(h.recommendations) as string[],
    calculatedAt: h.calculatedAt.toISOString(),
  }
}
