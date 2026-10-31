// Shared types used across main, preload and renderer processes.

export type ProviderId = 'openai' | 'gemini' | 'claude' | 'deepseek'

export const OCR_CAPABLE_PROVIDERS: ProviderId[] = ['openai', 'gemini', 'claude']
export const TEXT_PROVIDERS: ProviderId[] = ['openai', 'gemini', 'claude', 'deepseek']

export type OutputLanguage = 'zh-TW' | 'zh-CN' | 'en' | 'ms' | 'id' | 'ja'

export const OUTPUT_LANGUAGES: { code: OutputLanguage; label: string }[] = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Malaysia' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ja', label: '日本語' }
]

export type TextMode = 'keep-original' | 'translate'

export interface ApiKeyEntry {
  provider: ProviderId
  hasKey: boolean
}

export interface PageItem {
  id: string
  sourcePath: string
  order: number
  status: 'pending' | 'processing' | 'done' | 'error'
  rawText?: string
  translatedText?: string
  error?: string
  /** When set, this page starts a new chapter with this title. Pages
   *  without one are appended to the preceding chapter. */
  chapterTitle?: string
}

export interface OcrRequest {
  pageId: string
  imagePath: string
  provider: ProviderId
}

export interface OcrResponse {
  pageId: string
  text: string
}

export interface TranslateRequest {
  pageId: string
  text: string
  targetLanguage: OutputLanguage
  provider: ProviderId
}

export interface TranslateResponse {
  pageId: string
  text: string
}

export interface BookMetadata {
  title: string
  author: string
  language: OutputLanguage
  coverImagePath?: string
}

export interface ExportPageInput {
  id: string
  text: string
  chapterTitle?: string
}

export interface ExportEpubRequest {
  metadata: BookMetadata
  pages: ExportPageInput[]
  destPath: string
}

export interface ExportPdfRequest {
  metadata: BookMetadata
  pages: ExportPageInput[]
  destPath: string
}

export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface PdfExtractPagesRequest {
  pdfPath: string
}

export interface PdfExtractPagesResponse {
  imagePaths: string[]
}

export type CalibreOutputFormat = 'azw3' | 'mobi'

export interface CalibreConvertRequest {
  epubPath: string
  destPath: string
}
