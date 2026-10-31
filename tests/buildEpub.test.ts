import { describe, expect, it, afterEach } from 'vitest'
import JSZip from 'jszip'
import { XMLValidator } from 'fast-xml-parser'
import sharp from 'sharp'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
      { id: 'p1', text: 'First page text.', chapterTitle: 'Chapter 1' },
      { id: 'p2', text: '# Heading\n\nSecond page body.', chapterTitle: 'Chapter 2' }
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

  it('creates one chapter file per chapterTitle, referenced from the manifest and spine', async () => {
    const pages = [
      { id: 'p1', text: 'one', chapterTitle: 'Chapter 1' },
      { id: 'p2', text: 'two', chapterTitle: 'Chapter 2' },
      { id: 'p3', text: 'three', chapterTitle: 'Chapter 3' }
    ]
    const buffer = await buildEpub(metadata, pages)
    const zip = await JSZip.loadAsync(buffer)

    for (let i = 1; i <= 3; i++) {
      const name = `OEBPS/chapter-${String(i).padStart(3, '0')}.xhtml`
      expect(zip.file(name)).not.toBeNull()
    }

    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    expect(opf?.match(/<itemref/g)?.length).toBe(3)
    expect(opf?.match(/media-type="application\/xhtml\+xml"/g)?.length).toBe(4) // 3 chapters + nav
  })

  it('merges pages without a chapterTitle into the preceding chapter instead of splitting them', async () => {
    const pages = [
      { id: 'p1', text: 'Chapter one, page one.', chapterTitle: 'Chapter 1' },
      { id: 'p2', text: 'Chapter one, page two.' },
      { id: 'p3', text: 'Chapter two.', chapterTitle: 'Chapter 2' }
    ]
    const buffer = await buildEpub(metadata, pages)
    const zip = await JSZip.loadAsync(buffer)

    expect(zip.file('OEBPS/chapter-001.xhtml')).not.toBeNull()
    expect(zip.file('OEBPS/chapter-002.xhtml')).not.toBeNull()
    expect(zip.file('OEBPS/chapter-003.xhtml')).toBeNull()

    const chapter1 = await zip.file('OEBPS/chapter-001.xhtml')?.async('string')
    expect(chapter1).toContain('Chapter one, page one.')
    expect(chapter1).toContain('Chapter one, page two.')

    const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
    expect(nav).toContain('Chapter 1')
    expect(nav).toContain('Chapter 2')
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

  it('omits the cover page/manifest entries when no cover image is set', async () => {
    const buffer = await buildEpub(metadata, [{ id: 'p1', text: 'No cover.' }])
    const zip = await JSZip.loadAsync(buffer)
    expect(zip.file('OEBPS/cover.xhtml')).toBeNull()
    expect(zip.file('OEBPS/images/cover.jpg')).toBeNull()
    const opf = await zip.file('OEBPS/content.opf')?.async('string')
    expect(opf).not.toContain('cover-image')
  })

  describe('with a cover image', () => {
    let dir: string
    let coverPath: string

    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true })
    })

    it('embeds the cover as a normalized JPEG and references it per the EPUB2/EPUB3 cover conventions', async () => {
      dir = mkdtempSync(join(tmpdir(), 'fayin-epub-cover-test-'))
      coverPath = join(dir, 'cover-source.png')
      const pngBuffer = await sharp({
        create: { width: 300, height: 400, channels: 3, background: { r: 10, g: 20, b: 30 } }
      })
        .png()
        .toBuffer()
      writeFileSync(coverPath, pngBuffer)

      const buffer = await buildEpub({ ...metadata, coverImagePath: coverPath }, [{ id: 'p1', text: 'Has cover.' }])
      const zip = await JSZip.loadAsync(buffer)

      const coverImage = await zip.file('OEBPS/images/cover.jpg')?.async('nodebuffer')
      expect(coverImage).toBeDefined()
      const coverMeta = await sharp(coverImage!).metadata()
      expect(coverMeta.format).toBe('jpeg')

      const coverXhtml = await zip.file('OEBPS/cover.xhtml')?.async('string')
      expect(coverXhtml).toContain('images/cover.jpg')
      assertWellFormedXml(coverXhtml!, 'cover.xhtml')

      const opf = await zip.file('OEBPS/content.opf')?.async('string')
      expect(opf).toContain('properties="cover-image"')
      expect(opf).toContain('<meta name="cover" content="cover-image"/>')
      expect(opf).toContain('<itemref idref="cover-page"/>')
      assertWellFormedXml(opf!, 'content.opf')
    })
  })
})
