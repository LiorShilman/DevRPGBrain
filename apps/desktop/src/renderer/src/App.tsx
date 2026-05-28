import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import RpgPage from './pages/RpgPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import GlobalBrainPage from './pages/GlobalBrainPage'
import { GlobalBrainProvider } from './context/GlobalBrainContext'

export default function App() {
  return (
    <GlobalBrainProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="brain" element={<GlobalBrainPage />} />
            <Route path="rpg" element={<RpgPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </GlobalBrainProvider>
  )
}
