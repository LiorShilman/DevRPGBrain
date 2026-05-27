// Shared types between Electron main process and React renderer.
// Keep this file free of Node.js or browser-only imports.

export type ApiStatus = 'checking' | 'ok' | 'error'

export interface HealthResponse {
  status: string
  timestamp: string
  version: string
}
