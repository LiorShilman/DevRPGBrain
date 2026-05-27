import { useEffect, useRef, useState } from 'react'
import { projectsApi, gitApi, scanApi, sessionsApi, Project, GitScanResult, ScanResult, WorkSession } from '../services/api'

type GitState     = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: GitScanResult } | { status: 'error'; message: string }
type ScanState    = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: ScanResult }    | { status: 'error'; message: string }
type SessionState = { status: 'idle' } | { status: 'starting' } | { status: 'active'; session: WorkSession } | { status: 'ending'; session: WorkSession }

export default function ProjectsPage() {
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

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const list = await projectsApi.list()
      setProjects(list)
      // Load active + last sessions for all projects in parallel
      await Promise.all(list.map(async (p) => {
        const [active, last] = await Promise.allSettled([
          sessionsApi.getActive(p.id),
          sessionsApi.getLast(p.id),
        ])
        if (active.status === 'fulfilled') {
          setSessionStates((prev) => ({ ...prev, [p.id]: { status: 'active', session: active.value } }))
        }
        if (last.status === 'fulfilled') {
          setLastSessions((prev) => ({ ...prev, [p.id]: last.value }))
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session'
      setError(message)
      // Restore active state so user can retry
      setSessionStates((prev) => ({ ...prev, [projectId]: { status: 'active', session } }))
      setEndingSession(null)
    }
  }

  async function handleArchive(id: string) {
    await projectsApi.archive(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {projects.length} active project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Project
        </button>
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
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              gitState={gitStates[p.id] ?? { status: 'idle' }}
              scanState={scanStates[p.id] ?? { status: 'idle' }}
              sessionState={sessionStates[p.id] ?? { status: 'idle' }}
              lastSession={lastSessions[p.id] ?? null}
              onGitScan={() => handleGitScan(p)}
              onRepoScan={() => handleRepoScan(p)}
              onStartSession={() => handleStartSession(p)}
              onEndSession={(s) => handleEndSessionRequest(p, s)}
              onArchive={() => handleArchive(p.id)}
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
    </div>
  )
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
  onGitScan,
  onRepoScan,
  onStartSession,
  onEndSession,
  onArchive,
}: {
  project: Project
  gitState: GitState
  scanState: ScanState
  sessionState: SessionState
  lastSession: WorkSession | null
  onGitScan: () => void
  onRepoScan: () => void
  onStartSession: () => void
  onEndSession: (s: WorkSession) => void
  onArchive: () => void
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
          <h3 className="project-name">{project.name}</h3>
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
            className="btn-danger btn-sm"
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
            <button type="button" className="btn-continue btn-sm" onClick={onStartSession}
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
        <p className="project-path" title={project.path}>
          {project.path}
        </p>
        <div className="project-actions">
          {!activeSession && (
            <button
              type="button"
              className="btn-success btn-sm"
              onClick={onStartSession}
              disabled={sessionState.status === 'starting'}
              title="Start a work session"
            >
              {sessionState.status === 'starting' ? '…' : '▶ Session'}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onGitScan}
            disabled={gitState.status === 'scanning'}
            title="Scan Git repository"
          >
            {gitState.status === 'scanning' ? '⟳' : '⎇'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onRepoScan}
            disabled={scanState.status === 'scanning'}
            title="Scan repository files"
          >
            {scanState.status === 'scanning' ? '⟳' : '⊞'}
          </button>
        </div>
      </div>

      <p className="project-opened">Last opened: {lastOpened}</p>
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
