import { app, ipcMain, dialog, type BrowserWindow } from 'electron'
import { writeFile, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IPC } from '@shared/ipcChannels'
import type {
  CalibreConvertRequest,
  CalibreOutputFormat,
  ExportEpubRequest,
  ExportPdfRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
  PdfExtractPagesResponse,
  TranslateRequest,
  TranslateResponse
} from '@shared/types'
import type { KeyStore } from './keyStore'
import { prepareImageForOcr } from './imagePipeline'
import { getOcrProvider, getTranslateProvider } from './providers/registry'
import { buildEpub } from './epub/buildEpub'
import { exportPdf } from './pdf/exportPdf'
import { extractPdfPagesToImages } from './pdfPages'
import { registerTempDir, cleanupAllTempDirs } from './tempDirs'
import { isCalibreAvailable, convertEpubWithCalibre } from './calibre'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'tiff', 'tif', 'bmp']

export function registerIpcHandlers(mainWindow: BrowserWindow, keyStore: KeyStore): void {
  ipcMain.handle(IPC.KEYS_SET, async (_event, provider: Parameters<KeyStore['setKey']>[0], apiKey: string) => {
    await keyStore.setKey(provider, apiKey)
  })

  ipcMain.handle(IPC.KEYS_LIST, () => keyStore.list())

  ipcMain.handle(IPC.KEYS_DELETE, (_event, provider: Parameters<KeyStore['deleteKey']>[0]) => {
    keyStore.deleteKey(provider)
  })

  ipcMain.handle(IPC.DIALOG_SELECT_SOURCE_FILES, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images & PDF', extensions: [...IMAGE_EXTENSIONS, 'pdf'] },
        { name: 'Images', extensions: IMAGE_EXTENSIONS },
        { name: 'PDF', extensions: ['pdf'] }
      ]
    })
    if (result.canceled) return []
    return result.filePaths
  })

  ipcMain.handle(IPC.DIALOG_SELECT_COVER_IMAGE, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.DIALOG_SAVE_EPUB, async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${defaultName}.epub`,
      filters: [{ name: 'EPUB', extensions: ['epub'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.DIALOG_SAVE_PDF, async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${defaultName}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.PDF_EXTRACT_PAGES, async (_event, pdfPath: string): Promise<PdfExtractPagesResponse> => {
    const pdfBytes = await readFile(pdfPath)
    const outDir = await mkdtemp(join(tmpdir(), 'fayin-pdf-pages-'))
    registerTempDir(outDir)
    const imagePaths = await extractPdfPagesToImages(pdfBytes, outDir)
    return { imagePaths }
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
      const buffer = await buildEpub(request.metadata, request.pages)
      await writeFile(request.destPath, buffer)
      return { success: true, filePath: request.destPath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC.EXPORT_PDF, async (_event, request: ExportPdfRequest): Promise<ExportResult> => {
    return exportPdf(request)
  })

  ipcMain.handle(IPC.CALIBRE_CHECK_AVAILABLE, () => isCalibreAvailable())

  ipcMain.handle(IPC.DIALOG_SAVE_CALIBRE_OUTPUT, async (_event, defaultName: string, format: CalibreOutputFormat) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${defaultName}.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle(IPC.CALIBRE_CONVERT, async (_event, request: CalibreConvertRequest): Promise<ExportResult> => {
    try {
      await convertEpubWithCalibre(request.epubPath, request.destPath)
      return { success: true, filePath: request.destPath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  app.on('before-quit', () => {
    cleanupAllTempDirs()
  })
}
