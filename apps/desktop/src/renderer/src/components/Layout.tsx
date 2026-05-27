import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { rpgApi, RpgProfile } from '../services/api'

const mainNavItems = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/projects', label: 'Projects', icon: '◫' },
  { to: '/rpg', label: 'RPG', icon: '⚔' },
]

export default function Layout() {
  const [profile, setProfile] = useState<RpgProfile | null>(null)

  useEffect(() => {
    rpgApi.getProfile().then(setProfile).catch(() => {})
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚔</span>
          <span className="brand-name">DevRPG</span>
        </div>
        <nav className="sidebar-nav">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {profile && (
          <div className="sidebar-xp">
            <div className="xp-level">Lv.{profile.level}</div>
            <div className="xp-bar-wrap">
              <div className="xp-bar" style={{ '--xp-w': `${profile.progressPercent}%` } as React.CSSProperties} />
            </div>
            <div className="xp-label">{profile.xpProgress} / {profile.xpNeeded} XP</div>
          </div>
        )}
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
