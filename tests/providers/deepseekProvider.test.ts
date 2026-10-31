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

import { DeepSeekProvider } from '../../src/main/providers/deepseekProvider'

describe('DeepSeekProvider.translate', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockConstructor.mockReset()
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'translated' } }] })
  })

  it('points the OpenAI-compatible client at the DeepSeek API endpoint', async () => {
    const provider = new DeepSeekProvider()
    await provider.translate({ text: 'hi', targetLanguage: 'ja', apiKey: 'ds-key' })

    expect(mockConstructor).toHaveBeenCalledWith({ apiKey: 'ds-key', baseURL: 'https://api.deepseek.com' })
    const call = mockCreate.mock.calls[0][0]
    expect(call.model).toBe('deepseek-chat')
    expect(call.messages[0].content).toContain('Japanese')
  })

  it('does not implement OCR (no stable DeepSeek vision model yet)', () => {
    const provider = new DeepSeekProvider()
    expect('runOcr' in provider).toBe(false)
  })
})
