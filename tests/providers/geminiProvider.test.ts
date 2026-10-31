import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGenerateContent, mockConstructor } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockConstructor: vi.fn()
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: mockGenerateContent }
    constructor(opts: unknown) {
      mockConstructor(opts)
    }
  },
  createUserContent: (parts: unknown) => ({ __kind: 'userContent', parts }),
  createPartFromBase64: (data: string, mimeType: string) => ({ __kind: 'part', data, mimeType })
}))

import { GeminiProvider } from '../../src/main/providers/geminiProvider'
import { OCR_SYSTEM_PROMPT } from '../../src/main/providers/ocrPrompt'

describe('GeminiProvider.runOcr', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    mockConstructor.mockReset()
    mockGenerateContent.mockResolvedValue({ text: '  recognized  ' })
  })

  it('sends the OCR system instruction and wraps the image as an inline part', async () => {
    const provider = new GeminiProvider()
    const result = await provider.runOcr({ base64Image: 'B64', mimeType: 'image/jpeg', apiKey: 'g-key' })

    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'g-key' })
    const call = mockGenerateContent.mock.calls[0][0]
    expect(call.config.systemInstruction).toBe(OCR_SYSTEM_PROMPT)
    const userContent = call.contents[0]
    expect(userContent.__kind).toBe('userContent')
    expect(userContent.parts[1]).toEqual({ __kind: 'part', data: 'B64', mimeType: 'image/jpeg' })
    expect(result).toBe('recognized')
  })
})

describe('GeminiProvider.translate', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    mockGenerateContent.mockResolvedValue({ text: '翻譯' })
  })

  it('instructs the model to translate into the requested target language', async () => {
    const provider = new GeminiProvider()
    const result = await provider.translate({ text: 'hello', targetLanguage: 'id', apiKey: 'g-key' })

    const call = mockGenerateContent.mock.calls[0][0]
    expect(call.config.systemInstruction).toContain('Bahasa Indonesia')
    expect(call.contents).toBe('hello')
    expect(result).toBe('翻譯')
  })
})
