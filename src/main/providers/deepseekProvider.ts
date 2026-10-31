import OpenAI from 'openai'
import { LANGUAGE_NAMES } from './types'
import type { TranslateProvider } from './types'
import type { OutputLanguage } from '@shared/types'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const MODEL = 'deepseek-chat'

/**
 * DeepSeek's hosted API is OpenAI-compatible for text chat, so we reuse the
 * openai SDK pointed at DeepSeek's endpoint. DeepSeek has no stable
 * general-availability vision model as of this writing, so this provider is
 * translate-only; it deliberately does not implement OcrProvider.
 */
export class DeepSeekProvider implements TranslateProvider {
  async translate(args: { text: string; targetLanguage: OutputLanguage; apiKey: string }): Promise<string> {
    const client = new OpenAI({ apiKey: args.apiKey, baseURL: DEEPSEEK_BASE_URL })
    const targetName = LANGUAGE_NAMES[args.targetLanguage]
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional literary translator. Translate the user's text into ${targetName}. Preserve paragraph breaks and any "# " heading markers. Output only the translation, no commentary.`
        },
        { role: 'user', content: args.text }
      ],
      temperature: 0.2
    })
    return response.choices[0]?.message?.content?.trim() ?? ''
  }
}
