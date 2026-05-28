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

interface GitHubApiRepo {
  name: string
  full_name: string
  description: string | null
  language: string | null
  private: boolean
  default_branch: string
  updated_at: string
  clone_url: string
  stargazers_count: number
  forks_count: number
}

export type { GitHubApiRepo }
