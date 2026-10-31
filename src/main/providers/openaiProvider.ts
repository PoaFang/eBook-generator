import OpenAI from 'openai'
import { OCR_SYSTEM_PROMPT, buildOcrUserPrompt } from './ocrPrompt'
import { LANGUAGE_NAMES } from './types'
import type { OcrProvider, TranslateProvider } from './types'

export class OpenAiProvider implements OcrProvider, TranslateProvider {
  async runOcr(args: { base64Image: string; mimeType: string; apiKey: string }): Promise<string> {
    const client = new OpenAI({ apiKey: args.apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: OCR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildOcrUserPrompt() },
            { type: 'image_url', image_url: { url: `data:${args.mimeType};base64,${args.base64Image}` } }
          ]
        }
      ],
      temperature: 0
    })
    return response.choices[0]?.message?.content?.trim() ?? ''
  }

  async translate(args: { text: string; targetLanguage: import('@shared/types').OutputLanguage; apiKey: string }): Promise<string> {
    const client = new OpenAI({ apiKey: args.apiKey })
    const targetName = LANGUAGE_NAMES[args.targetLanguage]
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
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
