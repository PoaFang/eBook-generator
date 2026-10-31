import Anthropic from '@anthropic-ai/sdk'
import { OCR_SYSTEM_PROMPT, buildOcrUserPrompt } from './ocrPrompt'
import { LANGUAGE_NAMES } from './types'
import type { OcrProvider, TranslateProvider } from './types'
import type { OutputLanguage } from '@shared/types'

const MODEL = 'claude-sonnet-5-5'
const MAX_TOKENS = 4096

type SupportedImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

export class ClaudeProvider implements OcrProvider, TranslateProvider {
  async runOcr(args: { base64Image: string; mimeType: string; apiKey: string }): Promise<string> {
    const client = new Anthropic({ apiKey: args.apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrUserPrompt() },
            {
              type: 'image',
              source: { type: 'base64', media_type: args.mimeType as SupportedImageMediaType, data: args.base64Image }
            }
          ]
        }
      ]
    })
    return extractText(message.content)
  }

  async translate(args: { text: string; targetLanguage: OutputLanguage; apiKey: string }): Promise<string> {
    const client = new Anthropic({ apiKey: args.apiKey })
    const targetName = LANGUAGE_NAMES[args.targetLanguage]
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are a professional literary translator. Translate the user's text into ${targetName}. Preserve paragraph breaks and any "# " heading markers. Output only the translation, no commentary.`,
      messages: [{ role: 'user', content: args.text }]
    })
    return extractText(message.content)
  }
}
