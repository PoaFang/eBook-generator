import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { writeFile } from 'node:fs/promises'
import { IPC } from '@shared/ipcChannels'
import type {
  ExportEpubRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
  TranslateRequest,
  TranslateResponse
} from '@shared/types'
import type { KeyStore } from './keyStore'
import { prepareImageForOcr } from './imagePipeline'
import { getOcrProvider, getTranslateProvider } from './providers/registry'
import { buildEpub } from './epub/buildEpub'

export function registerIpcHandlers(mainWindow: BrowserWindow, keyStore: KeyStore): void {
  ipcMain.handle(IPC.KEYS_SET, async (_event, provider: Parameters<KeyStore['setKey']>[0], apiKey: string) => {
    await keyStore.setKey(provider, apiKey)
  })

  ipcMain.handle(IPC.KEYS_LIST, () => keyStore.list())

  ipcMain.handle(IPC.KEYS_DELETE, (_event, provider: Parameters<KeyStore['deleteKey']>[0]) => {
    keyStore.deleteKey(provider)
  })

  ipcMain.handle(IPC.DIALOG_SELECT_IMAGES, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'bmp'] }]
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle(IPC.DIALOG_SAVE_EPUB, async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${defaultName}.epub`,
      filters: [{ name: 'EPUB', extensions: ['epub'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.OCR_RUN_PAGE, async (_event, request: OcrRequest): Promise<OcrResponse> => {
    const apiKey = await keyStore.getKey(request.provider)
    if (!apiKey) {
      throw new Error(`尚未設定 ${request.provider} 的 API Key`)
    }
    const prepared = await prepareImageForOcr(request.imagePath)
    const provider = getOcrProvider(request.provider)
    const text = await provider.runOcr({
      base64Image: prepared.base64,
      mimeType: prepared.mimeType,
      apiKey
    })
    return { pageId: request.pageId, text }
  })

  ipcMain.handle(IPC.TRANSLATE_RUN_PAGE, async (_event, request: TranslateRequest): Promise<TranslateResponse> => {
    const apiKey = await keyStore.getKey(request.provider)
    if (!apiKey) {
      throw new Error(`尚未設定 ${request.provider} 的 API Key`)
    }
    const provider = getTranslateProvider(request.provider)
    const text = await provider.translate({
      text: request.text,
      targetLanguage: request.targetLanguage,
      apiKey
    })
    return { pageId: request.pageId, text }
  })

  ipcMain.handle(IPC.EXPORT_EPUB, async (_event, request: ExportEpubRequest): Promise<ExportResult> => {
    try {
      const buffer = await buildEpub(
        request.metadata,
        request.pages.map((p) => ({ id: p.id, text: p.text }))
      )
      await writeFile(request.destPath, buffer)
      return { success: true, filePath: request.destPath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
