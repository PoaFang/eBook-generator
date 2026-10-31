import { GoogleGenAI, createUserContent, createPartFromBase64 } from '@google/genai'
import { OCR_SYSTEM_PROMPT, buildOcrUserPrompt } from './ocrPrompt'
import { LANGUAGE_NAMES } from './types'
import type { OcrProvider, TranslateProvider } from './types'
import type { OutputLanguage } from '@shared/types'

const MODEL = 'gemini-flash-latest'

export class GeminiProvider implements OcrProvider, TranslateProvider {
  async runOcr(args: { base64Image: string; mimeType: string; apiKey: string }): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: args.apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [createUserContent([buildOcrUserPrompt(), createPartFromBase64(args.base64Image, args.mimeType)])],
      config: { systemInstruction: OCR_SYSTEM_PROMPT, temperature: 0 }
    })
    return response.text?.trim() ?? ''
  }

  async translate(args: { text: string; targetLanguage: OutputLanguage; apiKey: string }): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: args.apiKey })
    const targetName = LANGUAGE_NAMES[args.targetLanguage]
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: args.text,
      config: {
        systemInstruction: `You are a professional literary translator. Translate the user's text into ${targetName}. Preserve paragraph breaks and any "# " heading markers. Output only the translation, no commentary.`,
        temperature: 0.2
      }
    })
    return response.text?.trim() ?? ''
  }
}
