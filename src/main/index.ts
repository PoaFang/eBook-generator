import { app, shell, BrowserWindow, safeStorage } from 'electron'
import { join } from 'node:path'
import { is } from './utils/is'
import { KeyStore } from './keyStore'
import { SafeStorageAdapter, LocalAesFallbackAdapter, shouldTrustSafeStorageBackend } from './cryptoAdapter'
import { registerIpcHandlers } from './ipcHandlers'
import { prepareImageForOcr } from './imagePipeline'
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

async function createKeyStore(): Promise<KeyStore> {
  const userDataDir = app.getPath('userData')
  const backend = safeStorage.getSelectedStorageBackend?.()
  if ((await safeStorage.isAsyncEncryptionAvailable()) && shouldTrustSafeStorageBackend(process.platform, backend)) {
    return new KeyStore(userDataDir, new SafeStorageAdapter(safeStorage))
  }
  // Linux without a real keyring/wallet daemon, or any other environment
  // where the OS keychain is unavailable: fall back to a locally generated
  // AES key so secrets are still never written in plaintext.
  return new KeyStore(userDataDir, new LocalAesFallbackAdapter(join(userDataDir, 'local.key')))
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`[renderer] failed to load: ${code} ${description}`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  return mainWindow
}

function loadAppContent(mainWindow: BrowserWindow): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Headless CI/dev check: verifies the preload bridge + ipcMain wiring actually works end-to-end. */
function runSmokeTest(mainWindow: BrowserWindow, keyStore: KeyStore): void {
  console.log(`[smoke-test] keyStore backend = ${keyStore.backend}`)
  mainWindow.webContents.on('console-message', (event) => {
    console.log(`[smoke-test:renderer-console] level=${event.level} ${event.message}`)
  })
  mainWindow.webContents.once('did-finish-load', async () => {
    const ipcRoundTrip = await mainWindow.webContents.executeJavaScript(`
      (async () => {
        await window.api.keys.set('openai', 'sk-smoke-test-roundtrip')
        const list = await window.api.keys.list()
        return JSON.stringify(list)
      })()
    `)
    console.log(`[smoke-test:ipc-roundtrip] ${ipcRoundTrip}`)

    try {
      const testPngPath = join(tmpdir(), 'fayin-smoke-test.png')
      const testPng = await sharp({
        create: { width: 50, height: 40, channels: 3, background: { r: 1, g: 2, b: 3 } }
      })
        .png()
        .toBuffer()
      await writeFile(testPngPath, testPng)
      const prepared = await prepareImageForOcr(testPngPath)
      console.log(`[smoke-test:sharp-in-electron] ok, base64Length=${prepared.base64.length}`)
    } catch (error) {
      console.log(`[smoke-test:sharp-in-electron] FAILED: ${error instanceof Error ? error.stack : error}`)
    }

    app.exit(0)
  })
}

app.whenReady().then(async () => {
  const mainWindow = createMainWindow()
  const keyStore = await createKeyStore()
  registerIpcHandlers(mainWindow, keyStore)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const reactivatedWindow = createMainWindow()
      loadAppContent(reactivatedWindow)
    }
  })

  if (process.env.FAYIN_SMOKE_TEST) {
    runSmokeTest(mainWindow, keyStore)
  }

  loadAppContent(mainWindow)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
