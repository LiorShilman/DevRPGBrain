export interface ImportEdge {
  source: string
  target: string
}

const JS_TS_IMPORT_REGEX =
  /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|export\s+.*?\s+from\s+['"]([^'"]+)['"])/g

const CSS_IMPORT_REGEX = /(?:@import\s+['"]([^'"]+)['"]|@use\s+['"]([^'"]+)['"])/g

const JS_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']
const CSS_EXTENSIONS = ['css', 'scss', 'less']

function getExt(path: string): string {
  const parts = path.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function resolveRelative(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null
  const fromDir = fromFile.split('/').slice(0, -1)
  const parts = importPath.split('/')
  const resolved = [...fromDir]
  for (const part of parts) {
    if (part === '.') continue
    else if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

function findMatch(resolvedPath: string, allFiles: Set<string>): string | null {
  if (allFiles.has(resolvedPath)) return resolvedPath
  const ext = getExt(resolvedPath)
  const exts = CSS_EXTENSIONS.includes(ext) ? CSS_EXTENSIONS : JS_EXTENSIONS
  for (const e of exts) {
    if (allFiles.has(`${resolvedPath}.${e}`)) return `${resolvedPath}.${e}`
    if (allFiles.has(`${resolvedPath}/index.${e}`)) return `${resolvedPath}/index.${e}`
  }
  return null
}

export function parseImports(filePath: string, content: string, allFiles: Set<string>): ImportEdge[] {
  const results: ImportEdge[] = []
  const ext = getExt(filePath)

  let regex: RegExp
  if (JS_EXTENSIONS.includes(ext)) regex = JS_TS_IMPORT_REGEX
  else if (CSS_EXTENSIONS.includes(ext)) regex = CSS_IMPORT_REGEX
  else return results

  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1] || match[2] || match[3]
    if (!importPath) continue
    const resolved = resolveRelative(filePath, importPath)
    if (!resolved) continue
    const matched = findMatch(resolved, allFiles)
    if (matched) results.push({ source: filePath, target: matched })
  }
  return results
}
