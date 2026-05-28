import simpleGit from 'simple-git'
import { prisma } from '../../db/client'
import type { GitScanResult } from './git.types'

export async function scanGit(projectId: string, projectPath: string): Promise<GitScanResult> {
  const git = simpleGit(projectPath)

  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) {
    throw new Error('Not a Git repository')
  }

  const [status, log, branch] = await Promise.all([
    git.status(),
    git.log({ maxCount: 1 }).catch(() => null),
    git.branchLocal(),
  ])

  const latestCommit = log?.latest
    ? {
        hash: log.latest.hash.slice(0, 7),
        message: log.latest.message,
        author: log.latest.author_name,
        date: log.latest.date,
      }
    : null

  const changedFilesCount = status.files.length
  const uncommittedChangesCount = status.modified.length + status.created.length + status.deleted.length

  const result: GitScanResult = {
    branch: branch.current,
    latestCommit,
    changedFilesCount,
    uncommittedChangesCount,
    isClean: status.isClean(),
    ahead: status.ahead,
    behind: status.behind,
  }

  await prisma.gitSnapshot.create({
    data: {
      projectId,
      branch: result.branch,
      lastCommitHash: latestCommit?.hash ?? null,
      lastCommitMessage: latestCommit?.message ?? null,
      lastCommitDate: latestCommit ? new Date(latestCommit.date) : null,
      changedFilesCount: result.changedFilesCount,
      uncommittedChangesCount: result.uncommittedChangesCount,
    },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { isGitRepo: true },
  })

  return result
}

export async function getLatestSnapshot(projectId: string) {
  return prisma.gitSnapshot.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRecentCommits(projectPath: string, limit = 10) {
  const git = simpleGit(projectPath)
  const log = await git.log({ maxCount: limit })
  return log.all.map((c) => ({
    hash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
    date: c.date,
  }))
}

export async function getLocalBranches(projectPath: string) {
  const git = simpleGit(projectPath)
  const isRepo = await git.checkIsRepo().catch(() => false)
  if (!isRepo) throw new Error('Not a Git repository')
  const b = await git.branchLocal()
  return b.all.map((name) => ({ name, isCurrent: name === b.current }))
}
