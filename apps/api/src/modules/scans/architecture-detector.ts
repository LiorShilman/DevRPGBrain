export interface ArchComponent {
  id: string
  type: 'frontend' | 'backend' | 'api' | 'database' | 'auth' | 'cache' | 'storage' | 'external' | 'ci' | 'testing'
  label: string
  tech: string
  icon: string
  fileCount: number
}

export interface ArchConnection {
  from: string
  to: string
  label: string
  protocol: string
}

export interface ArchitecturePattern {
  components: ArchComponent[]
  connections: ArchConnection[]
}

const DETECTORS: {
  type: ArchComponent['type']
  label: string
  tech: string
  icon: string
  dirs?: RegExp[]
  files?: RegExp[]
}[] = [
  { type: 'frontend', label: 'React Frontend',   tech: 'React',    icon: '⚛',  files: [/\.(tsx|jsx)$/],         dirs: [/^src\/components/i, /^src\/pages/i] },
  { type: 'frontend', label: 'Angular Frontend',  tech: 'Angular',  icon: '🅰',  files: [/angular\.json$/, /\.component\.ts$/] },
  { type: 'frontend', label: 'Vue Frontend',      tech: 'Vue',      icon: '💚', files: [/\.vue$/] },
  { type: 'frontend', label: 'Static Frontend',   tech: 'HTML',     icon: '🌐', files: [/\.html$/],              dirs: [/^public/i, /^static/i] },
  { type: 'backend',  label: 'Node.js Server',    tech: 'Node.js',  icon: '🟢', files: [/server\.(ts|js)$/, /app\.(ts|js)$/], dirs: [/^src\/server/i, /^backend/i] },
  { type: 'backend',  label: 'Python Server',     tech: 'Python',   icon: '🐍', files: [/manage\.py$/, /app\.py$/, /main\.py$/] },
  { type: 'backend',  label: 'Java Server',       tech: 'Java',     icon: '☕', files: [/\.java$/, /pom\.xml$/],  dirs: [/^src\/main\/java/i] },
  { type: 'backend',  label: 'Go Server',         tech: 'Go',       icon: '🔵', files: [/go\.mod$/, /main\.go$/] },
  { type: 'backend',  label: '.NET Server',       tech: '.NET',     icon: '🟣', files: [/\.csproj$/, /Program\.cs$/] },
  { type: 'api',      label: 'REST API',          tech: 'REST',     icon: '🔌', dirs: [/\/(api|routes|controllers)/i], files: [/routes?\.(ts|js)$/, /controller\.(ts|js)$/] },
  { type: 'api',      label: 'GraphQL API',       tech: 'GraphQL',  icon: '◈',  files: [/\.graphql$/, /resolvers?\.(ts|js)$/] },
  { type: 'database', label: 'PostgreSQL/SQLite',  tech: 'Prisma',  icon: '🗄',  files: [/schema\.prisma$/],      dirs: [/^prisma/i] },
  { type: 'database', label: 'MongoDB',            tech: 'MongoDB', icon: '🍃', files: [/\.model\.(ts|js)$/],    dirs: [/^models/i] },
  { type: 'database', label: 'SQL',                tech: 'SQL',     icon: '💾', files: [/\.sql$/, /\.sqlite$/] },
  { type: 'auth',     label: 'Authentication',    tech: 'Auth',     icon: '🔐', dirs: [/\/(auth|authentication)/i], files: [/auth\.(ts|js)$/, /jwt/i] },
  { type: 'cache',    label: 'Cache Layer',        tech: 'Redis',   icon: '⚡', files: [/redis/i, /cache\.(ts|js)$/] },
  { type: 'testing',  label: 'Test Suite',         tech: 'Testing', icon: '🧪', dirs: [/\/(tests?|__tests__|spec|cypress)/i], files: [/\.(test|spec)\.(ts|js|tsx|jsx)$/] },
  { type: 'ci',       label: 'CI/CD Pipeline',    tech: 'CI/CD',   icon: '🔄', dirs: [/^\.github\/workflows/i], files: [/Dockerfile$/, /docker-compose/i] },
]

const CONNECTION_RULES: { from: ArchComponent['type']; to: ArchComponent['type']; label: string; protocol: string }[] = [
  { from: 'frontend', to: 'api',      label: 'HTTP Requests', protocol: 'REST/GraphQL' },
  { from: 'frontend', to: 'backend',  label: 'HTTP Requests', protocol: 'HTTP' },
  { from: 'frontend', to: 'auth',     label: 'Login/Token',   protocol: 'JWT' },
  { from: 'api',      to: 'backend',  label: 'Route Handling', protocol: 'Internal' },
  { from: 'backend',  to: 'database', label: 'Queries',        protocol: 'SQL/ORM' },
  { from: 'backend',  to: 'cache',    label: 'Read/Write',     protocol: 'Redis' },
  { from: 'backend',  to: 'auth',     label: 'Verify',         protocol: 'Middleware' },
  { from: 'api',      to: 'database', label: 'CRUD',           protocol: 'ORM' },
  { from: 'ci',       to: 'testing',  label: 'Run Tests',      protocol: 'Pipeline' },
]

export function detectArchitecture(filePaths: string[]): ArchitecturePattern {
  const detected: ArchComponent[] = []

  for (const det of DETECTORS) {
    let count = 0
    for (const fp of filePaths) {
      const hitDir  = det.dirs?.some((r) => r.test(fp))
      const hitFile = det.files?.some((r) => r.test(fp))
      if (hitDir || hitFile) count++
    }
    if (count === 0) continue

    const singleTypes = ['frontend', 'backend'] as const
    if ((singleTypes as readonly string[]).includes(det.type) && detected.some((c) => c.type === det.type)) continue

    detected.push({ id: `${det.type}-${det.tech.toLowerCase().replace(/[^a-z0-9]/g, '')}`, type: det.type, label: det.label, tech: det.tech, icon: det.icon, fileCount: count })
  }

  const typeSet = new Set(detected.map((c) => c.type))
  const connections: ArchConnection[] = CONNECTION_RULES
    .filter((r) => typeSet.has(r.from) && typeSet.has(r.to))
    .map((r) => ({
      from: detected.find((c) => c.type === r.from)!.id,
      to:   detected.find((c) => c.type === r.to)!.id,
      label: r.label,
      protocol: r.protocol,
    }))

  return { components: detected, connections }
}
