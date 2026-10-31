import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type {
  ApiKeyEntry,
  ExportEpubRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
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
    selectImages: (): Promise<string[]> => ipcRenderer.invoke(IPC.DIALOG_SELECT_IMAGES),
    saveEpub: (defaultName: string): Promise<string | null> => ipcRenderer.invoke(IPC.DIALOG_SAVE_EPUB, defaultName)
  },
  ocr: {
    runPage: (request: OcrRequest): Promise<OcrResponse> => ipcRenderer.invoke(IPC.OCR_RUN_PAGE, request)
  },
  translate: {
    runPage: (request: TranslateRequest): Promise<TranslateResponse> =>
      ipcRenderer.invoke(IPC.TRANSLATE_RUN_PAGE, request)
  },
  exportEpub: (request: ExportEpubRequest): Promise<ExportResult> => ipcRenderer.invoke(IPC.EXPORT_EPUB, request)
}

contextBridge.exposeInMainWorld('api', api)
