import { describe, expect, it } from 'vitest'
import { OCR_SYSTEM_PROMPT, buildOcrUserPrompt } from '../src/main/providers/ocrPrompt'

describe('OCR_SYSTEM_PROMPT', () => {
  it('instructs the model to skip handwritten marks', () => {
    expect(OCR_SYSTEM_PROMPT).toMatch(/IGNORE and OMIT/i)
    expect(OCR_SYSTEM_PROMPT).toMatch(/handwritten/i)
    expect(OCR_SYSTEM_PROMPT).toMatch(/pen or pencil/i)
  })

  it('instructs the model to only transcribe printed/typeset text', () => {
    expect(OCR_SYSTEM_PROMPT).toMatch(/printed\/typeset text/i)
  })

  it('forbids translation or commentary at the OCR stage', () => {
    expect(OCR_SYSTEM_PROMPT).toMatch(/Do not translate/i)
  })
})

describe('buildOcrUserPrompt', () => {
  it('returns a non-empty instruction string', () => {
    expect(buildOcrUserPrompt().length).toBeGreaterThan(0)
  })
})
