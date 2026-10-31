import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { XMLValidator } from 'fast-xml-parser'
import { buildEpub } from '../src/main/epub/buildEpub'
import type { BookMetadata } from '../src/shared/types'

const metadata: BookMetadata = {
  title: '測試經典 & "引號" <標籤>',
  author: "法音流傳 '測試'",
  language: 'zh-TW'
}

function assertWellFormedXml(xml: string, label: string): void {
  const result = XMLValidator.validate(xml, { allowBooleanAttributes: true })
  if (result !== true) {
    throw new Error(`${label} is not well-formed XML: ${JSON.stringify(result.err)}`)
  }
}

describe('buildEpub', () => {
  it('stores the mimetype entry first and uncompressed (OCF spec requirement)', async () => {
    const buffer = await buildEpub(metadata, [{ id: 'p1', text: 'Hello.' }])

    // Verify via the raw ZIP local file header (bytes 0-29 of a valid zip).
    const signature = buffer.readUInt32LE(0)
    expect(signature).toBe(0x04034b50) // local file header signature
    const compressionMethod = buffer.readUInt16LE(8)
    expect(compressionMethod).toBe(0) // 0 = stored, not deflated
    const filenameLength = buffer.readUInt16LE(26)
    const filename = buffer.subarray(30, 30 + filenameLength).toString('utf8')
    expect(filename).toBe('mimetype')

    const zip = await JSZip.loadAsync(buffer)
    const mimetypeContent = await zip.file('mimetype')?.async('string')
    expect(mimetypeContent).toBe('application/epub+zip')
  })

  it('produces well-formed XML for every required container file', async () => {
    const buffer = await buildEpub(metadata, [
      { id: 'p1', text: 'First page text.' },
      { id: 'p2', text: '# Heading\n\nSecond page body.' }
    ])
    const zip = await JSZip.loadAsync(buffer)

    const container = await zip.file('META-INF/container.xml')?.async('string')
    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
    const ncx = await zip.file('OEBPS/toc.ncx')?.async('string')
    const chapter1 = await zip.file('OEBPS/chapter-001.xhtml')?.async('string')
    const chapter2 = await zip.file('OEBPS/chapter-002.xhtml')?.async('string')

    expect(container).toBeDefined()
    expect(opf).toBeDefined()
    expect(nav).toBeDefined()
    expect(ncx).toBeDefined()
    expect(chapter1).toBeDefined()
    expect(chapter2).toBeDefined()

    assertWellFormedXml(container!, 'container.xml')
    assertWellFormedXml(opf!, 'content.opf')
    assertWellFormedXml(nav!, 'nav.xhtml')
    assertWellFormedXml(ncx!, 'toc.ncx')
    assertWellFormedXml(chapter1!, 'chapter-001.xhtml')
    assertWellFormedXml(chapter2!, 'chapter-002.xhtml')
  })

  it('escapes special characters in title/author so the OPF stays well-formed', async () => {
    const buffer = await buildEpub(metadata, [{ id: 'p1', text: 'Body.' }])
    const zip = await JSZip.loadAsync(buffer)
    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    assertWellFormedXml(opf!, 'content.opf')
    expect(opf).toContain('&amp;')
    expect(opf).toContain('&quot;')
    expect(opf).toContain('&lt;標籤&gt;')
    expect(opf).toContain('&apos;')
  })

  it('creates one chapter file per input chapter, referenced from the manifest and spine', async () => {
    const chapters = [
      { id: 'p1', text: 'one' },
      { id: 'p2', text: 'two' },
      { id: 'p3', text: 'three' }
    ]
    const buffer = await buildEpub(metadata, chapters)
    const zip = await JSZip.loadAsync(buffer)

    for (let i = 1; i <= 3; i++) {
      const name = `OEBPS/chapter-${String(i).padStart(3, '0')}.xhtml`
      expect(zip.file(name)).not.toBeNull()
    }

    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    expect(opf?.match(/<itemref/g)?.length).toBe(3)
    expect(opf?.match(/media-type="application\/xhtml\+xml"/g)?.length).toBe(4) // 3 chapters + nav
  })

  it('renders a "# " prefixed line as an <h2> heading and skips it from <p> wrapping', async () => {
    const buffer = await buildEpub(metadata, [{ id: 'p1', text: '# My Heading\n\nBody paragraph.' }])
    const zip = await JSZip.loadAsync(buffer)
    const chapter = await zip.file('OEBPS/chapter-001.xhtml')?.async('string')
    expect(chapter).toContain('<h2>My Heading</h2>')
    expect(chapter).toContain('<p>Body paragraph.</p>')
  })

  it('produces a zip that JSZip can losslessly round-trip', async () => {
    const buffer = await buildEpub(metadata, [{ id: 'p1', text: 'Round trip content.' }])
    const zip = await JSZip.loadAsync(buffer)
    const names = Object.keys(zip.files)
    expect(names).toContain('mimetype')
    expect(names).toContain('META-INF/container.xml')
    expect(names).toContain('OEBPS/content.opf')
    expect(names).toContain('OEBPS/nav.xhtml')
    expect(names).toContain('OEBPS/toc.ncx')
    expect(names).toContain('OEBPS/css/style.css')
  })
})
