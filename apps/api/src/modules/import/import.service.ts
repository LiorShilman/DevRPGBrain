import path from 'path'
import fs from 'fs'
import simpleGit from 'simple-git'
import { prisma } from '../../db/client'
import type { GitHubRepo, GitHubApiRepo, ImportResult } from './import.types'

export async function listGitHubRepos(username: string, token?: string): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = []
  let page = 1

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevRPG-Brain/0.1',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  while (true) {
    // When authenticated, /user/repos returns private repos too; otherwise public only
    const url = token
      ? `https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner&page=${page}`
      : `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner&page=${page}`

    const res = await fetch(url, { headers })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message ?? `GitHub API error: ${res.status}`)
    }

    const data = (await res.json()) as GitHubApiRepo[]
    if (data.length === 0) break

    for (const r of data) {
      allRepos.push({
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        cloneUrl: r.clone_url,
        stargazersCount: r.stargazers_count,
        forksCount: r.forks_count,
      })
    }

    if (data.length < 100) break
    page++
  }

  return allRepos
}

export async function cloneAndRegisterRepo(
  repo: GitHubRepo,
  baseDir: string,
  token?: string
): Promise<ImportResult> {
  const targetDir = path.join(baseDir, repo.name)

  if (fs.existsSync(targetDir)) {
    const existing = await prisma.project.findFirst({ where: { path: targetDir } })
    if (existing) {
      if (!existing.archivedAt) {
        // Sync isPrivate even if already registered
        if (existing.isPrivate !== repo.isPrivate) {
          await prisma.project.update({ where: { id: existing.id }, data: { isPrivate: repo.isPrivate } })
        }
        return { repo: repo.name, status: 'skipped', message: 'Already registered' }
      }
      // Unarchive instead of creating a duplicate
      const restored = await prisma.project.update({
        where: { id: existing.id },
        data: { archivedAt: null, lastOpenedAt: new Date() },
      })
      return { repo: repo.name, status: 'success', projectId: restored.id, message: 'Restored from archive' }
    }
    const project = await prisma.project.create({
      data: {
        name: repo.name,
        path: targetDir,
        description: repo.description,
        isGitRepo: true,
        isPrivate: repo.isPrivate,
        lastOpenedAt: new Date(),
      },
    })
    return { repo: repo.name, status: 'success', projectId: project.id, message: 'Directory existed, registered' }
  }

  try {
    let cloneUrl = repo.cloneUrl
    if (token && repo.isPrivate) {
      cloneUrl = repo.cloneUrl.replace('https://', `https://${token}@`)
    }

    const git = simpleGit()
    await git.clone(cloneUrl, targetDir, ['--depth', '1'])

    const project = await prisma.project.create({
      data: {
        name: repo.name,
        path: targetDir,
        description: repo.description,
        isGitRepo: true,
        isPrivate: repo.isPrivate,
        lastOpenedAt: new Date(),
      },
    })
    return { repo: repo.name, status: 'success', projectId: project.id }
  } catch (err) {
    return {
      repo: repo.name,
      status: 'error',
      message: err instanceof Error ? err.message : 'Clone failed',
    }
  }
}
