import dotenv from 'dotenv'
import path from 'path'
import { z } from 'zod'

// Load .env from project root (two levels up from apps/api/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
dotenv.config() // also pick up any local .env in cwd

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AI_PROVIDER: z.enum(['openai', 'claude', 'gemini', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
})

export const env = envSchema.parse(process.env)
