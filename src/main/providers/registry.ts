import type { ProviderId } from '@shared/types'
import type { OcrProvider, TranslateProvider } from './types'
import { OpenAiProvider } from './openaiProvider'
import { GeminiProvider } from './geminiProvider'
import { ClaudeProvider } from './claudeProvider'
import { DeepSeekProvider } from './deepseekProvider'

const openai = new OpenAiProvider()
const gemini = new GeminiProvider()
const claude = new ClaudeProvider()
const deepseek = new DeepSeekProvider()

/** DeepSeek has no stable vision model yet, so it is intentionally excluded here. */
export function getOcrProvider(provider: ProviderId): OcrProvider {
  switch (provider) {
    case 'openai':
      return openai
    case 'gemini':
      return gemini
    case 'claude':
      return claude
    default:
      throw new Error(`Provider "${provider}" does not support OCR in this build.`)
  }
}

export function getTranslateProvider(provider: ProviderId): TranslateProvider {
  switch (provider) {
    case 'openai':
      return openai
    case 'gemini':
      return gemini
    case 'claude':
      return claude
    case 'deepseek':
      return deepseek
    default:
      throw new Error(`Provider "${provider}" does not support translation in this build.`)
  }
}
