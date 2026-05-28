import { Component, useEffect, useState, type ReactNode } from 'react'
import { scanApi, DependencyData, Project } from '../../services/api'
import DependencyGraph from './DependencyGraph'

class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', fontSize: 13 }}>
        Graph error: {this.state.error}
      </div>
    )
    return this.props.children
  }
}

interface Props {
  project: Project
  onClose: () => void
}

export default function DependencyGraphModal({ project, onClose }: Props) {
  const [data, setData] = useState<DependencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    scanApi.getDependencies(project.id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [project.id])

  const HEADER_H = 65

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="dep-graph-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dep-graph-modal-header">
          <div>
            <h2>⬡ Dependency Graph — <span className="text-primary">{project.name}</span></h2>
            {data && (
              <p className="dep-graph-modal-subtitle">
                {data.importEdges.length} import relationships
                {data.architecturePattern && ` · ${data.architecturePattern.components.length} architecture components`}
                {' · scroll to zoom · drag to pan'}
              </p>
            )}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>

        <div style={{ height: `calc(80vh - ${HEADER_H}px)`, position: 'relative', overflow: 'hidden' }}>
          {loading && (
            <div className="dep-graph-center">
              <span className="brain-thinking-dots"><span /><span /><span /></span>
              Loading dependency data…
            </div>
          )}
          {error && (
            <div className="dep-graph-center" style={{ flexDirection: 'column', gap: 12 }}>
              <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Run a project scan first to generate dependency data.</p>
            </div>
          )}
          {data && !loading && (
            <GraphErrorBoundary>
              <DependencyGraph
                importEdges={data.importEdges}
                projectName={project.name}
              />
            </GraphErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}
