import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow, MiniMap, Background, BackgroundVariant, Handle, Position,
  type Node, type Edge, type NodeProps, useNodesState, useEdgesState, MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Dagre from '@dagrejs/dagre'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import {
  projectsApi, gitApi, scanApi, sessionsApi, healthApi, brainApi, filesApi,
  Project, GitSnapshot, ScanResult, WorkSession, ProjectHealth,
  DependencyData, CommitInfo, BranchInfo, ChatMessage, ArchComponent, ArchConnection,
  FileNode, SearchResult, CodeAnalysisOutput,
} from '../services/api'
import DependencyGraph from '../components/DependencyGraph/DependencyGraph'
import { parseCodeSections, SECTION_CONFIG, type CodeSection } from '../utils/parseCodeSections'

type Tab = 'overview' | 'graph' | 'architecture' | 'branches' | 'radar' | 'files' | 'search' | 'brain'
const TAB_LABELS: Record<Tab, string> = {
  overview: '⊟ Overview',
  graph: '⬡ Graph',
  architecture: '⬢ Architecture',
  branches: '⎇ Branches',
  radar: '◎ Tech Radar',
  files: '⊞ Files',
  search: '⌕ Search',
  brain: '◈ Brain',
}

// ─── Architecture diagram ────────────────────────────────────────────────────

const ARCH_COLORS: Record<string, string> = {
  'react-frontend': '#61DAFB', 'angular-frontend': '#DD0031', 'vue-frontend': '#42B883',
  'static-frontend': '#F59E0B', 'rest-api': '#8B5CF6', 'graphql-api': '#E535AB',
  'nodejs-backend': '#10B981', 'python-backend': '#3572A5', 'java-backend': '#B07219',
  'go-backend': '#00ADD8', 'dotnet-backend': '#A97BFF',
  'prisma-orm': '#6366F1', 'redis-cache': '#F97316',
  'auth-system': '#EF4444', 'mongodb': '#22C55E', 'postgresql': '#38BDF8',
  'sqlite': '#64748B', 'mysql': '#F59E0B',
  'jest-testing': '#EC4899', 'cypress-testing': '#06B6D4',
  'github-actions-ci': '#2088FF', 'docker-ci': '#2496ED',
}

function ArchNodeComponent({ data }: NodeProps) {
  const d = data as { label: string; tech: string; icon: string; fileCount: number; color: string }
  const col = d.color
  return (
    <div className="arch-node" style={{
      borderColor: `${col}55`,
      boxShadow: `0 0 20px ${col}25, 0 4px 16px rgba(0,0,0,0.2)`,
    }}>
      <div className="arch-node-pulse" style={{ borderColor: `${col}20` }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="arch-node-icon" style={{ background: `${col}15`, borderColor: `${col}40`, color: col }}>
        {d.icon}
      </div>
      <div className="arch-node-content">
        <div className="arch-node-label">{d.label}</div>
        <div className="arch-node-sub">
          <span className="arch-node-tech" style={{ background: `${col}15`, borderColor: `${col}30`, color: col }}>
            {d.tech}
          </span>
          <span className="arch-node-files">{d.fileCount} files</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

const ARCH_NODE_TYPES = { arch: ArchNodeComponent }

function buildArchLayout(components: ArchComponent[], connections: ArchConnection[]) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 50, marginy: 50 })
  for (const c of components) g.setNode(c.id, { width: 220, height: 72 })
  for (const e of connections) if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to)
  Dagre.layout(g)

  const nodes: Node[] = components.map((c) => {
    const pos = g.node(c.id)
    const color = ARCH_COLORS[c.type] ?? '#64748B'
    return {
      id: c.id,
      type: 'arch',
      position: { x: pos.x - 110, y: pos.y - 36 },
      data: { label: c.label, tech: c.tech, icon: c.icon, fileCount: c.fileCount, color },
    }
  })

  const edges: Edge[] = connections.map((e, i) => {
    const srcColor = ARCH_COLORS[(components.find((c) => c.id === e.from)?.type) ?? ''] ?? '#334155'
    return {
      id: `ae${i}`,
      source: e.from,
      target: e.to,
      label: e.label || e.protocol || '',
      type: 'smoothstep',
      animated: true,
      style: { stroke: srcColor, strokeWidth: 1.5, opacity: 0.6 },
      labelStyle: { fill: '#64748b', fontSize: 10 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: srcColor },
    }
  })
  return { nodes, edges }
}

function ArchitectureTab({ depData }: { depData: DependencyData | null }) {
  const pattern = depData?.architecturePattern
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => pattern ? buildArchLayout(pattern.components, pattern.connections) : { nodes: [], edges: [] },
    [pattern]
  )
  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, , onEdgesChange] = useEdgesState(initEdges)

  if (!depData) return <TabCenter>No scan data — run a scan from the Projects page first.</TabCenter>
  if (!pattern || pattern.components.length === 0) return <TabCenter>No architecture patterns detected in this project.</TabCenter>

  return (
    <div className="tab-full-graph">
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={ARCH_NODE_TYPES}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        fitView fitViewOptions={{ padding: 0.25, minZoom: 0.3, maxZoom: 1.2 }}
        minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }}
        nodesFocusable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <MiniMap style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          maskColor="rgba(0,0,0,0.5)" pannable zoomable
          nodeColor={(n) => (n.data as { color?: string }).color ?? '#334155'}
        />
      </ReactFlow>
    </div>
  )
}

// ─── Graph tab ───────────────────────────────────────────────────────────────

function GraphTab({ depData }: { depData: DependencyData | null }) {
  if (!depData) return <TabCenter>No scan data — run a scan from the Projects page first.</TabCenter>
  if (depData.importEdges.length === 0) return <TabCenter>No import relationships found in this project.</TabCenter>
  return (
    <div className="tab-full-graph">
      <DependencyGraph importEdges={depData.importEdges} projectName="" />
    </div>
  )
}

// ─── Tech Radar ──────────────────────────────────────────────────────────────

const QUADRANTS: { label: string; color: string; start: number }[] = [
  { label: 'Languages',     color: '#8B5CF6', start: 0   },
  { label: 'Frameworks',    color: '#EC4899', start: 90  },
  { label: 'Tools',         color: '#06B6D4', start: 180 },
  { label: 'Infrastructure',color: '#F59E0B', start: 270 },
]
const RING_LABELS = ['Adopt', 'Trial', 'Assess', 'Hold']
const RING_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280']
const RING_RADII  = [65, 130, 195, 250]

const TECH_MAP: Record<string, { q: number; r: number }> = {
  // Languages (q=0)
  TypeScript: { q: 0, r: 0 }, JavaScript: { q: 0, r: 0 }, Python: { q: 0, r: 0 },
  Java: { q: 0, r: 1 }, Go: { q: 0, r: 0 }, Rust: { q: 0, r: 1 }, 'C#': { q: 0, r: 1 },
  PHP: { q: 0, r: 2 }, Ruby: { q: 0, r: 2 }, Dart: { q: 0, r: 1 }, Kotlin: { q: 0, r: 1 },
  Swift: { q: 0, r: 1 },
  // Frameworks (q=1)
  React: { q: 1, r: 0 }, Angular: { q: 1, r: 0 }, Vue: { q: 1, r: 0 }, Svelte: { q: 1, r: 1 },
  'Next.js': { q: 1, r: 0 }, Nuxt: { q: 1, r: 1 }, Remix: { q: 1, r: 1 },
  Express: { q: 1, r: 0 }, Fastify: { q: 1, r: 1 }, NestJS: { q: 1, r: 1 },
  Django: { q: 1, r: 0 }, FastAPI: { q: 1, r: 1 }, Spring: { q: 1, r: 1 }, Flutter: { q: 1, r: 1 },
  // Tools (q=2)
  Vite: { q: 2, r: 0 }, Webpack: { q: 2, r: 1 }, Rollup: { q: 2, r: 1 },
  ESLint: { q: 2, r: 0 }, Prettier: { q: 2, r: 0 }, Jest: { q: 2, r: 0 },
  Cypress: { q: 2, r: 1 }, Vitest: { q: 2, r: 0 }, Tailwind: { q: 2, r: 0 },
  'Tailwind CSS': { q: 2, r: 0 }, Bootstrap: { q: 2, r: 2 }, Sass: { q: 2, r: 1 },
  // Infrastructure (q=3)
  Docker: { q: 3, r: 0 }, 'GitHub Actions': { q: 3, r: 0 },
  Prisma: { q: 3, r: 0 }, PostgreSQL: { q: 3, r: 0 }, SQLite: { q: 3, r: 0 },
  MongoDB: { q: 3, r: 1 }, MySQL: { q: 3, r: 1 }, Redis: { q: 3, r: 1 },
  Firebase: { q: 3, r: 1 }, Supabase: { q: 3, r: 1 },
  Node: { q: 1, r: 0 }, 'Node.js': { q: 1, r: 0 },
}

function techHash(s: string, seed = 0): number {
  let h = seed * 2654435761
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9)
  return Math.abs(h >>> 0)
}

function blipPos(tech: string, q: number, r: number, CX: number, CY: number) {
  const rInner = r === 0 ? 12 : RING_RADII[r - 1] + 8
  const rOuter = RING_RADII[r] - 8
  const radius = rInner + (techHash(tech, 1) % (rOuter - rInner))
  const angleStart = QUADRANTS[q].start + 5
  const angleRange = 80
  const angleDeg = angleStart + (techHash(tech, 2) % angleRange)
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

function TechRadarTab({ scan }: { scan: ScanResult | null }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const CX = 300, CY = 300, SIZE = 600

  const blips = useMemo(() => {
    if (!scan) return []
    const all = [...new Set([...scan.detectedStack, ...scan.detectedLanguages])]
    return all.map((tech) => {
      const mapped = Object.entries(TECH_MAP).find(([k]) => tech.toLowerCase().includes(k.toLowerCase()))
      const { q, r } = mapped?.[1] ?? { q: Math.abs(techHash(tech)) % 4, r: 2 }
      const pos = blipPos(tech, q, r, CX, CY)
      return { tech, q, r, ...pos }
    })
  }, [scan])

  if (!scan || blips.length === 0) {
    return <TabCenter>No scan data — run a scan first to see tech radar.</TabCenter>
  }

  return (
    <div className="tech-radar-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="tech-radar-svg">
        {/* Ring fills */}
        {RING_RADII.map((r, i) => (
          <circle key={i} cx={CX} cy={CY} r={r}
            fill={RING_COLORS[i]} fillOpacity={0.03}
            stroke={RING_COLORS[i]} strokeOpacity={0.25} strokeWidth={1}
          />
        ))}
        {/* Quadrant dividers */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180
          return (
            <line key={deg}
              x1={CX} y1={CY}
              x2={CX + RING_RADII[3] * Math.sin(rad)}
              y2={CY - RING_RADII[3] * Math.cos(rad)}
              stroke="#1e293b" strokeWidth={1}
            />
          )
        })}
        {/* Ring labels */}
        {RING_RADII.map((r, i) => (
          <text key={i}
            x={CX + (i === 0 ? 0 : RING_RADII[i - 1] + 4) + 4}
            y={CY - 4}
            fontSize={9} fill={RING_COLORS[i]} fillOpacity={0.6} fontFamily="sans-serif"
          >
            {RING_LABELS[i]}
          </text>
        ))}
        {/* Quadrant labels */}
        {QUADRANTS.map((qt, i) => {
          const midDeg = qt.start + 45
          const midRad = (midDeg * Math.PI) / 180
          const labelR = RING_RADII[3] + 22
          return (
            <text key={i}
              x={CX + labelR * Math.sin(midRad)}
              y={CY - labelR * Math.cos(midRad)}
              fontSize={11} fontWeight="600" fill={qt.color} fontFamily="sans-serif"
              textAnchor="middle" dominantBaseline="middle"
            >
              {qt.label}
            </text>
          )
        })}
        {/* Blips */}
        {blips.map((b) => {
          const col = QUADRANTS[b.q].color
          const isHov = hovered === b.tech
          return (
            <g key={b.tech} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(b.tech)}
              onMouseLeave={() => setHovered(null)}>
              {isHov && <circle cx={b.x} cy={b.y} r={10} fill={col} opacity={0.2} />}
              <circle cx={b.x} cy={b.y} r={isHov ? 6 : 5}
                fill={col} opacity={isHov ? 1 : 0.75}
                stroke={isHov ? '#fff' : 'none'} strokeWidth={1.5}
              />
              {isHov && (
                <text x={b.x} y={b.y - 12} textAnchor="middle"
                  fontSize={11} fontWeight="600" fill={col} fontFamily="sans-serif"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                  {b.tech}
                </text>
              )}
            </g>
          )
        })}
        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill="#334155" />
      </svg>

      <div className="radar-legend">
        {QUADRANTS.map((qt) => (
          <div key={qt.label} className="radar-legend-quadrant">
            <span className="radar-legend-label" style={{ color: qt.color }}>● {qt.label}</span>
            <div className="radar-legend-items">
              {blips.filter((b) => b.q === QUADRANTS.indexOf(qt)).map((b) => (
                <span
                  key={b.tech}
                  className={`radar-blip-tag${hovered === b.tech ? ' hovered' : ''}`}
                  style={{ borderColor: `${qt.color}40`, color: qt.color }}
                  onMouseEnter={() => setHovered(b.tech)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {b.tech}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Branches tab ────────────────────────────────────────────────────────────

function BranchesTab({ projectId }: { projectId: string }) {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([gitApi.getBranches(projectId), gitApi.getCommits(projectId, 60)])
      .then(([b, c]) => { setBranches(b); setCommits(c) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <TabCenter><span className="brain-thinking-dots"><span /><span /><span /></span> Loading…</TabCenter>
  if (error) return <TabCenter style={{ color: '#ef4444' }}>Git error: {error}</TabCenter>
  if (branches.length === 0) return <TabCenter>No branches found. Run a Git scan first.</TabCenter>

  const currentBranch = branches.find((b) => b.isCurrent)

  return (
    <div className="branches-tab">
      <div className="branch-pills">
        {branches.map((b) => (
          <span key={b.name} className={`branch-pill${b.isCurrent ? ' current' : ''}`}>
            ⎇ {b.name}
          </span>
        ))}
      </div>
      <div className="commit-timeline">
        {commits.map((c, i) => {
          const isFirst = i === 0
          return (
            <div key={c.hash} className={`commit-item${isFirst ? ' commit-head' : ''}`} style={{ animationDelay: `${i * 0.03}s` }}>
              <div className="commit-track">
                <div className="commit-dot" style={isFirst ? { background: '#38bdf8', boxShadow: '0 0 8px #38bdf825' } : {}} />
                {i < commits.length - 1 && <div className="commit-line" />}
              </div>
              <div className="commit-body">
                <div className="commit-msg">{c.message}</div>
                <div className="commit-meta">
                  <span className="commit-hash">{c.hash}</span>
                  <span className="commit-author">{c.author}</span>
                  <span className="commit-date">{new Date(c.date).toLocaleDateString()}</span>
                </div>
                {isFirst && currentBranch && (
                  <span className="commit-head-badge">HEAD · {currentBranch.name}</span>
                )}
              </div>
            </div>
          )
        })}
        {commits.length === 0 && <p className="branches-empty">No commits found.</p>}
      </div>
    </div>
  )
}

// ─── Brain tab ───────────────────────────────────────────────────────────────

function BrainTab({ project }: { project: Project }) {
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
      const { reply } = await brainApi.chat(project.id, q, [...history, userMsg])
      setHistory((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brain error')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) }
  }

  return (
    <div className="brain-tab">
      <div className="global-brain-messages">
        {history.length === 0 && (
          <div className="brain-empty">
            <p className="brain-empty-hint">Ask anything about <strong>{project.name}</strong> — context, next steps, decisions, blockers.</p>
            <div className="brain-suggestions">
              {['What should I work on next?', 'What were the last blockers?', 'Summarize where I left off'].map((s) => (
                <button key={s} type="button" className="brain-suggestion" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`brain-msg brain-msg-${msg.role}`}>
            <span className="brain-msg-label">{msg.role === 'user' ? 'You' : '◈ Brain'}</span>
            <div className="brain-msg-body" dir="auto">
              <p className="md-para">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="brain-msg brain-msg-assistant">
            <span className="brain-msg-label">◈ Brain</span>
            <div className="brain-msg-body">
              <span className="brain-thinking-dots"><span /><span /><span /></span>
            </div>
          </div>
        )}
        {error && <p className="brain-error">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <form className="brain-input-row" onSubmit={handleSend}>
        <textarea ref={inputRef} className="brain-input" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask about this project…" rows={1} dir="auto"
        />
        <button type="submit" className="brain-send-btn" disabled={loading || !input.trim()} title="Send">▶</button>
      </form>
    </div>
  )
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono, truncate }: { label: string; value: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className={`detail-row-value${mono ? ' mono' : ''}${truncate ? ' truncate' : ''}`} title={value}>{value}</span>
    </div>
  )
}

function OverviewTab({ project, git, scan, sessions, health }: {
  project: Project; git: GitSnapshot | null; scan: ScanResult | null
  sessions: WorkSession[]; health: ProjectHealth | null
}) {
  return (
    <div className="overview-grid">
      <div className="overview-col">
        <div className="detail-card">
          <h3 className="detail-card-title">Project Info</h3>
          <div className="detail-rows">
            <DetailRow label="Path" value={project.path} mono truncate />
            {project.description && <DetailRow label="Description" value={project.description} />}
            {project.primaryLanguage && <DetailRow label="Language" value={project.primaryLanguage} />}
            {project.framework && <DetailRow label="Framework" value={project.framework} />}
            <DetailRow label="Git" value={project.isGitRepo ? '✓ Yes' : '✗ No'} />
          </div>
        </div>
        {git && (
          <div className="detail-card">
            <h3 className="detail-card-title">Git Status</h3>
            <div className="detail-rows">
              <DetailRow label="Branch" value={git.branch ?? '—'} />
              {git.lastCommitMessage && <DetailRow label="Last commit" value={git.lastCommitMessage} />}
              {git.lastCommitHash && <DetailRow label="Hash" value={git.lastCommitHash} mono />}
              <DetailRow label="Changed" value={`${git.changedFilesCount} files`} />
            </div>
          </div>
        )}
        {scan && (
          <div className="detail-card">
            <h3 className="detail-card-title">Last Scan</h3>
            <div className="detail-rows">
              <DetailRow label="Files" value={String(scan.fileCount)} />
              {scan.todoCount > 0 && <DetailRow label="TODOs" value={String(scan.todoCount)} />}
              {scan.fixmeCount > 0 && <DetailRow label="FIXMEs" value={String(scan.fixmeCount)} />}
            </div>
            {scan.detectedStack.length > 0 && (
              <div className="stack-tags">{scan.detectedStack.map((s) => <span key={s} className="meta-badge">{s}</span>)}</div>
            )}
          </div>
        )}
      </div>
      <div className="overview-col">
        {health && (
          <div className="detail-card">
            <h3 className="detail-card-title">Health Score</h3>
            <div className="health-score-row">
              <div className={`health-score-circle health-${health.status.toLowerCase()}`}>{health.score}</div>
              <div>
                <p className="health-status-label">{health.status}</p>
                {health.recommendations.slice(0, 3).map((r, i) => <p key={i} className="health-rec">→ {r}</p>)}
              </div>
            </div>
          </div>
        )}
        <div className="detail-card">
          <h3 className="detail-card-title">Recent Sessions</h3>
          {sessions.length === 0 ? <p className="detail-empty">No sessions yet.</p> : (
            <div className="session-list">
              {sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="session-item">
                  <div className="session-item-header">
                    <span className="session-item-title">{s.title ?? 'Session'}</span>
                    <span className="session-item-duration">{s.durationMinutes ? `${s.durationMinutes}m` : '—'}</span>
                  </div>
                  <div className="session-item-meta">
                    {new Date(s.startedAt).toLocaleDateString()}
                    {s.xpAwarded > 0 && <span className="session-xp">+{s.xpAwarded} XP</span>}
                  </div>
                  {s.nextSteps.length > 0 && <p className="session-next">▸ {s.nextSteps[0]}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Files tab ───────────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, string> = {
  ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️', py: '🐍', go: '🐹',
  java: '☕', cs: '🟣', cpp: '⚙️', c: '⚙️', rs: '🦀', rb: '💎',
  php: '🐘', kt: '🟠', swift: '🍊', html: '🌐', css: '🎨', scss: '🎨',
  json: '📋', yaml: '📋', yml: '📋', md: '📝', sh: '💻', bash: '💻',
  sql: '🗃️', prisma: '△', toml: '⚙️', xml: '📄', graphql: '⬡',
}

function FileTreeNode({ node, depth, selectedPath, onSelect }: {
  node: FileNode; depth: number; selectedPath: string | null; onSelect: (f: FileNode) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const icon = node.type === 'dir' ? (open ? '▾' : '▸') : (FILE_ICONS[node.ext ?? ''] ?? '📄')
  const isSelected = selectedPath === node.path

  if (node.type === 'dir') {
    return (
      <div>
        <button
          type="button"
          className="file-tree-dir"
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="file-tree-arrow">{icon}</span>
          <span className="file-tree-name">{node.name}</span>
          {node.children && <span className="file-tree-count">{node.children.length}</span>}
        </button>
        {open && node.children?.map((child) => (
          <FileTreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`file-tree-file${isSelected ? ' selected' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => onSelect(node)}
    >
      <span className="file-tree-icon">{icon}</span>
      <span className="file-tree-name">{node.name}</span>
      {node.size !== undefined && node.size > 0 && (
        <span className="file-tree-size">{node.size < 1024 ? `${node.size}B` : `${(node.size / 1024).toFixed(1)}K`}</span>
      )}
    </button>
  )
}

function CodeViewer({ code, language }: { code: string; language: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // hljs v11 sets data-highlighted="yes" and skips re-highlighting — clear it first
    delete el.dataset['highlighted']
    el.className = `language-${language}`
    el.textContent = code
    hljs.highlightElement(el)
  }, [code, language])
  return (
    <pre className="code-viewer-pre">
      <code ref={ref} />
    </pre>
  )
}

// ─── Markdown renderer (for AI streaming output) ─────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^(\d+)\.\s/gm, '<span class="md-num">$1.</span> ')
    .replace(/^[-*]\s/gm, '<span class="md-bullet">•</span> ')
    .replace(/\n/g, '<br/>')
}

// ─── CodeMapView ──────────────────────────────────────────────────────────────

function SectionAiPanel({ projectId, filePath, content, language, section, onClose }: {
  projectId: string; filePath: string; content: string; language: string
  section: CodeSection | null; onClose: () => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheKey = section ? `codemap_${filePath}_${section.startLine}` : `codemap_file_${filePath}`

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setText(cached); return }

    setLoading(true)
    setText('')
    setError(null)
    let accumulated = ''
    filesApi.analyzeStream(
      projectId,
      { filePath, content: section ? section.code : content, language, sectionName: section?.name, sectionType: section ? SECTION_CONFIG[section.type].label : undefined },
      (chunk) => { accumulated += chunk; setText(accumulated) }
    )
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        setLoading(false)
        if (accumulated) localStorage.setItem(cacheKey, accumulated)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  function handleReanalyze() {
    localStorage.removeItem(cacheKey)
    setText(''); setLoading(true); setError(null)
    let accumulated = ''
    filesApi.analyzeStream(
      projectId,
      { filePath, content: section ? section.code : content, language, sectionName: section?.name, sectionType: section ? SECTION_CONFIG[section.type].label : undefined },
      (chunk) => { accumulated += chunk; setText(accumulated) }
    )
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        setLoading(false)
        if (accumulated) localStorage.setItem(cacheKey, accumulated)
      })
  }

  return (
    <div className="cm-ai-panel">
      <div className="cm-ai-panel-header">
        <span className="cm-ai-panel-title">◈ {section ? `${section.name}` : 'Full File'}</span>
        {loading && <span className="brain-thinking-dots"><span /><span /><span /></span>}
        {!loading && text && <button type="button" className="cm-ai-reanalyze" onClick={handleReanalyze} title="Re-analyze">↺</button>}
        <button type="button" className="cm-ai-close" onClick={onClose}>✕</button>
      </div>
      {error && <p className="cm-ai-error">{error}</p>}
      {text && (
        <div
          className="cm-ai-content"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      )}
    </div>
  )
}

function CodeMapView({ projectId, filePath, content, language }: {
  projectId: string; filePath: string; content: string; language: string
}) {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const sections = useMemo(() => parseCodeSections(content, ext), [content, ext])
  const totalLines = content.split('\n').length
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [aiTarget, setAiTarget] = useState<{ section: CodeSection | null } | null>(null)

  const sectionSummary = useMemo(() => {
    const s: Record<string, number> = {}
    for (const sec of sections) s[sec.type] = (s[sec.type] ?? 0) + 1
    return s
  }, [sections])

  if (sections.length === 0) {
    return <TabCenter>No parseable sections found in this file.</TabCenter>
  }

  return (
    <div className="cm-wrap">
      {/* Overview bar */}
      <div className="cm-overview">
        <div className="cm-stats">
          <span className="cm-stat">{totalLines} lines</span>
          <span className="cm-stat">{sections.length} sections</span>
        </div>
        <div className="cm-minimap">
          {sections.map((s, i) => {
            const cfg = SECTION_CONFIG[s.type]
            const w = Math.max((s.lineCount / totalLines) * 100, 1.5)
            return <div key={i} className="cm-minimap-block" style={{ '--w': `${w}%`, '--col': cfg.color } as React.CSSProperties} title={`${cfg.label}: ${s.name} (${s.lineCount}L)`} />
          })}
        </div>
        <div className="cm-legend">
          {Object.entries(sectionSummary).map(([type, count]) => {
            const cfg = SECTION_CONFIG[type as keyof typeof SECTION_CONFIG]
            return (
              <span key={type} className="cm-legend-item">
                <span className="cm-legend-dot" style={{ '--col': cfg?.color } as React.CSSProperties} />
                {cfg?.label} ({count})
              </span>
            )
          })}
        </div>
        <button
          type="button"
          className="btn-analyze"
          onClick={() => setAiTarget({ section: null })}
        >
          ◈ Explain File
        </button>
      </div>

      {/* Full-file AI panel */}
      {aiTarget?.section === null && (
        <SectionAiPanel
          projectId={projectId} filePath={filePath} content={content} language={language}
          section={null} onClose={() => setAiTarget(null)}
        />
      )}

      {/* Sections */}
      <div className="cm-sections">
        {sections.map((section, i) => {
          const cfg = SECTION_CONFIG[section.type]
          const isExpanded = expandedIdx === i
          const isAiActive = aiTarget?.section === section

          return (
            <div key={i} className={`cm-section${isExpanded ? ' cm-section-expanded' : ''}`} style={{ '--cm-color': cfg.color } as React.CSSProperties}>
              <div className="cm-section-row">
                <button type="button" className="cm-section-header" onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                  <div className="cm-section-stripe" />
                  <span className="cm-section-icon">{cfg.icon}</span>
                  <div className="cm-section-info">
                    <span className="cm-section-name">{section.name}</span>
                    <span className="cm-section-sig">{section.signature.slice(0, 80)}</span>
                  </div>
                  <span className="cm-section-meta">L{section.startLine}–{section.endLine} · {section.lineCount}L</span>
                </button>
                {section.type !== 'import' && (
                  <button
                    type="button"
                    className={`cm-ai-btn${isAiActive ? ' active' : ''}`}
                    title="Explain with AI"
                    onClick={(e) => { e.stopPropagation(); setAiTarget(isAiActive ? null : { section }) }}
                  >
                    ◈
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="cm-section-code">
                  <CodeViewer code={section.code} language={language} />
                </div>
              )}

              {isAiActive && (
                <SectionAiPanel
                  projectId={projectId} filePath={filePath} content={content} language={language}
                  section={section} onClose={() => setAiTarget(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Files tab ────────────────────────────────────────────────────────────────

function FilesTab({ projectId }: { projectId: string }) {
  const [tree, setTree] = useState<FileNode[] | null>(null)
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState<{ content: string; language: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'code' | 'map'>('code')

  useEffect(() => {
    filesApi.getTree(projectId)
      .then(setTree)
      .catch((e: Error) => setTreeError(e.message))
      .finally(() => setTreeLoading(false))
  }, [projectId])

  const handleSelectFile = useCallback(async (node: FileNode) => {
    if (node.type !== 'file') return
    setSelected(node)
    setFileContent(null)
    setFileError(null)
    setFileLoading(true)
    try {
      const result = await filesApi.getContent(projectId, node.path)
      setFileContent(result)
    } catch (e) {
      setFileError((e as Error).message)
    } finally {
      setFileLoading(false)
    }
  }, [projectId])

  if (treeLoading) return <TabCenter><span className="brain-thinking-dots"><span /><span /><span /></span> Loading files…</TabCenter>
  if (treeError) return <TabCenter style={{ color: '#ef4444' }}>Error: {treeError}</TabCenter>
  if (!tree || tree.length === 0) return <TabCenter>No files found in this project.</TabCenter>

  return (
    <div className="files-tab">
      <div className="file-tree-panel">
        <div className="file-tree-header">
          <span>Files</span>
          {tree && <span className="file-tree-total">{tree.length} entries</span>}
        </div>
        <div className="file-tree-scroll">
          {tree.map((node) => (
            <FileTreeNode key={node.path} node={node} depth={0} selectedPath={selected?.path ?? null} onSelect={handleSelectFile} />
          ))}
        </div>
      </div>

      <div className="file-content-panel">
        {!selected && (
          <div className="file-content-empty">
            <p>← Select a file to view its contents</p>
          </div>
        )}
        {selected && (
          <>
            <div className="file-content-header">
              <span className="file-content-path">{selected.path}</span>
              <div className="file-content-actions">
                {fileContent && (
                  <div className="view-mode-toggle">
                    <button type="button" className={`view-mode-btn${viewMode === 'code' ? ' active' : ''}`} onClick={() => setViewMode('code')}>Code</button>
                    <button type="button" className={`view-mode-btn${viewMode === 'map' ? ' active' : ''}`} onClick={() => setViewMode('map')}>◈ Map</button>
                  </div>
                )}
              </div>
            </div>

            <div className="file-code-area">
              {fileLoading && <div className="file-loading"><span className="brain-thinking-dots"><span /><span /><span /></span></div>}
              {fileError && <p className="file-error">{fileError}</p>}
              {fileContent && !fileLoading && viewMode === 'code' && (
                <CodeViewer code={fileContent.content} language={fileContent.language} />
              )}
              {fileContent && !fileLoading && viewMode === 'map' && (
                <CodeMapView
                  projectId={projectId}
                  filePath={selected.path}
                  content={fileContent.content}
                  language={fileContent.language}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Search tab ───────────────────────────────────────────────────────────────

function SearchTab({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults(null); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await filesApi.search(projectId, query)
        setResults(r)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, projectId])

  const nameMatches = results?.filter((r) => r.matchType === 'name') ?? []
  const contentMatches = results?.filter((r) => r.matchType === 'content') ?? []

  return (
    <div className="search-tab">
      <div className="search-input-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and code…"
          autoFocus
        />
        {loading && <span className="search-spinner"><span className="brain-thinking-dots"><span /><span /><span /></span></span>}
      </div>

      {error && <p className="search-error">{error}</p>}

      {results !== null && (
        <div className="search-results">
          {results.length === 0 && <p className="search-empty">No results for "{query}"</p>}

          {nameMatches.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">Files ({nameMatches.length})</div>
              {nameMatches.map((r) => (
                <div key={r.path} className="search-result-item">
                  <span className="search-result-name">{r.name}</span>
                  <span className="search-result-path">{r.path}</span>
                </div>
              ))}
            </div>
          )}

          {contentMatches.length > 0 && (
            <div className="search-group">
              <div className="search-group-label">In code ({contentMatches.length})</div>
              {contentMatches.map((r, i) => (
                <div key={`${r.path}-${i}`} className="search-result-item content-match">
                  <div className="search-result-top">
                    <span className="search-result-name">{r.name}</span>
                    {r.lineNumber && <span className="search-result-line">:{r.lineNumber}</span>}
                    <span className="search-result-path">{r.path}</span>
                  </div>
                  {r.lineContent && (
                    <div className="search-result-preview">{r.lineContent}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results === null && query.length === 0 && (
        <p className="search-hint">Type at least 2 characters to search</p>
      )}
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function TabCenter({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="tab-center" style={style}>{children}</div>
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [git, setGit] = useState<GitSnapshot | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [health, setHealth] = useState<ProjectHealth | null>(null)
  const [depData, setDepData] = useState<DependencyData | null>(null)
  const [depLoaded, setDepLoaded] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      projectsApi.get(id),
      sessionsApi.list(id).catch(() => [] as WorkSession[]),
      healthApi.getLatest(id).catch(() => null),
      gitApi.getSnapshot(id).catch(() => null),
      scanApi.getLatest(id).catch(() => null),
    ]).then(([proj, sess, h, g, s]) => {
      setProject(proj); setSessions(sess); setHealth(h); setGit(g); setScan(s)
      setLoading(false)
    }).catch(() => navigate('/projects'))
  }, [id, navigate])

  useEffect(() => {
    if (!id || depLoaded) return
    if (tab === 'graph' || tab === 'architecture') {
      setDepLoaded(true)
      scanApi.getDependencies(id).then(setDepData).catch(() => {})
    }
  }, [tab, id, depLoaded])

  if (loading) return <TabCenter><span className="brain-thinking-dots"><span /><span /><span /></span></TabCenter>
  if (!project || !id) return null

  return (
    <div className="project-detail-page">
      <div className="project-detail-header">
        <button type="button" className="btn-ghost btn-back" onClick={() => navigate('/projects')}>← Projects</button>
        <div className="project-detail-title">
          <h1>{project.name}</h1>
          {project.primaryLanguage && <span className="meta-badge">{project.primaryLanguage}</span>}
          {project.framework && <span className="meta-badge">{project.framework}</span>}
          {health && (
            <span className={`health-mini-badge health-${health.status.toLowerCase()}`}>
              {health.score} {health.status}
            </span>
          )}
        </div>
      </div>

      <nav className="project-detail-tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} type="button"
            className={`project-detail-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <div className="project-detail-content">
        {tab === 'overview'      && <OverviewTab project={project} git={git} scan={scan} sessions={sessions} health={health} />}
        {tab === 'graph'         && <GraphTab depData={depData} />}
        {tab === 'architecture'  && <ArchitectureTab depData={depData} />}
        {tab === 'branches'      && <BranchesTab projectId={id} />}
        {tab === 'radar'         && <TechRadarTab scan={scan} />}
        {tab === 'files'         && <FilesTab projectId={id} />}
        {tab === 'search'        && <SearchTab projectId={id} />}
        {tab === 'brain'         && <BrainTab project={project} />}
      </div>
    </div>
  )
}
