import fs from 'fs'
import path from 'path'
import { prisma } from '../../db/client'
import type { CreateProjectInput, UpdateProjectInput } from './project.types'

export async function listProjects() {
  return prisma.project.findMany({
    where: { archivedAt: null },
    orderBy: { lastOpenedAt: { sort: 'desc', nulls: 'last' } },
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({ where: { id } })
}

export async function createProject(input: CreateProjectInput) {
  const resolvedPath = path.resolve(input.path)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Path does not exist: ${resolvedPath}`)
  }

  const isGitRepo = fs.existsSync(path.join(resolvedPath, '.git'))

  return prisma.project.create({
    data: {
      name: input.name,
      path: resolvedPath,
      description: input.description,
      isGitRepo,
      lastOpenedAt: new Date(),
    },
  })
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return prisma.project.update({
    where: { id },
    data: input,
  })
}

export async function archiveProject(id: string) {
  return prisma.project.update({
    where: { id },
    data: { archivedAt: new Date() },
  })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}

export async function touchProject(id: string) {
  return prisma.project.update({
    where: { id },
    data: { lastOpenedAt: new Date() },
  })
}
