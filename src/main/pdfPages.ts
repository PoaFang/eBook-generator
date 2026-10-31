import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname, sep } from 'node:path'
import { createRequire } from 'node:module'

// Node has no DOM Worker; pdf.js's legacy build falls back to running
// parsing on the main thread ("fake worker"), but it still requires
// workerSrc to point at a resolvable file before it will do so.
const pdfjsRequire = createRequire(import.meta.url)
GlobalWorkerOptions.workerSrc = pdfjsRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')

// Needed so pages using a standard (non-embedded) font like Helvetica get
// correct glyph metrics instead of pdf.js warning and falling back.
const STANDARD_FONT_DATA_URL =
  dirname(pdfjsRequire.resolve('pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')) + sep

const RENDER_SCALE = 2 // ~144 DPI from the PDF's 72-DPI point grid; legible for OCR without huge files

/**
 * Rasterizes every page of a PDF file into standalone PNG files under
 * `outDir`, one per page, numbered in reading order. Returns the absolute
 * paths so each page can be fed through the same OCR pipeline as a
 * regular imported image.
 */
export async function extractPdfPagesToImages(pdfBytes: Uint8Array, outDir: string): Promise<string[]> {
  await mkdir(outDir, { recursive: true })
  // pdf.js rejects Node's Buffer even though it is a Uint8Array subclass
  // (it checks the exact constructor), so re-wrap it as a plain Uint8Array
  // view over the same underlying memory.
  const data = new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength)
  const loadingTask = getDocument({ data, standardFontDataUrl: STANDARD_FONT_DATA_URL })
  const doc = await loadingTask.promise
  const outputPaths: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext('2d')

      // @napi-rs/canvas's Canvas2D context is API-compatible with what
      // pdf.js's renderer calls, but it is not a DOM CanvasRenderingContext2D
      // (which isn't even available as a type in this DOM-less Node build),
      // so it has to cross the boundary as `any`. Passing `canvas: null`
      // tells pdf.js to render through canvasContext directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: context as any, canvas: null, viewport }).promise

      const pngBuffer = (context as SKRSContext2D).canvas.toBuffer('image/png')
      const outputPath = join(outDir, `page-${String(pageNumber).padStart(3, '0')}.png`)
      await writeFile(outputPath, pngBuffer)
      outputPaths.push(outputPath)
    }
  } finally {
    await loadingTask.destroy()
  }

  return outputPaths
}
