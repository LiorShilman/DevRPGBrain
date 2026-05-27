import { useEffect, useState } from 'react'
import { rpgApi, RpgProfile, Achievement } from '../services/api'

export default function RpgPage() {
  const [profile, setProfile] = useState<RpgProfile | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([rpgApi.getProfile(), rpgApi.getAchievements()])
      .then(([p, a]) => { setProfile(p); setAchievements(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading…</div></div>
  if (!profile) return <div className="page"><div className="error-banner">Could not load RPG data. Is the API running?</div></div>

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">RPG Profile</h1>
          <p className="page-subtitle">{unlockedCount} / {achievements.length} achievements unlocked</p>
        </div>
      </div>

      {/* Level Card */}
      <div className="rpg-level-card">
        <div className="rpg-level-num">Lv.{profile.level}</div>
        <div className="rpg-level-info">
          <div className="rpg-xp-bar-wrap">
            <div className="rpg-xp-bar" data-pct={profile.progressPercent} style={{ '--xp-w': `${profile.progressPercent}%` } as React.CSSProperties} />
          </div>
          <div className="rpg-xp-label">{profile.xpProgress} / {profile.xpNeeded} XP to next level</div>
          <div className="rpg-total-xp">{profile.totalXp} total XP</div>
        </div>
      </div>

      {/* Achievements */}
      <h2 className="rpg-section-title">Achievements</h2>
      <div className="achievement-grid">
        {achievements.map((a) => (
          <div key={a.key} className={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`}>
            <div className="achievement-card-icon">{a.unlocked ? '🏆' : '🔒'}</div>
            <div className="achievement-card-body">
              <p className="achievement-card-title">{a.title}</p>
              <p className="achievement-card-desc">{a.description}</p>
              {a.unlocked && a.unlockedAt && (
                <p className="achievement-card-date">{new Date(a.unlockedAt).toLocaleDateString()}</p>
              )}
              {!a.unlocked && (
                <p className="achievement-card-reward">+{a.xpReward} XP</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent XP Events */}
      {profile.recentEvents.length > 0 && (
        <>
          <h2 className="rpg-section-title">Recent XP</h2>
          <div className="xp-event-list">
            {profile.recentEvents.map((e) => (
              <div key={e.id} className="xp-event-row">
                <span className="xp-event-reason">{e.reason}</span>
                <span className="xp-event-amount">+{e.amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
