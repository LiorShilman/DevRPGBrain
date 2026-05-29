import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { briefingApi, rpgApi, bossFightApi, DailyBriefing, RpgProfile, BossFight } from '../services/api'

function XpBar({ pct, className }: { pct: number; className: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.style.setProperty('--xp-w', `${pct}%`) }, [pct])
  return <div ref={ref} className={className} />
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [profile, setProfile] = useState<RpgProfile | null>(null)
  const [bossFights, setBossFights] = useState<BossFight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([briefingApi.get(), rpgApi.getProfile(), bossFightApi.listActive().catch(() => [] as BossFight[])])
      .then(([b, p, bf]) => { setBriefing(b); setProfile(p); setBossFights(bf) })
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

      {/* Boss fights */}
      {bossFights.length > 0 && (
        <div className="boss-section">
          <div className="boss-section-title">Active Boss Fights</div>
          {bossFights.map((boss) => (
            <div key={boss.id} className="boss-card">
              <div className="boss-icon">👾</div>
              <div className="boss-body">
                <div className="boss-name">{boss.name}</div>
                {boss.projectName && <div className="boss-project">{boss.projectName}</div>}
                <div className="boss-desc">{boss.description}</div>
                <div className="boss-footer">
                  <span className="boss-xp">+{boss.xpReward} XP on defeat</span>
                  <button
                    type="button"
                    className="boss-action"
                    onClick={() => navigate(`/projects/${boss.projectId}`)}
                  >
                    Start Battle →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <XpBar pct={profile.progressPercent} className="dashboard-xp-bar" />
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
