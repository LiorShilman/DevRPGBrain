export interface CommitInfo {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitScanResult {
  branch: string
  latestCommit: CommitInfo | null
  changedFilesCount: number
  uncommittedChangesCount: number
  isClean: boolean
  ahead: number
  behind: number
}
