import { escapeXml, textToXhtmlBody } from '../epub/textToXhtml'
import { groupPagesIntoChapters } from '@shared/chapters'
import type { BookMetadata, ExportPageInput } from '@shared/types'

const STYLE = `
  body { font-family: serif; line-height: 1.6; margin: 0; }
  .chapter { padding: 2em; page-break-after: always; }
  .chapter:last-child { page-break-after: auto; }
  h1, h2 { font-weight: bold; }
  p { margin: 0 0 1em 0; text-indent: 2em; }
  .cover { page-break-after: always; text-align: center; margin: 0; padding: 0; }
  .cover img { max-width: 100%; max-height: 100vh; }
`

/**
 * Builds a single self-contained HTML document representing the whole book,
 * for a hidden BrowserWindow to render and print to PDF. The cover image is
 * inlined as a data URI so the document has no external file dependencies.
 */
export function buildPdfHtml(
  metadata: BookMetadata,
  pages: ExportPageInput[],
  coverDataUri: string | undefined
): string {
  const chapters = groupPagesIntoChapters(pages)
  const coverHtml = coverDataUri ? `<div class="cover"><img src="${coverDataUri}" alt="cover"/></div>` : ''

  const chaptersHtml = chapters
    .map((chapter, i) => {
      const title = chapter.title ?? `${metadata.title} ${i + 1}`
      const bodyHtml = textToXhtmlBody(chapter.text)
      return `<section class="chapter"><h1>${escapeXml(title)}</h1>${bodyHtml}</section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="${metadata.language}">
<head>
<meta charset="utf-8"/>
<title>${escapeXml(metadata.title)}</title>
<style>${STYLE}</style>
</head>
<body>
${coverHtml}
${chaptersHtml}
</body>
</html>`
}
