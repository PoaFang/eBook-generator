import { describe, expect, it, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { extractPdfPagesToImages } from '../src/main/pdfPages'
import { makeTestPdf } from './fixtures/makeTestPdf'

describe('extractPdfPagesToImages', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  it('produces one PNG file per page, in order', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-pdf-test-'))
    const pdfBytes = makeTestPdf(['Page One', 'Page Two', 'Page Three'])

    const paths = await extractPdfPagesToImages(pdfBytes, dir)

    expect(paths).toHaveLength(3)
    expect(paths[0]).toMatch(/page-001\.png$/)
    expect(paths[1]).toMatch(/page-002\.png$/)
    expect(paths[2]).toMatch(/page-003\.png$/)

    for (const p of paths) {
      const buffer = readFileSync(p)
      const meta = await sharp(buffer).metadata()
      expect(meta.format).toBe('png')
      expect(meta.width).toBeGreaterThan(0)
      expect(meta.height).toBeGreaterThan(0)

      // Confirm the page actually has rendered text content, not a blank
      // white canvas (a blank render would still pass dimension checks).
      const stats = await sharp(buffer).stats()
      const hasNonWhitePixels = stats.channels.some((channel) => channel.min < 250)
      expect(hasNonWhitePixels).toBe(true)
    }
  })

  it('handles a single-page PDF', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-pdf-test-'))
    const pdfBytes = makeTestPdf(['Only Page'])

    const paths = await extractPdfPagesToImages(pdfBytes, dir)

    expect(paths).toHaveLength(1)
  })

  it('rasterizes at the configured scale relative to the PDF page size', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fayin-pdf-test-'))
    // makeTestPdf uses a fixed 300x150 point MediaBox.
    const pdfBytes = makeTestPdf(['Size check'])

    const [path] = await extractPdfPagesToImages(pdfBytes, dir)
    const meta = await sharp(readFileSync(path)).metadata()

    expect(meta.width).toBe(600) // 300pt * scale 2
    expect(meta.height).toBe(300) // 150pt * scale 2
  })
})
