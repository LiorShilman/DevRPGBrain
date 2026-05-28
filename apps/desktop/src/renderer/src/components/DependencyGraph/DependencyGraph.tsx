import { useMemo, useCallback, useRef } from 'react'
import {
  ReactFlow, MiniMap, Background, BackgroundVariant,
  type Node, type Edge, useNodesState, useEdgesState, MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Dagre from '@dagrejs/dagre'
import { getExtColor } from './fileColors'

interface ImportEdge { source: string; target: string }

interface Props {
  importEdges: ImportEdge[]
  projectName: string
}

const CAT_COLORS: Record<string, string> = {
  components: '#6366F1', services: '#14B8A6', store: '#F59E0B',
  utils: '#84CC16', hooks: '#EC4899', types: '#8B5CF6',
  styles: '#06B6D4', pages: '#EF4444', api: '#38bdf8',
  lib: '#A78BFA', config: '#64748B', modules: '#F97316',
}
const FALLBACK = ['#6366F1','#EC4899','#14B8A6','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#84CC16']

function getCategory(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean)
  const start = parts[0] === 'src' ? 1 : 0
  return parts[start]?.toLowerCase() ?? 'root'
}

function getCatColor(cat: string, idx: number): string {
  return CAT_COLORS[cat] ?? FALLBACK[idx % FALLBACK.length]
}

function buildLayout(edges: ImportEdge[]) {
  const filesInGraph = new Set<string>()
  for (const e of edges) { filesInGraph.add(e.source); filesInGraph.add(e.target) }

  const importCounts = new Map<string, number>()
  for (const e of edges) importCounts.set(e.target, (importCounts.get(e.target) ?? 0) + 1)

  const filePaths = [...filesInGraph]
  const categories = [...new Set(filePaths.map(getCategory))]

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70, marginx: 30, marginy: 30 })

  for (const fp of filePaths) g.setNode(fp, { width: 200, height: 44 })
  for (const e of edges) if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target)
  Dagre.layout(g)

  const flowNodes: Node[] = filePaths.map((fp) => {
    const pos = g.node(fp)
    const label = fp.split('/').pop() ?? fp
    const cat = getCategory(fp)
    const catIdx = categories.indexOf(cat)
    return {
      id: fp,
      position: { x: pos.x - 100, y: pos.y - 22 },
      data: {
        label,
        color: getExtColor(label),
        catColor: getCatColor(cat, catIdx),
        imports: importCounts.get(fp) ?? 0,
        dir: fp.split('/').slice(0, -1).join('/') || '/',
      },
      style: {
        background: '#111827',
        border: `1px solid ${getCatColor(cat, catIdx)}55`,
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 11,
        color: '#e5e7eb',
        minWidth: 160,
        maxWidth: 200,
      },
    }
  })

  const flowEdges: Edge[] = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { stroke: '#334155', strokeWidth: 1.2, opacity: 0.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: '#334155' },
  }))

  return { flowNodes, flowEdges, categories }
}

export default function DependencyGraph({ importEdges }: Props) {
  const { flowNodes: initNodes, flowEdges: initEdges } = useMemo(
    () => buildLayout(importEdges),
    [importEdges]
  )

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      const connected = new Set([node.id])
      const connEdges = new Set<string>()
      for (const e of importEdges) {
        if (e.source === node.id) { connected.add(e.target); connEdges.add(`${e.source}>${e.target}`) }
        if (e.target === node.id) { connected.add(e.source); connEdges.add(`${e.source}>${e.target}`) }
      }
      setEdges((eds) => eds.map((e) => {
        const active = connEdges.has(`${e.source}>${e.target}`)
        return {
          ...e,
          animated: active,
          style: { stroke: active ? '#38bdf8' : '#334155', strokeWidth: active ? 2 : 1, opacity: active ? 1 : 0.1 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: active ? '#38bdf8' : '#334155' },
        }
      }))
    }, 300)
  }, [importEdges, setEdges])

  const onNodeMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setEdges(initEdges)
  }, [initEdges, setEdges])

  if (importEdges.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 14 }}>
        No import relationships found. Run a scan first.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        fitView
        fitViewOptions={{ padding: 0.3, minZoom: 0.4, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <MiniMap
          style={{ background: '#111827', border: '1px solid #1e293b' }}
          maskColor="rgba(0,0,0,0.4)"
          nodeColor={(n) => (n.data as { catColor?: string }).catColor ?? '#334155'}
          pannable zoomable
        />
      </ReactFlow>
    </div>
  )
}
