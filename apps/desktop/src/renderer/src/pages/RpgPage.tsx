import { useEffect, useMemo, useState } from 'react'
import { rpgApi, RpgProfile, Achievement } from '../services/api'

// ─── Hex Stat Radar ───────────────────────────────────────────────────────────

const STATS = [
  { key: 'focus',         label: 'Focus',          color: '#38bdf8' },
  { key: 'discipline',    label: 'Discipline',     color: '#a78bfa' },
  { key: 'engineering',   label: 'Engineering',    color: '#22c55e' },
  { key: 'consistency',   label: 'Consistency',    color: '#f59e0b' },
  { key: 'creativity',    label: 'Creativity',     color: '#ec4899' },
  { key: 'problemSolving',label: 'Problem Solving',color: '#06b6d4' },
] as const

type StatKey = typeof STATS[number]['key']

function hexPoint(cx: number, cy: number, r: number, i: number, total: number) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function StatRadar({ profile }: { profile: RpgProfile }) {
  const CX = 180, CY = 180, MAX_R = 130, TOTAL = STATS.length
  const MAX_LEVEL = 10

  const axisPoints = useMemo(
    () => STATS.map((_, i) => hexPoint(CX, CY, MAX_R, i, TOTAL)),
    []
  )

  const valuePoints = useMemo(() => {
    return STATS.map((s, i) => {
      const val = Math.min(MAX_LEVEL, profile[s.key as keyof RpgProfile] as number)
      const r = (val / MAX_LEVEL) * MAX_R
      return hexPoint(CX, CY, r, i, TOTAL)
    })
  }, [profile])

  const polygon = valuePoints.map((p) => `${p.x},${p.y}`).join(' ')
  const gridLevels = [2, 4, 6, 8, 10]

  return (
    <div className="stat-radar-wrap">
      <svg viewBox="0 0 360 360" className="stat-radar-svg">
        {/* Grid rings */}
        {gridLevels.map((lvl) => {
          const pts = STATS.map((_, i) => {
            const p = hexPoint(CX, CY, (lvl / MAX_LEVEL) * MAX_R, i, TOTAL)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon key={lvl} points={pts}
              fill="none" stroke="#1e293b" strokeWidth={1}
            />
          )
        })}
        {/* Axis lines */}
        {axisPoints.map((pt, i) => (
          <line key={i} x1={CX} y1={CY} x2={pt.x} y2={pt.y}
            stroke="#1e293b" strokeWidth={1}
          />
        ))}
        {/* Value polygon */}
        <polygon points={polygon}
          fill="rgba(56,189,248,0.12)"
          stroke="#38bdf8" strokeWidth={2}
        />
        {/* Value dots */}
        {valuePoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={4}
            className={`stat-radar-dot stat-radar-dot-${i}`} strokeWidth={1.5}
          />
        ))}
        {/* Axis labels */}
        {axisPoints.map((pt, i) => {
          const stat = STATS[i]
          const val = profile[stat.key as keyof RpgProfile] as number
          const dx = pt.x - CX
          const dy = pt.y - CY
          const norm = Math.sqrt(dx * dx + dy * dy) || 1
          const lx = pt.x + (dx / norm) * 22
          const ly = pt.y + (dy / norm) * 18
          return (
            <g key={i} style={{ '--ax-col': stat.color } as React.CSSProperties}>
              <text x={lx} y={ly - 6} textAnchor="middle" fontSize={10} fontWeight="600"
                className="stat-axis-label" fontFamily="sans-serif">
                {stat.label}
              </text>
              <text x={lx} y={ly + 8} textAnchor="middle" fontSize={10}
                className="stat-axis-val" fontFamily="sans-serif">
                {val}
              </text>
            </g>
          )
        })}
        {/* Center */}
        <circle cx={CX} cy={CY} r={3} fill="#334155" />
      </svg>

      <div className="stat-radar-legend">
        {STATS.map((s) => {
          const val = profile[s.key as keyof RpgProfile] as number
          return (
            <div key={s.key} className="stat-row">
              <span className="stat-dot" style={{ background: s.color }} />
              <span className="stat-label">{s.label}</span>
              <div className="stat-bar-wrap">
                <div className="stat-bar" style={{ '--stat-w': `${(val / MAX_LEVEL) * 100}%`, '--stat-col': s.color } as React.CSSProperties} />
              </div>
              <span className="stat-val">{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
            <div className="rpg-xp-bar" style={{ '--xp-w': `${profile.progressPercent}%` } as React.CSSProperties} />
          </div>
          <div className="rpg-xp-label">{profile.xpProgress} / {profile.xpNeeded} XP to next level</div>
          <div className="rpg-total-xp">{profile.totalXp} total XP</div>
        </div>
      </div>

      {/* Stat Radar */}
      <h2 className="rpg-section-title">Developer Stats</h2>
      <StatRadar profile={profile} />

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
