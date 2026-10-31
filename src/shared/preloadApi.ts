import type {
  ApiKeyEntry,
  ExportEpubRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
  ProviderId,
  TranslateRequest,
  TranslateResponse
} from './types'

export interface FayinApi {
  keys: {
    set(provider: ProviderId, apiKey: string): Promise<void>
    list(): Promise<ApiKeyEntry[]>
    delete(provider: ProviderId): Promise<void>
  }
  dialog: {
    selectImages(): Promise<string[]>
    saveEpub(defaultName: string): Promise<string | null>
  }
  ocr: {
    runPage(request: OcrRequest): Promise<OcrResponse>
  }
  translate: {
    runPage(request: TranslateRequest): Promise<TranslateResponse>
  }
  exportEpub(request: ExportEpubRequest): Promise<ExportResult>
}
