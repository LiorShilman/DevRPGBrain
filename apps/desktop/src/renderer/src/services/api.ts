import { API_BASE_URL } from '@shared/constants'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface Project {
  id: string
  name: string
  path: string
  description: string | null
  primaryLanguage: string | null
  framework: string | null
  isGitRepo: boolean
  isPrivate: boolean
  createdAt: string
  updatedAt: string
  lastOpenedAt: string | null
  archivedAt: string | null
}

export interface GitSnapshot {
  id: string
  projectId: string
  branch: string | null
  lastCommitHash: string | null
  lastCommitMessage: string | null
  lastCommitDate: string | null
  changedFilesCount: number
  uncommittedChangesCount: number
  createdAt: string
}

export interface GitScanResult {
  branch: string
  latestCommit: { hash: string; message: string; author: string; date: string } | null
  changedFilesCount: number
  uncommittedChangesCount: number
  isClean: boolean
  ahead: number
  behind: number
}

export interface CommitInfo {
  hash: string
  message: string
  author: string
  date: string
}

export interface ScanResult {
  detectedStack: string[]
  detectedLanguages: string[]
  importantFiles: string[]
  todoCount: number
  fixmeCount: number
  fileCount: number
}

export interface WorkSession {
  id: string
  projectId: string
  title: string | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  userNotes: string | null
  aiSummary: string | null
  blockers: string[]
  decisions: string[]
  nextSteps: string[]
  xpAwarded: number
  leveledUp?: boolean
  newLevel?: number
  newAchievements?: string[]
  createdAt: string
}

export interface Achievement {
  key: string
  title: string
  description: string
  xpReward: number
  unlocked: boolean
  unlockedAt: string | null
}

export const sessionsApi = {
  start: (projectId: string, title?: string) =>
    request<WorkSession>(`/api/projects/${projectId}/sessions/start`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  end: (projectId: string, sessionId: string, data: { userNotes?: string; blockers?: string[]; decisions?: string[]; nextSteps?: string[] }) =>
    request<WorkSession>(`/api/projects/${projectId}/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getActive: (projectId: string) =>
    request<WorkSession>(`/api/projects/${projectId}/sessions/active`),
  getLast: (projectId: string) =>
    request<WorkSession>(`/api/projects/${projectId}/sessions/last`),
  list: (projectId: string) =>
    request<WorkSession[]>(`/api/projects/${projectId}/sessions`),
}

export interface ImportEdge { source: string; target: string }
export interface ArchComponent { id: string; type: string; label: string; tech: string; icon: string; fileCount: number }
export interface ArchConnection { from: string; to: string; label: string; protocol: string }
export interface DependencyData {
  importEdges: ImportEdge[]
  architecturePattern: { components: ArchComponent[]; connections: ArchConnection[] } | null
}

export const scanApi = {
  scan: (projectId: string) =>
    request<ScanResult>(`/api/projects/${projectId}/scan`, { method: 'POST' }),
  getLatest: (projectId: string) =>
    request<ScanResult>(`/api/projects/${projectId}/scan`),
  getDependencies: (projectId: string) =>
    request<DependencyData>(`/api/projects/${projectId}/dependencies`),
}

export interface BranchInfo { name: string; isCurrent: boolean }

export const gitApi = {
  scan: (projectId: string) =>
    request<GitScanResult>(`/api/projects/${projectId}/git-scan`, { method: 'POST' }),
  getSnapshot: (projectId: string) =>
    request<GitSnapshot>(`/api/projects/${projectId}/git`),
  getCommits: (projectId: string, limit = 10) =>
    request<CommitInfo[]>(`/api/projects/${projectId}/git/commits?limit=${limit}`),
  getBranches: (projectId: string) =>
    request<BranchInfo[]>(`/api/projects/${projectId}/git/branches`),
}

export interface RpgProfile {
  id: string
  level: number
  totalXp: number
  xpProgress: number
  xpNeeded: number
  progressPercent: number
  focus: number
  discipline: number
  engineering: number
  consistency: number
  creativity: number
  problemSolving: number
  recentEvents: { id: string; amount: number; reason: string; category: string; createdAt: string }[]
}

export interface ProjectHealth {
  id: string
  projectId: string
  score: number
  status: 'HEALTHY' | 'STALLED' | 'RISKY' | 'ABANDONED' | 'UNKNOWN'
  reasons: string[]
  recommendations: string[]
  calculatedAt: string
}

export interface DailyBriefing {
  recommendedProject: string
  why: string
  risk: string
  suggestedAction: string
  xpReward: number
  generatedAt: string
  projectCount: number
}

export const briefingApi = {
  get: () => request<DailyBriefing>('/api/briefing'),
}

export const healthApi = {
  calculate: (projectId: string) =>
    request<ProjectHealth>(`/api/projects/${projectId}/health/calculate`, { method: 'POST' }),
  getLatest: (projectId: string) =>
    request<ProjectHealth>(`/api/projects/${projectId}/health`),
}

export const rpgApi = {
  getProfile: () => request<RpgProfile>('/api/rpg/profile'),
  getAchievements: () => request<Achievement[]>('/api/rpg/achievements'),
}

export interface AppSettings {
  aiProvider: 'mock' | 'openai' | 'claude'
  hasOpenAiKey: boolean
  openAiModel: string
  hasClaudeKey: boolean
  claudeModel: string
  githubToken: string
}

export const settingsApi = {
  get: () => request<AppSettings>('/api/settings'),
  update: (data: {
    aiProvider?: 'mock' | 'openai' | 'claude'
    openAiApiKey?: string
    openAiModel?: string
    claudeApiKey?: string
    claudeModel?: string
    githubToken?: string
  }) => request<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const brainApi = {
  chat: (projectId: string, question: string, history: ChatMessage[]) =>
    request<{ reply: string }>(`/api/projects/${projectId}/brain/chat`, {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    }),
  chatGlobal: (question: string, history: ChatMessage[]) =>
    request<{ reply: string }>('/api/brain/chat', {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    }),
}

export interface GitHubRepo {
  name: string
  fullName: string
  description: string | null
  language: string | null
  isPrivate: boolean
  defaultBranch: string
  updatedAt: string
  cloneUrl: string
  stargazersCount: number
  forksCount: number
}

export interface ImportResult {
  repo: string
  status: 'success' | 'skipped' | 'error'
  message?: string
  projectId?: string
}

export const importApi = {
  listRepos: (username: string, token?: string) => {
    const params = new URLSearchParams({ username })
    if (token) params.set('token', token)
    return request<{ repos: GitHubRepo[] }>(`/api/import/github/repos?${params}`)
  },
  cloneRepos: (repos: GitHubRepo[], baseDir: string, token?: string) =>
    request<{ results: ImportResult[] }>('/api/import/github/clone', {
      method: 'POST',
      body: JSON.stringify({ repos, baseDir, token: token || undefined }),
    }),
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

export interface CodeAnalysisOutput {
  summary: string
  howItWorks: string
  keyDecisions: string[]
  dependencies: string[]
  suggestions: string[]
}

export const filesApi = {
  getTree: (projectId: string) =>
    request<FileNode[]>(`/api/projects/${projectId}/files`),
  getContent: (projectId: string, filePath: string) =>
    request<{ content: string; language: string; size: number }>(
      `/api/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`
    ),
  search: (projectId: string, q: string) =>
    request<SearchResult[]>(`/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`),
  analyze: (projectId: string, filePath: string, content: string, language: string) =>
    request<CodeAnalysisOutput>(`/api/projects/${projectId}/files/analyze`, {
      method: 'POST',
      body: JSON.stringify({ filePath, content, language }),
    }),
  async analyzeStream(
    projectId: string,
    params: { filePath: string; content: string; language: string; sectionName?: string; sectionType?: string },
    onChunk: (text: string) => void
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/files/analyze/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) throw new Error(await res.text())
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.text) onChunk(parsed.text)
        } catch (e) { if (e instanceof Error) throw e }
      }
    }
  },
}

export interface BossFight {
  id: string
  projectId: string
  projectName?: string
  name: string
  description: string
  xpReward: number
  status: string
  createdAt: string
  defeatedAt: string | null
}

export const bossFightApi = {
  listActive: () => request<BossFight[]>('/api/boss-fights'),
  getActive: (projectId: string) => request<BossFight | null>(`/api/projects/${projectId}/boss-fight`),
}

export interface KnowledgeNode {
  id: string
  type: 'session' | 'decision' | 'blocker' | 'nextStep' | 'memory'
  label: string
  detail: string
  date: string
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  label: string
}

export const knowledgeApi = {
  get: (projectId: string) => request<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }>(`/api/projects/${projectId}/knowledge`),
}

export const contextApi = {
  async restoreStream(projectId: string, onChunk: (text: string) => void): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/context/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(await res.text())
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.text) onChunk(parsed.text)
        } catch (e) { if (e instanceof Error) throw e }
      }
    }
  },
}

export const projectsApi = {
  list: () => request<Project[]>('/api/projects'),
  get: (id: string) => request<Project>(`/api/projects/${id}`),
  create: (data: { name: string; path: string; description?: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (id: string) =>
    request<void>(`/api/projects/${id}/archive`, { method: 'DELETE' }),
  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
}
