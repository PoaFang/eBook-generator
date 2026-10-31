import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockCreate, mockConstructor } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockConstructor: vi.fn()
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
    constructor(opts: unknown) {
      mockConstructor(opts)
    }
  }
}))

import { ClaudeProvider } from '../../src/main/providers/claudeProvider'
import { OCR_SYSTEM_PROMPT } from '../../src/main/providers/ocrPrompt'

describe('ClaudeProvider.runOcr', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockConstructor.mockReset()
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '  recognized  ', citations: null }] })
  })

  it('sends the OCR system prompt and a base64 image content block', async () => {
    const provider = new ClaudeProvider()
    const result = await provider.runOcr({ base64Image: 'B64', mimeType: 'image/png', apiKey: 'a-key' })

    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'a-key' })
    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toBe(OCR_SYSTEM_PROMPT)
    const content = call.messages[0].content
    expect(content[1]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'B64' } })
    expect(result).toBe('recognized')
  })

  it('joins multiple text blocks and ignores non-text blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: 'text', text: 'line one', citations: null },
        { type: 'thinking', thinking: 'ignored' },
        { type: 'text', text: 'line two', citations: null }
      ]
    })
    const provider = new ClaudeProvider()
    const result = await provider.runOcr({ base64Image: 'B64', mimeType: 'image/png', apiKey: 'a-key' })
    expect(result).toBe('line one\nline two')
  })
})

describe('ClaudeProvider.translate', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '翻譯結果', citations: null }] })
  })

  it('instructs the model to translate into the requested target language', async () => {
    const provider = new ClaudeProvider()
    const result = await provider.translate({ text: 'hello', targetLanguage: 'ms', apiKey: 'a-key' })

    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toContain('Bahasa Malaysia')
    expect(call.messages[0]).toEqual({ role: 'user', content: 'hello' })
    expect(result).toBe('翻譯結果')
  })
})
