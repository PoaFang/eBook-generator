import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockCreate, mockConstructor } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockConstructor: vi.fn()
}))

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } }
    constructor(opts: unknown) {
      mockConstructor(opts)
    }
  }
}))

import { OpenAiProvider } from '../../src/main/providers/openaiProvider'
import { OCR_SYSTEM_PROMPT } from '../../src/main/providers/ocrPrompt'

describe('OpenAiProvider.runOcr', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockConstructor.mockReset()
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '  recognized text  ' } }] })
  })

  it('sends the OCR system prompt and the image as a data URL', async () => {
    const provider = new OpenAiProvider()
    const result = await provider.runOcr({ base64Image: 'BASE64DATA', mimeType: 'image/jpeg', apiKey: 'sk-test' })

    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'sk-test' })
    const call = mockCreate.mock.calls[0][0]
    expect(call.model).toBe('gpt-4o')
    expect(call.messages[0]).toEqual({ role: 'system', content: OCR_SYSTEM_PROMPT })
    const userContent = call.messages[1].content
    expect(userContent[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,BASE64DATA' }
    })
    expect(result).toBe('recognized text')
  })
})

describe('OpenAiProvider.translate', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '翻譯結果' } }] })
  })

  it('instructs the model to translate into the requested target language', async () => {
    const provider = new OpenAiProvider()
    const result = await provider.translate({ text: 'hello', targetLanguage: 'zh-TW', apiKey: 'sk-test' })

    const call = mockCreate.mock.calls[0][0]
    expect(call.messages[0].content).toContain('Traditional Chinese')
    expect(call.messages[1]).toEqual({ role: 'user', content: 'hello' })
    expect(result).toBe('翻譯結果')
  })
})
