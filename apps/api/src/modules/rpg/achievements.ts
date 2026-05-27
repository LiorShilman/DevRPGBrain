export interface AchievementDef {
  key: string
  title: string
  description: string
  xpReward: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_session',    title: 'First Steps',       description: 'Complete your first work session',            xpReward: 50  },
  { key: 'first_hour',       title: 'In The Zone',        description: 'Accumulate 60 minutes of session time',       xpReward: 75  },
  { key: 'five_sessions',    title: 'Habit Forming',      description: 'Complete 5 work sessions',                    xpReward: 100 },
  { key: 'ten_sessions',     title: 'Dedicated Dev',      description: 'Complete 10 work sessions',                   xpReward: 150 },
  { key: 'no_blockers',      title: 'Clear Path',         description: 'Complete a session with no blockers',         xpReward: 30  },
  { key: 'deep_work',        title: 'Deep Work',          description: 'Complete a session of 60+ minutes',           xpReward: 80  },
  { key: 'three_next_steps', title: 'Always Planning',    description: 'Log 3+ next steps in a session',              xpReward: 40  },
  { key: 'level_5',          title: 'Rising Developer',   description: 'Reach level 5',                               xpReward: 200 },
  { key: 'level_10',         title: 'Senior Mode',        description: 'Reach level 10',                              xpReward: 500 },
  { key: 'three_projects',   title: 'Portfolio Builder',  description: 'Add 3 or more projects',                      xpReward: 60  },
]

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key)
}
