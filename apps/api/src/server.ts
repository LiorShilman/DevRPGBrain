import app from './app'
import { env } from './config/env'

const port = parseInt(env.PORT, 10)

const server = app.listen(port, () => {
  console.log(`[DevRPG API] Running on http://localhost:${port}`)
  console.log(`[DevRPG API] Health: http://localhost:${port}/api/health`)
  console.log(`[DevRPG API] AI Provider: ${env.AI_PROVIDER}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[DevRPG API] Port ${port} is already in use.`)
    console.error(`[DevRPG API] Kill it with: npx kill-port ${port}`)
    process.exit(1)
  } else {
    throw err
  }
})
