import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi, gitApi, scanApi, sessionsApi, healthApi, brainApi, importApi, settingsApi, Project, GitScanResult, ScanResult, WorkSession, ProjectHealth, ChatMessage, GitHubRepo, ImportResult } from '../services/api'

const DependencyGraphModal = lazy(() => import('../components/DependencyGraph/DependencyGraphModal'))

type GitState     = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: GitScanResult } | { status: 'error'; message: string }
type ScanState    = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: ScanResult }    | { status: 'error'; message: string }
type SessionState = { status: 'idle' } | { status: 'starting' } | { status: 'active'; session: WorkSession } | { status: 'ending'; session: WorkSession }

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [gitStates, setGitStates] = useState<Record<string, GitState>>({})
  const [scanStates, setScanStates] = useState<Record<string, ScanState>>({})
  const [sessionStates, setSessionStates] = useState<Record<string, SessionState>>({})
  const [endingSession, setEndingSession] = useState<{ projectId: string; session: WorkSession } | null>(null)
  const [completedSession, setCompletedSession] = useState<WorkSession | null>(null)
  const [lastSessions, setLastSessions] = useState<Record<string, WorkSession>>({})
  const [healthScores, setHealthScores] = useState<Record<string, ProjectHealth>>({})
  const [showGitHubImport, setShowGitHubImport] = useState(false)
  const [scanAllProgress, setScanAllProgress] = useState<{ done: number; total: number } | null>(null)
  const [sortBy, setSortBy] = useState<'lastOpened' | 'name' | 'lastSession'>('lastOpened')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const list = await projectsApi.list()
      setProjects(list)
      // Load active sessions, last sessions, and health for all projects in parallel
      await Promise.all(list.map(async (p) => {
        const [active, last, health] = await Promise.allSettled([
          sessionsApi.getActive(p.id),
          sessionsApi.getLast(p.id),
          healthApi.getLatest(p.id),
        ])
        if (active.status === 'fulfilled') {
          setSessionStates((prev) => ({ ...prev, [p.id]: { status: 'active', session: active.value } }))
        }
        if (last.status === 'fulfilled') {
          setLastSessions((prev) => ({ ...prev, [p.id]: last.value }))
        }
        if (health.status === 'fulfilled') {
          setHealthScores((prev) => ({ ...prev, [p.id]: health.value }))
        }
      }))
    } catch {
      setError('Could not connect to API. Make sure npm run dev:api is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGitScan(project: Project) {
    setGitStates((prev) => ({ ...prev, [project.id]: { status: 'scanning' } }))
    try {
      const data = await gitApi.scan(project.id)
      setGitStates((prev) => ({ ...prev, [project.id]: { status: 'done', data } }))
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, isGitRepo: true } : p)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Git scan failed'
      setGitStates((prev) => ({ ...prev, [project.id]: { status: 'error', message } }))
    }
  }

  async function handleRepoScan(project: Project) {
    setScanStates((prev) => ({ ...prev, [project.id]: { status: 'scanning' } }))
    try {
      const data = await scanApi.scan(project.id)
      setScanStates((prev) => ({ ...prev, [project.id]: { status: 'done', data } }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed'
      setScanStates((prev) => ({ ...prev, [project.id]: { status: 'error', message } }))
    }
  }

  async function handleStartSession(project: Project) {
    setSessionStates((prev) => ({ ...prev, [project.id]: { status: 'starting' } }))
    try {
      const session = await sessionsApi.start(project.id)
      setSessionStates((prev) => ({ ...prev, [project.id]: { status: 'active', session } }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session'
      setSessionStates((prev) => ({ ...prev, [project.id]: { status: 'idle' } }))
      setError(message)
    }
  }

  function handleEndSessionRequest(project: Project, session: WorkSession) {
    setSessionStates((prev) => ({ ...prev, [project.id]: { status: 'ending', session } }))
    setEndingSession({ projectId: project.id, session })
  }

  async function handleEndSessionSubmit(data: { userNotes: string; blockers: string[]; nextSteps: string[] }) {
    if (!endingSession) return
    const { projectId, session } = endingSession
    try {
      const ended = await sessionsApi.end(projectId, session.id, data)
      setSessionStates((prev) => ({ ...prev, [projectId]: { status: 'idle' } }))
      setLastSessions((prev) => ({ ...prev, [projectId]: ended }))
      setEndingSession(null)
      setCompletedSession(ended)
      // Refresh health score (API recalculates on session end, just fetch)
      healthApi.getLatest(projectId).then((h) =>
        setHealthScores((prev) => ({ ...prev, [projectId]: h }))
      ).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session'
      setError(message)
      // Restore active state so user can retry
      setSessionStates((prev) => ({ ...prev, [projectId]: { status: 'active', session } }))
      setEndingSession(null)
    }
  }

  async function handleScanAll() {
    if (scanAllProgress) return
    setScanAllProgress({ done: 0, total: projects.length })
    for (let i = 0; i < projects.length; i++) {
      try { await scanApi.scan(projects[i].id) } catch { /* skip failed */ }
      setScanAllProgress({ done: i + 1, total: projects.length })
    }
    await loadProjects()
    setScanAllProgress(null)
  }

  async function handleArchive(id: string) {
    await projectsApi.archive(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const q = searchQuery.toLowerCase().trim()
  const filteredProjects = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.primaryLanguage ?? '').toLowerCase().includes(q)
      )
    : projects

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'lastSession') {
      const aTime = lastSessions[a.id]?.endedAt ? new Date(lastSessions[a.id].endedAt!).getTime() : 0
      const bTime = lastSessions[b.id]?.endedAt ? new Date(lastSessions[b.id].endedAt!).getTime() : 0
      return bTime - aTime
    }
    // lastOpened (default)
    const aT = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0
    const bT = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0
    return bT - aT
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {q ? `${sortedProjects.length} of ${projects.length}` : `${projects.length}`} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              type="search"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="sort-select"
            title="Sort projects"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="lastOpened">Last opened</option>
            <option value="name">Name A→Z</option>
            <option value="lastSession">Last session</option>
          </select>

          {scanAllProgress ? (
            <span className="scan-all-progress">
              ⟳ {scanAllProgress.done}/{scanAllProgress.total}
            </span>
          ) : (
            <button
              type="button"
              className="btn-toolbar"
              onClick={handleScanAll}
              disabled={projects.length === 0}
              title="Scan all projects"
            >
              ⊞ Scan All
            </button>
          )}

          <div className="toolbar-divider" />

          <button type="button" className="btn-toolbar" onClick={() => setShowGitHubImport(true)}>
            ⬇ GitHub
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            + Add Project
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◫</div>
          <p>No projects yet</p>
          <p className="empty-hint">Add a local project folder to get started</p>
        </div>
      ) : sortedProjects.length === 0 && q ? (
        <div className="empty-state">
          <div className="empty-icon">⊘</div>
          <p>No projects match "{searchQuery}"</p>
          <button type="button" className="btn-ghost" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {sortedProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              gitState={gitStates[p.id] ?? { status: 'idle' }}
              scanState={scanStates[p.id] ?? { status: 'idle' }}
              sessionState={sessionStates[p.id] ?? { status: 'idle' }}
              lastSession={lastSessions[p.id] ?? null}
              health={healthScores[p.id] ?? null}
              onGitScan={() => handleGitScan(p)}
              onRepoScan={() => handleRepoScan(p)}
              onStartSession={() => handleStartSession(p)}
              onEndSession={(s) => handleEndSessionRequest(p, s)}
              onArchive={() => handleArchive(p.id)}
              onOpen={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AddProjectModal
          onClose={() => setShowForm(false)}
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev])
            setShowForm(false)
          }}
        />
      )}

      {completedSession && (
        <SessionSummaryModal
          session={completedSession}
          onClose={() => setCompletedSession(null)}
        />
      )}

      {endingSession && (
        <EndSessionModal
          session={endingSession.session}
          onClose={() => {
            const { projectId, session } = endingSession
            setSessionStates((prev) => ({ ...prev, [projectId]: { status: 'active', session } }))
            setEndingSession(null)
          }}
          onSubmit={handleEndSessionSubmit}
        />
      )}

      {showGitHubImport && (
        <GitHubImportModal
          onClose={() => setShowGitHubImport(false)}
          onImported={() => {
            setShowGitHubImport(false)
            loadProjects()
          }}
        />
      )}
    </div>
  )
}

const HEALTH_META: Record<string, { label: string; cls: string }> = {
  HEALTHY:   { label: '● Healthy',   cls: 'health-healthy'   },
  STALLED:   { label: '● Stalled',   cls: 'health-stalled'   },
  RISKY:     { label: '● Risky',     cls: 'health-risky'     },
  ABANDONED: { label: '● Abandoned', cls: 'health-abandoned' },
  UNKNOWN:   { label: '○ Unknown',   cls: 'health-unknown'   },
}

function HealthBadge({ score, status }: { score: number; status: string }) {
  const meta = HEALTH_META[status] ?? HEALTH_META.UNKNOWN
  return <span className={`health-badge ${meta.cls}`}>{meta.label} {score}</span>
}

function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [startedAt])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  return <>{h > 0 ? `${h}h ${m}m` : `${m}m`}</>
}

function ProjectCard({
  project,
  gitState,
  scanState,
  sessionState,
  lastSession,
  health,
  onGitScan,
  onRepoScan,
  onStartSession,
  onEndSession,
  onArchive,
  onOpen,
}: {
  project: Project
  gitState: GitState
  scanState: ScanState
  sessionState: SessionState
  lastSession: WorkSession | null
  health: ProjectHealth | null
  onGitScan: () => void
  onRepoScan: () => void
  onStartSession: () => void
  onEndSession: (s: WorkSession) => void
  onArchive: () => void
  onOpen: () => void
}) {
  const lastOpened = project.lastOpenedAt
    ? new Date(project.lastOpenedAt).toLocaleDateString()
    : 'Never'

  const git = gitState.status === 'done' ? gitState.data : null
  const scan = scanState.status === 'done' ? scanState.data : null
  const activeSession = (sessionState.status === 'active' || sessionState.status === 'ending')
    ? sessionState.session
    : null

  const showContinue = !activeSession && lastSession
  const daysSince = lastSession?.endedAt
    ? Math.floor((Date.now() - new Date(lastSession.endedAt).getTime()) / 86400000)
    : null

  return (
    <div className={`project-card${activeSession ? ' session-active' : ''}`}>
      <div className="project-card-header">
        <div>
          <div className="project-name-row">
            <h3 className="project-name">{project.name}</h3>
            {project.isPrivate && <span className="badge-private" title="Private repository">🔒</span>}
            {health && <HealthBadge score={health.score} status={health.status} />}
          </div>
          {project.description && <p className="project-desc">{project.description}</p>}
        </div>
        <button type="button" className="btn-ghost btn-sm" title="Archive project" onClick={onArchive}>
          ✕
        </button>
      </div>

      {activeSession && (
        <div className="session-banner">
          <span className="session-indicator">● Session active — <SessionTimer startedAt={activeSession.startedAt} /></span>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onEndSession(activeSession)}
            disabled={sessionState.status === 'ending'}
          >
            ■ End
          </button>
        </div>
      )}

      {showContinue && lastSession && (
        <div className="continue-card">
          <div className="continue-header">
            <span className="continue-label">
              Last session {daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince}d ago`}
              {lastSession.durationMinutes ? ` · ${lastSession.durationMinutes}m` : ''}
            </span>
            <button type="button" className="btn-continue" onClick={onStartSession}
              disabled={sessionState.status === 'starting'}>
              ▶ Continue
            </button>
          </div>
          {lastSession.aiSummary && (
            <p className="continue-summary">{lastSession.aiSummary}</p>
          )}
          {lastSession.nextSteps.length > 0 && (
            <div className="continue-next">
              <span className="continue-next-label">Next:</span>
              <span className="continue-next-text">{lastSession.nextSteps[0]}</span>
            </div>
          )}
        </div>
      )}

      <div className="project-meta">
        {git ? (
          <span className="meta-badge meta-git">⎇ {git.branch}</span>
        ) : (
          <span className="meta-badge">{project.isGitRepo ? '⎇ Git' : '○ No Git'}</span>
        )}
        {project.primaryLanguage && <span className="meta-badge">{project.primaryLanguage}</span>}
        {project.framework && <span className="meta-badge">{project.framework}</span>}
      </div>

      {git && (
        <div className="git-info">
          {git.latestCommit && (
            <p className="git-commit" title={git.latestCommit.message}>
              <span className="git-hash">{git.latestCommit.hash}</span>{' '}
              <span className="git-msg">{git.latestCommit.message}</span>
            </p>
          )}
          <div className="git-stats">
            {git.isClean ? (
              <span className="git-stat clean">✓ Clean</span>
            ) : (
              <>
                {git.changedFilesCount > 0 && (
                  <span className="git-stat changed">~ {git.changedFilesCount} changed</span>
                )}
                {git.uncommittedChangesCount > 0 && (
                  <span className="git-stat uncommitted">● {git.uncommittedChangesCount} uncommitted</span>
                )}
              </>
            )}
            {git.ahead > 0 && <span className="git-stat ahead">↑ {git.ahead} ahead</span>}
            {git.behind > 0 && <span className="git-stat behind">↓ {git.behind} behind</span>}
          </div>
        </div>
      )}

      {gitState.status === 'error' && (
        <p className="git-error">{gitState.message}</p>
      )}

      {scan && (
        <div className="scan-info">
          <div className="scan-stack">
            {scan.detectedStack.map((s) => (
              <span key={s} className="meta-badge meta-stack">{s}</span>
            ))}
          </div>
          <div className="scan-stats">
            <span className="scan-stat">📄 {scan.fileCount} files</span>
            {scan.todoCount > 0 && <span className="scan-stat todo">TODO: {scan.todoCount}</span>}
            {scan.fixmeCount > 0 && <span className="scan-stat fixme">FIXME: {scan.fixmeCount}</span>}
          </div>
        </div>
      )}

      {scanState.status === 'error' && (
        <p className="git-error">{scanState.message}</p>
      )}

      <div className="project-footer">
        <p className="project-opened" title={project.path}>
          {lastOpened === 'Never' ? 'Never opened' : `Last opened: ${lastOpened}`}
        </p>
        <div className="project-footer-bottom">
          {!activeSession ? (
            <button
              type="button"
              className="btn-success"
              onClick={onStartSession}
              disabled={sessionState.status === 'starting'}
              title="Start a work session"
            >
              {sessionState.status === 'starting' ? '…' : '▶ Session'}
            </button>
          ) : <div />}
          <div className="project-actions">
            <button type="button" className="btn-icon btn-icon-git" onClick={onGitScan} disabled={gitState.status === 'scanning'} title="Scan Git">
              {gitState.status === 'scanning' ? '⟳' : '⎇'}
            </button>
            <button type="button" className="btn-icon btn-icon-scan" onClick={onRepoScan} disabled={scanState.status === 'scanning'} title="Scan files">
              {scanState.status === 'scanning' ? '⟳' : '⊞'}
            </button>
            <button type="button" className="btn-primary btn-open" onClick={onOpen} title="Open project detail">Open →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EndSessionModal({
  session,
  onClose,
  onSubmit,
}: {
  session: WorkSession
  onClose: () => void
  onSubmit: (data: { userNotes: string; blockers: string[]; nextSteps: string[] }) => Promise<void>
}) {
  const [userNotes, setUserNotes] = useState('')
  const [blockers, setBlockers] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    notesRef.current?.focus()
  }, [])

  const splitLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit({
      userNotes,
      blockers: splitLines(blockers),
      nextSteps: splitLines(nextSteps),
    })
    setSubmitting(false)
  }

  const startTime = new Date(session.startedAt)
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>End Session</h2>
          <span className="session-duration">{elapsed}m</span>
          <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field">
            <label>What did you work on?</label>
            <textarea
              ref={notesRef}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Describe what you worked on this session…"
              rows={3}
            />
          </div>
          <div className="form-field">
            <label>Blockers <span className="optional">(one per line, optional)</span></label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="e.g. Waiting for design review"
              rows={2}
            />
          </div>
          <div className="form-field">
            <label>Next steps <span className="optional">(one per line, optional)</span></label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="e.g. Write tests for the new endpoint"
              rows={2}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'End Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SessionSummaryModal({ session, onClose }: { session: WorkSession; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>Session Complete</h2>
          <span className="session-duration">{session.durationMinutes}m</span>
          <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="xp-award">
            <span className="xp-award-amount">+{session.xpAwarded} XP</span>
            {session.leveledUp && (
              <span className="xp-levelup">⬆ Level {session.newLevel}!</span>
            )}
          </div>
          {session.newAchievements && session.newAchievements.length > 0 && (
            <div className="achievement-unlocks">
              {session.newAchievements.map((key) => (
                <div key={key} className="achievement-unlock-badge">
                  <span className="achievement-icon">🏆</span>
                  <span className="achievement-key">{key.replace(/_/g, ' ')}</span>
                  <span className="achievement-label">Unlocked!</span>
                </div>
              ))}
            </div>
          )}
          {session.aiSummary && (
            <div className="summary-block">
              <p className="summary-label">AI Summary</p>
              <p className="summary-text">{session.aiSummary}</p>
            </div>
          )}
          {session.userNotes && (
            <div className="summary-block">
              <p className="summary-label">Your notes</p>
              <p className="summary-text">{session.userNotes}</p>
            </div>
          )}
          {session.blockers.length > 0 && (
            <div className="summary-block">
              <p className="summary-label">Blockers</p>
              <ul className="summary-list">
                {session.blockers.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
          {session.nextSteps.length > 0 && (
            <div className="summary-block">
              <p className="summary-label">Next steps</p>
              <ul className="summary-list">
                {session.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectBrainModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    const userMsg: ChatMessage = { role: 'user', content: q }
    setHistory((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const { reply } = await brainApi.chat(project.id, q, history)
      setHistory((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brain error')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-brain">
        <div className="modal-header">
          <div className="brain-title">
            <span className="brain-icon">◈</span>
            <span>Project Brain — {project.name}</span>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="brain-messages">
          {history.length === 0 && (
            <div className="brain-empty">
              <p className="brain-empty-hint">Ask anything about this project — context, next steps, decisions, blockers.</p>
              <div className="brain-suggestions">
                {['What should I work on next?', 'What were the last blockers?', "Summarize where I left off"].map((s) => (
                  <button key={s} type="button" className="brain-suggestion" onClick={() => setInput(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`brain-msg brain-msg-${msg.role}`}>
              <span className="brain-msg-label">{msg.role === 'user' ? 'You' : '◈ Brain'}</span>
              <p className="brain-msg-text">{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="brain-msg brain-msg-assistant brain-thinking">
              <span className="brain-msg-label">◈ Brain</span>
              <p className="brain-msg-text">Thinking…</p>
            </div>
          )}
          {error && <p className="brain-error">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="brain-input-row">
          <textarea
            ref={inputRef}
            className="brain-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your Project Brain… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={loading}
          />
          <button type="submit" className="btn-primary brain-send" disabled={loading || !input.trim()}>
            ↑
          </button>
        </form>
      </div>
    </div>
  )
}

function GitHubImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void
}) {
  type Step = 'config' | 'select' | 'importing' | 'done'
  const [step, setStep] = useState<Step>('config')
  const [username, setUsername] = useState('LiorShilman')
  const [token, setToken] = useState('')
  const [baseDir, setBaseDir] = useState('E:\\AllMyProjects')

  useEffect(() => {
    settingsApi.get().then((s) => { if (s.githubToken) setToken(s.githubToken) }).catch(() => {})
  }, [])
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<ImportResult[]>([])
  const [importingRepo, setImportingRepo] = useState<string | null>(null)

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault()
    setFetchError(null)
    setFetching(true)
    try {
      const { repos: list } = await importApi.listRepos(username.trim(), token.trim() || undefined)
      setRepos(list)
      const allNames = new Set(list.map((r) => r.name))
      setSelected(allNames)
      setStep('select')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch repos')
    } finally {
      setFetching(false)
    }
  }

  function toggleRepo(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === repos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(repos.map((r) => r.name)))
    }
  }

  async function handleImport() {
    const toImport = repos.filter((r) => selected.has(r.name))
    if (toImport.length === 0) return
    setStep('importing')
    const allResults: ImportResult[] = []

    for (const repo of toImport) {
      setImportingRepo(repo.name)
      try {
        const { results: r } = await importApi.cloneRepos([repo], baseDir, token.trim() || undefined)
        allResults.push(...r)
      } catch (err) {
        allResults.push({
          repo: repo.name,
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed',
        })
      }
    }

    setResults(allResults)
    setImportingRepo(null)
    setStep('done')
  }

  const successCount = results.filter((r) => r.status === 'success').length

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2>Import from GitHub</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {step === 'config' && (
          <form onSubmit={handleFetch} className="modal-body">
            {fetchError && <div className="error-banner">{fetchError}</div>}
            <div className="form-field">
              <label>GitHub Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. LiorShilman"
                required
              />
            </div>
            <div className="form-field">
              <label>
                GitHub Token <span className="optional">(optional — required for private repos)</span>
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                autoComplete="off"
              />
              <p className="field-hint">
                Generate at GitHub → Settings → Developer settings → Personal access tokens → Fine-grained → repo scope
              </p>
            </div>
            <div className="form-field">
              <label>Clone to directory</label>
              <input
                value={baseDir}
                onChange={(e) => setBaseDir(e.target.value)}
                placeholder="e.g. E:\AllMyProjects"
                required
              />
              <p className="field-hint">Each repo will be cloned as a sub-folder here</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={fetching}>
                {fetching ? 'Fetching…' : 'Fetch Repos →'}
              </button>
            </div>
          </form>
        )}

        {step === 'select' && (
          <div className="modal-body">
            <div className="gh-select-header">
              <span className="gh-select-count">
                {repos.length} public repos from <strong>{username}</strong>
              </span>
              <button type="button" className="btn-ghost btn-sm" onClick={toggleAll}>
                {selected.size === repos.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="gh-repo-list">
              {repos.map((repo) => (
                <label key={repo.name} className="gh-repo-item">
                  <input
                    type="checkbox"
                    checked={selected.has(repo.name)}
                    onChange={() => toggleRepo(repo.name)}
                  />
                  <div className="gh-repo-info">
                    <span className="gh-repo-name">{repo.name}</span>
                    {repo.description && (
                      <span className="gh-repo-desc">{repo.description}</span>
                    )}
                  </div>
                  <div className="gh-repo-meta">
                    {repo.isPrivate && <span className="gh-repo-private">🔒</span>}
                    {repo.language && <span className="meta-badge">{repo.language}</span>}
                    {repo.stargazersCount > 0 && (
                      <span className="gh-repo-stars">★ {repo.stargazersCount}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep('config')}>← Back</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleImport}
                disabled={selected.size === 0}
              >
                Import {selected.size} repo{selected.size !== 1 ? 's' : ''} →
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="modal-body gh-progress">
            <p className="gh-progress-title">Cloning repositories…</p>
            <p className="gh-progress-current">⟳ {importingRepo}</p>
            <div className="gh-results-list">
              {results.map((r) => (
                <div key={r.repo} className={`gh-result gh-result-${r.status}`}>
                  <span className="gh-result-icon">
                    {r.status === 'success' ? '✓' : r.status === 'skipped' ? '○' : '✕'}
                  </span>
                  <span className="gh-result-name">{r.repo}</span>
                  {r.message && <span className="gh-result-msg">{r.message}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="modal-body">
            <div className="gh-done-summary">
              <span className="gh-done-icon">✓</span>
              <p className="gh-done-title">Import complete</p>
              <p className="gh-done-sub">
                {successCount} project{successCount !== 1 ? 's' : ''} added
                {results.filter((r) => r.status === 'skipped').length > 0 &&
                  ` · ${results.filter((r) => r.status === 'skipped').length} skipped`}
                {results.filter((r) => r.status === 'error').length > 0 &&
                  ` · ${results.filter((r) => r.status === 'error').length} failed`}
              </p>
            </div>
            <div className="gh-results-list">
              {results.map((r) => (
                <div key={r.repo} className={`gh-result gh-result-${r.status}`}>
                  <span className="gh-result-icon">
                    {r.status === 'success' ? '✓' : r.status === 'skipped' ? '○' : '✕'}
                  </span>
                  <span className="gh-result-name">{r.repo}</span>
                  {r.message && <span className="gh-result-msg">{r.message}</span>}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={onImported}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AddProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const project = await projectsApi.create({ name, path, description: desc || undefined })
      onCreated(project)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Project</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {formError && <div className="error-banner">{formError}</div>}
          <div className="form-field">
            <label>Project Name</label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              required
            />
          </div>
          <div className="form-field">
            <label>Local Path</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. C:\Users\you\projects\my-app"
              required
            />
          </div>
          <div className="form-field">
            <label>
              Description <span className="optional">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description of the project"
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
