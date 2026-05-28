import { Component, lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import RpgPage from './pages/RpgPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import GlobalBrainPage from './pages/GlobalBrainPage'
import { GlobalBrainProvider } from './context/GlobalBrainContext'

const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace', background: '#0f172a', minHeight: '100vh' }}>
        <h2 style={{ color: '#f87171' }}>App Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#fca5a5' }}>{this.state.error}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: '8px 16px', background: '#1e293b', color: '#e5e7eb', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
      <GlobalBrainProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<Suspense fallback={null}><ProjectDetailPage /></Suspense>} />
              <Route path="brain" element={<GlobalBrainPage />} />
              <Route path="rpg" element={<RpgPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </GlobalBrainProvider>
    </RootErrorBoundary>
  )
}
