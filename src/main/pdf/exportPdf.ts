import { BrowserWindow } from 'electron'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildPdfHtml } from './buildPdfHtml'
import { prepareCoverImage } from '../imagePipeline'
import type { ExportPdfRequest, ExportResult } from '@shared/types'

/**
 * Renders the book as HTML in a hidden BrowserWindow and prints it to PDF.
 * This reuses Electron's own bundled Chromium instead of adding a separate
 * PDF-rendering dependency.
 */
export async function exportPdf(request: ExportPdfRequest): Promise<ExportResult> {
  const tempDir = await mkdtemp(join(tmpdir(), 'fayin-pdf-export-'))
  const tempHtmlPath = join(tempDir, 'book.html')
  let hiddenWindow: BrowserWindow | undefined

  try {
    let coverDataUri: string | undefined
    if (request.metadata.coverImagePath) {
      const coverBuffer = await prepareCoverImage(request.metadata.coverImagePath)
      coverDataUri = `data:image/jpeg;base64,${coverBuffer.toString('base64')}`
    }

    const html = buildPdfHtml(request.metadata, request.pages, coverDataUri)
    await writeFile(tempHtmlPath, html, 'utf8')

    hiddenWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
    await hiddenWindow.loadURL(pathToFileURL(tempHtmlPath).toString())

    const pdfBuffer = await hiddenWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      generateDocumentOutline: true
    })

    await writeFile(request.destPath, pdfBuffer)
    return { success: true, filePath: request.destPath }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    hiddenWindow?.destroy()
    await rm(tempDir, { recursive: true, force: true })
  }
}
