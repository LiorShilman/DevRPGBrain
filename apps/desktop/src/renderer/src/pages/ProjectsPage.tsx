import { useEffect, useRef, useState } from 'react'
import { projectsApi, gitApi, scanApi, Project, GitScanResult, ScanResult } from '../services/api'

type GitState  = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: GitScanResult } | { status: 'error'; message: string }
type ScanState = { status: 'idle' } | { status: 'scanning' } | { status: 'done'; data: ScanResult }  | { status: 'error'; message: string }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [gitStates, setGitStates] = useState<Record<string, GitState>>({})
  const [scanStates, setScanStates] = useState<Record<string, ScanState>>({})

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const list = await projectsApi.list()
      setProjects(list)
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
      // Update isGitRepo flag on the project card
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
              onGitScan={() => handleGitScan(p)}
              onRepoScan={() => handleRepoScan(p)}
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
    </div>
  )
}

function ProjectCard({
  project,
  gitState,
  scanState,
  onGitScan,
  onRepoScan,
  onArchive,
}: {
  project: Project
  gitState: GitState
  scanState: ScanState
  onGitScan: () => void
  onRepoScan: () => void
  onArchive: () => void
}) {
  const lastOpened = project.lastOpenedAt
    ? new Date(project.lastOpenedAt).toLocaleDateString()
    : 'Never'

  const git = gitState.status === 'done' ? gitState.data : null
  const scan = scanState.status === 'done' ? scanState.data : null

  return (
    <div className="project-card">
      <div className="project-card-header">
        <div>
          <h3 className="project-name">{project.name}</h3>
          {project.description && <p className="project-desc">{project.description}</p>}
        </div>
        <button type="button" className="btn-ghost btn-sm" title="Archive project" onClick={onArchive}>
          ✕
        </button>
      </div>

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
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onGitScan}
            disabled={gitState.status === 'scanning'}
            title="Scan Git repository"
          >
            {gitState.status === 'scanning' ? '⟳ Scanning…' : '⎇ Git'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onRepoScan}
            disabled={scanState.status === 'scanning'}
            title="Scan repository files"
          >
            {scanState.status === 'scanning' ? '⟳ Scanning…' : '⊞ Scan'}
          </button>
        </div>
      </div>

      <p className="project-opened">Last opened: {lastOpened}</p>
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
