import { describe, expect, it } from 'vitest'
import { textToXhtmlBody, escapeXml } from '../src/main/epub/textToXhtml'

describe('escapeXml', () => {
  it('escapes all five XML special characters', () => {
    expect(escapeXml(`<a> & "b" 'c'`)).toBe('&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos;')
  })
})

describe('textToXhtmlBody', () => {
  it('wraps a single paragraph in <p>', () => {
    expect(textToXhtmlBody('Hello world')).toBe('<p>Hello world</p>')
  })

  it('splits blank-line-separated blocks into separate paragraphs', () => {
    const result = textToXhtmlBody('Para one.\n\nPara two.')
    expect(result).toBe('<p>Para one.</p>\n<p>Para two.</p>')
  })

  it('converts a "# " prefixed line into an <h2> heading', () => {
    const result = textToXhtmlBody('# Chapter Title\n\nBody text here.')
    expect(result).toBe('<h2>Chapter Title</h2>\n<p>Body text here.</p>')
  })

  it('joins single-newline soft breaks with <br/>', () => {
    const result = textToXhtmlBody('Line one\nLine two')
    expect(result).toBe('<p>Line one<br/>Line two</p>')
  })

  it('escapes special characters inside paragraph text', () => {
    const result = textToXhtmlBody('A & B < C')
    expect(result).toBe('<p>A &amp; B &lt; C</p>')
  })

  it('returns an empty paragraph for empty input', () => {
    expect(textToXhtmlBody('')).toBe('<p></p>')
    expect(textToXhtmlBody('   \n\n   ')).toBe('<p></p>')
  })
})
