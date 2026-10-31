import type { OutputLanguage } from '@shared/types'

export interface OcrProvider {
  runOcr(args: { base64Image: string; mimeType: string; apiKey: string }): Promise<string>
}

export interface TranslateProvider {
  translate(args: { text: string; targetLanguage: OutputLanguage; apiKey: string }): Promise<string>
}

export const LANGUAGE_NAMES: Record<OutputLanguage, string> = {
  'zh-TW': 'Traditional Chinese (繁體中文)',
  'zh-CN': 'Simplified Chinese (简体中文)',
  en: 'English',
  ms: 'Bahasa Malaysia',
  id: 'Bahasa Indonesia',
  ja: 'Japanese (日本語)'
}
