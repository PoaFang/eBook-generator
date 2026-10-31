import type { ProviderId } from '@shared/types'
import type { OcrProvider, TranslateProvider } from './types'
import { OpenAiProvider } from './openaiProvider'

const openai = new OpenAiProvider()

/** Phase 2 will add Gemini and Claude here as OCR-capable providers. */
export function getOcrProvider(provider: ProviderId): OcrProvider {
  switch (provider) {
    case 'openai':
      return openai
    default:
      throw new Error(
        `Provider "${provider}" does not yet support OCR in this build. Only OpenAI vision OCR is wired up in this phase.`
      )
  }
}

/** Phase 2 will add Gemini, Claude and DeepSeek (text-only) here. */
export function getTranslateProvider(provider: ProviderId): TranslateProvider {
  switch (provider) {
    case 'openai':
      return openai
    default:
      throw new Error(`Provider "${provider}" does not yet support translation in this build.`)
  }
}
