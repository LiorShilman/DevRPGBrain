import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { join, relative, extname, basename } from 'path'
import { Dirent } from 'fs'
import { prisma } from '../../db/client'
import type { ScanResult } from './repo-scanner.types'

const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.next', 'coverage',
  'target', 'bin', 'obj', '__pycache__', '.venv', 'venv',
  '.turbo', 'out', '.cache', '.parcel-cache', '.webpack', '.expo',
])

const IMPORTANT_FILES = new Set([
  'package.json', 'tsconfig.json', 'README.md', 'readme.md', 'Dockerfile',
  'docker-compose.yml', 'docker-compose.yaml', '.env.example',
  'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'go.sum',
  'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json',
  'Gemfile', 'pubspec.yaml', 'turbo.json', 'nx.json',
  'vite.config.ts', 'vite.config.js', 'vite.config.mjs',
  'schema.prisma', 'electron.vite.config.ts', 'angular.json',
  'next.config.js', 'next.config.ts', 'next.config.mjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json',
])

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rs', '.go', '.java', '.cs', '.php', '.rb', '.dart', '.swift', '.kt',
  '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less',
  '.md', '.txt', '.json', '.toml', '.yaml', '.yml', '.xml',
  '.sh', '.bash', '.zsh', '.ps1', '.prisma',
])

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.cs': 'C#',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.dart': 'Dart',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
  '.c': 'C',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
}

// Stack detection: name → config files that imply it
const STACK_DETECTORS: Array<{ name: string; files: string[] }> = [
  { name: 'Electron', files: ['electron.vite.config.ts', 'electron.vite.config.js', 'electron-builder.yml', 'electron-builder.json'] },
  { name: 'Next.js',  files: ['next.config.js', 'next.config.ts', 'next.config.mjs'] },
  { name: 'Vite',     files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'] },
  { name: 'Angular',  files: ['angular.json'] },
  { name: 'Svelte',   files: ['svelte.config.js', 'svelte.config.ts'] },
  { name: 'Nuxt',     files: ['nuxt.config.ts', 'nuxt.config.js'] },
  { name: 'Remix',    files: ['remix.config.js', 'remix.config.ts'] },
  { name: 'Astro',    files: ['astro.config.mjs', 'astro.config.ts'] },
  { name: 'Prisma',   files: ['schema.prisma'] },
  { name: 'Docker',   files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'] },
  { name: 'Turbo',    files: ['turbo.json'] },
  { name: 'Nx',       files: ['nx.json'] },
  { name: 'Python',   files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'] },
  { name: 'Rust',     files: ['Cargo.toml'] },
  { name: 'Go',       files: ['go.mod'] },
  { name: 'Java',     files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  { name: '.NET',     files: ['*.csproj', '*.sln'] },
  { name: 'PHP',      files: ['composer.json'] },
  { name: 'Ruby',     files: ['Gemfile'] },
  { name: 'Flutter',  files: ['pubspec.yaml'] },
  { name: 'TypeScript', files: ['tsconfig.json'] },
  { name: 'Node.js',  files: ['package.json'] },
]

// Frameworks detected from package.json deps
const PKG_FRAMEWORK_DEPS: Array<{ name: string; pkg: string }> = [
  { name: 'React',     pkg: 'react' },
  { name: 'Vue',       pkg: 'vue' },
  { name: 'Svelte',    pkg: 'svelte' },
  { name: 'Angular',   pkg: '@angular/core' },
  { name: 'Solid',     pkg: 'solid-js' },
  { name: 'Preact',    pkg: 'preact' },
  { name: 'Express',   pkg: 'express' },
  { name: 'Fastify',   pkg: 'fastify' },
  { name: 'NestJS',    pkg: '@nestjs/core' },
  { name: 'Hono',      pkg: 'hono' },
  { name: 'Tailwind',  pkg: 'tailwindcss' },
  { name: 'Vitest',    pkg: 'vitest' },
  { name: 'Jest',      pkg: 'jest' },
  { name: 'Electron',  pkg: 'electron' },
]

const MAX_FILES = 5000
const MAX_FILE_SIZE_BYTES = 150 * 1024  // 150 KB

async function walkDir(
  rootPath: string,
  onFile: (fullPath: string, relPath: string, entry: Dirent) => void
): Promise<number> {
  const queue: string[] = [rootPath]
  let count = 0

  while (queue.length > 0 && count < MAX_FILES) {
    const dir = queue.shift()!
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          queue.push(join(dir, entry.name))
        }
      } else if (entry.isFile()) {
        count++
        onFile(join(dir, entry.name), relative(rootPath, join(dir, entry.name)), entry)
        if (count >= MAX_FILES) break
      }
    }
  }
  return count
}

async function countTodoFixme(filePath: string): Promise<{ todo: number; fixme: number }> {
  try {
    const stat = await fs.stat(filePath)
    if (stat.size > MAX_FILE_SIZE_BYTES) return { todo: 0, fixme: 0 }
    const content = await fs.readFile(filePath, 'utf-8')
    const todo = (content.match(/\bTODO\b/gi) ?? []).length
    const fixme = (content.match(/\bFIXME\b/gi) ?? []).length
    return { todo, fixme }
  } catch {
    return { todo: 0, fixme: 0 }
  }
}

async function detectFromPackageJson(pkgPaths: string[]): Promise<string[]> {
  const detected = new Set<string>()
  for (const pkgPath of pkgPaths) {
    try {
      const raw = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(raw)
      const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
      for (const d of PKG_FRAMEWORK_DEPS) {
        if (allDeps.includes(d.pkg)) detected.add(d.name)
      }
    } catch {
      // skip unreadable or invalid package.json
    }
  }
  return [...detected]
}

export async function scanRepo(projectId: string, projectPath: string): Promise<ScanResult> {
  const fileNames = new Set<string>()
  const langCounts: Record<string, number> = {}
  const importantFiles: string[] = []
  const pkgJsonPaths: string[] = []
  let todoCount = 0
  let fixmeCount = 0
  const todoPromises: Promise<{ todo: number; fixme: number }>[] = []

  const fileCount = await walkDir(projectPath, (fullPath, relPath, entry) => {
    fileNames.add(entry.name)
    if (entry.name === 'package.json') pkgJsonPaths.push(fullPath)

    const ext = extname(entry.name).toLowerCase()
    const lang = LANGUAGE_EXTENSIONS[ext]
    if (lang) langCounts[lang] = (langCounts[lang] ?? 0) + 1

    if (IMPORTANT_FILES.has(entry.name)) {
      importantFiles.push(relPath.replace(/\\/g, '/'))
    }

    if (TEXT_EXTENSIONS.has(ext)) {
      todoPromises.push(countTodoFixme(fullPath))
    }
  })

  // Resolve TODO/FIXME counts in parallel
  const todoCounts = await Promise.all(todoPromises)
  for (const { todo, fixme } of todoCounts) {
    todoCount += todo
    fixmeCount += fixme
  }

  // Detect stack from config files found
  const detectedStackSet = new Set<string>()

  for (const detector of STACK_DETECTORS) {
    const hit = detector.files.some((f) =>
      f.includes('*')
        ? [...fileNames].some((name) => name.endsWith(f.replace('*', '')))
        : fileNames.has(f)
    )
    if (hit) detectedStackSet.add(detector.name)
  }

  // Also detect from all package.json files (including workspaces)
  const pkgFrameworks = await detectFromPackageJson(pkgJsonPaths)
  for (const f of pkgFrameworks) detectedStackSet.add(f)

  // Detected languages = those with at least 1 file, sorted by count desc
  const detectedLanguages = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([lang]) => lang)

  const detectedStack = [...detectedStackSet]

  await prisma.repoScan.create({
    data: {
      projectId,
      detectedStack: JSON.stringify(detectedStack),
      detectedLanguages: JSON.stringify(detectedLanguages),
      importantFiles: JSON.stringify(importantFiles),
      todoCount,
      fixmeCount,
      fileCount,
    },
  })

  return { detectedStack, detectedLanguages, importantFiles, todoCount, fixmeCount, fileCount }
}

export async function getLatestScan(projectId: string) {
  return prisma.repoScan.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
}

// Parse JSON arrays stored as strings in SQLite
export function parseScan(scan: Awaited<ReturnType<typeof getLatestScan>>) {
  if (!scan) return null
  return {
    ...scan,
    detectedStack: JSON.parse(scan.detectedStack) as string[],
    detectedLanguages: JSON.parse(scan.detectedLanguages) as string[],
    importantFiles: JSON.parse(scan.importantFiles) as string[],
  }
}
