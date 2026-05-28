import type { GlobalChatInput } from '../ai-provider.interface'

export function buildGlobalBrainSystemPrompt(input: GlobalChatInput): string {
  const lines: string[] = [
    `You are the Global Brain — the developer's AI second brain across ALL their projects.`,
    `Your role: give cross-project insights, priorities, risk warnings, and contextual help.`,
    `Developer level: ${input.rpgLevel} (${input.totalXp} total XP)`,
    '',
    `## All projects (${input.projects.length} total)`,
  ]

  for (const p of input.projects) {
    lines.push('')
    const privacy = p.isPrivate ? ' [private]' : ''
    const health = p.healthStatus ? ` | Health: ${p.healthStatus} ${p.healthScore}/100` : ''
    const lang = [p.language, p.framework].filter(Boolean).join(' / ')
    lines.push(`### ${p.name}${privacy}${lang ? ` (${lang})` : ''}${health}`)
    if (p.description) lines.push(`Description: ${p.description}`)
    lines.push(`Sessions recorded: ${p.sessionCount}`)
    if (p.lastSessionDate) {
      const daysAgo = Math.floor((Date.now() - new Date(p.lastSessionDate).getTime()) / 86400000)
      const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`
      lines.push(`Last session: ${when}`)
    } else {
      lines.push(`Last session: never`)
    }
    if (p.lastSessionSummary) lines.push(`Last summary: ${p.lastSessionSummary}`)
    if (p.openBlockers.length > 0) lines.push(`Open blockers: ${p.openBlockers.join('; ')}`)
    if (p.nextSteps.length > 0) lines.push(`Next steps: ${p.nextSteps.join('; ')}`)
  }

  lines.push(
    '',
    '## Instructions',
    'Answer based on the full picture above.',
    'For priority questions: consider health status, days since last session, and open blockers.',
    'For risk questions: flag projects that are ABANDONED or RISKY, or have unresolved blockers.',
    'Be concise, direct, and actionable. Refer to projects by name.',
  )

  return lines.join('\n')
}
