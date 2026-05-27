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

export const scanApi = {
  scan: (projectId: string) =>
    request<ScanResult>(`/api/projects/${projectId}/scan`, { method: 'POST' }),
  getLatest: (projectId: string) =>
    request<ScanResult>(`/api/projects/${projectId}/scan`),
}

export const gitApi = {
  scan: (projectId: string) =>
    request<GitScanResult>(`/api/projects/${projectId}/git-scan`, { method: 'POST' }),
  getSnapshot: (projectId: string) =>
    request<GitSnapshot>(`/api/projects/${projectId}/git`),
  getCommits: (projectId: string, limit = 10) =>
    request<CommitInfo[]>(`/api/projects/${projectId}/git/commits?limit=${limit}`),
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
