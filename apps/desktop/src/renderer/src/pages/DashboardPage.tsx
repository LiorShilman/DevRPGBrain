import { useEffect, useState } from 'react'
import { briefingApi, rpgApi, DailyBriefing, RpgProfile } from '../services/api'

export default function DashboardPage() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [profile, setProfile] = useState<RpgProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([briefingApi.get(), rpgApi.getProfile()])
      .then(([b, p]) => { setBriefing(b); setProfile(p) })
      .catch(() => setError('Could not connect to API. Make sure npm run dev:api is running.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Generating your briefing…</div></div>
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {profile && (
          <div className="dashboard-level">
            <span className="dashboard-level-num">Lv.{profile.level}</span>
            <span className="dashboard-total-xp">{profile.totalXp} XP</span>
          </div>
        )}
      </div>

      {briefing && briefing.projectCount > 0 ? (
        <div className="briefing-card">
          <div className="briefing-header">
            <span className="briefing-tag">Today's Focus</span>
            <span className="briefing-project">{briefing.recommendedProject}</span>
          </div>
          <div className="briefing-body">
            {briefing.why && (
              <div className="briefing-section">
                <p className="briefing-label">Why</p>
                <p className="briefing-text">{briefing.why}</p>
              </div>
            )}
            {briefing.risk && (
              <div className="briefing-section briefing-risk">
                <p className="briefing-label">Risk</p>
                <p className="briefing-text">{briefing.risk}</p>
              </div>
            )}
            <div className="briefing-section briefing-action">
              <p className="briefing-label">Suggested action</p>
              <p className="briefing-text">{briefing.suggestedAction}</p>
            </div>
          </div>
          <div className="briefing-footer">
            <span className="briefing-xp">+{briefing.xpReward} XP opportunity today</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">⚔</div>
          <p>No projects yet</p>
          <p className="empty-hint">Add a project and start a session to get your daily briefing</p>
        </div>
      )}

      {profile && (
        <div className="dashboard-xp-section">
          <h2 className="dashboard-section-title">XP Progress</h2>
          <div className="dashboard-xp-bar-wrap">
            <div className="dashboard-xp-bar" style={{ '--xp-w': `${profile.progressPercent}%` } as React.CSSProperties} />
          </div>
          <p className="dashboard-xp-label">{profile.xpProgress} / {profile.xpNeeded} XP to Level {profile.level + 1}</p>
          {profile.recentEvents.length > 0 && (
            <div className="dashboard-events">
              {profile.recentEvents.slice(0, 5).map((e) => (
                <div key={e.id} className="dashboard-event-row">
                  <span className="dashboard-event-reason">{e.reason}</span>
                  <span className="dashboard-event-amount">+{e.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
