import type {
  ApiKeyEntry,
  CalibreConvertRequest,
  CalibreOutputFormat,
  ExportEpubRequest,
  ExportPdfRequest,
  ExportResult,
  OcrRequest,
  OcrResponse,
  PdfExtractPagesResponse,
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
    selectSourceFiles(): Promise<string[]>
    selectCoverImage(): Promise<string | null>
    saveEpub(defaultName: string): Promise<string | null>
    savePdf(defaultName: string): Promise<string | null>
    saveCalibreOutput(defaultName: string, format: CalibreOutputFormat): Promise<string | null>
  }
  ocr: {
    runPage(request: OcrRequest): Promise<OcrResponse>
  }
  translate: {
    runPage(request: TranslateRequest): Promise<TranslateResponse>
  }
  pdf: {
    extractPages(pdfPath: string): Promise<PdfExtractPagesResponse>
  }
  exportEpub(request: ExportEpubRequest): Promise<ExportResult>
  exportPdf(request: ExportPdfRequest): Promise<ExportResult>
  calibre: {
    checkAvailable(): Promise<boolean>
    convert(request: CalibreConvertRequest): Promise<ExportResult>
  }
}
