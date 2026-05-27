import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

let apiProcess: ChildProcess | null = null

function startAPIProcess(): void {
  if (!app.isPackaged) return // dev: user runs npm run dev:api separately

  const apiEntry   = join(process.resourcesPath, 'api', 'server.js')
  const userData   = app.getPath('userData')
  const dbPath     = join(userData, 'devrpg.db')
  const settingsPath = join(userData, 'settings.json')
  const prismaPath = join(process.resourcesPath, 'prisma')

  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3001',
      DATABASE_URL: `file:${dbPath}`,
      SETTINGS_PATH: settingsPath,
      PRISMA_SCHEMA_DIR: prismaPath,
    },
    stdio: 'ignore',
    detached: false,
  })

  apiProcess.on('error', (err) => console.error('[DevRPG API] Failed to start:', err.message))
  apiProcess.on('exit', (code) => console.log(`[DevRPG API] Exited with code ${code}`))
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: false,
    title: 'DevRPG Brain',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (!app.isPackaged) {
      mainWindow.setTitle('DevRPG Brain — dev')
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  startAPIProcess()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill()
    apiProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})
