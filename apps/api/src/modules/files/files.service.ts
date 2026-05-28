import fs from 'fs/promises'
import path from 'path'

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  'out', '.cache', '__pycache__', '.nuxt', '.turbo', '.vite', 'vendor',
])

const TEXT_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'go', 'java', 'cs', 'cpp', 'c', 'h',
  'rb', 'php', 'rs', 'kt', 'swift', 'html', 'css', 'scss', 'less',
  'json', 'yaml', 'yml', 'md', 'sh', 'bash', 'sql', 'txt', 'prisma',
  'toml', 'xml', 'graphql', 'gql', 'vue', 'svelte', 'env',
])

const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', go: 'go', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c', h: 'c',
  rb: 'ruby', php: 'php', rs: 'rust', kt: 'kotlin', swift: 'swift',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml',
  md: 'markdown', sh: 'bash', bash: 'bash', sql: 'sql',
  prisma: 'prisma', toml: 'toml', xml: 'xml',
  graphql: 'graphql', gql: 'graphql',
  vue: 'html', svelte: 'html',
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  ext?: string
  children?: FileNode[]
}

export interface SearchResult {
  path: string
  name: string
  score: number
  matchType: 'name' | 'content'
  lineNumber?: number
  lineContent?: string
}

export async function getFileTree(projectPath: string, maxDepth = 5): Promise<FileNode[]> {
  async function walk(dirPath: string, depth: number, relBase: string): Promise<FileNode[]> {
    if (depth > maxDepth) return []
    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return []
    }

    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    const result: FileNode[] = []
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.env') continue
      const rel = relBase ? `${relBase}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue
        const children = await walk(path.join(dirPath, e.name), depth + 1, rel)
        result.push({ name: e.name, path: rel, type: 'dir', children })
      } else {
        const stat = await fs.stat(path.join(dirPath, e.name)).catch(() => null)
        const ext = path.extname(e.name).replace('.', '').toLowerCase()
        result.push({ name: e.name, path: rel, type: 'file', size: stat?.size ?? 0, ext })
      }
    }
    return result
  }

  return walk(projectPath, 0, '')
}

export async function getFileContent(projectPath: string, relPath: string): Promise<{ content: string; language: string; size: number }> {
  const abs = path.resolve(projectPath, relPath)
  if (!abs.startsWith(path.resolve(projectPath) + path.sep) && abs !== path.resolve(projectPath)) {
    throw new Error('Path traversal not allowed')
  }
  const stat = await fs.stat(abs)
  if (stat.size > 500_000) throw new Error('File too large to display (>500KB)')
  const content = await fs.readFile(abs, 'utf-8')
  const ext = path.extname(relPath).replace('.', '').toLowerCase()
  return { content, language: EXT_LANG[ext] ?? 'plaintext', size: stat.size }
}

export async function searchFiles(projectPath: string, query: string, maxResults = 40): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []
  const qLower = query.toLowerCase()
  const results: SearchResult[] = []

  async function walk(dirPath: string, rel: string) {
    if (results.length >= maxResults * 4) return
    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const e of entries) {
      if (results.length >= maxResults * 4) return
      const entRel = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue
        await walk(path.join(dirPath, e.name), entRel)
      } else {
        const nameLower = e.name.toLowerCase()
        if (nameLower === qLower) {
          results.push({ path: entRel, name: e.name, score: 1000, matchType: 'name' })
        } else if (nameLower.startsWith(qLower)) {
          results.push({ path: entRel, name: e.name, score: 800, matchType: 'name' })
        } else if (nameLower.includes(qLower)) {
          results.push({ path: entRel, name: e.name, score: entRel.toLowerCase().includes(qLower) ? 600 : 400, matchType: 'name' })
        } else {
          const ext = path.extname(e.name).replace('.', '').toLowerCase()
          if (TEXT_EXTS.has(ext)) {
            try {
              const text = await fs.readFile(path.join(dirPath, e.name), 'utf-8')
              const lines = text.split('\n')
              const lineIdx = lines.findIndex((l) => l.toLowerCase().includes(qLower))
              if (lineIdx >= 0) {
                results.push({
                  path: entRel, name: e.name, score: 300,
                  matchType: 'content',
                  lineNumber: lineIdx + 1,
                  lineContent: lines[lineIdx].trim().slice(0, 120),
                })
              }
            } catch { /* skip binary / unreadable */ }
          }
        }
      }
    }
  }

  await walk(projectPath, '')
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults)
}
