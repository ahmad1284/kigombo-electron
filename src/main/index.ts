import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { openDatabase, type Db } from './db'
import { registerIpc } from './ipc'

let db: Db | null = null

// KIGOMBO_USER_DATA lets E2E runs point at a throwaway database. Must be set
// before the app is ready, while the session paths are still unresolved.
if (process.env.KIGOMBO_USER_DATA) {
  app.setPath('userData', process.env.KIGOMBO_USER_DATA)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f1115',
    title: 'Kigombo',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // External links open in the user's browser, never inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const dbPath = join(app.getPath('userData'), 'kigombo.db')
  db = openDatabase(dbPath)
  registerIpc(db, dbPath)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  db?.close()
  db = null
})
