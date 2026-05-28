export type SectionType = 'import' | 'type' | 'function' | 'class' | 'variable' | 'export' | 'other'

export interface CodeSection {
  type: SectionType
  name: string
  signature: string
  startLine: number
  endLine: number
  code: string
  lineCount: number
}

export const SECTION_CONFIG: Record<SectionType, { label: string; color: string; icon: string }> = {
  import:   { label: 'Imports',   color: '#8B5CF6', icon: '⬇' },
  type:     { label: 'Types',     color: '#06B6D4', icon: '⬡' },
  function: { label: 'Functions', color: '#22C55E', icon: 'ƒ' },
  class:    { label: 'Classes',   color: '#F59E0B', icon: '⬢' },
  variable: { label: 'Variables', color: '#EC4899', icon: '=' },
  export:   { label: 'Exports',   color: '#3B82F6', icon: '⇥' },
  other:    { label: 'Other',     color: '#6B7280', icon: '•' },
}

const DEEP_PARSE_THRESHOLD = 15

function findMatchingBrace(lines: string[], startIdx: number): number {
  let depth = 0
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      if (ch === '}') depth--
    }
    if (depth <= 0 && i > startIdx) return i
    if (depth <= 0 && i === startIdx && lines[i].includes('{')) return i
  }
  return lines.length - 1
}

function findIndentEnd(lines: string[], startIdx: number): number {
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    if (!/^\s/.test(line)) return i - 1
  }
  return lines.length - 1
}

function parseInnerSections(code: string, startLineOffset: number, isClass: boolean): CodeSection[] {
  const lines = code.split('\n')
  const inner: CodeSection[] = []
  const propertyLines: number[] = []

  function addInner(type: SectionType, name: string, sig: string, start: number, end: number) {
    const codeLines = lines.slice(start, end + 1)
    inner.push({ type, name, signature: sig, startLine: startLineOffset + start + 1, endLine: startLineOffset + end + 1, code: codeLines.join('\n'), lineCount: codeLines.length })
  }

  for (let i = 1; i < lines.length - 1; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue

    if (isClass) {
      const methodMatch = trimmed.match(/^(?:(?:private|public|protected|static|abstract|readonly)\s+)*(?:async\s+)?(?:get\s+|set\s+)?(\w+)\s*(?:<[^>]*>)?\s*\(/)
      if (methodMatch) {
        let end = i
        if (trimmed.includes('{')) {
          end = findMatchingBrace(lines, i)
        } else {
          let j = i + 1
          while (j < lines.length - 1 && !lines[j].includes('{')) j++
          if (j < lines.length - 1) end = findMatchingBrace(lines, j)
        }
        addInner('function', methodMatch[1], trimmed, i, end)
        i = end
        continue
      }
      propertyLines.push(i)
    } else {
      const funcMatch = trimmed.match(/^(?:async\s+)?function\s+(\w+)/)
      if (funcMatch) {
        const end = findMatchingBrace(lines, i)
        addInner('function', funcMatch[1], trimmed, i, end)
        i = end
        continue
      }
      const constMatch = trimmed.match(/^const\s+(\w+)\s*=\s*/)
      if (constMatch) {
        const afterEquals = trimmed.slice(trimmed.indexOf('=') + 1).trim()
        const isFunc = /^\(|^async\s*\(|^useCallback|^useMemo|^memo/.test(afterEquals) || /=>\s*\{?/.test(trimmed) || /^function/.test(afterEquals)
        if (isFunc || trimmed.includes('{')) {
          let end = i
          if (trimmed.includes('{')) {
            end = findMatchingBrace(lines, i)
          } else if (trimmed.endsWith(';') || trimmed.endsWith(',')) {
            end = i
          } else {
            let pd = 0, bd = 0
            for (let j = i; j < lines.length - 1; j++) {
              for (const ch of lines[j]) { if (ch === '(') pd++; if (ch === ')') pd--; if (ch === '{') bd++; if (ch === '}') bd-- }
              if (j > i && pd <= 0 && bd <= 0) { end = j; break }
            }
          }
          if (end > i || isFunc) addInner('function', constMatch[1], trimmed, i, end)
          i = end
          continue
        }
      }
      const hookMatch = trimmed.match(/^(useEffect|useLayoutEffect|useMemo|useCallback)\s*\(/)
      if (hookMatch) {
        let end = i, pd = 0
        for (let j = i; j < lines.length - 1; j++) {
          for (const ch of lines[j]) { if (ch === '(') pd++; if (ch === ')') pd-- }
          if (j > i && pd <= 0) { end = j; break }
        }
        addInner('function', hookMatch[1], trimmed, i, end)
        i = end
        continue
      }
    }
  }

  if (isClass && propertyLines.length > 0) {
    const propCode = propertyLines.map((idx) => lines[idx]).join('\n')
    inner.unshift({ type: 'variable', name: `Properties (${propertyLines.length})`, signature: `${propertyLines.length} class properties`, startLine: startLineOffset + propertyLines[0] + 1, endLine: startLineOffset + propertyLines[propertyLines.length - 1] + 1, code: propCode, lineCount: propertyLines.length })
  }
  return inner
}

export function parseCodeSections(content: string, ext: string): CodeSection[] {
  const lines = content.split('\n')
  const sections: CodeSection[] = []
  const isJS = ['ts', 'tsx', 'js', 'jsx', 'mjs'].includes(ext)
  const isPy = ext === 'py'
  const used = new Set<number>()

  function addSection(type: SectionType, name: string, start: number, end: number) {
    const codeLines = lines.slice(start, end + 1)
    const code = codeLines.join('\n')
    if ((type === 'function' || type === 'class') && codeLines.length > DEEP_PARSE_THRESHOLD && isJS) {
      const inner = parseInnerSections(code, start, type === 'class')
      if (inner.length > 0) {
        sections.push({ type, name: `${name} (${type === 'class' ? 'class' : 'component'})`, signature: lines[start]?.trim() || '', startLine: start + 1, endLine: end + 1, code, lineCount: codeLines.length })
        sections.push(...inner)
        for (let i = start; i <= end; i++) used.add(i)
        return
      }
    }
    sections.push({ type, name, signature: lines[start]?.trim() || '', startLine: start + 1, endLine: end + 1, code, lineCount: codeLines.length })
    for (let i = start; i <= end; i++) used.add(i)
  }

  if (isJS) {
    let i = 0
    while (i < lines.length) {
      const trimmed = lines[i].trim()
      if (/^import\s/.test(trimmed) || /^const\s+\w+\s*=\s*require\(/.test(trimmed)) {
        const importStart = i
        while (i < lines.length) {
          const t = lines[i].trim()
          if (i > importStart && /^import\s/.test(t)) { /* continue */ }
          else if (i > importStart && !t) {
            let nx = i + 1
            while (nx < lines.length && !lines[nx].trim()) nx++
            if (nx < lines.length && /^import\s/.test(lines[nx].trim())) { i++; continue }
            break
          } else if (i === importStart) { /* first line */ }
          else if (!/^import\s/.test(t) && !/^from\s/.test(t) && !/^\}/.test(t) && !/^,/.test(t) && t !== '') break
          i++
        }
        let end = i - 1
        while (end > importStart && !lines[end].trim()) end--
        addSection('import', 'imports', importStart, end)
      } else {
        i++
      }
    }

    for (i = 0; i < lines.length; i++) {
      if (used.has(i)) continue
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue

      const typeMatch = trimmed.match(/^(?:export\s+)?(?:declare\s+)?(interface|type)\s+(\w+)/)
      if (typeMatch) {
        let end = i
        if (trimmed.includes('{')) end = findMatchingBrace(lines, i)
        else { end = i; while (end < lines.length - 1 && !lines[end].trim().endsWith(';')) end++ }
        addSection('type', typeMatch[2], i, end); i = end; continue
      }
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/)
      if (classMatch) { const end = findMatchingBrace(lines, i); addSection('class', classMatch[1], i, end); i = end; continue }
      const exportFuncMatch = trimmed.match(/^export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/)
      if (exportFuncMatch) { const end = findMatchingBrace(lines, i); addSection('function', exportFuncMatch[1], i, end); i = end; continue }
      const funcMatch = trimmed.match(/^(?:async\s+)?function\s*\*?\s*(\w+)/)
      if (funcMatch) { const end = findMatchingBrace(lines, i); addSection('function', funcMatch[1], i, end); i = end; continue }
      const constFuncMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*/)
      if (constFuncMatch) {
        const varName = constFuncMatch[1]
        const afterEquals = trimmed.slice(trimmed.indexOf('=') + 1).trim()
        const isFunc = /^\(|^async\s*\(|^async\s*<|^</.test(afterEquals) || /=>\s*\{?/.test(trimmed) || /^\w+\s*\(/.test(afterEquals) || /^function/.test(afterEquals)
        let end = i
        if (trimmed.includes('{')) end = findMatchingBrace(lines, i)
        else if (trimmed.endsWith(';') || trimmed.endsWith(',')) end = i
        else {
          end = i + 1; let pd = 0, bd = 0
          for (let j = i; j < lines.length; j++) {
            for (const ch of lines[j]) { if (ch === '(') pd++; if (ch === ')') pd--; if (ch === '{') bd++; if (ch === '}') bd-- }
            if (j > i && pd <= 0 && bd <= 0) { end = j; break }
          }
        }
        addSection(isFunc ? 'function' : 'variable', varName, i, end); i = end; continue
      }
      if (/^export\s*\{/.test(trimmed)) {
        let end = trimmed.includes('}') ? i : i
        while (end < lines.length - 1 && !lines[end].includes('}')) end++
        addSection('export', 'exports', i, end); i = end; continue
      }
      if (/^export\s+default\s/.test(trimmed) && !trimmed.includes('function') && !trimmed.includes('class')) {
        let end = i
        if (trimmed.includes('{')) end = findMatchingBrace(lines, i)
        else while (end < lines.length - 1 && !lines[end].trim().endsWith(';')) end++
        addSection('export', 'default export', i, end); i = end; continue
      }
      const enumMatch = trimmed.match(/^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/)
      if (enumMatch) { const end = findMatchingBrace(lines, i); addSection('type', enumMatch[1], i, end); i = end; continue }
    }
  }

  if (isPy) {
    let i = 0
    while (i < lines.length) {
      const trimmed = lines[i].trim()
      if (/^(?:from\s|import\s)/.test(trimmed)) {
        const importStart = i; i++
        while (i < lines.length) { const t = lines[i].trim(); if (/^(?:from\s|import\s)/.test(t) || !t) i++; else break }
        let end = i - 1; while (end > importStart && !lines[end].trim()) end--
        addSection('import', 'imports', importStart, end)
      } else i++
    }
    for (i = 0; i < lines.length; i++) {
      if (used.has(i)) continue
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const classMatch = trimmed.match(/^class\s+(\w+)/)
      if (classMatch) { const end = findIndentEnd(lines, i); addSection('class', classMatch[1], i, end); i = end; continue }
      const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/)
      if (funcMatch) { const end = findIndentEnd(lines, i); addSection('function', funcMatch[1], i, end); i = end; continue }
      const varMatch = trimmed.match(/^([A-Za-z_]\w*)\s*(?::\s*\w[^=]*)?\s*=/)
      if (varMatch && !/^\s/.test(lines[i])) { addSection('variable', varMatch[1], i, i); continue }
    }
  }

  if (['css', 'scss', 'less'].includes(ext)) {
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) continue
      if (trimmed.includes('{')) {
        const name = trimmed.replace(/\s*\{.*/, '').trim() || 'rule'
        const end = findMatchingBrace(lines, i)
        addSection('other', name, i, end); i = end
      }
    }
  }

  sections.sort((a, b) => a.startLine - b.startLine)
  return sections
}
