import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  description: z.string().optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
