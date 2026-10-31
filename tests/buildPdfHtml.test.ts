import { describe, expect, it } from 'vitest'
import { buildPdfHtml } from '../src/main/pdf/buildPdfHtml'
import type { BookMetadata } from '../src/shared/types'

const metadata: BookMetadata = { title: '測試 & 書名', author: '作者', language: 'zh-TW' }

describe('buildPdfHtml', () => {
  it('produces one page-breaking chapter section per chapterTitle', () => {
    const html = buildPdfHtml(
      metadata,
      [
        { id: 'p1', text: 'one', chapterTitle: 'Chapter 1' },
        { id: 'p2', text: 'two', chapterTitle: 'Chapter 2' }
      ],
      undefined
    )
    expect(html.match(/class="chapter"/g)?.length).toBe(2)
    expect(html).toContain('Chapter 1')
    expect(html).toContain('Chapter 2')
    expect(html).toContain('<!doctype html>')
  })

  it('merges pages without a chapterTitle into one chapter section', () => {
    const html = buildPdfHtml(
      metadata,
      [
        { id: 'p1', text: 'first', chapterTitle: 'Chapter 1' },
        { id: 'p2', text: 'second' }
      ],
      undefined
    )
    expect(html.match(/class="chapter"/g)?.length).toBe(1)
    expect(html).toContain('first')
    expect(html).toContain('second')
  })

  it('escapes title/author special characters', () => {
    const html = buildPdfHtml(metadata, [{ id: 'p1', text: 'body' }], undefined)
    expect(html).toContain('測試 &amp; 書名')
  })

  it('omits the cover div when no cover data URI is given', () => {
    const html = buildPdfHtml(metadata, [{ id: 'p1', text: 'body' }], undefined)
    expect(html).not.toContain('class="cover"')
  })

  it('embeds the given data URI in a page-breaking cover div', () => {
    const html = buildPdfHtml(metadata, [{ id: 'p1', text: 'body' }], 'data:image/jpeg;base64,AAAA')
    expect(html).toContain('<div class="cover">')
    expect(html).toContain('data:image/jpeg;base64,AAAA')
  })
})
