import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type {
  ApiKeyEntry,
  ExportEpubRequest,
  ExportPdfRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
  PdfExtractPagesResponse,
  ProviderId,
  TranslateRequest,
  TranslateResponse
} from '@shared/types'
import type { FayinApi } from '@shared/preloadApi'

const api: FayinApi = {
  keys: {
    set: (provider: ProviderId, apiKey: string): Promise<void> => ipcRenderer.invoke(IPC.KEYS_SET, provider, apiKey),
    list: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke(IPC.KEYS_LIST),
    delete: (provider: ProviderId): Promise<void> => ipcRenderer.invoke(IPC.KEYS_DELETE, provider)
  },
  dialog: {
    selectSourceFiles: (): Promise<string[]> => ipcRenderer.invoke(IPC.DIALOG_SELECT_SOURCE_FILES),
    selectCoverImage: (): Promise<string | null> => ipcRenderer.invoke(IPC.DIALOG_SELECT_COVER_IMAGE),
    saveEpub: (defaultName: string): Promise<string | null> => ipcRenderer.invoke(IPC.DIALOG_SAVE_EPUB, defaultName),
    savePdf: (defaultName: string): Promise<string | null> => ipcRenderer.invoke(IPC.DIALOG_SAVE_PDF, defaultName)
  },
  ocr: {
    runPage: (request: OcrRequest): Promise<OcrResponse> => ipcRenderer.invoke(IPC.OCR_RUN_PAGE, request)
  },
  translate: {
    runPage: (request: TranslateRequest): Promise<TranslateResponse> =>
      ipcRenderer.invoke(IPC.TRANSLATE_RUN_PAGE, request)
  },
  pdf: {
    extractPages: (pdfPath: string): Promise<PdfExtractPagesResponse> =>
      ipcRenderer.invoke(IPC.PDF_EXTRACT_PAGES, pdfPath)
  },
  exportEpub: (request: ExportEpubRequest): Promise<ExportResult> => ipcRenderer.invoke(IPC.EXPORT_EPUB, request),
  exportPdf: (request: ExportPdfRequest): Promise<ExportResult> => ipcRenderer.invoke(IPC.EXPORT_PDF, request)
}

contextBridge.exposeInMainWorld('api', api)
